import express from "express";
import {
  getActiveAnnouncements,
  recordImpression,
  recordClick,
  recordDismissal,
  getAllAnnouncements,
  getAnnouncementById,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  updateDisplayOrders,
} from "./announcements.controller";
import { authenticate, authorize } from "../../middleware/auth";
import { validateRequest } from "../../middleware/validation";
import { UserRole } from "../../models/index";
import {
  createAnnouncementValidation,
  updateAnnouncementValidation,
  getAnnouncementValidation,
  deleteAnnouncementValidation,
  getAllAnnouncementsValidation,
  updateDisplayOrdersValidation,
} from "../../validators/announcementBar.validator";

const router = express.Router();

// Public routes
router.get("/active", getActiveAnnouncements);
router.post(
  "/:id/impression",
  getAnnouncementValidation,
  validateRequest,
  recordImpression,
);
router.post(
  "/:id/click",
  getAnnouncementValidation,
  validateRequest,
  recordClick,
);
router.post(
  "/:id/dismiss",
  getAnnouncementValidation,
  validateRequest,
  recordDismissal,
);

// Admin routes - require authentication and admin role
router.use(authenticate, authorize([UserRole.ADMIN]));
router.get(
  "/",
  getAllAnnouncementsValidation,
  validateRequest,
  getAllAnnouncements,
);
router.get(
  "/:id",
  getAnnouncementValidation,
  validateRequest,
  getAnnouncementById,
);
router.post(
  "/",
  createAnnouncementValidation,
  validateRequest,
  createAnnouncement,
);
router.put(
  "/:id",
  updateAnnouncementValidation,
  validateRequest,
  updateAnnouncement,
);
router.delete(
  "/:id",
  deleteAnnouncementValidation,
  validateRequest,
  deleteAnnouncement,
);
router.patch(
  "/display-orders",
  updateDisplayOrdersValidation,
  validateRequest,
  updateDisplayOrders,
);

export default router;
