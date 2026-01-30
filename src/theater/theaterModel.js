import mongoose from "mongoose";

const theaterSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    pincode: {
      type: Number,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      required: true,
    },
    totalScreens: {
      type: Number,
      required: true,
      min: [1, "Total screens must be a positive number."],
    },
    movies: {
      type: [mongoose.Schema.ObjectId],
      ref: "Movie",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Theater", theaterSchema);
