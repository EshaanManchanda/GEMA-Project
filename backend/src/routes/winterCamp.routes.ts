import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import { publicFormLimiter } from "../middleware/rateLimiter";
import { UserRole } from "../models/index";
import {
  registerWinterCamp,
  getWinterCampRegistrations,
  updateWinterCampStatus,
  deleteWinterCampRegistration,
} from "../controllers/winterCamp.controller";

const router = Router();

// ── Public Routes ──────────────────────────────────────────────
router.post("/register", publicFormLimiter("winter-camp"), registerWinterCamp);

// ── Admin Protected Routes ────────────────────────────────────
router.get(
  "/registrations",
  authenticate,
  authorize([UserRole.ADMIN]),
  getWinterCampRegistrations
);

router.patch(
  "/registrations/:id/status",
  authenticate,
  authorize([UserRole.ADMIN]),
  updateWinterCampStatus
);

router.delete(
  "/registrations/:id",
  authenticate,
  authorize([UserRole.ADMIN]),
  deleteWinterCampRegistration
);

export default router;

