const Joi = require("joi");
const { errorResponse } = require("../utils/responseHandler");
const { CustomError } = require("../utils/errorHandler");
const winston = require("../config/logger");


// Validation middleware
const validationMiddleware = (req, res, next) => {
  // Get the validation schema from the route
const schema = req.route?.options?.validate;

if (!schema) {
    winston.warn("No validation schema provided for route", {
      url: req.originalUrl,
      method: req.method,
    });
    return next();
  }

  try {
    // Validate request body, query, or params based on schema
    const { error } = schema.validate(
      {
        body: req.body,
        query: req.query,
        params: req.params,
      },
      { abortEarly: false, stripUnknown: true }
    );

    if (error) {
      const errorMessages = error.details
        .map((detail) => detail.message)
        .join(", ");
      winston.warn(`Validation failed: ${errorMessages}`, {
        url: req.originalUrl,
        method: req.method,
      });
      throw new CustomError(`Validation error: ${errorMessages}`, 400);
    }

    // Sanitize validated data
    const validatedData = schema.validate(
      {
        body: req.body,
        query: req.query,
        params: req.params,
      },
      { stripUnknown: true }
    ).value;

    // Update request with validated data
    req.body = validatedData.body || req.body;
    req.query = validatedData.query || req.query;
    req.params = validatedData.params || req.params;

    next();
  } catch (error) {
    winston.error("Validation middleware error:", error);
    return errorResponse(res, error);
  }
};

module.exports = { validationMiddleware };
