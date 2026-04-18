import { Router } from "express";
import { body, param, query } from "express-validator";
import { authenticate, authorize } from "../../middleware/auth";
import { validateRequest } from "../../middleware/validation";
import { UserRole } from "../../models/index";
import {
  createAdminRole,
  listAllAdmins,
  updateAdminRole,
  deleteAdminRole,
  suspendAdmin,
  reinstateAdmin,
  getSystemHealth,
  getDatabaseStats,
  getAuditLogs,
  getFeatureFlags,
  updateFeatureFlag,
  generateApiKey,
  listApiKeys,
  revokeApiKey,
  forceLogoutUser,
  bulkSuspendUsers,
} from "./super-admin.controller";

const router = Router();

// All routes require super_admin role
router.use(authenticate, authorize([UserRole.SUPER_ADMIN, UserRole.ADMIN]));

// Admin Management
router.post(
  "/admin-roles",
  [
    body("userId").isMongoId().withMessage("Valid user ID is required"),
    body("role").isIn(["admin", "moderator", "blog_writer", "support_agent", "content_manager", "finance_manager"]).withMessage("Invalid role"),
  ],
  validateRequest,
  createAdminRole,
);

router.get("/admin-roles", listAllAdmins);

router.put(
  "/admin-roles/:id",
  [param("id").isMongoId().withMessage("Invalid admin role ID")],
  validateRequest,
  updateAdminRole,
);

router.delete(
  "/admin-roles/:id",
  [param("id").isMongoId().withMessage("Invalid admin role ID")],
  validateRequest,
  deleteAdminRole,
);

router.post(
  "/admin-roles/:id/suspend",
  [param("id").isMongoId().withMessage("Invalid admin role ID"), body("reason").trim().notEmpty().withMessage("Reason is required")],
  validateRequest,
  suspendAdmin,
);

router.post(
  "/admin-roles/:id/reinstate",
  [param("id").isMongoId().withMessage("Invalid admin role ID")],
  validateRequest,
  reinstateAdmin,
);

// System Operations
router.get("/system/health", getSystemHealth);
router.get("/system/database-stats", getDatabaseStats);

router.get(
  "/system/audit-logs",
  [
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
    query("action").optional().isString(),
    query("actorId").optional().isMongoId(),
    query("startDate").optional().isISO8601(),
    query("endDate").optional().isISO8601(),
  ],
  validateRequest,
  getAuditLogs,
);

// Feature Flags
router.get("/settings/feature-flags", getFeatureFlags);

router.put(
  "/settings/feature-flags/:key",
  [param("key").trim().notEmpty().withMessage("Feature flag key is required"), body("value").isBoolean().withMessage("Value must be a boolean")],
  validateRequest,
  updateFeatureFlag,
);

// API Keys
router.post(
  "/api-keys",
  [body("name").trim().notEmpty().withMessage("API key name is required"), body("scopes").isArray({ min: 1 }).withMessage("At least one scope is required")],
  validateRequest,
  generateApiKey,
);

router.get("/api-keys", listApiKeys);

router.delete(
  "/api-keys/:id",
  [param("id").isMongoId().withMessage("Invalid API key ID")],
  validateRequest,
  revokeApiKey,
);

// User Management
router.post(
  "/users/:userId/force-logout",
  [param("userId").isMongoId().withMessage("Invalid user ID")],
  validateRequest,
  forceLogoutUser,
);

router.post(
  "/users/bulk-suspend",
  [body("userIds").isArray({ min: 1, max: 1000 }).withMessage("User IDs array is required (max 1000)"), body("reason").trim().notEmpty().withMessage("Reason is required")],
  validateRequest,
  bulkSuspendUsers,
);

export default router;
