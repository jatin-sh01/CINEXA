import express from "express";
import {
  createTheater,
  deleteTheater,
  getAllTheaters,
  getTheater,
  updateTheater,
} from "./theaterController.js";

const theaterRouter = express.Router();

theaterRouter.post("/", createTheater);
theaterRouter.get("/", getAllTheaters);
theaterRouter.get("/:id", getTheater);
theaterRouter.put("/:id", updateTheater);
theaterRouter.delete("/:id", deleteTheater);

export default theaterRouter;
