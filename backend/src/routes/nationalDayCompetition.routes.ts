import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import { UserRole } from "../models/index";
import { handleUploadError, uploadFields } from "../middleware/upload";
import {
  saveDraftSubmission,
  createCheckoutSession,
  finalizeSubmission,
  handleSchoolBulkInquiry,
  getSubmissions,
  updateSubmissionStatus,
  deleteSubmission,
  generateSubmissionCertificate,
} from "../controllers/nationalDayCompetition.controller";

const router = Router();

// ─── Public Submission & Checkout Routes ──────────────────────────────────────

/**
 * POST /api/national-day-competition/save-draft
 * Save entry details + upload artwork (multipart/form-data).
 * Returns { submissionId, amount, currency }
 */
router.post(
  "/save-draft",
  uploadFields([{ name: "artwork", maxCount: 1 }]),
  handleUploadError,
  saveDraftSubmission
);

/**
 * POST /api/national-day-competition/create-checkout-session
 * Create Stripe Checkout Session for AED 35 (or AED 25 for bulk)
 */
router.post("/create-checkout-session", createCheckoutSession);

/**
 * POST /api/national-day-competition/finalize
 * Verify payment (or bypass in dev) and finalize entry
 */
router.post("/finalize", finalizeSubmission);

/**
 * POST /api/national-day-competition/school-inquiry
 * Register a school bulk registration interest
 */
router.post("/school-inquiry", handleSchoolBulkInquiry);

// ─── Admin Routes ─────────────────────────────────────────────────────────────

router.get(
  "/submissions",
  authenticate,
  authorize([UserRole.ADMIN]),
  getSubmissions
);

router.patch(
  "/submissions/:id/status",
  authenticate,
  authorize([UserRole.ADMIN]),
  updateSubmissionStatus
);

router.delete(
  "/submissions/:id",
  authenticate,
  authorize([UserRole.ADMIN]),
  deleteSubmission
);

router.post(
  "/submissions/:id/certificate",
  authenticate,
  authorize([UserRole.ADMIN]),
  generateSubmissionCertificate
);

export default router;
