const winston = require("../config/logger");
const { errorResponse } = require("../utils/responseHandler");
const CustomError = require("../utils/errors");

// Global error handling middleware
const errorHandler = (err, req, res, next) => {
  // Log the error
  winston.error(`${err.name}: ${err.message}`, {
    status: err.status || 500,
    url: req.originalUrl,
    method: req.method,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });

  // Handle specific error types
  if (err.name === "ValidationError") {
    // Mongoose validation errors
    const messages = Object.values(err.errors).map((val) => val.message);
    return errorResponse(res, new CustomError(messages.join(", "), 400));
  }

  if (err.name === "MongoServerError" && err.code === 11000) {
    // Duplicate key error
    return errorResponse(
      res,
      new CustomError("Duplicate field value entered", 400)
    );
  }

  if (err.name === "JsonWebTokenError") {
    // JWT errors
    return errorResponse(res, new CustomError("Invalid token", 401));
  }

  if (err.name === "TokenExpiredError") {
    // Expired JWT
    return errorResponse(res, new CustomError("Token expired", 401));
  }

  // Handle custom errors
  if (err instanceof CustomError) {
    return errorResponse(res, err);
  }

  // Default to internal server error
  return errorResponse(res, new CustomError("Internal Server Error", 500));
};

module.exports = { errorHandler };
