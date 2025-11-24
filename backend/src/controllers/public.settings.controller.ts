import { Request, Response } from 'express';
import SocialSettings from '../models/SocialSettings';
import { devLog } from '../utils/devLogger';

/**
 * Get social media settings (public endpoint - no authentication required)
 */
export const getSocialSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    devLog.info('Fetching social media settings (public)');

    // Fetch social settings using singleton pattern
    const socialSettings = await SocialSettings.getSettings();

    res.status(200).json({
      success: true,
      data: {
        facebookUrl: socialSettings.facebookUrl,
        twitterUrl: socialSettings.twitterUrl,
        instagramUrl: socialSettings.instagramUrl,
        youtubeUrl: socialSettings.youtubeUrl,
        linkedinUrl: socialSettings.linkedinUrl
      }
    });
  } catch (error: any) {
    devLog.error(`Error fetching social media settings: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch social media settings',
      error: error.message
    });
  }
};
