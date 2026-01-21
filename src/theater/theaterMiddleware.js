import mongoose from "mongoose";
import createHttpError from "http-errors";
import theaterModel from "./theaterModel.js";
import movieModel from "../movie/movieModel.js";

export const ensureValidTheaterId = (req, _res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return next(createHttpError(400, "Invalid theater id"));
  }
  next();
};

export const loadTheater = async (req, _res, next) => {
  try {
    const theater = await theaterModel.findById(req.params.id);
    if (!theater) {
      return next(createHttpError(404, "Theater not found"));
    }
    req.theater = theater;
    return next();
  } catch (error) {
    return next(error);
  }
};

export const validateTheaterPayload = (req, _res, next) => {
  const { name, address, city, totalScreens } = req.body ?? {};

  if (typeof name !== "string" || !name.trim()) {
    return next(createHttpError(400, "Theater name is required."));
  }
  if (typeof address !== "string" || !address.trim()) {
    return next(createHttpError(400, "Theater address is required."));
  }
  if (typeof city !== "string" || !city.trim()) {
    return next(createHttpError(400, "City is required."));
  }
  if (typeof totalScreens !== "number" || totalScreens <= 0) {
    return next(
      createHttpError(400, "Total screens must be a positive number.")
    );
  }

  return next();
};

export const validateMovieIds = async (req, _res, next) => {
  try {
    const { movieIds } = req.body ?? {};
    if (!Array.isArray(movieIds) || movieIds.length === 0) {
      return next(
        createHttpError(400, "movieIds must be a non-empty array of ids")
      );
    }

    const uniqueMovieIds = [...new Set(movieIds.map(String))];
    if (!uniqueMovieIds.every((id) => mongoose.isValidObjectId(id))) {
      return next(createHttpError(400, "movieIds contains invalid ids"));
    }

    const count = await movieModel.countDocuments({
      _id: { $in: uniqueMovieIds },
    });
    if (count !== uniqueMovieIds.length) {
      return next(createHttpError(404, "One or more movies not found"));
    }

    req.movieIds = uniqueMovieIds;
    return next();
  } catch (error) {
    return next(error);
  }
};