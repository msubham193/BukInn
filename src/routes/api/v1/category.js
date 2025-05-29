const express = require("express");
const router = express.Router();
const categoryController = require("../../../controllers/category/categoryController");
const categoryValidator = require("../../../validators/categoryValidator");
const { authMiddleware } = require("../../../middleware/auth");
const { adminMiddleware } = require("../../../middleware/admin");
const { validationMiddleware } = require("../../../middleware/validation");

// Public routes
router.get(
  "/",
  categoryValidator.getCategories,
  validationMiddleware,
  categoryController.getCategories
);
router.get(
  "/:id",
  categoryValidator.getCategoryById,
  validationMiddleware,
  categoryController.getCategoryById
);

// Admin routes
router.post(
  "/",
  authMiddleware,
  adminMiddleware,
  categoryValidator.createCategory,
  validationMiddleware,
  categoryController.createCategory
);
router.put(
  "/:id",
  authMiddleware,
  adminMiddleware,
  categoryValidator.updateCategory,
  validationMiddleware,
  categoryController.updateCategory
);
router.delete(
  "/:id",
  authMiddleware,
  adminMiddleware,
  categoryValidator.deleteCategory,
  validationMiddleware,
  categoryController.deleteCategory
);

module.exports = router;
