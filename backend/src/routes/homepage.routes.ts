import { Router } from "express";
import {
  getHomepageData,
  invalidateHomepageCache,
} from "../controllers/homepage.controller";
import { authenticate, authorize } from "../middleware/auth";
import { UserRole } from "../models/index";

const router = Router();

// Public route - get all homepage data
router.get("/", getHomepageData);

// Admin route - invalidate cache (requires admin)
router.post(
  "/invalidate-cache",
  authenticate,
  authorize([UserRole.ADMIN]),
  invalidateHomepageCache,
);

export default router;
