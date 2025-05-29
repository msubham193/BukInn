const Joi = require("joi");

// MongoDB ObjectId validation
const objectId = Joi.string().hex().length(24).messages({
  "string.hex": "ID must be a valid MongoDB ObjectId",
  "string.length": "ID must be 24 characters long",
});

// Validation schemas
const schemas = {
  // Get categories
  getCategories: Joi.object({
    query: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(10),
      q: Joi.string().min(1).optional(),
    }),
  }),

  // Get category by ID
  getCategoryById: Joi.object({
    params: Joi.object({
      id: objectId.required().messages({
        "any.required": "Category ID is required",
      }),
    }),
  }),

  // Create category
  createCategory: Joi.object({
    body: Joi.object({
      name: Joi.string().trim().min(2).max(50).required().messages({
        "string.min": "Name must be at least 2 characters",
        "string.max": "Name cannot exceed 50 characters",
        "any.required": "Name is required",
      }),
      description: Joi.string().trim().max(200).optional().allow("").messages({
        "string.max": "Description cannot exceed 200 characters",
      }),
    }),
  }),

  // Update category
  updateCategory: Joi.object({
    body: Joi.object({
      name: Joi.string().trim().min(2).max(50).optional().messages({
        "string.min": "Name must be at least 2 characters",
        "string.max": "Name cannot exceed 50 characters",
      }),
      description: Joi.string().trim().max(200).optional().allow("").messages({
        "string.max": "Description cannot exceed 200 characters",
      }),
    })
      .or("name", "description")
      .messages({
        "object.missing": "At least one field must be provided for update",
      }),
    params: Joi.object({
      id: objectId.required().messages({
        "any.required": "Category ID is required",
      }),
    }),
  }),

  // Delete category
  deleteCategory: Joi.object({
    params: Joi.object({
      id: objectId.required().messages({
        "any.required": "Category ID is required",
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
const getCategories = createValidationMiddleware(schemas.getCategories);
const getCategoryById = createValidationMiddleware(schemas.getCategoryById);
const createCategory = createValidationMiddleware(schemas.createCategory);
const updateCategory = createValidationMiddleware(schemas.updateCategory);
const deleteCategory = createValidationMiddleware(schemas.deleteCategory);

module.exports = {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
};
