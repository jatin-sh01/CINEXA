import showModel from "./showModel.js";
import createHttpError from "http-errors";
import theaterModel from "../theater/theaterModel.js";

const createShow = async (req, res, next) => {
  try {
    // 1. Find the theater by ID
    const theater = await theaterModel.findById(req.body.theaterId);
    if (!theater) {
      return next(createHttpError(404, "Theater not found with this id"));
    }

    // 2. Check if the movie exists in the theater's movies array
    if (!theater.movies.map((id) => id.toString()).includes(req.body.movieId)) {
      return next(createHttpError(404, "Movie not found in given theater"));
    }

    // 3. Create the show
    const show = await showModel.create(req.body);

    // 4. Respond with the created show
    res.status(201).json({
      success: true,
      message: "Show created successfully",
      data: show,
    });
  } catch (error) {
    console.error("Error creating show:", error);
    return next(createHttpError(500, "Failed to create show"));
  }
};

const updateShow = async (req, res, next) => {
  try {
    const show = await showModel.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!show) {
      return next(createHttpError(400, "show is not found "));
    }
    res.status(200).json({
      success: true,
      message: "succesfull update the booking ",
      data: show,
    });
  } catch (error) {
    console.error("error while updating the movie", error);
    return next(createHttpError(500, "error whille updating the resource"));
  }
};

const getShows = async (req, res, next) => {
  try {
    let filter = {};
    const data = req.query;
    if (req.query.theaterId) {
      filter.theaterId = data.theaterId;
    }
    if (req.query.movieId) {
      filter.movieId = data.movieId;
    }

    const show = await showModel.find(filter);
    if (!show) {
      return next(createHttpError(400, "show not found"));
    }
    res.status(200).json({
      success: true,
      message: "succesfull fetch the show ",
      data: show,
    });
  } catch (error) {
    console.error("error while fetch the show", error);
    return next(createHttpError(500, "error whille fetch the resource"));
  }
};
const deleteShow = async (req, res, next) => {
  try {
    const show = await showModel.findByIdAndDelete(req.params.id);
    if (!show) {
      return next(createHttpError(400, "show not found "));
    }
    res.status(200).json({
      success: true,
      message: "succesfull delete the booking ",
      data: show,
    });
  } catch (error) {
    console.error("error while delete the show", error);
    return next(createHttpError(500, "error delete  the resource"));
  }
};

export { createShow, updateShow, getShows, deleteShow };
