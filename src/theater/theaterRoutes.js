import express from "express";
import {
  createTheater,
  deleteTheater,
  getAllTheaters,
  getMovieInTheater,
  getTheater,
  updateTheater,
  updatedMovieIntheater,
  checkMovie,
} from "./theaterController.js";
import {
  ensureValidTheaterId,
  validateTheaterPayload,
  validateMovieIds,
} from "./theaterMiddleware.js";

const theaterRouter = express.Router();

theaterRouter.post("/", validateTheaterPayload, createTheater);
theaterRouter.get("/", getAllTheaters);
theaterRouter.get("/:id", ensureValidTheaterId, getTheater);
theaterRouter.put(
  "/:id",
  ensureValidTheaterId,
  validateTheaterPayload,
  updateTheater
);
theaterRouter.delete("/:id", ensureValidTheaterId, deleteTheater);

theaterRouter.get("/:id/movies", ensureValidTheaterId, getMovieInTheater);
theaterRouter.patch(
  "/:id/movies",
  ensureValidTheaterId,
  validateMovieIds,
  updatedMovieIntheater
);
theaterRouter.get("/:id/movies/:movieId", ensureValidTheaterId, checkMovie);

export default theaterRouter;
