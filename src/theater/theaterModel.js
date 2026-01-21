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
    movies: {
      type: [mongoose.Schema.ObjectId],
      ref: "Movie",
    },
  },
  { timestamps: true }
);

export default mongoose.model(" Theater", theaterSchema);
