import express from "express";
import {
  createMovie,
  deleteMovie,
  getAllMovies,
  getMovie,
  updateMovie,
} from "./movieController.js";

const movieRouter = express.Router();

movieRouter.post("/", createMovie);
movieRouter.get("/", getAllMovies); // Move HERE (before /:id)
movieRouter.get("/:id", getMovie);
movieRouter.put("/:id", updateMovie);
movieRouter.delete("/:id", deleteMovie);

export default movieRouter;
