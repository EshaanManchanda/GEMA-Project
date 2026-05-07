import { Response, NextFunction } from "express";
import { AppError } from "../middleware/index";
import { AuthRequest } from "../types/index";
import { reelService } from "../services/reel.service";
import { validationResult } from "express-validator";

/**
 * Sanitize request body by converting empty strings to undefined
 * This prevents Mongoose cast errors for ObjectId fields
 */
function sanitizeReelData(data: any): any {
  const sanitized = { ...data };

  // Convert empty strings to undefined for ObjectId fields
  const objectIdFields = ["videoAsset", "thumbnailAsset", "linkedEvent"];

  for (const field of objectIdFields) {
    if (sanitized[field] === "") {
      delete sanitized[field];
    }
  }

  return sanitized;
}

/**
 * Get all reels (admin) with filters and pagination
 * GET /api/admin/reels
 */
export const getAllReels = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError("Validation failed", 400, errors.array());
    }

    const { page, limit, search, visibility, isFeatured } = req.query;

    const filters = {
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 20,
      search: search as string,
      visibility: visibility as "public" | "draft" | "archived",
      isFeatured: isFeatured !== undefined ? isFeatured === "true" : undefined,
    };

    const result = await reelService.getAllReels(filters);

    res.status(200).json({
      success: true,
      message: "Reels retrieved successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single reel by ID (admin)
 * GET /api/admin/reels/:id
 */
export const getReelById = async (
  req: AuthRequest,
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
 * Create a new reel
 * POST /api/admin/reels
 */
export const createReel = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError("Validation failed", 400, errors.array());
    }

    const {
      title,
      description,
      videoSourceType,
      videoAsset,
      externalVideoUrl,
      embedCode,
      thumbnailAsset,
      visibility,
      isFeatured,
      displayOrder,
      duration,
      tags,
      showLikeButton,
      showShareButton,
      showTitle,
      linkedEvent,
    } = req.body;

    const reelData = {
      title,
      description,
      videoSourceType: videoSourceType || "uploaded",
      videoAsset,
      externalVideoUrl,
      embedCode,
      thumbnailAsset,
      visibility: visibility || "draft",
      isFeatured: isFeatured || false,
      displayOrder: displayOrder || 0,
      duration,
      tags: tags || [],
      showLikeButton,
      showShareButton,
      showTitle,
      linkedEvent,
    };

    // Sanitize empty strings before passing to service
    const sanitizedData = sanitizeReelData(reelData);

    const reel = await reelService.createReel(sanitizedData);

    res.status(201).json({
      success: true,
      message: "Reel created successfully",
      data: { reel },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a reel
 * PUT /api/admin/reels/:id
 */
export const updateReel = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError("Validation failed", 400, errors.array());
    }

    const { id } = req.params;

    // Sanitize empty strings before passing to service
    const sanitizedData = sanitizeReelData(req.body);

    const reel = await reelService.updateReel(id, sanitizedData);

    res.status(200).json({
      success: true,
      message: "Reel updated successfully",
      data: { reel },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a reel (hard delete)
 * DELETE /api/admin/reels/:id
 */
export const deleteReel = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError("Validation failed", 400, errors.array());
    }

    const { id } = req.params;
    await reelService.hardDeleteReel(id);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

/**
 * Update reel visibility
 * PATCH /api/admin/reels/:id/visibility
 */
export const updateVisibility = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError("Validation failed", 400, errors.array());
    }

    const { id } = req.params;
    const { visibility } = req.body;

    const reel = await reelService.updateVisibility(id, visibility);

    res.status(200).json({
      success: true,
      message: "Reel visibility updated successfully",
      data: { reel },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk update display orders
 * PATCH /api/admin/reels/display-orders
 */
export const updateDisplayOrders = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError("Validation failed", 400, errors.array());
    }

    const { reels } = req.body;

    await reelService.updateDisplayOrders(reels);

    res.status(200).json({
      success: true,
      message: "Display orders updated successfully",
    });
  } catch (error) {
    next(error);
  }
};
