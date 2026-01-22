import express from "express";
import globalErrorHandler from "./shared/middlewares/globalErrorHandler.js";
import movieRouter from "./movie/movieRoutes.js";
import theaterRouter from "./theater/theaterRoutes.js";
import userRouter from "./user/userRoutes.js";

const app = express();
app.use(express.json());
app.use("/api/movies", movieRouter);
app.use("/api/theaters", theaterRouter);
app.use("/api/users", userRouter);
app.use(globalErrorHandler);
export default app;
