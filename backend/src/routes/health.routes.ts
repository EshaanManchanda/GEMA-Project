import { Router } from "express";
import {
  getHealthStatus,
  getBasicHealthStatus,
  getRedisConnectionStats,
} from "../controllers/health.controller";
import { authenticate, authenticateOptional, authorize } from "../middleware/auth";
import { UserRole } from "../models/User";

const router = Router();

// Health check routes. `/` stays public (deploy checks + uptime monitors rely on
// its status code) but only admins see metrics; `/redis` exposes infra details.
router.get("/", authenticateOptional, getHealthStatus);
router.get("/basic", getBasicHealthStatus);
router.get("/redis", authenticate, authorize([UserRole.ADMIN]), getRedisConnectionStats);

export default router;
