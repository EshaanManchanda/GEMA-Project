import { body, param, query } from "express-validator";

// Validation rules for submitting partnership form
export const submitPartnershipValidation = [
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

  body("phone")
    .optional()
    .trim()
    .matches(/^[\d\s+()-]+$/)
    .withMessage("Please provide a valid phone number"),

  body("organization")
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Organization name cannot exceed 200 characters"),

  body("partnershipType")
    .trim()
    .notEmpty()
    .withMessage("Partnership type is required")
    .isIn(["vendor", "influencer", "school", "affiliate", "summer_camp", "play_zone", "workshop", "activity_centre", "other"])
    .withMessage("Invalid partnership type"),

  body("website")
    .optional()
    .trim()
    .isURL({ require_protocol: true, protocols: ["http", "https"] })
    .withMessage(
      "Please provide a valid website URL (must start with http:// or https://)",
    ),

  body("message")
    .trim()
    .notEmpty()
    .withMessage("Message is required")
    .isLength({ min: 10, max: 2000 })
    .withMessage("Message must be between 10 and 2000 characters"),

  body("agreeToTerms")
    .notEmpty()
    .withMessage("You must agree to the terms and conditions")
    .isBoolean()
    .withMessage("agreeToTerms must be a boolean value")
    .custom((value) => {
      if (value !== true) {
        throw new Error("You must agree to the terms and conditions");
      }
      return true;
    }),

  // Summer 2026 optional fields
  body("campaignType")
    .optional()
    .isIn(["general", "summer_2026"])
    .withMessage("Campaign type must be general or summer_2026"),

  body("selectedPackage")
    .optional()
    .isIn(["starter", "growth", "premium", "category_sponsor"])
    .withMessage("Invalid package selection"),

  body("campDetails")
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Camp details cannot exceed 2000 characters"),

  body("ageGroups")
    .optional()
    .isArray()
    .withMessage("Age groups must be an array"),

  body("emirate")
    .optional()
    .trim()
    .isIn(["", "Abu Dhabi", "Dubai", "Sharjah", "Ajman", "Umm Al Quwain", "Ras Al Khaimah", "Fujairah"])
    .withMessage("Invalid emirate"),

  body("numberOfKids")
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage("Number of kids field is too long"),
];

// Validation rules for getting all partnerships (admin)
export const getAllPartnershipsValidation = [
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
    .isIn(["pending", "contacted", "approved", "rejected"])
    .withMessage(
      "Status must be one of: pending, contacted, approved, rejected",
    ),

  query("partnershipType")
    .optional()
    .isIn(["vendor", "influencer", "school", "affiliate", "summer_camp", "play_zone", "workshop", "activity_centre", "other"])
    .withMessage(
      "Partnership type must be one of: vendor, influencer, school, affiliate, summer_camp, play_zone, workshop, activity_centre, other",
    ),

  query("campaignType")
    .optional()
    .isIn(["general", "summer_2026"])
    .withMessage("Campaign type must be general or summer_2026"),

  query("sortBy")
    .optional()
    .isIn(["createdAt", "name", "email", "partnershipType", "status", "selectedPackage", "campaignType"])
    .withMessage("Invalid sort field"),

  query("sortOrder")
    .optional()
    .isIn(["asc", "desc"])
    .withMessage("Sort order must be asc or desc"),
];

// Validation rules for getting partnership by ID
export const getPartnershipByIdValidation = [
  param("id").isMongoId().withMessage("Invalid partnership ID"),
];

// Validation rules for updating partnership status
export const updatePartnershipStatusValidation = [
  param("id").isMongoId().withMessage("Invalid partnership ID"),

  body("status")
    .trim()
    .notEmpty()
    .withMessage("Status is required")
    .isIn(["pending", "contacted", "approved", "rejected"])
    .withMessage(
      "Status must be one of: pending, contacted, approved, rejected",
    ),

  body("notes")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Notes cannot exceed 1000 characters"),
];

// Validation rules for deleting partnership
export const deletePartnershipValidation = [
  param("id").isMongoId().withMessage("Invalid partnership ID"),
];
