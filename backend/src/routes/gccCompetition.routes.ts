import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import { publicFormLimiter } from "../middleware/rateLimiter";
import { UserRole } from "../models/index";
import { handleUploadError, uploadFields } from "../middleware/upload";
import {
  registerParticipant,
  createCheckoutSession,
  finalizeSubmission,
  lookupSubmissionByRef,
  submitStory,
  handleSchoolBulkInquiry,
  getSubmissions,
  updateSubmissionStatus,
  deleteSubmission,
  generateSubmissionCertificate,
  downloadStoryFile,
} from "../controllers/gccCompetition.controller";

const router = Router();

// Public routes
router.post("/register", publicFormLimiter("gcc-register"), registerParticipant);
router.post("/create-checkout-session", publicFormLimiter("gcc-checkout"), createCheckoutSession);
router.post("/finalize", publicFormLimiter("gcc-finalize"), finalizeSubmission);
router.get("/lookup/:refNo", publicFormLimiter("gcc-lookup"), lookupSubmissionByRef);
router.post(
  "/submit-story",
  publicFormLimiter("gcc-submit-story"), // before the upload is accepted
  uploadFields([{ name: "storyFile", maxCount: 1 }]),
  handleUploadError,
  submitStory
);
router.post("/school-inquiry", publicFormLimiter("gcc-school-inquiry"), handleSchoolBulkInquiry);

// Admin-only management routes
router.get("/submissions", authenticate, authorize([UserRole.ADMIN]), getSubmissions);
router.patch("/submissions/:id/status", authenticate, authorize([UserRole.ADMIN]), updateSubmissionStatus);
router.delete("/submissions/:id", authenticate, authorize([UserRole.ADMIN]), deleteSubmission);
router.post("/submissions/:id/certificate", authenticate, authorize([UserRole.ADMIN]), generateSubmissionCertificate);
// Manuscripts are minors' work: admin only (the admin UI opens this with its session cookie).
router.get("/submissions/:id/file", authenticate, authorize([UserRole.ADMIN]), downloadStoryFile);

export default router;
