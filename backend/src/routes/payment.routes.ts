import { Router } from 'express';
import { body, param, query } from 'express-validator';
import {
  createPaymentIntent,
  confirmPayment,
  cancelPayment,
  processRefund,
  getPaymentMethods,
  removePaymentMethod,
  handleWebhook,
  getStripeConfig,
  getPaymentAnalytics,
} from '../controllers/payment.controller';
import { authenticate, authorize, requirePhoneVerification } from '../middleware';

const router = Router();

// Public routes
router.get('/config', getStripeConfig);

// Webhook route (must be before other middleware)
router.post(
  '/webhook',
  // Note: Raw body is needed for Stripe webhook verification
  // This should be handled at the Express app level with express.raw()
  handleWebhook
);

// Protected routes
router.use(authenticate);

// Customer routes - Phone verification required for all payment operations
router.post(
  '/create-intent',
  authorize(['customer']),
  requirePhoneVerification,
  [
    body('orderId')
      .isMongoId()
      .withMessage('Valid order ID is required'),
  ],
  createPaymentIntent
);

router.post(
  '/confirm',
  authorize(['customer']),
  requirePhoneVerification,
  [
    body('paymentIntentId')
      .trim()
      .notEmpty()
      .withMessage('Payment intent ID is required'),
    body('paymentMethodId')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Payment method ID cannot be empty if provided'),
  ],
  confirmPayment
);

router.post(
  '/cancel',
  authorize(['customer']),
  [
    body('paymentIntentId')
      .trim()
      .notEmpty()
      .withMessage('Payment intent ID is required'),
  ],
  cancelPayment
);

router.get(
  '/payment-methods',
  authorize(['customer']),
  getPaymentMethods
);

router.delete(
  '/payment-methods/:id',
  authorize(['customer']),
  [
    param('id')
      .trim()
      .notEmpty()
      .withMessage('Payment method ID is required'),
  ],
  removePaymentMethod
);

// Admin routes
router.post(
  '/refund',
  authorize(['admin']),
  [
    body('orderId')
      .isMongoId()
      .withMessage('Valid order ID is required'),
    body('amount')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Amount must be a positive number'),
    body('reason')
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage('Reason cannot exceed 200 characters'),
  ],
  processRefund
);

router.get(
  '/admin/analytics',
  authorize(['admin']),
  [
    query('period')
      .optional()
      .isInt({ min: 1, max: 365 })
      .withMessage('Period must be between 1 and 365 days'),
  ],
  getPaymentAnalytics
);

export default router;