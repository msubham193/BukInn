const Joi = require("joi");

// Phone number regex (E.164 format, e.g., +12345678901)
const phoneNumberRegex = /^\+[1-9]\d{1,14}$/;

// Validation schemas
const schemas = {
  // Signup validation schema
  signup: Joi.object({
    phoneNumber: Joi.string().pattern(phoneNumberRegex).required().messages({
      "string.pattern.base":
        "Phone number must be in E.164 format (e.g., +12345678901)",
      "any.required": "Phone number is required",
    }),
    name: Joi.string().min(2).max(50).required().messages({
      "string.min": "Name must be at least 2 characters",
      "string.max": "Name cannot exceed 50 characters",
      "any.required": "Name is required",
    }),
    role: Joi.string().valid("user", "admin").required().messages({
      "any.only": "Role must be either 'user' or 'admin'",
      "any.required": "Role is required",
    }),
  }),

  // Send OTP validation schema
  sendOtp: Joi.object({
    phoneNumber: Joi.string().pattern(phoneNumberRegex).required().messages({
      "string.pattern.base":
        "Phone number must be in E.164 format (e.g., +12345678901)",
      "any.required": "Phone number is required",
    }),
  }),

  // Verify OTP validation schema
  verifyOtp: Joi.object({
    userId: Joi.string().hex().length(24).required().messages({
      "string.hex": "User ID must be a valid MongoDB ObjectId",
      "string.length": "User ID must be 24 characters long",
      "any.required": "User ID is required",
    }),
    otp: Joi.string().length(6).pattern(/^\d+$/).required().messages({
      "string.length": "OTP must be 6 digits",
      "string.pattern.base": "OTP must contain only digits",
      "any.required": "OTP is required",
    }),
  }),

  // Login validation schema
  login: Joi.object({
    phoneNumber: Joi.string().pattern(phoneNumberRegex).required().messages({
      "string.pattern.base":
        "Phone number must be in E.164 format (e.g., +12345678901)",
      "any.required": "Phone number is required",
    }),
  }),

  // Refresh token validation schema
  refreshToken: Joi.object({
    refreshToken: Joi.string().required().messages({
      "any.required": "Refresh token is required",
    }),
  }),

  // Update profile validation schema
  updateProfile: Joi.object({
    name: Joi.string().min(2).max(50).optional().messages({
      "string.min": "Name must be at least 2 characters",
      "string.max": "Name cannot exceed 50 characters",
    }),
    email: Joi.string().email().optional().allow("").messages({
      "string.email": "Invalid email format",
    }),
  })
    .or("name", "email")
    .messages({
      "object.missing": "At least one field (name or email) must be provided",
    }),
};

// Helper function to create validation middleware
const createValidationMiddleware = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false, // Return all errors, not just the first one
      allowUnknown: false, // Don't allow unknown fields
      stripUnknown: true, // Remove unknown fields
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
      }));

      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors,
      });
    }

    // Replace req.body with validated and sanitized data
    req.body = value;
    next();
  };
};

// Create middleware functions for each schema
const signup = createValidationMiddleware(schemas.signup);
const sendOtp = createValidationMiddleware(schemas.sendOtp);
const verifyOtp = createValidationMiddleware(schemas.verifyOtp);
const login = createValidationMiddleware(schemas.login);
const refreshToken = createValidationMiddleware(schemas.refreshToken);
const updateProfile = createValidationMiddleware(schemas.updateProfile);

module.exports = {
  signup,
  sendOtp,
  verifyOtp,
  login,
  refreshToken,
  updateProfile,
};
