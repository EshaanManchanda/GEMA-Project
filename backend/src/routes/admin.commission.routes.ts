import express from 'express';
import {
  getCommissionConfigs,
  getCommissionConfig,
  createCommissionConfig,
  updateCommissionConfig,
  deleteCommissionConfig,
  setDefaultCommissionConfig,
  getCommissionTemplates,
  getCommissionTransactions,
  getCommissionTransaction,
  approveCommissionTransactions,
  rejectCommissionTransaction,
  recalculateCommissionTransaction,
  batchCalculateCommissions,
  getCommissionAnalytics,
  exportCommissionData,
  getCommissionStats,
  getPendingCommissions,
  bulkApproveCommissions,
  bulkRejectCommissions
} from '../controllers/admin.commission.controller';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '../models/User';

const router = express.Router();

// Apply authentication and admin authorization to all routes
router.use(authenticate);
router.use(authorize([UserRole.ADMIN]));

/**
 * Commission Configuration Routes
 */

// GET /api/admin/commissions - Get all commission configurations
router.get('/commissions', getCommissionConfigs);

// GET /api/admin/commissions/:id - Get commission configuration by ID
router.get('/commissions/:id', getCommissionConfig);

// POST /api/admin/commissions - Create commission configuration
router.post('/commissions', createCommissionConfig);

// PUT /api/admin/commissions/:id - Update commission configuration
router.put('/commissions/:id', updateCommissionConfig);

// DELETE /api/admin/commissions/:id - Delete commission configuration
router.delete('/commissions/:id', deleteCommissionConfig);

// PUT /api/admin/commissions/:id/set-default - Set commission configuration as default
router.put('/commissions/:id/set-default', setDefaultCommissionConfig);

// GET /api/admin/commission-templates - Get commission templates
router.get('/commission-templates', getCommissionTemplates);

/**
 * Commission Transaction Routes
 */

// GET /api/admin/commission-transactions - Get all commission transactions
router.get('/commission-transactions', getCommissionTransactions);

// GET /api/admin/commission-transactions/:id - Get commission transaction by ID
router.get('/commission-transactions/:id', getCommissionTransaction);

// PUT /api/admin/commission-transactions/approve - Approve commission transactions
router.put('/commission-transactions/approve', approveCommissionTransactions);

// PUT /api/admin/commission-transactions/:id/reject - Reject commission transaction
router.put('/commission-transactions/:id/reject', rejectCommissionTransaction);

// PUT /api/admin/commission-transactions/:id/recalculate - Recalculate commission transaction
router.put('/commission-transactions/:id/recalculate', recalculateCommissionTransaction);

/**
 * Commission Analytics & Stats Routes
 */

// GET /api/admin/commission-stats - Get commission statistics
router.get('/commission-stats', getCommissionStats);

// GET /api/admin/commission-analytics - Get commission analytics
router.get('/commission-analytics', getCommissionAnalytics);

// GET /api/admin/commission-pending - Get pending commissions
router.get('/commission-pending', getPendingCommissions);

/**
 * Commission Batch Operations Routes
 */

// POST /api/admin/commission-batch-calculate - Batch calculate commissions
router.post('/commission-batch-calculate', batchCalculateCommissions);

// POST /api/admin/commission-bulk-approve - Bulk approve commissions
router.post('/commission-bulk-approve', bulkApproveCommissions);

// POST /api/admin/commission-bulk-reject - Bulk reject commissions
router.post('/commission-bulk-reject', bulkRejectCommissions);

/**
 * Commission Export Routes
 */

// GET /api/admin/commission-export - Export commission data
router.get('/commission-export', exportCommissionData);

export default router;
