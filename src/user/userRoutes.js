import express from "express";
import { createUser, loginUser, resetPassword } from "./userController.js";
import {
  normalizeEmail,
  validateBody,
  authMiddleware,
} from "./userMiddleware.js";

const userRouter = express.Router();

const registerRules = {
  name: { required: true, minLength: 2 },
  email: { required: true, email: true },
  password: { required: true, minLength: 8 },
};

const loginRules = {
  email: { required: true, email: true },
  password: { required: true, minLength: 8 },
};

const resetRules = {
  email: { required: true, email: true },
  newPassword: { required: true, minLength: 8 },
};

userRouter.post(
  "/register",
  normalizeEmail,
  validateBody(registerRules),
  createUser
);

userRouter.post("/login", normalizeEmail, validateBody(loginRules), loginUser);

userRouter.post(
  "/reset",
  authMiddleware,
  normalizeEmail,
  validateBody(resetRules),
  resetPassword
);

export default userRouter;
