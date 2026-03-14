import express from "express";
import cors from "cors";
import globalErrorHandler from "./shared/middlewares/globalErrorHandler.js";
import movieRouter from "./movie/movieRoutes.js";
import theaterRouter from "./theater/theaterRoutes.js";
import userRouter from "./user/userRoutes.js";
import bookingRouter from "./booking/bookingRoutes.js";
import showRouter from "./show/showRoutes.js";
import paymentRouter from "./payment/paymentRoutes.js";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = process.env.CORS_ORIGINS
        ? process.env.CORS_ORIGINS.split(",").map((o) => o.trim())
        : [];
      // Add regex patterns for local/private IPs
      const regexOrigins = [
        /^http:\/\/(localhost|127\.0\.0\.1):\d+$/,
        /^http:\/\/192\.168\.\d+\.\d+:\d+$/,
        /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/,
        /^http:\/\/172\.(1[6-9]|2\d|3[01])\.\d+\.\d+:\d+$/,
      ];
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        regexOrigins.some((re) => re.test(origin))
      ) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);
app.use("/api/movies", movieRouter);
app.use("/api/theaters", theaterRouter);
app.use("/api/users", userRouter);
app.use("/api/booking", bookingRouter);
app.use("/api/show", showRouter);
app.use("/api/payment", paymentRouter);

app.use(globalErrorHandler);
export default app;
