import bookingModel from "../booking/bookingModel.js";
import showModel from "../show/showModel.js";
import paymentModel from "./paymentModel.js";
import createHttpError from "http-errors";
import constants from "../utils/constants.js";
import userModel from "../user/userModel.js";

const createPayment = async (req, res, next) => {
  try {
    const {
      movieId,
      theaterId,
      showId,
      noOfSeats,
      bookingId,
      amount,
      paymentMethod,
      transactionId,
    } = req.body;

    const booking = await bookingModel.findById(bookingId);
    const show = await showModel.findOne({
      movieId: booking.movieId,
      theaterId: booking.theaterId,
      _id: showId,
    });
    if (booking.status == constants.BOOKING_STATUS.successfull) {
      return next(createHttpError(400, "booking already done "));
    }

    if (!booking) {
      return next(createHttpError(400, "booking not found"));
    }
    const bookTime = new Date(booking.createdAt).getTime();
    const currentTime = Date.now();
    const minutes = Math.floor((currentTime - bookTime) / 1000 / 60);
    if (minutes > 5) {
      booking.status = constants.BOOKING_STATUS.expired;
      await booking.save();
      return res
        .status(200)
        .json({ success: false, message: "booking expired", data: booking });
    }
    const payment = await paymentModel.create({
      bookingId,
      amount,
      paymentStatus: constants.PAYMENT_STATUS.pending, // or set as needed
      paymentMethod,
      transactionId,
    });
    if (Number(payment.amount) !== Number(booking.totalCost)) {
      payment.status = constants.PAYMENT_STATUS.failed;
    }
    if (!payment || payment.status === constants.PAYMENT_STATUS.failed) {
      booking.status = constants.BOOKING_STATUS.cancelled;
      await booking.save();
      await payment.save();
      return res.status(200).json({
        success: false,
        message: "payment failed,booking cancelled",
        data: booking,
      });
    }
    payment.status = constants.PAYMENT_STATUS.success;
    booking.status = constants.BOOKING_STATUS.successfull;

    show.noOfSeats = String(Number(show.noOfSeats) - Number(booking.noOfSeats));

    await show.save();
    await booking.save();
    await payment.save();

    return res.status(200).json({
      success: true,
      message: "payment successful,booking confirmed",
      data: booking,
    });
  } catch (error) {
    console.error("errror while creating payment", error);
    return next(createHttpError(500, "Error while creating payment"));
  }
};

const getPaymentById = async (req, res, next) => {
  try {
    const payment = await paymentModel.findById(req.params.id);
    if (!payment) {
      return next(createHttpError(404, "payment not found"));
    }
    res.status(200).json({
      success: true,
      message: "payment found successfuly",
      data: payment,
    });
  } catch (error) {
    console.error("failed to fetch while payment", error);
    return next(createHttpError(500, "error while fetching payment"));
  }
};

const getAllPayment = async (req, res, next) => {
  try {
    const user = await userModel.findById(req.user.id || req.user._id);
    let filter = {};

    // Only admin can see all payments, others see their own
    if (!user || user.userRole !== constants.USER_ROLE.admin) {
      filter.userId = user._id;
    }

    // Find all payments matching the filter
    const payments = await paymentModel.find(filter);

    res.status(200).json({
      success: true,
      message: "Payments fetched successfully",
      data: payments,
    });
  } catch (error) {
    console.error("Error while fetching payments", error);
    return next(createHttpError(500, "Error while fetching payments"));
  }
};

export { createPayment, getPaymentById, getAllPayment };
