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

    // Same for every visitor (the exposure suite proves it carries no private data), so browsers
    // and nginx may keep it for a minute and serve it stale while it refreshes. Kept shorter than
    // the 5 minute Redis TTL so an admin edit shows up quickly.
    res.setHeader(
      "Cache-Control",
      "public, max-age=60, stale-while-revalidate=300",
    );
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
