import mongoose from "mongoose";
import theaterModel from "./theaterModel.js";
import createHttpError from "http-errors";

const createTheater = async (req, res, next) => {
  try {
    const theater = await theaterModel.create(req.body);
    res.status(201).json({
      success: true,
      message: "Theater created successfully",
      data: theater,
    });
  } catch (err) {
    console.error("createTheater error:", err);
    if (err.name === "ValidationError") {
      return next(createHttpError(400, err.message));
    }
    return next(createHttpError(500, "Failed to create theater"));
  }
};

const updateTheater = async (req, res, next) => {
  try {
    const theater = await theaterModel.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );
    if (!theater) {
      return next(createHttpError(404, "Theater not found"));
    }
    res.status(200).json({
      success: true,
      message: "Theater updated successfully",
      data: theater,
    });
  } catch (error) {
    console.error("updateTheater error:", error);
    if (error instanceof mongoose.Error.CastError) {
      return next(createHttpError(400, "Invalid theater id"));
    }
    if (error.name === "ValidationError") {
      return next(createHttpError(400, error.message));
    }
    return next(createHttpError(500, "Failed to update theater"));
  }
};

const getTheater = async (req, res, next) => {
  try {
    const theater = await theaterModel.findById(req.params.id);
    if (!theater) {
      return next(createHttpError(404, "Theater not found"));
    }
    res.status(200).json({
      success: true,
      message: "Theater fetched successfully",
      data: theater,
    });
  } catch (error) {
    if (error instanceof mongoose.Error.CastError) {
      return next(createHttpError(400, "Invalid theater id"));
    }
    return next(createHttpError(500, "failed to fetch theaters"));
  }
};
const getAllTheaters = async (req, res, next) => {
  try {
    const { name, city } = req.query;
    const query = {};

    if (name) {
      query.name = { $regex: name, $options: "i" };
    }
    if (city) {
      query.city = { $regex: city, $options: "i" };
    }

    const theaters = await theaterModel.find(query);
    res.status(200).json({
      success: true,
      message: "Theaters fetched successfully",
      data: theaters,
    });
  } catch (error) {
    return next(createHttpError(500, "Failed to fetch theaters"));
  }
};

const deleteTheater = async (req, res, next) => {
  try {
    const theater = await theaterModel.findByIdAndDelete(req.params.id);
    if (!theater) {
      return next(createHttpError(404, "Theater not found"));
    }
    res.status(200).json({
      success: true,
      message: "Theater deleted successfully",
      data: theater,
    });
  } catch (error) {
    if (error instanceof mongoose.Error.CastError) {
      return next(createHttpError(400, "Invalid theater id"));
    }
    return next(createHttpError(500, "Failed to delete theater"));
  }
};

export {
  createTheater,
  updateTheater,
  getTheater,
  getAllTheaters,
  deleteTheater,
};
