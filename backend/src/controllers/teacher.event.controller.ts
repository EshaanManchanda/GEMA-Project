import { Event, Category } from "../models/index";
import { AppError, catchAsync } from "../middleware/index";
import { AuthRequest } from "../types/index";
import { NextFunction, Response } from "express";
import { getOrCreateTeacherProfile } from "../utils/teacherHelpers";
import { transformEventResponse } from "../utils/event.utils";

const normalizeEventMode = (
  value?: string,
): "Online" | "Offline" | undefined => {
  if (!value) return undefined;

  const normalized = value.toString().trim().toLowerCase();
  if (normalized === "online") return "Online";
  if (
    normalized === "offline" ||
    normalized === "indoor" ||
    normalized === "outdoor"
  ) {
    return "Offline";
  }

  return undefined;
};

// @desc    Get single teaching event by ID (teacher's own)
// @route   GET /api/teachers/events/:id
// @access  Private (Teacher only)
export const getTeacherEventById = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.user?._id || req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return next(new AppError("User ID not found", 401));
    }

    const teacherProfile = await getOrCreateTeacherProfile(userId);
    const teacherId = teacherProfile._id;

    const event = await Event.findOne({
      _id: id,
      teacherId,
      isDeleted: false,
    }).populate("imageAssets", "url thumbnailUrl secureUrl publicId variations");

    if (!event) {
      return next(new AppError("Event not found", 404));
    }

    res.status(200).json({
      success: true,
      message: "Event retrieved successfully",
      data: { teachingEvent: transformEventResponse(event) },
    });
  },
);

// @desc    Create new teaching event
// @route   POST /api/teachers/events
// @access  Private (Teacher only)
export const createTeacherEvent = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return next(new AppError("User ID not found", 401));
    }

    const teacherProfile = await getOrCreateTeacherProfile(userId);
    const teacherId = teacherProfile._id;

    const {
      title,
      description,
      category,
      type,
      eventType,
      venueType,
      location,
      meetingLink,
      meetingPassword,
      timezone,
      ageRange,
      price,
      isFreeEvent,
      currency,
      tags,
      images,
      imageAssets,
      dateSchedule,
      shortDescription,
      seoMeta,
      faqs,
      slug,
      status,
    } = req.body;

    // Validation
    if (!title || !description || !category) {
      return next(
        new AppError("Title, description, and category are required", 400),
      );
    }

    if (!dateSchedule || dateSchedule.length === 0) {
      return next(new AppError("At least one class schedule is required", 400));
    }

    if (!type) {
      return next(new AppError("Teaching event type is required", 400));
    }

    const normalizedEventMode = normalizeEventMode(eventType || venueType);

    if (!normalizedEventMode) {
      return next(
        new AppError("Event type must be Online or Offline", 400),
      );
    }

    if (!location?.city) {
      return next(new AppError("City is required", 400));
    }

    if (normalizedEventMode === "Online" && !meetingLink) {
      return next(
        new AppError("Meeting link is required for online events", 400),
      );
    }

    const categoryDoc = await Category.findOne({
      slug: category,
      isActive: true,
    });

    if (!categoryDoc) {
      return next(new AppError("Invalid category", 400));
    }

    const event = await Event.create({
      teacherId,
      title,
      description,
      shortDescription,
      slug: slug || undefined,
      category,
      type,
      venueType: normalizedEventMode,
      location: {
        city: location.city,
        country: location.country,
        address: location.address,
        coordinates: location.coordinates,
      },
      meetingLink,
      meetingPassword: normalizedEventMode === "Online" ? meetingPassword : undefined,
      timezone: timezone || "Asia/Dubai",
      ageRange: ageRange || [0, 100],
      isFreeEvent: isFreeEvent || false,
      price: isFreeEvent ? 0 : (price || 0),
      currency: currency || "AED",
      tags: tags || [],
      images: images || [],
      imageAssets: imageAssets || [],
      dateSchedule: dateSchedule.map((schedule: any) => {
        const capacity = schedule.unlimitedSeats ? 999999 : (schedule.totalSeats || schedule.availableSeats || 0);
        return {
          startDate: schedule.startDate,
          endDate: schedule.endDate,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          totalSeats: capacity,
          availableSeats: capacity, // Matches capacity on creation
          soldSeats: 0,
          price: isFreeEvent ? 0 : (schedule.price || price || 0),
          unlimitedSeats: schedule.unlimitedSeats || false,
          isOverride: schedule.isOverride || false,
        };
      }),
      syllabus: req.body.syllabus,
      subject: req.body.subject,
      topic: req.body.topic,
      introVideo: req.body.introVideo,
      pastEventMemories: req.body.pastEventMemories,
      seoMeta: seoMeta || undefined,
      faqs: faqs || undefined,
      isApproved: false,
      isDeleted: false,
      isActive: true,
      status: status || "pending",
      viewsCount: 0,
    });

    res.status(201).json({
      success: true,
      message:
        "Teaching event created successfully. Waiting for admin approval.",
      data: { teachingEvent: transformEventResponse(event) },
    });
  },
);

// @desc    Update teacher's own teaching event
// @route   PUT /api/teachers/events/:id
// @access  Private (Teacher only)
export const updateTeacherEvent = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.user?._id || req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return next(new AppError("User ID not found", 401));
    }

    const teacherProfile = await getOrCreateTeacherProfile(userId);
    const teacherId = teacherProfile._id;

    const event = await Event.findOne({ _id: id, teacherId });

    if (!event) {
      return next(
        new AppError("Teaching event not found or access denied", 404),
      );
    }

    const {
      title,
      description,
      category,
      type,
      eventType,
      venueType,
      location,
      meetingLink,
      meetingPassword,
      timezone,
      tags,
      images,
      imageAssets,
      dateSchedule,
      seoMeta,
      faqs,
      status,
      slug: updateSlug,
      syllabus,
      subject,
      topic,
      introVideo,
      ageRange,
      price,
      isFreeEvent,
      currency,
      shortDescription,
      pastEventMemories,
    } = req.body;

    if (title !== undefined) event.title = title;
    if (description !== undefined) event.description = description;
    if (shortDescription !== undefined) event.shortDescription = shortDescription;
    if (updateSlug !== undefined) event.slug = updateSlug;

    if (category) {
      const categoryDoc = await Category.findOne({
        slug: category,
        isActive: true,
      });

      if (!categoryDoc) {
        return next(new AppError("Invalid category", 400));
      }

      event.category = category;
    }

    if (ageRange) event.ageRange = ageRange;
    if (isFreeEvent !== undefined) (event as any).isFreeEvent = isFreeEvent;
    if (price !== undefined) event.price = isFreeEvent ? 0 : price;
    if (currency) event.currency = currency;
    if (images) event.images = images;
    if (imageAssets !== undefined) event.imageAssets = imageAssets;
    if (type) event.type = type;
    const normalizedEventMode = normalizeEventMode(eventType || venueType);
    if (normalizedEventMode) {
      event.venueType = normalizedEventMode;
    }
    if (location) {
      event.location = {
        city: location.city || event.location?.city,
        country: location.country || event.location?.country,
        address: location.address || event.location?.address,
        coordinates: location.coordinates || event.location?.coordinates,
      };
    }
    if (meetingLink !== undefined) event.meetingLink = meetingLink;
    if (meetingPassword !== undefined) event.meetingPassword = event.venueType === 'Online' ? meetingPassword : undefined;
    if (timezone) (event as any).timezone = timezone;

    if (seoMeta) event.seoMeta = seoMeta;
    if (faqs) event.faqs = faqs;
    if (status) event.status = status;
    if (tags !== undefined) event.tags = tags;
    if (dateSchedule !== undefined) {
      event.dateSchedule = dateSchedule.map((schedule: any) => {
        // Find existing schedule to preserve booking counts
        const existingSchedule = event.dateSchedule.find(
          (s: any) => s._id?.toString() === schedule._id?.toString()
        );

        const totalSeats = schedule.unlimitedSeats ? 999999 : (schedule.totalSeats || schedule.availableSeats || 0);
        const soldSeats = existingSchedule?.soldSeats || 0;
        const reservedSeats = existingSchedule?.reservedSeats || 0;

        return {
          _id: schedule._id, // Preserve ID
          startDate: schedule.startDate,
          endDate: schedule.endDate,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          totalSeats,
          soldSeats,
          reservedSeats,
          // Recalculate based on total seats and current bookings
          availableSeats: schedule.unlimitedSeats ? 999999 : Math.max(0, totalSeats - soldSeats),
          price: (isFreeEvent ?? (event as any).isFreeEvent) ? 0 : (schedule.price || price || event.price || 0),
          unlimitedSeats: schedule.unlimitedSeats || false,
          isOverride: schedule.isOverride || false,
        };
      });
    }
    if (syllabus !== undefined) event.syllabus = syllabus;
    if (subject !== undefined) event.subject = subject;
    if (topic !== undefined) event.topic = topic;
    if (introVideo !== undefined) event.introVideo = introVideo;
    if (pastEventMemories !== undefined) event.pastEventMemories = pastEventMemories;

    event.isApproved = false;
    event.status = "pending";

    await event.save();

    res.status(200).json({
      success: true,
      message: "Teaching event updated successfully",
      data: { teachingEvent: transformEventResponse(event) },
    });
  },
);

// @desc    Delete teaching event (soft or permanent)
// @route   DELETE /api/teachers/events/:id
// @access  Private (Teacher only)
export const deleteTeacherEvent = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.user?._id || req.user?.id;
    const { id } = req.params;
    const { permanent } = req.query;

    if (!userId) {
      return next(new AppError("User ID not found", 401));
    }

    const teacherProfile = await getOrCreateTeacherProfile(userId);
    const teacherId = teacherProfile._id;

    const event = await Event.findOne({ _id: id, teacherId });

    if (!event) {
      return next(new AppError("Event not found or access denied", 404));
    }

    if (permanent === "true") {
      await Event.findByIdAndDelete(id);

      res.status(200).json({
        success: true,
        message: "Event permanently deleted",
      });
    } else {
      event.isDeleted = true;
      event.status = "archived";
      await event.save();

      res.status(200).json({
        success: true,
        message: "Event deleted successfully",
        data: { event: transformEventResponse(event) },
      });
    }
  },
);

// @desc    Restore deleted teaching event
// @route   PUT /api/teachers/events/:id/restore
// @access  Private (Teacher only)
export const restoreTeacherEvent = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.user?._id || req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return next(new AppError("User ID not found", 401));
    }

    const teacherProfile = await getOrCreateTeacherProfile(userId);
    const teacherId = teacherProfile._id;

    const event = await Event.findOne({
      _id: id,
      teacherId,
      isDeleted: true,
    });

    if (!event) {
      return next(new AppError("Event not found or already restored", 404));
    }

    event.isDeleted = false;
    event.status = "draft";
    await event.save();

    res.status(200).json({
      success: true,
      message: "Teaching event restored successfully",
      data: { teachingEvent: transformEventResponse(event) },
    });
  },
);
