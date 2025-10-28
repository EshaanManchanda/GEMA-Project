import { Request, Response, NextFunction } from 'express';
import { Venue, User, IVenue } from '../models';
import { AppError } from '../middleware';
import { ApiResponse } from '../types';
import mongoose from 'mongoose';

/**
 * Interface for venue query parameters
 */
interface VenueQueryParams {
  page?: string;
  limit?: string;
  search?: string;
  venueType?: string;
  status?: string;
  isApproved?: string;
  city?: string;
  country?: string;
  vendorId?: string;
  minCapacity?: string;
  maxCapacity?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Interface for venue update request
 */
interface UpdateVenueRequest {
  name?: string;
  description?: string;
  status?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
  };
  coordinates?: {
    lat: number;
    lng: number;
  };
  capacity?: number;
  venueType?: string;
  facilities?: string[];
  amenities?: string[];
  operatingHours?: Array<{
    day: string;
    openTime: string;
    closeTime: string;
    isClosed: boolean;
  }>;
  contactInfo?: {
    phone?: string;
    email?: string;
    website?: string;
  };
  baseRentalPrice?: number;
  currency?: string;
  safetyFeatures?: string[];
  certifications?: string[];
  isApproved?: boolean;
}

/**
 * Format venue for admin response (includes all information)
 */
const formatAdminVenueResponse = (venue: any) => {
  return {
    id: venue._id?.toString() || venue.id,
    name: venue.name,
    description: venue.description,
    status: venue.status,
    address: venue.address,
    coordinates: venue.coordinates,
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
    baseRentalPrice: venue.baseRentalPrice,
    currency: venue.currency,
    safetyFeatures: venue.safetyFeatures,
    certifications: venue.certifications,
    insuranceInfo: venue.insuranceInfo,
    totalEvents: venue.totalEvents,
    averageRating: venue.averageRating,
    isApproved: venue.isApproved,
    vendor: venue.vendorId ? {
      id: venue.vendorId._id?.toString() || venue.vendorId.id,
      firstName: venue.vendorId.firstName,
      lastName: venue.vendorId.lastName,
      email: venue.vendorId.email,
      fullName: `${venue.vendorId.firstName} ${venue.vendorId.lastName}`
    } : null,
    createdAt: typeof venue.createdAt === 'string' ? venue.createdAt : venue.createdAt?.toISOString(),
    updatedAt: typeof venue.updatedAt === 'string' ? venue.updatedAt : venue.updatedAt?.toISOString()
  };
};

/**
 * Get all venues with pagination and filtering (Admin view - includes all venues)
 */
export const getAllVenues = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const {
      page = '1',
      limit = '10',
      search,
      venueType,
      status,
      isApproved,
      city,
      country,
      vendorId,
      minCapacity,
      maxCapacity,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query as VenueQueryParams;

    // Build query - Admin can see all venues
    const query: any = {};

    // Search functionality
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { 'address.street': { $regex: search, $options: 'i' } },
        { 'address.city': { $regex: search, $options: 'i' } },
        { 'address.state': { $regex: search, $options: 'i' } },
        { 'address.country': { $regex: search, $options: 'i' } },
        { facilities: { $regex: search, $options: 'i' } },
        { amenities: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by venue type
    if (venueType) {
      query.venueType = venueType;
    }

    // Filter by status
    if (status) {
      query.status = status;
    }

    // Filter by approval status
    if (isApproved !== undefined) {
      query.isApproved = isApproved === 'true';
    }

    // Filter by city
    if (city) {
      query['address.city'] = { $regex: city, $options: 'i' };
    }

    // Filter by country
    if (country) {
      query['address.country'] = { $regex: country, $options: 'i' };
    }

    // Filter by vendor
    if (vendorId && mongoose.Types.ObjectId.isValid(vendorId)) {
      query.vendorId = vendorId;
    }

    // Filter by capacity range
    if (minCapacity || maxCapacity) {
      query.capacity = {};
      if (minCapacity) query.capacity.$gte = parseInt(minCapacity);
      if (maxCapacity) query.capacity.$lte = parseInt(maxCapacity);
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Sort
    const sortObj: any = {};
    sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query
    const [venues, totalVenues] = await Promise.all([
      Venue.find(query)
        .populate('vendorId', 'firstName lastName email')
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Venue.countDocuments(query)
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(totalVenues / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    // Format response
    const formattedVenues = venues.map(venue => formatAdminVenueResponse(venue as IVenue));

    const response: ApiResponse = {
      success: true,
      message: 'Venues retrieved successfully',
      data: {
        venues: formattedVenues,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalVenues,
          hasNextPage,
          hasPrevPage,
          limit: limitNum
        },
        filters: {
          search,
          venueType,
          status,
          isApproved,
          city,
          country,
          vendorId,
          minCapacity,
          maxCapacity,
          sortBy,
          sortOrder
        }
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Create new venue (Admin)
 */
export const createVenue = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const venueData = req.body as UpdateVenueRequest & { vendorId: string };

    // Validate vendor ID
    if (!venueData.vendorId || !mongoose.Types.ObjectId.isValid(venueData.vendorId)) {
      return next(new AppError('Valid vendor ID is required', 400));
    }

    // Check if vendor exists
    const vendor = await User.findById(venueData.vendorId);
    if (!vendor) {
      return next(new AppError('Vendor not found', 404));
    }

    // Create venue
    const venue = await Venue.create(venueData);

    // Populate vendor details
    await venue.populate('vendorId', 'firstName lastName email');

    const response: ApiResponse = {
      success: true,
      message: 'Venue created successfully',
      data: {
        venue: formatAdminVenueResponse(venue)
      }
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get venue by ID (Admin view - includes all details)
 */
export const getVenueById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError('Invalid venue ID', 400));
    }

    const venue = await Venue.findById(id)
      .populate('vendorId', 'firstName lastName email phone avatar');

    if (!venue) {
      return next(new AppError('Venue not found', 404));
    }

    const response: ApiResponse = {
      success: true,
      message: 'Venue retrieved successfully',
      data: {
        venue: formatAdminVenueResponse(venue)
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Update venue (Admin can update any field)
 */
export const updateVenue = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body as UpdateVenueRequest;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError('Invalid venue ID', 400));
    }

    // Check if venue exists
    const venue = await Venue.findById(id);
    if (!venue) {
      return next(new AppError('Venue not found', 404));
    }

    // Update venue
    const updatedVenue = await Venue.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('vendorId', 'firstName lastName email');

    const response: ApiResponse = {
      success: true,
      message: 'Venue updated successfully',
      data: {
        venue: formatAdminVenueResponse(updatedVenue)
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete venue (Admin can delete venues)
 */
export const deleteVenue = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError('Invalid venue ID', 400));
    }

    // Check if venue exists
    const venue = await Venue.findById(id);
    if (!venue) {
      return next(new AppError('Venue not found', 404));
    }

    // Delete venue
    await Venue.findByIdAndDelete(id);

    const response: ApiResponse = {
      success: true,
      message: 'Venue deleted successfully',
      data: null
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Approve venue
 */
export const approveVenue = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError('Invalid venue ID', 400));
    }

    // Update venue approval status
    const venue = await Venue.findByIdAndUpdate(
      id,
      { isApproved: true },
      { new: true, runValidators: true }
    ).populate('vendorId', 'firstName lastName email');

    if (!venue) {
      return next(new AppError('Venue not found', 404));
    }

    const response: ApiResponse = {
      success: true,
      message: 'Venue approved successfully',
      data: {
        venue: formatAdminVenueResponse(venue)
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Reject venue
 */
export const rejectVenue = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError('Invalid venue ID', 400));
    }

    // Update venue approval status
    const venue = await Venue.findByIdAndUpdate(
      id,
      { isApproved: false },
      { new: true, runValidators: true }
    ).populate('vendorId', 'firstName lastName email');

    if (!venue) {
      return next(new AppError('Venue not found', 404));
    }

    const response: ApiResponse = {
      success: true,
      message: 'Venue rejected successfully',
      data: {
        venue: formatAdminVenueResponse(venue),
        rejectionReason: reason
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Update venue status
 */
export const updateVenueStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError('Invalid venue ID', 400));
    }

    // Validate status
    const validStatuses = ['active', 'inactive', 'maintenance', 'suspended'];
    if (!validStatuses.includes(status)) {
      return next(new AppError('Invalid status', 400));
    }

    // Update venue status
    const venue = await Venue.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    ).populate('vendorId', 'firstName lastName email');

    if (!venue) {
      return next(new AppError('Venue not found', 404));
    }

    const response: ApiResponse = {
      success: true,
      message: 'Venue status updated successfully',
      data: {
        venue: formatAdminVenueResponse(venue)
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk update venues
 */
export const bulkUpdateVenues = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { venueIds, updateData } = req.body;

    if (!Array.isArray(venueIds) || venueIds.length === 0) {
      return next(new AppError('Venue IDs array is required', 400));
    }

    // Validate all venue IDs
    const invalidIds = venueIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      return next(new AppError('Invalid venue IDs found', 400));
    }

    // Update venues
    const result = await Venue.updateMany(
      { _id: { $in: venueIds } },
      updateData,
      { runValidators: true }
    );

    const response: ApiResponse = {
      success: true,
      message: `${result.modifiedCount} venues updated successfully`,
      data: {
        updatedCount: result.modifiedCount,
        matchedCount: result.matchedCount
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get venue statistics
 */
export const getVenueStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const [
      totalVenues,
      approvedVenues,
      pendingVenues,
      activeVenues,
      venuesByType,
      venuesByStatus,
      venuesByCity,
      recentVenues,
      capacityStats
    ] = await Promise.all([
      Venue.countDocuments(),
      Venue.countDocuments({ isApproved: true }),
      Venue.countDocuments({ isApproved: false }),
      Venue.countDocuments({ status: 'active' }),
      Venue.aggregate([
        { $group: { _id: '$venueType', count: { $sum: 1 } } }
      ]),
      Venue.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Venue.aggregate([
        { $group: { _id: '$address.city', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      Venue.find()
        .populate('vendorId', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      Venue.aggregate([
        {
          $group: {
            _id: null,
            totalCapacity: { $sum: '$capacity' },
            averageCapacity: { $avg: '$capacity' },
            maxCapacity: { $max: '$capacity' },
            minCapacity: { $min: '$capacity' }
          }
        }
      ])
    ]);

    const response: ApiResponse = {
      success: true,
      message: 'Venue statistics retrieved successfully',
      data: {
        totalVenues,
        approvedVenues,
        pendingVenues,
        activeVenues,
        venuesByType: venuesByType.reduce((acc, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {}),
        venuesByStatus: venuesByStatus.reduce((acc, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {}),
        venuesByCity: venuesByCity.reduce((acc, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {}),
        capacityStats: capacityStats[0] || {
          totalCapacity: 0,
          averageCapacity: 0,
          maxCapacity: 0,
          minCapacity: 0
        },
        recentVenues: recentVenues.map(venue => formatAdminVenueResponse(venue as IVenue))
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};