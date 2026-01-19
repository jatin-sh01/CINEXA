import { config } from "../config/config.js";

const globalErrorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  return res.status(statusCode).json({
    message: err.message || "Internal Server Error",
    errorStack: config.env === "development" ? err.stack : "",
  });
};

export default globalErrorHandler;
