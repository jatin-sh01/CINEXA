import bookingModel from "../booking/bookingModel.js";
import showModel from "../show/showModel.js";
import stripe from "../config/stripe.js";
import constants from "../utils/constants.js";
import paymentModel from "./paymentModel.js";
import userModel from "../user/userModel.js";
import movieModel from "../movie/movieModel.js";
import theaterModel from "../theater/theaterModel.js";
import {
  sendBookingExpiredMail,
  sendBookingPaymentFailedMail,
  sendBookingPaymentSuccessMail,
} from "../utils/emailService.js";

async function getBookingEmailContext(booking) {
  if (!booking) {
    return null;
  }

  const [user, movie, theater] = await Promise.all([
    userModel.findById(booking.userId),
    movieModel.findById(booking.movieId),
    theaterModel.findById(booking.theaterId),
  ]);

  return {
    email: user?.email,
    name: user?.name,
    bookingId: String(booking._id),
    movieName: movie?.name,
    theaterName: theater?.name,
    showTiming: booking.timing,
    seats: booking.seat,
    amount: booking.totalCost,
  };
}

async function findPayment({ paymentId, transactionId }) {
  if (paymentId) {
    const byId = await paymentModel.findById(paymentId);
    if (byId) {
      return byId;
    }
  }

  if (transactionId) {
    return paymentModel.findOne({ transactionId });
  }

  return null;
}

async function markPaymentSuccess({ paymentId, transactionId, bookingId }) {
  let statusChanged = false;

  const payment = await findPayment({ paymentId, transactionId });
  if (!payment) {
    return { payment: null, booking: null, statusChanged };
  }

  if (payment.paymentStatus !== constants.PAYMENT_STATUS.success) {
    payment.paymentStatus = constants.PAYMENT_STATUS.success;
    if (!payment.transactionId && transactionId) {
      payment.transactionId = transactionId;
    }
    await payment.save();
    statusChanged = true;
  }

  const finalBookingId = bookingId || payment.bookingId;
  const booking = await bookingModel.findById(finalBookingId);
  if (!booking) {
    return { payment, booking: null, statusChanged };
  }

  if (booking.status === constants.BOOKING_STATUS.successfull) {
    return { payment, booking, statusChanged };
  }

  booking.status = constants.BOOKING_STATUS.successfull;

  const show = await showModel.findById(booking.showId);
  if (show) {
    const remaining = Math.max(
      0,
      Number(show.noOfSeats) - Number(booking.noOfSeats)
    );
    show.noOfSeats = String(remaining);
    await show.save();
  }

  await booking.save();

  statusChanged = true;

  return { payment, booking, statusChanged };
}

async function markPaymentFailed({ paymentId, transactionId, bookingId }) {
  let statusChanged = false;

  const payment = await findPayment({ paymentId, transactionId });
  if (payment && payment.paymentStatus !== constants.PAYMENT_STATUS.success) {
    payment.paymentStatus = constants.PAYMENT_STATUS.failed;
    await payment.save();
    statusChanged = true;
  }

  const finalBookingId = bookingId || payment?.bookingId;
  if (!finalBookingId) {
    return { payment, booking: null, statusChanged };
  }

  const booking = await bookingModel.findById(finalBookingId);
  if (booking && booking.status !== constants.BOOKING_STATUS.successfull) {
    booking.status = constants.BOOKING_STATUS.cancelled;
    await booking.save();
    statusChanged = true;
  }

  return { payment, booking, statusChanged };
}

async function processStripeEvent(event) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const result = await markPaymentSuccess({
        paymentId: session.metadata?.paymentId,
        bookingId: session.metadata?.bookingId,
        transactionId: session.id,
      });

      if (result?.statusChanged && result.booking) {
        const mailContext = await getBookingEmailContext(result.booking);
        if (mailContext?.email) {
          await sendBookingPaymentSuccessMail({
            ...mailContext,
            transactionId: session.id,
          });
        }
      }
      break;
    }

    case "payment_intent.succeeded": {
      const intent = event.data.object;
      const result = await markPaymentSuccess({
        paymentId: intent.metadata?.paymentId,
        bookingId: intent.metadata?.bookingId,
        transactionId: intent.id,
      });

      if (result?.statusChanged && result.booking) {
        const mailContext = await getBookingEmailContext(result.booking);
        if (mailContext?.email) {
          await sendBookingPaymentSuccessMail({
            ...mailContext,
            transactionId: intent.id,
          });
        }
      }
      break;
    }

    case "payment_intent.payment_failed": {
      const intent = event.data.object;
      const result = await markPaymentFailed({
        paymentId: intent.metadata?.paymentId,
        bookingId: intent.metadata?.bookingId,
        transactionId: intent.id,
      });

      if (result?.statusChanged && result.booking) {
        const mailContext = await getBookingEmailContext(result.booking);
        if (mailContext?.email) {
          await sendBookingPaymentFailedMail({
            ...mailContext,
            transactionId: intent.id,
            reason: "Payment intent failed",
          });
        }
      }
      break;
    }

    case "checkout.session.expired": {
      const session = event.data.object;
      const result = await markPaymentFailed({
        paymentId: session.metadata?.paymentId,
        bookingId: session.metadata?.bookingId,
        transactionId: session.id,
      });

      if (result?.statusChanged && result.booking) {
        const mailContext = await getBookingEmailContext(result.booking);
        if (mailContext?.email) {
          await sendBookingExpiredMail(mailContext);
        }
      }
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object;
      const result = await markPaymentFailed({
        paymentId: invoice.metadata?.paymentId,
        bookingId: invoice.metadata?.bookingId,
        transactionId: invoice.payment_intent,
      });

      if (result?.statusChanged && result.booking) {
        const mailContext = await getBookingEmailContext(result.booking);
        if (mailContext?.email) {
          await sendBookingPaymentFailedMail({
            ...mailContext,
            transactionId: String(invoice.payment_intent || ""),
            reason: "Invoice payment failed",
          });
        }
      }
      break;
    }

    default:
      break;
  }
}

export default async function stripeWebhookHandler(req, res) {
  const signature = req.headers["stripe-signature"];

  if (!signature) {
    return res.status(400).send("Missing Stripe signature");
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    console.error(
      "Stripe webhook signature verification failed",
      error.message
    );
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }

  // Acknowledge quickly and process asynchronously.
  res.status(200).json({ received: true });

  queueMicrotask(async () => {
    try {
      await processStripeEvent(event);
    } catch (error) {
      console.error("Stripe webhook event processing failed", error);
    }
  });
}
