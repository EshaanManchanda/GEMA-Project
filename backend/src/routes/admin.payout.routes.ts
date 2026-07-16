import { Router } from "express";
import {
  getVendorEarnings,
  getVendorEarning,
  getPayoutRequests,
  getPayoutRequest,
  approvePayoutRequest,
  rejectPayoutRequest,
  processPayoutRequest,
  executePayout,
  bulkApprovePayouts,
  bulkRejectPayouts,
  getPayoutStats,
  getPayoutAnalytics,
  exportPayoutData,
  getPayoutBatches,
  generatePayoutBatches,
  getPayoutBatch,
  approvePayoutBatch,
  markPayoutBatchPaid,
  cancelPayoutBatch,
  exportPayoutBatch,
} from "../controllers/admin.payout.controller";
import { authenticate, authorize } from "../middleware/auth";
import { validateRequest } from "../middleware/validation";
import { query, param, body } from "express-validator";

const router = Router();

// Validation rules
const getVendorEarningsValidation = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
];

const getPayoutRequestsValidation = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
  query("status")
    .optional()
    .isIn(["all", "pending", "scheduled", "processing", "completed", "failed"])
    .withMessage("Invalid status"),
  query("vendorId")
    .optional()
    .isMongoId()
    .withMessage("Vendor ID must be valid"),
  query("sortBy")
    .optional()
    .isIn(["createdAt", "payoutDate", "amount"])
    .withMessage("Invalid sort field"),
  query("sortOrder")
    .optional()
    .isIn(["asc", "desc"])
    .withMessage("Sort order must be asc or desc"),
];

const payoutIdValidation = [
  param("id").isMongoId().withMessage("Payout ID must be valid"),
];

const vendorIdValidation = [
  param("vendorId").isMongoId().withMessage("Vendor ID must be valid"),
];

const approvePayoutValidation = [
  ...payoutIdValidation,
  body("payoutMethod")
    .optional()
    .isIn(["stripe", "bank_transfer", "paypal", "manual"])
    .withMessage("Invalid payout method"),
  body("notes")
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage("Notes cannot exceed 500 characters"),
];

const rejectPayoutValidation = [
  ...payoutIdValidation,
  body("reason")
    .isString()
    .isLength({ min: 1, max: 500 })
    .withMessage(
      "Rejection reason is required and cannot exceed 500 characters",
    ),
];

const processPayoutValidation = [
  ...payoutIdValidation,
  body("payoutMethod")
    .optional()
    .isIn(["manual", "bank_transfer", "other"])
    .withMessage("Invalid payout method"),
  body("paymentReference")
    .optional()
    .isString()
    .isLength({ max: 200 })
    .withMessage("Payment reference cannot exceed 200 characters"),
  body("notes")
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage("Notes cannot exceed 500 characters"),
];

const bulkApprovePayoutsValidation = [
  body("payoutIds")
    .isArray({ min: 1 })
    .withMessage("Payout IDs array is required"),
  body("payoutIds.*").isMongoId().withMessage("Each payout ID must be valid"),
  body("payoutMethod")
    .optional()
    .isIn(["stripe", "bank_transfer", "paypal", "manual"])
    .withMessage("Invalid payout method"),
];

const bulkRejectPayoutsValidation = [
  body("payoutIds")
    .isArray({ min: 1 })
    .withMessage("Payout IDs array is required"),
  body("payoutIds.*").isMongoId().withMessage("Each payout ID must be valid"),
  body("reason")
    .isString()
    .isLength({ min: 1, max: 500 })
    .withMessage(
      "Rejection reason is required and cannot exceed 500 characters",
    ),
];

const getPayoutStatsValidation = [
  query("period")
    .optional()
    .isIn(["week", "month", "quarter", "year"])
    .withMessage("Period must be week, month, quarter, or year"),
];

const getPayoutAnalyticsValidation = [
  query("startDate")
    .optional()
    .isISO8601()
    .withMessage("Start date must be a valid ISO 8601 date"),
  query("endDate")
    .optional()
    .isISO8601()
    .withMessage("End date must be a valid ISO 8601 date"),
  query("groupBy")
    .optional()
    .isIn(["day", "week", "month"])
    .withMessage("Group by must be day, week, or month"),
];

const exportPayoutDataValidation = [
  query("format")
    .optional()
    .isIn(["json", "csv"])
    .withMessage("Format must be json or csv"),
  query("startDate")
    .optional()
    .isISO8601()
    .withMessage("Start date must be a valid ISO 8601 date"),
  query("endDate")
    .optional()
    .isISO8601()
    .withMessage("End date must be a valid ISO 8601 date"),
  query("status")
    .optional()
    .isIn(["all", "pending", "scheduled", "processing", "completed", "failed"])
    .withMessage("Invalid status"),
  query("vendorId")
    .optional()
    .isMongoId()
    .withMessage("Vendor ID must be valid"),
];

// All admin payout routes require authentication and admin/superadmin role
router.use(authenticate);
router.use(authorize(["admin", "superadmin"]));

// Vendor earnings routes
router.get(
  "/vendor-earnings",
  getVendorEarningsValidation,
  validateRequest,
  getVendorEarnings,
);

router.get(
  "/vendor-earnings/:vendorId",
  vendorIdValidation,
  validateRequest,
  getVendorEarning,
);

// Payout request routes
router.get(
  "/payout-requests",
  getPayoutRequestsValidation,
  validateRequest,
  getPayoutRequests,
);

router.get(
  "/payout-requests/:id",
  payoutIdValidation,
  validateRequest,
  getPayoutRequest,
);

router.put(
  "/payout-requests/:id/approve",
  approvePayoutValidation,
  validateRequest,
  approvePayoutRequest,
);

router.put(
  "/payout-requests/:id/reject",
  rejectPayoutValidation,
  validateRequest,
  rejectPayoutRequest,
);

router.put(
  "/payout-requests/:id/process",
  processPayoutValidation,
  validateRequest,
  processPayoutRequest,
);

router.post(
  "/payout-requests/:id/execute",
  payoutIdValidation,
  validateRequest,
  executePayout,
);

// Bulk operations
router.post(
  "/payout-requests/bulk-approve",
  bulkApprovePayoutsValidation,
  validateRequest,
  bulkApprovePayouts,
);

router.post(
  "/payout-requests/bulk-reject",
  bulkRejectPayoutsValidation,
  validateRequest,
  bulkRejectPayouts,
);

// Analytics and stats
router.get(
  "/payout-stats",
  getPayoutStatsValidation,
  validateRequest,
  getPayoutStats,
);

router.get(
  "/payout-analytics",
  getPayoutAnalyticsValidation,
  validateRequest,
  getPayoutAnalytics,
);

// Export
router.get(
  "/payout-export",
  exportPayoutDataValidation,
  validateRequest,
  exportPayoutData,
);

// ─────────────────────────────────────────────────────────────────────────
// Monthly vendor payout batches
// ─────────────────────────────────────────────────────────────────────────

const generateBatchesValidation = [
  body("periodStart")
    .optional()
    .isISO8601()
    .withMessage("periodStart must be a valid ISO 8601 date"),
  body("periodEnd")
    .optional()
    .isISO8601()
    .withMessage("periodEnd must be a valid ISO 8601 date"),
];

const markBatchPaidValidation = [
  ...payoutIdValidation,
  body("paymentMethod")
    .isIn(["bank_transfer", "stripe_connect", "manual", "other"])
    .withMessage("Invalid payment method"),
  body("transactionReference")
    .optional()
    .isString()
    .isLength({ max: 200 })
    .withMessage("Transaction reference cannot exceed 200 characters"),
];

const cancelBatchValidation = [
  ...payoutIdValidation,
  body("reason")
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage("Reason cannot exceed 500 characters"),
];

// NOTE: this router is mounted at bare "/admin" (see routes/index.ts:
// `router.use("/admin", adminPayoutRoutes)`), unlike admin.teacher.payout.routes
// which is mounted at "/admin/teachers/payouts". The existing routes above
// (vendor-earnings, payout-requests, ...) are flat under /admin for that
// reason. The batch routes are explicitly namespaced under "/payouts/batches"
// here so they don't collide with an unrelated future "/admin/batches"
// resource — full paths are /api/admin/payouts/batches[...].
router.get("/payouts/batches", getPayoutBatches);
router.post(
  "/payouts/batches/generate",
  generateBatchesValidation,
  validateRequest,
  generatePayoutBatches,
);
router.get(
  "/payouts/batches/:id",
  payoutIdValidation,
  validateRequest,
  getPayoutBatch,
);
router.post(
  "/payouts/batches/:id/approve",
  payoutIdValidation,
  validateRequest,
  approvePayoutBatch,
);
router.post(
  "/payouts/batches/:id/mark-paid",
  markBatchPaidValidation,
  validateRequest,
  markPayoutBatchPaid,
);
router.post(
  "/payouts/batches/:id/cancel",
  cancelBatchValidation,
  validateRequest,
  cancelPayoutBatch,
);
router.get(
  "/payouts/batches/:id/export",
  payoutIdValidation,
  validateRequest,
  exportPayoutBatch,
);

export default router;
