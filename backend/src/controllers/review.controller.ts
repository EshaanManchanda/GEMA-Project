import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import mongoose from "mongoose";
import crypto from "crypto";
import {
  Review,
  Order,
  Event,
  User,
  Vendor,
  Booking,
  Registration,
  RegistrationStatus,
  RegistrationPaymentStatus,
  ReviewType,
  ReviewStatus,
  FlagReason,
  GoogleReview,
} from "../models/index";
import { AppError } from "../middleware/index";
import { AuthRequest } from "../types/index";
import { certificateService } from "../modules/certificates/services/certificate.service";
import { googlePlacesService } from "../services/googlePlaces.service";
import mediaService from "../services/media.service";
import { config } from "../config/env";
import Student from "../models/Student";
import logger from "../config/logger";

const hasConfirmedEventBooking = async (
  userId: string | mongoose.Types.ObjectId,
  eventId: string,
): Promise<{
  hasBooked: boolean;
  source: "booking" | "order" | "registration" | null;
}> => {
  const [booking, order, registration] = await Promise.all([
    Booking.findOne({
      userId,
      eventId,
      status: "confirmed",
    }).lean(),
    Order.findOne({
      userId,
      status: "confirmed",
      paymentStatus: { $in: ["paid", "free"] },
      "items.eventId": eventId,
    })
      .select("_id")
      .lean(),
    Registration.findOne({
      userId,
      eventId,
      status: {
        $in: [
          RegistrationStatus.SUBMITTED,
          RegistrationStatus.UNDER_REVIEW,
          RegistrationStatus.APPROVED,
        ],
      },
      "payment.status": RegistrationPaymentStatus.PAID,
    })
      .select("_id")
      .lean(),
  ]);

  if (order) return { hasBooked: true, source: "order" };
  if (registration) return { hasBooked: true, source: "registration" };
  if (booking) return { hasBooked: true, source: "booking" };

  return { hasBooked: false, source: null };
};

// @desc    Create new review
// @route   POST /api/reviews
// @access  Private (authenticated users)
export const createReview = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError("Validation failed", 400, errors.array()));
    }

    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      return next(new AppError("User not authenticated", 401));
    }

    const {
      type,
      targetId,
      orderId,
      rating,
      title,
      comment,
      pros,
      cons,
      media,
    } = req.body;

    // Verify the target exists based on type
    let targetExists = false;
    if (type === ReviewType.EVENT || type === ReviewType.TEACHING_EVENT) {
      const event = await Event.findById(targetId);
      targetExists = !!event;
    } else if (type === ReviewType.VENDOR) {
      const vendor = await User.findOne({ _id: targetId, role: "vendor" });
      targetExists = !!vendor;
    } else if (type === ReviewType.TEACHER) {
      const teacher = await User.findOne({ _id: targetId, role: "teacher" });
      targetExists = !!teacher;
    }

    if (!targetExists) {
      return next(new AppError("Target not found", 404));
    }

    // Check if user has already reviewed this item
    const existingReview = await Review.findOne({
      user: userId,
      type,
      ...(type === ReviewType.EVENT && { event: targetId }),
      ...(type === ReviewType.TEACHING_EVENT && { event: targetId }),
      ...(type === ReviewType.VENDOR && { vendor: targetId }),
      ...(type === ReviewType.TEACHER && { teacher: targetId }),
      deletedAt: { $exists: false },
    });

    if (existingReview) {
      return next(
        new AppError(
          "You have already reviewed this item. Thank you for sharing your experience!",
          400,
          {
            code: "ALREADY_REVIEWED",
          },
        ),
      );
    }

    // Check booking for event reviews — no gate for teacher reviews
    if (type === ReviewType.EVENT || type === ReviewType.TEACHING_EVENT) {
      const bookingStatus = await hasConfirmedEventBooking(userId, targetId);
      if (!bookingStatus.hasBooked) {
        return next(
          new AppError(
            "You must have booked this event to write a review",
            403,
            {
              code: "NOT_BOOKED",
            },
          ),
        );
      }
    }
    // TEACHER reviews: no booking gate — any authenticated user can review a teacher

    // Verify purchase if orderId is provided
    let verifiedPurchase = false;
    if (orderId) {
      const order = await Order.findOne({
        _id: orderId,
        userId,
        status: "confirmed",
        paymentStatus: "paid",
      });

      if (order) {
        // Check if the order contains the target item
        const hasTargetItem = order.items.some(
          (item) => item.eventId.toString() === targetId,
        );

        if (hasTargetItem) {
          verifiedPurchase = true;
        }
      }
    }

    const reviewData: any = {
      type,
      user: userId,
      order: orderId,
      rating,
      title,
      comment,
      pros,
      cons,
      media: media || [],
      verified: verifiedPurchase,
      verifiedPurchase,
      source: "web",
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      status: ReviewStatus.APPROVED,
    };

    if (type === ReviewType.EVENT || type === ReviewType.TEACHING_EVENT) {
      reviewData.event = targetId;
    } else if (type === ReviewType.VENDOR) {
      reviewData.vendor = targetId;
    } else if (type === ReviewType.TEACHER) {
      reviewData.teacher = targetId; // Store teacher's User ID
    }

    const review = await Review.create(reviewData);

    // Track reviewed events on user
    if (type === ReviewType.EVENT || type === ReviewType.TEACHING_EVENT) {
      await User.findByIdAndUpdate(userId, {
        $addToSet: { hasReviewedEvents: targetId },
      });
    }

    // Trigger certificate generation after event review
    if (
      (type === ReviewType.EVENT || type === ReviewType.TEACHING_EVENT) &&
      review.event
    ) {
      triggerCertificateForReview(review, userId).catch((err) =>
        logger.error("Certificate trigger failed:", err),
      );
    }

    res.status(201).json({
      success: true,
      message: "Review created successfully",
      data: { review },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get reviews (general or for specific target)
// @route   GET /api/reviews or GET /api/reviews/:type/:id
// @access  Public
export const getReviews = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError("Validation failed", 400, errors.array()));
    }

    const { type: pathType, id: pathId } = req.params;
    const {
      type: queryType,
      targetId,
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
      rating,
      verified,
    } = req.query;

    // Determine if this is a specific target query or general query
    const isSpecificTarget = pathType && pathId;
    const type = isSpecificTarget ? pathType : queryType;
    const id = isSpecificTarget ? pathId : targetId;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build filter query
    const filter: any = {
      status: ReviewStatus.APPROVED,
      deletedAt: { $exists: false },
    };

    // Add type filter if specified
    if (type) {
      if (!Object.values(ReviewType).includes(type as ReviewType)) {
        return next(new AppError("Invalid review type", 400));
      }
      filter.type = type;

      // Add target ID filter if specified
      if (id) {
        if (type === ReviewType.EVENT || type === ReviewType.TEACHING_EVENT) {
          filter.event = id;
        } else if (type === ReviewType.VENDOR) {
          filter.vendor = id;
        } else if (type === ReviewType.TEACHER) {
          filter.teacher = id; // teacher's User ID
        }
      }
    }

    if (rating) {
      filter.rating = parseInt(rating as string);
    }

    if (verified === "true") {
      filter.verified = true;
    }

    // Build sort query
    const sort: any = {};
    sort[sortBy as string] = sortOrder === "asc" ? 1 : -1;

    // Execute query
    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .populate("user", "firstName lastName avatar")
        .populate("event", "title")
        .populate("vendor", "firstName lastName businessName")
        .sort(sort)
        .skip(skip)
        .limit(limitNum),
      Review.countDocuments(filter),
    ]);

    // Get average rating and distribution if querying for specific target
    let ratingStats = null;
    if (isSpecificTarget && id && type) {
      ratingStats = await Review.getAverageRating(
        new mongoose.Types.ObjectId(id as string),
        type as ReviewType,
      );
    }

    const responseData: any = {
      reviews,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalReviews: total,
        hasNextPage: pageNum < Math.ceil(total / limitNum),
        hasPrevPage: pageNum > 1,
        limit: limitNum,
      },
    };

    if (ratingStats) {
      responseData.ratingStats = ratingStats;
    }

    res.status(200).json({
      success: true,
      message: "Reviews retrieved successfully",
      data: responseData,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's reviews
// @route   GET /api/reviews/my-reviews
// @access  Private
export const getUserReviews = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const {
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build sort query
    const sort: any = {};
    sort[sortBy as string] = sortOrder === "asc" ? 1 : -1;

    // Execute query
    const [reviews, total] = await Promise.all([
      Review.find({
        user: userId,
        deletedAt: { $exists: false },
      })
        .populate("event vendor", "title firstName lastName")
        .sort(sort)
        .skip(skip)
        .limit(limitNum),
      Review.countDocuments({
        user: userId,
        deletedAt: { $exists: false },
      }),
    ]);

    res.status(200).json({
      success: true,
      message: "User reviews retrieved successfully",
      data: {
        reviews,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalReviews: total,
          hasNextPage: pageNum < Math.ceil(total / limitNum),
          hasPrevPage: pageNum > 1,
          limit: limitNum,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Check review status for an event
// @route   GET /api/reviews/check-status/:eventId
// @access  Private
export const checkReviewStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { eventId } = req.params;
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return next(new AppError("User not authenticated", 401));
    }

    const bookingStatus = await hasConfirmedEventBooking(userId, eventId);

    // Check if user has already reviewed the event
    const existingReview = await Review.findOne({
      user: userId,
      event: eventId,
      type: ReviewType.EVENT,
      deletedAt: { $exists: false },
    });

    res.status(200).json({
      success: true,
      data: {
        hasBooked: bookingStatus.hasBooked,
        hasReviewed: !!existingReview,
        review: existingReview || null,
        bookingSource: bookingStatus.source,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all reviews for a teacher (type=TEACHER)
// @route   GET /api/reviews/by-teacher/:teacherUserId
// @access  Public
// Dedicated endpoint \u2014 bypasses the generic type-enum validation on GET /reviews
export const getTeacherReviews = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { teacherUserId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const filter = {
      type: ReviewType.TEACHER,
      teacher: teacherUserId,
      status: ReviewStatus.APPROVED,
      deletedAt: { $exists: false },
    };

    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .populate("user", "firstName lastName avatar")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Review.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: {
        reviews,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalReviews: total,
          hasNextPage: pageNum < Math.ceil(total / limitNum),
          hasPrevPage: pageNum > 1,
          limit: limitNum,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/reviews/check-teacher-status/:teacherUserId
// @access  Private
// Business rule (teacher review is INDEPENDENT of event reviews):
//   - Any logged-in user can leave ONE review per teacher (type="teacher")
//   - No event booking gate — teacher review is about the teacher, not a specific event
//   - Event reviews (type="event") remain separate on each event's page
export const checkTeacherReviewStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { teacherUserId } = req.params;
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return next(new AppError("User not authenticated", 401));
    }

    // Check if user has already left a teacher-type review for this teacher
    const existingReview = await Review.findOne({
      user: userId,
      type: ReviewType.TEACHER,
      teacher: teacherUserId,
      deletedAt: { $exists: false },
    }).lean();

    res.status(200).json({
      success: true,
      data: {
        hasBooked: true, // No booking gate for teacher reviews
        hasReviewed: !!existingReview,
        reviewableTarget: teacherUserId, // The teacher's user ID to target
        review: existingReview || null,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @route   PUT /api/reviews/:id
// @access  Private (Author only)
export const updateReview = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError("Validation failed", 400, errors.array()));
    }

    const { id } = req.params;
    const userId = req.user?._id || req.user?.id;

    const review = await Review.findOne({
      _id: id,
      user: userId,
      deletedAt: { $exists: false },
    });

    if (!review) {
      return next(new AppError("Review not found or unauthorized", 404));
    }

    if (!review.canEdit) {
      return next(new AppError("Review can no longer be edited", 400));
    }

    const { rating, title, comment, pros, cons, media } = req.body;

    review.rating = rating !== undefined ? rating : review.rating;
    review.title = title !== undefined ? title : review.title;
    review.comment = comment !== undefined ? comment : review.comment;
    review.pros = pros !== undefined ? pros : review.pros;
    review.cons = cons !== undefined ? cons : review.cons;
    review.media = media !== undefined ? media : review.media;

    // Reset status to pending if it was previously approved
    if (review.status === ReviewStatus.APPROVED) {
      review.status = ReviewStatus.PENDING;
    }

    await review.save();

    res.status(200).json({
      success: true,
      message: "Review updated successfully",
      data: { review },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete review
// @route   DELETE /api/reviews/:id
// @access  Private (Author only)
export const deleteReview = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id || req.user?.id;

    const review = await Review.findOne({
      _id: id,
      user: userId,
      deletedAt: { $exists: false },
    });

    if (!review) {
      return next(new AppError("Review not found or unauthorized", 404));
    }

    if (!review.canDelete) {
      return next(new AppError("Review can no longer be deleted", 400));
    }

    review.deletedAt = new Date();
    await review.save();

    res.status(200).json({
      success: true,
      message: "Review deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add helpful vote to review
// @route   POST /api/reviews/:id/vote
// @access  Private
export const voteReview = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const { helpful } = req.body;
    const userId = req.user?._id || req.user?.id;

    if (typeof helpful !== "boolean") {
      return next(new AppError("helpful must be a boolean value", 400));
    }

    const review = await Review.findOne({
      _id: id,
      status: ReviewStatus.APPROVED,
      deletedAt: { $exists: false },
    });

    if (!review) {
      return next(new AppError("Review not found", 404));
    }

    if (review.user.toString() === userId) {
      return next(new AppError("You cannot vote on your own review", 400));
    }

    review.addHelpfulVote(userId, helpful);
    await review.save();

    res.status(200).json({
      success: true,
      message: "Vote recorded successfully",
      data: {
        helpful: review.helpful,
        notHelpful: review.notHelpful,
        helpfulPercentage: review.helpfulPercentage,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Flag review
// @route   POST /api/reviews/:id/flag
// @access  Private
export const flagReview = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const { reason, description } = req.body;
    const userId = req.user?._id || req.user?.id;

    if (!Object.values(FlagReason).includes(reason)) {
      return next(new AppError("Invalid flag reason", 400));
    }

    const review = await Review.findOne({
      _id: id,
      status: ReviewStatus.APPROVED,
      deletedAt: { $exists: false },
    });

    if (!review) {
      return next(new AppError("Review not found", 404));
    }

    if (review.user.toString() === userId) {
      return next(new AppError("You cannot flag your own review", 400));
    }

    try {
      review.addFlag(userId, reason, description);
      await review.save();

      res.status(200).json({
        success: true,
        message: "Review flagged successfully",
      });
    } catch (error: any) {
      if (error.message === "User has already flagged this review") {
        return next(new AppError(error.message, 400));
      }
      throw error;
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Add response to review
// @route   POST /api/reviews/:id/respond
// @access  Private (Vendor for their items)
export const respondToReview = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    const userId = req.user?._id || req.user?.id;

    if (!message || message.trim().length === 0) {
      return next(new AppError("Response message is required", 400));
    }

    const review = await Review.findOne({
      _id: id,
      status: ReviewStatus.APPROVED,
      deletedAt: { $exists: false },
    }).populate("event vendor");

    if (!review) {
      return next(new AppError("Review not found", 404));
    }

    // Check if user is authorized to respond
    let isAuthorized = false;
    let isVendor = false;

    if (review.type === ReviewType.EVENT && review.event) {
      const event = await Event.findById(review.event);
      if (event && event.vendorId.toString() === userId) {
        isAuthorized = true;
        isVendor = true;
      }
    } else if (review.type === ReviewType.VENDOR && review.vendor) {
      if (review.vendor._id.toString() === userId) {
        isAuthorized = true;
        isVendor = true;
      }
    }

    if (!isAuthorized) {
      return next(
        new AppError("Not authorized to respond to this review", 403),
      );
    }

    review.addResponse(userId, message.trim(), isVendor);
    await review.save();

    res.status(200).json({
      success: true,
      message: "Response added successfully",
      data: { review },
    });
  } catch (error) {
    next(error);
  }
};

// Admin functions

// @desc    Get pending reviews for moderation
// @route   GET /api/reviews/admin/pending
// @access  Private (Admin only)
export const getPendingReviews = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const {
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      sortOrder = "asc",
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build sort query
    const sort: any = {};
    sort[sortBy as string] = sortOrder === "asc" ? 1 : -1;

    // Execute query
    const [reviews, total] = await Promise.all([
      Review.find({
        status: ReviewStatus.PENDING,
        deletedAt: { $exists: false },
      })
        .populate("user event vendor", "firstName lastName title")
        .sort(sort)
        .skip(skip)
        .limit(limitNum),
      Review.countDocuments({
        status: ReviewStatus.PENDING,
        deletedAt: { $exists: false },
      }),
    ]);

    res.status(200).json({
      success: true,
      message: "Pending reviews retrieved successfully",
      data: {
        reviews,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalReviews: total,
          hasNextPage: pageNum < Math.ceil(total / limitNum),
          hasPrevPage: pageNum > 1,
          limit: limitNum,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Moderate review (approve/reject)
// @route   PUT /api/reviews/admin/:id/moderate
// @access  Private (Admin only)
export const moderateReview = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const moderatorId = req.user?._id || req.user?.id;

    if (!Object.values(ReviewStatus).includes(status)) {
      return next(new AppError("Invalid review status", 400));
    }

    const review = await Review.findById(id);
    if (!review) {
      return next(new AppError("Review not found", 404));
    }

    const wasNotApproved = review.status !== ReviewStatus.APPROVED;
    review.moderate(moderatorId, status, notes);
    await review.save();

    // Trigger certificate for event reviews approved by admin (catches pending link-reviews)
    if (
      status === ReviewStatus.APPROVED &&
      wasNotApproved &&
      (review.type === ReviewType.EVENT ||
        review.type === ReviewType.TEACHING_EVENT) &&
      review.event
    ) {
      triggerCertificateForReview(review, review.user).catch((err) =>
        logger.error("Certificate trigger on moderation failed:", err),
      );
    }

    res.status(200).json({
      success: true,
      message: `Review ${status} successfully`,
      data: { review },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Google Maps reviews for event (DB-backed, no live API call)
// @route   GET /api/reviews/google/:eventId
// @access  Public
export const getGoogleReviews = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { eventId } = req.params;

    const event = await Event.findById(eventId).select("googlePlaceId title");
    if (!event) {
      return next(new AppError("Event not found", 404));
    }

    if (!event.googlePlaceId) {
      return res.status(200).json({
        success: true,
        message: "No Google Place ID configured for this event",
        data: {
          reviews: [],
          averageRating: 0,
          totalRatings: 0,
          hasGooglePlaceId: false,
          source: "db",
          lastSyncedAt: null,
        },
      });
    }

    const stored = await googlePlacesService.getStoredReviews(
      event._id as mongoose.Types.ObjectId,
      { visibleOnly: true },
    );

    res.status(200).json({
      success: true,
      message: "Google reviews retrieved successfully",
      data: stored,
    });
  } catch (error: any) {
    logger.error("Error fetching Google reviews:", error);
    res.status(200).json({
      success: true,
      message: error.message || "Failed to fetch Google reviews",
      data: {
        reviews: [],
        averageRating: 0,
        totalRatings: 0,
        hasGooglePlaceId: true,
        source: "db",
        lastSyncedAt: null,
        error: error.message,
      },
    });
  }
};

// ─── Review Link System ───────────────────────────────────────────────────────

// @route   GET /api/reviews/link/:eventId?email=xxx&firstName=xxx&lastName=xxx&schoolName=xxx
// @access  Public — find/create user, auto-book, return status (no tokens)
export const getReviewLink = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { eventId } = req.params;
    const {
      email,
      firstName: rawFirst,
      lastName: rawLast,
      schoolName,
    } = req.query as {
      email?: string;
      firstName?: string;
      lastName?: string;
      schoolName?: string;
    };

    if (!email) return next(new AppError("email query param required", 400));

    const event = await Event.findById(eventId).select("title");
    if (!event) return next(new AppError("Event not found", 404));

    const emailLower = email.toLowerCase();

    // Find or create user
    let user = await User.findOne({ email: emailLower });
    if (!user) {
      user = await User.create({
        firstName: rawFirst?.trim() || emailLower.split("@")[0],
        lastName: rawLast?.trim() || ".",
        email: emailLower,
        passwordHash: crypto.randomBytes(32).toString("hex"),
        role: "customer",
        isEmailVerified: true,
        status: "active",
        ...(schoolName ? { schoolName: schoolName.trim() } : {}),
      });
    } else if (schoolName && !user.schoolName) {
      user.schoolName = schoolName.trim();
      await user.save();
    }

    // Find or create Student record linked to this user (parentUserId = user)
    let student = await Student.findOne({
      parentUserId: user._id,
      email: emailLower,
    });
    if (!student) {
      student = await Student.create({
        parentUserId: user._id,
        email: emailLower,
        firstName: rawFirst?.trim() || emailLower.split("@")[0],
        lastName: rawLast?.trim() || ".",
        status: "active",
      });
    }

    // Check if already reviewed
    const existing = await Review.findOne({
      user: user._id,
      event: eventId,
      type: ReviewType.EVENT,
      deletedAt: { $exists: false },
    });

    if (existing) {
      return res.status(200).json({
        success: true,
        data: { alreadyReviewed: true, eventTitle: event.title },
      });
    }

    // Auto-create a free approved registration so the booking gate passes if needed
    const hasRegistration = await Registration.findOne({
      userId: user._id,
      eventId,
      status: {
        $in: [
          RegistrationStatus.SUBMITTED,
          RegistrationStatus.UNDER_REVIEW,
          RegistrationStatus.APPROVED,
        ],
      },
    }).lean();

    if (!hasRegistration) {
      await Registration.create({
        eventId,
        userId: user._id,
        registrationData: [],
        files: [],
        payment: {
          status: RegistrationPaymentStatus.PAID,
          amount: 0,
          currency: "AED",
        },
        status: RegistrationStatus.APPROVED,
        metadata: {
          ipAddress: req.ip,
          userAgent: req.headers["user-agent"],
          submittedAt: new Date(),
          lastModifiedAt: new Date(),
        },
      });
    }

    res.status(200).json({
      success: true,
      data: {
        alreadyReviewed: false,
        userId: user._id,
        studentId: student._id,
        eventId,
        eventTitle: event.title,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/reviews/link/:eventId
// @access  Public — submit review via link (no auth required, identified by email)
export const submitReviewViaLink = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError("Validation failed", 400, errors.array()));
    }

    const { eventId } = req.params;
    const { email, rating, title, comment, pros, cons, media } = req.body;

    const event = await Event.findById(eventId).select("title");
    if (!event) return next(new AppError("Event not found", 404));

    const emailLower = email.toLowerCase();
    const user = await User.findOne({ email: emailLower });
    if (!user) {
      return next(
        new AppError("Please open the review link first to register", 400),
      );
    }

    // Look up Student created during getReviewLink (for certificate context)
    const student = await Student.findOne({
      parentUserId: user._id,
      email: emailLower,
    }).lean();

    // Prevent duplicate
    const existing = await Review.findOne({
      user: user._id,
      event: eventId,
      type: ReviewType.EVENT,
      deletedAt: { $exists: false },
    });

    if (existing) {
      return next(
        new AppError("You have already reviewed this event. Thank you!", 400, {
          code: "ALREADY_REVIEWED",
        }),
      );
    }

    const hasDescription = !!(
      comment?.trim() ||
      title?.trim() ||
      pros?.length ||
      cons?.length
    );

    const review = await Review.create({
      type: ReviewType.EVENT,
      user: user._id,
      event: eventId,
      rating,
      title,
      comment,
      pros,
      cons,
      media: media || [],
      verified: false,
      verifiedPurchase: false,
      source: "web",
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      status: hasDescription ? ReviewStatus.PENDING : ReviewStatus.APPROVED,
    });

    await User.findByIdAndUpdate(user._id, {
      $addToSet: { hasReviewedEvents: eventId },
    });

    // Only issue certificate for immediately-approved reviews.
    // PENDING reviews (those with descriptions) get their certificate when admin approves.
    if (review.status === ReviewStatus.APPROVED) {
      triggerCertificateForReview(
        review,
        user._id,
        student?._id?.toString(),
      ).catch((err) => logger.error("Certificate trigger failed:", err));
    }

    res.status(201).json({
      success: true,
      message: "Review submitted successfully",
      data: { review },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Public: upload images/videos to attach to a review-link submission
// @route   POST /api/reviews/link/:eventId/media
// @access  Public (rate-limited, identified by email like the rest of the link flow)
export const uploadReviewMedia = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { eventId } = req.params;
    const { email } = req.body;
    const files = req.files as Express.Multer.File[] | undefined;

    if (!files || files.length === 0) {
      return next(new AppError("No files uploaded", 400));
    }

    const event = await Event.findById(eventId).select("_id");
    if (!event) return next(new AppError("Event not found", 404));

    let uploadedBy: string | undefined;
    if (email) {
      const user = await User.findOne({
        email: String(email).toLowerCase(),
      }).select("_id");
      uploadedBy = user?._id?.toString();
    }

    const media: Array<{
      type: "image" | "video";
      url: string;
      order: number;
    }> = [];
    const failed: Array<{ file: string; error: string }> = [];

    for (const file of files) {
      const isImage = file.mimetype.startsWith("image/");
      const isVideo = file.mimetype.startsWith("video/");

      if (!isImage && !isVideo) {
        failed.push({
          file: file.originalname,
          error: "Only images and videos are allowed",
        });
        continue;
      }

      const maxSize = isImage
        ? config.upload.maxImageSize
        : config.upload.maxVideoSize;
      if (file.size > maxSize) {
        failed.push({
          file: file.originalname,
          error: `File too large. Maximum size is ${(maxSize / 1024 / 1024).toFixed(0)}MB`,
        });
        continue;
      }

      try {
        const asset = await mediaService.uploadMedia(file, {
          category: "misc",
          folder: "reviews",
          uploadedBy,
          tags: ["review-media"],
        });
        media.push({
          type: isImage ? "image" : "video",
          url: asset.url,
          order: media.length,
        });
      } catch (error: any) {
        failed.push({
          file: file.originalname,
          error: error.message || "Upload failed",
        });
      }
    }

    res.status(media.length > 0 ? 201 : 400).json({
      success: media.length > 0,
      message: `${media.length} of ${files.length} file(s) uploaded`,
      data: { media, failed },
    });
  } catch (error) {
    next(error);
  }
};

// ─── Google Reviews Sync Engine ──────────────────────────────────────────────

/** Verify the caller is an admin or owns the given event. Returns null if OK, AppError if not. */
async function assertGoogleReviewAccess(
  req: AuthRequest,
  eventId: string,
): Promise<{ event: InstanceType<typeof Event> } | never> {
  const event = await Event.findById(eventId).select(
    "googlePlaceId vendorId title",
  );
  if (!event) throw new AppError("Event not found", 404);

  const isAdmin = (req.user as any)?.role === "admin";
  if (!isAdmin) {
    const vendor = await Vendor.findOne({
      userId: (req.user as any)?._id,
    }).lean();
    if (
      !vendor ||
      event.vendorId?.toString() !== (vendor._id as any).toString()
    ) {
      throw new AppError("Access denied — you do not own this event", 403);
    }
  }

  return { event: event as any };
}

// @desc    Admin: trigger a Google reviews sync for an event
// @route   POST /api/reviews/google/:eventId/sync
// @access  Admin / event owner vendor
export const syncGoogleReviews = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { eventId } = req.params;
    const { event } = await assertGoogleReviewAccess(req, eventId);

    if (!event.googlePlaceId) {
      return next(
        new AppError(
          "This event has no Google Place ID configured. Add one before syncing.",
          400,
        ),
      );
    }

    const summary = await googlePlacesService.syncPlaceReviews(
      event._id as mongoose.Types.ObjectId,
      event.googlePlaceId,
    );

    res.status(200).json({
      success: true,
      message: `Sync complete — ${summary.totalFetched} reviews fetched`,
      data: summary,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin: get all stored Google reviews for an event (includes hidden)
// @route   GET /api/reviews/google/:eventId/admin
// @access  Admin / event owner vendor
export const getAdminGoogleReviews = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { eventId } = req.params;
    const { event } = await assertGoogleReviewAccess(req, eventId);

    if (!event.googlePlaceId) {
      return res.status(200).json({
        success: true,
        data: {
          reviews: [],
          averageRating: 0,
          totalRatings: 0,
          hasGooglePlaceId: false,
          source: "db",
          lastSyncedAt: null,
          visibleCount: 0,
          hiddenCount: 0,
        },
      });
    }

    const stored = await googlePlacesService.getStoredReviews(
      event._id as mongoose.Types.ObjectId,
      { visibleOnly: false },
    );

    res.status(200).json({ success: true, data: stored });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin: toggle visibility of a stored Google review
// @route   PATCH /api/reviews/google/review/:reviewDocId/visibility
// @access  Admin / event owner vendor
export const toggleGoogleReviewVisibility = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { reviewDocId } = req.params;
    const { isVisible, hiddenReason } = req.body as {
      isVisible: boolean;
      hiddenReason?: string;
    };

    if (typeof isVisible !== "boolean") {
      return next(new AppError("isVisible must be a boolean", 400));
    }

    const doc = await GoogleReview.findById(reviewDocId);
    if (!doc) return next(new AppError("Review not found", 404));

    // Ownership check against the review's event
    await assertGoogleReviewAccess(req, doc.eventId.toString());

    if (isVisible) {
      doc.isVisible = true;
      doc.hiddenReason = undefined;
      doc.hiddenBy = undefined;
      doc.hiddenAt = undefined;
    } else {
      doc.isVisible = false;
      doc.hiddenReason = hiddenReason;
      doc.hiddenBy = (req.user as any)?._id;
      doc.hiddenAt = new Date();
    }

    await doc.save();

    res.status(200).json({
      success: true,
      message: `Review ${isVisible ? "shown" : "hidden"}`,
      data: { _id: doc._id, isVisible: doc.isVisible },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Public: homepage carousel — visible 4-5★ reviews across all events
// @route   GET /api/reviews/google/homepage
// @access  Public
export const getHomepageGoogleReviews = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit ?? "12"), 10), 24);
    const reviews = await googlePlacesService.getHomepageReviews(limit);

    res.status(200).json({
      success: true,
      data: { reviews },
    });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/reviews/admin/link/:eventId/generate
// @access  Admin/Vendor — generates a shareable review link for the event
export const generateReviewLink = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { eventId } = req.params;
    const baseUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const reviewLink = `${baseUrl}/review/${eventId}`;

    await Event.findByIdAndUpdate(eventId, { reviewLink });

    res.status(200).json({ success: true, data: { reviewLink } });
  } catch (error) {
    next(error);
  }
};

// ─── Private helpers ──────────────────────────────────────────────────────────

async function triggerCertificateForReview(
  review: any,
  userId: any,
  studentId?: string,
): Promise<void> {
  const user = await User.findById(userId).select(
    "firstName lastName email schoolName",
  );
  if (!user || !user.email) return;

  await certificateService.issueForEvent({
    eventId: review.event.toString(),
    userId: userId.toString(),
    reviewId: review._id.toString(),
    recipient: {
      name: `${user.firstName} ${user.lastName}`.trim(),
      email: user.email,
    },
    context: studentId ? { studentId } : undefined,
    data: {
      rating: review.rating,
      date: review.createdAt,
      ...(user.schoolName ? { school: user.schoolName } : {}),
    },
    sendEmail: true,
  });
}
