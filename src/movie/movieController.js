import movieModel from "./movieModel.js";
import createHttpError from "http-errors";

const createMovie = async (req, res, next) => {
  try {
    const movie = await movieModel.create(req.body);
    res.status(201).json({
      success: true,
      message: "Movie created successfully",
      data: movie,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return next(createHttpError(400, error.message));
    }
    return next(createHttpError(500, "Failed to create movie"));
  }
};

const getMovie = async (req, res, next) => {
  try {
    const movie = await movieModel.findById(req.params.id);
    if (!movie) return next(createHttpError(404, "Movie not found"));
    res.status(200).json({
      success: true,
      message: "Movie fetched successfully",
      data: movie,
    });
  } catch (error) {
    return next(createHttpError(500, "Failed to fetch movie"));
  }
};

const updateMovie = async (req, res, next) => {
  try {
    const movie = await movieModel.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!movie) return next(createHttpError(404, "Movie not found"));
    res.status(200).json({
      success: true,
      message: "Movie updated successfully",
      data: movie,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return next(createHttpError(400, error.message));
    }
    return next(createHttpError(500, "Failed to update movie"));
  }
};

const deleteMovie = async (req, res, next) => {
  try {
    const movie = await movieModel.findByIdAndDelete(req.params.id);
    if (!movie) return next(createHttpError(404, "Movie not found"));
    res.status(200).json({
      success: true,
      message: "Movie deleted successfully",
      data: movie,
    });
  } catch (error) {
    return next(createHttpError(500, "Failed to delete movie"));
  }
};

const getAllMovies = async (req, res, next) => {
  try {
    const { name } = req.query;
    const query = name ? { name: { $regex: name, $options: "i" } } : {};
    const movies = await movieModel.find(query);
    res.status(200).json({
      success: true,
      message: "Movies fetched successfully",
      data: movies,
    });
  } catch (error) {
    return next(createHttpError(500, "Failed to fetch movies"));
  }
};

export { createMovie, getMovie, updateMovie, deleteMovie, getAllMovies };
