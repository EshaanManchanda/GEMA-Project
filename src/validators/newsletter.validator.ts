import { body, param, query } from "express-validator";

// Validation rules for subscribing to newsletter
export const subscribeValidation = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),

  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Name must be between 2 and 100 characters")
    .matches(/^[\p{L}\d\s'.()-]+$/u)
    .withMessage("Name contains invalid characters"),

  body("ageOfChildren")
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage("Age of children cannot exceed 50 characters"),

  body("city")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("City cannot exceed 100 characters"),

  body("source")
    .optional()
    .isIn(["blog", "footer", "popup", "checkout", "profile", "api"])
    .withMessage("Invalid subscription source"),

  body("tags").optional().isArray().withMessage("Tags must be an array"),

  body("tags.*")
    .optional()
    .trim()
    .isString()
    .withMessage("Each tag must be a string"),

  body("preferences")
    .optional()
    .isObject()
    .withMessage("Preferences must be an object"),

  body("preferences.frequency")
    .optional()
    .isIn(["daily", "weekly", "monthly"])
    .withMessage("Frequency must be daily, weekly, or monthly"),

  body("preferences.categories")
    .optional()
    .isArray()
    .withMessage("Categories must be an array"),

  body("preferences.categories.*")
    .optional()
    .trim()
    .isString()
    .withMessage("Each category must be a string"),

  body("preferences.receivePromotions")
    .optional()
    .isBoolean()
    .withMessage("Receive promotions must be a boolean"),
];

// Validation rules for unsubscribing by token
export const unsubscribeByTokenValidation = [
  param("token")
    .trim()
    .notEmpty()
    .withMessage("Unsubscribe token is required")
    .isLength({ min: 32, max: 64 })
    .withMessage("Invalid token format"),

  query("reason")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Reason cannot exceed 500 characters"),
];

// Validation rules for updating preferences
export const updatePreferencesValidation = [
  body("frequency")
    .optional()
    .isIn(["daily", "weekly", "monthly"])
    .withMessage("Frequency must be daily, weekly, or monthly"),

  body("categories")
    .optional()
    .isArray()
    .withMessage("Categories must be an array"),

  body("categories.*")
    .optional()
    .trim()
    .isString()
    .withMessage("Each category must be a string"),

  body("receivePromotions")
    .optional()
    .isBoolean()
    .withMessage("Receive promotions must be a boolean"),

  body("name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Name must be between 2 and 100 characters")
    .matches(/^[\p{L}\d\s'.()-]+$/u)
    .withMessage("Name contains invalid characters"),

  body("city")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("City cannot exceed 100 characters"),

  body("ageOfChildren")
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage("Age of children cannot exceed 50 characters"),
];

// Validation rules for unsubscribing (authenticated user)
export const unsubscribeValidation = [
  body("reason")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Reason cannot exceed 500 characters"),
];

// Validation rules for sending newsletter (admin only)
export const sendNewsletterValidation = [
  body("subject")
    .trim()
    .notEmpty()
    .withMessage("Subject is required")
    .isLength({ min: 3, max: 200 })
    .withMessage("Subject must be between 3 and 200 characters"),

  body("content")
    .trim()
    .notEmpty()
    .withMessage("Content is required")
    .isLength({ min: 10 })
    .withMessage("Content must be at least 10 characters"),

  body("frequency")
    .optional()
    .isIn(["daily", "weekly", "monthly"])
    .withMessage("Frequency must be daily, weekly, or monthly"),

  body("tags").optional().isArray().withMessage("Tags must be an array"),

  body("tags.*")
    .optional()
    .trim()
    .isString()
    .withMessage("Each tag must be a string"),

  body("testMode")
    .optional()
    .isBoolean()
    .withMessage("Test mode must be a boolean"),
];
