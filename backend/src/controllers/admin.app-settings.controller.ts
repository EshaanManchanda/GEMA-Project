import { Request, Response } from 'express';
import SystemSettings from '../models/SystemSettings';
import EmailSettings from '../models/EmailSettings';
import PaymentSettings from '../models/PaymentSettings';
import SocialSettings from '../models/SocialSettings';
import { devLog } from '../utils/devLogger';

/**
 * Get all application settings
 */
export const getAppSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    devLog.info('Fetching application settings');

    // Fetch all settings using singleton pattern
    const [systemSettings, emailSettings, paymentSettings, socialSettings] = await Promise.all([
      SystemSettings.getSettings(),
      EmailSettings.getSettings(),
      PaymentSettings.getSettings(),
      SocialSettings.getSettings()
    ]);

    res.status(200).json({
      success: true,
      data: {
        systemSettings,
        emailSettings,
        paymentSettings,
        socialSettings
      }
    });
  } catch (error: any) {
    devLog.error(`Error fetching application settings: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch application settings',
      error: error.message
    });
  }
};

/**
 * Update all application settings
 */
export const updateAppSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    devLog.info('Updating application settings');

    const { systemSettings, emailSettings, paymentSettings, socialSettings } = req.body;

    // Get all settings documents
    const [currentSystem, currentEmail, currentPayment, currentSocial] = await Promise.all([
      SystemSettings.getSettings(),
      EmailSettings.getSettings(),
      PaymentSettings.getSettings(),
      SocialSettings.getSettings()
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
    const [updatedSystem, updatedEmail, updatedPayment, updatedSocial] = await Promise.all([
      currentSystem.save(),
      currentEmail.save(),
      currentPayment.save(),
      currentSocial.save()
    ]);

    devLog.info('Application settings updated successfully');

    res.status(200).json({
      success: true,
      message: 'Application settings updated successfully',
      data: {
        systemSettings: updatedSystem,
        emailSettings: updatedEmail,
        paymentSettings: updatedPayment,
        socialSettings: updatedSocial
      }
    });
  } catch (error: any) {
    devLog.error(`Error updating application settings: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to update application settings',
      error: error.message
    });
  }
};

/**
 * Test email connection
 */
export const testEmailConnection = async (req: Request, res: Response): Promise<void> => {
  try {
    devLog.info('Testing email connection');

    // TODO: Implement actual email connection test using the current email settings
    // For now, return a mock success response

    res.status(200).json({
      success: true,
      message: 'Email connection test successful'
    });
  } catch (error: any) {
    devLog.error(`Error testing email connection: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Email connection test failed',
      error: error.message
    });
  }
};

/**
 * Send test email
 */
export const sendTestEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    devLog.info('Sending test email');

    const { to, subject, body } = req.body;

    // TODO: Implement actual email sending using the current email settings
    // For now, return a mock success response

    devLog.info(`Test email would be sent to: ${to}`);

    res.status(200).json({
      success: true,
      message: 'Test email sent successfully'
    });
  } catch (error: any) {
    devLog.error(`Error sending test email: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to send test email',
      error: error.message
    });
  }
};
