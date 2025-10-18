import { Router } from 'express';
import {
  getVendorEarnings,
  getVendorEarning,
  getPayoutRequests,
  getPayoutRequest,
  approvePayoutRequest,
  rejectPayoutRequest,
  processPayoutRequest,
  bulkApprovePayouts,
  bulkRejectPayouts,
  getPayoutStats,
  getPayoutAnalytics,
  exportPayoutData
} from '../controllers/admin.payout.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { query, param, body } from 'express-validator';

const router = Router();

// Validation rules
const getVendorEarningsValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

const getPayoutRequestsValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('status')
    .optional()
    .isIn(['all', 'pending', 'scheduled', 'processing', 'completed', 'failed'])
    .withMessage('Invalid status'),
  query('vendorId')
    .optional()
    .isMongoId()
    .withMessage('Vendor ID must be valid'),
  query('sortBy')
    .optional()
    .isIn(['createdAt', 'payoutDate', 'amount'])
    .withMessage('Invalid sort field'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc')
];

const payoutIdValidation = [
  param('id').isMongoId().withMessage('Payout ID must be valid')
];

const vendorIdValidation = [
  param('vendorId').isMongoId().withMessage('Vendor ID must be valid')
];

const approvePayoutValidation = [
  ...payoutIdValidation,
  body('payoutMethod')
    .optional()
    .isIn(['stripe', 'bank_transfer', 'paypal', 'manual'])
    .withMessage('Invalid payout method'),
  body('notes')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters')
];

const rejectPayoutValidation = [
  ...payoutIdValidation,
  body('reason')
    .isString()
    .isLength({ min: 1, max: 500 })
    .withMessage('Rejection reason is required and cannot exceed 500 characters')
];

const processPayoutValidation = [
  ...payoutIdValidation,
  body('payoutMethod')
    .optional()
    .isIn(['manual', 'bank_transfer', 'other'])
    .withMessage('Invalid payout method'),
  body('paymentReference')
    .optional()
    .isString()
    .isLength({ max: 200 })
    .withMessage('Payment reference cannot exceed 200 characters'),
  body('notes')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters')
];

const bulkApprovePayoutsValidation = [
  body('payoutIds')
    .isArray({ min: 1 })
    .withMessage('Payout IDs array is required'),
  body('payoutIds.*')
    .isMongoId()
    .withMessage('Each payout ID must be valid'),
  body('payoutMethod')
    .optional()
    .isIn(['stripe', 'bank_transfer', 'paypal', 'manual'])
    .withMessage('Invalid payout method')
];

const bulkRejectPayoutsValidation = [
  body('payoutIds')
    .isArray({ min: 1 })
    .withMessage('Payout IDs array is required'),
  body('payoutIds.*')
    .isMongoId()
    .withMessage('Each payout ID must be valid'),
  body('reason')
    .isString()
    .isLength({ min: 1, max: 500 })
    .withMessage('Rejection reason is required and cannot exceed 500 characters')
];

const getPayoutStatsValidation = [
  query('period')
    .optional()
    .isIn(['week', 'month', 'quarter', 'year'])
    .withMessage('Period must be week, month, quarter, or year')
];

const getPayoutAnalyticsValidation = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date'),
  query('groupBy')
    .optional()
    .isIn(['day', 'week', 'month'])
    .withMessage('Group by must be day, week, or month')
];

const exportPayoutDataValidation = [
  query('format')
    .optional()
    .isIn(['json', 'csv'])
    .withMessage('Format must be json or csv'),
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date'),
  query('status')
    .optional()
    .isIn(['all', 'pending', 'scheduled', 'processing', 'completed', 'failed'])
    .withMessage('Invalid status'),
  query('vendorId')
    .optional()
    .isMongoId()
    .withMessage('Vendor ID must be valid')
];

// All admin payout routes require authentication and admin/superadmin role
router.use(authenticate);
router.use(authorize(['admin', 'superadmin']));

// Vendor earnings routes
router.get(
  '/vendor-earnings',
  getVendorEarningsValidation,
  validateRequest,
  getVendorEarnings
);

router.get(
  '/vendor-earnings/:vendorId',
  vendorIdValidation,
  validateRequest,
  getVendorEarning
);

// Payout request routes
router.get(
  '/payout-requests',
  getPayoutRequestsValidation,
  validateRequest,
  getPayoutRequests
);

router.get(
  '/payout-requests/:id',
  payoutIdValidation,
  validateRequest,
  getPayoutRequest
);

router.put(
  '/payout-requests/:id/approve',
  approvePayoutValidation,
  validateRequest,
  approvePayoutRequest
);

router.put(
  '/payout-requests/:id/reject',
  rejectPayoutValidation,
  validateRequest,
  rejectPayoutRequest
);

router.put(
  '/payout-requests/:id/process',
  processPayoutValidation,
  validateRequest,
  processPayoutRequest
);

// Bulk operations
router.post(
  '/payout-requests/bulk-approve',
  bulkApprovePayoutsValidation,
  validateRequest,
  bulkApprovePayouts
);

router.post(
  '/payout-requests/bulk-reject',
  bulkRejectPayoutsValidation,
  validateRequest,
  bulkRejectPayouts
);

// Analytics and stats
router.get(
  '/payout-stats',
  getPayoutStatsValidation,
  validateRequest,
  getPayoutStats
);

router.get(
  '/payout-analytics',
  getPayoutAnalyticsValidation,
  validateRequest,
  getPayoutAnalytics
);

// Export
router.get(
  '/payout-export',
  exportPayoutDataValidation,
  validateRequest,
  exportPayoutData
);

export default router;
