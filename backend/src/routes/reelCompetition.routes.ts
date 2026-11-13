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
  submitReel,
  handleSchoolBulkInquiry,
  getSubmissions,
  updateSubmissionStatus,
  deleteSubmission,
  generateSubmissionCertificate,
} from "../controllers/reelCompetition.controller";

const router = Router();

// Public routes
router.post("/register", publicFormLimiter("reel-register"), registerParticipant);
router.post("/create-checkout-session", publicFormLimiter("reel-checkout"), createCheckoutSession);
router.post("/finalize", publicFormLimiter("reel-finalize"), finalizeSubmission);
router.get("/lookup/:refNo", publicFormLimiter("reel-lookup"), lookupSubmissionByRef);
router.post(
  "/submit-reel",
  publicFormLimiter("reel-submit-reel"), // before the upload is accepted
  uploadFields([{ name: "video", maxCount: 1 }]),
  handleUploadError,
  submitReel
);
router.post("/school-inquiry", publicFormLimiter("reel-school-inquiry"), handleSchoolBulkInquiry);

// Admin-only management routes
router.get("/submissions", authenticate, authorize([UserRole.ADMIN]), getSubmissions);
router.patch("/submissions/:id/status", authenticate, authorize([UserRole.ADMIN]), updateSubmissionStatus);
router.delete("/submissions/:id", authenticate, authorize([UserRole.ADMIN]), deleteSubmission);
router.post("/submissions/:id/certificate", authenticate, authorize([UserRole.ADMIN]), generateSubmissionCertificate);

export default router;

