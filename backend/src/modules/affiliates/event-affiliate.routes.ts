import { Router } from "express";
import {
  trackAffiliateClick,
  claimAffiliateEvent,
  getClaimedEvents,
  getAffiliateAnalytics,
  getEventAnalytics,
} from "./event-affiliates.controller";
import { authenticate, authorize } from "../../middleware/auth";
import { UserRole } from "../../models/index";

const router = Router();

router.post("/events/:id/track-click", trackAffiliateClick);

router.get("/events/:id/analytics", getEventAnalytics);

router.post(
  "/vendor/events/:id/claim",
  authenticate,
  authorize([UserRole.VENDOR]),
  claimAffiliateEvent,
);

router.get(
  "/vendor/claimed-events",
  authenticate,
  authorize([UserRole.VENDOR]),
  getClaimedEvents,
);

router.get(
  "/admin/affiliate-analytics",
  authenticate,
  authorize([UserRole.ADMIN]),
  getAffiliateAnalytics,
);

export default router;
