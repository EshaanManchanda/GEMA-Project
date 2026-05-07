import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { validateRequest } from "../middleware/validation";
import {
  submitPartnership,
  getAllPartnerships,
  getPartnershipById,
  updatePartnershipStatus,
  deletePartnership,
  getPartnershipStats,
} from "../controllers/partnership.controller";
import {
  submitPartnershipValidation,
  getAllPartnershipsValidation,
  getPartnershipByIdValidation,
  updatePartnershipStatusValidation,
  deletePartnershipValidation,
} from "../validators/partnership.validator";

const router = Router();

// Public route - Submit partnership form
router.post(
  "/",
  submitPartnershipValidation,
  validateRequest,
  submitPartnership,
);

// Protected admin routes
router.use(authenticate); // All routes below require authentication

// Get all partnership submissions (admin only)
router.get(
  "/",
  getAllPartnershipsValidation,
  validateRequest,
  getAllPartnerships,
);

// Get partnership statistics (admin only)
router.get("/stats", getPartnershipStats);

// Get single partnership by ID (admin only)
router.get(
  "/:id",
  getPartnershipByIdValidation,
  validateRequest,
  getPartnershipById,
);

// Update partnership status (admin only)
router.patch(
  "/:id",
  updatePartnershipStatusValidation,
  validateRequest,
  updatePartnershipStatus,
);

// Delete partnership submission (admin only)
router.delete(
  "/:id",
  deletePartnershipValidation,
  validateRequest,
  deletePartnership,
);

export default router;
