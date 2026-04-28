import { Request, Response, NextFunction } from "express";
import { bannerService } from "../services/banner.service";
import { AuthRequest } from "../types";

/**
 * Public: Get active banners
 * @route GET /api/banners/active
 * @access Public
 */
export const getActiveBanners = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const banners = await bannerService.getActiveBanners();

    res.status(200).json({
      success: true,
      data: { banners },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Get all banners
 * @route GET /api/banners
 * @access Private (Admin only)
 */
export const getAllBanners = async (
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

    const result = await bannerService.getAllBanners(filters);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Get banner by ID
 * @route GET /api/banners/:id
 * @access Private (Admin only)
 */
export const getBannerById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const banner = await bannerService.getBannerById(req.params.id);

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "Banner not found",
      });
    }

    res.status(200).json({
      success: true,
      data: { banner },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Create banner
 * @route POST /api/banners
 * @access Private (Admin only)
 */
export const createBanner = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const banner = await bannerService.createBanner(req.body, userId);

    res.status(201).json({
      success: true,
      message: "Banner created successfully",
      data: { banner },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Update banner
 * @route PUT /api/banners/:id
 * @access Private (Admin only)
 */
export const updateBanner = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const banner = await bannerService.updateBanner(req.params.id, req.body);

    res.status(200).json({
      success: true,
      message: "Banner updated successfully",
      data: { banner },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Delete banner
 * @route DELETE /api/banners/:id
 * @access Private (Admin only)
 */
export const deleteBanner = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    await bannerService.deleteBanner(req.params.id);

    res.status(200).json({
      success: true,
      message: "Banner deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Update display orders
 * @route PATCH /api/banners/display-orders
 * @access Private (Admin only)
 */
export const updateDisplayOrders = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    await bannerService.updateDisplayOrders(req.body.orders);

    res.status(200).json({
      success: true,
      message: "Display orders updated successfully",
    });
  } catch (error) {
    next(error);
  }
};
