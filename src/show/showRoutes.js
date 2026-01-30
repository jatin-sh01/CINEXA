import express from "express";
import {
  createShow,
  getShows,
  updateShow,
  deleteShow,
} from "./showController.js";
import { authMiddleware } from "../user/userMiddleware.js";
import {
  validateShowCreateRequest,
  validateShowUpdateRequest,
} from "./showMiddleware.js";
const showRouter = express.Router();

showRouter.post("/", authMiddleware, validateShowCreateRequest, createShow);
showRouter.patch("/:id", authMiddleware, updateShow);
showRouter.get("/", getShows);
showRouter.delete(
  "/:id",
  authMiddleware,
  validateShowUpdateRequest,
  deleteShow
);
export default showRouter;
