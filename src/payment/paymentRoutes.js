import express from "express";
import createHttpError from "http-errors";
import bookingModel from "../booking/bookingModel.js";
import showModel from "../show/showModel.js";
import paymentModel from "./paymentModel.js";
import stripe from "../config/stripe.js";
import constants from "../utils/constants.js";
import userModel from "../user/userModel.js";
import movieModel from "../movie/movieModel.js";
import theaterModel from "../theater/theaterModel.js";
import {
  sendBookingExpiredMail,
  sendBookingPaymentFailedMail,
  sendBookingPaymentSuccessMail,
} from "../utils/emailService.js";
import { authMiddleware, isClientOrAdmin } from "../user/userMiddleware.js";
import {
  createPayment,
  getAllPayment,
  getPaymentById,
} from "./paymentController.js";
import { validatePaymentCreateRequest } from "./paymentMiddleware.js";

const router = express.Router();
const BOOKING_TIMEOUT_MINUTES = 5;

function getCurrency() {
  return (process.env.STRIPE_CURRENCY || "inr").toLowerCase();
}

function resolveFrontendUrl(req) {
  const configured = process.env.FRONTEND_URL;
  const origin = req.headers.origin;
  const base = (configured || origin || "").trim();

  if (!base) {
    throw createHttpError(
      500,
      "FRONTEND_URL is missing and request origin is unavailable"
    );
  }

  return base.replace(/\/$/, "");
}

function getAmountInMinorUnit(booking) {
  return Math.round(Number(booking.totalCost) * 100);
}

function isBookingTimedOut(booking) {
  const bookTime = new Date(booking.createdAt).getTime();
  const currentTime = Date.now();
  const minutes = Math.floor((currentTime - bookTime) / 1000 / 60);
  return minutes > BOOKING_TIMEOUT_MINUTES;
}

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

async function sendPaymentSuccessFallbackMail({ booking, transactionId }) {
  const context = await getBookingEmailContext(booking);
  if (!context?.email) {
    return;
  }
  await sendBookingPaymentSuccessMail({
    ...context,
    transactionId,
  });
  console.log("payment success mail sent from confirm/reconcile fallback", {
    bookingId: context.bookingId,
    transactionId,
  });
}

async function sendPaymentFailedFallbackMail({
  booking,
  transactionId,
  reason,
}) {
  const context = await getBookingEmailContext(booking);
  if (!context?.email) {
    return;
  }
  await sendBookingPaymentFailedMail({
    ...context,
    transactionId,
    reason,
  });
  console.log("payment failed mail sent from confirm/reconcile fallback", {
    bookingId: context.bookingId,
    transactionId,
    reason,
  });
}

async function sendBookingExpiredFallbackMail(booking) {
  const context = await getBookingEmailContext(booking);
  if (!context?.email) {
    return;
  }
  await sendBookingExpiredMail(context);
  console.log("booking expired mail sent from reconcile fallback", {
    bookingId: context.bookingId,
  });
}

async function safeSendFallbackMail({
  type,
  booking,
  transactionId,
  reason,
  logContext,
}) {
  try {
    if (type === "success") {
      await sendPaymentSuccessFallbackMail({ booking, transactionId });
      return;
    }

    if (type === "failed") {
      await sendPaymentFailedFallbackMail({
        booking,
        transactionId,
        reason,
      });
      return;
    }

    if (type === "expired") {
      await sendBookingExpiredFallbackMail(booking);
    }
  } catch (mailError) {
    console.error(`${logContext} mail send error`, mailError);
  }
}

async function findPayment({ paymentId, transactionId }) {
  if (paymentId) {
    const byId = await paymentModel.findById(paymentId);
    if (byId) return byId;
  }

  if (transactionId) {
    return paymentModel.findOne({ transactionId });
  }

  return null;
}

async function markStripePaymentSuccess({
  paymentId,
  transactionId,
  bookingId,
}) {
  let statusChanged = false;
  const payment = await findPayment({ paymentId, transactionId });

  if (payment) {
    if (payment.paymentStatus !== constants.PAYMENT_STATUS.success) {
      payment.paymentStatus = constants.PAYMENT_STATUS.success;
      statusChanged = true;
    }
    if (transactionId && payment.transactionId !== transactionId) {
      payment.transactionId = transactionId;
    }
    await payment.save();
  }

  const finalBookingId = bookingId || payment?.bookingId;
  if (!finalBookingId) {
    return { booking: null, payment, statusChanged };
  }

  const booking = await bookingModel.findById(finalBookingId);
  if (!booking) {
    return { booking: null, payment, statusChanged };
  }

  if (booking.status !== constants.BOOKING_STATUS.successfull) {
    booking.status = constants.BOOKING_STATUS.successfull;
    statusChanged = true;

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
  }

  return { booking, payment, statusChanged };
}

async function markStripePaymentFailed({
  paymentId,
  transactionId,
  bookingId,
}) {
  let statusChanged = false;
  const payment = await findPayment({ paymentId, transactionId });

  if (payment && payment.paymentStatus !== constants.PAYMENT_STATUS.success) {
    payment.paymentStatus = constants.PAYMENT_STATUS.failed;
    statusChanged = true;
    if (transactionId && payment.transactionId !== transactionId) {
      payment.transactionId = transactionId;
    }
    await payment.save();
  }

  const finalBookingId = bookingId || payment?.bookingId;
  if (!finalBookingId) {
    return { booking: null, payment, statusChanged };
  }

  const booking = await bookingModel.findById(finalBookingId);
  if (!booking) {
    return { booking: null, payment, statusChanged };
  }

  if (booking.status !== constants.BOOKING_STATUS.successfull) {
    booking.status = constants.BOOKING_STATUS.cancelled;
    await booking.save();
    statusChanged = true;
  }

  return { booking, payment, statusChanged };
}

async function validateBookableBooking(bookingId, userId) {
  const booking = await bookingModel.findById(bookingId);

  if (!booking) {
    throw createHttpError(404, "Booking not found");
  }

  if (String(booking.userId) !== String(userId)) {
    throw createHttpError(403, "You are not allowed to pay for this booking");
  }

  if (booking.status === constants.BOOKING_STATUS.successfull) {
    throw createHttpError(409, "Booking is already paid");
  }

  const bookTime = new Date(booking.createdAt).getTime();
  const currentTime = Date.now();
  const minutes = Math.floor((currentTime - bookTime) / 1000 / 60);

  if (minutes > BOOKING_TIMEOUT_MINUTES) {
    booking.status = constants.BOOKING_STATUS.expired;
    await booking.save();
    throw createHttpError(410, "Booking is expired");
  }

  const amount = getAmountInMinorUnit(booking);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw createHttpError(400, "Invalid booking total amount");
  }

  return { booking, amount };
}

async function createOrReusePendingPayment(bookingId, amountMinor) {
  const existingPending = await paymentModel.findOne({
    bookingId,
    paymentStatus: constants.PAYMENT_STATUS.pending,
    paymentMethod: "STRIPE",
  });

  if (existingPending) {
    return existingPending;
  }

  return paymentModel.create({
    bookingId,
    amount: amountMinor,
    paymentStatus: constants.PAYMENT_STATUS.pending,
    paymentMethod: "STRIPE",
  });
}

router.post(
  "/create-checkout-session",
  authMiddleware,
  async (req, res, next) => {
    try {
      const { bookingId } = req.body;
      if (!bookingId) {
        return next(createHttpError(400, "bookingId is required"));
      }

      const { booking, amount } = await validateBookableBooking(
        bookingId,
        req.user.id
      );

      const payment = await createOrReusePendingPayment(booking._id, amount);
      const currency = getCurrency();
      const frontendUrl = resolveFrontendUrl(req);
      const stripePriceId = (process.env.STRIPE_PRICE_ID || "").trim();
      const hasCatalogPriceId = stripePriceId.startsWith("price_");

      const sessionPayload = {
        mode: "payment",
        success_url: `${frontendUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${frontendUrl}/cancel?booking_id=${booking._id}`,
        client_reference_id: String(booking._id),
        metadata: {
          bookingId: String(booking._id),
          paymentId: String(payment._id),
          userId: String(req.user.id),
        },
      };

      if (hasCatalogPriceId) {
        sessionPayload.line_items = [
          {
            price: stripePriceId,
            quantity: Number(booking.noOfSeats) || 1,
          },
        ];
      } else {
        sessionPayload.line_items = [
          {
            quantity: 1,
            price_data: {
              currency,
              unit_amount: amount,
              product_data: {
                name: `CINEXA Booking ${booking._id}`,
                description: `Show ${booking.showId} | Seats ${booking.noOfSeats}`,
              },
            },
          },
        ];
      }

      const session = await stripe.checkout.sessions.create(sessionPayload, {
        idempotencyKey: `checkout_${payment._id}`,
      });

      payment.transactionId = session.id;
      await payment.save();

      return res.status(200).json({
        success: true,
        message: "Checkout session created",
        data: {
          sessionId: session.id,
          url: session.url,
          bookingId: booking._id,
          paymentId: payment._id,
        },
      });
    } catch (error) {
      if (error.statusCode) {
        return next(error);
      }
      console.error("create-checkout-session failed", error);
      return next(createHttpError(500, "Failed to create checkout session"));
    }
  }
);

router.post(
  "/create-payment-intent",
  authMiddleware,
  async (req, res, next) => {
    try {
      const { bookingId } = req.body;
      if (!bookingId) {
        return next(createHttpError(400, "bookingId is required"));
      }

      const { booking, amount } = await validateBookableBooking(
        bookingId,
        req.user.id
      );

      const payment = await createOrReusePendingPayment(booking._id, amount);

      const paymentIntent = await stripe.paymentIntents.create(
        {
          amount,
          currency: getCurrency(),
          automatic_payment_methods: { enabled: true },
          metadata: {
            bookingId: String(booking._id),
            paymentId: String(payment._id),
            userId: String(req.user.id),
          },
        },
        {
          idempotencyKey: `intent_${payment._id}`,
        }
      );

      payment.transactionId = paymentIntent.id;
      await payment.save();

      return res.status(200).json({
        success: true,
        message: "Payment intent created",
        data: {
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id,
          bookingId: booking._id,
          paymentId: payment._id,
        },
      });
    } catch (error) {
      if (error.statusCode) {
        return next(error);
      }
      console.error("create-payment-intent failed", error);
      return next(createHttpError(500, "Failed to create payment intent"));
    }
  }
);

router.post(
  "/confirm-checkout-session",
  authMiddleware,
  async (req, res, next) => {
    try {
      const { sessionId } = req.body;
      if (!sessionId) {
        return next(createHttpError(400, "sessionId is required"));
      }

      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (!session) {
        return next(createHttpError(404, "Stripe checkout session not found"));
      }

      const metadataUserId = session.metadata?.userId;
      if (metadataUserId && String(metadataUserId) !== String(req.user.id)) {
        return next(
          createHttpError(403, "You are not allowed to verify this payment")
        );
      }

      if (session.payment_status !== "paid") {
        if (session.status === "expired") {
          const failed = await markStripePaymentFailed({
            paymentId: session.metadata?.paymentId,
            bookingId: session.metadata?.bookingId,
            transactionId: session.id,
          });

          if (failed.statusChanged && failed.booking) {
            await safeSendFallbackMail({
              type: "failed",
              booking: failed.booking,
              transactionId: session.id,
              reason: "Checkout session expired",
              logContext: "confirm-checkout-session failed",
            });
          }

          return res.status(200).json({
            success: false,
            message: "Checkout session expired",
            data: {
              sessionId: session.id,
              checkoutStatus: session.status,
              paymentStatus: session.payment_status,
              bookingId: failed.booking?._id || session.metadata?.bookingId,
              paymentId: failed.payment?._id || session.metadata?.paymentId,
            },
          });
        }

        return res.status(200).json({
          success: false,
          message: "Checkout session is not paid yet",
          data: {
            sessionId: session.id,
            checkoutStatus: session.status,
            paymentStatus: session.payment_status,
            bookingId: session.metadata?.bookingId,
            paymentId: session.metadata?.paymentId,
          },
        });
      }

      const result = await markStripePaymentSuccess({
        paymentId: session.metadata?.paymentId,
        bookingId: session.metadata?.bookingId,
        transactionId: session.id,
      });

      if (result.statusChanged && result.booking) {
        await safeSendFallbackMail({
          type: "success",
          booking: result.booking,
          transactionId: session.id,
          logContext: "confirm-checkout-session success",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Checkout payment confirmed",
        data: {
          sessionId: session.id,
          bookingId: result.booking?._id || session.metadata?.bookingId,
          bookingStatus: result.booking?.status,
          paymentId: result.payment?._id || session.metadata?.paymentId,
          paymentState: result.payment?.paymentStatus,
        },
      });
    } catch (error) {
      if (error.statusCode) {
        return next(error);
      }
      console.error("confirm-checkout-session failed", error);
      return next(createHttpError(500, "Failed to confirm checkout session"));
    }
  }
);

router.post(
  "/confirm-payment-intent",
  authMiddleware,
  async (req, res, next) => {
    try {
      const { paymentIntentId } = req.body;
      if (!paymentIntentId) {
        return next(createHttpError(400, "paymentIntentId is required"));
      }

      const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
      if (!intent) {
        return next(createHttpError(404, "Stripe payment intent not found"));
      }

      const metadataUserId = intent.metadata?.userId;
      if (metadataUserId && String(metadataUserId) !== String(req.user.id)) {
        return next(
          createHttpError(403, "You are not allowed to verify this payment")
        );
      }

      if (intent.status !== "succeeded") {
        if (
          intent.status === "canceled" ||
          intent.status === "requires_payment_method"
        ) {
          const failed = await markStripePaymentFailed({
            paymentId: intent.metadata?.paymentId,
            bookingId: intent.metadata?.bookingId,
            transactionId: intent.id,
          });

          if (failed.statusChanged && failed.booking) {
            await safeSendFallbackMail({
              type: "failed",
              booking: failed.booking,
              transactionId: intent.id,
              reason: `Payment intent ${intent.status}`,
              logContext: "confirm-payment-intent failed",
            });
          }

          return res.status(200).json({
            success: false,
            message: "Payment intent failed",
            data: {
              paymentIntentId: intent.id,
              status: intent.status,
              bookingId: failed.booking?._id || intent.metadata?.bookingId,
              paymentId: failed.payment?._id || intent.metadata?.paymentId,
            },
          });
        }

        return res.status(200).json({
          success: false,
          message: "Payment intent is not succeeded yet",
          data: {
            paymentIntentId: intent.id,
            status: intent.status,
            bookingId: intent.metadata?.bookingId,
            paymentId: intent.metadata?.paymentId,
          },
        });
      }

      const result = await markStripePaymentSuccess({
        paymentId: intent.metadata?.paymentId,
        bookingId: intent.metadata?.bookingId,
        transactionId: intent.id,
      });

      if (result.statusChanged && result.booking) {
        await safeSendFallbackMail({
          type: "success",
          booking: result.booking,
          transactionId: intent.id,
          logContext: "confirm-payment-intent success",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Payment intent confirmed",
        data: {
          paymentIntentId: intent.id,
          bookingId: result.booking?._id || intent.metadata?.bookingId,
          bookingStatus: result.booking?.status,
          paymentId: result.payment?._id || intent.metadata?.paymentId,
          paymentState: result.payment?.paymentStatus,
        },
      });
    } catch (error) {
      if (error.statusCode) {
        return next(error);
      }
      console.error("confirm-payment-intent failed", error);
      return next(createHttpError(500, "Failed to confirm payment intent"));
    }
  }
);

router.post(
  "/reconcile-booking-status",
  authMiddleware,
  async (req, res, next) => {
    try {
      const { bookingId } = req.body;
      if (!bookingId) {
        return next(createHttpError(400, "bookingId is required"));
      }

      const userId = req.user.id || req.user._id;
      const booking = await bookingModel.findById(bookingId);
      if (!booking) {
        return next(createHttpError(404, "Booking not found"));
      }

      if (String(booking.userId) !== String(userId)) {
        return next(
          createHttpError(403, "You are not allowed to access this booking")
        );
      }

      if (
        booking.status === constants.BOOKING_STATUS.processing &&
        isBookingTimedOut(booking)
      ) {
        booking.status = constants.BOOKING_STATUS.expired;
        await booking.save();

        await paymentModel.updateMany(
          {
            bookingId,
            paymentMethod: "STRIPE",
            paymentStatus: constants.PAYMENT_STATUS.pending,
          },
          {
            $set: { paymentStatus: constants.PAYMENT_STATUS.failed },
          }
        );

        await safeSendFallbackMail({
          type: "expired",
          booking,
          logContext: "reconcile-booking-status expired",
        });

        return res.status(200).json({
          success: false,
          message: "Booking hold expired",
          data: {
            bookingId: booking._id,
            bookingStatus: booking.status,
            paymentStatus: constants.PAYMENT_STATUS.failed,
          },
        });
      }

      const latestStripePayment = await paymentModel
        .findOne({ bookingId, paymentMethod: "STRIPE" })
        .sort({ createdAt: -1 });

      if (!latestStripePayment) {
        return res.status(200).json({
          success: false,
          message: "No Stripe payment found for this booking",
          data: {
            bookingId: booking._id,
            bookingStatus: booking.status,
            paymentStatus: null,
          },
        });
      }

      if (
        latestStripePayment.paymentStatus === constants.PAYMENT_STATUS.success
      ) {
        const reconciled = await markStripePaymentSuccess({
          paymentId: latestStripePayment._id,
          bookingId: booking._id,
          transactionId: latestStripePayment.transactionId,
        });

        if (reconciled.statusChanged && reconciled.booking) {
          await safeSendFallbackMail({
            type: "success",
            booking: reconciled.booking,
            transactionId: latestStripePayment.transactionId,
            logContext: "reconcile-booking-status success",
          });
        }

        return res.status(200).json({
          success: true,
          message: "Booking reconciled as paid",
          data: {
            bookingId: reconciled.booking?._id || booking._id,
            bookingStatus:
              reconciled.booking?.status ||
              constants.BOOKING_STATUS.successfull,
            paymentId: latestStripePayment._id,
            paymentStatus: latestStripePayment.paymentStatus,
          },
        });
      }

      if (
        latestStripePayment.paymentStatus === constants.PAYMENT_STATUS.failed
      ) {
        const reconciled = await markStripePaymentFailed({
          paymentId: latestStripePayment._id,
          bookingId: booking._id,
          transactionId: latestStripePayment.transactionId,
        });

        if (reconciled.statusChanged && reconciled.booking) {
          await safeSendFallbackMail({
            type: "failed",
            booking: reconciled.booking,
            transactionId: latestStripePayment.transactionId,
            reason: "Reconciled failed payment",
            logContext: "reconcile-booking-status failed",
          });
        }

        return res.status(200).json({
          success: false,
          message: "Booking reconciled as cancelled",
          data: {
            bookingId: reconciled.booking?._id || booking._id,
            bookingStatus:
              reconciled.booking?.status || constants.BOOKING_STATUS.cancelled,
            paymentId: latestStripePayment._id,
            paymentStatus: latestStripePayment.paymentStatus,
          },
        });
      }

      return res.status(200).json({
        success: false,
        message: "Payment is still pending",
        data: {
          bookingId: booking._id,
          bookingStatus: booking.status,
          paymentId: latestStripePayment._id,
          paymentStatus: latestStripePayment.paymentStatus,
        },
      });
    } catch (error) {
      if (error.statusCode) {
        return next(error);
      }
      console.error("reconcile-booking-status failed", error);
      return next(createHttpError(500, "Failed to reconcile booking status"));
    }
  }
);

router.post("/", authMiddleware, validatePaymentCreateRequest, createPayment);
router.get("/", authMiddleware, isClientOrAdmin, getAllPayment);
router.get("/:id", authMiddleware, getPaymentById);

export default router;
