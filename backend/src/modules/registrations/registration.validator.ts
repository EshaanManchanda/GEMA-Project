import { body, query, param } from "express-validator";

export const REGISTRATION_STATUSES = [
  "draft",
  "submitted",
  "under_review",
  "approved",
  "rejected",
  "withdrawn",
];
export const PAYMENT_STATUSES = ["pending", "paid", "failed", "refunded"];
export const REVIEW_STATUSES = ["approved", "rejected"];
export const FIELD_TYPES = [
  "text",
  "email",
  "number",
  "tel",
  "textarea",
  "dropdown",
  "checkbox",
  "radio",
  "file",
  "date",
  "address",
  "website",
  "datetime",
  "time",
  "country",
  "city",
  "html",
  "pagebreak",
];

const validatePagination = [
  query("page").optional().isInt({ min: 1 }).withMessage("Page must be a positive integer").toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("Limit must be between 1 and 100").toInt(),
];

const validateSort = (allowedFields: string[]) => [
  query("sortBy").optional().isIn(allowedFields).withMessage(`Sort by must be one of: ${allowedFields.join(", ")}`),
  query("sortOrder").optional().isIn(["asc", "desc"]).withMessage("Sort order must be asc or desc"),
];

export const validateSubmitRegistration = [
  param("eventId")
    .notEmpty()
    .withMessage("Event ID is required")
    .isMongoId()
    .withMessage("Invalid event ID"),

  body("registrationData").custom((value) => {
    if (typeof value === "string") {
      try {
        JSON.parse(value);
        return true;
      } catch (error) {
        throw new Error("Invalid registration data format");
      }
    } else if (typeof value === "object" && Array.isArray(value)) {
      return true;
    }
    throw new Error("Registration data must be an array or JSON string");
  }),

  body("saveAsDraft")
    .optional()
    .isBoolean()
    .withMessage("saveAsDraft must be a boolean")
    .toBoolean(),
];

export const validateConfirmPayment = [
  param("id")
    .notEmpty()
    .withMessage("Registration ID is required")
    .isMongoId()
    .withMessage("Invalid registration ID"),

  body("paymentIntentId")
    .notEmpty()
    .withMessage("Payment intent ID is required")
    .isString()
    .withMessage("Payment intent ID must be a string")
    .trim(),
];

export const validateUpdateRegistration = [
  param("id")
    .notEmpty()
    .withMessage("Registration ID is required")
    .isMongoId()
    .withMessage("Invalid registration ID"),

  body("registrationData")
    .optional()
    .isArray()
    .withMessage("Registration data must be an array"),

  body("registrationData.*.fieldId")
    .optional()
    .isString()
    .withMessage("Field ID must be a string")
    .trim(),

  body("registrationData.*.fieldLabel")
    .optional()
    .isString()
    .withMessage("Field label must be a string")
    .trim(),

  body("registrationData.*.fieldType")
    .optional()
    .isIn(FIELD_TYPES)
    .withMessage(`Field type must be one of: ${FIELD_TYPES.join(", ")}`),

  body("registrationData.*.value")
    .optional()
    .custom(() => true),
];

export const validateReviewRegistration = [
  param("id")
    .notEmpty()
    .withMessage("Registration ID is required")
    .isMongoId()
    .withMessage("Invalid registration ID"),

  body("status")
    .notEmpty()
    .withMessage("Review status is required")
    .isIn(REVIEW_STATUSES)
    .withMessage(`Status must be one of: ${REVIEW_STATUSES.join(", ")}`),

  body("remarks")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Remarks cannot exceed 1000 characters")
    .escape(),
];

export const validateWithdrawRegistration = [
  param("id")
    .notEmpty()
    .withMessage("Registration ID is required")
    .isMongoId()
    .withMessage("Invalid registration ID"),

  body("reason")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Reason cannot exceed 500 characters")
    .escape(),
];

export const validateGetRegistrations = [
  ...validatePagination,
  ...validateSort(["createdAt", "updatedAt", "status"]),

  query("status")
    .optional()
    .isIn(REGISTRATION_STATUSES)
    .withMessage(`Status must be one of: ${REGISTRATION_STATUSES.join(", ")}`),

  query("search")
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Search query must be between 1 and 100 characters")
    .escape(),
];

export const validateRegistrationConfig = [
  param("eventId")
    .notEmpty()
    .withMessage("Event ID is required")
    .isMongoId()
    .withMessage("Invalid event ID"),

  body("enabled")
    .optional()
    .isBoolean()
    .withMessage("Enabled must be a boolean")
    .toBoolean(),

  body("fields")
    .optional()
    .isArray({ max: 25 })
    .withMessage("Maximum 25 custom fields allowed"),

  body("fields.*.label")
    .if(body("fields").exists())
    .notEmpty()
    .withMessage("Field label is required")
    .isLength({ min: 1, max: 200 })
    .withMessage("Field label must be between 1 and 200 characters")
    .trim()
    .escape(),

  body("fields.*.type")
    .if(body("fields").exists())
    .notEmpty()
    .withMessage("Field type is required")
    .isIn(FIELD_TYPES)
    .withMessage(`Field type must be one of: ${FIELD_TYPES.join(", ")}`),

  body("maxRegistrations")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Max registrations must be at least 1")
    .toInt(),

  body("registrationDeadline")
    .optional()
    .isISO8601()
    .withMessage("Registration deadline must be a valid ISO 8601 date")
    .toDate()
    .custom((value) => {
      if (new Date(value) < new Date()) {
        throw new Error("Registration deadline cannot be in the past");
      }
      return true;
    }),

  body("requiresApproval")
    .optional()
    .isBoolean()
    .withMessage("Requires approval must be a boolean")
    .toBoolean(),
];

export const validateDuplicateRegistrationConfig = [
  param("eventId")
    .notEmpty()
    .withMessage("Event ID is required")
    .isMongoId()
    .withMessage("Invalid event ID"),

  body("sourceEventId")
    .notEmpty()
    .withMessage("Source event ID is required")
    .isMongoId()
    .withMessage("Invalid source event ID"),
];
