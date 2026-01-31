import { Types } from "mongoose";
import createHttpError from "http-errors";

const validatePaymentCreateRequest = (req, res, next) => {
  const { bookingId, amount, paymentMethod } = req.body;

  if (!bookingId) {
    return next(createHttpError(400, "bookingId is required"));
  }
  if (!Types.ObjectId.isValid(bookingId)) {
    return next(createHttpError(400, "Invalid bookingId"));
  }
  if (!amount) {
    return next(createHttpError(400, "amount is required"));
  }
  if (!paymentMethod) {
    return next(createHttpError(400, "paymentMethod is required"));
  }
  next();
};

export { validatePaymentCreateRequest };
