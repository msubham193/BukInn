const admin = require("firebase-admin");
const winston = require("../../config/logger");
const { CustomError } = require("../../utils/errorHandler");
const { initializeApp } = require("../../config/firebase");

// Initialize Firebase Admin SDK (called once during app startup)
const firebaseApp = initializeApp();

// Send OTP to phone number
const sendOtp = async (phoneNumber) => {
  try {
    // Validate phone number format (E.164)
    if (!phoneNumber.match(/^\+[1-9]\d{1,14}$/)) {
      throw new CustomError(
        "Invalid phone number format. Must be E.164 (e.g., +12345678901)",
        400
      );
    }

    // Use Firebase Auth to create a user or get existing user
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByPhoneNumber(phoneNumber);
    } catch (error) {
      if (error.code === "auth/user-not-found") {
        // Create a temporary user for OTP flow
        userRecord = await admin.auth().createUser({
          phoneNumber,
          disabled: false,
        });
      } else {
        throw error;
      }
    }

    // Firebase phone auth requires a verification flow, but for simplicity,
    // we'll simulate OTP sending (actual implementation depends on client-side Recaptcha)
    // Note: In a real app, the client handles Recaptcha and gets a verification ID
    winston.info(`OTP sending initiated for phone: ${phoneNumber}`);

    // Simulate OTP sending (Firebase doesn't directly send OTPs; client verifies)
    // Return a session info token or verification ID for client-side use
    return { sessionInfo: userRecord.uid, phoneNumber };
  } catch (error) {
    winston.error("Error sending OTP:", error);
    throw new CustomError(`Failed to send OTP: ${error.message}`, 500);
  }
};

// Verify OTP
const verifyOtp = async (phoneNumber, otp) => {
  try {
    // Validate phone number and OTP
    if (!phoneNumber.match(/^\+[1-9]\d{1,14}$/)) {
      throw new CustomError("Invalid phone number format", 400);
    }
    if (!otp.match(/^\d{6}$/)) {
      throw new CustomError("Invalid OTP format. Must be 6 digits", 400);
    }

    // Note: Firebase phone auth typically verifies OTP on the client side with a verification ID
    // For server-side simulation, assume OTP is valid if it matches a mock condition
    // In production, you'd verify the OTP against Firebase's verification ID
    const isValid = true; // Placeholder: Replace with actual Firebase Auth verification

    if (!isValid) {
      throw new CustomError("Invalid or expired OTP", 400);
    }

    winston.info(`OTP verified successfully for phone: ${phoneNumber}`);
    return true;
  } catch (error) {
    winston.error("Error verifying OTP:", error);
    throw new CustomError(
      `OTP verification failed: ${error.message}`,
      error.status || 500
    );
  }
};

module.exports = { sendOtp, verifyOtp };
