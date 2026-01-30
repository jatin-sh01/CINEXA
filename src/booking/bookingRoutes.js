import express from "express";
import {
  createBooking,
  updateBooking,
  getAllBooking,
  getBookingById,
  getBooking
} from "./bookingController.js";
import { validateBookingCreateRequest } from "./bookingMiddleware.js";
import {
  authMiddleware,
  isAdmin,
  isClientOrAdmin,
} from "../user/userMiddleware.js";

const bookingRouter = express.Router();

bookingRouter.post(
  "/",
  authMiddleware,
  isClientOrAdmin,
  validateBookingCreateRequest,
  createBooking
);

bookingRouter.patch("/:id", authMiddleware, isClientOrAdmin, updateBooking);
bookingRouter.get("/:id", authMiddleware, getBookingById);
bookingRouter.get("/", authMiddleware, isClientOrAdmin, getAllBooking);
bookingRouter.get("/", authMiddleware, isClientOrAdmin, getBooking);

export default bookingRouter;
