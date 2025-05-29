const winston = require("./src/config/logger");
const { connectDB } = require("./src/config/database");
// const { connectRedis } = require("./src/config/redis");
const app = require("./src/app");
const dotenv = require("dotenv");
// Environment variables
dotenv.config();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || "development";

// Load environment variables from .env file

// Initialize server and services
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Connect to Redis
    // await connectRedis();

    // Start server
    app.listen(PORT, () => {
      winston.info(`Server running on port ${PORT} in ${NODE_ENV} mode`);
    });
  } catch (error) {
    winston.error("Server startup error:", error);
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  winston.error("Uncaught Exception:", error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (error) => {
  winston.error("Unhandled Rejection:", error);
  process.exit(1);
});

// Start the server
startServer();
