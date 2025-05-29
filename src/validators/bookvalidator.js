const Joi = require("joi");

// MongoDB ObjectId validation
const objectId = Joi.string().hex().length(24).messages({
  "string.hex": "ID must be a valid MongoDB ObjectId",
  "string.length": "ID must be 24 characters long",
});

// Chapter schema for create/update
const chapterSchema = Joi.object({
  title: Joi.string().min(2).max(100).required().messages({
    "string.min": "Chapter title must be at least 2 characters",
    "string.max": "Chapter title cannot exceed 100 characters",
    "any.required": "Chapter title is required",
  }),
  content: Joi.string().required().messages({
    "any.required": "Chapter content is required",
  }),
  order: Joi.number().integer().min(1).required().messages({
    "number.base": "Chapter order must be a number",
    "number.integer": "Chapter order must be an integer",
    "number.min": "Chapter order must be at least 1",
    "any.required": "Chapter order is required",
  }),
});

// Validation schemas
const schemas = {
  // Get books (pagination and filters)
  getBooks: Joi.object({
    query: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(10),
      category: objectId.optional(),
      sortBy: Joi.string()
        .valid("title", "publishedAt", "totalReads")
        .default("publishedAt"),
      sortOrder: Joi.string().valid("asc", "desc").default("desc"),
    }),
  }),

  // Get book by ID
  getBookById: Joi.object({
    params: Joi.object({
      id: objectId.required().messages({
        "any.required": "Book ID is required",
      }),
    }),
  }),

  // Get chapter by book ID and order
  getChapter: Joi.object({
    params: Joi.object({
      id: objectId.required().messages({
        "any.required": "Book ID is required",
      }),
      order: Joi.number().integer().min(1).required().messages({
        "number.base": "Chapter order must be a number",
        "number.integer": "Chapter order must be an integer",
        "number.min": "Chapter order must be at least 1",
        "any.required": "Chapter order is required",
      }),
    }),
  }),

  // Search books
  searchBooks: Joi.object({
    query: Joi.object({
      q: Joi.string().min(1).optional().messages({
        "string.min": "Search query must be at least 1 character",
      }),
      author: Joi.string().min(1).optional().messages({
        "string.min": "Author name must be at least 1 character",
      }),
      category: objectId.optional(),
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(10),
    })
      .or("q", "author")
      .messages({
        "object.missing": "At least one of query or author must be provided",
      }),
  }),

  // Get trending books
  getTrendingBooks: Joi.object({
    query: Joi.object({
      limit: Joi.number().integer().min(1).max(50).default(10),
      period: Joi.string().valid("day", "week", "month").default("week"),
    }),
  }),

  // Get author-based suggestions
  getSuggestions: Joi.object({
    query: Joi.object({
      authorId: objectId.required().messages({
        "any.required": "Author ID is required",
      }),
      limit: Joi.number().integer().min(1).max(50).default(5),
    }),
  }),

  // Create book
  createBook: Joi.object({
    body: Joi.object({
      title: Joi.string().min(2).max(100).required().messages({
        "string.min": "Title must be at least 2 characters",
        "string.max": "Title cannot exceed 100 characters",
        "any.required": "Title is required",
      }),
      description: Joi.string().max(1000).optional().allow("").messages({
        "string.max": "Description cannot exceed 1000 characters",
      }),
      author: objectId.required().messages({
        "any.required": "Author ID is required",
      }),
      categories: Joi.array().items(objectId).optional().messages({
        "array.includes": "Each category must be a valid MongoDB ObjectId",
      }),
      coverImage: Joi.string().uri().optional().allow("").messages({
        "string.uri": "Cover image must be a valid URL",
      }),
      chapters: Joi.array().items(chapterSchema).min(1).required().messages({
        "array.min": "At least one chapter is required",
        "any.required": "Chapters are required",
      }),
      contentStatus: Joi.string()
        .valid("draft", "published", "archived")
        .default("draft"),
    }),
  }),

  // Update book
  updateBook: Joi.object({
    body: Joi.object({
      title: Joi.string().min(2).max(100).optional().messages({
        "string.min": "Title must be at least 2 characters",
        "string.max": "Title cannot exceed 100 characters",
      }),
      description: Joi.string().max(1000).optional().allow("").messages({
        "string.max": "Description cannot exceed 1000 characters",
      }),
      author: objectId.optional(),
      categories: Joi.array().items(objectId).optional().messages({
        "array.includes": "Each category must be a valid MongoDB ObjectId",
      }),
      coverImage: Joi.string().uri().optional().allow("").messages({
        "string.uri": "Cover image must be a valid URL",
      }),
      chapters: Joi.array().items(chapterSchema).optional().messages({
        "array.includes": "Each chapter must follow the chapter schema",
      }),
      contentStatus: Joi.string()
        .valid("draft", "published", "archived")
        .optional(),
    })
      .or(
        "title",
        "description",
        "author",
        "categories",
        "coverImage",
        "chapters",
        "contentStatus"
      )
      .messages({
        "object.missing": "At least one field must be provided for update",
      }),
    params: Joi.object({
      id: objectId.required().messages({
        "any.required": "Book ID is required",
      }),
    }),
  }),

  // Delete book
  deleteBook: Joi.object({
    params: Joi.object({
      id: objectId.required().messages({
        "any.required": "Book ID is required",
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
const getBooks = createValidationMiddleware(schemas.getBooks);
const getBookById = createValidationMiddleware(schemas.getBookById);
const getChapter = createValidationMiddleware(schemas.getChapter);
const searchBooks = createValidationMiddleware(schemas.searchBooks);
const getTrendingBooks = createValidationMiddleware(schemas.getTrendingBooks);
const getSuggestions = createValidationMiddleware(schemas.getSuggestions);
const createBook = createValidationMiddleware(schemas.createBook);
const updateBook = createValidationMiddleware(schemas.updateBook);
const deleteBook = createValidationMiddleware(schemas.deleteBook);

module.exports = {
  getBooks,
  getBookById,
  getChapter,
  searchBooks,
  getTrendingBooks,
  getSuggestions,
  createBook,
  updateBook,
  deleteBook,
};
