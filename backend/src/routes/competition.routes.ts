import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import { UserRole } from "../models/index";
import { handleUploadError, uploadFields } from "../middleware/upload";
import {
  createPaymentIntent,
  saveDraftSubmission,
  createCheckoutSession,
  finalizeSubmission,
  submitCompetition,
  getSubmissions,
  getSubmissionById,
  updateSubmissionStatus,
  deleteSubmission,
  generateSubmissionCertificate,
} from "../controllers/competition.controller";

const router = Router();

// ─── Public Routes ────────────────────────────────────────────────────────────

/**
 * POST /api/competition/create-payment-intent
 * Create a Stripe payment intent for 50 AED (legacy inline flow)
 */
router.post("/create-payment-intent", createPaymentIntent);

/**
 * POST /api/competition/save-draft
 * Step 1 of secure payment flow: save form data + upload artwork.
 * Returns submissionId. Payment is NOT collected yet.
 */
router.post(
  "/save-draft",
  uploadFields([{ name: "artwork", maxCount: 1 }]),
  handleUploadError,
  saveDraftSubmission,
);

/**
 * POST /api/competition/create-checkout-session
 * Step 2 of secure payment flow: create a Stripe Checkout Session
 * for a saved draft submission. Returns { sessionUrl }.
 */
router.post("/create-checkout-session", createCheckoutSession);

/**
 * POST /api/competition/finalize
 * Step 3 of secure payment flow: called after Stripe redirects back.
 * Verifies payment, activates submission, sends confirmation email.
 * Body: { submissionId, sessionId }
 */
router.post("/finalize", finalizeSubmission);

/**
 * POST /api/competition/submit
 * Legacy: Submit a competition entry (multipart/form-data).
 */
router.post(
  "/submit",
  uploadFields([
    { name: "artwork", maxCount: 1 },
  ]),
  handleUploadError,
  submitCompetition,
);

// ─── Admin Routes ─────────────────────────────────────────────────────────────

router.use(authenticate, authorize([UserRole.ADMIN]));

/**
 * GET /api/competition/submissions
 * List all competition submissions (paginated, filterable).
 * Query: page, limit, status, emirate, grade
 */
router.get("/submissions", getSubmissions);

/**
 * GET /api/competition/submissions/:id
 * Get a single submission by ID.
 */
router.get("/submissions/:id", getSubmissionById);

/**
 * PATCH /api/competition/submissions/:id/status
 * Update submission status (pending / under_review / approved / winner / disqualified / rejected).
 * Body: { status, adminNotes? }
 */
router.patch("/submissions/:id/status", updateSubmissionStatus);

/**
 * DELETE /api/competition/submissions/:id
 * Delete a submission.
 */
router.delete("/submissions/:id", deleteSubmission);

/**
 * POST /api/competition/submissions/:id/certificate
 * Generate a certificate for a submission (Admin only).
 * Body: { templateId }
 */
router.post("/submissions/:id/certificate", generateSubmissionCertificate);

export default router;
