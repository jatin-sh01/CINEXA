import jwt from "jsonwebtoken";
import createHttpError from "http-errors";
import { config } from "../config/config.js";

const EMAIL_REGEX = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;

export const normalizeEmail = (req, res, next) => {
  const normalize = (value) => value.trim().toLowerCase();

  if (typeof req.body?.email === "string") {
    req.body.email = normalize(req.body.email);
  }

  if (typeof req.query?.email === "string") {
    req.query.email = normalize(req.query.email);
  }
  return next();
};

export const validateBody = (rules) => (req, res, next) => {
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

    if (checks.email && typeof value === "string" && !EMAIL_REGEX.test(value)) {
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

export const authMiddleware = (req, res, next) => {
  const authorization = req.headers.authorization || "";
  if (!authorization.startsWith("Bearer ")) {
    return next(createHttpError(401, "Authentication required"));
  }

  const token = authorization.split(" ")[1];

  try {
    const payload = jwt.verify(token, config.JWT_SECRET);
    // Attaching the user context keeps downstream handlers stateless.
    req.user = { id: payload.sub, role: payload.role };
    return next();
  } catch (error) {
    return next(createHttpError(401, "Authentication required"));
  }
};

export const attachEmailQueryToBody = (req, _res, next) => {
  if (req.query?.email && !req.body?.email) {
    req.body = { ...req.body, email: req.query.email };
  }
  return next();
};
