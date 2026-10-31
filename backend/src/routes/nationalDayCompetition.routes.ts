import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import { UserRole } from "../models/index";
import { handleUploadError, uploadFields } from "../middleware/upload";
import {
  registerParticipant,
  saveDraftSubmission,
  createCheckoutSession,
  finalizeSubmission,
  lookupSubmissionByRef,
  submitArtwork,
  handleSchoolBulkInquiry,
  getSubmissions,
  updateSubmissionStatus,
  deleteSubmission,
  generateSubmissionCertificate,
  downloadArtwork,
} from "../controllers/nationalDayCompetition.controller";

const router = Router();

// ─── Public Submission & Checkout Routes ──────────────────────────────────────

/**
 * POST /api/national-day-competition/register
 * Phase 1: Save student and parent registration details (no artwork required).
 * Returns { submissionId, submissionRef, amount, currency }
 */
router.post("/register", registerParticipant);

/**
 * GET /api/national-day-competition/lookup/:refNo
 * Phase 2: Lookup paid registration by Reference No (or 24-char ObjectId).
 * Accepts optional ?email=parent@example.com for extra verification.
 */
router.get("/lookup/:refNo", lookupSubmissionByRef);

/**
 * POST /api/national-day-competition/submit-artwork
 * Phase 2: Upload completed artwork (multipart/form-data: artwork <= 1 MB).
 */
router.post(
  "/submit-artwork",
  uploadFields([{ name: "artwork", maxCount: 1 }]),
  handleUploadError,
  submitArtwork
);

/**
 * POST /api/national-day-competition/save-draft
 * Backward compatible alias for Phase 1 registration
 */
router.post(
  "/save-draft",
  uploadFields([{ name: "artwork", maxCount: 1 }]),
  handleUploadError,
  saveDraftSubmission
);

/**
 * POST /api/national-day-competition/create-checkout-session
 * Create Stripe Checkout Session for AED 50 (or AED 40 for bulk)
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

/**
 * GET /api/national-day-competition/submissions/:id/artwork
 * Proxies artwork file to prevent Cloudinary cross-origin raw file delivery issues in Chrome
 */
router.get("/submissions/:id/artwork", downloadArtwork);

export default router;
