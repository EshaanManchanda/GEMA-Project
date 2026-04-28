import { Request, Response } from "express";
import statsService from "../services/stats.service";
import logger from "../config/logger";

/**
 * Get public stats for homepage
 * @route GET /api/stats
 * @access Public
 */
export const getPublicStats = async (req: Request, res: Response) => {
  try {
    const stats = await statsService.getPublicStats();

    res.status(200).json({
      success: true,
      message: "Stats retrieved successfully",
      data: stats,
    });
  } catch (error: any) {
    logger.error("Error fetching public stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve stats",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
