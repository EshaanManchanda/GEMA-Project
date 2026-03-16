/**
 * SMS Service for sending verification codes
 * Supports multiple SMS providers: Twilio, AWS SNS, or development mode
 */

interface SMSSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

interface SMSProvider {
  name: string;
  sendSMS: (phone: string, message: string) => Promise<SMSSendResult>;
}

/**
 * Development SMS Provider
 * Just logs the OTP to console instead of sending actual SMS
 */
class DevelopmentSMSProvider implements SMSProvider {
  name = "Development";

  async sendSMS(phone: string, message: string): Promise<SMSSendResult> {
    console.log("═══════════════════════════════════════════════════════");
    console.log("📱 SMS (Development Mode)");
    console.log("To:", phone);
    console.log("Message:", message);
    console.log("═══════════════════════════════════════════════════════");

    return {
      success: true,
      messageId: `dev-${Date.now()}`,
    };
  }
}

/**
 * Twilio SMS Provider
 * Uncomment and configure when you have Twilio credentials
 */
class TwilioSMSProvider implements SMSProvider {
  name = "Twilio";
  private accountSid: string;
  private authToken: string;
  private fromNumber: string;
  private client: any;

  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID || "";
    this.authToken = process.env.TWILIO_AUTH_TOKEN || "";
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER || "";

    if (!this.accountSid || !this.authToken || !this.fromNumber) {
      throw new Error(
        "Twilio credentials not configured in environment variables",
      );
    }

    // Dynamically import Twilio (install with: npm install twilio)
    try {
      const twilio = require("twilio");
      this.client = twilio(this.accountSid, this.authToken);
    } catch (error) {
      throw new Error("Twilio package not installed. Run: npm install twilio");
    }
  }

  async sendSMS(phone: string, message: string): Promise<SMSSendResult> {
    try {
      const result = await this.client.messages.create({
        body: message,
        from: this.fromNumber,
        to: phone,
      });

      return {
        success: true,
        messageId: result.sid,
      };
    } catch (error: any) {
      console.error("Twilio SMS error:", error);
      return {
        success: false,
        error: error.message || "Failed to send SMS via Twilio",
      };
    }
  }
}

/**
 * AWS SNS SMS Provider
 * Uncomment and configure when you have AWS credentials
 */
class AWSSNSSMSProvider implements SMSProvider {
  name = "AWS SNS";
  private sns: any;

  constructor() {
    const { AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY } =
      process.env;

    if (!AWS_REGION || !AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
      throw new Error(
        "AWS credentials not configured in environment variables",
      );
    }

    try {
      const AWS = require("aws-sdk");
      AWS.config.update({
        region: AWS_REGION,
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY,
      });
      this.sns = new AWS.SNS();
    } catch (error) {
      throw new Error("AWS SDK not installed. Run: npm install aws-sdk");
    }
  }

  async sendSMS(phone: string, message: string): Promise<SMSSendResult> {
    try {
      const params = {
        Message: message,
        PhoneNumber: phone,
        MessageAttributes: {
          "AWS.SNS.SMS.SMSType": {
            DataType: "String",
            StringValue: "Transactional", // Use Transactional for OTP messages
          },
        },
      };

      const result = await this.sns.publish(params).promise();

      return {
        success: true,
        messageId: result.MessageId,
      };
    } catch (error: any) {
      console.error("AWS SNS SMS error:", error);
      return {
        success: false,
        error: error.message || "Failed to send SMS via AWS SNS",
      };
    }
  }
}

/**
 * Firebase SMS Provider (using Twilio behind the scenes)
 * Firebase doesn't have native SMS sending, so this uses Twilio
 * but stores logs/metadata in Firebase Firestore
 */
class FirebaseSMSProvider implements SMSProvider {
  name = "Firebase (with Twilio)";
  private twilioProvider: TwilioSMSProvider;
  private firestore: any;
  private admin: any;

  constructor() {
    this.twilioProvider = new TwilioSMSProvider();

    // Optional: Store SMS logs in Firestore
    try {
      this.admin = require("firebase-admin");
      if (this.admin.apps.length > 0) {
        this.firestore = this.admin.firestore();
      }
    } catch (error) {
      console.warn("Firebase Admin not initialized, SMS logs won't be stored");
    }
  }

  async sendSMS(phone: string, message: string): Promise<SMSSendResult> {
    const result = await this.twilioProvider.sendSMS(phone, message);

    // Optionally log to Firestore
    if (this.firestore && result.success) {
      try {
        await this.firestore.collection("sms_logs").add({
          phone,
          messageId: result.messageId,
          timestamp: this.admin.firestore.FieldValue.serverTimestamp(),
          type: "phone_verification",
        });
      } catch (error) {
        console.error("Failed to log SMS to Firestore:", error);
      }
    }

    return result;
  }
}

/**
 * SMS Service Class
 * Main service for sending SMS messages
 */
class SMSService {
  private provider: SMSProvider;

  constructor() {
    this.provider = this.initializeProvider();
  }

  /**
   * Initialize the SMS provider based on environment configuration
   */
  private initializeProvider(): SMSProvider {
    const smsProvider = process.env.SMS_PROVIDER || "development";

    console.log(`📱 Initializing SMS provider: ${smsProvider}`);

    try {
      switch (smsProvider.toLowerCase()) {
        case "twilio":
          return new TwilioSMSProvider();

        case "aws":
        case "sns":
          return new AWSSNSSMSProvider();

        case "firebase":
          return new FirebaseSMSProvider();

        case "development":
        case "dev":
        default:
          return new DevelopmentSMSProvider();
      }
    } catch (error: any) {
      console.error(
        `Failed to initialize ${smsProvider} provider:`,
        error.message,
      );
      console.log("Falling back to development mode");
      return new DevelopmentSMSProvider();
    }
  }

  /**
   * Send phone verification OTP
   * @param phone - Phone number in E.164 format
   * @param otp - One-time password code
   * @returns Promise<SMSSendResult>
   */
  async sendVerificationOTP(
    phone: string,
    otp: string,
  ): Promise<SMSSendResult> {
    const message = `Your verification code is: ${otp}\n\nThis code will expire in 10 minutes. Do not share this code with anyone.`;

    console.log(`Sending OTP to ${phone} via ${this.provider.name}`);

    try {
      const result = await this.provider.sendSMS(phone, message);

      if (result.success) {
        console.log(
          `✓ OTP sent successfully to ${phone} (Message ID: ${result.messageId})`,
        );
      } else {
        console.error(`✗ Failed to send OTP to ${phone}:`, result.error);
      }

      return result;
    } catch (error: any) {
      console.error("SMS Service Error:", error);
      return {
        success: false,
        error: error.message || "Failed to send SMS",
      };
    }
  }

  /**
   * Send custom SMS message
   * @param phone - Phone number in E.164 format
   * @param message - Message to send
   * @returns Promise<SMSSendResult>
   */
  async sendSMS(phone: string, message: string): Promise<SMSSendResult> {
    try {
      return await this.provider.sendSMS(phone, message);
    } catch (error: any) {
      console.error("SMS Service Error:", error);
      return {
        success: false,
        error: error.message || "Failed to send SMS",
      };
    }
  }

  /**
   * Send ticket details via SMS (P2.1)
   * @param phone       - Recipient phone in E.164 format
   * @param ticketNumber - Unique ticket number
   * @param eventTitle  - Event name
   * @param eventDate   - Event date
   * @param venue       - Venue or meeting link
   */
  async sendTicketViaSMS(
    phone: string,
    ticketNumber: string,
    eventTitle: string,
    eventDate: Date | string,
    venue: string,
  ): Promise<SMSSendResult> {
    const dateStr =
      eventDate instanceof Date
        ? eventDate.toLocaleDateString("en-US", { dateStyle: "medium" })
        : String(eventDate);
    const message =
      `Your ticket for "${eventTitle}":\n` +
      `Ticket #: ${ticketNumber}\n` +
      `Date: ${dateStr}\n` +
      `Venue: ${venue}\n` +
      `Present this number at check-in.`;
    return this.sendSMS(phone, message);
  }

  /**
   * Get current provider name
   * @returns Provider name
   */
  getProviderName(): string {
    return this.provider.name;
  }
}

// Export singleton instance
export const smsService = new SMSService();
export default smsService;
