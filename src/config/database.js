const mongoose = require("mongoose");
const winston = require("./logger");

// MongoDB connection options
const mongooseOptions = {
  maxPoolSize: 10, // Connection pool size
  serverSelectionTimeoutMS: 5000, // Timeout for server selection
  socketTimeoutMS: 45000, // Socket timeout
  family: 4, // Use IPv4, skip trying IPv6
};

// MongoDB connection function
const connectDB = async () => {
  try {
    const mongoURI =
      "mongodb+srv://subham:msubham193@cluster0.4mgmmad.mongodb.net/ebook-reader?retryWrites=true&w=majority";
    if (!mongoURI) {
      throw new Error("MONGO_URI is not defined in environment variables");
    }

    // Connect to MongoDB
    await mongoose.connect(mongoURI, mongooseOptions);
    winston.info("MongoDB connected successfully");

    // Handle connection events
    mongoose.connection.on("connected", () => {
      winston.info("MongoDB connection established");
    });

    mongoose.connection.on("disconnected", () => {
      winston.warn("MongoDB connection disconnected");
    });

    mongoose.connection.on("error", (err) => {
      winston.error("MongoDB connection error:", err);
    });

    // Handle process termination
    process.on("SIGINT", async () => {
      await mongoose.connection.close();
      winston.info("MongoDB connection closed due to app termination");
      process.exit(0);
    });
  } catch (error) {
    winston.error("MongoDB connection failed:", error);
    // Retry connection after 5 seconds
    setTimeout(connectDB, 5000);
  }
};

module.exports = { connectDB };
