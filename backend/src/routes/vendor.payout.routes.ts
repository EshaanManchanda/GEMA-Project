import { Router } from 'express';
import {
  getVendorPayoutsDashboard,
  getVendorPayoutHistory,
  getPendingEarnings,
  requestPayout,
  getPayoutRequest,
  cancelPayoutRequest,
  getPaymentSettings,
  updatePaymentSettings,
  getSubscriptionStatus,
  getCommissionHistory
} from '../controllers/vendor.payout.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { query, param, body } from 'express-validator';

const router = Router();

// Validation rules
const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

const payoutHistoryValidation = [
  ...paginationValidation,
  query('status')
    .optional()
    .isIn(['pending', 'approved', 'rejected', 'processing', 'completed', 'failed', 'cancelled'])
    .withMessage('Invalid status')
];

const pendingEarningsValidation = [
  ...paginationValidation,
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date')
];

const requestPayoutValidation = [
  body('amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Amount must be a positive number')
];

const payoutIdValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid payout ID')
];

const updatePaymentSettingsValidation = [
  body('preferredPayoutMethod')
    .optional()
    .isIn(['bank_transfer', 'stripe', 'paypal'])
    .withMessage('Invalid payout method'),
  body('minimumPayout')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum payout must be a positive number'),
  body('payoutSchedule')
    .optional()
    .isIn(['daily', 'weekly', 'monthly'])
    .withMessage('Invalid payout schedule'),
  body('bankAccountDetails.accountHolderName')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Account holder name must be 2-100 characters'),
  body('bankAccountDetails.bankName')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Bank name must be 2-100 characters'),
  body('bankAccountDetails.accountNumber')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 8, max: 34 })
    .withMessage('Account number must be 8-34 characters'),
  body('bankAccountDetails.iban')
    .optional()
    .isString()
    .trim()
    .matches(/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/)
    .withMessage('Invalid IBAN format'),
  body('stripeAccountId')
    .optional()
    .isString()
    .trim()
    .withMessage('Invalid Stripe account ID'),
  body('stripePublishableKey')
    .optional()
    .isString()
    .trim()
    .matches(/^pk_(test|live)_/)
    .withMessage('Invalid Stripe publishable key format'),
  body('stripeSecretKey')
    .optional()
    .isString()
    .trim()
    .matches(/^sk_(test|live)_/)
    .withMessage('Invalid Stripe secret key format')
];

// All vendor payout routes require authentication and vendor role
router.use(authenticate);
router.use(authorize(['vendor']));

// Dashboard routes
router.get(
  '/dashboard',
  validateRequest,
  getVendorPayoutsDashboard
);

// Payout history
router.get(
  '/history',
  payoutHistoryValidation,
  validateRequest,
  getVendorPayoutHistory
);

// Pending earnings with commission breakdown
router.get(
  '/pending-earnings',
  pendingEarningsValidation,
  validateRequest,
  getPendingEarnings
);

// Payout request operations
router.post(
  '/request',
  requestPayoutValidation,
  validateRequest,
  requestPayout
);

router.get(
  '/requests/:id',
  payoutIdValidation,
  validateRequest,
  getPayoutRequest
);

router.delete(
  '/requests/:id',
  payoutIdValidation,
  validateRequest,
  cancelPayoutRequest
);

// Payment settings
router.get(
  '/payment-settings',
  validateRequest,
  getPaymentSettings
);

router.put(
  '/payment-settings',
  updatePaymentSettingsValidation,
  validateRequest,
  updatePaymentSettings
);

// Subscription status (for subscription model vendors)
router.get(
  '/subscription-status',
  validateRequest,
  getSubscriptionStatus
);

// Commission history (for commission model vendors)
router.get(
  '/commission-history',
  pendingEarningsValidation,
  validateRequest,
  getCommissionHistory
);

export default router;
