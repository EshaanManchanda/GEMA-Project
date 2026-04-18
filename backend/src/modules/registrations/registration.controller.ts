import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import Registration, {
  RegistrationStatus,
  PaymentStatus as RegPaymentStatus,
} from "./registration.model";
import { AppError } from "../../middleware/index";
import { AuthRequest } from "../../types/index";
import { PaymentService } from "../../modules/payments/payment.service";
import { logger } from "../../config/index";
import cloudinary from "../../config/cloudinary";
import { getFileInfo } from "../../middleware/upload";

const Event = () => {
  const mongoose = require("mongoose");
  return mongoose.model("Event");
};

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

    const event = await Event().findOne({
      _id: eventId,
      isApproved: true,
      isDeleted: false,
    });

    if (!event) {
      return next(new AppError("Event not found or not available", 404));
    }

    if (!event.registrationConfig?.enabled) {
      return next(
        new AppError("Registration is not enabled for this event", 400),
      );
    }

    if (event.registrationConfig.registrationDeadline) {
      const now = new Date();
      if (now > event.registrationConfig.registrationDeadline) {
        return next(new AppError("Registration deadline has passed", 400));
      }
    }

    if (event.registrationConfig.maxRegistrations) {
      const currentCount = await Registration.countByEvent(
        eventId,
        RegistrationStatus.APPROVED,
      );
      if (currentCount >= event.registrationConfig.maxRegistrations) {
        return next(
          new AppError("Maximum number of registrations reached", 400),
        );
      }
    }

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

    let parsedRegistrationData;
    try {
      parsedRegistrationData =
        typeof registrationData === "string"
          ? JSON.parse(registrationData)
          : registrationData;
    } catch (error) {
      return next(new AppError("Invalid registration data format", 400));
    }

    const amount = event.price || 0;

    let initialStatus: RegistrationStatus;
    if (saveAsDraft) {
      initialStatus = RegistrationStatus.DRAFT;
    } else if (event.registrationConfig.requiresApproval) {
      initialStatus = RegistrationStatus.UNDER_REVIEW;
    } else if (amount === 0) {
      initialStatus = RegistrationStatus.APPROVED;
    } else {
      initialStatus = RegistrationStatus.SUBMITTED;
    }

    const registration = new Registration({
      eventId,
      userId,
      registrationData: parsedRegistrationData,
      files,
      payment: {
        status:
          amount > 0
            ? RegPaymentStatus.PENDING
            : RegPaymentStatus.PAID,
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

    const paymentIntent =
      await PaymentService.getPaymentIntent(paymentIntentId);
    if (paymentIntent.status !== "succeeded") {
      return next(new AppError("Payment not confirmed", 400));
    }

    registration.payment.status = RegPaymentStatus.PAID;
    registration.payment.paidAt = new Date();

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

    const event = await Event().findById(eventId);
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

    if (search) {
      filter.$text = { $search: search as string };
    }

    const registrations = await Registration.find(filter)
      .populate("userId", "firstName lastName email phone")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Registration.countDocuments(filter);

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

    if (registrationData) {
      registration.registrationData = registrationData;
    }

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

    registration.status = RegistrationStatus.WITHDRAWN;

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

    res.redirect(file.url);
  } catch (error) {
    logger.error("Error downloading file:", error);
    return next(new AppError("Failed to download file", 500));
  }
};
