import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import { Event } from "../models/index";
import Vendor from "../models/Vendor";
import Teacher from "../models/Teacher";
import { AppError } from "../middleware/index";
import { AuthRequest } from "../types/index";
import { logger } from "../config/index";
import { v4 as uuidv4 } from "uuid";

/**
 * event.vendorId and event.teacherId are profile _ids (Vendor/Teacher model),
 * NOT the user._id. Must look up the profile by userId before comparing.
 */
async function checkEventOwnership(event: any, userId: any): Promise<boolean> {
  if (!userId) return false;
  const uid = userId.toString();

  if (event.vendorId) {
    const vendor = await Vendor.findOne({ userId: uid }).select("_id").lean();
    if (vendor && event.vendorId.toString() === (vendor as any)._id.toString()) return true;
  }
  if (event.teacherId) {
    const teacher = await Teacher.findOne({ userId: uid }).select("_id").lean();
    if (teacher && event.teacherId.toString() === (teacher as any)._id.toString()) return true;
  }
  return false;
}

// @desc    Create or update event registration configuration
// @route   POST /api/events/:eventId/registration-config
// @access  Private (Vendor/Admin)
export const createOrUpdateRegistrationConfig = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError("Validation failed", 400, errors.array()));
    }

    const { eventId } = req.params;
    const userId = req.user?._id || req.user?.id;
    const userRole = req.user?.role;
    const {
      enabled,
      fields,
      maxRegistrations,
      registrationDeadline,
      requiresApproval,
      emailNotifications,
    } = req.body;

    // Find event and verify ownership
    const event = await Event.findById(eventId);
    if (!event) {
      return next(new AppError("Event not found", 404));
    }

    const isAdmin = userRole === "admin";
    const isOwner = isAdmin ? false : await checkEventOwnership(event, userId);

    if (!isOwner && !isAdmin) {
      return next(
        new AppError("You do not have permission to configure this event", 403),
      );
    }

    // Validate fields
    if (fields && fields.length > 25) {
      return next(new AppError("Maximum 25 custom fields allowed", 400));
    }

    // Ensure each field has a unique ID
    const processedFields = fields?.map((field: any, index: number) => ({
      ...field,
      id: field.id || uuidv4(),
      order: field.order !== undefined ? field.order : index,
    }));

    // Check for duplicate field labels
    const fieldLabels = processedFields?.map((f: any) => f.label.toLowerCase());
    const uniqueLabels = new Set(fieldLabels);
    if (fieldLabels && fieldLabels.length !== uniqueLabels.size) {
      return next(new AppError("Duplicate field labels are not allowed", 400));
    }

    // Update registration configuration
    event.registrationConfig = {
      enabled:
        enabled !== undefined
          ? enabled
          : event.registrationConfig?.enabled || false,
      fields: processedFields || event.registrationConfig?.fields || [],
      maxRegistrations:
        maxRegistrations !== undefined
          ? maxRegistrations
          : event.registrationConfig?.maxRegistrations,
      registrationDeadline:
        registrationDeadline || event.registrationConfig?.registrationDeadline,
      requiresApproval:
        requiresApproval !== undefined
          ? requiresApproval
          : event.registrationConfig?.requiresApproval || false,
      emailNotifications: {
        toVendor:
          emailNotifications?.toVendor !== undefined
            ? emailNotifications.toVendor
            : true,
        toParticipant:
          emailNotifications?.toParticipant !== undefined
            ? emailNotifications.toParticipant
            : true,
        customMessage:
          emailNotifications?.customMessage ||
          event.registrationConfig?.emailNotifications?.customMessage,
      },
    };

    await event.save();

    logger.info("Registration configuration updated", {
      eventId,
      userId,
      fieldsCount: processedFields?.length || 0,
      enabled: event.registrationConfig.enabled,
    });

    res.status(200).json({
      success: true,
      message: "Registration configuration updated successfully",
      data: {
        registrationConfig: event.registrationConfig,
      },
    });
  } catch (error) {
    logger.error("Error updating registration configuration:", error);
    return next(
      new AppError("Failed to update registration configuration", 500),
    );
  }
};

// @desc    Get event registration configuration
// @route   GET /api/events/:eventId/registration-config
// @access  Public (for viewing form), Private for full config
export const getRegistrationConfig = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { eventId } = req.params;

    const event = await Event.findById(eventId).select(
      "title registrationConfig vendorId teacherId",
    );
    if (!event) {
      return next(new AppError("Event not found", 404));
    }

    // Determine if the requester is the vendor/teacher owner or admin
    // event.vendorId refs Vendor profile, event.teacherId refs Teacher profile — NOT User IDs
    const userId = req.user?._id || req.user?.id;
    const userRole = req.user?.role;
    const isAdmin = userRole === "admin";

    let isOwner = false;
    if (userId) {
      if (event.vendorId) {
        const vendor = await Vendor.findOne({ userId }).select("_id").lean();
        if (vendor && vendor._id.toString() === event.vendorId.toString()) {
          isOwner = true;
        }
      }
      if (!isOwner && (event as any).teacherId) {
        const teacher = await Teacher.findOne({ userId }).select("_id").lean();
        if (teacher && teacher._id.toString() === (event as any).teacherId.toString()) {
          isOwner = true;
        }
      }
    }

    // Only block public/non-owner requests when registration is not enabled.
    // Vendor owners and admins must always be able to view/edit the config
    // so the form builder works even before registration is toggled on.
    if (!event.registrationConfig || !event.registrationConfig.enabled) {
      if (!isOwner && !isAdmin) {
        return next(
          new AppError("Registration is not enabled for this event", 404),
        );
      }
    }

    // For events with no config yet, return an empty default so the builder can initialise
    const regConfig = event.registrationConfig || {
      enabled: false,
      fields: [],
      requiresApproval: false,
      emailNotifications: { toVendor: true, toParticipant: true },
    };

    const responseData: any = {
      enabled: regConfig.enabled,
      fields: regConfig.fields,
      maxRegistrations: regConfig.maxRegistrations,
      registrationDeadline: regConfig.registrationDeadline,
      requiresApproval: regConfig.requiresApproval,
    };

    // Add sensitive data only for owner/admin
    if (isOwner || isAdmin) {
      responseData.emailNotifications = regConfig.emailNotifications;
    }

    res.status(200).json({
      success: true,
      data: {
        eventTitle: event.title,
        registrationConfig: responseData,
      },
    });
  } catch (error) {
    logger.error("Error fetching registration configuration:", error);
    return next(
      new AppError("Failed to fetch registration configuration", 500),
    );
  }
};

// @desc    Disable event registration
// @route   DELETE /api/events/:eventId/registration-config
// @access  Private (Vendor/Admin)
export const disableRegistration = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { eventId } = req.params;
    const userId = req.user?._id || req.user?.id;
    const userRole = req.user?.role;

    const event = await Event.findById(eventId);
    if (!event) {
      return next(new AppError("Event not found", 404));
    }

    const isAdmin = userRole === "admin";
    const isOwner = isAdmin ? false : await checkEventOwnership(event, userId);

    if (!isOwner && !isAdmin) {
      return next(
        new AppError("You do not have permission to modify this event", 403),
      );
    }

    if (event.registrationConfig) {
      event.registrationConfig.enabled = false;
      await event.save();

      logger.info("Registration disabled for event", {
        eventId,
        userId,
      });

      res.status(200).json({
        success: true,
        message: "Registration disabled successfully",
      });
    } else {
      res.status(200).json({
        success: true,
        message: "Registration was not enabled",
      });
    }
  } catch (error) {
    logger.error("Error disabling registration:", error);
    return next(new AppError("Failed to disable registration", 500));
  }
};

// @desc    Duplicate registration configuration from another event
// @route   POST /api/events/:eventId/registration-config/duplicate
// @access  Private (Vendor/Admin)
export const duplicateRegistrationConfig = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { eventId } = req.params;
    const { sourceEventId } = req.body;
    const userId = req.user?._id || req.user?.id;
    const userRole = req.user?.role;

    // Find both events
    const [targetEvent, sourceEvent] = await Promise.all([
      Event.findById(eventId),
      Event.findById(sourceEventId),
    ]);

    if (!targetEvent) {
      return next(new AppError("Target event not found", 404));
    }

    if (!sourceEvent) {
      return next(new AppError("Source event not found", 404));
    }

    const isAdmin = userRole === "admin";
    const [isOwnerOfTarget, isOwnerOfSource] = isAdmin
      ? [false, false]
      : await Promise.all([
          checkEventOwnership(targetEvent, userId),
          checkEventOwnership(sourceEvent, userId),
        ]);

    if (!isAdmin && (!isOwnerOfTarget || !isOwnerOfSource)) {
      return next(
        new AppError("You do not have permission to perform this action", 403),
      );
    }

    if (
      !sourceEvent.registrationConfig ||
      !sourceEvent.registrationConfig.enabled
    ) {
      return next(
        new AppError("Source event does not have registration enabled", 400),
      );
    }

    // Copy configuration with new field IDs
    const duplicatedFields = sourceEvent.registrationConfig.fields.map(
      (field: any) => ({
        ...(typeof field.toObject === "function" ? field.toObject() : field),
        id: uuidv4(), // Generate new IDs
      }),
    );

    targetEvent.registrationConfig = {
      enabled: false, // Start disabled so vendor can review
      fields: duplicatedFields,
      maxRegistrations: sourceEvent.registrationConfig.maxRegistrations,
      requiresApproval: sourceEvent.registrationConfig.requiresApproval,
      emailNotifications: {
        ...sourceEvent.registrationConfig.emailNotifications,
      },
    };

    await targetEvent.save();

    logger.info("Registration configuration duplicated", {
      sourceEventId,
      targetEventId: eventId,
      userId,
      fieldsCount: duplicatedFields.length,
    });

    res.status(200).json({
      success: true,
      message:
        "Registration configuration duplicated successfully. Please review and enable.",
      data: {
        registrationConfig: targetEvent.registrationConfig,
      },
    });
  } catch (error) {
    logger.error("Error duplicating registration configuration:", error);
    return next(
      new AppError("Failed to duplicate registration configuration", 500),
    );
  }
};

export default {
  createOrUpdateRegistrationConfig,
  getRegistrationConfig,
  disableRegistration,
  duplicateRegistrationConfig,
};
