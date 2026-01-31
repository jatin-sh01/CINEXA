import express from "express";
import {
  createPayment,
  getPaymentById,
  getAllPayment,
} from "./paymentController.js";
import { authMiddleware, isAdmin } from "../user/userMiddleware.js";
import { validatePaymentCreateRequest } from "./paymentMiddleware.js";
const paymentRouter = express.Router();

paymentRouter.post(
  "/",
  authMiddleware,
  validatePaymentCreateRequest,
  createPayment
);
paymentRouter.get("/:id", authMiddleware, getPaymentById);
paymentRouter.get("/", authMiddleware, isAdmin, getAllPayment);

export default paymentRouter;
