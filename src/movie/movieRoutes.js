import express from "express";
import { validateMoviePayload } from "./movieMiddleware.js";
import {
  createMovie,
  deleteMovie,
  getAllMovies,
  getMovie,
  updateMovie,
} from "./movieController.js";
import {
  authMiddleware,
  isAdmin,
  isClientOrAdmin,
} from "../user/userMiddleware.js";

const movieRouter = express.Router();

// Only admins or clients can create, update, or delete movies
movieRouter.post(
  "/",
  authMiddleware,
  isClientOrAdmin,
  validateMoviePayload,
  createMovie
);
movieRouter.put(
  "/:id",
  authMiddleware,
  isClientOrAdmin,
  validateMoviePayload,
  updateMovie
);
movieRouter.delete("/:id", authMiddleware, isClientOrAdmin, deleteMovie);

// Anyone can view movies
movieRouter.get("/", getAllMovies);
movieRouter.get("/:id", getMovie);

export default movieRouter;
