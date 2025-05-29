const express = require("express");
const router = express.Router();
const authController = require("../../../controllers/auth/authController");
const authValidator = require("../../../validators/authValidator");
const { authMiddleware } = require("../../../middleware/auth");
const { validationMiddleware } = require("../../../middleware/validation");

// Routes for authentication
router.post(
  "/signup",
  authValidator.signup,
  validationMiddleware,
  authController.signup
);
router.post(
  "/send-otp",
  authValidator.sendOtp,
  validationMiddleware,
  authController.sendOtp
);
router.post(
  "/verify-otp",
  authValidator.verifyOtp,
  validationMiddleware,
  authController.verifyOtp
);
router.post(
  "/login",
  authValidator.login,
  validationMiddleware,
  authController.login
);
router.post(
  "/refresh-token",
  authValidator.refreshToken,
  validationMiddleware,
  authController.refreshToken
);
router.get("/profile", authMiddleware, authController.getProfile);
router.put(
  "/profile",
  authMiddleware,
  authValidator.updateProfile,
  validationMiddleware,
  authController.updateProfile
);

module.exports = router;
