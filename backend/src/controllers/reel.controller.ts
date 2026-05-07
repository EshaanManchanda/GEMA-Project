import { Request, Response, NextFunction } from "express";
import { AppError } from "../middleware/index";
import { reelService } from "../services/reel.service";
import { validationResult } from "express-validator";

/**
 * Get public reels (visibility='public') with pagination
 * GET /api/reels
 */
export const getReels = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError("Validation failed", 400, errors.array());
    }

    const { page, limit } = req.query;

    const options = {
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 10,
    };

    const result = await reelService.getPublicReels(options);

    res.status(200).json({
      success: true,
      message: "Public reels retrieved successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single public reel by ID
 * GET /api/reels/:id
 */
export const getReelById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError("Validation failed", 400, errors.array());
    }

    const { id } = req.params;
    const reel = await reelService.getReelById(id, true);

    if (!reel) {
      throw new AppError("Reel not found", 404);
    }

    // Only return public reels
    if (reel.visibility !== "public") {
      throw new AppError("Reel not found", 404);
    }

    res.status(200).json({
      success: true,
      message: "Reel retrieved successfully",
      data: { reel },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Increment view count
 * POST /api/reels/:id/view
 */
export const incrementView = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError("Validation failed", 400, errors.array());
    }

    const { id } = req.params;

    // Check if reel exists and is public
    const reel = await reelService.getReelById(id, false);
    if (!reel || reel.visibility !== "public") {
      throw new AppError("Reel not found", 404);
    }

    await reelService.incrementViews(id);

    res.status(200).json({
      success: true,
      message: "View count incremented",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle like (increment or decrement)
 * POST /api/reels/:id/like
 */
export const toggleLike = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError("Validation failed", 400, errors.array());
    }

    const { id } = req.params;
    const { increment } = req.body;

    // Check if reel exists and is public
    const reel = await reelService.getReelById(id, false);
    if (!reel || reel.visibility !== "public") {
      throw new AppError("Reel not found", 404);
    }

    const result = await reelService.toggleLike(id, increment !== false);

    res.status(200).json({
      success: true,
      message: result.liked ? "Like added" : "Like removed",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
