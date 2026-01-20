import createHttpError from "http-errors";

const validateMoviePayload = (req, _res, next) => {
  const errors = [];

  if (!req.body.name?.trim()) errors.push("name is required");
  if (!req.body.description?.trim()) errors.push("description is required");
  if (!Array.isArray(req.body.cast) || req.body.cast.length === 0) {
    errors.push("cast must be a non-empty array");
  }
  if (!req.body.trailerUrl?.trim()) errors.push("trailerUrl is required");
  if (!req.body.language?.trim()) errors.push("language is required");
  if (!req.body.releaseDate) errors.push("releaseDate is required");
  if (!req.body.director?.trim()) errors.push("director is required");
  if (!req.body.releaseStatus?.trim()) errors.push("releaseStatus is required");
  if (!req.body.poster?.trim()) errors.push("poster is required");

  if (errors.length) {
    return next(createHttpError(400, errors.join(", ")));
  }

  next();
};

export { validateMoviePayload };
