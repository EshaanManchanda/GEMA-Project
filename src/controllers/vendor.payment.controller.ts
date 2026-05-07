import { Request, Response } from "express";
import Vendor, {
  PaymentMode,
  VendorSubscriptionStatus,
} from "../models/Vendor";
import { stripeConnectService } from "../services/stripe-connect.service";
import { subscriptionService } from "../services/subscription.service";
import { stripe } from "../config/stripe";
import User from "../models/User";
import { getOrCreateVendorProfile } from "../utils/vendorHelpers";

/**
 * Vendor Payment Settings Controller
 *
 * Handles all vendor payment configuration including:
 * - Stripe Connect onboarding
 * - Payment mode switching (Platform vs Custom Stripe)
 * - Subscription management
 * - Bank account details
 * - Commission calculator
 */

// ==================== PAYMENT OVERVIEW ====================

/**
 * GET /api/vendors/payment-settings/overview
 * Get complete payment settings overview for vendor
 */
export const getPaymentOverview = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    // Get or create vendor profile (auto-creates if doesn't exist)
    const vendor = await getOrCreateVendorProfile(userId);

    // Get subscription status if using custom Stripe
    let subscriptionInfo = null;
    if (vendor.paymentSettings.paymentMode === PaymentMode.CUSTOM_STRIPE) {
      subscriptionInfo = await subscriptionService.checkSubscriptionStatus(
        vendor._id,
      );
    }

    // Get Stripe Connect status if account exists
    let stripeConnectStatus = null;
    if (vendor.paymentSettings.stripeSettings.stripeConnectAccountId) {
      stripeConnectStatus = await stripeConnectService.getAccountStatus(
        vendor._id,
      );
    }

    const overview = {
      paymentMode: vendor.paymentSettings.paymentMode,
      commissionRate: vendor.getEffectiveCommissionRate(),

      // Stripe Connect info
      stripeConnect: {
        connected:
          !!vendor.paymentSettings.stripeSettings.stripeConnectAccountId,
        accountId: vendor.paymentSettings.stripeSettings.stripeConnectAccountId,
        onboardingComplete:
          vendor.paymentSettings.stripeSettings.stripeConnectOnboardingComplete,
        status: stripeConnectStatus,
      },

      // Manual Stripe keys (if using legacy method)
      manualStripe: {
        hasKeys: !!vendor.paymentSettings.stripeSettings.stripePublishableKey,
        publishableKey:
          vendor.paymentSettings.stripeSettings.stripePublishableKey,
        testMode: vendor.paymentSettings.stripeSettings.stripeTestMode,
        lastValidated:
          vendor.paymentSettings.stripeSettings.stripeKeysLastValidated,
        validationError:
          vendor.paymentSettings.stripeSettings.stripeKeysValidationError,
      },

      // Subscription info
      subscription: subscriptionInfo,

      // Payout settings
      payout: {
        schedule: vendor.paymentSettings.payoutSchedule,
        minimumPayout: vendor.paymentSettings.minimumPayout,
        preferredMethod: vendor.paymentSettings.preferredPayoutMethod,
        autoPayoutEnabled: vendor.paymentSettings.autoPayoutEnabled,
      },

      // Bank account
      bankAccount: {
        hasAccount: !!vendor.paymentSettings.bankAccountDetails?.accountNumber,
        isVerified:
          vendor.paymentSettings.bankAccountDetails?.isVerified || false,
        accountHolderName:
          vendor.paymentSettings.bankAccountDetails?.accountHolderName,
        bankName: vendor.paymentSettings.bankAccountDetails?.bankName,
      },

      // Capabilities
      canSwitchToCustomStripe: vendor.canSwitchToCustomStripe(),
      needsSubscriptionPayment: vendor.needsSubscriptionPayment(),
    };

    res.json(overview);
  } catch (error: any) {
    console.error("Error getting payment overview:", error);
    res.status(500).json({
      message: "Failed to get payment overview",
      error: error.message,
    });
  }
};

// ==================== STRIPE CONNECT ====================

/**
 * POST /api/vendors/payment-settings/stripe/connect
 * Initiate Stripe Connect onboarding
 */
export const initiateStripeConnect = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { returnUrl, refreshUrl } = req.body;

    if (!returnUrl || !refreshUrl) {
      return res
        .status(400)
        .json({ message: "returnUrl and refreshUrl are required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const vendor = await Vendor.findOne({ userId });
    if (!vendor) {
      return res.status(404).json({ message: "Vendor profile not found" });
    }

    // Generate onboarding link
    const onboardingUrl = await stripeConnectService.generateOnboardingLink(
      vendor._id,
      refreshUrl,
      returnUrl,
    );

    res.json({
      url: onboardingUrl,
      message: "Stripe Connect onboarding initiated",
    });
  } catch (error: any) {
    console.error("Error initiating Stripe Connect:", error);
    res.status(500).json({
      message: "Failed to initiate Stripe Connect",
      error: error.message,
    });
  }
};

/**
 * GET /api/vendors/payment-settings/stripe/connect/status
 * Check Stripe Connect onboarding status
 */
export const getStripeConnectStatus = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const vendor = await Vendor.findOne({ userId });
    if (!vendor) {
      return res.status(404).json({ message: "Vendor profile not found" });
    }

    const status = await stripeConnectService.getAccountStatus(vendor._id);

    res.json(status);
  } catch (error: any) {
    console.error("Error getting Stripe Connect status:", error);
    res.status(500).json({
      message: "Failed to get Stripe Connect status",
      error: error.message,
    });
  }
};

/**
 * POST /api/vendors/payment-settings/stripe/connect/refresh
 * Refresh Stripe Connect onboarding link
 */
export const refreshStripeConnectLink = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { returnUrl, refreshUrl } = req.body;

    if (!returnUrl || !refreshUrl) {
      return res
        .status(400)
        .json({ message: "returnUrl and refreshUrl are required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const vendor = await Vendor.findOne({ userId });
    if (!vendor) {
      return res.status(404).json({ message: "Vendor profile not found" });
    }

    const onboardingUrl = await stripeConnectService.refreshAccountLink(
      vendor._id,
      refreshUrl,
      returnUrl,
    );

    res.json({ url: onboardingUrl });
  } catch (error: any) {
    console.error("Error refreshing Stripe Connect link:", error);
    res.status(500).json({
      message: "Failed to refresh Stripe Connect link",
      error: error.message,
    });
  }
};

/**
 * DELETE /api/vendors/payment-settings/stripe/connect
 * Disconnect Stripe Connect account
 */
export const disconnectStripeConnect = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const vendor = await Vendor.findOne({ userId });
    if (!vendor) {
      return res.status(404).json({ message: "Vendor profile not found" });
    }

    await stripeConnectService.disconnectAccount(vendor._id);

    res.json({ message: "Stripe Connect account disconnected successfully" });
  } catch (error: any) {
    console.error("Error disconnecting Stripe Connect:", error);
    res.status(500).json({
      message: "Failed to disconnect Stripe Connect",
      error: error.message,
    });
  }
};

// ==================== MANUAL STRIPE KEYS ====================

/**
 * PUT /api/vendors/payment-settings/stripe/keys
 * Update manual Stripe API keys
 */
export const updateStripeKeys = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { publishableKey, secretKey, testMode } = req.body;

    if (!publishableKey || !secretKey) {
      return res
        .status(400)
        .json({ message: "Both publishableKey and secretKey are required" });
    }

    // Validate key formats
    const pubKeyPrefix = testMode ? "pk_test_" : "pk_live_";
    const secretKeyPrefix = testMode ? "sk_test_" : "sk_live_";

    if (!publishableKey.startsWith(pubKeyPrefix)) {
      return res.status(400).json({
        message: `Invalid publishable key format. Expected to start with ${pubKeyPrefix}`,
      });
    }

    if (!secretKey.startsWith(secretKeyPrefix)) {
      return res.status(400).json({
        message: `Invalid secret key format. Expected to start with ${secretKeyPrefix}`,
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const vendor = await Vendor.findOne({ userId });
    if (!vendor) {
      return res.status(404).json({ message: "Vendor profile not found" });
    }

    // Test the keys by making a test API call
    try {
      const testStripe = new (require("stripe").default)(secretKey);
      await testStripe.balance.retrieve();

      // Keys are valid
      vendor.paymentSettings.stripeSettings.stripePublishableKey =
        publishableKey;
      vendor.paymentSettings.stripeSettings.stripeSecretKey = secretKey;
      vendor.paymentSettings.stripeSettings.stripeTestMode = testMode;
      vendor.paymentSettings.stripeSettings.stripeKeysLastValidated =
        new Date();
      vendor.paymentSettings.stripeSettings.stripeKeysValidationError =
        undefined;

      await vendor.save();

      res.json({
        message: "Stripe keys updated and validated successfully",
        testMode,
      });
    } catch (validationError: any) {
      vendor.paymentSettings.stripeSettings.stripeKeysValidationError =
        validationError.message;
      await vendor.save();

      return res.status(400).json({
        message: "Stripe keys validation failed",
        error: validationError.message,
      });
    }
  } catch (error: any) {
    console.error("Error updating Stripe keys:", error);
    res
      .status(500)
      .json({ message: "Failed to update Stripe keys", error: error.message });
  }
};

// ==================== PAYMENT MODE ====================

/**
 * POST /api/vendors/payment-settings/payment-mode
 * Switch between Platform Stripe and Custom Stripe
 */
export const switchPaymentMode = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { paymentMode } = req.body;

    if (!paymentMode || !Object.values(PaymentMode).includes(paymentMode)) {
      return res.status(400).json({ message: "Invalid payment mode" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const vendor = await Vendor.findOne({ userId });
    if (!vendor) {
      return res.status(404).json({ message: "Vendor profile not found" });
    }

    // Check if switching to custom Stripe
    if (paymentMode === PaymentMode.CUSTOM_STRIPE) {
      if (!vendor.canSwitchToCustomStripe()) {
        return res.status(400).json({
          message:
            "Cannot switch to custom Stripe. Please complete Stripe setup and verification first.",
        });
      }

      // Create subscription
      await subscriptionService.createSubscription(vendor._id);
    }

    // Update payment mode
    vendor.paymentSettings.paymentMode = paymentMode;
    vendor.paymentSettings.paymentModeChangedAt = new Date();

    await vendor.save();

    res.json({
      message: `Payment mode switched to ${paymentMode} successfully`,
      paymentMode: vendor.paymentSettings.paymentMode,
    });
  } catch (error: any) {
    console.error("Error switching payment mode:", error);
    res
      .status(500)
      .json({ message: "Failed to switch payment mode", error: error.message });
  }
};

// ==================== SUBSCRIPTION ====================

/**
 * GET /api/vendors/payment-settings/subscription
 * Get subscription information
 */
export const getSubscriptionInfo = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const vendor = await Vendor.findOne({ userId });
    if (!vendor) {
      return res.status(404).json({ message: "Vendor profile not found" });
    }

    const subscriptionInfo = await subscriptionService.checkSubscriptionStatus(
      vendor._id,
    );

    res.json(subscriptionInfo);
  } catch (error: any) {
    console.error("Error getting subscription info:", error);
    res.status(500).json({
      message: "Failed to get subscription info",
      error: error.message,
    });
  }
};

/**
 * POST /api/vendors/payment-settings/subscription/pay
 * Process subscription payment
 */
export const paySubscription = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const vendor = await Vendor.findOne({ userId });
    if (!vendor) {
      return res.status(404).json({ message: "Vendor profile not found" });
    }

    const result = await subscriptionService.processSubscriptionPayment(
      vendor._id,
    );

    if (result.success) {
      res.json({
        message: "Subscription payment processed successfully",
        ...result,
      });
    } else {
      res.status(400).json({
        message: "Subscription payment failed",
        error: result.error,
      });
    }
  } catch (error: any) {
    console.error("Error processing subscription payment:", error);
    res.status(500).json({
      message: "Failed to process subscription payment",
      error: error.message,
    });
  }
};

/**
 * GET /api/vendors/payment-settings/subscription/history
 * Get subscription payment history
 */
export const getSubscriptionHistory = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const vendor = await Vendor.findOne({ userId });
    if (!vendor) {
      return res.status(404).json({ message: "Vendor profile not found" });
    }

    const history = await subscriptionService.getSubscriptionHistory(
      vendor._id,
    );

    res.json(history);
  } catch (error: any) {
    console.error("Error getting subscription history:", error);
    res.status(500).json({
      message: "Failed to get subscription history",
      error: error.message,
    });
  }
};

/**
 * POST /api/vendors/payment-settings/subscription/cancel
 * Cancel subscription
 */
export const cancelSubscription = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { reason } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const vendor = await Vendor.findOne({ userId });
    if (!vendor) {
      return res.status(404).json({ message: "Vendor profile not found" });
    }

    await subscriptionService.cancelSubscription(vendor._id, reason);

    res.json({ message: "Subscription cancelled successfully" });
  } catch (error: any) {
    console.error("Error cancelling subscription:", error);
    res
      .status(500)
      .json({ message: "Failed to cancel subscription", error: error.message });
  }
};

// ==================== BANK ACCOUNT ====================

/**
 * PUT /api/vendors/payment-settings/bank-account
 * Update bank account details
 */
export const updateBankAccount = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const {
      accountHolderName,
      bankName,
      accountNumber,
      routingNumber,
      iban,
      swiftCode,
    } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const vendor = await Vendor.findOne({ userId });
    if (!vendor) {
      return res.status(404).json({ message: "Vendor profile not found" });
    }

    vendor.paymentSettings.bankAccountDetails = {
      accountHolderName,
      bankName,
      accountNumber,
      routingNumber,
      iban,
      swiftCode,
      isVerified: false, // Reset verification when details change
    };

    await vendor.save();

    res.json({
      message: "Bank account details updated successfully",
      bankAccount: {
        accountHolderName,
        bankName,
        isVerified: false,
      },
    });
  } catch (error: any) {
    console.error("Error updating bank account:", error);
    res
      .status(500)
      .json({ message: "Failed to update bank account", error: error.message });
  }
};

/**
 * PUT /api/vendors/payment-settings/payout-preferences
 * Update payout preferences
 */
export const updatePayoutPreferences = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const {
      payoutSchedule,
      minimumPayout,
      preferredPayoutMethod,
      autoPayoutEnabled,
    } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const vendor = await Vendor.findOne({ userId });
    if (!vendor) {
      return res.status(404).json({ message: "Vendor profile not found" });
    }

    if (payoutSchedule) {
      if (!["daily", "weekly", "monthly"].includes(payoutSchedule)) {
        return res.status(400).json({ message: "Invalid payout schedule" });
      }
      vendor.paymentSettings.payoutSchedule = payoutSchedule;
    }

    if (minimumPayout !== undefined) {
      if (minimumPayout < 50) {
        return res
          .status(400)
          .json({ message: "Minimum payout must be at least 50 AED" });
      }
      vendor.paymentSettings.minimumPayout = minimumPayout;
    }

    if (preferredPayoutMethod) {
      if (
        !["bank_transfer", "stripe", "paypal"].includes(preferredPayoutMethod)
      ) {
        return res.status(400).json({ message: "Invalid payout method" });
      }
      vendor.paymentSettings.preferredPayoutMethod = preferredPayoutMethod;
    }

    if (autoPayoutEnabled !== undefined) {
      vendor.paymentSettings.autoPayoutEnabled = autoPayoutEnabled;
    }

    await vendor.save();

    res.json({
      message: "Payout preferences updated successfully",
      preferences: {
        payoutSchedule: vendor.paymentSettings.payoutSchedule,
        minimumPayout: vendor.paymentSettings.minimumPayout,
        preferredPayoutMethod: vendor.paymentSettings.preferredPayoutMethod,
        autoPayoutEnabled: vendor.paymentSettings.autoPayoutEnabled,
      },
    });
  } catch (error: any) {
    console.error("Error updating payout preferences:", error);
    res.status(500).json({
      message: "Failed to update payout preferences",
      error: error.message,
    });
  }
};

// ==================== COMMISSION CALCULATOR ====================

/**
 * POST /api/vendors/payment-settings/commission/calculate
 * Calculate commission vs subscription costs
 */
export const calculateCommissionComparison = async (
  req: Request,
  res: Response,
) => {
  try {
    const userId = req.user?.id;
    const { monthlyRevenue } = req.body;

    if (!monthlyRevenue || monthlyRevenue < 0) {
      return res
        .status(400)
        .json({ message: "Valid monthly revenue is required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const vendor = await Vendor.findOne({ userId });
    if (!vendor) {
      return res.status(404).json({ message: "Vendor profile not found" });
    }

    const commissionRate = vendor.getEffectiveCommissionRate();
    const subscriptionCost = 150; // AED per month

    const commissionCost = (monthlyRevenue * commissionRate) / 100;
    const savings = commissionCost - subscriptionCost;
    const recommendCustomStripe = commissionCost > subscriptionCost;

    const comparison = {
      monthlyRevenue,
      commissionRate,

      platformStripe: {
        commissionCost,
        description: `${commissionRate}% commission per transaction`,
      },

      customStripe: {
        subscriptionCost,
        description: "150 AED flat monthly fee",
      },

      savings: Math.abs(savings),
      savingsPercentage: (
        (Math.abs(savings) / Math.max(commissionCost, subscriptionCost)) *
        100
      ).toFixed(2),

      recommendation: recommendCustomStripe
        ? "custom_stripe"
        : "platform_stripe",
      recommendationText: recommendCustomStripe
        ? `Switch to Custom Stripe and save ${savings.toFixed(2)} AED per month`
        : `Stay with Platform Stripe and save ${Math.abs(savings).toFixed(2)} AED per month`,

      breakEvenPoint: (subscriptionCost / commissionRate) * 100,
    };

    res.json(comparison);
  } catch (error: any) {
    console.error("Error calculating commission comparison:", error);
    res.status(500).json({
      message: "Failed to calculate comparison",
      error: error.message,
    });
  }
};
