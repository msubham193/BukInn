const express = require("express");
const router = express.Router();
const progressController = require("../../../controllers/progress/progressController");
const progressValidator = require("../../../validators/progressValidator");
const { authMiddleware } = require("../../../middleware/auth");
const { validationMiddleware } = require("../../../middleware/validation");

// Authenticated routes
router.post(
  "/",
  authMiddleware,
  progressValidator.updateProgress,
  validationMiddleware,
  progressController.updateProgress
);
router.get(
  "/:bookId",
  authMiddleware,
  progressValidator.getProgress,
  validationMiddleware,
  progressController.getProgress
);
router.get(
  "/",
  authMiddleware,
  progressValidator.getAllProgress,
  validationMiddleware,
  progressController.getAllProgress
);

module.exports = router;
