const express = require("express");
const router = express.Router();
const authorController = require("../../../controllers/authors/authorController");
const authorValidator = require("../../../validators/authorValidator");
const { authMiddleware } = require("../../../middleware/auth");
const { adminMiddleware } = require("../../../middleware/admin");
const { validationMiddleware } = require("../../../middleware/validation");
// Import the S3 upload configuration
const { upload } = require("../../../config/s3Config");

// Public routes
router.get(
  "/",
  authorValidator.getAuthors,
  validationMiddleware,
  authorController.getAuthors
);
router.get(
  "/:id",
  authorValidator.getAuthorById,
  validationMiddleware,
  authorController.getAuthorById
);

// Admin routes
router.post(
  "/",
  authMiddleware,
  adminMiddleware,
  upload.single("profileImage"), // Add S3 upload middleware for profile image
  authorValidator.createAuthor,
  validationMiddleware,
  authorController.createAuthor
);
router.put(
  "/:id",
  authMiddleware,
  adminMiddleware,
  upload.single("profileImage"), // Add S3 upload middleware for profile image
  authorValidator.updateAuthor,
  validationMiddleware,
  authorController.updateAuthor
);
router.delete(
  "/:id",
  authMiddleware,
  adminMiddleware,
  authorValidator.deleteAuthor,
  validationMiddleware,
  authorController.deleteAuthor
);

module.exports = router;
