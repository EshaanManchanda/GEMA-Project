import { body, param } from "express-validator";
import {
  validateEmail,
  validatePhone,
  validateUrl,
  validateStringLength,
} from "./common.validator";

const DAYS_OF_WEEK = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const SOCIAL_PLATFORMS = [
  "facebook",
  "instagram",
  "twitter",
  "linkedin",
  "youtube",
  "website",
];

const DOCUMENT_TYPES = [
  "businessLicense",
  "taxCertificate",
  "identityDocument",
];

/**
 * Validate vendor profile update
 */
export const validateUpdateProfile = [
  validateStringLength("businessName", 1, 100, false),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Description cannot exceed 2000 characters"),

  body("category")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Category cannot exceed 100 characters"),

  validateEmail("email", false),

  validatePhone("phone", false),

  body("contactPerson.name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Contact person name is required"),

  body("contactPerson.email")
    .optional()
    .trim()
    .isEmail()
    .withMessage("Contact person email must be valid"),

  body("contactPerson.phone")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Contact person phone is required"),

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

  validateUrl("website", false),

  validateUrl("profileVideoUrl", false),

  body("videoDescription")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Video description cannot exceed 500 characters"),

  body("languagesSpoken")
    .optional()
    .isArray()
    .withMessage("Languages must be an array of strings"),

  body("languagesSpoken.*")
    .optional()
    .trim()
    .isString()
    .withMessage("Each language must be a string"),
];

/**
 * Validate bank details update
 */
export const validateBankDetails = [
  body("accountHolderName")
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage("Account holder name must be 1-200 characters"),

  body("bankName")
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage("Bank name must be 1-200 characters"),

  body("accountNumber")
    .optional()
    .trim()
    .matches(/^[A-Za-z0-9\-\s]+$/)
    .withMessage("Account number contains invalid characters")
    .isLength({ max: 34 })
    .withMessage("Account number cannot exceed 34 characters"),

  body("routingNumber")
    .optional()
    .trim()
    .matches(/^[A-Za-z0-9]+$/)
    .withMessage("Routing number contains invalid characters"),

  body("iban")
    .optional()
    .trim()
    .matches(/^[A-Z]{2}\d{2}[A-Z0-9]{4,30}$/)
    .withMessage("IBAN format is invalid"),

  body("swiftCode")
    .optional()
    .trim()
    .matches(/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/)
    .withMessage("SWIFT/BIC code format is invalid"),

  body("country")
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Country must be 2-100 characters"),
];

/**
 * Validate business hours update
 */
export const validateBusinessHours = [
  body("businessHours")
    .isObject()
    .withMessage("Business hours must be an object"),

  body("businessHours.*")
    .optional()
    .isObject()
    .withMessage("Each day must be an object"),

  body("businessHours.*.isOpen")
    .optional()
    .isBoolean()
    .withMessage("isOpen must be a boolean"),

  body("businessHours.*.openTime")
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage("Open time must be in HH:MM format"),

  body("businessHours.*.closeTime")
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage("Close time must be in HH:MM format"),
];

/**
 * Validate social media links update
 */
export const validateSocialMedia = [
  body("facebook")
    .optional({ values: "falsy" })
    .trim()
    .isURL()
    .withMessage("Facebook must be a valid URL"),

  body("instagram")
    .optional({ values: "falsy" })
    .trim()
    .isURL()
    .withMessage("Instagram must be a valid URL"),

  body("twitter")
    .optional({ values: "falsy" })
    .trim()
    .isURL()
    .withMessage("Twitter must be a valid URL"),

  body("linkedin")
    .optional({ values: "falsy" })
    .trim()
    .isURL()
    .withMessage("LinkedIn must be a valid URL"),

  body("youtube")
    .optional({ values: "falsy" })
    .trim()
    .isURL()
    .withMessage("YouTube must be a valid URL"),

  body("website")
    .optional({ values: "falsy" })
    .trim()
    .isURL()
    .withMessage("Website must be a valid URL"),
];

/**
 * Validate phone verification OTP send
 */
export const validatePhoneVerificationSend = [
  validatePhone("phone", true, true),
];

/**
 * Validate phone OTP confirm
 */
export const validatePhoneVerificationConfirm = [
  body("phone").trim().notEmpty().withMessage("Phone number is required"),

  body("otp")
    .trim()
    .notEmpty()
    .withMessage("OTP is required")
    .isLength({ min: 4, max: 8 })
    .withMessage("OTP must be 4-8 characters"),
];

/**
 * Validate document type param
 */
export const validateDocumentType = [
  param("type")
    .isIn(DOCUMENT_TYPES)
    .withMessage(`Document type must be one of: ${DOCUMENT_TYPES.join(", ")}`),
];
