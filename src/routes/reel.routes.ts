import express from "express";
import { validateRequest } from "../middleware/validation";
import {
  getReels,
  getReelById,
  incrementView,
  toggleLike,
} from "../controllers/reel.controller";
import {
  getReelsValidation,
  getReelValidation,
  incrementViewValidation,
  toggleLikeValidation,
} from "../validators/reel.validator";

const router = express.Router();

/**
 * @route   GET /api/reels
 * @desc    Get public reels (paginated)
 * @access  Public
 */
router.get("/", getReelsValidation, validateRequest, getReels);

/**
 * @route   GET /api/reels/:id
 * @desc    Get single public reel by ID
 * @access  Public
 */
router.get("/:id", getReelValidation, validateRequest, getReelById);

/**
 * @route   POST /api/reels/:id/view
 * @desc    Increment view count
 * @access  Public
 */
router.post(
  "/:id/view",
  incrementViewValidation,
  validateRequest,
  incrementView,
);

/**
 * @route   POST /api/reels/:id/like
 * @desc    Toggle like (increment or decrement)
 * @access  Public
 */
router.post("/:id/like", toggleLikeValidation, validateRequest, toggleLike);

export default router;
