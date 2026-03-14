import bookingModel from "./bookingModel.js";
import createHttpError from "http-errors";
import showModel from "../show/showModel.js";
import constants from "../utils/constants.js";
import { getSocketIO } from "../realtime/io.js";
import { markSeatsBooked } from "../realtime/seatState.js";

function parseSeatIds(value) {
  if (!value || typeof value !== "string") return [];
  return value
    .split(",")
    .map((seat) => seat.trim())
    .filter(Boolean);
}

function getOverlappingSeats(requestedSeats, bookedRows) {
  const booked = new Set();
  bookedRows.forEach((row) => {
    parseSeatIds(row.seat).forEach((seat) => booked.add(seat));
  });
  return requestedSeats.filter((seat) => booked.has(seat));
}

const createBooking = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { movieId, theaterId, showId, noOfSeats, seat } = req.body;
    const requestedSeats = parseSeatIds(seat);

    if (!showId) {
      return next(createHttpError(400, "showId is required"));
    }

    if (requestedSeats.length && Number(noOfSeats) !== requestedSeats.length) {
      return next(
        createHttpError(400, "noOfSeats must match selected seat count")
      );
    }

    const show = await showModel.findOne({
      movieId,
      theaterId,
      _id: showId,
    });

    if (!show) {
      return next(createHttpError(404, "show not found for booking"));
    }

    const activeBookings = await bookingModel.find({
      showId,
      status: {
        $in: [
          constants.BOOKING_STATUS.processing,
          constants.BOOKING_STATUS.successfull,
        ],
      },
    });

    const overlap = getOverlappingSeats(requestedSeats, activeBookings);
    if (overlap.length) {
      return next(
        createHttpError(409, `Seats already booked: ${overlap.join(", ")}`)
      );
    }

    const totalCost = Number(noOfSeats) * show.price;
    const bookingData = { ...req.body, userId, totalCost };

    const booking = await bookingModel.create(bookingData);

    if (!booking) {
      return next(createHttpError(401, "failde to create booking booking"));
    }

    const populatedBooking = await booking.populate("movieId theaterId");

    if (requestedSeats.length) {
      markSeatsBooked(String(showId), requestedSeats);
      const io = getSocketIO();
      if (io) {
        io.to(`show:${showId}`).emit("seat_booked", {
          showId,
          seatIds: requestedSeats,
        });
      }
    }

    return res.status(201).json({
      success: true,
      message: "booking created succesfull",
      data: populatedBooking,
    });
  } catch (error) {
    console.error("error creating booking", error);
    return next(createHttpError(500, "failed to create booking "));
  }
};

const updateBooking = async (req, res, next) => {
  try {
    const booking = await bookingModel.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!booking) {
      return next(createHttpError(400, "booking not found"));
    }
    res.status(200).json({
      success: true,
      message: "booking update succesfully",
      data: booking,
    });
  } catch (error) {
    console.error("booking not found", error);
    return next(createHttpError(500, "Error while updating the booking"));
  }
};
const getBooking = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const booking = await bookingModel.find({ userId });
    if (!booking) {
      return next(createHttpError(400, "booking not found"));
    }
    res.status(200).json({
      success: true,
      message: "booking found succesfully",
      data: booking,
    });
  } catch (error) {
    console.error("booking not found", error);
    return next(createHttpError(500, "Error while fetching the booking"));
  }
};

const getBookingById = async (req, res, next) => {
  try {
    const booking = await bookingModel.findById(req.params.id, req.body);

    if (!booking) {
      return next(createHttpError(400, "booking not found"));
    }
    res.status(200).json({
      success: true,
      message: "booking found succesfully",
      data: booking,
    });
  } catch (error) {
    console.error("error while finding the booking");
    return next(createHttpError(500, "errror whiile find the booking"));
  }
};

const getAllBooking = async (req, res, next) => {
  try {
    const bookings = await bookingModel.find();
    res.status(200).json({
      success: true,
      message: "All bookings fetched successfully",
      data: bookings,
    });
  } catch (error) {
    console.error("Error while fetching all bookings", error);
    return next(createHttpError(500, "Error while fetching all bookings"));
  }
};

export {
  createBooking,
  updateBooking,
  getBookingById,
  getAllBooking,
  getBooking,
};
