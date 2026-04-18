import { Router } from "express";
import {
  getHomepageData,
  invalidateHomepageCache,
} from "./homepage.controller";
import { authenticate, authorize } from "../../middleware/auth";
import { UserRole } from "../../models/index";

const router = Router();

router.get("/", getHomepageData);

router.post(
  "/invalidate-cache",
  authenticate,
  authorize([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  invalidateHomepageCache,
);

export default router;
