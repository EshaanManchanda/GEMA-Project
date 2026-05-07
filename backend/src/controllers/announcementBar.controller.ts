import { Request, Response, NextFunction } from "express";
import { announcementBarService } from "../services/announcementBar.service";
import { AuthRequest } from "../types";
import logger from "../config/logger";

/**
 * Public: Get active announcements (optionally filtered by route)
 * @route GET /api/announcements/active?route=/events
 * @access Public
 */
export const getActiveAnnouncements = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const currentRoute = req.query.route as string | undefined;
    const announcements =
      await announcementBarService.getActiveAnnouncements(currentRoute);

    res.status(200).json({
      success: true,
      data: { announcements },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Public: Record impression
 * @route POST /api/announcements/:id/impression
 * @access Public
 */
export const recordImpression = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    await announcementBarService.recordImpression(req.params.id);

    res.status(200).json({
      success: true,
      message: "Impression recorded",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Public: Record click
 * @route POST /api/announcements/:id/click
 * @access Public
 */
export const recordClick = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    await announcementBarService.recordClick(req.params.id);

    res.status(200).json({
      success: true,
      message: "Click recorded",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Public: Record dismissal
 * @route POST /api/announcements/:id/dismiss
 * @access Public
 */
export const recordDismissal = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    await announcementBarService.recordDismissal(req.params.id);

    res.status(200).json({
      success: true,
      message: "Dismissal recorded",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Get all announcements
 * @route GET /api/admin/announcements
 * @access Private (Admin only)
 */
export const getAllAnnouncements = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const filters = {
      status: req.query.status as string,
      search: req.query.search as string,
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
    };

    const result = await announcementBarService.getAllAnnouncements(filters);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Get announcement by ID
 * @route GET /api/admin/announcements/:id
 * @access Private (Admin only)
 */
export const getAnnouncementById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const announcement = await announcementBarService.getAnnouncementById(
      req.params.id,
    );

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: "Announcement not found",
      });
    }

    res.status(200).json({
      success: true,
      data: { announcement },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Create announcement
 * @route POST /api/admin/announcements
 * @access Private (Admin only)
 */
export const createAnnouncement = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    logger.info("[createAnnouncement] Received body:", {
      status: req.body.status,
      isActive: req.body.isActive,
      fullBody: req.body,
    });

    const userId = req.user?._id || req.user?.id;
    const announcement = await announcementBarService.createAnnouncement(
      req.body,
      userId,
    );

    logger.info(
      "[createAnnouncement] Created announcement status:",
      announcement.status,
    );

    res.status(201).json({
      success: true,
      message: "Announcement created successfully",
      data: { announcement },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Update announcement
 * @route PUT /api/admin/announcements/:id
 * @access Private (Admin only)
 */
export const updateAnnouncement = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    logger.info("[updateAnnouncement] Received body:", {
      status: req.body.status,
      isActive: req.body.isActive,
      fullBody: req.body,
    });

    const announcement = await announcementBarService.updateAnnouncement(
      req.params.id,
      req.body,
    );

    logger.info(
      "[updateAnnouncement] Updated announcement status:",
      announcement?.status,
    );

    res.status(200).json({
      success: true,
      message: "Announcement updated successfully",
      data: { announcement },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Delete announcement
 * @route DELETE /api/admin/announcements/:id
 * @access Private (Admin only)
 */
export const deleteAnnouncement = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    await announcementBarService.deleteAnnouncement(req.params.id);

    res.status(200).json({
      success: true,
      message: "Announcement deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Update display orders
 * @route PATCH /api/admin/announcements/display-orders
 * @access Private (Admin only)
 */
export const updateDisplayOrders = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    await announcementBarService.updateDisplayOrders(req.body.orders);

    res.status(200).json({
      success: true,
      message: "Display orders updated successfully",
    });
  } catch (error) {
    next(error);
  }
};
