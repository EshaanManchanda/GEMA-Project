import { Router } from "express";
import {
  createVenue,
  getVendorVenues,
  getVenueDetails,
  updateVenue,
  deleteVenue,
  getPublicVenueBySlug,
  getPublicVenues,
} from "../controllers/venue.controller";
import { authenticate, authorize } from "../middleware/auth";
import { validate } from "../middleware/validation";
import { UserRole } from "../models/index";
import {
  validateCreateVenue,
  validateUpdateVenue,
  validateVenueId,
} from "../validators/venue.validator";

const router = Router();

// ==================== PUBLIC ROUTES (no auth) ====================

// List public venues
router.get("/public", getPublicVenues);

// Get public venue detail by slug
router.get("/public/:slug", getPublicVenueBySlug);

// ==================== AUTHENTICATED ROUTES ====================

// All routes below require authentication
router.use(authenticate);

// List vendor's own venues (paginated)
router.get("/", authorize([UserRole.VENDOR, UserRole.ADMIN]), getVendorVenues);

// Create Venue
router.post(
  "/",
  authorize([UserRole.VENDOR, UserRole.ADMIN]),
  validateCreateVenue,
  validate,
  createVenue,
);

// Get Venue Details
router.get(
  "/:venueId",
  authorize([UserRole.VENDOR, UserRole.ADMIN, UserRole.EMPLOYEE]),
  validateVenueId,
  validate,
  getVenueDetails,
);

// Update Venue
router.put(
  "/:venueId",
  authorize([UserRole.VENDOR, UserRole.ADMIN]),
  validateVenueId,
  validateUpdateVenue,
  validate,
  updateVenue,
);

// Delete Venue (soft delete)
router.delete(
  "/:venueId",
  authorize([UserRole.VENDOR, UserRole.ADMIN]),
  validateVenueId,
  validate,
  deleteVenue,
);

export default router;
