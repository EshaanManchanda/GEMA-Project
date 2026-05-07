import { Request, Response, NextFunction } from "express";
import { seoContentService } from "../services/seoContent.service";
import { AuthRequest } from "../types";

/**
 * Public: Get SEO content for a specific page
 * @route GET /api/seo-content/:page
 * @access Public
 */
export const getPublicSEOContent = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const seoContent = await seoContentService.getPublicSEOContent(
      req.params.page,
    );

    if (!seoContent) {
      return res.status(404).json({
        success: false,
        message: "SEO content not found",
      });
    }

    res.status(200).json({
      success: true,
      data: { seoContent },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Get all SEO content
 * @route GET /api/admin/seo-content
 * @access Private (Admin only)
 */
export const getAllSEOContent = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const filters = {
      search: req.query.search as string,
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
    };

    const result = await seoContentService.getAllSEOContent(filters);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Get SEO content by page
 * @route GET /api/admin/seo-content/:page
 * @access Private (Admin only)
 */
export const getSEOContentByPage = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const seoContent = await seoContentService.getSEOContentByPage(
      req.params.page,
    );

    if (!seoContent) {
      return res.status(404).json({
        success: false,
        message: "SEO content not found",
      });
    }

    res.status(200).json({
      success: true,
      data: { seoContent },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Create SEO content
 * @route POST /api/admin/seo-content
 * @access Private (Admin only)
 */
export const createSEOContent = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const seoContent = await seoContentService.createSEOContent(
      req.body,
      userId,
    );

    res.status(201).json({
      success: true,
      message: "SEO content created successfully",
      data: { seoContent },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Update SEO content
 * @route PUT /api/admin/seo-content/:page
 * @access Private (Admin only)
 */
export const updateSEOContent = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const seoContent = await seoContentService.updateSEOContent(
      req.params.page,
      req.body,
      userId,
    );

    res.status(200).json({
      success: true,
      message: "SEO content updated successfully",
      data: { seoContent },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Delete SEO content
 * @route DELETE /api/admin/seo-content/:page
 * @access Private (Admin only)
 */
export const deleteSEOContent = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    await seoContentService.deleteSEOContent(req.params.page);

    res.status(200).json({
      success: true,
      message: "SEO content deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
