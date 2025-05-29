// const jwt = require("jsonwebtoken");
// const winston = require("../config/logger");
// const { CustomError } = require("../utils/errors");
// const User = require("../models/User");

// // Generate access and refresh tokens
// const generateTokens = async (user) => {
//   try {
//     const payload = {
//       id: user._id,
//       phoneNumber: user.phoneNumber,
//       premiumStatus: user.premiumStatus,
//     };

//     // Generate access token (short-lived, e.g., 15 minutes)
//     const accessToken = jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
//       expiresIn: "15m",
//     });

//     // Generate refresh token (long-lived, e.g., 7 days)
//     const refreshToken = jwt.sign(
//       { id: user._id },
//       process.env.JWT_REFRESH_SECRET,
//       { expiresIn: "7d" }
//     );

//     // Store refresh token in user document
//     user.refreshToken = refreshToken;
//     await user.save();

//     winston.info(`Tokens generated for user: ${user.phoneNumber}`);
//     return { accessToken, refreshToken };
//   } catch (error) {
//     winston.error("Error generating tokens:", error);
//     throw new CustomError("Failed to generate tokens", 500);
//   }
// };

// // Verify access token
// const verifyAccessToken = (token) => {
//   try {
//     const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
//     winston.debug(`Access token verified for user ID: ${decoded.id}`);
//     return decoded;
//   } catch (error) {
//     winston.error("Access token verification failed:", error);
//     throw new CustomError("Invalid or expired access token", 401);
//   }
// };

// // Verify refresh token
// const verifyRefreshToken = async (token) => {
//   try {
//     const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);

//     // Verify token exists in user document
//     const user = await User.findById(decoded.id).select("refreshToken");
//     if (!user || user.refreshToken !== token) {
//       throw new CustomError("Invalid refresh token", 401);
//     }

//     winston.debug(`Refresh token verified for user ID: ${decoded.id}`);
//     return decoded.id;
//   } catch (error) {
//     winston.error("Refresh token verification failed:", error);
//     throw new CustomError("Invalid or expired refresh token", 401);
//   }
// };

// // Revoke refresh token (e.g., on logout)
// const revokeRefreshToken = async (userId) => {
//   try {
//     const user = await User.findById(userId);
//     if (user) {
//       user.refreshToken = null;
//       await user.save();
//       winston.info(`Refresh token revoked for user ID: ${userId}`);
//     }
//   } catch (error) {
//     winston.error("Error revoking refresh token:", error);
//     throw new CustomError("Failed to revoke refresh token", 500);
//   }
// };

// module.exports = {
//   generateTokens,
//   verifyAccessToken,
//   verifyRefreshToken,
//   revokeRefreshToken,
// };

// utils/responseHandler.js

// Success response
const responseHandler = (res, statusCode, data) => {
  return res.status(statusCode).json({
    success: true,
    data,
  });
};

// Error response
const errorResponse = (res, error) => {
  return res.status(error.status || 500).json({
    success: false,
    message: error.message || "Internal Server Error",
  });
};

module.exports = {
  responseHandler,
  errorResponse,
};
