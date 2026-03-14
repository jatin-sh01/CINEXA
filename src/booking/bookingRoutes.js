import express from "express";
import {
  createBooking,
  updateBooking,
  getBookingById,
  getBooking,
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
  validateBookingCreateRequest,
  createBooking
);

bookingRouter.get("/", authMiddleware, isClientOrAdmin, getBooking);
bookingRouter.get("/:id", authMiddleware, getBookingById);
bookingRouter.patch("/:id", authMiddleware, isClientOrAdmin, updateBooking);

export default bookingRouter;
