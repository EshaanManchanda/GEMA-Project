import express from 'express';
import {
  getRevenueDashboard,
  getRevenueTransactions,
  createRevenueTransaction,
  updateRevenueTransaction,
  processVendorPayouts,
  getSubscriptionAnalytics,
  getAdvertisingAnalytics,
  getRevenueSettings,
  updateRevenueSettings,
  generateRevenueReport
} from '../controllers/admin.revenue.controller';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '../models/User';

const router = express.Router();

// Apply authentication and admin authorization to all routes
router.use(authenticate);
router.use(authorize([UserRole.ADMIN]));

/**
 * Revenue Dashboard Routes
 */

// GET /api/admin/revenue/dashboard - Get revenue dashboard overview
router.get('/dashboard', getRevenueDashboard);

// GET /api/admin/revenue/transactions - Get all revenue transactions with filtering
router.get('/transactions', getRevenueTransactions);

// POST /api/admin/revenue/transactions - Create manual revenue transaction
router.post('/transactions', createRevenueTransaction);

// PUT /api/admin/revenue/transactions/:id - Update revenue transaction
router.put('/transactions/:id', updateRevenueTransaction);

/**
 * Payout Management Routes
 */

// POST /api/admin/revenue/payouts/process - Process vendor payouts
router.post('/payouts/process', processVendorPayouts);

/**
 * Analytics Routes
 */

// GET /api/admin/revenue/analytics/subscriptions - Get subscription analytics
router.get('/analytics/subscriptions', getSubscriptionAnalytics);

// GET /api/admin/revenue/analytics/advertising - Get advertising analytics
router.get('/analytics/advertising', getAdvertisingAnalytics);

/**
 * Settings Routes
 */

// GET /api/admin/revenue/settings - Get revenue settings
router.get('/settings', getRevenueSettings);

// PUT /api/admin/revenue/settings - Update revenue settings
router.put('/settings', updateRevenueSettings);

/**
 * Reporting Routes
 */

// GET /api/admin/revenue/reports/generate - Generate revenue report
router.get('/reports/generate', generateRevenueReport);

export default router;