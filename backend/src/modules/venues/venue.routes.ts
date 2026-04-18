import { Router } from "express";
import {
  createVenue,
  getVendorVenues,
  getVenueDetails,
  updateVenue,
  deleteVenue,
  getPublicVenueBySlug,
  getPublicVenues,
} from "./venue.controller";
import { authenticate, authorize } from "../../middleware/auth";
import { validate } from "../../middleware/validation";
import { UserRole } from "../../models/index";
import {
  validateCreateVenue,
  validateUpdateVenue,
  validateVenueId,
} from "./venue.validator";

const router = Router();

router.get("/public", getPublicVenues);

router.get("/public/:slug", getPublicVenueBySlug);

router.use(authenticate);

router.get("/", authorize([UserRole.VENDOR, UserRole.ADMIN]), getVendorVenues);

router.post(
  "/",
  authorize([UserRole.VENDOR, UserRole.ADMIN]),
  validateCreateVenue,
  validate,
  createVenue,
);

router.get(
  "/:venueId",
  authorize([UserRole.VENDOR, UserRole.ADMIN, UserRole.EMPLOYEE]),
  validateVenueId,
  validate,
  getVenueDetails,
);

router.put(
  "/:venueId",
  authorize([UserRole.VENDOR, UserRole.ADMIN]),
  validateVenueId,
  validateUpdateVenue,
  validate,
  updateVenue,
);

router.delete(
  "/:venueId",
  authorize([UserRole.VENDOR, UserRole.ADMIN]),
  validateVenueId,
  validate,
  deleteVenue,
);

export default router;
