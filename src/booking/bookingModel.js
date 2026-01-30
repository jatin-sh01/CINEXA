import mongoose from "mongoose";
import constants from "../utils/constants.js";

const bookingSchema = new mongoose.Schema(
  {
    theaterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Theater",
      required: true,
    },
    movieId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Movie",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    timing: {
      type: String,
      required: true,
    },
    noOfSeats: {
      type: String,
      required: true,
    },
    totalCost: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: [
        constants.BOOKING_STATUS.processing,
        constants.BOOKING_STATUS.cancelled,
        constants.BOOKING_STATUS.successfull,
        constants.BOOKING_STATUS.expired,
      ],
      default: constants.BOOKING_STATUS.processing,
    },
    seat: {
      type: String,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Booking", bookingSchema);
