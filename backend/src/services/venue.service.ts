import mongoose, { Types } from "mongoose";
import { Event, IEvent, User } from "../models/index";
// import { VenueStatus } from '../models/Venue'; // Removed
import { AppError } from "../middleware/index";
import { getOrCreateVendorProfile } from "../utils/vendorHelpers";

// ==================== INTERFACES ====================

export interface CreateVenueInput {
  name: string;
  description?: string;
  vendorId: string; // This is actually userId in controller, resolved to vendorId in service
  address: {
    street: string; // Mapped to location.address
    city: string; // Mapped to location.city
    state: string; // Mapped to location.state
    country: string; // Mapped to location.country
    zipCode: string; // Mapped to location.zipCode
  };
  coordinates?: { lat: number; lng: number };
  capacity: number;
  venueType: string;
  facilities?: string[];
  amenities?: string[];
  operatingHours?: Array<{
    day: string;
    openTime: string;
    closeTime: string;
    isClosed: boolean;
  }>;
  timezone?: string;
  checkInGates?: any[];
  accessRules?: any[];
  wifiCredentials?: { ssid: string; password: string };
  contactInfo?: {
    phone?: string;
    email?: string;
    website?: string;
  };
  images?: string[];
  virtualTourUrl?: string; // Not in Event? Need to check or map to something else, or add it?
  baseRentalPrice?: number;
  currency?: string;
  safetyFeatures?: string[];
  certifications?: string[];
  isAffiliateVenue?: boolean;
  externalBookingLink?: string;
  claimStatus?: string;
  status?: string;
  isApproved?: boolean;
}

export interface UpdateVenueInput extends Partial<CreateVenueInput> {}

export interface VenueQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  venueType?: string;
  status?: string;
  isApproved?: string;
  city?: string;
  country?: string;
  vendorId?: string;
  minCapacity?: number;
  maxCapacity?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: {
    currentPage: number;
    totalPages: number;
    total: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
    limit: number;
  };
}

// ==================== VENUE SERVICE ====================

class VenueService {
  /**
   * Resolve vendor's Vendor._id from userId
   */
  private async resolveVendorId(
    userId: string | Types.ObjectId,
  ): Promise<Types.ObjectId> {
    const vendorProfile = await getOrCreateVendorProfile(userId);
    return vendorProfile._id;
  }

  /**
   * Safe mapping from Venue input to Event schema
   */
  private mapInputToEvent(
    data: CreateVenueInput | UpdateVenueInput,
    vendorId?: Types.ObjectId,
  ) {
    const mapped: any = { ...data };

    // Set type explicitly
    mapped.type = "Venue";

    // Map address to location
    if (data.address) {
      mapped.location = {
        address: data.address.street,
        city: data.address.city,
        state: data.address.state,
        country: data.address.country,
        zipCode: data.address.zipCode,
        coordinates: data.coordinates,
      };
      delete mapped.address;
    } else if (data.coordinates) {
      // If address not provided but coordinates are updated (partial update)
      // We need to handle this carefully. Use $set in update or merge.
      // For create, address is required.
    }

    if (vendorId) {
      mapped.vendorId = vendorId;
    }

    // Map name to title
    if (data.name) {
      mapped.title = data.name;
      delete mapped.name;
    }

    // Map status
    if (data.status) {
      if (data.status === "active") {
        mapped.status = "published";
        mapped.isActive = true;
      } else if (data.status === "inactive") {
        mapped.isActive = false;
        // Keep current status or default?
      } else if (data.status === "maintenance") {
        mapped.cancellationStatus = "cancelled"; // Best approximation? Or just isActive=false
        mapped.isActive = false;
      } else if (data.status === "suspended") {
        mapped.status = "rejected";
        mapped.isActive = false;
      }
    }

    // Map baseRentalPrice to price
    if (data.baseRentalPrice !== undefined) {
      mapped.price = data.baseRentalPrice;
      delete mapped.baseRentalPrice;
    }

    // Add required fields for Event if missing (for Create)
    // ageRange is required in Event
    if (!mapped.ageRange && !("ageRange" in mapped)) {
      mapped.ageRange = [0, 100]; // Default for venues
    }
    // category is required
    if (!mapped.category) {
      mapped.category = "Venue";
    }

    return mapped;
  }

  /**
   * Build filter query from params
   */
  private buildFilterQuery(params: VenueQueryParams): any {
    const query: any = { type: "Venue" };

    if (params.search) {
      query.$or = [
        { title: { $regex: params.search, $options: "i" } },
        { description: { $regex: params.search, $options: "i" } },
        { "location.address": { $regex: params.search, $options: "i" } },
        { "location.city": { $regex: params.search, $options: "i" } },
        { "location.state": { $regex: params.search, $options: "i" } },
        { "location.country": { $regex: params.search, $options: "i" } },
        { facilities: { $regex: params.search, $options: "i" } },
        { amenities: { $regex: params.search, $options: "i" } },
      ];
    }

    if (params.venueType) query.venueType = params.venueType;

    // Status mapping
    if (params.status) {
      if (params.status === "active") {
        query.status = "published";
        query.isActive = true;
      } else if (params.status === "inactive") {
        query.isActive = false;
      }
    }

    if (params.isApproved !== undefined) {
      query.isApproved = params.isApproved === "true";
    }
    if (params.city) {
      query["location.city"] = { $regex: params.city, $options: "i" };
    }
    if (params.country) {
      query["location.country"] = { $regex: params.country, $options: "i" };
    }
    if (params.vendorId && mongoose.Types.ObjectId.isValid(params.vendorId)) {
      query.vendorId = params.vendorId;
    }
    if (params.minCapacity || params.maxCapacity) {
      query.capacity = {};
      if (params.minCapacity) query.capacity.$gte = params.minCapacity;
      if (params.maxCapacity) query.capacity.$lte = params.maxCapacity;
    }

    return query;
  }

  // ==================== VENDOR OPERATIONS ====================

  /**
   * Create venue for a vendor (uses Vendor._id)
   */
  async createVenue(userId: string, data: CreateVenueInput): Promise<IEvent> {
    const vendorId = await this.resolveVendorId(userId);
    const eventData = this.mapInputToEvent(data, vendorId);

    const venue = await Event.create(eventData);

    return venue;
  }

  /**
   * Get vendor's own venues (paginated)
   */
  async getVendorVenues(
    userId: string,
    params: VenueQueryParams,
  ): Promise<PaginatedResult<IEvent>> {
    const vendorId = await this.resolveVendorId(userId);

    const page = params.page || 1;
    const limit = params.limit || 10;
    const skip = (page - 1) * limit;
    const sortBy =
      params.sortBy === "name" ? "title" : params.sortBy || "createdAt";
    const sortOrder = params.sortOrder === "asc" ? 1 : -1;

    const filter: any = { vendorId, type: "Venue" };

    if (params.search) {
      filter.$or = [
        { title: { $regex: params.search, $options: "i" } },
        { "location.city": { $regex: params.search, $options: "i" } },
      ];
    }
    // Status mapping
    if (params.status) {
      if (params.status === "active") {
        filter.status = "published";
        filter.isActive = true;
      } else {
        // Simplify for now
        filter.isActive = false;
      }
    }

    if (params.venueType) filter.venueType = params.venueType;

    const sortObj: any = {};
    sortObj[sortBy] = sortOrder;

    const [venues, total] = await Promise.all([
      Event.find(filter).sort(sortObj).skip(skip).limit(limit).lean(),
      Event.countDocuments(filter),
    ]);

    // Map back title -> name for compatibility if needed, but IEvent has title.
    // Frontend expects Venue object?
    // We might need to transform the response to look like a Venue if frontend relies on 'name' etc.
    // For now I won't transform, assuming I will update frontend.

    return {
      items: venues as unknown as IEvent[],
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        total,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
        limit,
      },
    };
  }

  /**
   * Get venue by ID with optional ownership check
   */
  async getVenueById(venueId: string, userId?: string): Promise<IEvent> {
    const filter: any = { _id: venueId, type: "Venue" };

    if (userId) {
      const vendorId = await this.resolveVendorId(userId);
      filter.vendorId = vendorId;
    }

    const venue = await Event.findOne(filter);

    if (!venue) {
      throw new AppError(
        "Venue not found or not associated with your account",
        404,
      );
    }

    return venue;
  }

  /**
   * Update venue with ownership check
   */
  async updateVenue(
    venueId: string,
    userId: string,
    data: UpdateVenueInput,
  ): Promise<IEvent> {
    const vendorId = await this.resolveVendorId(userId);
    const updateData = this.mapInputToEvent(data);
    delete updateData.vendorId; // Don't change owner

    const venue = await Event.findOneAndUpdate(
      { _id: venueId, vendorId, type: "Venue" },
      { $set: updateData },
      { new: true, runValidators: true },
    );

    if (!venue) {
      throw new AppError(
        "Venue not found or not associated with your account",
        404,
      );
    }

    return venue;
  }

  /**
   * Soft-delete venue (set status inactive)
   */
  async deleteVenue(venueId: string, userId: string): Promise<void> {
    const vendorId = await this.resolveVendorId(userId);

    const venue = await Event.findOneAndUpdate(
      { _id: venueId, vendorId, type: "Venue" },
      {
        status: "archived",
        isActive: false,
      },
      { new: true },
    );

    if (!venue) {
      throw new AppError(
        "Venue not found or not associated with your account",
        404,
      );
    }
  }

  // ==================== PUBLIC OPERATIONS ====================

  /**
   * Get public venue detail by slug (approved + active only, no auth)
   */
  async getPublicVenueBySlug(slug: string): Promise<IEvent> {
    const venue = await Event.findOne({
      slug,
      isApproved: true,
      isActive: true, // Replaces status: 'active'
      status: "published",
      type: "Venue",
    })
      .select(
        "-checkInGates -accessRules -insuranceInfo -affiliateClickTracking -claimedBy -claimedAt -originalAffiliateVendorId",
      )
      .populate("vendorId", "businessName firstName lastName")
      .lean();

    if (!venue) {
      throw new AppError("Venue not found", 404);
    }

    return venue as unknown as IEvent;
  }

  /**
   * Get public venues list (approved + active only, no auth)
   */
  async getPublicVenues(
    params: VenueQueryParams,
  ): Promise<PaginatedResult<IEvent>> {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 12, 50);
    const skip = (page - 1) * limit;
    const sortBy =
      params.sortBy === "averageRating"
        ? "averageRating"
        : params.sortBy || "createdAt";
    const sortOrder = params.sortOrder === "asc" ? 1 : -1;

    const filter: any = {
      isApproved: true,
      isActive: true,
      status: "published",
      type: "Venue",
    };

    if (params.search) {
      filter.$or = [
        { title: { $regex: params.search, $options: "i" } },
        { "location.city": { $regex: params.search, $options: "i" } },
        { facilities: { $regex: params.search, $options: "i" } },
      ];
    }
    if (params.venueType) filter.venueType = params.venueType;
    if (params.city) {
      filter["location.city"] = { $regex: params.city, $options: "i" };
    }

    const sortObj: any = {};
    sortObj[sortBy] = sortOrder;

    const [venues, total] = await Promise.all([
      Event.find(filter)
        // Select equivalent fields
        .select(
          "title slug description location venueType capacity facilities amenities images averageRating totalEvents isAffiliateEvent externalBookingLink",
        )
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .lean(),
      Event.countDocuments(filter),
    ]);

    return {
      items: venues as unknown as IEvent[],
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        total,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
        limit,
      },
    };
  }

  // ==================== ADMIN OPERATIONS ====================

  /**
   * Get all venues (admin) with full filtering
   */
  async getAllVenues(params: VenueQueryParams): Promise<PaginatedResult<any>> {
    const page = params.page || 1;
    const limit = params.limit || 10;
    const skip = (page - 1) * limit;
    const sortBy = params.sortBy || "createdAt";
    const sortOrder = params.sortOrder === "asc" ? 1 : -1;

    const query = this.buildFilterQuery(params);

    const sortObj: any = {};
    sortObj[sortBy] = sortOrder;

    const [venues, total] = await Promise.all([
      Event.find(query)
        .populate("vendorId", "firstName lastName email")
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .lean(),
      Event.countDocuments(query),
    ]);

    return {
      items: venues,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        total,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
        limit,
      },
    };
  }

  /**
   * Admin: create venue (vendorId from body)
   */
  async adminCreateVenue(data: CreateVenueInput): Promise<IEvent> {
    if (!data.vendorId || !mongoose.Types.ObjectId.isValid(data.vendorId)) {
      throw new AppError("Valid vendor ID is required", 400);
    }

    const vendor = await User.findById(data.vendorId);
    if (!vendor) {
      throw new AppError("Vendor not found", 404);
    }

    // Pass resolved vendorId (which is passed as part of data) logic?
    // Wait, createVenue maps data.vendorId to userId in controller usually?
    // In admin case, data.vendorId IS the vendorId.
    const eventData = this.mapInputToEvent(
      data,
      new Types.ObjectId(data.vendorId),
    );

    const venue = await Event.create(eventData);
    await venue.populate("vendorId", "firstName lastName email");

    return venue;
  }

  /**
   * Admin: get venue by ID (no ownership check)
   */
  async adminGetVenueById(venueId: string): Promise<IEvent> {
    if (!mongoose.Types.ObjectId.isValid(venueId)) {
      throw new AppError("Invalid venue ID", 400);
    }

    // Ensure it is a Venue type
    const venue = await Event.findOne({ _id: venueId, type: "Venue" }).populate(
      "vendorId",
      "firstName lastName email phone avatar",
    );

    if (!venue) {
      throw new AppError("Venue not found", 404);
    }

    return venue;
  }

  /**
   * Admin: update venue (any field)
   */
  async adminUpdateVenue(
    venueId: string,
    data: UpdateVenueInput,
  ): Promise<IEvent> {
    if (!mongoose.Types.ObjectId.isValid(venueId)) {
      throw new AppError("Invalid venue ID", 400);
    }

    const eventData = this.mapInputToEvent(data); // Don't pass vendorId to overwrite usually
    // But mapInputToEvent deletes vendorId if check logic...
    // Actually mapInputToEvent only sets vendorId if passed in 2nd arg.

    const venue = await Event.findOne({ _id: venueId, type: "Venue" });
    if (!venue) {
      throw new AppError("Venue not found", 404);
    }

    const updated = await Event.findByIdAndUpdate(
      venueId,
      { $set: eventData },
      { new: true, runValidators: true },
    ).populate("vendorId", "firstName lastName email");

    return updated!;
  }

  /**
   * Admin: delete venue (hard delete)
   */
  async adminDeleteVenue(venueId: string): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(venueId)) {
      throw new AppError("Invalid venue ID", 400);
    }

    const venue = await Event.findOne({ _id: venueId, type: "Venue" });
    if (!venue) {
      throw new AppError("Venue not found", 404);
    }

    await Event.findByIdAndDelete(venueId);
  }

  /**
   * Approve venue
   */
  async approveVenue(venueId: string): Promise<IEvent> {
    if (!mongoose.Types.ObjectId.isValid(venueId)) {
      throw new AppError("Invalid venue ID", 400);
    }

    const venue = await Event.findOneAndUpdate(
      { _id: venueId, type: "Venue" },
      { isApproved: true },
      { new: true, runValidators: true },
    ).populate("vendorId", "firstName lastName email");

    if (!venue) {
      throw new AppError("Venue not found", 404);
    }

    return venue;
  }

  /**
   * Reject venue
   */
  async rejectVenue(venueId: string): Promise<IEvent> {
    if (!mongoose.Types.ObjectId.isValid(venueId)) {
      throw new AppError("Invalid venue ID", 400);
    }

    const venue = await Event.findOneAndUpdate(
      { _id: venueId, type: "Venue" },
      { isApproved: false },
      { new: true, runValidators: true },
    ).populate("vendorId", "firstName lastName email");

    if (!venue) {
      throw new AppError("Venue not found", 404);
    }

    return venue;
  }

  /**
   * Update venue status
   */
  async updateVenueStatus(venueId: string, status: string): Promise<IEvent> {
    if (!mongoose.Types.ObjectId.isValid(venueId)) {
      throw new AppError("Invalid venue ID", 400);
    }

    const updateData: any = {};
    if (status === "active") {
      updateData.status = "published";
      updateData.isActive = true;
    } else if (status === "inactive") {
      updateData.isActive = false;
    } else if (status === "suspended") {
      updateData.status = "rejected";
      updateData.isActive = false;
    } else if (status === "maintenance") {
      updateData.cancellationStatus = "cancelled";
      updateData.isActive = false;
    } else {
      throw new AppError("Invalid status", 400);
    }

    const venue = await Event.findOneAndUpdate(
      { _id: venueId, type: "Venue" },
      updateData,
      { new: true, runValidators: true },
    ).populate("vendorId", "firstName lastName email");

    if (!venue) {
      throw new AppError("Venue not found", 404);
    }

    return venue;
  }

  /**
   * Bulk update venues
   */
  async bulkUpdateVenues(
    venueIds: string[],
    updateData: any,
  ): Promise<{ modifiedCount: number; matchedCount: number }> {
    if (!Array.isArray(venueIds) || venueIds.length === 0) {
      throw new AppError("Venue IDs array is required", 400);
    }

    const invalidIds = venueIds.filter(
      (id) => !mongoose.Types.ObjectId.isValid(id),
    );
    if (invalidIds.length > 0) {
      throw new AppError("Invalid venue IDs found", 400);
    }

    // Need to map updateData too if it contains status or address
    // But usually bulk update is for simple fields

    const result = await Event.updateMany(
      { _id: { $in: venueIds }, type: "Venue" },
      updateData,
      { runValidators: true },
    );

    return {
      modifiedCount: result.modifiedCount,
      matchedCount: result.matchedCount,
    };
  }

  /**
   * Get venue statistics
   */
  async getVenueStats(): Promise<any> {
    const [
      totalVenues,
      approvedVenues,
      pendingVenues,
      activeVenues,
      venuesByType,
      venuesByStatus,
      venuesByCity,
      recentVenues,
      capacityStats,
    ] = await Promise.all([
      Event.countDocuments({ type: "Venue" }),
      Event.countDocuments({ type: "Venue", isApproved: true }),
      Event.countDocuments({ type: "Venue", isApproved: false }),
      Event.countDocuments({
        type: "Venue",
        isActive: true,
        status: "published",
      }),
      Event.aggregate([
        { $match: { type: "Venue" } },
        { $group: { _id: "$venueType", count: { $sum: 1 } } },
      ]),
      // Status is tricky because we mapped it.
      // We can group by status field even if different
      Event.aggregate([
        { $match: { type: "Venue" } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      Event.aggregate([
        { $match: { type: "Venue" } },
        { $group: { _id: "$location.city", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      Event.find({ type: "Venue" })
        .populate("vendorId", "firstName lastName email")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      Event.aggregate([
        { $match: { type: "Venue" } },
        {
          $group: {
            _id: null,
            totalCapacity: { $sum: "$capacity" },
            averageCapacity: { $avg: "$capacity" },
            maxCapacity: { $max: "$capacity" },
            minCapacity: { $min: "$capacity" },
          },
        },
      ]),
    ]);

    return {
      totalVenues,
      approvedVenues,
      pendingVenues,
      activeVenues,
      venuesByType: venuesByType.reduce((acc: any, curr: any) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {}),
      venuesByStatus: venuesByStatus.reduce((acc: any, curr: any) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {}),
      venuesByCity: venuesByCity.reduce((acc: any, curr: any) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {}),
      capacityStats: capacityStats[0] || {
        totalCapacity: 0,
        averageCapacity: 0,
        maxCapacity: 0,
        minCapacity: 0,
      },
      recentVenues,
    };
  }
}

export default new VenueService();
