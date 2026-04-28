import { Request, Response, NextFunction } from "express";
import { popupService } from "../services/popup.service";
import { AuthRequest } from "../types";

/**
 * Public: Get active popups (filtered by user and route)
 * @route GET /api/popups/active?route=/events
 * @access Public
 */
export const getActivePopups = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const currentRoute = req.query.route as string | undefined;

    // Extract user context from request (if authenticated)
    const authReq = req as AuthRequest;
    const userContext = {
      isAuthenticated: !!authReq.user,
      role: authReq.user?.role,
    };

    const popups = await popupService.getActivePopups(
      userContext,
      currentRoute,
    );

    res.status(200).json({
      success: true,
      data: { popups },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Public: Record impression
 * @route POST /api/popups/:id/impression
 * @access Public
 */
export const recordImpression = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    await popupService.recordImpression(req.params.id);

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
 * @route POST /api/popups/:id/click
 * @access Public
 */
export const recordClick = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    await popupService.recordClick(req.params.id);

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
 * @route POST /api/popups/:id/dismiss
 * @access Public
 */
export const recordDismissal = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    await popupService.recordDismissal(req.params.id);

    res.status(200).json({
      success: true,
      message: "Dismissal recorded",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Get all popups
 * @route GET /api/admin/popups
 * @access Private (Admin only)
 */
export const getAllPopups = async (
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

    const result = await popupService.getAllPopups(filters);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Get popup by ID
 * @route GET /api/admin/popups/:id
 * @access Private (Admin only)
 */
export const getPopupById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const popup = await popupService.getPopupById(req.params.id);

    if (!popup) {
      return res.status(404).json({
        success: false,
        message: "Popup not found",
      });
    }

    res.status(200).json({
      success: true,
      data: { popup },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Create popup
 * @route POST /api/admin/popups
 * @access Private (Admin only)
 */
export const createPopup = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const popup = await popupService.createPopup(req.body, userId);

    res.status(201).json({
      success: true,
      message: "Popup created successfully",
      data: { popup },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Update popup
 * @route PUT /api/admin/popups/:id
 * @access Private (Admin only)
 */
export const updatePopup = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const popup = await popupService.updatePopup(req.params.id, req.body);

    res.status(200).json({
      success: true,
      message: "Popup updated successfully",
      data: { popup },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Delete popup
 * @route DELETE /api/admin/popups/:id
 * @access Private (Admin only)
 */
export const deletePopup = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    await popupService.deletePopup(req.params.id);

    res.status(200).json({
      success: true,
      message: "Popup deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Update display orders
 * @route PATCH /api/admin/popups/display-orders
 * @access Private (Admin only)
 */
export const updateDisplayOrders = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    await popupService.updateDisplayOrders(req.body.orders);

    res.status(200).json({
      success: true,
      message: "Display orders updated successfully",
    });
  } catch (error) {
    next(error);
  }
};
