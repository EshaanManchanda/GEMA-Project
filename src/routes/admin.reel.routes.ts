import express from "express";
import { authenticate, authorize } from "../middleware/auth";
import { validateRequest } from "../middleware/validation";
import { UserRole } from "../models/index";
import {
  getAllReels,
  getReelById,
  createReel,
  updateReel,
  deleteReel,
  updateVisibility,
  updateDisplayOrders,
} from "../controllers/admin.reel.controller";
import {
  createReelValidation,
  updateReelValidation,
  getReelValidation,
  deleteReelValidation,
  getAllReelsValidation,
  updateVisibilityValidation,
  updateDisplayOrdersValidation,
} from "../validators/reel.validator";

const router = express.Router();

// All routes require admin authentication
router.use(authenticate);
router.use(authorize([UserRole.ADMIN]));

/**
 * @route   GET /api/admin/reels
 * @desc    Get all reels with filters (admin)
 * @access  Admin only
 */
router.get("/", getAllReelsValidation, validateRequest, getAllReels);

/**
 * @route   GET /api/admin/reels/:id
 * @desc    Get single reel by ID (admin)
 * @access  Admin only
 */
router.get("/:id", getReelValidation, validateRequest, getReelById);

/**
 * @route   POST /api/admin/reels
 * @desc    Create new reel
 * @access  Admin only
 */
router.post("/", createReelValidation, validateRequest, createReel);

/**
 * @route   PUT /api/admin/reels/:id
 * @desc    Update reel
 * @access  Admin only
 */
router.put("/:id", updateReelValidation, validateRequest, updateReel);

/**
 * @route   DELETE /api/admin/reels/:id
 * @desc    Delete reel (hard delete)
 * @access  Admin only
 */
router.delete("/:id", deleteReelValidation, validateRequest, deleteReel);

/**
 * @route   PATCH /api/admin/reels/:id/visibility
 * @desc    Update reel visibility
 * @access  Admin only
 */
router.patch(
  "/:id/visibility",
  updateVisibilityValidation,
  validateRequest,
  updateVisibility,
);

/**
 * @route   PATCH /api/admin/reels/display-orders
 * @desc    Bulk update display orders
 * @access  Admin only
 */
router.patch(
  "/display-orders",
  updateDisplayOrdersValidation,
  validateRequest,
  updateDisplayOrders,
);

export default router;
