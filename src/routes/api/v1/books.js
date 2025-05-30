const express = require("express");
const router = express.Router();
const bookController = require("../../../controllers/books/bookController");
const bookValidator = require("../../../validators/bookvalidator");
const { authMiddleware } = require("../../../middleware/auth");
const { adminMiddleware } = require("../../../middleware/admin");
const { validationMiddleware } = require("../../../middleware/validation");
// Import the S3 upload configuration instead of basic multer
const { upload } = require("../../../config/s3Config");

// Public routes
router.get(
  "/",
  bookValidator.getBooks,
  validationMiddleware,
  bookController.getBooks
);
router.get(
  "/:id",
  bookValidator.getBookById,
  validationMiddleware,
  bookController.getBookById
);
router.get(
  "/search",
  bookValidator.searchBooks,
  validationMiddleware,
  bookController.searchBooks
);
router.get(
  "/trending",
  bookValidator.getTrendingBooks,
  validationMiddleware,
  bookController.getTrendingBooks
);
router.get(
  "/suggestions",
  bookValidator.getSuggestions,
  validationMiddleware,
  bookController.getSuggestions
);

// Authenticated routes
router.get(
  "/:id/chapters/:order",
  authMiddleware,
  bookValidator.getChapter,
  validationMiddleware,
  bookController.getChapter
);

// Admin routes
router.post(
  "/",
  authMiddleware,
  adminMiddleware,
  upload.single("coverImage"), // Now using the S3 configured upload
  bookValidator.createBook,
  validationMiddleware,
  bookController.createBook
);
router.put(
  "/:id",
  authMiddleware,
  adminMiddleware,
  upload.single("coverImage"), // Now using the S3 configured upload
  bookValidator.updateBook,
  validationMiddleware,
  bookController.updateBook
);
router.delete(
  "/:id",
  authMiddleware,
  adminMiddleware,
  bookValidator.deleteBook,
  validationMiddleware,
  bookController.deleteBook
);

module.exports = router;
