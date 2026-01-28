import jwt from "jsonwebtoken";
import createHttpError from "http-errors";
import { config } from "../config/config.js";
import userModel from "./userModel.js";
import constants from "../utils/constants.js";

const EMAIL_REGEX = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;

function normalizeEmail(req, res, next) {
  const normalize = (value) => value.trim().toLowerCase();

  if (typeof req.body?.email === "string") {
    req.body.email = normalize(req.body.email);
  }

  if (typeof req.query?.email === "string") {
    req.query.email = normalize(req.query.email);
  }
  return next();
}

function validateBody(rules) {
  return (req, res, next) => {
    const errors = {};

    Object.entries(rules).forEach(([field, checks]) => {
      const value = req.body?.[field];

      if (
        checks.required &&
        (value === undefined || value === null || `${value}`.trim() === "")
      ) {
        errors[field] = `${field} is required`;
        return;
      }

      if (
        checks.email &&
        typeof value === "string" &&
        !EMAIL_REGEX.test(value)
      ) {
        errors[field] = "Email is invalid";
      }

      if (
        checks.minLength &&
        typeof value === "string" &&
        value.length < checks.minLength
      ) {
        errors[field] =
          `${field} must be at least ${checks.minLength} characters long`;
      }
    });

    if (Object.keys(errors).length) {
      return next(
        createHttpError(400, {
          message: "Validation failed",
          details: errors,
        })
      );
    }

    return next();
  };
}

function authMiddleware(req, res, next) {
  const authorization = req.headers.authorization || "";
  if (!authorization.startsWith("Bearer ")) {
    return next(createHttpError(401, "Authentication required"));
  }

  const token = authorization.split(" ")[1];

  try {
    const payload = jwt.verify(token, config.JWT_SECRET);
    req.user = { id: payload.sub, role: payload.role };
    return next();
  } catch (error) {
    return next(createHttpError(401, "Authentication required"));
  }
}

function attachEmailQueryToBody(req, _res, next) {
  if (req.query?.email && !req.body?.email) {
    req.body = { ...req.body, email: req.query.email };
  }
  return next();
}

const isAdmin = async (req, res, next) => {
  try {
    const user = await userModel.findById(req.user.id || req.user._id);
    if (!user || user.userRole !== constants.USER_ROLE.admin) {
      return next(createHttpError(401, "Unauthorized request"));
    }
    next();
  } catch (error) {
    console.error("Unauthorized access", error);
    return next(createHttpError(401, "Unauthorized access"));
  }
};

const isClient = async (req, res, next) => {
  try {
    const user = await userModel.findById(req.user.id || req.user._id);
    if (!user || user.userRole !== constants.USER_ROLE.client) {
      return next(createHttpError(401, "User is not a client"));
    }
    next();
  } catch (error) {
    console.error("User is not a client", error);
    return next(createHttpError(401, "User is not a client"));
  }
};

const isClientOrAdmin = async (req, res, next) => {
  try {
    const user = await userModel.findById(req.user.id || req.user._id);
    if (
      !user ||
      (user.userRole !== constants.USER_ROLE.client &&
        user.userRole !== constants.USER_ROLE.admin)
    ) {
      return next(createHttpError(401, "User is not a client or admin"));
    }
    next();
  } catch (error) {
    console.error("User is not a client or admin ", error);
    return next(createHttpError(401, "User is not a client or admin"));
  }
};

// Export all middleware functions together
export {
  normalizeEmail,
  validateBody,
  authMiddleware,
  attachEmailQueryToBody,
  isAdmin,
  isClient,
  isClientOrAdmin,
};
