import { Request, Response, NextFunction } from "express";
import { NotificationTemplate } from "../models/index";
import { AppError } from "../middleware/index";

/**
 * @desc    List all notification templates (WhatsApp/email-marketing), optionally filtered by channel/purpose
 * @route   GET /api/admin/notification-templates
 * @access  Private (admin)
 */
export const listNotificationTemplates = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { channel, purpose } = req.query as Record<string, string>;
    const filter: Record<string, any> = {};
    if (channel) filter.channel = channel;
    if (purpose) filter.purpose = purpose;

    const templates = await NotificationTemplate.find(filter).sort({ key: 1 });
    res.status(200).json({ success: true, data: templates });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get a single notification template
 * @route   GET /api/admin/notification-templates/:id
 * @access  Private (admin)
 */
export const getNotificationTemplate = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const template = await NotificationTemplate.findById(req.params.id);
    if (!template) {
      throw new AppError("Notification template not found", 404);
    }
    res.status(200).json({ success: true, data: template });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new notification template
 * @route   POST /api/admin/notification-templates
 * @access  Private (admin)
 */
export const createNotificationTemplate = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const {
      key,
      channel,
      provider,
      purpose,
      providerTemplateName,
      bodyText,
      languageCode,
      requiredVariables,
      isEnabled,
      isApprovedOnProvider,
    } = req.body;

    if (!key || !channel || !provider || !purpose || !providerTemplateName) {
      throw new AppError(
        "key, channel, provider, purpose, and providerTemplateName are required",
        400,
      );
    }

    const existing = await NotificationTemplate.findOne({
      key,
      channel,
      languageCode: languageCode || "en",
    });
    if (existing) {
      throw new AppError(
        `A ${channel} template for key "${key}" (${languageCode || "en"}) already exists`,
        409,
      );
    }

    const template = await NotificationTemplate.create({
      key,
      channel,
      provider,
      purpose,
      providerTemplateName,
      bodyText: bodyText || "",
      languageCode: languageCode || "en",
      requiredVariables: requiredVariables || [],
      isEnabled: isEnabled !== undefined ? isEnabled : true,
      isApprovedOnProvider: isApprovedOnProvider || false,
    });

    res.status(201).json({ success: true, data: template });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update a notification template — the primary way to fill in the
 *          real Cunnekt templateid (providerTemplateName) and bodyText copy
 *          once a template is created/approved on Cunnekt's dashboard.
 * @route   PATCH /api/admin/notification-templates/:id
 * @access  Private (admin)
 */
export const updateNotificationTemplate = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const allowedFields = [
      "provider",
      "purpose",
      "providerTemplateName",
      "bodyText",
      "requiredVariables",
      "isEnabled",
      "isApprovedOnProvider",
      "lastTestStatus",
    ] as const;

    const updates: Record<string, any> = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      throw new AppError("No updatable fields provided", 400);
    }

    const template = await NotificationTemplate.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true },
    );

    if (!template) {
      throw new AppError("Notification template not found", 404);
    }

    res.status(200).json({ success: true, data: template });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a notification template
 * @route   DELETE /api/admin/notification-templates/:id
 * @access  Private (admin)
 */
export const deleteNotificationTemplate = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const template = await NotificationTemplate.findByIdAndDelete(req.params.id);
    if (!template) {
      throw new AppError("Notification template not found", 404);
    }
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};
