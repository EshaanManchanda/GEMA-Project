import { Router } from "express";
import {
  claimAffiliateVenue,
  getClaimedVenues,
  getVenueAffiliateAnalytics,
} from "../controllers/venue.affiliate.controller";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

// Public track-click/analytics live in venue.routes.ts: mounted here they
// were unreachable, because /venues hits that router's authenticate first.

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
