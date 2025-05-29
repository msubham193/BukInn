const admin = require("firebase-admin");
const winston = require("./logger");
const { CustomError } = require("../utils/errorHandler");
const dotenv = require("dotenv");
dotenv.config();
// Initialize Firebase Admin SDK
const initializeApp = () => {
  try {
    const serviceAccount = {
      type: process.env.FIREBASE_TYPE,
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY
        ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
        : undefined,
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: process.env.FIREBASE_AUTH_URI,
      token_uri: process.env.FIREBASE_TOKEN_URI,
      auth_provider_x509_cert_url:
        process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
      client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
    };

    // Validate required credentials

    if (
      !serviceAccount.project_id ||
      !serviceAccount.private_key ||
      !serviceAccount.client_email
    ) {
      throw new CustomError(
        "Missing required Firebase credentials in environment variables",
        500
      );
    }

    // Initialize Firebase app if not already initialized
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id,
      });
      winston.info("Firebase Admin SDK initialized successfully");
    } else {
      winston.info("Firebase Admin SDK already initialized");
    }

    return admin;
  } catch (error) {
    winston.error("Firebase initialization failed:", error);
    throw new CustomError(`Firebase setup failed: ${error.message}`, 500);
  }
};

// Graceful shutdown
const shutdownFirebase = async () => {
  try {
    if (admin.apps.length) {
      await admin.app().delete();
      winston.info("Firebase Admin SDK shut down successfully");
    }
  } catch (error) {
    winston.error("Error shutting down Firebase:", error);
  }
};

// Handle process termination
process.on("SIGINT", async () => {
  await shutdownFirebase();
  process.exit(0);
});

module.exports = { initializeApp, shutdownFirebase };
