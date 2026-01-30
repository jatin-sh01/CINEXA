import { Types } from "mongoose";
const ObjectId = Types.ObjectId;
import createHttpError from "http-errors";
import theaterModel from "../theater/theaterModel.js";
import movieModel from "../movie/movieModel.js";

const validateShowCreateRequest = async (req, res, next) => {
  const { theaterId, movieId, timing, noOfSeats, price } = req.body;

  // Validate theaterId
  if (!theaterId) {
    return next(createHttpError(400, "No theaterId provided"));
  }
  if (!ObjectId.isValid(theaterId)) {
    return next(createHttpError(400, "Invalid theaterId provided"));
  }
  const theater = await theaterModel.findById(theaterId);
  if (!theater) {
    return next(createHttpError(404, "No theater found for this id"));
  }

  // Validate movieId
  if (!movieId) {
    return next(createHttpError(400, "No movieId provided"));
  }
  if (!ObjectId.isValid(movieId)) {
    return next(createHttpError(400, "Invalid movieId provided"));
  }
  // Check if movie exists in theater's movies array
  if (!theater.movies.map((id) => id.toString()).includes(movieId)) {
    return next(createHttpError(404, "Movie not found in given theater"));
  }

  // Validate timing
  if (!timing) {
    return next(createHttpError(400, "No timing provided"));
  }

  // Validate noOfSeats
  if (!noOfSeats) {
    return next(createHttpError(400, "No noOfSeats provided"));
  }

  // Validate price
  if (price === undefined) {
    return next(createHttpError(400, "No price provided"));
  }

  next();
};

const validateShowUpdateRequest = async (req, res, next) => {
  // Prevent updating theaterId or movieId
  if (req.body.theaterId || req.body.movieId) {
    return next(
      createHttpError(400, "Updating theaterId or movieId is not allowed")
    );
  }

  // Optionally, validate fields if present
  if (req.body.timing && typeof req.body.timing !== "string") {
    return next(createHttpError(400, "Invalid timing format"));
  }
  if (req.body.noOfSeats && typeof req.body.noOfSeats !== "string") {
    return next(createHttpError(400, "Invalid noOfSeats format"));
  }
  if (req.body.price && typeof req.body.price !== "number") {
    return next(createHttpError(400, "Invalid price format"));
  }

  next();
};

export { validateShowCreateRequest, validateShowUpdateRequest };
