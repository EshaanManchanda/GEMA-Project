import { Request, Response } from "express";
import SocialSettings from "../models/SocialSettings";
import SystemSettings from "../models/SystemSettings";
import logger from "../config/logger";

/**
 * Get UI settings (public endpoint - no authentication required)
 * Returns only UI-relevant settings safe to expose publicly
 */
export const getUISettings = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const systemSettings = await SystemSettings.getSettings();

    res.status(200).json({
      success: true,
      data: {
        animationsEnabled: systemSettings.animationsEnabled,
      },
    });
  } catch (error: any) {
    logger.error(`Error fetching UI settings: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to fetch UI settings",
      error: error.message,
    });
  }
};

/**
 * Get social media settings (public endpoint - no authentication required)
 */
export const getSocialSettings = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    logger.info("Fetching social media settings (public)");

    // Fetch social settings using singleton pattern
    const socialSettings = await SocialSettings.getSettings();

    res.status(200).json({
      success: true,
      data: {
        facebookUrl: socialSettings.facebookUrl,
        twitterUrl: socialSettings.twitterUrl,
        instagramUrl: socialSettings.instagramUrl,
        youtubeUrl: socialSettings.youtubeUrl,
        linkedinUrl: socialSettings.linkedinUrl,
      },
    });
  } catch (error: any) {
    logger.error(`Error fetching social media settings: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to fetch social media settings",
      error: error.message,
    });
  }
};
