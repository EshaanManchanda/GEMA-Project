import { Router } from "express";
import {
  getHomepageData,
  invalidateHomepageCache,
} from "../controllers/homepage.controller";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

// Public route - get all homepage data
router.get("/", getHomepageData);

// Admin route - invalidate cache (requires admin/superadmin)
router.post(
  "/invalidate-cache",
  authenticate,
  authorize(["admin", "superadmin"]),
  invalidateHomepageCache,
);

export default router;
