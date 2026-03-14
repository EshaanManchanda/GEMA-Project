import { body, param, query } from "express-validator";
import {
  validateEmail,
  validatePhone,
  validatePagination,
  validateSort,
  validateSearch,
  validateMongoId,
  validateEnum,
  validateStringLength,
  validateArray,
} from "./common.validator";

/**
 * Vendor Employee Management Validation Rules
 */

// Allowed values for employee fields
const EMPLOYEE_ROLES = ["manager", "scanner", "coordinator", "security"];
const EMPLOYEE_STATUSES = ["active", "inactive", "suspended"];
const PERMISSION_ACTIONS = [
  "scan_tickets",
  "manage_bookings",
  "view_reports",
  "manage_employees",
  "manage_events",
  "manage_payouts",
  "view_analytics",
];
const PERMISSION_SCOPES = ["all", "assigned"];
const SORT_FIELDS = [
  "createdAt",
  "firstName",
  "lastName",
  "role",
  "email",
  "hiredAt",
  "status",
];

/**
 * Validate employee list query parameters
 */
export const validateEmployeeListQuery = [
  ...validatePagination,
  ...validateSort(SORT_FIELDS),
  ...validateSearch,
  query("role")
    .optional()
    .isIn([...EMPLOYEE_ROLES, "all"])
    .withMessage(`role must be one of: ${EMPLOYEE_ROLES.join(", ")}, or 'all'`),
  query("status")
    .optional()
    .isIn([...EMPLOYEE_STATUSES, "all"])
    .withMessage(
      `status must be one of: ${EMPLOYEE_STATUSES.join(", ")}, or 'all'`,
    ),
  query("assignedEvent")
    .optional()
    .custom((value) => {
      const mongoose = require("mongoose");
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error("assignedEvent must be a valid event ID");
      }
      return true;
    }),
];

/**
 * Validate employee creation
 */
export const validateCreateEmployee = [
  body("firstName")
    .trim()
    .notEmpty()
    .withMessage("First name is required")
    .isLength({ min: 1, max: 50 })
    .withMessage("First name must be between 1 and 50 characters")
    .escape(),

  body("lastName")
    .trim()
    .notEmpty()
    .withMessage("Last name is required")
    .isLength({ min: 1, max: 50 })
    .withMessage("Last name must be between 1 and 50 characters")
    .escape(),

  validateEmail("email", true),

  validatePhone("phone", false),

  validateEnum("role", EMPLOYEE_ROLES, true),

  body("employeeId")
    .optional()
    .trim()
    .isLength({ min: 1, max: 20 })
    .withMessage("Employee ID must be between 1 and 20 characters")
    .matches(/^[A-Za-z0-9-]+$/)
    .withMessage("Employee ID can only contain letters, numbers, and hyphens"),

  body("permissions")
    .optional()
    .isArray()
    .withMessage("Permissions must be an array")
    .custom((permissions) => {
      if (!Array.isArray(permissions)) return true;

      for (const perm of permissions) {
        if (typeof perm !== "object" || !perm.action || !perm.scope) {
          throw new Error(
            "Each permission must have action and scope properties",
          );
        }

        if (!PERMISSION_ACTIONS.includes(perm.action)) {
          throw new Error(
            `Invalid permission action: ${perm.action}. Must be one of: ${PERMISSION_ACTIONS.join(", ")}`,
          );
        }

        if (!PERMISSION_SCOPES.includes(perm.scope)) {
          throw new Error(
            `Invalid permission scope: ${perm.scope}. Must be one of: ${PERMISSION_SCOPES.join(", ")}`,
          );
        }
      }

      return true;
    }),

  body("assignedEvents")
    .optional()
    .isArray()
    .withMessage("Assigned events must be an array")
    .custom((eventIds) => {
      if (!Array.isArray(eventIds)) return true;

      const mongoose = require("mongoose");
      for (const id of eventIds) {
        if (!mongoose.Types.ObjectId.isValid(id)) {
          throw new Error(`Invalid event ID: ${id}`);
        }
      }
      return true;
    }),

  body("assignedVenues")
    .optional()
    .isArray()
    .withMessage("Assigned venues must be an array")
    .custom((venueIds) => {
      if (!Array.isArray(venueIds)) return true;

      const mongoose = require("mongoose");
      for (const id of venueIds) {
        if (!mongoose.Types.ObjectId.isValid(id)) {
          throw new Error(`Invalid venue ID: ${id}`);
        }
      }
      return true;
    }),

  body("emergencyContact")
    .optional()
    .custom((contact) => {
      if (!contact) return true;

      if (typeof contact !== "object" || Array.isArray(contact)) {
        throw new Error("Emergency contact must be an object");
      }

      if (!contact.name || typeof contact.name !== "string") {
        throw new Error(
          "Emergency contact name is required and must be a string",
        );
      }

      if (contact.name.length < 2 || contact.name.length > 100) {
        throw new Error(
          "Emergency contact name must be between 2 and 100 characters",
        );
      }

      if (!contact.phone || typeof contact.phone !== "string") {
        throw new Error(
          "Emergency contact phone is required and must be a string",
        );
      }

      if (contact.relationship && typeof contact.relationship !== "string") {
        throw new Error("Emergency contact relationship must be a string");
      }

      return true;
    }),

  body("hiredAt")
    .optional()
    .isISO8601()
    .withMessage("Hired date must be a valid ISO 8601 date")
    .toDate()
    .custom((value) => {
      const hiredDate = new Date(value);
      const now = new Date();
      const futureLimit = new Date();
      futureLimit.setDate(futureLimit.getDate() + 365);

      if (hiredDate > futureLimit) {
        throw new Error("Hired date cannot be more than 1 year in the future");
      }

      return true;
    }),

  body("status")
    .optional()
    .isIn(EMPLOYEE_STATUSES)
    .withMessage(`Status must be one of: ${EMPLOYEE_STATUSES.join(", ")}`),
];

/**
 * Validate employee update
 */
export const validateUpdateEmployee = [
  validateMongoId("id", "param"),

  body("firstName")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("First name cannot be empty")
    .isLength({ min: 1, max: 50 })
    .withMessage("First name must be between 1 and 50 characters")
    .escape(),

  body("lastName")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Last name cannot be empty")
    .isLength({ min: 1, max: 50 })
    .withMessage("Last name must be between 1 and 50 characters")
    .escape(),

  validatePhone("phone", false),

  body("role")
    .optional()
    .isIn(EMPLOYEE_ROLES)
    .withMessage(`Role must be one of: ${EMPLOYEE_ROLES.join(", ")}`),

  body("permissions")
    .optional()
    .isArray()
    .withMessage("Permissions must be an array")
    .custom((permissions) => {
      if (!Array.isArray(permissions)) return true;

      for (const perm of permissions) {
        if (typeof perm !== "object" || !perm.action || !perm.scope) {
          throw new Error(
            "Each permission must have action and scope properties",
          );
        }

        if (!PERMISSION_ACTIONS.includes(perm.action)) {
          throw new Error(`Invalid permission action: ${perm.action}`);
        }

        if (!PERMISSION_SCOPES.includes(perm.scope)) {
          throw new Error(`Invalid permission scope: ${perm.scope}`);
        }
      }

      return true;
    }),

  body("assignedEvents")
    .optional()
    .isArray()
    .withMessage("Assigned events must be an array")
    .custom((eventIds) => {
      if (!Array.isArray(eventIds)) return true;

      const mongoose = require("mongoose");
      for (const id of eventIds) {
        if (!mongoose.Types.ObjectId.isValid(id)) {
          throw new Error(`Invalid event ID: ${id}`);
        }
      }
      return true;
    }),

  body("assignedVenues")
    .optional()
    .isArray()
    .withMessage("Assigned venues must be an array")
    .custom((venueIds) => {
      if (!Array.isArray(venueIds)) return true;

      const mongoose = require("mongoose");
      for (const id of venueIds) {
        if (!mongoose.Types.ObjectId.isValid(id)) {
          throw new Error(`Invalid venue ID: ${id}`);
        }
      }
      return true;
    }),

  body("status")
    .optional()
    .isIn(EMPLOYEE_STATUSES)
    .withMessage(`Status must be one of: ${EMPLOYEE_STATUSES.join(", ")}`),

  body("emergencyContact")
    .optional()
    .custom((contact) => {
      if (!contact) return true;

      if (typeof contact !== "object" || Array.isArray(contact)) {
        throw new Error("Emergency contact must be an object");
      }

      if (
        contact.name &&
        (typeof contact.name !== "string" ||
          contact.name.length < 2 ||
          contact.name.length > 100)
      ) {
        throw new Error(
          "Emergency contact name must be between 2 and 100 characters",
        );
      }

      if (contact.phone && typeof contact.phone !== "string") {
        throw new Error("Emergency contact phone must be a string");
      }

      if (contact.relationship && typeof contact.relationship !== "string") {
        throw new Error("Emergency contact relationship must be a string");
      }

      return true;
    }),
];

/**
 * Validate assign employee to events
 */
export const validateAssignEvents = [
  validateMongoId("id", "param"),

  body("eventIds")
    .notEmpty()
    .withMessage("eventIds is required")
    .isArray({ min: 1 })
    .withMessage("eventIds must be a non-empty array")
    .custom((eventIds) => {
      const mongoose = require("mongoose");
      for (const id of eventIds) {
        if (!mongoose.Types.ObjectId.isValid(id)) {
          throw new Error(`Invalid event ID: ${id}`);
        }
      }
      return true;
    }),
];

/**
 * Validate export employees request
 */
export const validateExportEmployees = [
  body("format")
    .optional()
    .isIn(["csv", "json"])
    .withMessage("Format must be either csv or json"),

  body("filters")
    .optional()
    .isObject()
    .withMessage("Filters must be an object")
    .custom((filters) => {
      if (!filters) return true;

      if (filters.role && !EMPLOYEE_ROLES.includes(filters.role)) {
        throw new Error(`Invalid role filter: ${filters.role}`);
      }

      if (filters.status && !EMPLOYEE_STATUSES.includes(filters.status)) {
        throw new Error(`Invalid status filter: ${filters.status}`);
      }

      if (filters.assignedEvent) {
        const mongoose = require("mongoose");
        if (!mongoose.Types.ObjectId.isValid(filters.assignedEvent)) {
          throw new Error("Invalid assignedEvent filter: must be a valid ID");
        }
      }

      if (filters.search && typeof filters.search !== "string") {
        throw new Error("Search filter must be a string");
      }

      return true;
    }),
];

/**
 * Validate get single employee by ID
 */
export const validateGetEmployeeById = [validateMongoId("id", "param")];

/**
 * Validate delete employee
 */
export const validateDeleteEmployee = [
  validateMongoId("id", "param"),
  query("hard")
    .optional()
    .isBoolean()
    .withMessage("hard parameter must be a boolean")
    .toBoolean(),
];

/**
 * Validate remove employee from event
 */
export const validateRemoveFromEvent = [
  validateMongoId("id", "param"),
  body("eventId")
    .notEmpty()
    .withMessage("eventId is required")
    .custom((value) => {
      const mongoose = require("mongoose");
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error("eventId must be a valid ID");
      }
      return true;
    }),
];

// Export all validators as a convenience
export default {
  validateEmployeeListQuery,
  validateCreateEmployee,
  validateUpdateEmployee,
  validateAssignEvents,
  validateExportEmployees,
  validateGetEmployeeById,
  validateDeleteEmployee,
  validateRemoveFromEvent,
};
