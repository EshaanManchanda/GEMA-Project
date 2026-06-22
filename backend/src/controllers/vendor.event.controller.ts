import { Event, Category, Vendor } from "../models/index";
import { AppError, catchAsync } from "../middleware/index";
import { AuthRequest } from "../types/index";
import { NextFunction, Response } from "express";
import { getOrCreateVendorProfile } from "../utils/vendorHelpers";

// @desc    Get single event by ID (vendor's own event)
// @route   GET /api/vendors/events/:id
// @access  Private (Vendor only)
export const getVendorEventById = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.user?._id || req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return next(new AppError("User ID not found", 401));
    }

    // Get vendor profile to get Vendor._id
    const vendorProfile = await getOrCreateVendorProfile(userId);
    const vendorId = vendorProfile._id;

    const event = await Event.findOne({ _id: id, vendorId, isDeleted: false })
      .populate("imageAssets", "url secureUrl publicId");

    if (!event) {
      return next(new AppError("Event not found", 404));
    }

    res.status(200).json({
      success: true,
      message: "Event retrieved successfully",
      data: { event },
    });
  },
);

// @desc    Create new event
// @route   POST /api/vendors/events
// @access  Private (Vendor only)
export const createVendorEvent = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return next(new AppError("User ID not found", 401));
    }

    // Get vendor profile to get Vendor._id
    const vendorProfile = await getOrCreateVendorProfile(userId);
    const vendorId = vendorProfile._id;

    const {
      title,
      description,
      shortDescription,
      category,
      type,
      venueType,
      ageRange,
      location,
      price,
      currency,
      tags,
      images,
      imageAssets,
      dateSchedule,
      seoMeta,
      faqs,
      externalBookingLink,
      isAffiliateEvent,
      isFreeEvent,
      meetingLink,
      competitionFormat,
      teamSize,
      skillLevel,
      prerequisites,
      facilities,
      amenities,
      requirePhoneVerification,
    } = req.body;

    // Validation
    if (!title || !description || !category) {
      return next(
        new AppError("Title, description, and category are required", 400),
      );
    }

    if (!shortDescription) {
      return next(
        new AppError("Short description is required", 400),
      );
    }

    if (venueType !== "Online" && (!location || !location.city || !location.address)) {
      return next(
        new AppError("Location details (city, address) are required", 400),
      );
    }

    if (!dateSchedule || dateSchedule.length === 0) {
      return next(new AppError("At least one date schedule is required", 400));
    }

    // Validate category exists (accepts slug or display name)
    const categoryDoc = await Category.findOne({
      $or: [{ slug: category }, { name: category }],
      isActive: true,
    });
    if (!categoryDoc) {
      return next(new AppError("Invalid category", 400));
    }

    // Validate external booking link if isAffiliateEvent
    if (isAffiliateEvent && !externalBookingLink) {
      return next(
        new AppError(
          "External booking link is required for affiliate events",
          400,
        ),
      );
    }

    // Create event
    const event = await Event.create({
      vendorId,
      title,
      description,
      shortDescription,
      category,
      type: type || "Event",
      venueType: venueType || "Indoor",
      ageRange: ageRange || [0, 100],
      location: {
        city: location.city,
        address: location.address,
        ...(location.country && { country: location.country }),
        ...(location.state && { state: location.state }),
        ...(location.zipCode && { zipCode: location.zipCode }),
        coordinates: {
          lat: location.coordinates?.lat || 0,
          lng: location.coordinates?.lng || 0,
        },
      },
      isFreeEvent: isFreeEvent || false,
      price: isFreeEvent ? 0 : (price || 0),
      currency: currency || "AED",
      tags: tags || [],
      images: images || [],
      ...(imageAssets && imageAssets.length > 0 && { imageAssets }),
      dateSchedule: dateSchedule.map((schedule: any) => ({
        ...(schedule._id && { _id: schedule._id }),
        startDate: schedule.startDate,
        endDate: schedule.endDate,
        startTime: schedule.startTime || "",
        endTime: schedule.endTime || "",
        availableSeats: schedule.unlimitedSeats
          ? 999999
          : schedule.availableSeats || 0,
        totalSeats: schedule.unlimitedSeats
          ? 999999
          : schedule.totalSeats || schedule.availableSeats || 0,
        price: isFreeEvent ? 0 : (schedule.price || price || 0),
        unlimitedSeats: schedule.unlimitedSeats || false,
        isOverride: schedule.isOverride || false,
      })),
      seoMeta: seoMeta || undefined,
      faqs: faqs || undefined,
      isAffiliateEvent: isAffiliateEvent || false,
      externalBookingLink: isAffiliateEvent ? externalBookingLink : "",
      ...(meetingLink && { meetingLink }),
      ...(competitionFormat && { competitionFormat }),
      ...(teamSize && { teamSize }),
      ...(skillLevel && { skillLevel }),
      ...(prerequisites && { prerequisites }),
      ...(facilities && facilities.length > 0 && { facilities }),
      ...(amenities && amenities.length > 0 && { amenities }),
      ...(requirePhoneVerification !== undefined && {
        requirePhoneVerification,
      }),
      isApproved: false, // Vendor events need admin approval
      isFeatured: false,
      isDeleted: false,
      isActive: true,
      status: "draft", // Start as draft
      viewsCount: 0,
    });

    res.status(201).json({
      success: true,
      message: "Event created successfully. Waiting for admin approval.",
      data: { event },
    });
  },
);

// @desc    Update vendor's own event
// @route   PUT /api/vendors/events/:id
// @access  Private (Vendor only)
export const updateVendorEvent = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.user?._id || req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return next(new AppError("User ID not found", 401));
    }

    // Get vendor profile to get Vendor._id
    const vendorProfile = await getOrCreateVendorProfile(userId);
    const vendorId = vendorProfile._id;

    // Find event and verify ownership
    const event = await Event.findOne({ _id: id, vendorId });

    if (!event) {
      return next(
        new AppError(
          "Event not found or you do not have permission to edit this event",
          404,
        ),
      );
    }

    const {
      title,
      description,
      shortDescription,
      category,
      type,
      venueType,
      ageRange,
      location,
      price,
      currency,
      tags,
      images,
      imageAssets,
      dateSchedule,
      seoMeta,
      faqs,
      status,
      externalBookingLink,
      isAffiliateEvent,
      isFreeEvent,
      meetingLink,
      competitionFormat,
      teamSize,
      skillLevel,
      prerequisites,
      facilities,
      amenities,
      requirePhoneVerification,
    } = req.body;

    // Update basic fields
    if (title) event.title = title;
    if (description) event.description = description;
    if (shortDescription) event.shortDescription = shortDescription;

    if (category) {
      // Validate category exists (accepts slug or display name)
      const categoryDoc = await Category.findOne({
        $or: [{ slug: category }, { name: category }],
        isActive: true,
      });
      if (!categoryDoc) {
        return next(new AppError("Invalid category", 400));
      }
      event.category = category;
    }

    if (type) event.type = type;
    if (venueType) event.venueType = venueType;
    if (ageRange) event.ageRange = ageRange;

    if (location) {
      event.location = {
        city: location.city || event.location.city,
        address: location.address || event.location.address,
        ...(location.country !== undefined && { country: location.country }),
        ...(location.state !== undefined && { state: location.state }),
        ...(location.zipCode !== undefined && { zipCode: location.zipCode }),
        coordinates: {
          lat: location.coordinates?.lat ?? event.location.coordinates.lat,
          lng: location.coordinates?.lng ?? event.location.coordinates.lng,
        },
      };
    }

    if (isFreeEvent !== undefined) (event as any).isFreeEvent = isFreeEvent;
    if (price !== undefined) event.price = isFreeEvent ? 0 : price;
    if (currency) event.currency = currency;
    if (tags) event.tags = tags;

    // Handle images (legacy string array)
    if (images) event.images = images;

    // Handle imageAssets (new media asset IDs)
    if (imageAssets !== undefined) {
      event.imageAssets = imageAssets;
    }

    if (dateSchedule) {
      event.dateSchedule = dateSchedule.map((schedule: any) => ({
        ...(schedule._id && { _id: schedule._id }),
        startDate: schedule.startDate,
        endDate: schedule.endDate,
        startTime: schedule.startTime || "",
        endTime: schedule.endTime || "",
        availableSeats: schedule.unlimitedSeats
          ? 999999
          : schedule.availableSeats || 0,
        totalSeats: schedule.unlimitedSeats
          ? 999999
          : schedule.totalSeats || schedule.availableSeats || 0,
        price: (isFreeEvent ?? (event as any).isFreeEvent) ? 0 : (schedule.price || event.price || 0),
        unlimitedSeats: schedule.unlimitedSeats || false,
        isOverride: schedule.isOverride || false,
      }));
    }

    if (seoMeta) event.seoMeta = seoMeta;
    if (faqs) event.faqs = faqs;
    const VENDOR_ALLOWED_STATUSES = ["draft", "pending_review", "cancelled"];
    if (status) {
      if (!VENDOR_ALLOWED_STATUSES.includes(status)) {
        return res.status(403).json({
          success: false,
          message: `Vendors can only set status to: ${VENDOR_ALLOWED_STATUSES.join(", ")}`,
        });
      }
      event.status = status;
    }

    // Booking configuration - always update these together
    if (isAffiliateEvent !== undefined) {
      event.isAffiliateEvent = isAffiliateEvent;
    }
    // Always update externalBookingLink (can be empty string to clear it)
    if (externalBookingLink !== undefined) {
      event.externalBookingLink = externalBookingLink;
    }

    // Optional fields
    if (meetingLink !== undefined) event.meetingLink = meetingLink;
    if (competitionFormat !== undefined)
      event.competitionFormat = competitionFormat;
    if (teamSize !== undefined) event.teamSize = teamSize;
    if (skillLevel !== undefined) event.skillLevel = skillLevel;
    if (prerequisites !== undefined) event.prerequisites = prerequisites;
    if (facilities !== undefined) (event as any).facilities = facilities;
    if (amenities !== undefined) (event as any).amenities = amenities;
    if (requirePhoneVerification !== undefined)
      event.requirePhoneVerification = requirePhoneVerification;

    await event.save();

    res.status(200).json({
      success: true,
      message: "Event updated successfully",
      data: { event },
    });
  },
);

// @desc    Delete vendor's own event (soft or permanent)
// @route   DELETE /api/vendors/events/:id
// @access  Private (Vendor only)
export const deleteVendorEvent = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.user?._id || req.user?.id;
    const { id } = req.params;
    const { permanent } = req.query;

    if (!userId) {
      return next(new AppError("User ID not found", 401));
    }

    // Get vendor profile to get Vendor._id
    const vendorProfile = await getOrCreateVendorProfile(userId);
    const vendorId = vendorProfile._id;

    // Find event and verify ownership
    const event = await Event.findOne({ _id: id, vendorId });

    if (!event) {
      return next(
        new AppError(
          "Event not found or you do not have permission to delete this event",
          404,
        ),
      );
    }

    if (permanent === "true") {
      // Permanent delete
      await Event.findByIdAndDelete(id);

      res.status(200).json({
        success: true,
        message: "Event permanently deleted",
      });
    } else {
      // Soft delete
      event.isDeleted = true;
      event.status = "archived";
      await event.save();

      res.status(200).json({
        success: true,
        message: "Event deleted successfully",
        data: { event },
      });
    }
  },
);

// @desc    Restore deleted event
// @route   PUT /api/vendors/events/:id/restore
// @access  Private (Vendor only)
export const restoreVendorEvent = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.user?._id || req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return next(new AppError("User ID not found", 401));
    }

    // Get vendor profile to get Vendor._id
    const vendorProfile = await getOrCreateVendorProfile(userId);
    const vendorId = vendorProfile._id;

    // Find event and verify ownership
    const event = await Event.findOne({ _id: id, vendorId, isDeleted: true });

    if (!event) {
      return next(new AppError("Event not found or already restored", 404));
    }

    event.isDeleted = false;
    event.status = "draft";
    await event.save();

    res.status(200).json({
      success: true,
      message: "Event restored successfully",
      data: { event },
    });
  },
);
