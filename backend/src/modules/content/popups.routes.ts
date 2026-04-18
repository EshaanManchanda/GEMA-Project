import express from "express";
import {
  getActivePopups,
  recordImpression,
  recordClick,
  recordDismissal,
  getAllPopups,
  getPopupById,
  createPopup,
  updatePopup,
  deletePopup,
  updateDisplayOrders,
} from "./popups.controller";
import { authenticate, authorize } from "../../middleware/auth";
import { validateRequest } from "../../middleware/validation";
import { UserRole } from "../../models/index";
import {
  createPopupValidation,
  updatePopupValidation,
  getPopupValidation,
  deletePopupValidation,
  getAllPopupsValidation,
  updateDisplayOrdersValidation,
} from "../../validators/popup.validator";

const router = express.Router();

// Public routes
router.get("/active", getActivePopups);
router.post(
  "/:id/impression",
  getPopupValidation,
  validateRequest,
  recordImpression,
);
router.post("/:id/click", getPopupValidation, validateRequest, recordClick);
router.post(
  "/:id/dismiss",
  getPopupValidation,
  validateRequest,
  recordDismissal,
);

// Admin routes - require authentication and admin role
router.use(authenticate, authorize([UserRole.ADMIN]));
router.get("/", getAllPopupsValidation, validateRequest, getAllPopups);
router.get("/:id", getPopupValidation, validateRequest, getPopupById);
router.post("/", createPopupValidation, validateRequest, createPopup);
router.put("/:id", updatePopupValidation, validateRequest, updatePopup);
router.delete("/:id", deletePopupValidation, validateRequest, deletePopup);
router.patch(
  "/display-orders",
  updateDisplayOrdersValidation,
  validateRequest,
  updateDisplayOrders,
);

export default router;
