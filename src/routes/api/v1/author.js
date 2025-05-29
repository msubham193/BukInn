const express = require("express");
const router = express.Router();
const authorController = require("../../../controllers/authors/authorController");
const authorValidator = require("../../../validators/authorValidator");
const { authMiddleware } = require("../../../middleware/auth");
const { adminMiddleware } = require("../../../middleware/admin");
const { validationMiddleware } = require("../../../middleware/validation");

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
  authorValidator.createAuthor,
  validationMiddleware,
  authorController.createAuthor
);
router.put(
  "/:id",
  authMiddleware,
  adminMiddleware,
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
