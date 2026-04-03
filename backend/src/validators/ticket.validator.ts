import { body } from "express-validator";
import { validateMongoId } from "./common.validator";

const TICKET_TYPES = ["standard", "vip", "premium"];
const TICKET_RESEND_METHODS = ["email", "sms"];
const CURRENCIES = ["AED", "USD", "EGP"];

/**
 * Create ticket validation
 */
export const validateCreateTicket = [
  validateMongoId("eventId", "body"),
  validateMongoId("userId", "body"),
  body("ticketType")
    .isIn(TICKET_TYPES)
    .withMessage(`ticketType must be one of: ${TICKET_TYPES.join(", ")}`),
  body("quantity")
    .isInt({ min: 1, max: 20 })
    .withMessage("quantity must be between 1 and 20"),
  body("price")
    .isFloat({ min: 0 })
    .withMessage("price must be 0 or greater"),
  body("currency")
    .isIn(CURRENCIES)
    .withMessage(`currency must be one of: ${CURRENCIES.join(", ")}`),
  body("eventDate")
    .isISO8601()
    .withMessage("eventDate must be a valid ISO 8601 date"),
];

/**
 * Update ticket validation (all optional)
 */
export const validateUpdateTicket = [
  validateMongoId("id", "param"),
  body("ticketType")
    .optional()
    .isIn(TICKET_TYPES)
    .withMessage(`ticketType must be one of: ${TICKET_TYPES.join(", ")}`),
  body("quantity")
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage("quantity must be between 1 and 20"),
  body("price")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("price must be 0 or greater"),
  body("currency")
    .optional()
    .isIn(CURRENCIES)
    .withMessage(`currency must be one of: ${CURRENCIES.join(", ")}`),
  body("eventDate")
    .optional()
    .isISO8601()
    .withMessage("eventDate must be a valid ISO 8601 date"),
];

/**
 * Transfer ticket validation
 */
export const validateTransferTicket = [
  validateMongoId("id", "param"),
  validateMongoId("newUserId", "body"),
];

/**
 * Resend ticket validation
 */
export const validateResendTicket = [
  validateMongoId("id", "param"),
  body("method")
    .isIn(TICKET_RESEND_METHODS)
    .withMessage(`method must be one of: ${TICKET_RESEND_METHODS.join(", ")}`),
];
