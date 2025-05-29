const User = require("../../models/User");
const twilioService = require("../../services/auth/twilloService");
const jwtService = require("../../services/auth/jwtService");
const { responseHandler } = require("../../utils/responseHandler");
const winston = require("../../config/logger");
const CustomError = require("../../utils/errors");

// Signup with phone number
const signup = async (req, res, next) => {
  try {
    const { phoneNumber, name, role } = req.body;

    // Validate required fields
    if (!phoneNumber || !name) {
      throw new CustomError("Phone number and name are required", 400);
    }

    // Check if user already exists
    const existingUser = await User.findOne({ phoneNumber });
    if (existingUser) {
      throw new CustomError("User already exists", 400);
    }

    // Create new user (OTP verification will be handled separately)
    const user = new User({
      phoneNumber,
      name,
      isActive: false, // Activate after OTP verification
      role: role || "user", // Default to 'user' if not provided
    });

    await user.save();
    winston.info(`User signup initiated for phone: ${phoneNumber}`);

    // Send OTP via Twilio
    await twilioService.sendOtp(phoneNumber);

    return responseHandler(res, 200, {
      message: "OTP sent to phone number",
      userId: user._id,
    });
  } catch (error) {
    winston.error("Signup error:", error);
    next(error);
  }
};

// Send OTP to existing user
const sendOtp = async (req, res, next) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      throw new CustomError("Phone number is required", 400);
    }

    // Check if user exists
    const user = await User.findOne({ phoneNumber });
    if (!user) {
      throw new CustomError("User not found", 404);
    }

    // Send OTP via Twilio
    await twilioService.sendOtp(phoneNumber);
    winston.info(`OTP sent for phone: ${phoneNumber}`);

    return responseHandler(res, 200, {
      message: "OTP sent to phone number",
      userId: user._id,
    });
  } catch (error) {
    winston.error("Send OTP error:", error);
    next(error);
  }
};

// Verify OTP and activate user
const verifyOtp = async (req, res, next) => {
  try {
    const { userId, otp } = req.body;

    if (!userId || !otp) {
      throw new CustomError("User ID and OTP are required", 400);
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      throw new CustomError("User not found", 404);
    }

    // Verify OTP with Twilio
    const isValidOtp = await twilioService.verifyOtp(user.phoneNumber, otp);
    if (!isValidOtp) {
      throw new CustomError("Invalid or expired OTP", 400);
    }

    // Activate user if not already active
    if (!user.isActive) {
      user.isActive = true;
      await user.save();
    }

    // Generate JWT tokens
    const { accessToken, refreshToken } = await jwtService.generateTokens(user);

    winston.info(`OTP verified and user activated: ${user.phoneNumber}`);

    return responseHandler(res, 200, {
      message: "OTP verified successfully",
      user: {
        id: user._id,
        phoneNumber: user.phoneNumber,
        name: user.name,
        role: user.role,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    winston.error("Verify OTP error:", error);
    next(error);
  }
};

// Login with phone number
const login = async (req, res, next) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      throw new CustomError("Phone number is required", 400);
    }

    // Check if user exists
    const user = await User.findOne({ phoneNumber });
    if (!user) {
      throw new CustomError("User not found. Please signup first.", 404);
    }

    if (!user.isActive) {
      throw new CustomError("Account not activated. Please verify OTP.", 403);
    }

    // Send OTP for login via Twilio
    await twilioService.sendOtp(phoneNumber);
    winston.info(`Login OTP sent for phone: ${phoneNumber}`);

    return responseHandler(res, 200, {
      message: "OTP sent to phone number",
      userId: user._id,
    });
  } catch (error) {
    winston.error("Login error:", error);
    next(error);
  }
};

// Login OTP verification (separate from signup verification)
const verifyLoginOtp = async (req, res, next) => {
  try {
    const { userId, otp } = req.body;

    if (!userId || !otp) {
      throw new CustomError("User ID and OTP are required", 400);
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      throw new CustomError("User not found", 404);
    }

    if (!user.isActive) {
      throw new CustomError("Account not activated", 403);
    }

    // Verify OTP with Twilio
    const isValidOtp = await twilioService.verifyOtp(user.phoneNumber, otp);
    if (!isValidOtp) {
      throw new CustomError("Invalid or expired OTP", 400);
    }

    // Generate JWT tokens
    const { accessToken, refreshToken } = await jwtService.generateTokens(user);

    winston.info(`Login successful for user: ${user.phoneNumber}`);

    return responseHandler(res, 200, {
      message: "Login successful",
      user: {
        id: user._id,
        phoneNumber: user.phoneNumber,
        name: user.name,
        role: user.role,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    winston.error("Login OTP verification error:", error);
    next(error);
  }
};

// Refresh JWT token
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new CustomError("Refresh token is required", 400);
    }

    // Verify refresh token
    const userId = await jwtService.verifyRefreshToken(refreshToken);
    const user = await User.findById(userId);

    if (!user) {
      throw new CustomError("User not found", 404);
    }

    if (!user.isActive) {
      throw new CustomError("Account not activated", 403);
    }

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } =
      await jwtService.generateTokens(user);
    winston.info(`Token refreshed for user: ${user.phoneNumber}`);

    return responseHandler(res, 200, {
      message: "Token refreshed successfully",
      accessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    winston.error("Refresh token error:", error);
    next(error);
  }
};

// Get user profile
const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select(
      "-__v -createdAt -updatedAt"
    );
    if (!user) {
      throw new CustomError("User not found", 404);
    }

    winston.info(`Profile retrieved for user: ${user.phoneNumber}`);
    return responseHandler(res, 200, {
      message: "Profile retrieved successfully",
      user,
    });
  } catch (error) {
    winston.error("Get profile error:", error);
    next(error);
  }
};

// Update user profile
const updateProfile = async (req, res, next) => {
  try {
    const { name } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      throw new CustomError("User not found", 404);
    }

    // Update fields (removed email since we're only using phone)
    if (name) user.name = name;

    await user.save();
    winston.info(`Profile updated for user: ${user.phoneNumber}`);

    return responseHandler(res, 200, {
      message: "Profile updated successfully",
      user: {
        id: user._id,
        phoneNumber: user.phoneNumber,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    winston.error("Update profile error:", error);
    next(error);
  }
};

module.exports = {
  signup,
  sendOtp,
  verifyOtp,
  login,
  verifyLoginOtp,
  refreshToken,
  getProfile,
  updateProfile,
};
