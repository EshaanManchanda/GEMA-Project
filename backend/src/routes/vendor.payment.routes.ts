import express from 'express';
import { authenticate } from '../middleware/auth';
import * as vendorPaymentController from '../controllers/vendor.payment.controller';

const router = express.Router();

/**
 * Vendor Payment Settings Routes
 *
 * All routes require authentication and vendor role
 * Base path: /api/vendors/payment-settings
 */

// ==================== PAYMENT OVERVIEW ====================

/**
 * GET /api/vendors/payment-settings/overview
 * Get complete payment settings overview
 */
router.get('/overview', authenticate, vendorPaymentController.getPaymentOverview);

// ==================== STRIPE CONNECT ====================

/**
 * POST /api/vendors/payment-settings/stripe/connect
 * Initiate Stripe Connect onboarding
 * Body: { returnUrl, refreshUrl }
 */
router.post('/stripe/connect', authenticate, vendorPaymentController.initiateStripeConnect);

/**
 * GET /api/vendors/payment-settings/stripe/connect/status
 * Check Stripe Connect onboarding status
 */
router.get('/stripe/connect/status', authenticate, vendorPaymentController.getStripeConnectStatus);

/**
 * POST /api/vendors/payment-settings/stripe/connect/refresh
 * Refresh Stripe Connect onboarding link
 * Body: { returnUrl, refreshUrl }
 */
router.post('/stripe/connect/refresh', authenticate, vendorPaymentController.refreshStripeConnectLink);

/**
 * DELETE /api/vendors/payment-settings/stripe/connect
 * Disconnect Stripe Connect account
 */
router.delete('/stripe/connect', authenticate, vendorPaymentController.disconnectStripeConnect);

// ==================== MANUAL STRIPE KEYS ====================

/**
 * PUT /api/vendors/payment-settings/stripe/keys
 * Update manual Stripe API keys
 * Body: { publishableKey, secretKey, testMode }
 */
router.put('/stripe/keys', authenticate, vendorPaymentController.updateStripeKeys);

// ==================== PAYMENT MODE ====================

/**
 * POST /api/vendors/payment-settings/payment-mode
 * Switch between Platform Stripe and Custom Stripe
 * Body: { paymentMode: 'platform_stripe' | 'custom_stripe' }
 */
router.post('/payment-mode', authenticate, vendorPaymentController.switchPaymentMode);

// ==================== SUBSCRIPTION ====================

/**
 * GET /api/vendors/payment-settings/subscription
 * Get subscription information
 */
router.get('/subscription', authenticate, vendorPaymentController.getSubscriptionInfo);

/**
 * POST /api/vendors/payment-settings/subscription/pay
 * Process subscription payment
 */
router.post('/subscription/pay', authenticate, vendorPaymentController.paySubscription);

/**
 * GET /api/vendors/payment-settings/subscription/history
 * Get subscription payment history
 */
router.get('/subscription/history', authenticate, vendorPaymentController.getSubscriptionHistory);

/**
 * POST /api/vendors/payment-settings/subscription/cancel
 * Cancel subscription
 * Body: { reason?: string }
 */
router.post('/subscription/cancel', authenticate, vendorPaymentController.cancelSubscription);

// ==================== BANK ACCOUNT ====================

/**
 * PUT /api/vendors/payment-settings/bank-account
 * Update bank account details
 * Body: { accountHolderName, bankName, accountNumber, routingNumber?, iban?, swiftCode? }
 */
router.put('/bank-account', authenticate, vendorPaymentController.updateBankAccount);

/**
 * PUT /api/vendors/payment-settings/payout-preferences
 * Update payout preferences
 * Body: { payoutSchedule?, minimumPayout?, preferredPayoutMethod?, autoPayoutEnabled? }
 */
router.put('/payout-preferences', authenticate, vendorPaymentController.updatePayoutPreferences);

// ==================== COMMISSION CALCULATOR ====================

/**
 * POST /api/vendors/payment-settings/commission/calculate
 * Calculate commission vs subscription costs
 * Body: { monthlyRevenue: number }
 */
router.post('/commission/calculate', authenticate, vendorPaymentController.calculateCommissionComparison);

export default router;
