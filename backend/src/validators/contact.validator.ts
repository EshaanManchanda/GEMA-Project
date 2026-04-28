import { body, param, query } from "express-validator";

// Validation rules for submitting contact form
export const submitContactValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Name must be between 2 and 100 characters")
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage(
      "Name can only contain letters, spaces, hyphens, and apostrophes",
    ),

  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),

  body("subject")
    .trim()
    .notEmpty()
    .withMessage("Subject is required")
    .isIn([
      "General Inquiry",
      "Booking Support",
      "Vendor Partnership",
      "Technical Support",
      "Feedback",
      "Other",
    ])
    .withMessage("Invalid subject selection"),

  body("message")
    .trim()
    .notEmpty()
    .withMessage("Message is required")
    .isLength({ min: 10, max: 1000 })
    .withMessage("Message must be between 10 and 1000 characters"),
];

// Validation rules for getting all contacts (admin)
export const getAllContactsValidation = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer")
    .toInt(),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100")
    .toInt(),

  query("status")
    .optional()
    .isIn(["new", "read", "responded"])
    .withMessage("Status must be one of: new, read, responded"),

  query("sortBy")
    .optional()
    .isIn(["createdAt", "name", "email", "subject", "status"])
    .withMessage("Invalid sort field"),

  query("sortOrder")
    .optional()
    .isIn(["asc", "desc"])
    .withMessage("Sort order must be asc or desc"),
];

// Validation rules for getting contact by ID
export const getContactByIdValidation = [
  param("id").isMongoId().withMessage("Invalid contact ID"),
];

// Validation rules for marking as read
export const markAsReadValidation = [
  param("id").isMongoId().withMessage("Invalid contact ID"),
];

// Validation rules for marking as responded
export const markAsRespondedValidation = [
  param("id").isMongoId().withMessage("Invalid contact ID"),

  body("notes")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Notes cannot exceed 500 characters"),
];

// Validation rules for deleting contact
export const deleteContactValidation = [
  param("id").isMongoId().withMessage("Invalid contact ID"),
];
