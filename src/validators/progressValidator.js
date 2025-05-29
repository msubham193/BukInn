const Joi = require("joi");

// MongoDB ObjectId validation
const objectId = Joi.string().hex().length(24).messages({
  "string.hex": "ID must be a valid MongoDB ObjectId",
  "string.length": "ID must be 24 characters long",
});

// Validation schemas
const schemas = {
  // Update progress
  updateProgress: Joi.object({
    body: Joi.object({
      bookId: objectId.required().messages({
        "any.required": "Book ID is required",
      }),
      chapterOrder: Joi.number().integer().min(1).required().messages({
        "number.base": "Chapter order must be a number",
        "number.integer": "Chapter order must be an integer",
        "number.min": "Chapter order must be at least 1",
        "any.required": "Chapter order is required",
      }),
    }),
  }),

  // Get progress for a book
  getProgress: Joi.object({
    params: Joi.object({
      bookId: objectId.required().messages({
        "any.required": "Book ID is required",
      }),
    }),
  }),

  // Get all progress
  getAllProgress: Joi.object({
    query: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(10),
    }),
  }),
};

// Helper function to create validation middleware that handles params, query, and body
const createValidationMiddleware = (schema) => {
  return (req, res, next) => {
    // Prepare validation object based on what's in the schema
    const validationObject = {};

    if (schema.describe().keys.params) {
      validationObject.params = req.params;
    }

    if (schema.describe().keys.query) {
      validationObject.query = req.query;
    }

    if (schema.describe().keys.body) {
      validationObject.body = req.body;
    }

    const { error, value } = schema.validate(validationObject, {
      abortEarly: false, // Return all errors, not just the first one
      allowUnknown: false, // Don't allow unknown fields
      stripUnknown: true, // Remove unknown fields
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
        location: detail.path[0], // 'params', 'query', or 'body'
      }));

      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors,
      });
    }

    // Replace req properties with validated and sanitized data
    if (value.params) req.params = value.params;
    if (value.query) req.query = value.query;
    if (value.body) req.body = value.body;

    next();
  };
};

// Create middleware functions for each schema
const updateProgress = createValidationMiddleware(schemas.updateProgress);
const getProgress = createValidationMiddleware(schemas.getProgress);
const getAllProgress = createValidationMiddleware(schemas.getAllProgress);

module.exports = {
  updateProgress,
  getProgress,
  getAllProgress,
};
