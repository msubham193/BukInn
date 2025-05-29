const twilio = require("twilio");
const winston = require("../../config/logger");

const dotenv = require("dotenv");

dotenv.config();

class TwilioService {
  constructor() {
    this.client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    this.serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
  }

  /**
   * Send OTP to phone number
   * @param {string} phoneNumber - Phone number in E.164 format (e.g., +1234567890)
   * @returns {Promise<boolean>} - Success status
   */
  async sendOtp(phoneNumber) {
    try {
      // Ensure phone number is in E.164 format
      const formattedPhone = this.formatPhoneNumber(phoneNumber);

      const verification = await this.client.verify.v2
        .services(this.serviceSid)
        .verifications.create({
          to: formattedPhone,
          channel: "sms",
        });

      winston.info(
        `OTP sent successfully to ${formattedPhone}, Status: ${verification.status}`
      );
      return true;
    } catch (error) {
      winston.error("Twilio Send OTP Error:", error);
      throw new Error(`Failed to send OTP: ${error.message}`);
    }
  }

  /**
   * Verify OTP for phone number
   * @param {string} phoneNumber - Phone number in E.164 format
   * @param {string} otp - OTP code to verify
   * @returns {Promise<boolean>} - Verification status
   */
  async verifyOtp(phoneNumber, otp) {
    try {
      const formattedPhone = this.formatPhoneNumber(phoneNumber);

      const verificationCheck = await this.client.verify.v2
        .services(this.serviceSid)
        .verificationChecks.create({
          to: formattedPhone,
          code: otp,
        });

      winston.info(
        `OTP verification for ${formattedPhone}, Status: ${verificationCheck.status}`
      );
      return verificationCheck.status === "approved";
    } catch (error) {
      winston.error("Twilio Verify OTP Error:", error);
      throw new Error(`Failed to verify OTP: ${error.message}`);
    }
  }

  /**
   * Format phone number to E.164 format
   * @param {string} phoneNumber - Phone number to format
   * @returns {string} - Formatted phone number
   */
  formatPhoneNumber(phoneNumber) {
    // Remove all non-digit characters
    let cleaned = phoneNumber.replace(/\D/g, "");

    // If it doesn't start with country code, assume it's Indian number
    if (!cleaned.startsWith("91") && cleaned.length === 10) {
      cleaned = "91" + cleaned;
    }

    // Add + prefix if not present
    if (!cleaned.startsWith("+")) {
      cleaned = "+" + cleaned;
    }

    return cleaned;
  }

  /**
   * Check service configuration
   * @returns {Promise<boolean>} - Configuration status
   */
  async checkConfiguration() {
    try {
      const service = await this.client.verify.v2
        .services(this.serviceSid)
        .fetch();
      winston.info(`Twilio Verify Service configured: ${service.friendlyName}`);
      return true;
    } catch (error) {
      winston.error("Twilio Configuration Error:", error);
      return false;
    }
  }
}

module.exports = new TwilioService();
