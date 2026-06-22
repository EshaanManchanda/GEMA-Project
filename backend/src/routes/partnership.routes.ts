import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { validateRequest } from "../middleware/validation";
import {
  submitPartnership,
  getAllPartnerships,
  getPartnershipById,
  updatePartnershipStatus,
  updatePartnership,
  deletePartnership,
  getPartnershipStats,
  getPublicDirectory,
  getPublicPartnershipById,
} from "../controllers/partnership.controller";
import {
  submitPartnershipValidation,
  getAllPartnershipsValidation,
  getPartnershipByIdValidation,
  updatePartnershipStatusValidation,
  updatePartnershipValidation,
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

// Public route - Get approved partnerships directory
router.get("/directory", getPublicDirectory);

// Public route - Get single approved partnership
router.get("/directory/:id", getPublicPartnershipById);

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

// Update full partnership details (admin only)
router.put(
  "/:id",
  updatePartnershipValidation,
  validateRequest,
  updatePartnership,
);

// Delete partnership submission (admin only)
router.delete(
  "/:id",
  deletePartnershipValidation,
  validateRequest,
  deletePartnership,
);

export default router;
