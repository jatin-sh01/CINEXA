import express from "express";
import globalErrorHandler from "./shared/middlewares/globalErrorHandler.js";
import movieRouter from "./movie/movieRoutes.js";

const app = express();
app.use(express.json());
app.use("/api/movies", movieRouter);
app.use(globalErrorHandler);
export default app;
