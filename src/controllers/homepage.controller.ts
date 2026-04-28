import { Request, Response } from "express";
import catchAsync from "../utils/catchAsync";
import homepageService from "../services/homepage.service";

/**
 * Get all homepage data in single aggregated response
 * Includes: events, featured events, banners, categories, blogs, stats
 * Cached for 5 minutes in Redis
 */
export const getHomepageData = catchAsync(
  async (req: Request, res: Response) => {
    const data = await homepageService.getHomepageData();

    res.status(200).json({
      success: true,
      message: "Homepage data retrieved successfully",
      data,
    });
  },
);

/**
 * Invalidate homepage cache
 * Admin/system endpoint to force cache refresh
 */
export const invalidateHomepageCache = catchAsync(
  async (req: Request, res: Response) => {
    await homepageService.invalidateCache();

    res.status(200).json({
      success: true,
      message: "Homepage cache invalidated successfully",
    });
  },
);
