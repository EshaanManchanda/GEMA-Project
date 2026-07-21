import { Request, Response } from "express";
import SystemSettings from "../models/SystemSettings";
import EmailSettings from "../models/EmailSettings";
import PaymentSettings from "../models/PaymentSettings";
import SocialSettings from "../models/SocialSettings";
import AuditLog, { AuditAction } from "../models/AuditLog";
import logger from "../config/logger";
import { emailService } from "../services/email.service";
import { invalidateSettingsCache } from "../services/settings.service";

/** Field names that must never be written to the audit log. */
const SECRET_FIELD_NAMES = new Set([
  "smtpPassword",
  "smtpUser",
  "stripeSecretKey",
  "stripePublishableKey",
  "stripeWebhookSecret",
  "paypalClientSecret",
  "paypalClientId",
  "apiKey",
  "apiSecret",
  "password",
]);

/**
 * Diff two plain objects, returning only the keys whose value actually
 * changed. Secret-bearing field names are recorded as changed but with
 * their values redacted rather than logged in the clear.
 */
function diffSettings(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): Record<string, { from: unknown; to: unknown }> {
  const diff: Record<string, { from: unknown; to: unknown }> = {};
  for (const key of Object.keys(after)) {
    const beforeValue = before[key];
    const afterValue = after[key];
    if (JSON.stringify(beforeValue) === JSON.stringify(afterValue)) {
      continue;
    }
    if (SECRET_FIELD_NAMES.has(key)) {
      diff[key] = { from: "[redacted]", to: "[redacted]" };
    } else {
      diff[key] = { from: beforeValue, to: afterValue };
    }
  }
  return diff;
}

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

    // Snapshot pre-update values for the audit diff, before Object.assign
    // mutates the documents in place.
    const beforeSystem = currentSystem.toObject();
    const beforeEmail = currentEmail.toObject();
    const beforePayment = currentPayment.toObject();
    const beforeSocial = currentSocial.toObject();

    // Update each settings document if provided
    if (systemSettings) {
      Object.assign(currentSystem, systemSettings);
      const admin = req.user;
      currentSystem.lastModifiedBy = admin
        ? `${admin.firstName} ${admin.lastName}`.trim() || admin.email
        : undefined;
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

    // Bust the settings cache so every instance reads the new values on the
    // very next request instead of waiting out the TTL.
    await invalidateSettingsCache();

    // Record who changed what, redacting anything secret. One row covers the
    // whole request even though it spans four documents, since the admin
    // submitted them as a single save.
    const changedFields = {
      ...diffSettings(beforeSystem, currentSystem.toObject()),
      ...diffSettings(beforeEmail, currentEmail.toObject()),
      ...diffSettings(beforePayment, currentPayment.toObject()),
      ...diffSettings(beforeSocial, currentSocial.toObject()),
    };
    if (Object.keys(changedFields).length > 0) {
      AuditLog.create({
        action: AuditAction.SETTINGS_UPDATE,
        userId: req.user?._id || req.user?.id,
        ip: req.ip,
        userAgent: req.get("user-agent"),
        metadata: { changedFields },
      }).catch((auditError) =>
        logger.error(`Failed to write settings audit log: ${auditError.message}`),
      );
    }

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
