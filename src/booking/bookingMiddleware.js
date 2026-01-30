import { Types } from "mongoose";
const ObjectId = Types.ObjectId;
import createHttpError from "http-errors";
import theaterModel from "../theater/theaterModel.js";
import movieModel from "../movie/movieModel.js";
import userModel from "../user/userModel.js";

const validateBookingCreateRequest = async (req, res, next) => {
  // Validate theaterId presence
  if (!req.body.theaterId) {
    return next(createHttpError(400, "No theaterId provided"));
  }

  // Validate correct theaterId format
  if (!ObjectId.isValid(req.body.theaterId)) {
    return next(createHttpError(400, "Invalid theaterId provided"));
  }

  // Check if theater exists in database
  const theater = await theaterModel.findById(req.body.theaterId);
  if (!theater) {
    return next(createHttpError(404, "No theater found for this given id"));
  }

  // Validate movieId presence
  if (!req.body.movieId) {
    return next(createHttpError(400, "No movieId present"));
  }

  // Validate correct movieId format
  if (!ObjectId.isValid(req.body.movieId)) {
    return next(createHttpError(400, "Invalid movieId provided"));
  }

  // Validate if movie is running in the theater
  if (!theater.movies.map((id) => id.toString()).includes(req.body.movieId)) {
    return next(
      createHttpError(
        404,
        "Given movie is not available in the requested theater"
      )
    );
  }

  // Validate presence of timing
  if (!req.body.timing) {
    return next(createHttpError(400, "No movie timing passed"));
  }

  // Validate noOfSeats presence
  if (!req.body.noOfSeats) {
    return next(createHttpError(400, "No seat provided"));
  }

  // Request is correct
  next();
};


export { validateBookingCreateRequest };
