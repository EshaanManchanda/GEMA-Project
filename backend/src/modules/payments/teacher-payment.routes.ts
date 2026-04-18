import express from "express";
import { authenticate } from "../../middleware/auth";
import * as teacherPaymentController from "./teacher-payment.controller";

const router = express.Router();

/**
 * Teacher Payment Settings Routes
 *
 * All routes require authentication and teacher role
 * Base path: /api/teachers/payment-settings
 */

// ==================== PAYMENT OVERVIEW ====================

/**
 * GET /api/teachers/payment-settings/overview
 * Get complete payment settings overview
 */
router.get(
  "/overview",
  authenticate,
  teacherPaymentController.getTeacherPaymentOverview,
);

// ==================== STRIPE CONNECT ====================

/**
 * POST /api/teachers/payment-settings/stripe/connect
 * Initiate Stripe Connect onboarding
 * Body: { returnUrl, refreshUrl }
 */
router.post(
  "/stripe/connect",
  authenticate,
  teacherPaymentController.initiateTeacherStripeConnect,
);

/**
 * GET /api/teachers/payment-settings/stripe/connect/status
 * Check Stripe Connect onboarding status
 */
router.get(
  "/stripe/connect/status",
  authenticate,
  teacherPaymentController.getTeacherStripeConnectStatus,
);

/**
 * POST /api/teachers/payment-settings/stripe/connect/refresh
 * Refresh Stripe Connect onboarding link
 * Body: { returnUrl, refreshUrl }
 */
router.post(
  "/stripe/connect/refresh",
  authenticate,
  teacherPaymentController.refreshTeacherStripeConnectLink,
);

/**
 * DELETE /api/teachers/payment-settings/stripe/connect
 * Disconnect Stripe Connect account
 */
router.delete(
  "/stripe/connect",
  authenticate,
  teacherPaymentController.disconnectTeacherStripeConnect,
);

// ==================== MANUAL STRIPE KEYS ====================

/**
 * PUT /api/teachers/payment-settings/stripe/keys
 * Update manual Stripe API keys
 * Body: { publishableKey, secretKey, testMode }
 */
router.put(
  "/stripe/keys",
  authenticate,
  teacherPaymentController.updateTeacherStripeKey,
);

// ==================== PAYMENT MODE ====================

/**
 * POST /api/teachers/payment-settings/payment-mode
 * Switch between Platform Stripe and Custom Stripe
 * Body: { paymentMode: 'platform_stripe' | 'custom_stripe' }
 */
router.post(
  "/payment-mode",
  authenticate,
  teacherPaymentController.switchTeacherPaymentMode,
);

// ==================== SUBSCRIPTION ====================

/**
 * GET /api/teachers/payment-settings/subscription
 * Get subscription information
 */
router.get(
  "/subscription",
  authenticate,
  teacherPaymentController.getTeacherSubscriptionInfo,
);

/**
 * POST /api/teachers/payment-settings/subscription/pay
 * Process subscription payment
 */
router.post(
  "/subscription/pay",
  authenticate,
  teacherPaymentController.payTeacherSubscription,
);

/**
 * GET /api/teachers/payment-settings/subscription/history
 * Get subscription payment history
 */
router.get(
  "/subscription/history",
  authenticate,
  teacherPaymentController.getTeacherSubscriptionHistory,
);

/**
 * POST /api/teachers/payment-settings/subscription/cancel
 * Cancel subscription
 * Body: { reason?: string }
 */
router.post(
  "/subscription/cancel",
  authenticate,
  teacherPaymentController.cancelTeacherSubscription,
);

// ==================== BANK ACCOUNT ====================

/**
 * PUT /api/teachers/payment-settings/bank-account
 * Update bank account details
 * Body: { accountHolderName, bankName, accountNumber, iban?, swiftCode? }
 */
router.put(
  "/bank-account",
  authenticate,
  teacherPaymentController.updateTeacherBankAccount,
);

/**
 * PUT /api/teachers/payment-settings/payout-preferences
 * Update payout preferences
 * Body: { payoutSchedule?, minimumPayout?, preferredPayoutMethod?, autoPayoutEnabled? }
 */
router.put(
  "/payout-preferences",
  authenticate,
  teacherPaymentController.updateTeacherPayoutPreferences,
);

// ==================== COMMISSION CALCULATOR ====================

/**
 * POST /api/teachers/payment-settings/commission/calculate
 * Calculate commission vs subscription costs
 * Body: { monthlyRevenue: number }
 */
router.post(
  "/commission/calculate",
  authenticate,
  teacherPaymentController.calculateTeacherCommissionComparison,
);

export default router;
