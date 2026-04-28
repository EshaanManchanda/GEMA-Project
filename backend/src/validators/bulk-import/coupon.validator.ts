import { body, ValidationChain } from "express-validator";
import mongoose from "mongoose";

/**
 * Validation rules for Coupon bulk import
 *
 * Relationship Resolution:
 * - applicableEvents: Accept eventTitles[] OR eventIds[]
 * - applicableCategories: Accept categorySlugs[] OR categoryIds[]
 * - excludedEvents: Accept excludedEventTitles[] OR excludedEventIds[]
 * - excludedCategories: Accept excludedCategorySlugs[] OR excludedCategoryIds[]
 * - applicableVendors: Accept vendorEmails[] OR vendorIds[]
 * - excludedVendors: Accept excludedVendorEmails[] OR excludedVendorIds[]
 * - createdBy: Accept createdByEmail OR createdById
 *
 * Security:
 * - usage[] array cannot be imported (prevents manipulation of usage history)
 * - usageCount can be imported but will be validated against usageLimit
 */

export const validateCouponImport: ValidationChain[] = [
  // Root array validation
  body("data")
    .isArray({ min: 1, max: 10000 })
    .withMessage("Data must be an array with 1-10000 items"),

  // ========== BASIC FIELDS ==========

  // Code (required, unique)
  body("data.*.code")
    .notEmpty()
    .withMessage("Coupon code is required")
    .isString()
    .withMessage("Code must be a string")
    .trim()
    .toUpperCase()
    .isLength({ min: 3, max: 20 })
    .withMessage("Code must be 3-20 characters")
    .matches(/^[A-Z0-9-_]+$/)
    .withMessage(
      "Code can only contain uppercase letters, numbers, hyphens, and underscores",
    ),

  // Name (required)
  body("data.*.name")
    .notEmpty()
    .withMessage("Coupon name is required")
    .isString()
    .withMessage("Name must be a string")
    .trim()
    .isLength({ max: 100 })
    .withMessage("Name cannot exceed 100 characters"),

  // Description (optional)
  body("data.*.description")
    .optional()
    .isString()
    .withMessage("Description must be a string")
    .trim()
    .isLength({ max: 500 })
    .withMessage("Description cannot exceed 500 characters"),

  // Type (required)
  body("data.*.type")
    .notEmpty()
    .withMessage("Coupon type is required")
    .isIn(["percentage", "fixed_amount", "free_shipping"])
    .withMessage("Type must be: percentage, fixed_amount, or free_shipping"),

  // Value (required)
  body("data.*.value")
    .notEmpty()
    .withMessage("Coupon value is required")
    .isFloat({ min: 0 })
    .withMessage("Value must be a non-negative number"),

  // Validate percentage value range
  body("data.*").custom((value) => {
    if (value.type === "percentage" && (value.value < 0 || value.value > 100)) {
      throw new Error("Percentage value must be between 0 and 100");
    }
    return true;
  }),

  // Currency (required for fixed_amount)
  body("data.*.currency")
    .optional()
    .isIn(["AED", "EGP", "CAD", "USD"])
    .withMessage("Currency must be: AED, EGP, CAD, or USD"),

  // Validate currency required for fixed_amount
  body("data.*").custom((value) => {
    if (value.type === "fixed_amount" && !value.currency) {
      throw new Error("Currency is required for fixed_amount coupons");
    }
    return true;
  }),

  // Minimum amount (optional)
  body("data.*.minimumAmount")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Minimum amount must be non-negative"),

  // Maximum discount (optional)
  body("data.*.maximumDiscount")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Maximum discount must be non-negative"),

  // ========== DATE VALIDATION ==========

  // Valid from (required)
  body("data.*.validFrom")
    .notEmpty()
    .withMessage("Valid from date is required")
    .isISO8601()
    .withMessage("Valid from must be a valid ISO 8601 date")
    .toDate(),

  // Valid until (required)
  body("data.*.validUntil")
    .notEmpty()
    .withMessage("Valid until date is required")
    .isISO8601()
    .withMessage("Valid until must be a valid ISO 8601 date")
    .toDate(),

  // Validate date range
  body("data.*").custom((value) => {
    if (value.validFrom && value.validUntil) {
      const from = new Date(value.validFrom);
      const until = new Date(value.validUntil);
      if (until <= from) {
        throw new Error("Valid until date must be after valid from date");
      }
    }
    return true;
  }),

  // ========== USAGE LIMITS ==========

  // Usage limit (optional)
  body("data.*.usageLimit")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Usage limit must be at least 1"),

  // Usage count (can be imported but validated)
  body("data.*.usageCount")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Usage count must be non-negative"),

  // Validate usageCount <= usageLimit
  body("data.*").custom((value) => {
    if (value.usageLimit !== undefined && value.usageCount !== undefined) {
      if (value.usageCount > value.usageLimit) {
        throw new Error("Usage count cannot exceed usage limit");
      }
    }
    return true;
  }),

  // User usage limit (optional)
  body("data.*.userUsageLimit")
    .optional()
    .isInt({ min: 1 })
    .withMessage("User usage limit must be at least 1"),

  // ========== STATUS FIELDS ==========

  body("data.*.isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean"),

  body("data.*.status")
    .optional()
    .isIn(["active", "inactive", "expired"])
    .withMessage("Status must be: active, inactive, or expired"),

  body("data.*.firstTimeOnly")
    .optional()
    .isBoolean()
    .withMessage("firstTimeOnly must be a boolean"),

  // ========== APPLICABLE EVENTS ==========

  body("data.*.eventTitles")
    .optional()
    .isArray({ max: 100 })
    .withMessage("Event titles must be an array with max 100 items"),

  body("data.*.eventTitles.*")
    .optional()
    .isString()
    .withMessage("Each event title must be a string")
    .trim()
    .notEmpty()
    .withMessage("Event titles cannot be empty"),

  body("data.*.eventIds")
    .optional()
    .isArray({ max: 100 })
    .withMessage("Event IDs must be an array with max 100 items"),

  body("data.*.eventIds.*")
    .optional()
    .custom((value) => {
      if (value && !mongoose.Types.ObjectId.isValid(value)) {
        throw new Error("Each eventId must be a valid MongoDB ObjectId");
      }
      return true;
    }),

  // ========== EXCLUDED EVENTS ==========

  body("data.*.excludedEventTitles")
    .optional()
    .isArray({ max: 100 })
    .withMessage("Excluded event titles must be an array"),

  body("data.*.excludedEventTitles.*")
    .optional()
    .isString()
    .withMessage("Each excluded event title must be a string")
    .trim(),

  body("data.*.excludedEventIds")
    .optional()
    .isArray({ max: 100 })
    .withMessage("Excluded event IDs must be an array"),

  body("data.*.excludedEventIds.*")
    .optional()
    .custom((value) => {
      if (value && !mongoose.Types.ObjectId.isValid(value)) {
        throw new Error(
          "Each excludedEventId must be a valid MongoDB ObjectId",
        );
      }
      return true;
    }),

  // ========== APPLICABLE CATEGORIES ==========

  body("data.*.categorySlugs")
    .optional()
    .isArray({ max: 50 })
    .withMessage("Category slugs must be an array"),

  body("data.*.categorySlugs.*")
    .optional()
    .isString()
    .withMessage("Each category slug must be a string")
    .trim()
    .toLowerCase(),

  body("data.*.categoryIds")
    .optional()
    .isArray({ max: 50 })
    .withMessage("Category IDs must be an array"),

  body("data.*.categoryIds.*")
    .optional()
    .custom((value) => {
      if (value && !mongoose.Types.ObjectId.isValid(value)) {
        throw new Error("Each categoryId must be a valid MongoDB ObjectId");
      }
      return true;
    }),

  // ========== EXCLUDED CATEGORIES ==========

  body("data.*.excludedCategorySlugs")
    .optional()
    .isArray({ max: 50 })
    .withMessage("Excluded category slugs must be an array"),

  body("data.*.excludedCategorySlugs.*")
    .optional()
    .isString()
    .withMessage("Each excluded category slug must be a string")
    .trim()
    .toLowerCase(),

  body("data.*.excludedCategoryIds")
    .optional()
    .isArray({ max: 50 })
    .withMessage("Excluded category IDs must be an array"),

  body("data.*.excludedCategoryIds.*")
    .optional()
    .custom((value) => {
      if (value && !mongoose.Types.ObjectId.isValid(value)) {
        throw new Error(
          "Each excludedCategoryId must be a valid MongoDB ObjectId",
        );
      }
      return true;
    }),

  // ========== APPLICABLE VENDORS ==========

  body("data.*.vendorEmails")
    .optional()
    .isArray({ max: 100 })
    .withMessage("Vendor emails must be an array"),

  body("data.*.vendorEmails.*")
    .optional()
    .isEmail()
    .withMessage("Each vendor email must be valid")
    .normalizeEmail()
    .toLowerCase(),

  body("data.*.vendorIds")
    .optional()
    .isArray({ max: 100 })
    .withMessage("Vendor IDs must be an array"),

  body("data.*.vendorIds.*")
    .optional()
    .custom((value) => {
      if (value && !mongoose.Types.ObjectId.isValid(value)) {
        throw new Error("Each vendorId must be a valid MongoDB ObjectId");
      }
      return true;
    }),

  // ========== EXCLUDED VENDORS ==========

  body("data.*.excludedVendorEmails")
    .optional()
    .isArray({ max: 100 })
    .withMessage("Excluded vendor emails must be an array"),

  body("data.*.excludedVendorEmails.*")
    .optional()
    .isEmail()
    .withMessage("Each excluded vendor email must be valid")
    .normalizeEmail()
    .toLowerCase(),

  body("data.*.excludedVendorIds")
    .optional()
    .isArray({ max: 100 })
    .withMessage("Excluded vendor IDs must be an array"),

  body("data.*.excludedVendorIds.*")
    .optional()
    .custom((value) => {
      if (value && !mongoose.Types.ObjectId.isValid(value)) {
        throw new Error(
          "Each excludedVendorId must be a valid MongoDB ObjectId",
        );
      }
      return true;
    }),

  // ========== EVENT TYPES ==========

  body("data.*.applicableEventTypes")
    .optional()
    .isArray({ max: 10 })
    .withMessage("Applicable event types must be an array"),

  body("data.*.applicableEventTypes.*")
    .optional()
    .isIn([
      "Olympiad",
      "Championship",
      "Competition",
      "Event",
      "Course",
      "Venue",
    ])
    .withMessage("Invalid event type"),

  // ========== PRICE RANGE ==========

  body("data.*.priceRange")
    .optional()
    .isObject()
    .withMessage("Price range must be an object"),

  body("data.*.priceRange.min")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Minimum price must be non-negative"),

  body("data.*.priceRange.max")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Maximum price must be non-negative"),

  // Validate price range min <= max
  body("data.*.priceRange")
    .optional()
    .custom((value) => {
      if (value && value.min !== undefined && value.max !== undefined) {
        if (value.max < value.min) {
          throw new Error("Maximum price must be >= minimum price");
        }
      }
      return true;
    }),

  // ========== CREATED BY ==========

  body("data.*.createdByEmail")
    .optional()
    .isEmail()
    .withMessage("Created by email must be valid")
    .normalizeEmail()
    .toLowerCase(),

  body("data.*.createdById")
    .optional()
    .custom((value) => {
      if (value && !mongoose.Types.ObjectId.isValid(value)) {
        throw new Error("createdById must be a valid MongoDB ObjectId");
      }
      return true;
    }),

  // At least one of createdByEmail or createdById required
  body("data.*").custom((value) => {
    if (!value.createdByEmail && !value.createdById) {
      throw new Error("Either createdByEmail or createdById is required");
    }
    return true;
  }),

  // ========== FORBIDDEN FIELDS (SECURITY) ==========

  body("data.*.usage").custom((value) => {
    if (value !== undefined) {
      throw new Error(
        "usage array cannot be imported (security). Use usageCount instead.",
      );
    }
    return true;
  }),
];

/**
 * Validation rules for Coupon bulk export
 */
export const validateCouponExport: ValidationChain[] = [
  body("filters")
    .optional()
    .isObject()
    .withMessage("Filters must be an object"),

  // Filter by status
  body("filters.status")
    .optional()
    .isIn(["active", "inactive", "expired"])
    .withMessage("Status must be: active, inactive, or expired"),

  body("filters.isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean"),

  // Filter by type
  body("filters.type")
    .optional()
    .isIn(["percentage", "fixed_amount", "free_shipping"])
    .withMessage("Type must be: percentage, fixed_amount, or free_shipping"),

  // Filter by date range
  body("filters.validFromAfter")
    .optional()
    .isISO8601()
    .withMessage("validFromAfter must be a valid ISO 8601 date")
    .toDate(),

  body("filters.validFromBefore")
    .optional()
    .isISO8601()
    .withMessage("validFromBefore must be a valid ISO 8601 date")
    .toDate(),

  body("filters.validUntilAfter")
    .optional()
    .isISO8601()
    .withMessage("validUntilAfter must be a valid ISO 8601 date")
    .toDate(),

  body("filters.validUntilBefore")
    .optional()
    .isISO8601()
    .withMessage("validUntilBefore must be a valid ISO 8601 date")
    .toDate(),

  // Filter by usage
  body("filters.hasUsageLimit")
    .optional()
    .isBoolean()
    .withMessage("hasUsageLimit must be a boolean"),

  body("filters.minUsageCount")
    .optional()
    .isInt({ min: 0 })
    .withMessage("minUsageCount must be non-negative"),

  body("filters.maxUsageCount")
    .optional()
    .isInt({ min: 0 })
    .withMessage("maxUsageCount must be non-negative"),

  // Filter by creator
  body("filters.createdBy")
    .optional()
    .custom((value) => {
      if (value && !mongoose.Types.ObjectId.isValid(value)) {
        throw new Error("createdBy must be a valid MongoDB ObjectId");
      }
      return true;
    }),

  // Search by code or name
  body("filters.search")
    .optional()
    .isString()
    .withMessage("Search must be a string")
    .trim()
    .isLength({ min: 2 })
    .withMessage("Search query must be at least 2 characters"),

  // Export options
  body("includeRelationships")
    .optional()
    .isBoolean()
    .withMessage("includeRelationships must be a boolean"),

  body("includeUsageHistory")
    .optional()
    .isBoolean()
    .withMessage("includeUsageHistory must be a boolean"),

  body("limit")
    .optional()
    .isInt({ min: 1, max: 50000 })
    .withMessage("Limit must be between 1 and 50000"),

  body("offset")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Offset must be non-negative"),

  // Sort options
  body("sortBy")
    .optional()
    .isIn([
      "code",
      "name",
      "createdAt",
      "updatedAt",
      "validFrom",
      "validUntil",
      "usageCount",
    ])
    .withMessage(
      "sortBy must be one of: code, name, createdAt, updatedAt, validFrom, validUntil, usageCount",
    ),

  body("sortOrder")
    .optional()
    .isIn(["asc", "desc"])
    .withMessage("sortOrder must be either asc or desc"),
];
