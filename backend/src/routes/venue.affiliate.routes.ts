import { Router } from "express";
import {
  trackAffiliateClick,
  claimAffiliateVenue,
  getClaimedVenues,
  getVenueAffiliateAnalytics,
  getVenueAnalytics,
} from "../controllers/venue.affiliate.controller";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

/**
 * Public routes
 */
router.post("/venues/:id/track-click", trackAffiliateClick);
router.get("/venues/:id/analytics", getVenueAnalytics);

/**
 * Vendor routes
 */
router.post(
  "/vendor/venues/:id/claim",
  authenticate,
  authorize(["vendor"]),
  claimAffiliateVenue,
);
router.get(
  "/vendor/claimed-venues",
  authenticate,
  authorize(["vendor"]),
  getClaimedVenues,
);

/**
 * Admin routes
 */
router.get(
  "/admin/venue-affiliate-analytics",
  authenticate,
  authorize(["admin"]),
  getVenueAffiliateAnalytics,
);

export default router;
