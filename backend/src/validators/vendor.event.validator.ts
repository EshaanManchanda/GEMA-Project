import { body, param } from "express-validator";
import {
  validateStringLength,
  validateNumericRange,
  validateEnum,
  validateHtmlLength,
  sanitizeHtml,
} from "./common.validator";
import { EVENT_TYPES, VENUE_TYPES, CURRENCIES } from "./event.validator";

/**
 * Vendor event validation rules
 *
 * Mirrors the semantic checks the controller previously left to Mongoose (which surfaced as
 * a generic 500 on failure) — date ordering, price/seat sanity, and enum values are now
 * caught here as a clean 400. Vendor-specific: `type`/`venueType` are optional here (the
 * controller defaults them to "Event"/"Indoor" when omitted), unlike the stricter admin/public
 * event validators.
 */

// Vendor-settable statuses only — must be a subset of Event.status enum (Event.ts, EVENT_STATUSES).
// "pending_review" / "cancelled" are NOT valid enum values; using them crashes event.save().
export const VENDOR_SETTABLE_STATUSES = ["draft", "pending"] as const;

/** id-format check for :id-based routes (update/delete/restore). */
export const validateEventId = [
  param("id").isMongoId().withMessage("Invalid event id"),
];

const dateScheduleRules = (isCreate: boolean) => [
  isCreate
    ? body("dateSchedule")
        .isArray({ min: 1, max: 50 })
        .withMessage("At least one date schedule is required (max 50)")
    : body("dateSchedule")
        .optional()
        .isArray({ max: 50 })
        .withMessage("dateSchedule must be an array (max 50 items)"),

  body("dateSchedule.*.startDate")
    .optional()
    .isISO8601()
    .withMessage("Start date must be a valid ISO 8601 date")
    .custom((value) => {
      // Allow past dates during creation
      return true;
    }),

  body("dateSchedule.*.endDate")
    .optional()
    .isISO8601()
    .withMessage("End date must be a valid ISO 8601 date")
    .custom((value, { req, path }) => {
      const match = path.match(/\[(\d+)\]/);
      if (match) {
        const index = parseInt(match[1], 10);
        const startDate = req.body.dateSchedule?.[index]?.startDate;
        if (startDate && new Date(value) < new Date(startDate)) {
          throw new Error("End date must be on or after start date");
        }
      }
      return true;
    }),

  body("dateSchedule.*.availableSeats")
    .custom((value, { req, path }) => {
      const match = path.match(/\[(\d+)\]/);
      const index = match ? parseInt(match[1], 10) : -1;
      const schedule = index >= 0 ? req.body.dateSchedule?.[index] : undefined;
      if (schedule?.unlimitedSeats) return true;
      const seats = Number(value);
      if (!Number.isFinite(seats) || seats < 1) {
        throw new Error(
          "Available seats must be at least 1 unless the schedule is marked unlimitedSeats",
        );
      }
      return true;
    }),

  body("dateSchedule.*.price")
    .optional()
    .custom((value, { req }) => {
      if (req.body.isFreeEvent) return true;
      if (value === undefined || value === null || value === "") return true;
      const price = Number(value);
      if (!Number.isFinite(price) || price < 0) {
        throw new Error("Schedule price cannot be negative");
      }
      return true;
    }),
];

const sharedFieldRules = () => [
  validateEnum("type", EVENT_TYPES, false),
  validateEnum("venueType", VENUE_TYPES, false),
  validateEnum("currency", CURRENCIES, false),

  validateNumericRange("price", 0, undefined, false),

  body("ageRange")
    .optional()
    .isArray({ min: 2, max: 2 })
    .withMessage("Age range must be an array with exactly 2 elements [min, max]"),

  body("ageRange.*")
    .optional()
    .isInt({ min: 0, max: 120 })
    .withMessage("Age range values must be between 0 and 120")
    .toInt(),

  body("ageRange").custom((value) => {
    if (Array.isArray(value) && Number(value[0]) >= Number(value[1])) {
      throw new Error("Minimum age must be less than maximum age");
    }
    return true;
  }),

  // Meeting link, when present, must be a valid URL regardless of venueType.
  body("meetingLink")
    .optional({ nullable: true, checkFalsy: true })
    .isURL({ protocols: ["http", "https"], require_protocol: true })
    .withMessage("Meeting link must be a valid URL"),

  // isAffiliateEvent arrives as a real JSON boolean (not a form string) — use a plain
  // predicate rather than express-validator's .equals() (which asserts a string value).
  body("externalBookingLink")
    .if((_value, { req }) => req.body.isAffiliateEvent === true || req.body.isAffiliateEvent === "true")
    .notEmpty()
    .withMessage("External booking link is required for affiliate events")
    .isURL({ protocols: ["http", "https"], require_protocol: true })
    .withMessage("External booking link must be a valid URL"),

  body("tags").optional().isArray({ max: 30 }).withMessage("Cannot have more than 30 tags"),
  body("images").optional().isArray({ max: 20 }).withMessage("Cannot have more than 20 images"),
  body("imageAssets")
    .optional()
    .isArray({ max: 20 })
    .withMessage("Cannot have more than 20 image assets"),
  body("faqs").optional().isArray({ max: 50 }).withMessage("Cannot have more than 50 FAQs"),
];

// Create-only: venueType is always present on create (defaulted client-side / by the
// controller), so these conditionals are safe. On update, venueType may be omitted from a
// partial payload — enforcing "not Online ⇒ city/address required" there would wrongly block
// unrelated field edits (e.g. updating just the title). The model's pre-validate hook still
// enforces city-for-offline against the full saved document either way.
const createOnlyVenueRules = () => [
  body("meetingLink")
    .if(body("venueType").equals("Online"))
    .notEmpty()
    .withMessage("Meeting link is required for online events"),

  body("location.city")
    .if(body("venueType").not().equals("Online"))
    .trim()
    .notEmpty()
    .withMessage("City is required for non-online events"),

  body("location.address")
    .if(body("venueType").not().equals("Online"))
    .trim()
    .notEmpty()
    .withMessage("Address is required for non-online events"),
];

export const validateVendorEventCreate = [
  validateStringLength("title", 3, 200, true),
  validateHtmlLength("description", 1, 20000, true),
  sanitizeHtml("description"),
  validateStringLength("shortDescription", 1, 500, true),
  body("category").trim().notEmpty().withMessage("Category is required"),

  ...sharedFieldRules(),
  ...createOnlyVenueRules(),
  ...dateScheduleRules(true),
];

export const validateVendorEventUpdate = [
  validateStringLength("title", 3, 200, false),
  validateHtmlLength("description", 1, 20000, false),
  sanitizeHtml("description"),
  validateStringLength("shortDescription", 1, 500, false),
  body("category").optional().trim().notEmpty().withMessage("Category cannot be empty"),

  ...sharedFieldRules(),
  // Update: skip past-startDate enforcement (editing an old event must not be blocked by it),
  // but still enforce date ordering, seat sanity, and price sign.
  ...dateScheduleRules(false),

  body("status")
    .optional()
    .isIn(VENDOR_SETTABLE_STATUSES)
    .withMessage(`Vendors can only set status to: ${VENDOR_SETTABLE_STATUSES.join(", ")}`),
];

export default {
  validateVendorEventCreate,
  validateVendorEventUpdate,
  validateEventId,
  VENDOR_SETTABLE_STATUSES,
};
