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
import {
  authMiddleware,
  isAdmin,
  isClientOrAdmin,
} from "../user/userMiddleware.js";

const theaterRouter = express.Router();

// CREATE
theaterRouter.post(
  "/",
  authMiddleware,
  isClientOrAdmin,
  validateTheaterPayload,
  createTheater
);

// DELETE
theaterRouter.delete(
  "/:id",
  authMiddleware,
  isClientOrAdmin,
  ensureValidTheaterId,
  deleteTheater
);

// READ (single)
theaterRouter.get("/:id", ensureValidTheaterId, getTheater);

// READ (all)
theaterRouter.get("/", getAllTheaters);

// UPDATE (PATCH/PUT)
theaterRouter.patch(
  "/:id",
  authMiddleware,
  isClientOrAdmin,
  ensureValidTheaterId,
  updateTheater
);
theaterRouter.put(
  "/:id",
  authMiddleware,
  isClientOrAdmin,
  ensureValidTheaterId,
  validateTheaterPayload,
  updateTheater
);

// PATCH movies in theater
theaterRouter.patch("/:id/movies", validateMovieIds, updatedMovieIntheater);

// GET movies in theater
theaterRouter.get("/:id/movies", ensureValidTheaterId, getMovieInTheater);

// GET specific movie in theater
theaterRouter.get("/:id/movies/:movieId", ensureValidTheaterId, checkMovie);

export default theaterRouter;
