import mongoose from "mongoose";

const movieSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      minLength: 2,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      minLength: 5,
      trim: true,
    },
    cast: {
      type: [String],
      required: true,
      trim: true,
    },
    trailerUrl: {
      type: String,
      required: true,
      trim: true,
    },
    language: {
      type: String,
      required: true,
      default: "English",
    },
    releaseDate: {
      type: Date,
      required: true,
    },
    director: {
      type: String,
      required: true,
      trim: true,
    },
    releaseStatus: {
      type: String,
      required: true,
      enum: ["COMING_SOON", "RELEASED", "BLOCKED"],
      default: "RELEASED",
    },
    poster: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Movie", movieSchema);
