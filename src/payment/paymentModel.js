import mongoose from "mongoose";
import constants from "../utils/constants.js";

const paymentSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Booking",
    },
    amount: {
      type: Number,
      required: true,
    },
    paymentStatus: {
      type: String,
      required: true,

      enum: {
        values: [
          constants.PAYMENT_STATUS.failed,
          constants.PAYMENT_STATUS.pending,
          constants.PAYMENT_STATUS.success,
        ],
        default: constants.PAYMENT_STATUS.pending,
      },
    },
    paymentMethod: {
      type: String,
      required: true,
    },
    transactionId: {
      type: String,
    },
  },
  { timestamps: true }
);

export default mongoose.model("payment", paymentSchema);
