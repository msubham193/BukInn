const { verifyAccessToken } = require("../services/auth/jwtService");
const CustomError = require("../utils/errors");
const winston = require("../config/logger");

const authMiddleware = async (req, res, next) => {
  try {
    // Check for Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new CustomError("Authorization header missing or invalid", 401);
    }

    // Extract token
    const token = authHeader.split(" ")[1];
    if (!token) {
      throw new CustomError("Token not provided", 401);
    }

    // Verify token
    const decoded = verifyAccessToken(token);

    // Attach user data to request
    req.user = {
      id: decoded.id,
      phoneNumber: decoded.phoneNumber,
      premiumStatus: decoded.premiumStatus,
    };

    winston.debug(`Authenticated user: ${req.user.phoneNumber}`);
    next();
  } catch (error) {
    winston.error("Authentication error:", error);
    next(error);
  }
};

module.exports = { authMiddleware };
