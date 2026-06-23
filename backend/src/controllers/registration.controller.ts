import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import {
  Registration,
  Event,
  User,
  RegistrationStatus,
  RegistrationPaymentStatus,
} from "../models/index";
import { AppError } from "../middleware/index";
import { AuthRequest } from "../types/index";
import { PaymentService } from "../services/payment.service";
import { emailService } from "../services/email.service";
import { logger } from "../config/index";
import { config } from "../config/env";
import cloudinary from "../config/cloudinary";
import { getFileInfo } from "../middleware/upload";
import { downloadFileAsAttachment } from "../utils/emailAttachment.util";

// @desc    Submit event registration with files
// @route   POST /api/events/:eventId/registrations
// @access  Private
export const submitRegistration = async (
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

    const { eventId } = req.params;
    const { registrationData, saveAsDraft = false } = req.body;

    // Validate event exists and has registration enabled
    const event = await Event.findOne({
      _id: eventId,
      isApproved: true,
      isDeleted: false,
    });

    if (!event) {
      return next(new AppError("Event not found or not available", 404));
    }

    if (event.registrationConfig && !event.registrationConfig.enabled) {
      return next(
        new AppError("Registration is not enabled for this event", 400),
      );
    }

    const registrationConfig = event.registrationConfig || {
      enabled: true,
      fields: [],
      requiresApproval: false,
      emailNotifications: {
        toVendor: true,
        toParticipant: true,
      },
    };

    // Check registration deadline
    if (registrationConfig.registrationDeadline) {
      const now = new Date();
      if (now > registrationConfig.registrationDeadline) {
        return next(new AppError("Registration deadline has passed", 400));
      }
    }

    // Check max registrations limit
    if (registrationConfig.maxRegistrations) {
      const currentCount = await Registration.countByEvent(
        eventId,
        RegistrationStatus.APPROVED,
      );
      if (currentCount >= registrationConfig.maxRegistrations) {
        return next(
          new AppError("Maximum number of registrations reached", 400),
        );
      }
    }

    // Check if user already has a registration for this event
    const existingRegistration = await Registration.findOne({
      eventId,
      userId,
      status: {
        $nin: [RegistrationStatus.WITHDRAWN, RegistrationStatus.REJECTED],
      },
    });

    if (existingRegistration) {
      return next(
        new AppError(
          "You already have an active registration for this event",
          400,
        ),
      );
    }

    // Process uploaded files
    const files: any[] = [];
    if (req.files && Array.isArray(req.files)) {
      for (const file of req.files) {
        const fileInfo = getFileInfo(file);
        files.push({
          fieldId: file.fieldname,
          fieldLabel: file.fieldname,
          originalName: file.originalname,
          url: fileInfo.url,
          publicId: "publicId" in fileInfo ? fileInfo.publicId : file.filename,
          size: file.size,
          mimetype: file.mimetype,
          uploadedAt: new Date(),
        });
      }
    }

    // Parse registrationData if it's a string (from FormData)
    let parsedRegistrationData;
    try {
      parsedRegistrationData =
        typeof registrationData === "string"
          ? JSON.parse(registrationData)
          : registrationData;
    } catch (error) {
      return next(new AppError("Invalid registration data format", 400));
    }

    // Calculate payment amount
    const amount = event.price || 0;

    // Determine initial status
    // Free registrations (amount === 0) that don't require approval are auto-approved
    let initialStatus: RegistrationStatus;
    if (saveAsDraft) {
      initialStatus = RegistrationStatus.DRAFT;
    } else if (registrationConfig.requiresApproval) {
      initialStatus = RegistrationStatus.UNDER_REVIEW;
    } else if (amount === 0) {
      initialStatus = RegistrationStatus.APPROVED; // Free + no approval = auto-approve
    } else {
      initialStatus = RegistrationStatus.SUBMITTED; // Paid → awaiting payment confirmation
    }

    // Create registration
    const registration = new Registration({
      eventId,
      userId,
      registrationData: parsedRegistrationData,
      files,
      payment: {
        status:
          amount > 0
            ? RegistrationPaymentStatus.PENDING
            : RegistrationPaymentStatus.PAID,
        amount,
        currency: event.currency || "AED",
      },
      status: initialStatus,
      metadata: {
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
        submittedAt: saveAsDraft ? undefined : new Date(),
        lastModifiedAt: new Date(),
      },
    });

    await registration.save();

    // Create payment intent only for paid registrations
    let paymentSession = null;
    if (amount > 0 && !saveAsDraft) {
      paymentSession = await PaymentService.createPaymentIntent({
        amount,
        currency: event.currency || "AED",
        orderId: registration._id.toString(),
        vendorId: event.vendorId.toString(),
        metadata: {
          registrationId: registration._id.toString(),
          eventId: eventId,
          userId: userId,
          type: "event_registration",
        },
      });

      registration.payment.stripePaymentIntentId =
        paymentSession.paymentIntentId;
      await registration.save();
    }

    // Send registration confirmation email (with event booking attachments)
    try {
      const user = await User.findById(userId).select(
        "firstName lastName email",
      );
      if (user) {
        // Download booking attachments so they can be forwarded to the registrant
        const emailAttachments: Array<{ filename: string; content: Buffer; contentType?: string }> = [];
        const rawAttachments = (event as any).bookingAttachments as Array<{
          url?: string;
          originalName?: string;
          filename?: string;
          mimetype?: string;
          provider?: string;
        }> | undefined;

        if (rawAttachments && rawAttachments.length > 0) {
          for (const att of rawAttachments) {
            if (!att?.url) continue;
            try {
              const filename = att.originalName || att.filename || "attachment";
              let resolved: { filename: string; content: Buffer; contentType?: string } | null = null;

              if (att.provider === "local" || att.url.startsWith("/api/uploads/files/")) {
                // Local storage — read from disk directly
                const { promises: fsPromises } = await import("fs");
                const pathLib = await import("path");
                const relativePath = att.url.replace(/^\/api\/uploads\/files\//, "");
                const filePath = pathLib.join(process.cwd(), config.upload.path, relativePath);
                const content = await fsPromises.readFile(filePath);
                resolved = { filename, content, contentType: att.mimetype };
              } else {
                // Remote URL — use shared helper (validates MIME, size, retries on failure)
                resolved = await downloadFileAsAttachment(att.url, filename);
              }

              if (resolved) emailAttachments.push(resolved);
            } catch (attErr: any) {
              logger.warn("Could not download booking attachment for registration email", {
                url: att.url,
                error: attErr?.message,
              });
            }
          }
        }

        await emailService.sendRegistrationConfirmationEmail({
          to: user.email,
          firstName: user.firstName,
          confirmationNumber: (registration as any).confirmationNumber,
          eventTitle: event.title,
          eventDate: event.dateSchedule?.[0]?.date || new Date(),
          status: initialStatus === RegistrationStatus.APPROVED ? "approved" :
                  initialStatus === RegistrationStatus.UNDER_REVIEW ? "under_review" :
                  "pending",
          requiresPayment: amount > 0,
          amount: amount > 0 ? amount : undefined,
          currency: event.currency || "AED",
          requiresApproval: registrationConfig?.requiresApproval || false,
          meetingLink: event.meetingLink,
          meetingPassword: event.meetingPassword,
          venueType: event.venueType,
          attachments: emailAttachments.length > 0 ? emailAttachments : undefined,
        });
        logger.info("Registration confirmation email sent", {
          registrationId: registration._id,
          email: user.email,
          attachmentCount: emailAttachments.length,
        });
      }
    } catch (emailErr: any) {
      logger.error("Failed to send registration confirmation email:", emailErr);
      // Non-blocking: don't fail the registration if email fails
    }

    logger.info("Registration submitted successfully", {
      registrationId: registration._id,
      eventId,
      userId,
      isDraft: saveAsDraft,
    });

    res.status(201).json({
      success: true,
      message: saveAsDraft
        ? "Registration saved as draft"
        : "Registration submitted successfully",
      data: {
        registration: {
          id: registration._id,
          confirmationNumber: (registration as any).confirmationNumber,
          status: registration.status,
          paymentStatus: registration.payment.status,
        },
        payment: paymentSession
          ? {
              paymentIntentId: paymentSession.paymentIntentId,
              clientSecret: paymentSession.clientSecret,
              amount: registration.payment.amount,
              currency: registration.payment.currency,
            }
          : null,
      },
    });
  } catch (error) {
    logger.error("Error submitting registration:", error);
    return next(new AppError("Failed to submit registration", 500));
  }
};

// @desc    Confirm registration payment
// @route   POST /api/registrations/:id/confirm-payment
// @access  Private
export const confirmRegistrationPayment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const { paymentIntentId } = req.body;
    const userId = req.user?._id || req.user?.id;

    const registration = await Registration.findOne({
      _id: id,
      userId,
    }).populate("eventId", "title registrationConfig");
    if (!registration) {
      return next(new AppError("Registration not found", 404));
    }

    // Verify payment with Stripe
    const paymentIntent =
      await PaymentService.getPaymentIntent(paymentIntentId);
    if (paymentIntent.status !== "succeeded") {
      return next(new AppError("Payment not confirmed", 400));
    }

    // Update registration payment status
    registration.payment.status = RegistrationPaymentStatus.PAID;
    registration.payment.paidAt = new Date();

    // Update status based on approval requirement
    const event = registration.eventId as any;
    if (event.registrationConfig?.requiresApproval) {
      registration.status = RegistrationStatus.UNDER_REVIEW;
    } else {
      registration.status = RegistrationStatus.APPROVED;
    }

    await registration.save();

    logger.info("Registration payment confirmed", {
      registrationId: registration._id,
      paymentIntentId,
    });

    res.status(200).json({
      success: true,
      message: "Payment confirmed successfully",
      data: {
        registration: {
          id: registration._id,
          confirmationNumber: (registration as any).confirmationNumber,
          status: registration.status,
          paymentStatus: registration.payment.status,
        },
      },
    });
  } catch (error) {
    logger.error("Error confirming registration payment:", error);
    return next(new AppError("Failed to confirm payment", 500));
  }
};

// @desc    Get registration by ID
// @route   GET /api/registrations/:id
// @access  Private
export const getRegistrationById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id || req.user?.id;
    const userRole = req.user?.role;

    const registration = await Registration.findById(id)
      .populate("userId", "firstName lastName email phone")
      .populate(
        "eventId",
        "title description price currency registrationConfig vendorId",
      );

    if (!registration) {
      return next(new AppError("Registration not found", 404));
    }

    // Check access permissions
    const event = registration.eventId as any;
    const isOwner = registration.userId._id.toString() === userId;
    const isVendor = event.vendorId.toString() === userId;
    const isAdmin = userRole === "admin";

    if (!isOwner && !isVendor && !isAdmin) {
      return next(
        new AppError(
          "You do not have permission to view this registration",
          403,
        ),
      );
    }

    res.status(200).json({
      success: true,
      data: {
        registration,
      },
    });
  } catch (error) {
    logger.error("Error fetching registration:", error);
    return next(new AppError("Failed to fetch registration", 500));
  }
};

// @desc    Get user's registrations
// @route   GET /api/registrations/user/me
// @access  Private
export const getUserRegistrations = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { page = 1, limit = 10, status } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const filter: any = { userId };
    if (status) filter.status = status;

    const registrations = await Registration.find(filter)
      .populate(
        "eventId",
        "title description price currency images dateSchedule",
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Registration.countDocuments(filter);

    res.status(200).json({
      success: true,
      message: "Registrations retrieved successfully",
      data: {
        registrations,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          total,
          hasNextPage: pageNum < Math.ceil(total / limitNum),
          hasPrevPage: pageNum > 1,
        },
      },
    });
  } catch (error) {
    logger.error("Error fetching user registrations:", error);
    return next(new AppError("Failed to fetch registrations", 500));
  }
};

// @desc    Get event registrations (vendor/admin only)
// @route   GET /api/registrations/event/:eventId
// @access  Private (Vendor/Admin)
export const getEventRegistrations = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { eventId } = req.params;
    const userId = req.user?._id || req.user?.id;
    const userRole = req.user?.role;
    const { page = 1, limit = 20, status, search } = req.query;

    // Verify access
    const event = await Event.findById(eventId);
    if (!event) {
      return next(new AppError("Event not found", 404));
    }

    const isVendor = event.vendorId.toString() === userId;
    const isAdmin = userRole === "admin";

    if (!isVendor && !isAdmin) {
      return next(
        new AppError(
          "You do not have permission to view these registrations",
          403,
        ),
      );
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const filter: any = { eventId };
    if (status) filter.status = status;

    // Add search filter if provided
    if (search) {
      filter.$text = { $search: search as string };
    }

    const registrations = await Registration.find(filter)
      .populate("userId", "firstName lastName email phone")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Registration.countDocuments(filter);

    // Get counts by status
    const statusCounts = await Registration.aggregate([
      { $match: { eventId: event._id } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    res.status(200).json({
      success: true,
      message: "Event registrations retrieved successfully",
      data: {
        registrations,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          total,
        },
        stats: {
          byStatus: statusCounts.reduce(
            (acc, item) => {
              acc[item._id] = item.count;
              return acc;
            },
            {} as Record<string, number>,
          ),
        },
      },
    });
  } catch (error) {
    logger.error("Error fetching event registrations:", error);
    return next(new AppError("Failed to fetch registrations", 500));
  }
};

// @desc    Update registration (draft only)
// @route   PATCH /api/registrations/:id
// @access  Private
export const updateRegistration = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id || req.user?.id;
    const { registrationData } = req.body;

    const registration = await Registration.findOne({ _id: id, userId });
    if (!registration) {
      return next(new AppError("Registration not found", 404));
    }

    if (!registration.canBeModified()) {
      return next(
        new AppError("Only draft registrations can be modified", 400),
      );
    }

    // Update registration data
    if (registrationData) {
      registration.registrationData = registrationData;
    }

    // Process new uploaded files
    if (req.files && Array.isArray(req.files)) {
      for (const file of req.files) {
        const fileInfo = getFileInfo(file);
        registration.files.push({
          fieldId: file.fieldname,
          fieldLabel: file.fieldname,
          originalName: file.originalname,
          url: fileInfo.url,
          publicId: "publicId" in fileInfo ? fileInfo.publicId : file.filename,
          size: file.size,
          mimetype: file.mimetype,
          uploadedAt: new Date(),
        } as any);
      }
    }

    await registration.save();

    logger.info("Registration updated", {
      registrationId: registration._id,
      userId,
    });

    res.status(200).json({
      success: true,
      message: "Registration updated successfully",
      data: {
        registration,
      },
    });
  } catch (error) {
    logger.error("Error updating registration:", error);
    return next(new AppError("Failed to update registration", 500));
  }
};

// @desc    Withdraw registration
// @route   DELETE /api/registrations/:id
// @access  Private
export const withdrawRegistration = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id || req.user?.id;
    const { reason } = req.body;

    const registration = await Registration.findOne({ _id: id, userId });
    if (!registration) {
      return next(new AppError("Registration not found", 404));
    }

    if (!registration.canBeWithdrawn()) {
      return next(new AppError("This registration cannot be withdrawn", 400));
    }

    // Update status
    registration.status = RegistrationStatus.WITHDRAWN;

    // Delete uploaded files from Cloudinary
    for (const file of registration.files) {
      try {
        await cloudinary.uploader.destroy(file.publicId);
      } catch (error) {
        logger.error("Error deleting file from Cloudinary:", error);
      }
    }

    await registration.save();

    logger.info("Registration withdrawn", {
      registrationId: registration._id,
      userId,
      reason,
    });

    res.status(200).json({
      success: true,
      message: "Registration withdrawn successfully",
    });
  } catch (error) {
    logger.error("Error withdrawing registration:", error);
    return next(new AppError("Failed to withdraw registration", 500));
  }
};

// @desc    Review registration (vendor/admin only)
// @route   POST /api/registrations/:id/review
// @access  Private (Vendor/Admin)
export const reviewRegistration = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id || req.user?.id;
    const userRole = req.user?.role;
    const { status, remarks } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return next(new AppError("Invalid review status", 400));
    }

    const registration = await Registration.findById(id).populate("eventId");
    if (!registration) {
      return next(new AppError("Registration not found", 404));
    }

    // Check permissions
    const event = registration.eventId as any;
    const isVendor = event.vendorId.toString() === userId;
    const isAdmin = userRole === "admin";

    if (!isVendor && !isAdmin) {
      return next(
        new AppError(
          "You do not have permission to review this registration",
          403,
        ),
      );
    }

    // Update registration
    registration.status =
      status === "approved"
        ? RegistrationStatus.APPROVED
        : RegistrationStatus.REJECTED;
    registration.vendorReview = {
      reviewedBy: userId as any,
      reviewedAt: new Date(),
      status: status as any,
      remarks,
    };

    await registration.save();

    // Send approval/rejection email
    try {
      const user = await User.findById(registration.userId).select(
        "firstName lastName email",
      );
      if (user) {
        await emailService.sendRegistrationApprovalEmail({
          to: user.email,
          firstName: user.firstName,
          confirmationNumber: (registration as any).confirmationNumber,
          eventTitle: event.title,
          eventDate: event.dateSchedule?.[0]?.date || new Date(),
          status: status as "approved" | "rejected",
          remarks: remarks,
          meetingLink: event.meetingLink,
          meetingPassword: event.meetingPassword,
          venueType: event.venueType,
        });
        logger.info("Registration approval email sent", {
          registrationId: registration._id,
          status,
          email: user.email,
        });
      }
    } catch (emailErr: any) {
      logger.error("Failed to send registration approval email:", emailErr);
      // Non-blocking: don't fail the review if email fails
    }

    logger.info("Registration reviewed", {
      registrationId: registration._id,
      reviewedBy: userId,
      status,
    });

    res.status(200).json({
      success: true,
      message: `Registration ${status} successfully`,
      data: {
        registration,
      },
    });
  } catch (error) {
    logger.error("Error reviewing registration:", error);
    return next(new AppError("Failed to review registration", 500));
  }
};

// @desc    Download registration file
// @route   GET /api/registrations/:id/files/:fileId
// @access  Private
export const downloadRegistrationFile = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id, fileId } = req.params;
    const userId = req.user?._id || req.user?.id;
    const userRole = req.user?.role;

    const registration = await Registration.findById(id).populate("eventId");
    if (!registration) {
      return next(new AppError("Registration not found", 404));
    }

    // Check permissions
    const event = registration.eventId as any;
    const isOwner = registration.userId.toString() === userId;
    const isVendor = event.vendorId.toString() === userId;
    const isAdmin = userRole === "admin";

    if (!isOwner && !isVendor && !isAdmin) {
      return next(
        new AppError("You do not have permission to download this file", 403),
      );
    }

    const file = registration.files.find((f) => f._id?.toString() === fileId);
    if (!file) {
      return next(new AppError("File not found", 404));
    }

    // Redirect to Cloudinary URL
    res.redirect(file.url);
  } catch (error) {
    logger.error("Error downloading file:", error);
    return next(new AppError("Failed to download file", 500));
  }
};

export default {
  submitRegistration,
  confirmRegistrationPayment,
  getRegistrationById,
  getUserRegistrations,
  getEventRegistrations,
  updateRegistration,
  withdrawRegistration,
  reviewRegistration,
  downloadRegistrationFile,
};
