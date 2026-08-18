import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import { UserRole } from "../models/index";
import { handleUploadError, uploadFields } from "../middleware/upload";
import {
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
 * POST /api/competition/submit
 * Submit a competition entry (multipart/form-data).
 * - "artwork" field = the final artwork image (JPG/PNG, max 10 MB)
 * - All other fields are text fields in the form body.
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
