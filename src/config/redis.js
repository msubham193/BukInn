const Redis = require("ioredis");
const winston = require("./logger");

// Redis connection options
const redisOptions = {
  host: process.env.REDIS_HOST || "localhost",
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000); // Exponential backoff, max 2s
    return delay;
  },
  maxRetriesPerRequest: 3,
  connectTimeout: 10000, // 10 seconds
};

// Create Redis client
let redisClient = null;

// Connect to Redis
const connectRedis = async () => {
  try {
    if (!process.env.REDIS_HOST) {
      winston.warn(
        "REDIS_HOST not defined, using default localhost configuration"
      );
    }

    redisClient = new Redis(redisOptions);

    // Handle connection events
    redisClient.on("connect", () => {
      winston.info("Redis connected successfully");
    });

    redisClient.on("ready", () => {
      winston.info("Redis client ready");
    });

    redisClient.on("error", (err) => {
      winston.error("Redis connection error:", err);
    });

    redisClient.on("close", () => {
      winston.warn("Redis connection closed");
    });

    // Test connection
    await redisClient.ping();
    winston.info("Redis ping successful");
    return redisClient;
  } catch (error) {
    winston.error("Redis connection failed:", error);
    throw error; // Let server.js handle retry or exit
  }
};

// Get Redis client
const getRedisClient = () => {
  if (!redisClient) {
    throw new Error("Redis client not initialized");
  }
  return redisClient;
};

// Graceful shutdown
const disconnectRedis = async () => {
  if (redisClient) {
    await redisClient.quit();
    winston.info("Redis connection closed");
  }
};

// Handle process termination
process.on("SIGINT", async () => {
  await disconnectRedis();
  process.exit(0);
});

module.exports = { connectRedis, getRedisClient, disconnectRedis };
