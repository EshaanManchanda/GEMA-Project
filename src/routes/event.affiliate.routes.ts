import { Router } from "express";
import {
  trackAffiliateClick,
  claimAffiliateEvent,
  getClaimedEvents,
  getAffiliateAnalytics,
  getEventAnalytics,
} from "../controllers/event.affiliate.controller";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

/**
 * Public routes
 */
// Track click on affiliate event (public - no auth required)
router.post("/events/:id/track-click", trackAffiliateClick);

// Get single event analytics (public for now, can be restricted)
router.get("/events/:id/analytics", getEventAnalytics);

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
