import { Router } from 'express';
import { authenticate, authorize, validate, adminLimiter } from '../middleware/index';
import { UserRole } from '../models/index';
import {
  getDashboardStats,
  getRecentActivity,
  getTopPerformers,
  getSystemHealth,
} from '../controllers/admin.dashboard.controller';
import { validateDashboardDateRange } from '../validators/admin.validator';
import { validatePagination } from '../validators/common.validator';

const router = Router();

// Middleware: All routes require authentication and admin role
router.use(authenticate);
router.use(authorize([UserRole.ADMIN]));
router.use(adminLimiter);

/**
 * @route   GET /api/admin/dashboard/stats
 * @desc    Get comprehensive dashboard statistics
 * @access  Admin only
 * @query   startDate, endDate, period
 */
router.get('/stats', validateDashboardDateRange, validate, getDashboardStats);

/**
 * @route   GET /api/admin/dashboard/activity
 * @desc    Get recent activity logs
 * @access  Admin only
 * @query   page, limit
 */
router.get('/activity', validatePagination, validate, getRecentActivity);

/**
 * @route   GET /api/admin/dashboard/top-performers
 * @desc    Get top performing vendors, events, and customers
 * @access  Admin only
 */
router.get('/top-performers', getTopPerformers);

/**
 * @route   GET /api/admin/dashboard/system-health
 * @desc    Get system health and status
 * @access  Admin only
 */
router.get('/system-health', getSystemHealth);

export default router;
