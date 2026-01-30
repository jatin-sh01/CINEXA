import express from "express";
import globalErrorHandler from "./shared/middlewares/globalErrorHandler.js";
import movieRouter from "./movie/movieRoutes.js";
import theaterRouter from "./theater/theaterRoutes.js";
import userRouter from "./user/userRoutes.js";
import bookingRouter from "./booking/bookingRoutes.js";
import showRouter from "./show/showRoutes.js";

const app = express();
app.use(express.json());
app.use("/api/movies", movieRouter);
app.use("/api/theaters", theaterRouter);
app.use("/api/users", userRouter);
app.use("/api/booking", bookingRouter);
app.use("/api/show", showRouter);

app.use(globalErrorHandler);
export default app;
