import express from "express";
import { authenticate } from "../../middleware/auth";
import { authorize } from "../../middleware/auth";
import { UserRole } from "../../models/index";
import { createCustomLimiter } from "../../middleware/rateLimiter";
import {
  validateBulkImport,
  executeBulkImport,
  exportBulkData,
  getSupportedModels,
  getBulkImportStats,
} from "./admin-bulk-import.controller";
import {
  validateCategoryImport,
  validateCategoryExportFilters,
} from "../../validators/bulk-import/category.validator";
import {
  validateUserImport,
  validateUserExportFilters,
} from "../../validators/bulk-import/user.validator";

const router = express.Router();

/**
 * Custom rate limiter for bulk operations
 * More restrictive than general admin limiter
 */
const bulkImportLimiter = createCustomLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 operations per hour
  message: "Too many bulk import/export operations. Try again later.",
  keyPrefix: "bulk-import",
});

/**
 * Apply auth middleware to all routes
 * Only admins can access bulk import/export
 */
router.use(authenticate);
router.use(authorize([UserRole.ADMIN]));
router.use(bulkImportLimiter);

/**
 * Get supported models
 * GET /api/admin/bulk-import/models
 */
router.get("/models", getSupportedModels);

/**
 * Get bulk import/export statistics
 * GET /api/admin/bulk-import/stats
 */
router.get("/stats", getBulkImportStats);

/**
 * Step 1: Validate import data
 * POST /api/admin/bulk-import/validate
 *
 * Body:
 * {
 *   "model": "Category" | "User" | "Event" | ...,
 *   "mode": "create" | "upsert",
 *   "matchBy": "slug" | "email" | "id" | ...,
 *   "data": [ {...}, {...}, ... ]
 * }
 */
router.post(
  "/validate",
  // Validator will be selected dynamically based on model in controller
  validateBulkImport,
);

/**
 * Step 2: Execute import after validation
 * POST /api/admin/bulk-import/execute
 *
 * Body:
 * {
 *   "validationId": "VAL-1234567890-ABC123",
 *   "confirmedAt": "2024-05-20T14:30:00Z"
 * }
 */
router.post("/execute", executeBulkImport);

/**
 * Export data for Category model
 * POST /api/admin/bulk-export/Category
 */
router.post(
  "/export/Category",
  validateCategoryExportFilters,
  (req, res, next) => {
    req.params.model = "Category";
    next();
  },
  exportBulkData,
);

/**
 * Export data for User model
 * POST /api/admin/bulk-export/User
 */
router.post(
  "/export/User",
  validateUserExportFilters,
  (req, res, next) => {
    req.params.model = "User";
    next();
  },
  exportBulkData,
);

/**
 * Generic export endpoint (validates model in controller)
 * POST /api/admin/bulk-export/:model
 */
router.post("/export/:model", exportBulkData);

export default router;
