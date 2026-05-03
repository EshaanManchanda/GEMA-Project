import { body, query, param } from "express-validator";
import {
  validateMongoId,
  validatePagination,
  validateAdminPagination,
  validateSort,
  validateSearch,
  validateEnum,
  validateEmail,
  validatePhone,
  validateStringLength,
  validateArray,
} from "./common.validator";

/**
 * Admin-specific validation rules
 */

// User roles and statuses
const USER_ROLES = ["admin", "customer", "vendor", "employee", "teacher"];
const USER_STATUSES = ["active", "inactive", "suspended", "pending"];
const EVENT_STATUSES = [
  "draft",
  "published",
  "archived",
  "pending",
  "rejected",
];
const GENDERS = ["male", "female", "other", "prefer_not_to_say"];
const EMPLOYEE_ROLES = ["manager", "scanner", "coordinator", "security"];
const PAYOUT_SCHEDULES = ["daily", "weekly", "monthly"];

/**
 * User management validations
 */

// Get all users with filtering
export const validateGetAllUsers = [
  ...validatePagination,
  ...validateSort([
    "firstName",
    "lastName",
    "email",
    "createdAt",
    "lastLogin",
    "role",
    "status",
  ]),
  ...validateSearch,

  query("role")
    .optional()
    .isIn(USER_ROLES)
    .withMessage(`Role must be one of: ${USER_ROLES.join(", ")}`),

  query("status")
    .optional()
    .isIn(USER_STATUSES)
    .withMessage(`Status must be one of: ${USER_STATUSES.join(", ")}`),

  query("isEmailVerified")
    .optional()
    .isBoolean()
    .withMessage("isEmailVerified must be a boolean")
    .toBoolean(),

  query("isPhoneVerified")
    .optional()
    .isBoolean()
    .withMessage("isPhoneVerified must be a boolean")
    .toBoolean(),
];

// Create user (admin)
export const validateCreateUser = [
  // Basic Information
  validateStringLength("firstName", 1, 50, true),
  validateStringLength("lastName", 1, 50, true),
  validateEmail("email", true),
  validatePhone("phone", false),

  body("gender")
    .optional()
    .isIn(GENDERS)
    .withMessage(`Gender must be one of: ${GENDERS.join(", ")}`),

  body("dateOfBirth")
    .optional()
    .isISO8601()
    .withMessage("Date of birth must be a valid date (YYYY-MM-DD)")
    .toDate()
    .custom((value) => {
      const age = Math.floor(
        (new Date().getTime() - new Date(value).getTime()) /
          (1000 * 60 * 60 * 24 * 365.25),
      );
      if (age < 13) {
        throw new Error("User must be at least 13 years old");
      }
      return true;
    }),

  body("avatar")
    .optional()
    .trim()
    .isURL({ require_tld: false })
    .withMessage("Avatar must be a valid URL")
    .isLength({ max: 500 })
    .withMessage("Avatar URL cannot exceed 500 characters"),

  // Authentication
  body("password")
    .optional()
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*])/)
    .withMessage(
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
    ),

  body("isEmailVerified")
    .optional()
    .isBoolean()
    .withMessage("isEmailVerified must be a boolean")
    .toBoolean(),

  body("isPhoneVerified")
    .optional()
    .isBoolean()
    .withMessage("isPhoneVerified must be a boolean")
    .toBoolean(),

  // Role & Status
  validateEnum("role", USER_ROLES, true),
  validateEnum("status", USER_STATUSES, false),

  // Employee-specific fields
  body("employeeId")
    .optional()
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage("Employee ID must be between 3 and 50 characters"),

  body("employeeRole")
    .optional()
    .isIn(EMPLOYEE_ROLES)
    .withMessage(`Employee role must be one of: ${EMPLOYEE_ROLES.join(", ")}`),

  body("vendorId")
    .optional()
    .custom((value) => {
      const mongoose = require("mongoose");
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error("Vendor ID must be a valid MongoDB ObjectId");
      }
      return true;
    }),

  body("permissions")
    .optional()
    .isArray()
    .withMessage("Permissions must be an array"),

  body("permissions.*.action")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Permission action is required"),

  body("permissions.*.scope")
    .optional()
    .isIn(["all", "assigned"])
    .withMessage('Permission scope must be either "all" or "assigned"'),

  body("emergencyContact.name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Emergency contact name must be between 2 and 100 characters"),

  body("emergencyContact.phone")
    .optional()
    .trim()
    .matches(/^\+[1-9]\d{7,14}$/)
    .withMessage(
      "Emergency contact phone must be a valid international phone number (e.g., +1234567890)",
    ),

  body("emergencyContact.relationship")
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage("Emergency contact relationship cannot exceed 50 characters"),

  body("hiredAt")
    .optional()
    .isISO8601()
    .withMessage("Hired date must be a valid date (YYYY-MM-DD)")
    .toDate(),

  // Vendor-specific fields
  body("vendorPaymentSettings.hasCustomStripeAccount")
    .optional()
    .isBoolean()
    .withMessage("hasCustomStripeAccount must be a boolean")
    .toBoolean(),

  body("vendorPaymentSettings.acceptsPlatformPayments")
    .optional()
    .isBoolean()
    .withMessage("acceptsPlatformPayments must be a boolean")
    .toBoolean(),

  body("vendorPaymentSettings.commissionRate")
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage("Commission rate must be between 0 and 100")
    .toFloat(),

  body("vendorPaymentSettings.payoutSchedule")
    .optional()
    .isIn(PAYOUT_SCHEDULES)
    .withMessage(
      `Payout schedule must be one of: ${PAYOUT_SCHEDULES.join(", ")}`,
    ),

  body("vendorPaymentSettings.minimumPayout")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Minimum payout must be a positive number")
    .toFloat(),

  // Social Media fields
  body("socialMedia.facebook")
    .optional()
    .trim()
    .isURL()
    .withMessage("Facebook URL must be a valid URL"),

  body("socialMedia.instagram")
    .optional()
    .trim()
    .isURL()
    .withMessage("Instagram URL must be a valid URL"),

  body("socialMedia.twitter")
    .optional()
    .trim()
    .isURL()
    .withMessage("Twitter URL must be a valid URL"),

  body("socialMedia.linkedin")
    .optional()
    .trim()
    .isURL()
    .withMessage("LinkedIn URL must be a valid URL"),

  body("socialMedia.youtube")
    .optional()
    .trim()
    .isURL()
    .withMessage("YouTube URL must be a valid URL"),

  body("socialMedia.website")
    .optional()
    .trim()
    .isURL()
    .withMessage("Website URL must be a valid URL"),

  // Business Hours (validated as object)
  body("businessHours")
    .optional()
    .isObject()
    .withMessage("Business hours must be an object"),
];

// Update user (admin)
export const validateUpdateUser = [
  validateMongoId("id", "param"),

  // Basic Information
  validateStringLength("firstName", 1, 50, false),
  validateStringLength("lastName", 1, 50, false),
  validateEmail("email", false),
  validatePhone("phone", false),

  body("gender")
    .optional()
    .isIn(GENDERS)
    .withMessage(`Gender must be one of: ${GENDERS.join(", ")}`),

  body("dateOfBirth")
    .optional()
    .isISO8601()
    .withMessage("Date of birth must be a valid date (YYYY-MM-DD)")
    .toDate()
    .custom((value) => {
      const age = Math.floor(
        (new Date().getTime() - new Date(value).getTime()) /
          (1000 * 60 * 60 * 24 * 365.25),
      );
      if (age < 13) {
        throw new Error("User must be at least 13 years old");
      }
      return true;
    }),

  body("avatar")
    .optional()
    .trim()
    .isURL({ require_tld: false })
    .withMessage("Avatar must be a valid URL")
    .isLength({ max: 500 })
    .withMessage("Avatar URL cannot exceed 500 characters"),

  // Role & Status
  validateEnum("role", USER_ROLES, false),
  validateEnum("status", USER_STATUSES, false),

  // Verification
  body("isEmailVerified")
    .optional()
    .isBoolean()
    .withMessage("isEmailVerified must be a boolean")
    .toBoolean(),

  body("isPhoneVerified")
    .optional()
    .isBoolean()
    .withMessage("isPhoneVerified must be a boolean")
    .toBoolean(),

  // Employee-specific fields
  body("employeeId")
    .optional()
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage("Employee ID must be between 3 and 50 characters"),

  body("employeeRole")
    .optional()
    .isIn(EMPLOYEE_ROLES)
    .withMessage(`Employee role must be one of: ${EMPLOYEE_ROLES.join(", ")}`),

  body("vendorId")
    .optional()
    .custom((value) => {
      const mongoose = require("mongoose");
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error("Vendor ID must be a valid MongoDB ObjectId");
      }
      return true;
    }),

  body("permissions")
    .optional()
    .isArray()
    .withMessage("Permissions must be an array"),

  body("emergencyContact.name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Emergency contact name must be between 2 and 100 characters"),

  body("emergencyContact.phone")
    .optional()
    .trim()
    .matches(/^\+[1-9]\d{7,14}$/)
    .withMessage(
      "Emergency contact phone must be a valid international phone number (e.g., +1234567890)",
    ),

  body("emergencyContact.relationship")
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage("Emergency contact relationship cannot exceed 50 characters"),

  body("hiredAt")
    .optional()
    .isISO8601()
    .withMessage("Hired date must be a valid date (YYYY-MM-DD)")
    .toDate(),

  // Vendor-specific fields
  body("vendorPaymentSettings.hasCustomStripeAccount")
    .optional()
    .isBoolean()
    .withMessage("hasCustomStripeAccount must be a boolean")
    .toBoolean(),

  body("vendorPaymentSettings.acceptsPlatformPayments")
    .optional()
    .isBoolean()
    .withMessage("acceptsPlatformPayments must be a boolean")
    .toBoolean(),

  body("vendorPaymentSettings.commissionRate")
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage("Commission rate must be between 0 and 100")
    .toFloat(),

  body("vendorPaymentSettings.payoutSchedule")
    .optional()
    .isIn(PAYOUT_SCHEDULES)
    .withMessage(
      `Payout schedule must be one of: ${PAYOUT_SCHEDULES.join(", ")}`,
    ),

  body("vendorPaymentSettings.minimumPayout")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Minimum payout must be a positive number")
    .toFloat(),

  // Social Media fields
  body("socialMedia.facebook")
    .optional()
    .trim()
    .isURL()
    .withMessage("Facebook URL must be a valid URL"),

  body("socialMedia.instagram")
    .optional()
    .trim()
    .isURL()
    .withMessage("Instagram URL must be a valid URL"),

  body("socialMedia.twitter")
    .optional()
    .trim()
    .isURL()
    .withMessage("Twitter URL must be a valid URL"),

  body("socialMedia.linkedin")
    .optional()
    .trim()
    .isURL()
    .withMessage("LinkedIn URL must be a valid URL"),

  body("socialMedia.youtube")
    .optional()
    .trim()
    .isURL()
    .withMessage("YouTube URL must be a valid URL"),

  body("socialMedia.website")
    .optional()
    .trim()
    .isURL()
    .withMessage("Website URL must be a valid URL"),

  // Business Hours
  body("businessHours")
    .optional()
    .isObject()
    .withMessage("Business hours must be an object"),
];

// Update user status
export const validateUpdateUserStatus = [
  validateMongoId("id", "param"),
  validateEnum("status", USER_STATUSES, true),

  body("reason")
    .optional()
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage("Reason must be between 10 and 500 characters")
    .escape(),

  body("notifyUser")
    .optional()
    .isBoolean()
    .withMessage("notifyUser must be a boolean")
    .toBoolean(),
];

// Update user role
export const validateUpdateUserRole = [
  validateMongoId("id", "param"),
  validateEnum("role", USER_ROLES, true),

  body("reason")
    .optional()
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage("Reason must be between 10 and 500 characters")
    .escape(),

  body("notifyUser")
    .optional()
    .isBoolean()
    .withMessage("notifyUser must be a boolean")
    .toBoolean(),
];

// Bulk update users
export const validateBulkUpdateUsers = [
  body("userIds")
    .isArray({ min: 1, max: 100 })
    .withMessage("userIds must be an array with 1-100 items"),

  body("userIds.*").custom((value) => {
    const mongoose = require("mongoose");
    if (!mongoose.Types.ObjectId.isValid(value)) {
      throw new Error("Each user ID must be a valid MongoDB ObjectId");
    }
    return true;
  }),

  body("updateData").isObject().withMessage("updateData must be an object"),

  body("updateData.status")
    .optional()
    .isIn(USER_STATUSES)
    .withMessage(`Status must be one of: ${USER_STATUSES.join(", ")}`),

  body("updateData.isEmailVerified")
    .optional()
    .isBoolean()
    .withMessage("isEmailVerified must be a boolean")
    .toBoolean(),

  body("updateData.isPhoneVerified")
    .optional()
    .isBoolean()
    .withMessage("isPhoneVerified must be a boolean")
    .toBoolean(),
];

/**
 * Event management validations
 */

// Get all events (admin)
export const validateGetAllEvents = [
  ...validateAdminPagination,
  ...validateSort([
    "title",
    "price",
    "createdAt",
    "averageRating",
    "status",
    "isApproved",
  ]),
  ...validateSearch,

  query("category")
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Category must be between 2 and 100 characters")
    .escape(),

  query("type")
    .optional()
    .custom((value: string) => {
      const VALID_TYPES = [
        "Olympiad",
        "Championship",
        "Competition",
        "Event",
        "Course",
        "Venue",
        "Class",
        "Workshop",
        "Bootcamp",
        "Masterclass",
      ];
      // Support single type or comma-separated list
      const types = value.split(",").map((t: string) => t.trim());
      const invalid = types.filter((t: string) => !VALID_TYPES.includes(t));
      if (invalid.length > 0) {
        throw new Error(
          `Invalid event type(s): ${invalid.join(", ")}. Must be one of: ${VALID_TYPES.join(", ")}`,
        );
      }
      return true;
    })
    .withMessage("Invalid event type"),

  query("status")
    .optional()
    .isIn(EVENT_STATUSES)
    .withMessage(`Status must be one of: ${EVENT_STATUSES.join(", ")}`),

  query("isApproved")
    .optional()
    .isBoolean()
    .withMessage("isApproved must be a boolean")
    .toBoolean(),

  query("isFeatured")
    .optional()
    .isBoolean()
    .withMessage("isFeatured must be a boolean")
    .toBoolean(),

  query("isDeleted")
    .optional()
    .isBoolean()
    .withMessage("isDeleted must be a boolean")
    .toBoolean(),

  query("vendorId")
    .optional()
    .custom((value) => {
      const mongoose = require("mongoose");
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error("Vendor ID must be a valid MongoDB ObjectId");
      }
      return true;
    }),
];

// Approve event
export const validateApproveEvent = [
  validateMongoId("id", "param"),

  body("approvalNotes")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Approval notes cannot exceed 500 characters")
    .escape(),

  body("notifyVendor")
    .optional()
    .isBoolean()
    .withMessage("notifyVendor must be a boolean")
    .toBoolean(),
];

// Reject event
export const validateRejectEvent = [
  validateMongoId("id", "param"),

  body("reason")
    .notEmpty()
    .withMessage("Rejection reason is required")
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage("Rejection reason must be between 10 and 500 characters")
    .escape(),

  body("notifyVendor")
    .optional()
    .isBoolean()
    .withMessage("notifyVendor must be a boolean")
    .toBoolean(),
];

// Change event vendor
export const validateChangeEventVendor = [
  validateMongoId("id", "param"),
  validateMongoId("vendorId", "body"),

  body("reason")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Reason cannot exceed 500 characters")
    .escape(),

  body("notifyOldVendor")
    .optional()
    .isBoolean()
    .withMessage("notifyOldVendor must be a boolean")
    .toBoolean(),

  body("notifyNewVendor")
    .optional()
    .isBoolean()
    .withMessage("notifyNewVendor must be a boolean")
    .toBoolean(),
];

// Bulk update events
export const validateBulkUpdateEvents = [
  body("eventIds")
    .isArray({ min: 1, max: 100 })
    .withMessage("eventIds must be an array with 1-100 items"),

  body("eventIds.*").custom((value) => {
    const mongoose = require("mongoose");
    if (!mongoose.Types.ObjectId.isValid(value)) {
      throw new Error("Each event ID must be a valid MongoDB ObjectId");
    }
    return true;
  }),

  body("updateData").isObject().withMessage("updateData must be an object"),

  body("updateData.status")
    .optional()
    .isIn(EVENT_STATUSES)
    .withMessage(`Status must be one of: ${EVENT_STATUSES.join(", ")}`),

  body("updateData.isApproved")
    .optional()
    .isBoolean()
    .withMessage("isApproved must be a boolean")
    .toBoolean(),

  body("updateData.isFeatured")
    .optional()
    .isBoolean()
    .withMessage("isFeatured must be a boolean")
    .toBoolean(),

  body("updateData.isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean")
    .toBoolean(),
];

/**
 * Dashboard and statistics validations
 */

// Date range for dashboard stats
export const validateDashboardDateRange = [
  query("startDate")
    .optional()
    .isISO8601()
    .withMessage("Start date must be a valid ISO 8601 date")
    .toDate(),

  query("endDate")
    .optional()
    .isISO8601()
    .withMessage("End date must be a valid ISO 8601 date")
    .toDate()
    .custom((endDate, { req }) => {
      if (
        req.query?.startDate &&
        endDate < new Date(req.query.startDate as string)
      ) {
        throw new Error("End date must be after start date");
      }
      return true;
    }),

  query("period")
    .optional()
    .isIn(["today", "week", "month", "quarter", "year", "custom"])
    .withMessage(
      "Period must be one of: today, week, month, quarter, year, custom",
    ),

  query("groupBy")
    .optional()
    .isIn(["day", "week", "month", "year"])
    .withMessage("groupBy must be one of: day, week, month, year"),
];

/**
 * Content moderation validations
 */

// Review moderation action
export const validateModerationAction = [
  validateMongoId("id", "param"),

  body("action")
    .notEmpty()
    .withMessage("Moderation action is required")
    .isIn(["approve", "reject", "flag", "delete"])
    .withMessage("Action must be one of: approve, reject, flag, delete"),

  body("reason")
    .if(body("action").isIn(["reject", "flag", "delete"]))
    .notEmpty()
    .withMessage("Reason is required for reject, flag, or delete actions")
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage("Reason must be between 10 and 500 characters")
    .escape(),

  body("notifyUser")
    .optional()
    .isBoolean()
    .withMessage("notifyUser must be a boolean")
    .toBoolean(),
];

/**
 * Activity log filters
 */

export const validateActivityLogFilters = [
  ...validatePagination,
  ...validateSort(["timestamp", "action", "userId"]),

  query("userId")
    .optional()
    .custom((value) => {
      const mongoose = require("mongoose");
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error("User ID must be a valid MongoDB ObjectId");
      }
      return true;
    }),

  query("action")
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Action must be between 2 and 100 characters")
    .escape(),

  query("resourceType")
    .optional()
    .isIn(["user", "event", "order", "venue", "blog", "review"])
    .withMessage(
      "Resource type must be one of: user, event, order, venue, blog, review",
    ),

  query("startDate")
    .optional()
    .isISO8601()
    .withMessage("Start date must be a valid ISO 8601 date")
    .toDate(),

  query("endDate")
    .optional()
    .isISO8601()
    .withMessage("End date must be a valid ISO 8601 date")
    .toDate(),
];

/**
 * System settings validations
 */

export const validateSystemSettings = [
  body("settings").isObject().withMessage("Settings must be an object"),

  body("settings.maintenanceMode")
    .optional()
    .isBoolean()
    .withMessage("maintenanceMode must be a boolean")
    .toBoolean(),

  body("settings.allowRegistration")
    .optional()
    .isBoolean()
    .withMessage("allowRegistration must be a boolean")
    .toBoolean(),

  body("settings.defaultCommissionRate")
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage("Default commission rate must be between 0 and 100")
    .toFloat(),

  body("settings.maxUploadSize")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Max upload size must be between 1 and 100 MB")
    .toInt(),
];

/**
 * Validate update event certificate types
 */
export const validateUpdateCertificateTypes = [
  body("certificateTypes")
    .isArray({ min: 0 })
    .withMessage("Certificate types must be an array"),

  body("certificateTypes.*.templateId")
    .optional()
    .isMongoId()
    .withMessage("Template ID must be a valid MongoDB ObjectId"),

  body("certificateTypes.*.name")
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Certificate type name cannot exceed 100 characters"),

  body("certificateTypes.*.slug")
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage("Certificate type slug cannot exceed 50 characters")
    .matches(/^[a-z0-9-]+$/)
    .withMessage("Certificate type slug can only contain lowercase letters, numbers, and hyphens"),

  body("certificateTypes.*.isDefault")
    .optional()
    .isBoolean()
    .withMessage("isDefault must be a boolean")
    .toBoolean(),

  body("certificateTypes.*.description")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Description cannot exceed 500 characters"),

  body("certificateTypes.*.criteria")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Criteria cannot exceed 1000 characters"),

  body("certificateTypes.*.sortOrder")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Sort order must be a non-negative integer")
    .toInt(),
];

/**
 * Export all admin validators
 */
export default {
  // User management
  validateGetAllUsers,
  validateCreateUser,
  validateUpdateUser,
  validateUpdateUserStatus,
  validateUpdateUserRole,
  validateBulkUpdateUsers,

  // Event management
  validateGetAllEvents,
  validateApproveEvent,
  validateRejectEvent,
  validateChangeEventVendor,
  validateBulkUpdateEvents,

  // Dashboard
  validateDashboardDateRange,

  // Moderation
  validateModerationAction,
  validateActivityLogFilters,

  // System settings
  validateSystemSettings,

  // Event certificate types
  validateUpdateCertificateTypes,
};
