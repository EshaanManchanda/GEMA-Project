import express from "express";
import { authenticate, authorize } from "../middleware/auth";
import { UserRole } from "../models/index";
import * as vendorPaymentController from "../controllers/vendor.payment.controller";

const router = express.Router();

/**
 * Vendor Payment Settings Routes
 *
 * All routes require authentication and vendor role
 * Base path: /api/vendors/payment-settings
 */

router.use(authenticate);
router.use(authorize([UserRole.VENDOR]));

// ==================== PAYMENT OVERVIEW ====================

/**
 * GET /api/vendors/payment-settings/overview
 * Get complete payment settings overview
 */
router.get(
  "/overview",
  vendorPaymentController.getPaymentOverview,
);

// ==================== STRIPE CONNECT ====================

/**
 * POST /api/vendors/payment-settings/stripe/connect
 * Initiate Stripe Connect onboarding
 * Body: { returnUrl, refreshUrl }
 */
router.post(
  "/stripe/connect",
  vendorPaymentController.initiateStripeConnect,
);

/**
 * GET /api/vendors/payment-settings/stripe/connect/status
 * Check Stripe Connect onboarding status
 */
router.get(
  "/stripe/connect/status",
  vendorPaymentController.getStripeConnectStatus,
);

/**
 * POST /api/vendors/payment-settings/stripe/connect/refresh
 * Refresh Stripe Connect onboarding link
 * Body: { returnUrl, refreshUrl }
 */
router.post(
  "/stripe/connect/refresh",
  vendorPaymentController.refreshStripeConnectLink,
);

/**
 * DELETE /api/vendors/payment-settings/stripe/connect
 * Disconnect Stripe Connect account
 */
router.delete(
  "/stripe/connect",
  vendorPaymentController.disconnectStripeConnect,
);

// ==================== MANUAL STRIPE KEYS ====================

/**
 * PUT /api/vendors/payment-settings/stripe/keys
 * Update manual Stripe API keys
 * Body: { publishableKey, secretKey, testMode }
 */
router.put(
  "/stripe/keys",
  vendorPaymentController.updateStripeKeys,
);

// ==================== PAYMENT MODE ====================

/**
 * POST /api/vendors/payment-settings/payment-mode
 * Switch between Platform Stripe and Custom Stripe
 * Body: { paymentMode: 'platform_stripe' | 'custom_stripe' }
 */
router.post(
  "/payment-mode",
  vendorPaymentController.switchPaymentMode,
);

// ==================== SUBSCRIPTION ====================

/**
 * GET /api/vendors/payment-settings/subscription
 * Get subscription information
 */
router.get(
  "/subscription",
  vendorPaymentController.getSubscriptionInfo,
);

/**
 * POST /api/vendors/payment-settings/subscription/checkout
 * Create a Stripe Checkout Session (mode: subscription).
 * Returns { url } — frontend redirects to Stripe-hosted checkout.
 * On return, webhook checkout.session.completed activates the subscription.
 */
router.post(
  "/subscription/checkout",
  vendorPaymentController.checkoutSubscription,
);

/**
 * POST /api/vendors/payment-settings/subscription/portal
 * Create a Stripe Billing Portal session.
 * Returns { url } — frontend redirects to Stripe-hosted portal.
 * Vendor can cancel, update card, view invoices, and reactivate.
 * Portal actions flow back via customer.subscription.updated / .deleted webhooks.
 */
router.post(
  "/subscription/portal",
  vendorPaymentController.createBillingPortalSession,
);

/**
 * GET /api/vendors/payment-settings/subscription/history
 * Get subscription payment history
 */
router.get(
  "/subscription/history",
  vendorPaymentController.getSubscriptionHistory,
);

/**
 * POST /api/vendors/payment-settings/subscription/cancel
 * Cancel subscription (fallback: sets cancel_at_period_end on Stripe sub,
 * or downgrades immediately if no Stripe subscription exists).
 * Primary cancel path is the Billing Portal (/subscription/portal).
 * Body: { reason?: string }
 */
router.post(
  "/subscription/cancel",
  vendorPaymentController.cancelSubscription,
);

// ==================== BANK ACCOUNT ====================

/**
 * PUT /api/vendors/payment-settings/bank-account
 * Update bank account details
 * Body: { accountHolderName, bankName, accountNumber, routingNumber?, iban?, swiftCode? }
 */
router.put(
  "/bank-account",
  vendorPaymentController.updateBankAccount,
);

/**
 * PUT /api/vendors/payment-settings/payout-preferences
 * Update payout preferences
 * Body: { payoutSchedule?, minimumPayout?, preferredPayoutMethod?, autoPayoutEnabled? }
 */
router.put(
  "/payout-preferences",
  vendorPaymentController.updatePayoutPreferences,
);

// ==================== COMMISSION CALCULATOR ====================

/**
 * POST /api/vendors/payment-settings/commission/calculate
 * Calculate commission vs subscription costs
 * Body: { monthlyRevenue: number }
 */
router.post(
  "/commission/calculate",
  vendorPaymentController.calculateCommissionComparison,
);

export default router;
