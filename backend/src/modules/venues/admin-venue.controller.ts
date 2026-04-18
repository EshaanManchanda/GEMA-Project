import { Request, Response, NextFunction } from "express";
import { ApiResponse } from "../../types/index";
import venueService from "./venue.service";

const formatAdminVenueResponse = (venue: any) => {
  let status = "inactive";
  if (venue.isActive) status = "active";
  else if (venue.cancellationStatus === "cancelled") status = "maintenance";
  else if (venue.status === "rejected") status = "suspended";

  return {
    id: venue._id?.toString() || venue.id,
    name: venue.title || venue.name,
    description: venue.description,
    status: status,
    address: venue.location
      ? {
          street: venue.location.address,
          city: venue.location.city,
          state: venue.location.state,
          country: venue.location.country,
          zipCode: venue.location.zipCode,
        }
      : venue.address,
    coordinates: venue.location?.coordinates || venue.coordinates,
    capacity: venue.capacity,
    venueType: venue.venueType,
    facilities: venue.facilities,
    amenities: venue.amenities,
    operatingHours: venue.operatingHours,
    timezone: venue.timezone,
    checkInGates: venue.checkInGates,
    accessRules: venue.accessRules,
    contactInfo: venue.contactInfo,
    wifiCredentials: venue.wifiCredentials,
    images: venue.images,
    virtualTourUrl: venue.virtualTourUrl,
    baseRentalPrice: venue.price,
    currency: venue.currency,
    safetyFeatures: venue.safetyFeatures,
    certifications: venue.certifications,
    insuranceInfo: venue.insuranceInfo,
    totalEvents: venue.totalEvents || 0,
    averageRating: venue.averageRating,
    isApproved: venue.isApproved,
    vendor:
      venue.vendorId && typeof venue.vendorId === "object"
        ? {
            id:
              (venue.vendorId as any)._id?.toString() ||
              (venue.vendorId as any).id,
            firstName: (venue.vendorId as any).firstName,
            lastName: (venue.vendorId as any).lastName,
            email: (venue.vendorId as any).email,
            fullName: `${(venue.vendorId as any).firstName} ${(venue.vendorId as any).lastName}`,
          }
        : venue.vendorId,
    createdAt:
      typeof venue.createdAt === "string"
        ? venue.createdAt
        : venue.createdAt?.toISOString(),
    updatedAt:
      typeof venue.updatedAt === "string"
        ? venue.updatedAt
        : venue.updatedAt?.toISOString(),
  };
};

export const getAllVenues = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await venueService.getAllVenues({
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 10,
      search: req.query.search as string,
      venueType: req.query.venueType as string,
      status: req.query.status as string,
      isApproved: req.query.isApproved as string,
      city: req.query.city as string,
      country: req.query.country as string,
      vendorId: req.query.vendorId as string,
      minCapacity: req.query.minCapacity
        ? parseInt(req.query.minCapacity as string)
        : undefined,
      maxCapacity: req.query.maxCapacity
        ? parseInt(req.query.maxCapacity as string)
        : undefined,
      sortBy: (req.query.sortBy as string) || "createdAt",
      sortOrder: (req.query.sortOrder as "asc" | "desc") || "desc",
    });

    const formattedVenues = result.items.map((v: any) =>
      formatAdminVenueResponse(v),
    );

    const response: ApiResponse = {
      success: true,
      message: "Venues retrieved successfully",
      data: {
        venues: formattedVenues,
        pagination: result.pagination,
        filters: {
          search: req.query.search,
          venueType: req.query.venueType,
          status: req.query.status,
          isApproved: req.query.isApproved,
          city: req.query.city,
          country: req.query.country,
          vendorId: req.query.vendorId,
          minCapacity: req.query.minCapacity,
          maxCapacity: req.query.maxCapacity,
          sortBy: req.query.sortBy,
          sortOrder: req.query.sortOrder,
        },
      },
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const createVenue = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const venue = await venueService.adminCreateVenue(req.body);

    res.status(201).json({
      success: true,
      message: "Venue created successfully",
      data: { venue: formatAdminVenueResponse(venue) },
    });
  } catch (error) {
    next(error);
  }
};

export const getVenueById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const venue = await venueService.adminGetVenueById(req.params.id);

    res.status(200).json({
      success: true,
      message: "Venue retrieved successfully",
      data: { venue: formatAdminVenueResponse(venue) },
    });
  } catch (error) {
    next(error);
  }
};

export const updateVenue = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const venue = await venueService.adminUpdateVenue(req.params.id, req.body);

    res.status(200).json({
      success: true,
      message: "Venue updated successfully",
      data: { venue: formatAdminVenueResponse(venue) },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteVenue = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await venueService.adminDeleteVenue(req.params.id);

    res.status(200).json({
      success: true,
      message: "Venue deleted successfully",
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

export const approveVenue = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const venue = await venueService.approveVenue(req.params.id);

    res.status(200).json({
      success: true,
      message: "Venue approved successfully",
      data: { venue: formatAdminVenueResponse(venue) },
    });
  } catch (error) {
    next(error);
  }
};

export const rejectVenue = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const venue = await venueService.rejectVenue(req.params.id);

    res.status(200).json({
      success: true,
      message: "Venue rejected successfully",
      data: {
        venue: formatAdminVenueResponse(venue),
        rejectionReason: req.body.reason,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateVenueStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const venue = await venueService.updateVenueStatus(
      req.params.id,
      req.body.status,
    );

    res.status(200).json({
      success: true,
      message: "Venue status updated successfully",
      data: { venue: formatAdminVenueResponse(venue) },
    });
  } catch (error) {
    next(error);
  }
};

export const bulkUpdateVenues = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { venueIds, updateData } = req.body;
    const result = await venueService.bulkUpdateVenues(venueIds, updateData);

    res.status(200).json({
      success: true,
      message: `${result.modifiedCount} venues updated successfully`,
      data: {
        updatedCount: result.modifiedCount,
        matchedCount: result.matchedCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getVenueStats = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const stats = await venueService.getVenueStats();

    res.status(200).json({
      success: true,
      message: "Venue statistics retrieved successfully",
      data: {
        ...stats,
        recentVenues: stats.recentVenues.map((v: any) =>
          formatAdminVenueResponse(v),
        ),
      },
    });
  } catch (error) {
    next(error);
  }
};
