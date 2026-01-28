import express from "express";
import {
  createUser,
  loginUser,
  resetPassword,
  getUserByEmail,
  updateUserRoleOrStatus,
} from "./userController.js";
import {
  normalizeEmail,
  validateBody,
  authMiddleware,
  attachEmailQueryToBody,
  isAdmin,
  isClient,
  isClientOrAdmin,
} from "./userMiddleware.js";

const router = express.Router();

// Example usage:
router.post(
  "/register",
  normalizeEmail,
  validateBody({
    email: { required: true, email: true },
    password: { required: true, minLength: 6 },
  }),
  createUser
);
router.post("/login", normalizeEmail, loginUser);
router.post("/reset-password", authMiddleware, resetPassword);
router.get("/user", authMiddleware, isClientOrAdmin, getUserByEmail);
router.patch("/:id/role", authMiddleware, isAdmin, updateUserRoleOrStatus);

export default router;
