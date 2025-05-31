const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const winston = require("./config/logger");
const routes = require("./routes");
const { errorHandler } = require("../src/utils/errorHandler");
// const { corsOptions } = require("./middleware/cors");
// const { rateLimiter } = require("./middleware/rateLimiter");
const dotenv = require("dotenv");
dotenv.config();

const app = express();

// Middleware

// Load environment variables from .env file
app.use(helmet()); // Security headers

// CORS configuration: Allow all origins
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(morgan("combined", { stream: winston.stream })); // HTTP request logging
// app.use(rateLimiter); // Rate limiting

// Health check endpoint
console.log(process.env.NODE_ENV);
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Server is running",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
  });
});

// Mount API routes
app.use("/api/v1", routes);

// Error handling middleware (should be last)
app.use(errorHandler);

module.exports = app;
