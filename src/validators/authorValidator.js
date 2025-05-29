const Joi = require("joi");

// MongoDB ObjectId validation
const objectId = Joi.string().hex().length(24).messages({
  "string.hex": "ID must be a valid MongoDB ObjectId",
  "string.length": "ID must be 24 characters long",
});

// Validation schemas
const schemas = {
  // Get authors
  getAuthors: Joi.object({
    query: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(10),
      q: Joi.string().min(1).optional(),
    }),
  }),

  // Get author by ID
  getAuthorById: Joi.object({
    params: Joi.object({
      id: objectId.required().messages({
        "any.required": "Author ID is required",
      }),
    }),
  }),

  // Create author
  createAuthor: Joi.object({
    body: Joi.object({
      name: Joi.string().trim().min(2).max(100).required().messages({
        "string.min": "Name must be at least 2 characters",
        "string.max": "Name cannot exceed 100 characters",
        "any.required": "Name is required",
      }),
      bio: Joi.string().trim().max(500).optional().allow("").messages({
        "string.max": "Bio cannot exceed 500 characters",
      }),
      email: Joi.string().email().optional().allow("").messages({
        "string.email": "Invalid email format",
      }),
      website: Joi.string().uri().optional().allow("").messages({
        "string.uri": "Invalid website URL",
      }),
      profileImage: Joi.string().uri().optional().allow("").messages({
        "string.uri": "Invalid profile image URL",
      }),
    }),
  }),

  // Update author
  updateAuthor: Joi.object({
    body: Joi.object({
      name: Joi.string().trim().min(2).max(100).optional().messages({
        "string.min": "Name must be at least 2 characters",
        "string.max": "Name cannot exceed 100 characters",
      }),
      bio: Joi.string().trim().max(500).optional().allow("").messages({
        "string.max": "Bio cannot exceed 500 characters",
      }),
      email: Joi.string().email().optional().allow("").messages({
        "string.email": "Invalid email format",
      }),
      website: Joi.string().uri().optional().allow("").messages({
        "string.uri": "Invalid website URL",
      }),
      profileImage: Joi.string().uri().optional().allow("").messages({
        "string.uri": "Invalid profile image URL",
      }),
    })
      .or("name", "bio", "email", "website", "profileImage")
      .messages({
        "object.missing": "At least one field must be provided for update",
      }),
    params: Joi.object({
      id: objectId.required().messages({
        "any.required": "Author ID is required",
      }),
    }),
  }),

  // Delete author
  deleteAuthor: Joi.object({
    params: Joi.object({
      id: objectId.required().messages({
        "any.required": "Author ID is required",
      }),
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
const getAuthors = createValidationMiddleware(schemas.getAuthors);
const getAuthorById = createValidationMiddleware(schemas.getAuthorById);
const createAuthor = createValidationMiddleware(schemas.createAuthor);
const updateAuthor = createValidationMiddleware(schemas.updateAuthor);
const deleteAuthor = createValidationMiddleware(schemas.deleteAuthor);

module.exports = {
  getAuthors,
  getAuthorById,
  createAuthor,
  updateAuthor,
  deleteAuthor,
};
