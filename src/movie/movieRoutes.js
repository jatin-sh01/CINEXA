import express from "express";
import { validateMoviePayload } from "./movieMiddleware.js";
import {
  createMovie,
  deleteMovie,
  getAllMovies,
  getMovie,
  updateMovie,
} from "./movieController.js";

const movieRouter = express.Router();

movieRouter.post("/", validateMoviePayload, createMovie);
movieRouter.get("/", getAllMovies); // Move HERE (before /:id)
movieRouter.get("/:id", getMovie);
movieRouter.put("/:id", validateMoviePayload, updateMovie);
movieRouter.delete("/:id", deleteMovie);

export default movieRouter;
