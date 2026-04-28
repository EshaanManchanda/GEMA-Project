import { Response, NextFunction } from "express";
import { AuthRequest } from "../types/index";
import { AppError, catchAsync } from "../middleware/index";
import venueService from "../services/venue.service";

export const getVendorVenues = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return next(new AppError("User not authenticated", 401));

    const result = await venueService.getVendorVenues(userId.toString(), {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 10,
      search: req.query.search as string,
      status: req.query.status as string,
      venueType: req.query.venueType as string,
      sortBy: req.query.sortBy as string,
      sortOrder: req.query.sortOrder as "asc" | "desc",
    });

    res.status(200).json({
      success: true,
      message: "Vendor venues retrieved successfully",
      data: {
        venues: result.items,
        pagination: result.pagination,
      },
    });
  },
);

export const createVenue = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return next(new AppError("User not authenticated", 401));

    const venue = await venueService.createVenue(userId.toString(), req.body);

    res.status(201).json({
      success: true,
      message: "Venue created successfully",
      data: venue,
    });
  },
);

export const getVenueDetails = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return next(new AppError("User not authenticated", 401));

    const venue = await venueService.getVenueById(
      req.params.venueId,
      userId.toString(),
    );

    res.status(200).json({
      success: true,
      message: "Venue details retrieved successfully",
      data: venue,
    });
  },
);

export const updateVenue = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return next(new AppError("User not authenticated", 401));

    const venue = await venueService.updateVenue(
      req.params.venueId,
      userId.toString(),
      req.body,
    );

    res.status(200).json({
      success: true,
      message: "Venue updated successfully",
      data: venue,
    });
  },
);

// ==================== PUBLIC ENDPOINTS ====================

export const getPublicVenueBySlug = catchAsync(
  async (req: AuthRequest, res: Response, _next: NextFunction) => {
    const venue = await venueService.getPublicVenueBySlug(req.params.slug);

    res.status(200).json({
      success: true,
      data: venue,
    });
  },
);

export const getPublicVenues = catchAsync(
  async (req: AuthRequest, res: Response, _next: NextFunction) => {
    const result = await venueService.getPublicVenues({
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 12,
      search: req.query.search as string,
      venueType: req.query.venueType as string,
      city: req.query.city as string,
      sortBy: req.query.sortBy as string,
      sortOrder: req.query.sortOrder as "asc" | "desc",
    });

    res.status(200).json({
      success: true,
      data: {
        venues: result.items,
        pagination: result.pagination,
      },
    });
  },
);

// ==================== VENDOR ENDPOINTS ====================

export const deleteVenue = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return next(new AppError("User not authenticated", 401));

    await venueService.deleteVenue(req.params.venueId, userId.toString());

    res.status(200).json({
      success: true,
      message: "Venue deactivated successfully",
    });
  },
);
