import bcrypt from "bcryptjs";
import createHttpError from "http-errors";
import jwt from "jsonwebtoken";
import userModel from "./userModel.js";
import { config } from "../config/config.js";

const ACCESS_TOKEN_TTL = "7d";

const signAccessToken = (userId) =>
  jwt.sign({ sub: userId }, config.JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_TTL,
    issuer: "cinexa.api",
  });

const createUser = async (req, res, next) => {
  const { name, email, password } = req.body;

  try {
    const newUser = await userModel.create({ name, email, password });
    const token = signAccessToken(newUser._id);
    return res.status(201).json({ accessToken: token });
  } catch (error) {
    if (error.code === 11000) {
      // Surface duplicate emails as 409 so the client knows to prompt for login instead.
      return next(createHttpError(409, "User already exists with this email"));
    }
    console.error("error while creating user", error);
    return next(createHttpError(500, "Unable to create user"));
  }
};

const loginUser = async (req, res, next) => {
  const { email, password } = req.body;
  let user;

  try {
    user = await userModel.findOne({ email });
    if (!user) {
      // Generic message prevents attackers from confirming valid emails.
      return next(createHttpError(400, "Invalid credentials"));
    }
  } catch (error) {
    console.error("error while finding user during login", error);
    return next(createHttpError(500, "Error while checking user credentials"));
  }

  try {
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return next(createHttpError(400, "Invalid credentials"));
    }
  } catch (error) {
    console.error("error while comparing password", error);
    return next(createHttpError(500, "Error while checking user credentials"));
  }

  try {
    const token = signAccessToken(user._id);
    return res.status(200).json({ accessToken: token });
  } catch (error) {
    console.error("error while signing the jwt token", error);
    return next(createHttpError(500, "Error while signing the jwt token"));
  }
};

const resetPassword = async (req, res, next) => {
  const { email, newPassword } = req.body;
  let user;

  try {
    const lookup = req.user?.id ? { _id: req.user.id } : { email };
    user = await userModel.findOne(lookup);
    if (!user || (email && user.email !== email)) {
      return next(createHttpError(400, "Invalid credentials"));
    }
  } catch (error) {
    console.error("error while finding the user during reset", error);
    return next(createHttpError(500, "Error while checking user"));
  }

  try {
    // Assigning here lets the Mongoose hook re-hash, keeping hashing centralized.
    user.password = newPassword;
    await user.save();
    return res.status(200).json({ message: "Password reset successful" });
  } catch (error) {
    console.error("error while resetting password", error);
    return next(createHttpError(500, "Error while resetting password"));
  }
};

export { createUser, loginUser, resetPassword };
