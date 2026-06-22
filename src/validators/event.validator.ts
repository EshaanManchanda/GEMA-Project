import { body, query } from "express-validator";
import {
  validateMongoId,
  validatePagination,
  validateSort,
  validateDateRange,
  validatePriceRange,
  validateSearch,
  validateEnum,
  validateArray,
  validateStringLength,
  validateNumericRange,
  sanitizeHtml,
  validateHtmlLength,
} from "./common.validator";

/**
 * Event validation rules
 */

// Allowed event types
export const EVENT_TYPES = [
  "Olympiad",
  "Championship",
  "Competition",
  "Event",
  "Course",
  "Venue",
  "Workshop",
  "Class",
  "Bootcamp",
  "Masterclass",
];
export const VENUE_TYPES = ["Indoor", "Outdoor", "Online", "Offline"];
export const EVENT_STATUSES = [
  "draft",
  "published",
  "archived",
  "pending",
  "rejected",
];
export const CURRENCIES = ["AED", "EGP", "CAD", "USD"];

// ISO 3166-1 alpha-2 country codes (subset of major countries, can expand as needed)
export const COUNTRY_CODES = [
  "AE",
  "AF",
  "AL",
  "DZ",
  "AR",
  "AM",
  "AU",
  "AT",
  "AZ",
  "BH",
  "BD",
  "BY",
  "BE",
  "BR",
  "BG",
  "CA",
  "CL",
  "CN",
  "CO",
  "HR",
  "CY",
  "CZ",
  "DK",
  "EG",
  "EE",
  "FI",
  "FR",
  "DE",
  "GR",
  "HK",
  "HU",
  "IS",
  "IN",
  "ID",
  "IR",
  "IQ",
  "IE",
  "IL",
  "IT",
  "JP",
  "JO",
  "KZ",
  "KW",
  "LV",
  "LB",
  "LY",
  "LT",
  "LU",
  "MY",
  "MT",
  "MX",
  "MA",
  "NL",
  "NZ",
  "NO",
  "OM",
  "PK",
  "PS",
  "PE",
  "PH",
  "PL",
  "PT",
  "QA",
  "RO",
  "RU",
  "SA",
  "RS",
  "SG",
  "SK",
  "SI",
  "ZA",
  "KR",
  "ES",
  "LK",
  "SE",
  "CH",
  "SY",
  "TW",
  "TH",
  "TN",
  "TR",
  "UA",
  "GB",
  "US",
  "UY",
  "VE",
  "VN",
  "YE",
]; // 91 major countries - can add more as needed

/**
 * Create event validation
 */
export const validateCreateEvent = [
  validateStringLength("title", 1, 200, true),

  validateHtmlLength("description", 20, 10000, true),

  sanitizeHtml("description"),

  body("shortDescription")
    .optional({ nullable: true })
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Short description cannot exceed 500 characters"),

  body("customCSS")
    .optional()
    .isString()
    .isLength({ max: 50000 })
    .withMessage("Custom CSS cannot exceed 50,000 characters")
    .customSanitizer(async (value) => {
      if (!value) return value;
      const { sanitizeCustomCSS } = await import("../utils/css.utils");
      return sanitizeCustomCSS(value);
    }),

  body("category")
    .trim()
    .notEmpty()
    .withMessage("Category is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Category must be between 2 and 100 characters")
    .escape(),

  validateEnum("type", EVENT_TYPES, true),
  validateEnum("venueType", VENUE_TYPES, true),

  body("ageRange")
    .isArray({ min: 2, max: 2 })
    .withMessage(
      "Age range must be an array with exactly 2 elements [min, max]",
    ),

  body("ageRange.*")
    .isInt({ min: 0, max: 100 })
    .withMessage("Age range values must be between 0 and 100")
    .toInt(),

  body("ageRange").custom((value) => {
    if (value[0] > value[1]) {
      throw new Error("Minimum age cannot be greater than maximum age");
    }
    return true;
  }),

  // Location validation
  body("location.country")
    .optional()
    .trim()
    .isLength({ min: 2, max: 2 })
    .withMessage("Country must be a 2-letter ISO code")
    .isIn(COUNTRY_CODES)
    .withMessage("Invalid country code")
    .toUpperCase(),

  // City is required for non-online events; online events rely on a meeting link instead
  body("location.city")
    .if(body("venueType").not().equals("Online"))
    .trim()
    .notEmpty()
    .withMessage("City is required for non-online events")
    .isLength({ min: 2, max: 100 })
    .withMessage("City must be between 2 and 100 characters")
    .escape(),

  body("location.city")
    .if(body("venueType").equals("Online"))
    .optional()
    .trim()
    .isLength({ min: 0, max: 100 })
    .escape(),

  body("location.address")
    .optional()
    .custom((value, { req }) => {
      // Address is optional for all events
      if (value && value.trim().length > 0) {
        if (value.trim().length < 5) {
          throw new Error("Address must be at least 5 characters if provided");
        }
        if (value.trim().length > 300) {
          throw new Error("Address cannot exceed 300 characters");
        }
      }
      return true;
    })
    .trim(),

  body("location.coordinates.lat")
    .optional()
    .custom((value, { req }) => {
      // Coordinates are optional for all events
      if (value !== undefined && value !== null && value !== "") {
        const lat = parseFloat(value);
        if (isNaN(lat) || lat < -90 || lat > 90) {
          throw new Error("Latitude must be between -90 and 90");
        }
      }
      return true;
    })
    .toFloat(),

  body("location.coordinates.lng")
    .optional()
    .custom((value, { req }) => {
      // Coordinates are optional for all events
      if (value !== undefined && value !== null && value !== "") {
        const lng = parseFloat(value);
        if (isNaN(lng) || lng < -180 || lng > 180) {
          throw new Error("Longitude must be between -180 and 180");
        }
      }
      return true;
    })
    .toFloat(),

  // Price validation
  validateNumericRange("price", 0, undefined, true),
  validateEnum("currency", CURRENCIES, false),

  // Meeting link validation (optional for all events)
  body("meetingLink")
    .optional({ nullable: true, checkFalsy: true })
    .isURL({ protocols: ["http", "https"], require_protocol: true })
    .withMessage("Meeting link must be a valid URL"),

  // Date schedule validation
  body("dateSchedule")
    .isArray({ min: 1 })
    .withMessage("At least one date schedule is required"),

  body("dateSchedule.*.startDate")
    .optional()
    .isISO8601()
    .withMessage("Start date must be a valid ISO 8601 date")
    .toDate()
    .custom((value) => {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      if (new Date(value) < now) {
        throw new Error("Start date cannot be in the past");
      }
      return true;
    }),

  body("dateSchedule.*.endDate")
    .optional()
    .isISO8601()
    .withMessage("End date must be a valid ISO 8601 date")
    .toDate()
    .custom((value, { req, path }) => {
      // Extract the index from the path (e.g., "dateSchedule[0].endDate" -> 0)
      const match = path.match(/\[(\d+)\]/);
      if (match) {
        const index = parseInt(match[1]);
        const startDate = req.body.dateSchedule[index]?.startDate;
        if (startDate && new Date(value) < new Date(startDate)) {
          throw new Error("End date must be after start date");
        }
      }
      return true;
    }),

  body("dateSchedule.*.availableSeats")
    .notEmpty()
    .withMessage("Available seats is required")
    .isInt({ min: 0, max: 999999 })
    .withMessage("Available seats must be between 0 and 999,999")
    .toInt(),

  body("dateSchedule.*.price")
    .notEmpty()
    .withMessage("Schedule price is required")
    .isFloat({ min: 0 })
    .withMessage("Schedule price cannot be negative")
    .toFloat(),

  // TimeSlots validation (for multiple sessions per date)
  body("dateSchedule.*.timeSlots")
    .optional()
    .isArray()
    .withMessage("Time slots must be an array"),

  body("dateSchedule.*.timeSlots.*.date")
    .optional()
    .isISO8601()
    .withMessage("Time slot date must be valid")
    .toDate(),

  body("dateSchedule.*.timeSlots.*.startTime")
    .optional()
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage("Start time must be in HH:mm format"),

  body("dateSchedule.*.timeSlots.*.endTime")
    .optional()
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage("End time must be in HH:mm format"),

  body("dateSchedule.*.timeSlots.*.availableSeats")
    .optional()
    .isInt({ min: 0, max: 10000 })
    .withMessage("Time slot seats must be between 0 and 10,000")
    .toInt(),

  body("dateSchedule.*.timeSlots.*.price")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Time slot price cannot be negative")
    .toFloat(),

  // Tags validation
  body("tags")
    .optional()
    .isArray({ max: 20 })
    .withMessage("Cannot have more than 20 tags"),

  body("tags.*")
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Each tag must be between 2 and 50 characters")
    .escape(),

  // Images validation
  body("images")
    .optional()
    .isArray({ max: 10 })
    .withMessage("Cannot have more than 10 images"),

  body("images.*")
    .optional()
    .trim()
    .isURL({ protocols: ["http", "https"], require_protocol: true })
    .withMessage("Each image must be a valid URL"),

  // Status validation
  body("status")
    .optional()
    .isIn(EVENT_STATUSES)
    .withMessage(`Status must be one of: ${EVENT_STATUSES.join(", ")}`),
];

/**
 * Update event validation (similar to create but all fields optional)
 */
export const validateUpdateEvent = [
  validateStringLength("title", 1, 200, false),

  validateHtmlLength("description", 20, 10000, false),

  sanitizeHtml("description"),

  body("shortDescription")
    .optional({ nullable: true })
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Short description cannot exceed 500 characters"),

  body("customCSS")
    .optional()
    .isString()
    .isLength({ max: 50000 })
    .withMessage("Custom CSS cannot exceed 50,000 characters")
    .customSanitizer(async (value) => {
      if (!value) return value;
      const { sanitizeCustomCSS } = await import("../utils/css.utils");
      return sanitizeCustomCSS(value);
    }),

  body("category")
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Category must be between 2 and 100 characters")
    .escape(),

  validateEnum("type", EVENT_TYPES, false),
  validateEnum("venueType", VENUE_TYPES, false),
  validateEnum("currency", CURRENCIES, false),
  validateEnum("status", EVENT_STATUSES, false),

  body("ageRange")
    .optional()
    .isArray({ min: 2, max: 2 })
    .withMessage(
      "Age range must be an array with exactly 2 elements [min, max]",
    ),

  body("price")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Price cannot be negative")
    .toFloat(),

  body("tags")
    .optional()
    .isArray({ max: 20 })
    .withMessage("Cannot have more than 20 tags"),

  body("images")
    .optional()
    .isArray({ max: 10 })
    .withMessage("Cannot have more than 10 images"),

  // Location validation (same as create)
  body("location.country")
    .optional()
    .trim()
    .isLength({ min: 2, max: 2 })
    .withMessage("Country must be a 2-letter ISO code")
    .isIn(COUNTRY_CODES)
    .withMessage("Invalid country code")
    .toUpperCase(),

  body("location.address")
    .optional()
    .custom((value, { req }) => {
      // Address is optional for all events
      if (value && value.trim().length > 0) {
        if (value.trim().length < 5) {
          throw new Error("Address must be at least 5 characters if provided");
        }
        if (value.trim().length > 300) {
          throw new Error("Address cannot exceed 300 characters");
        }
      }
      return true;
    })
    .trim(),

  body("location.coordinates.lat")
    .optional()
    .custom((value, { req }) => {
      if (req.body.venueType === "Online") return true;
      if (value !== undefined && value !== null) {
        const lat = parseFloat(value);
        if (isNaN(lat) || lat < -90 || lat > 90) {
          throw new Error("Latitude must be between -90 and 90");
        }
      }
      return true;
    })
    .toFloat(),

  body("location.coordinates.lng")
    .optional()
    .custom((value, { req }) => {
      if (req.body.venueType === "Online") return true;
      if (value !== undefined && value !== null) {
        const lng = parseFloat(value);
        if (isNaN(lng) || lng < -180 || lng > 180) {
          throw new Error("Longitude must be between -180 and 180");
        }
      }
      return true;
    })
    .toFloat(),

  // Meeting link validation
  body("meetingLink")
    .optional({ nullable: true, checkFalsy: true })
    .isURL({ protocols: ["http", "https"], require_protocol: true })
    .withMessage("Meeting link must be a valid URL"),

  // Date schedule (all optional for updates — only validate what is sent)
  body("dateSchedule")
    .optional()
    .isArray({ min: 1 })
    .withMessage("dateSchedule must be a non-empty array if provided"),

  body("dateSchedule.*.startDate")
    .optional()
    .isISO8601()
    .withMessage("Start date must be a valid ISO 8601 date")
    .toDate()
    .custom((value) => {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      if (new Date(value) < now) {
        throw new Error("Start date cannot be in the past");
      }
      return true;
    }),

  body("dateSchedule.*.endDate")
    .optional()
    .isISO8601()
    .withMessage("End date must be a valid ISO 8601 date")
    .toDate()
    .custom((value, { req, path }) => {
      const match = path.match(/\[(\d+)\]/);
      if (match) {
        const index = parseInt(match[1]);
        const startDate = req.body.dateSchedule[index]?.startDate;
        if (startDate && new Date(value) < new Date(startDate)) {
          throw new Error("End date must be after start date");
        }
      }
      return true;
    }),

  body("dateSchedule.*.availableSeats")
    .optional()
    .isInt({ min: 0, max: 999999 })
    .withMessage("Available seats must be between 0 and 999,999")
    .toInt(),

  body("dateSchedule.*.price")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Schedule price cannot be negative")
    .toFloat(),

  // TimeSlots validation
  body("dateSchedule.*.timeSlots").optional().isArray(),

  body("dateSchedule.*.timeSlots.*.date").optional().isISO8601().toDate(),

  body("dateSchedule.*.timeSlots.*.startTime")
    .optional()
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/),

  body("dateSchedule.*.timeSlots.*.endTime")
    .optional()
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/),

  body("dateSchedule.*.timeSlots.*.availableSeats")
    .optional()
    .isInt({ min: 0, max: 10000 })
    .toInt(),

  body("dateSchedule.*.timeSlots.*.price")
    .optional()
    .isFloat({ min: 0 })
    .toFloat(),
];

/**
 * FAQ validation
 */
export const validateEventFAQ = [
  body("faqs").optional().isArray().withMessage("FAQs must be an array"),

  body("faqs.*.question")
    .trim()
    .notEmpty()
    .withMessage("FAQ question is required")
    .isLength({ min: 5, max: 200 })
    .withMessage("Question must be between 5 and 200 characters")
    .escape(),

  body("faqs.*.answer")
    .trim()
    .notEmpty()
    .withMessage("FAQ answer is required")
    .isLength({ min: 10, max: 1000 })
    .withMessage("Answer must be between 10 and 1000 characters")
    .escape(),
];

/**
 * SEO meta validation
 */
export const validateEventSEO = [
  body("seoMeta.title")
    .optional()
    .trim()
    .isLength({ max: 60 })
    .withMessage("SEO title cannot exceed 60 characters")
    .escape(),

  body("seoMeta.description")
    .optional()
    .trim()
    .isLength({ max: 160 })
    .withMessage("SEO description cannot exceed 160 characters")
    .escape(),

  body("seoMeta.keywords")
    .optional()
    .isArray({ max: 20 })
    .withMessage("Cannot have more than 20 SEO keywords"),

  body("seoMeta.keywords.*")
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Each keyword must be between 2 and 50 characters")
    .escape(),
];

/**
 * Event filtering/search validation
 */
export const validateEventSearch = [
  ...validatePagination,
  ...validateSort([
    "title",
    "price",
    "createdAt",
    "averageRating",
    "reviewCount",
    "viewsCount",
  ]),
  ...validateDateRange,
  ...validatePriceRange,
  ...validateSearch,

  query("category")
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Category must be between 2 and 100 characters")
    .escape(),

  query("type")
    .optional()
    .isIn(EVENT_TYPES)
    .withMessage(`Type must be one of: ${EVENT_TYPES.join(", ")}`),

  query("venueType")
    .optional()
    .isIn(VENUE_TYPES)
    .withMessage(`Venue type must be one of: ${VENUE_TYPES.join(", ")}`),

  query("status")
    .optional()
    .isIn(EVENT_STATUSES)
    .withMessage(`Status must be one of: ${EVENT_STATUSES.join(", ")}`),

  query("city")
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("City must be between 2 and 100 characters")
    .escape(),

  query("minAge")
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage("Minimum age must be between 0 and 100")
    .toInt(),

  query("maxAge")
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage("Maximum age must be between 0 and 100")
    .toInt(),

  query("isFeatured")
    .optional()
    .isBoolean()
    .withMessage("isFeatured must be a boolean")
    .toBoolean(),

  query("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean")
    .toBoolean(),

  query("isApproved")
    .optional()
    .isBoolean()
    .withMessage("isApproved must be a boolean")
    .toBoolean(),
];

/**
 * Event approval validation (admin only)
 */
export const validateEventApproval = [
  body("isApproved")
    .notEmpty()
    .withMessage("Approval status is required")
    .isBoolean()
    .withMessage("isApproved must be a boolean")
    .toBoolean(),

  body("rejectionReason")
    .if(body("isApproved").equals("false"))
    .notEmpty()
    .withMessage("Rejection reason is required when rejecting an event")
    .isLength({ min: 10, max: 500 })
    .withMessage("Rejection reason must be between 10 and 500 characters")
    .escape(),
];

/**
 * Admin-specific field validations
 */
const adminSpecificFields = [
  // Vendor ID (required for admin create)
  body("vendorId")
    .notEmpty()
    .withMessage("Vendor ID is required")
    .isMongoId()
    .withMessage("Invalid vendor ID format"),

  // Admin control fields
  body("isApproved")
    .optional()
    .isBoolean()
    .withMessage("isApproved must be a boolean")
    .toBoolean(),

  body("isFeatured")
    .optional()
    .isBoolean()
    .withMessage("isFeatured must be a boolean")
    .toBoolean(),

  body("requirePhoneVerification")
    .optional()
    .isBoolean()
    .withMessage("requirePhoneVerification must be a boolean")
    .toBoolean(),

  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean")
    .toBoolean(),

  // Affiliate event fields
  body("isAffiliateEvent")
    .optional()
    .isBoolean()
    .withMessage("isAffiliateEvent must be a boolean")
    .toBoolean(),

  body("externalBookingLink")
    .optional()
    .trim()
    .isURL({ protocols: ["http", "https"], require_protocol: true })
    .withMessage("External booking link must be a valid URL"),

  body("claimStatus")
    .optional()
    .isIn(["unclaimed", "claimed", "not_claimable"])
    .withMessage(
      "Claim status must be one of: unclaimed, claimed, not_claimable",
    ),
];

/**
 * Admin-specific field validations for updates (vendorId optional)
 */
const adminSpecificFieldsUpdate = [
  // Vendor ID (optional for updates)
  body("vendorId")
    .optional()
    .isMongoId()
    .withMessage("Invalid vendor ID format"),

  // Admin control fields
  body("isApproved")
    .optional()
    .isBoolean()
    .withMessage("isApproved must be a boolean")
    .toBoolean(),

  body("isFeatured")
    .optional()
    .isBoolean()
    .withMessage("isFeatured must be a boolean")
    .toBoolean(),

  body("requirePhoneVerification")
    .optional()
    .isBoolean()
    .withMessage("requirePhoneVerification must be a boolean")
    .toBoolean(),

  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean")
    .toBoolean(),

  // Affiliate event fields
  body("isAffiliateEvent")
    .optional()
    .isBoolean()
    .withMessage("isAffiliateEvent must be a boolean")
    .toBoolean(),

  body("externalBookingLink")
    .optional()
    .trim()
    .isURL({ protocols: ["http", "https"], require_protocol: true })
    .withMessage("External booking link must be a valid URL"),

  body("claimStatus")
    .optional()
    .isIn(["unclaimed", "claimed", "not_claimable"])
    .withMessage(
      "Claim status must be one of: unclaimed, claimed, not_claimable",
    ),
];

/**
 * Teacher-specific create event validation
 * Differences from base: accepts eventType (Online/Offline) instead of requiring venueType,
 * lower description min (10), lenient image URL check
 */
export const validateCreateTeacherEvent = [
  validateStringLength("title", 1, 200, true),

  validateHtmlLength("description", 10, 10000, true),

  sanitizeHtml("description"),

  body("category")
    .trim()
    .notEmpty()
    .withMessage("Category is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Category must be between 2 and 100 characters")
    .escape(),

  validateEnum("type", EVENT_TYPES, true),

  // Teacher form sends eventType (Online/Offline), venueType is optional
  body("eventType")
    .optional({ nullable: true, checkFalsy: true })
    .isIn(["Online", "Offline"])
    .withMessage("eventType must be Online or Offline"),

  validateEnum("venueType", VENUE_TYPES, false),

  body("ageRange")
    .isArray({ min: 2, max: 2 })
    .withMessage("Age range must be an array with exactly 2 elements [min, max]"),

  body("ageRange.*")
    .isInt({ min: 0, max: 100 })
    .withMessage("Age range values must be between 0 and 100")
    .toInt(),

  body("ageRange").custom((value) => {
    if (value[0] > value[1]) {
      throw new Error("Minimum age cannot be greater than maximum age");
    }
    return true;
  }),

  body("location.country")
    .optional()
    .trim()
    .isLength({ min: 2, max: 2 })
    .withMessage("Country must be a 2-letter ISO code")
    .isIn(COUNTRY_CODES)
    .withMessage("Invalid country code")
    .toUpperCase(),

  // City is required for non-online events; online events rely on a meeting link instead
  body("location.city")
    .if(body("venueType").not().equals("Online"))
    .trim()
    .notEmpty()
    .withMessage("City is required for non-online events")
    .isLength({ min: 2, max: 100 })
    .withMessage("City must be between 2 and 100 characters")
    .escape(),

  body("location.city")
    .if(body("venueType").equals("Online"))
    .optional()
    .trim()
    .isLength({ min: 0, max: 100 })
    .escape(),

  body("location.address")
    .optional()
    .custom((value) => {
      if (value && value.trim().length > 0) {
        if (value.trim().length < 5) throw new Error("Address must be at least 5 characters if provided");
        if (value.trim().length > 300) throw new Error("Address cannot exceed 300 characters");
      }
      return true;
    })
    .trim(),

  validateNumericRange("price", 0, undefined, true),
  validateEnum("currency", CURRENCIES, false),

  body("dateSchedule")
    .isArray({ min: 1 })
    .withMessage("At least one date schedule is required"),

  body("dateSchedule.*.startDate")
    .optional()
    .isISO8601()
    .withMessage("Start date must be a valid ISO 8601 date")
    .toDate()
    .custom((value) => {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      if (new Date(value) < now) {
        throw new Error("Start date cannot be in the past");
      }
      return true;
    }),

  body("dateSchedule.*.endDate")
    .optional()
    .isISO8601()
    .withMessage("End date must be a valid ISO 8601 date")
    .toDate()
    .custom((value, { req, path }) => {
      const match = path.match(/\[(\d+)\]/);
      if (match) {
        const index = parseInt(match[1]);
        const startDate = req.body.dateSchedule[index]?.startDate;
        if (startDate && new Date(value) < new Date(startDate)) {
          throw new Error("End date must be after start date");
        }
      }
      return true;
    }),

  body("dateSchedule.*.availableSeats")
    .notEmpty()
    .withMessage("Available seats is required")
    .isInt({ min: 0, max: 999999 })
    .withMessage("Available seats must be between 0 and 999,999")
    .toInt(),

  body("dateSchedule.*.price")
    .notEmpty()
    .withMessage("Schedule price is required")
    .isFloat({ min: 0 })
    .withMessage("Schedule price cannot be negative")
    .toFloat(),

  body("dateSchedule.*.timeSlots")
    .optional()
    .isArray()
    .withMessage("Time slots must be an array"),

  body("dateSchedule.*.timeSlots.*.date")
    .optional()
    .isISO8601()
    .withMessage("Time slot date must be valid")
    .toDate(),

  body("dateSchedule.*.timeSlots.*.startTime")
    .optional()
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage("Start time must be in HH:mm format"),

  body("dateSchedule.*.timeSlots.*.endTime")
    .optional()
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage("End time must be in HH:mm format"),

  body("dateSchedule.*.timeSlots.*.availableSeats")
    .optional()
    .isInt({ min: 0, max: 10000 })
    .withMessage("Time slot seats must be between 0 and 10,000")
    .toInt(),

  body("dateSchedule.*.timeSlots.*.price")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Time slot price cannot be negative")
    .toFloat(),

  body("tags")
    .optional()
    .isArray({ max: 20 })
    .withMessage("Cannot have more than 20 tags"),

  body("tags.*")
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Each tag must be between 2 and 50 characters")
    .escape(),

  // Lenient image check — skip empty/falsy array items
  body("images")
    .optional()
    .isArray({ max: 10 })
    .withMessage("Cannot have more than 10 images"),

  body("images.*").optional().custom((value) => {
    if (!value || !value.trim()) return true;
    const urlRegex = /^https?:\/\/.+/;
    if (!urlRegex.test(value.trim())) {
      throw new Error("Each image must be a valid URL");
    }
    return true;
  }),

  body("status")
    .optional()
    .isIn(EVENT_STATUSES)
    .withMessage(`Status must be one of: ${EVENT_STATUSES.join(", ")}`),
];

/**
 * Teacher-specific update event validation
 */
export const validateUpdateTeacherEvent = [
  validateStringLength("title", 1, 200, false),

  validateHtmlLength("description", 10, 10000, false),

  sanitizeHtml("description"),

  body("category")
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Category must be between 2 and 100 characters")
    .escape(),

  validateEnum("type", EVENT_TYPES, false),
  validateEnum("currency", CURRENCIES, false),
  validateEnum("status", EVENT_STATUSES, false),

  body("eventType")
    .optional({ nullable: true, checkFalsy: true })
    .isIn(["Online", "Offline"])
    .withMessage("eventType must be Online or Offline"),

  validateEnum("venueType", VENUE_TYPES, false),

  body("ageRange")
    .optional()
    .isArray({ min: 2, max: 2 })
    .withMessage("Age range must be an array with exactly 2 elements [min, max]"),

  body("price")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Price cannot be negative")
    .toFloat(),

  body("tags")
    .optional()
    .isArray({ max: 20 })
    .withMessage("Cannot have more than 20 tags"),

  body("images")
    .optional()
    .isArray({ max: 10 })
    .withMessage("Cannot have more than 10 images"),

  body("images.*").optional().custom((value) => {
    if (!value || !value.trim()) return true;
    const urlRegex = /^https?:\/\/.+/;
    if (!urlRegex.test(value.trim())) {
      throw new Error("Each image must be a valid URL");
    }
    return true;
  }),

  // Date schedule (all optional for updates)
  body("dateSchedule")
    .optional()
    .isArray({ min: 1 })
    .withMessage("dateSchedule must be a non-empty array if provided"),

  body("dateSchedule.*.startDate")
    .optional()
    .isISO8601()
    .withMessage("Start date must be a valid ISO 8601 date")
    .toDate()
    .custom((value) => {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      if (new Date(value) < now) {
        throw new Error("Start date cannot be in the past");
      }
      return true;
    }),

  body("dateSchedule.*.endDate")
    .optional()
    .isISO8601()
    .withMessage("End date must be a valid ISO 8601 date")
    .toDate()
    .custom((value, { req, path }) => {
      const match = path.match(/\[(\d+)\]/);
      if (match) {
        const index = parseInt(match[1]);
        const startDate = req.body.dateSchedule[index]?.startDate;
        if (startDate && new Date(value) < new Date(startDate)) {
          throw new Error("End date must be after start date");
        }
      }
      return true;
    }),

  body("dateSchedule.*.availableSeats")
    .optional()
    .isInt({ min: 0, max: 999999 })
    .withMessage("Available seats must be between 0 and 999,999")
    .toInt(),

  body("dateSchedule.*.price")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Schedule price cannot be negative")
    .toFloat(),

  body("dateSchedule.*.timeSlots").optional().isArray(),

  body("dateSchedule.*.timeSlots.*.date")
    .optional()
    .isISO8601()
    .toDate(),

  body("dateSchedule.*.timeSlots.*.startTime")
    .optional()
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/),

  body("dateSchedule.*.timeSlots.*.endTime")
    .optional()
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/),

  body("dateSchedule.*.timeSlots.*.availableSeats")
    .optional()
    .isInt({ min: 0, max: 10000 })
    .toInt(),

  body("dateSchedule.*.timeSlots.*.price")
    .optional()
    .isFloat({ min: 0 })
    .toFloat(),
];

/**
 * Admin create event validation (extends base validation with admin fields)
 */
export const validateAdminCreateEvent = [
  ...validateCreateEvent,
  ...adminSpecificFields,
];

/**
 * Admin update event validation (extends base validation with admin fields)
 */
export const validateAdminUpdateEvent = [
  ...validateUpdateEvent,
  ...adminSpecificFieldsUpdate,
];

/**
 * Export all event validators
 */
export default {
  validateCreateEvent,
  validateUpdateEvent,
  validateCreateTeacherEvent,
  validateUpdateTeacherEvent,
  validateEventFAQ,
  validateEventSEO,
  validateEventSearch,
  validateEventApproval,
  validateAdminCreateEvent,
  validateAdminUpdateEvent,
};
