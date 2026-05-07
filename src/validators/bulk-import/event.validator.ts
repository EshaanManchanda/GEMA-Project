import { body } from "express-validator";
import mongoose from "mongoose";

/**
 * Validator for Event bulk import
 * Most complex validator - handles nested arrays, shadow fields, multiple relationships
 */
export const validateEventImport = [
  // Validate data array
  body("data")
    .isArray({ min: 1, max: 10000 })
    .withMessage("data must be an array with 1-10000 items"),

  // Required fields
  body("data.*.title")
    .notEmpty()
    .withMessage("Event title is required")
    .isString()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Title cannot exceed 200 characters"),

  body("data.*.description")
    .notEmpty()
    .withMessage("Event description is required")
    .isString(),

  // Category - accepts categorySlug OR categoryId
  body("data.*.categorySlug").optional().isString().trim().toLowerCase(),

  body("data.*.categoryId")
    .optional()
    .custom((value) => {
      if (value && !mongoose.Types.ObjectId.isValid(value)) {
        throw new Error("categoryId must be a valid MongoDB ObjectId");
      }
      return true;
    }),

  // Category validation: one of slug or id required
  body("data.*").custom((value) => {
    if (!value.categorySlug && !value.categoryId && !value.category) {
      throw new Error("Either categorySlug or categoryId is required");
    }
    return true;
  }),

  // Vendor - accepts vendorEmail OR vendorId
  body("data.*.vendorEmail")
    .optional()
    .isEmail()
    .normalizeEmail()
    .toLowerCase(),

  body("data.*.vendorId")
    .optional()
    .custom((value) => {
      if (value && !mongoose.Types.ObjectId.isValid(value)) {
        throw new Error("vendorId must be a valid MongoDB ObjectId");
      }
      return true;
    }),

  // Vendor validation: one of email or id required
  body("data.*").custom((value) => {
    if (!value.vendorEmail && !value.vendorId) {
      throw new Error("Either vendorEmail or vendorId is required");
    }
    return true;
  }),

  // Type
  body("data.*.type")
    .notEmpty()
    .withMessage("Event type is required")
    .isIn([
      "Olympiad",
      "Championship",
      "Competition",
      "Event",
      "Course",
      "Venue",
      "Workshop",
    ])
    .withMessage(
      "type must be: Olympiad, Championship, Competition, Event, Course, Venue, or Workshop",
    ),

  // Venue Type
  body("data.*.venueType")
    .notEmpty()
    .withMessage("Venue type is required")
    .isIn(["Indoor", "Outdoor", "Online", "Offline"])
    .withMessage("venueType must be: Indoor, Outdoor, Online, or Offline"),

  // Meeting link (required for Online events)
  body("data.*.meetingLink")
    .if(body("data.*.venueType").equals("Online"))
    .notEmpty()
    .withMessage("Meeting link is required for online events")
    .isURL()
    .withMessage("Meeting link must be a valid URL"),

  // Price and Currency
  body("data.*.price")
    .notEmpty()
    .withMessage("Price is required")
    .isFloat({ min: 0 })
    .withMessage("Price cannot be negative"),

  body("data.*.currency")
    .notEmpty()
    .withMessage("Currency is required")
    .isIn(["AED", "EGP", "CAD", "USD"])
    .withMessage("currency must be: AED, EGP, CAD, or USD"),

  // Age Range
  body("data.*.ageRange")
    .notEmpty()
    .withMessage("Age range is required")
    .isArray({ min: 2, max: 2 })
    .withMessage(
      "ageRange must be an array with exactly 2 elements [min, max]",
    ),

  body("data.*.ageRange.*")
    .isInt({ min: 0, max: 100 })
    .withMessage("Age range values must be between 0 and 100"),

  // Age range business rule validation
  body("data.*.ageRange").custom((value: number[]) => {
    if (value && value.length === 2 && value[0] > value[1]) {
      throw new Error("Age range minimum cannot be greater than maximum");
    }
    return true;
  }),

  // Location
  body("data.*.location.city")
    .notEmpty()
    .withMessage("City is required")
    .isString()
    .trim(),

  body("data.*.location.country")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 2, max: 2 })
    .withMessage("Country must be a 2-letter ISO code"),

  body("data.*.location.address").optional().isString().trim(),

  body("data.*.location.coordinates.lat")
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage("Latitude must be between -90 and 90"),

  body("data.*.location.coordinates.lng")
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage("Longitude must be between -180 and 180"),

  // Date Schedule (complex nested array)
  body("data.*.dateSchedule")
    .notEmpty()
    .withMessage("Date schedule is required")
    .isArray({ min: 1 })
    .withMessage("At least one date schedule is required"),

  // Date schedule fields
  body("data.*.dateSchedule.*.startDate").optional().isISO8601().toDate(),

  body("data.*.dateSchedule.*.endDate").optional().isISO8601().toDate(),

  body("data.*.dateSchedule.*.startTime")
    .optional()
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage("startTime must be in HH:mm format (e.g., 09:00)"),

  body("data.*.dateSchedule.*.endTime")
    .optional()
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage("endTime must be in HH:mm format (e.g., 17:00)"),

  body("data.*.dateSchedule.*.availableSeats")
    .notEmpty()
    .withMessage("Available seats is required for each schedule")
    .isInt({ min: 0 })
    .withMessage("Available seats cannot be negative"),

  body("data.*.dateSchedule.*.totalSeats")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Total seats cannot be negative"),

  body("data.*.dateSchedule.*.soldSeats")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Sold seats cannot be negative"),

  body("data.*.dateSchedule.*.price")
    .notEmpty()
    .withMessage("Price is required for each schedule")
    .isFloat({ min: 0 })
    .withMessage("Schedule price cannot be negative"),

  body("data.*.dateSchedule.*.unlimitedSeats")
    .optional()
    .isBoolean()
    .withMessage("unlimitedSeats must be a boolean"),

  // Time slots (nested within dateSchedule)
  body("data.*.dateSchedule.*.timeSlots").optional().isArray(),

  body("data.*.dateSchedule.*.timeSlots.*.date")
    .optional()
    .isISO8601()
    .toDate(),

  body("data.*.dateSchedule.*.timeSlots.*.startTime")
    .optional()
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/),

  body("data.*.dateSchedule.*.timeSlots.*.endTime")
    .optional()
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/),

  body("data.*.dateSchedule.*.timeSlots.*.availableSeats")
    .optional()
    .isInt({ min: 0 }),

  // Tags
  body("data.*.tags")
    .optional()
    .isArray({ max: 20 })
    .withMessage("Cannot have more than 20 tags"),

  body("data.*.tags.*").optional().isString().trim(),

  // FAQs
  body("data.*.faqs").optional().isArray(),

  body("data.*.faqs.*.question")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 200 })
    .withMessage("FAQ question cannot exceed 200 characters"),

  body("data.*.faqs.*.answer")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("FAQ answer cannot exceed 1000 characters"),

  // SEO Meta
  body("data.*.seoMeta.title")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 60 })
    .withMessage("SEO title cannot exceed 60 characters"),

  body("data.*.seoMeta.description")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 160 })
    .withMessage("SEO description cannot exceed 160 characters"),

  body("data.*.seoMeta.keywords").optional().isArray(),

  // Shadow fields: images (old) vs imageAssets (new)
  body("data.*.images")
    .optional()
    .isArray({ max: 10 })
    .withMessage("Cannot have more than 10 images"),

  body("data.*.images.*")
    .optional()
    .isString()
    .isURL()
    .withMessage("Each image must be a valid URL"),

  body("data.*.imageAssets")
    .optional()
    .isArray({ max: 10 })
    .withMessage("Cannot have more than 10 image assets"),

  body("data.*.imageAssets.*")
    .optional()
    .custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error("Each imageAsset must be a valid MediaAsset ID");
      }
      return true;
    }),

  // Status fields
  body("data.*.isApproved").optional().isBoolean(),

  body("data.*.isActive").optional().isBoolean(),

  body("data.*.status")
    .optional()
    .isIn(["draft", "published", "archived", "pending", "rejected"])
    .withMessage(
      "status must be: draft, published, archived, pending, or rejected",
    ),

  body("data.*.isFeatured").optional().isBoolean(),

  // Registration config (optional complex object)
  body("data.*.registrationConfig.enabled").optional().isBoolean(),

  body("data.*.registrationConfig.fields").optional().isArray(),

  body("data.*.registrationConfig.requiresApproval").optional().isBoolean(),

  // Affiliate event fields
  body("data.*.isAffiliateEvent").optional().isBoolean(),

  body("data.*.externalBookingLink")
    .if(body("data.*.isAffiliateEvent").equals("true"))
    .notEmpty()
    .withMessage("External booking link is required for affiliate events")
    .isURL()
    .withMessage("External booking link must be a valid URL"),

  body("data.*.claimStatus")
    .optional()
    .isIn(["unclaimed", "claimed", "not_claimable"])
    .withMessage("claimStatus must be: unclaimed, claimed, or not_claimable"),

  // Slug (optional - auto-generated from title if not provided)
  body("data.*.slug")
    .optional()
    .isString()
    .trim()
    .toLowerCase()
    .matches(/^[a-z0-9-]+$/)
    .withMessage(
      "Slug can only contain lowercase letters, numbers, and hyphens",
    ),

  // _id for updates (upsert mode)
  body("data.*._id")
    .optional()
    .custom((value) => {
      if (value && !mongoose.Types.ObjectId.isValid(value)) {
        throw new Error("_id must be a valid MongoDB ObjectId");
      }
      return true;
    }),
];

/**
 * Validator for Event bulk export filters
 */
export const validateEventExportFilters = [
  body("filters.status")
    .optional()
    .isIn(["draft", "published", "archived", "pending", "rejected"])
    .withMessage(
      "status must be: draft, published, archived, pending, or rejected",
    ),

  body("filters.type")
    .optional()
    .isIn([
      "Olympiad",
      "Championship",
      "Competition",
      "Event",
      "Course",
      "Venue",
      "Workshop",
    ]),

  body("filters.venueType")
    .optional()
    .isIn(["Indoor", "Outdoor", "Online", "Offline"]),

  body("filters.isApproved").optional().isBoolean(),

  body("filters.isActive").optional().isBoolean(),

  body("filters.isFeatured").optional().isBoolean(),

  body("filters.vendorId")
    .optional()
    .custom((value) => {
      if (value && !mongoose.Types.ObjectId.isValid(value)) {
        throw new Error("vendorId must be a valid MongoDB ObjectId");
      }
      return true;
    }),

  body("filters.vendorEmail").optional().isEmail(),

  body("filters.categoryId")
    .optional()
    .custom((value) => {
      if (value && !mongoose.Types.ObjectId.isValid(value)) {
        throw new Error("categoryId must be a valid MongoDB ObjectId");
      }
      return true;
    }),

  body("filters.categorySlug").optional().isString(),

  body("filters.dateRange.field")
    .optional()
    .isIn(["createdAt", "updatedAt"])
    .withMessage("dateRange.field must be: createdAt or updatedAt"),

  body("filters.dateRange.start").optional().isISO8601(),

  body("filters.dateRange.end").optional().isISO8601(),

  body("filters.limit")
    .optional()
    .isInt({ min: 1, max: 50000 })
    .withMessage("limit must be between 1 and 50000"),

  body("includeRelationships").optional().isBoolean(),

  body("format").optional().isIn(["json"]),
];
