import mongoose from "mongoose";

const showSchema = new mongoose.Schema(
  {
    theaterId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Theater",
    },
    movieId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Movie",
    },
    timing: {
      type: String,
      required: true,
    },
    noOfSeats: {
      type: String,
      required: true,
    },
    seatConfiguration: {
      type: String,
    },
    price: {
      type: Number,
      required: true,
    },
    format: {
      type: String,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Show", showSchema);
