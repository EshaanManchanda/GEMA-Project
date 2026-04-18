import { body, param } from "express-validator";

const VENUE_TYPES = ["indoor", "outdoor", "hybrid"];
const VENUE_STATUSES = ["active", "inactive", "maintenance", "suspended"];
const CURRENCIES = ["AED", "EGP", "CAD", "USD"];

export const validateCreateVenue = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Venue name is required")
    .isLength({ min: 1, max: 200 })
    .withMessage("Name must be between 1 and 200 characters"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Description cannot exceed 2000 characters"),

  body("address.street")
    .trim()
    .notEmpty()
    .withMessage("Street address is required"),

  body("address.city").trim().notEmpty().withMessage("City is required"),

  body("address.state").trim().notEmpty().withMessage("State is required"),

  body("address.country").trim().notEmpty().withMessage("Country is required"),

  body("address.zipCode").trim().notEmpty().withMessage("Zip code is required"),

  body("capacity")
    .notEmpty()
    .withMessage("Capacity is required")
    .isInt({ min: 1 })
    .withMessage("Capacity must be at least 1"),

  body("venueType")
    .notEmpty()
    .withMessage("Venue type is required")
    .isIn(VENUE_TYPES)
    .withMessage(`Venue type must be one of: ${VENUE_TYPES.join(", ")}`),

  body("coordinates.lat")
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage("Latitude must be between -90 and 90"),

  body("coordinates.lng")
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage("Longitude must be between -180 and 180"),

  body("facilities")
    .optional()
    .isArray({ max: 50 })
    .withMessage("Facilities must be an array (max 50)"),

  body("amenities")
    .optional()
    .isArray()
    .withMessage("Amenities must be an array"),

  body("baseRentalPrice")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Base rental price cannot be negative"),

  body("currency")
    .optional()
    .isIn(CURRENCIES)
    .withMessage(`Currency must be one of: ${CURRENCIES.join(", ")}`),

  body("contactInfo.phone")
    .optional()
    .matches(/^\+?[\d\s\-\(\)]+$/)
    .withMessage("Please enter a valid phone number"),

  body("contactInfo.email")
    .optional()
    .isEmail()
    .withMessage("Please enter a valid email"),

  body("contactInfo.website")
    .optional()
    .matches(/^https?:\/\/.+/)
    .withMessage("Please enter a valid URL"),

  body("images")
    .optional()
    .isArray({ max: 20 })
    .withMessage("Images must be an array (max 20)"),
];

export const validateUpdateVenue = [
  body("name")
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage("Name must be between 1 and 200 characters"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Description cannot exceed 2000 characters"),

  body("address.street")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Street cannot be empty"),

  body("address.city")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("City cannot be empty"),

  body("address.state")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("State cannot be empty"),

  body("address.country")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Country cannot be empty"),

  body("address.zipCode")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Zip code cannot be empty"),

  body("capacity")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Capacity must be at least 1"),

  body("venueType")
    .optional()
    .isIn(VENUE_TYPES)
    .withMessage(`Venue type must be one of: ${VENUE_TYPES.join(", ")}`),

  body("status")
    .optional()
    .isIn(VENUE_STATUSES)
    .withMessage(`Status must be one of: ${VENUE_STATUSES.join(", ")}`),

  body("baseRentalPrice")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Base rental price cannot be negative"),

  body("currency")
    .optional()
    .isIn(CURRENCIES)
    .withMessage(`Currency must be one of: ${CURRENCIES.join(", ")}`),

  body("contactInfo.phone")
    .optional()
    .matches(/^\+?[\d\s\-\(\)]+$/)
    .withMessage("Please enter a valid phone number"),

  body("contactInfo.email")
    .optional()
    .isEmail()
    .withMessage("Please enter a valid email"),

  body("contactInfo.website")
    .optional()
    .matches(/^https?:\/\/.+/)
    .withMessage("Please enter a valid URL"),

  body("images")
    .optional()
    .isArray({ max: 20 })
    .withMessage("Images must be an array (max 20)"),
];

export const validateVenueId = [
  param("venueId").isMongoId().withMessage("Invalid venue ID"),
];
