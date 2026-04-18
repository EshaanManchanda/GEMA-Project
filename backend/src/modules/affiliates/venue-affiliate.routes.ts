import { Router } from "express";
import {
  trackAffiliateClick,
  claimAffiliateVenue,
  getClaimedVenues,
  getVenueAffiliateAnalytics,
  getVenueAnalytics,
} from "./venue-affiliates.controller";
import { authenticate, authorize } from "../../middleware/auth";
import { UserRole } from "../../models/index";

const router = Router();

router.post("/venues/:id/track-click", trackAffiliateClick);
router.get("/venues/:id/analytics", getVenueAnalytics);

router.post(
  "/vendor/venues/:id/claim",
  authenticate,
  authorize([UserRole.VENDOR]),
  claimAffiliateVenue,
);
router.get(
  "/vendor/claimed-venues",
  authenticate,
  authorize([UserRole.VENDOR]),
  getClaimedVenues,
);

router.get(
  "/admin/venue-affiliate-analytics",
  authenticate,
  authorize([UserRole.ADMIN]),
  getVenueAffiliateAnalytics,
);

export default router;
