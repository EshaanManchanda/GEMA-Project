import { body } from "express-validator";
import mongoose from "mongoose";

/**
 * Validator for User bulk import
 * Security: sanitizes sensitive fields, validates roles
 */
export const validateUserImport = [
  // Validate data array
  body("data")
    .isArray({ min: 1, max: 10000 })
    .withMessage("data must be an array with 1-10000 items"),

  // Required fields
  body("data.*.firstName")
    .notEmpty()
    .withMessage("First name is required")
    .isString()
    .trim()
    .isLength({ max: 50 })
    .withMessage("First name cannot exceed 50 characters"),

  body("data.*.lastName")
    .notEmpty()
    .withMessage("Last name is required")
    .isString()
    .trim()
    .isLength({ max: 50 })
    .withMessage("Last name cannot exceed 50 characters"),

  body("data.*.email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Must be a valid email address")
    .normalizeEmail()
    .toLowerCase(),

  // Role validation
  body("data.*.role")
    .optional()
    .isIn(["admin", "customer", "vendor", "employee", "teacher"])
    .withMessage("role must be: admin, customer, vendor, employee, or teacher")
    .custom((value, { req }) => {
      // Only allow creating 'admin' role from admin users
      // This will be enforced in the controller layer
      return true;
    }),

  // Status validation
  body("data.*.status")
    .optional()
    .isIn(["active", "inactive", "suspended", "pending"])
    .withMessage("status must be: active, inactive, suspended, or pending"),

  // Phone validation
  body("data.*.phone")
    .optional()
    .isString()
    .trim()
    .matches(/^(\+[1-9]\d{7,14}|[0-9]{8,15})$/)
    .withMessage("phone must be 8-15 digits, optionally with + prefix"),

  // Gender validation
  body("data.*.gender")
    .optional()
    .isIn(["male", "female", "other", "prefer_not_to_say"])
    .withMessage("gender must be: male, female, other, or prefer_not_to_say"),

  // Date of birth
  body("data.*.dateOfBirth")
    .optional()
    .isISO8601()
    .toDate()
    .withMessage("dateOfBirth must be a valid date"),

  // Email verification
  body("data.*.isEmailVerified")
    .optional()
    .isBoolean()
    .withMessage("isEmailVerified must be a boolean"),

  body("data.*.isPhoneVerified")
    .optional()
    .isBoolean()
    .withMessage("isPhoneVerified must be a boolean"),

  // Addresses array
  body("data.*.addresses")
    .optional()
    .isArray()
    .withMessage("addresses must be an array"),

  body("data.*.addresses.*.street")
    .optional()
    .isString()
    .trim()
    .withMessage("address street is required"),

  body("data.*.addresses.*.city")
    .optional()
    .isString()
    .trim()
    .withMessage("address city is required"),

  body("data.*.addresses.*.state").optional().isString().trim(),

  body("data.*.addresses.*.zipCode").optional().isString().trim(),

  body("data.*.addresses.*.country")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 2, max: 2 })
    .withMessage("country must be a 2-letter ISO code"),

  // Preferences
  body("data.*.preferences.language")
    .optional()
    .isString()
    .isLength({ min: 2, max: 5 })
    .withMessage("language must be a valid language code"),

  body("data.*.preferences.currency")
    .optional()
    .isIn(["AED", "USD", "EUR", "GBP", "EGP", "CAD"])
    .withMessage("currency must be: AED, USD, EUR, GBP, EGP, or CAD"),

  body("data.*.preferences.timezone")
    .optional()
    .isString()
    .withMessage("timezone must be a valid IANA timezone string"),

  // _id for updates (upsert mode)
  body("data.*._id")
    .optional()
    .custom((value) => {
      if (value && !mongoose.Types.ObjectId.isValid(value)) {
        throw new Error("_id must be a valid MongoDB ObjectId");
      }
      return true;
    }),

  // Security: Reject sensitive fields in import
  body("data.*.passwordHash").custom((value) => {
    if (value !== undefined) {
      throw new Error(
        "passwordHash cannot be set directly. Use plaintext password field instead.",
      );
    }
    return true;
  }),

  body("data.*.twoFactorAuth").custom((value) => {
    if (value !== undefined) {
      throw new Error("twoFactorAuth cannot be set via import");
    }
    return true;
  }),

  body("data.*.loginAttempts").custom((value) => {
    if (value !== undefined) {
      throw new Error("loginAttempts cannot be set via import");
    }
    return true;
  }),

  // Optional plaintext password (will be hashed by pre-save hook)
  body("data.*.password")
    .optional()
    .isString()
    .isLength({ min: 8 })
    .withMessage("password must be at least 8 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "password must contain at least one uppercase letter, one lowercase letter, and one number",
    ),
];

/**
 * Validator for User bulk export filters
 */
export const validateUserExportFilters = [
  body("filters.role")
    .optional()
    .isIn(["admin", "customer", "vendor", "employee", "teacher"])
    .withMessage("role must be: admin, customer, vendor, employee, or teacher"),

  body("filters.status")
    .optional()
    .isIn(["active", "inactive", "suspended", "pending"])
    .withMessage("status must be: active, inactive, suspended, or pending"),

  body("filters.isEmailVerified")
    .optional()
    .isBoolean()
    .withMessage("isEmailVerified must be a boolean"),

  body("filters.isPhoneVerified")
    .optional()
    .isBoolean()
    .withMessage("isPhoneVerified must be a boolean"),

  body("filters.dateRange.field")
    .optional()
    .isIn(["createdAt", "updatedAt", "lastLogin"])
    .withMessage("dateRange.field must be: createdAt, updatedAt, or lastLogin"),

  body("filters.dateRange.start")
    .optional()
    .isISO8601()
    .withMessage("dateRange.start must be a valid ISO 8601 date"),

  body("filters.dateRange.end")
    .optional()
    .isISO8601()
    .withMessage("dateRange.end must be a valid ISO 8601 date"),

  body("filters.limit")
    .optional()
    .isInt({ min: 1, max: 50000 })
    .withMessage("limit must be between 1 and 50000"),

  body("includeRelationships")
    .optional()
    .isBoolean()
    .withMessage("includeRelationships must be a boolean"),

  body("format").optional().isIn(["json"]).withMessage("format must be json"),
];
