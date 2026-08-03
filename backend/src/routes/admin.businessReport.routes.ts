import { Router } from "express";
import { authenticate, authorize, validate, adminLimiter } from "../middleware/index";
import { UserRole } from "../models/index";
import {
  getOverview,
  getPromotionInput,
  upsertPromotionInput,
  getSnapshot,
  generateSnapshotHandler,
  updateSnapshotStatus,
  updateSnapshotNotes,
  bulkGenerate,
  getBulkGenerateProgress,
} from "../controllers/admin.businessReport.controller";
import {
  vendorIdParamValidation,
  overviewQueryValidation,
  promotionInputUpsertValidation,
  snapshotGenerateValidation,
  snapshotStatusValidation,
  snapshotNotesValidation,
  bulkGenerateValidation,
} from "../validators/businessReport.validator";

const router = Router();

// All routes here are admin-only. Vendor-self access (health, history,
// report download, task toggling) lives on the analytics router under
// /insights so it inherits that router's ad-blocker-safe canonical path.
router.use(authenticate);
router.use(authorize([UserRole.ADMIN]));
router.use(adminLimiter);

// @route   GET /api/admin/business-reports/overview
router.get("/overview", overviewQueryValidation, validate, getOverview);

// @route   GET/PUT /api/admin/business-reports/vendors/:vendorId/promotion-input
router.get(
  "/vendors/:vendorId/promotion-input",
  vendorIdParamValidation,
  validate,
  getPromotionInput,
);
router.put(
  "/vendors/:vendorId/promotion-input",
  promotionInputUpsertValidation,
  validate,
  upsertPromotionInput,
);

// @route   GET /api/admin/business-reports/vendors/:vendorId/snapshot
router.get(
  "/vendors/:vendorId/snapshot",
  vendorIdParamValidation,
  validate,
  getSnapshot,
);

// @route   POST /api/admin/business-reports/vendors/:vendorId/snapshot
router.post(
  "/vendors/:vendorId/snapshot",
  snapshotGenerateValidation,
  validate,
  generateSnapshotHandler,
);

// @route   PATCH /api/admin/business-reports/snapshots/:id/status
router.patch("/snapshots/:id/status", snapshotStatusValidation, validate, updateSnapshotStatus);

// @route   PUT /api/admin/business-reports/snapshots/:id/notes
router.put("/snapshots/:id/notes", snapshotNotesValidation, validate, updateSnapshotNotes);

// @route   POST /api/admin/business-reports/bulk-generate
router.post("/bulk-generate", bulkGenerateValidation, validate, bulkGenerate);

// @route   GET /api/admin/business-reports/bulk-generate/:jobId
router.get("/bulk-generate/:jobId", getBulkGenerateProgress);

export default router;
