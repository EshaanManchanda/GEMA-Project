import express from "express";
import {
  getTeacherRevenueDashboard,
  getTeacherRevenueTransactions,
  createTeacherRevenueTransaction,
  updateRevenueTransaction,
  processTeacherPayouts,
  getTeacherSubscriptionAnalytics,
  getTeacherAdvertisingAnalytics,
  getRevenueSettings,
  updateRevenueSettings,
  generateTeacherRevenueReport,
} from "../controllers/admin.teacher.revenue.controller";
import { authenticate, authorize } from "../middleware/auth";
import { UserRole } from "../models/User";

const router = express.Router();

// Apply authentication and admin authorization to all routes
router.use(authenticate);
router.use(authorize([UserRole.ADMIN]));

/**
 * Teacher Revenue Dashboard Routes
 */

// GET /api/admin/teacher-revenue/dashboard
router.get("/dashboard", getTeacherRevenueDashboard);

// GET /api/admin/teacher-revenue/transactions
router.get("/transactions", getTeacherRevenueTransactions);

// POST /api/admin/teacher-revenue/transactions
router.post("/transactions", createTeacherRevenueTransaction);

// PUT /api/admin/teacher-revenue/transactions/:id
router.put("/transactions/:id", updateRevenueTransaction);

/**
 * Payout Management Routes
 */

// POST /api/admin/teacher-revenue/payouts/process
router.post("/payouts/process", processTeacherPayouts);

/**
 * Analytics Routes
 */

// GET /api/admin/teacher-revenue/analytics/subscriptions
router.get("/analytics/subscriptions", getTeacherSubscriptionAnalytics);

// GET /api/admin/teacher-revenue/analytics/advertising
router.get("/analytics/advertising", getTeacherAdvertisingAnalytics);

/**
 * Settings Routes (Admin-global)
 */

// GET /api/admin/teacher-revenue/settings
router.get("/settings", getRevenueSettings);

// PUT /api/admin/teacher-revenue/settings
router.put("/settings", updateRevenueSettings);

/**
 * Reporting Routes
 */

// GET /api/admin/teacher-revenue/reports/generate
router.get("/reports/generate", generateTeacherRevenueReport);

export default router;
