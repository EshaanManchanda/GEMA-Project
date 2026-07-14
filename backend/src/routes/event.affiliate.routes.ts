import { Router } from "express";
import {
  claimAffiliateEvent,
  getClaimedEvents,
  getAffiliateAnalytics,
} from "../controllers/event.affiliate.controller";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

// NOTE: /events/:id/track-click and /events/:id/analytics used to live here,
// but event.routes.ts is mounted at the same "/events" prefix ahead of this
// router and has its own blanket `router.use(authenticate)`, so requests to
// those paths never reached these public handlers — they now live directly
// in event.routes.ts, ahead of its authenticate gate.

/**
 * Vendor routes
 */
// Claim an affiliate event
router.post(
  "/vendor/events/:id/claim",
  authenticate,
  authorize(["vendor"]),
  claimAffiliateEvent,
);

// Get vendor's claimed events
router.get(
  "/vendor/claimed-events",
  authenticate,
  authorize(["vendor"]),
  getClaimedEvents,
);

/**
 * Admin routes
 */
// Get global affiliate analytics
router.get(
  "/admin/affiliate-analytics",
  authenticate,
  authorize(["admin"]),
  getAffiliateAnalytics,
);

export default router;
