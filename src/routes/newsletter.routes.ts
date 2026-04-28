import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { validateRequest } from "../middleware/validation";
import {
  subscribe,
  unsubscribe,
  updatePreferences,
  getSubscriptionStatus,
  getSubscriberStats,
  getAllSubscribers,
  sendNewsletter,
  unsubscribeByToken,
} from "../controllers/newsletter.controller";
import {
  subscribeValidation,
  updatePreferencesValidation,
  unsubscribeByTokenValidation,
  unsubscribeValidation,
  sendNewsletterValidation,
} from "../validators/newsletter.validator";

const router = Router();

// Public route - Subscribe to newsletter
router.post("/subscribe", subscribeValidation, validateRequest, subscribe);

// Public route - Unsubscribe by token
router.get(
  "/unsubscribe/:token",
  unsubscribeByTokenValidation,
  validateRequest,
  unsubscribeByToken,
);

// Protected routes
router.use(authenticate);

// Get subscription status for authenticated user
router.get("/status", getSubscriptionStatus);

// Update subscription preferences
router.put(
  "/preferences",
  updatePreferencesValidation,
  validateRequest,
  updatePreferences,
);

// Unsubscribe authenticated user
router.post(
  "/unsubscribe",
  unsubscribeValidation,
  validateRequest,
  unsubscribe,
);

// Admin routes (require admin authentication)
router.get("/admin/stats", getSubscriberStats);
router.get("/admin/subscribers", getAllSubscribers);

router.post(
  "/admin/send",
  sendNewsletterValidation,
  validateRequest,
  sendNewsletter,
);

export default router;
