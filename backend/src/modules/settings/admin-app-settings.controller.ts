import { Request, Response } from "express";
import SystemSettings from "./system-settings.model";
import EmailSettings from "./email-settings.model";
import PaymentSettings from "./payment-settings.model";
import SocialSettings from "./social-settings.model";
import logger from "../../config/logger";
import { emailService } from "../notifications/email.service";

/**
 * Get all application settings
 */
export const getAppSettings = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    logger.info("Fetching application settings");

    // Fetch all settings using singleton pattern
    const [systemSettings, emailSettings, paymentSettings, socialSettings] =
      await Promise.all([
        SystemSettings.getSettings(),
        EmailSettings.getSettings(),
        PaymentSettings.getSettings(),
        SocialSettings.getSettings(),
      ]);

    res.status(200).json({
      success: true,
      data: {
        systemSettings,
        emailSettings,
        paymentSettings,
        socialSettings,
      },
    });
  } catch (error: any) {
    logger.error(`Error fetching application settings: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to fetch application settings",
      error: error.message,
    });
  }
};

/**
 * Update all application settings
 */
export const updateAppSettings = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    logger.info("Updating application settings");

    const { systemSettings, emailSettings, paymentSettings, socialSettings } =
      req.body;

    // Get all settings documents
    const [currentSystem, currentEmail, currentPayment, currentSocial] =
      await Promise.all([
        SystemSettings.getSettings(),
        EmailSettings.getSettings(),
        PaymentSettings.getSettings(),
        SocialSettings.getSettings(),
      ]);

    // Update each settings document if provided
    if (systemSettings) {
      Object.assign(currentSystem, systemSettings);
    }

    if (emailSettings) {
      Object.assign(currentEmail, emailSettings);
    }

    if (paymentSettings) {
      Object.assign(currentPayment, paymentSettings);
    }

    if (socialSettings) {
      Object.assign(currentSocial, socialSettings);
    }

    // Save all settings
    const [updatedSystem, updatedEmail, updatedPayment, updatedSocial] =
      await Promise.all([
        currentSystem.save(),
        currentEmail.save(),
        currentPayment.save(),
        currentSocial.save(),
      ]);

    logger.info("Application settings updated successfully");

    // Reload email transporter if SMTP settings changed
    if (emailSettings && updatedEmail.smtpHost) {
      emailService.reloadTransporter({
        smtpHost: updatedEmail.smtpHost,
        smtpPort: updatedEmail.smtpPort,
        smtpUser: updatedEmail.smtpUser,
        smtpPassword: updatedEmail.smtpPassword,
      });
    }

    res.status(200).json({
      success: true,
      message: "Application settings updated successfully",
      data: {
        systemSettings: updatedSystem,
        emailSettings: updatedEmail,
        paymentSettings: updatedPayment,
        socialSettings: updatedSocial,
      },
    });
  } catch (error: any) {
    logger.error(`Error updating application settings: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to update application settings",
      error: error.message,
    });
  }
};

/**
 * Test email connection
 */
export const testEmailConnection = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    logger.info("Testing email connection");

    const { host, port, username, password } = req.body;

    let result: { success: boolean; message: string };
    if (host && port && username && password) {
      // Test with provided settings (before saving)
      result = await emailService.testConnectionWithSettings({
        host,
        port: Number(port),
        username,
        password,
      });
    } else {
      // Test current transporter
      result = await emailService.testConnection();
    }

    res.status(result.success ? 200 : 400).json({
      success: result.success,
      message: result.message,
    });
  } catch (error: any) {
    logger.error(`Error testing email connection: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Email connection test failed",
      error: error.message,
    });
  }
};

/**
 * Send test email
 */
export const sendTestEmail = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { to, subject, body } = req.body;

    if (!to) {
      res
        .status(400)
        .json({ success: false, message: "Recipient email (to) is required" });
      return;
    }

    logger.info(`Sending test email to: ${to}`);

    await emailService.sendTestEmail(
      to,
      subject || "Test Email from Admin Panel",
      body ||
      "This is a test email to verify your SMTP configuration is working correctly.",
    );

    res.status(200).json({
      success: true,
      message: `Test email sent successfully to ${to}`,
    });
  } catch (error: any) {
    logger.error(`Error sending test email: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to send test email",
      error: error.message,
    });
  }
};
