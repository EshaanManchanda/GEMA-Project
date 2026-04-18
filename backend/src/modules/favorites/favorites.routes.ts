import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import {
  getFavoriteEvents,
  addToFavorites,
  removeFromFavorites,
  checkIfFavorite,
} from "./favorites.controller";

const router = Router();

// All routes require authentication
router.use(authenticate);

// @route   GET /api/favorites/check/:eventId
// @desc    Check if event is in user's favorites
// @access  Private
// NOTE: must be before /:eventId to avoid route collision
router.get("/check/:eventId", checkIfFavorite);

// @route   GET /api/favorites
// @desc    Get user's favorite events
// @access  Private
router.get("/", getFavoriteEvents);

// @route   POST /api/favorites/:eventId
// @desc    Add event to favorites
// @access  Private
router.post("/:eventId", addToFavorites);

// @route   DELETE /api/favorites/:eventId
// @desc    Remove event from favorites
// @access  Private
router.delete("/:eventId", removeFromFavorites);

export default router;
