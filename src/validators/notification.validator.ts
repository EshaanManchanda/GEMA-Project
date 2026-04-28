import { body } from "express-validator";
import { validateMongoId } from "./common.validator";

const NOTIFICATION_TYPES = [
  "booking_confirmed",
  "booking_cancelled",
  "payment_success",
  "payment_failed",
  "event_reminder",
  "event_approved",
  "event_rejected",
  "vendor_application_approved",
  "vendor_application_rejected",
  "review_received",
  "payout_processed",
  "system_maintenance",
  "promotional",
  "welcome",
  "password_reset",
  "email_verification",
];

const PRIORITIES = ["low", "medium", "high", "urgent"];
const CHANNELS = ["in_app", "email", "sms", "push"];

/**
 * Create notification validation
 */
export const validateCreateNotification = [
  body()
    .custom((_value, { req }) => {
      if (!req.body.userId && !req.body.targetAudience) {
        throw new Error("userId or targetAudience is required");
      }
      return true;
    }),
  body("userId")
    .optional()
    .isMongoId()
    .withMessage("userId must be a valid MongoDB ID"),
  body("type")
    .isIn(NOTIFICATION_TYPES)
    .withMessage(`type must be one of: ${NOTIFICATION_TYPES.join(", ")}`),
  body("title")
    .isString()
    .isLength({ min: 1, max: 200 })
    .withMessage("title must be between 1 and 200 characters"),
  body("message")
    .isString()
    .isLength({ min: 1, max: 1000 })
    .withMessage("message must be between 1 and 1000 characters"),
  body("priority")
    .optional()
    .isIn(PRIORITIES)
    .withMessage(`priority must be one of: ${PRIORITIES.join(", ")}`),
  body("channels")
    .optional()
    .isArray()
    .withMessage("channels must be an array"),
  body("channels.*")
    .optional()
    .isIn(CHANNELS)
    .withMessage(`each channel must be one of: ${CHANNELS.join(", ")}`),
];

/**
 * Update notification validation (all optional)
 */
export const validateUpdateNotification = [
  validateMongoId("id", "param"),
  body("type")
    .optional()
    .isIn(NOTIFICATION_TYPES)
    .withMessage(`type must be one of: ${NOTIFICATION_TYPES.join(", ")}`),
  body("title")
    .optional()
    .isString()
    .isLength({ min: 1, max: 200 })
    .withMessage("title must be between 1 and 200 characters"),
  body("message")
    .optional()
    .isString()
    .isLength({ min: 1, max: 1000 })
    .withMessage("message must be between 1 and 1000 characters"),
  body("priority")
    .optional()
    .isIn(PRIORITIES)
    .withMessage(`priority must be one of: ${PRIORITIES.join(", ")}`),
];

/**
 * Bulk notification validation
 */
export const validateBulkNotification = [
  body("userIds")
    .isArray({ min: 1 })
    .withMessage("userIds must be a non-empty array"),
  body("userIds.*")
    .isMongoId()
    .withMessage("each userId must be a valid MongoDB ID"),
  body("type")
    .isIn(NOTIFICATION_TYPES)
    .withMessage(`type must be one of: ${NOTIFICATION_TYPES.join(", ")}`),
  body("title")
    .isString()
    .isLength({ min: 1, max: 200 })
    .withMessage("title must be between 1 and 200 characters"),
  body("message")
    .isString()
    .isLength({ min: 1, max: 1000 })
    .withMessage("message must be between 1 and 1000 characters"),
  body("priority")
    .optional()
    .isIn(PRIORITIES)
    .withMessage(`priority must be one of: ${PRIORITIES.join(", ")}`),
  body("channels")
    .optional()
    .isArray()
    .withMessage("channels must be an array"),
  body("channels.*")
    .optional()
    .isIn(CHANNELS)
    .withMessage(`each channel must be one of: ${CHANNELS.join(", ")}`),
];
