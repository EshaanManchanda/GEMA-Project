import { Event, Category } from "../models/index";
import { AppError, catchAsync } from "../middleware/index";
import { AuthRequest } from "../types/index";
import { NextFunction, Response } from "express";
import { getOrCreateTeacherProfile } from "../utils/teacherHelpers";

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
    }).populate("imageAssets", "url secureUrl publicId");

    if (!event) {
      return next(new AppError("Event not found", 404));
    }

    res.status(200).json({
      success: true,
      message: "Event retrieved successfully",
      data: { teachingEvent: event },
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
      location,
      meetingLink,
      ageRange,
      price,
      isFreeEvent,
      currency,
      tags,
      images,
      imageAssets,
      dateSchedule,
      seoMeta,
      faqs,
      slug,
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

    if (!eventType) {
      return next(
        new AppError(
          "Venue type (Online/Offline/Indoor/Outdoor) is required",
          400,
        ),
      );
    }

    if (!location?.city) {
      return next(new AppError("City is required", 400));
    }

    if (eventType === "Online" && !meetingLink) {
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
      slug: slug || undefined,
      category,
      type,
      venueType: eventType || "Online", // map eventType field to venueType
      location: {
        city: location.city,
        country: location.country,
        address: location.address,
        coordinates: location.coordinates,
      },
      meetingLink,
      ageRange: ageRange || [0, 100],
      isFreeEvent: isFreeEvent || false,
      price: isFreeEvent ? 0 : (price || 0),
      currency: currency || "AED",
      tags: tags || [],
      images: images || [],
      imageAssets: imageAssets || [],
      dateSchedule: dateSchedule.map((schedule: any) => ({
        startDate: schedule.startDate,
        endDate: schedule.endDate,
        availableSeats: schedule.unlimitedSeats
          ? 999999
          : schedule.availableSeats || schedule.maxStudents || 0,
        price: isFreeEvent ? 0 : (schedule.price || price || 0),
        unlimitedSeats: schedule.unlimitedSeats || false,
        isOverride: schedule.isOverride || false,
      })),
      syllabus: req.body.syllabus,
      subject: req.body.subject,
      topic: req.body.topic,
      introVideo: req.body.introVideo,
      seoMeta: seoMeta || undefined,
      faqs: faqs || undefined,
      isApproved: false,
      isDeleted: false,
      isActive: true,
      status: "draft",
      viewsCount: 0,
    });

    res.status(201).json({
      success: true,
      message:
        "Teaching event created successfully. Waiting for admin approval.",
      data: { teachingEvent: event },
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
      location,
      meetingLink,
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
    } = req.body;

    if (title) event.title = title;
    if (description) event.description = description;
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
    if (tags) event.tags = tags;
    if (images) event.images = images;
    if (imageAssets !== undefined) event.imageAssets = imageAssets;
    if (type) event.type = type;
    if (eventType) event.venueType = eventType; // map eventType -> venueType
    if (location) {
      event.location = {
        city: location.city || event.location?.city,
        country: location.country || event.location?.country,
        address: location.address || event.location?.address,
        coordinates: location.coordinates || event.location?.coordinates,
      };
    }
    if (meetingLink !== undefined) event.meetingLink = meetingLink;

    if (dateSchedule) {
      event.dateSchedule = dateSchedule.map((schedule: any) => ({
        startDate: schedule.startDate,
        endDate: schedule.endDate,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        availableSeats: schedule.unlimitedSeats
          ? 999999
          : schedule.availableSeats || schedule.maxStudents || 0,
        price: (isFreeEvent ?? (event as any).isFreeEvent) ? 0 : (schedule.price || event.price || 0),
        unlimitedSeats: schedule.unlimitedSeats || false,
        isOverride: schedule.isOverride || false,
      }));
    }

    if (seoMeta) event.seoMeta = seoMeta;
    if (faqs) event.faqs = faqs;
    if (status) event.status = status;
    if (syllabus) event.syllabus = syllabus;
    if (subject) event.subject = subject;
    if (topic) event.topic = topic;
    if (introVideo) event.introVideo = introVideo;

    await event.save();

    res.status(200).json({
      success: true,
      message: "Teaching event updated successfully",
      data: { teachingEvent: event },
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
        data: { event },
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
      data: { teachingEvent: event },
    });
  },
);
