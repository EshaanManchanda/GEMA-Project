import { Router } from "express";
import {
  authenticate,
  authorize,
  validate,
  adminLimiter,
} from "../../middleware/index";
import { UserRole } from "../../models/index";
import {
  getDashboardStats,
  getRecentActivity,
  getTopPerformers,
  getSystemHealth,
} from "./admin-dashboard.controller";
import { validateDashboardDateRange } from "../../validators/admin.validator";
import { validatePagination } from "../../validators/common.validator";

const router = Router();

router.use(authenticate);
router.use(authorize([UserRole.ADMIN]));
router.use(adminLimiter);

router.get("/stats", validateDashboardDateRange, validate, getDashboardStats);

router.get("/activity", validatePagination, validate, getRecentActivity);

router.get("/top-performers", getTopPerformers);

router.get("/system-health", getSystemHealth);

export default router;
