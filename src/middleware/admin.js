const User = require("../models/User");
const { CustomError } = require("../utils/errorHandler");
const winston = require("../config/logger");

const adminMiddleware = async (req, res, next) => {
  try {
    // Ensure user is authenticated (set by authMiddleware)
    if (!req.user || !req.user.id) {
      throw new CustomError("Authentication required", 401);
    }

    // Fetch user from database
    const user = await User.findById(req.user.id).select("role");

    if (!user) {
      throw new CustomError("User not found", 404);
    }

    // Check if user is admin
    if (!user.isAdmin()) {
      throw new CustomError("Admin access required", 403);
    }

    winston.debug(`Admin access granted for user: ${req.user.phoneNumber}`);
    next();
  } catch (error) {
    winston.error("Admin middleware error:", error);
    next(error);
  }
};

module.exports = { adminMiddleware };
