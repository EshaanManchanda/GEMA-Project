import { Request, Response, NextFunction } from "express";
import Teacher, {
  TeacherPaymentMode,
  TeacherSubscriptionStatus,
} from "../models/Teacher";
import { stripeConnectService } from "../services/stripe-connect.service";
import { subscriptionService } from "../services/subscription.service";
import { getOrCreateTeacherProfile } from "../utils/teacherHelpers";
import { Types } from "mongoose";
import { AppError } from "../middleware/error";
import Notification, {
  NotificationType,
  NotificationPriority,
} from "../models/Notification";

import User from "../models/User";

/**
 * Teacher Payment Settings Controller
 *
 * Handles all teacher payment configuration including:
 * - Stripe Connect onboarding
 * - Payment mode switching (Platform vs Custom Stripe)
 * - Subscription management
 * - Bank account details
 * - Commission calculator
 */

// ==================== PAYMENT OVERVIEW ====================

/**
 * GET /api/teachers/payment-settings/overview
 * Get complete payment settings overview for teacher
 */
export const getTeacherPaymentOverview = async (
  req: Request,
  res: Response,
) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    // Get or create teacher profile (auto-creates if doesn't exist)
    const teacher = await getOrCreateTeacherProfile(userId);
    const teacherId = teacher._id as Types.ObjectId;

    // Get subscription status if using custom Stripe
    let subscriptionInfo = null;
    if (
      teacher.paymentSettings.paymentMode === TeacherPaymentMode.CUSTOM_STRIPE
    ) {
      subscriptionInfo =
        await subscriptionService.checkSubscriptionStatus(teacherId);
    }

    // Get Stripe Connect status if account exists
    let stripeConnectStatus = null;
    if (teacher.paymentSettings.stripeSettings?.stripeConnectAccountId) {
      stripeConnectStatus =
        await stripeConnectService.getAccountStatus(teacherId);
    }

    const overview = {
      paymentMode: teacher.paymentSettings.paymentMode,
      commissionRate: teacher.paymentSettings.commissionRate ?? 15,

      // Stripe Connect info
      stripeConnect: {
        connected:
          !!teacher.paymentSettings.stripeSettings?.stripeConnectAccountId,
        accountId:
          teacher.paymentSettings.stripeSettings?.stripeConnectAccountId,
        onboardingComplete:
          teacher.paymentSettings.stripeSettings
            ?.stripeConnectOnboardingComplete,
        status: stripeConnectStatus,
      },

      // Subscription info
      subscription: subscriptionInfo,

      // Payout settings
      payout: {
        schedule: teacher.paymentSettings.payoutSchedule,
        minimumPayout: teacher.paymentSettings.minimumPayout,
        preferredMethod: teacher.paymentSettings.preferredPayoutMethod,
      },

      // Bank account
      bankAccount: {
        hasAccount: !!teacher.paymentSettings.bankDetails?.accountNumber,
        isVerified: teacher.paymentSettings.bankDetails?.isVerified ?? false,
        accountHolderName:
          teacher.paymentSettings.bankDetails?.accountHolderName,
        bankName: teacher.paymentSettings.bankDetails?.bankName,
      },

      // Capabilities
      canSwitchToCustomStripe:
        teacher.paymentSettings.subscriptionStatus ===
        TeacherSubscriptionStatus.ACTIVE,
    };

    res.json(overview);
  } catch (error: any) {
    console.error("Error getting teacher payment overview:", error);
    res.status(500).json({
      message: "Failed to get payment overview",
      error: error.message,
    });
  }
};

/**
 * ==================== STRIPE CONNECT ====================
 */

/**
 * POST /api/teachers/payment-settings/stripe/connect
 * Initiate Stripe Connect onboarding
 */
export const initiateTeacherStripeConnect = async (
  req: Request,
  res: Response,
) => {
  try {
    const userId = req.user?.id;
    const { returnUrl, refreshUrl } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    if (!returnUrl || !refreshUrl) {
      return res
        .status(400)
        .json({ message: "returnUrl and refreshUrl are required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const teacher = await Teacher.findOne({ userId });
    if (!teacher) {
      return res.status(404).json({ message: "Teacher profile not found" });
    }

    const teacherId = teacher._id as Types.ObjectId;

    const onboardingUrl = await stripeConnectService.generateOnboardingLink(
      teacherId,
      refreshUrl,
      returnUrl,
    );

    res.json({
      url: onboardingUrl,
      message: "Stripe Connect onboarding initiated",
    });
  } catch (error: any) {
    console.error("Error initiating Stripe Connect (teacher):", error);
    res.status(500).json({
      message: "Failed to initiate Stripe Connect",
      error: error.message,
    });
  }
};

/**
 * GET /api/teachers/payment-settings/stripe/connect/status
 * Check Stripe Connect onboarding status
 */
export const getTeacherStripeConnectStatus = async (
  req: Request,
  res: Response,
) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const teacher = await Teacher.findOne({ userId });
    if (!teacher) {
      return res.status(404).json({ message: "Teacher profile not found" });
    }

    const teacherId = teacher._id as Types.ObjectId;

    const status = await stripeConnectService.getAccountStatus(teacherId);

    res.json(status);
  } catch (error: any) {
    console.error("Error getting Stripe Connect status (teacher):", error);
    res.status(500).json({
      message: "Failed to get Stripe Connect status",
      error: error.message,
    });
  }
};

/**
 * POST /api/teachers/payment-settings/stripe/connect/refresh
 * Refresh Stripe Connect onboarding link
 */
export const refreshTeacherStripeConnectLink = async (
  req: Request,
  res: Response,
) => {
  try {
    const userId = req.user?.id;
    const { returnUrl, refreshUrl } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    if (!returnUrl || !refreshUrl) {
      return res
        .status(400)
        .json({ message: "returnUrl and refreshUrl are required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const teacher = await Teacher.findOne({ userId });
    if (!teacher) {
      return res.status(404).json({ message: "Teacher profile not found" });
    }

    const teacherId = teacher._id as Types.ObjectId;

    const onboardingUrl = await stripeConnectService.refreshAccountLink(
      teacherId,
      refreshUrl,
      returnUrl,
    );

    res.json({ url: onboardingUrl });
  } catch (error: any) {
    console.error("Error refreshing Stripe Connect link (teacher):", error);
    res.status(500).json({
      message: "Failed to refresh Stripe Connect link",
      error: error.message,
    });
  }
};

/**
 * DELETE /api/teachers/payment-settings/stripe/connect
 * Disconnect Stripe Connect account
 */
export const disconnectTeacherStripeConnect = async (
  req: Request,
  res: Response,
) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const teacher = await Teacher.findOne({ userId });
    if (!teacher) {
      return res.status(404).json({ message: "Teacher profile not found" });
    }

    const teacherId = teacher._id as Types.ObjectId;

    await stripeConnectService.disconnectAccount(teacherId);

    res.json({
      message: "Stripe Connect account disconnected successfully",
    });
  } catch (error: any) {
    console.error("Error disconnecting Stripe Connect (teacher):", error);
    res.status(500).json({
      message: "Failed to disconnect Stripe Connect",
      error: error.message,
    });
  }
};
/**
 * PUT /api/teachers/payment-settings/stripe/key
 * Save manual Stripe key (legacy / optional)
 */
export const updateTeacherStripeKey = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { manualStripeKey, isTestMode } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    if (!manualStripeKey) {
      return res.status(400).json({ message: "manualStripeKey is required" });
    }

    const teacher = await Teacher.findOne({ userId });
    if (!teacher) {
      return res.status(404).json({ message: "Teacher profile not found" });
    }

    // Note: manualStripeKey and isTestMode properties don't exist on IStripeConfig
    // Using stripeSecretKey and stripeTestMode instead
    teacher.paymentSettings.stripeSettings.stripeSecretKey = manualStripeKey;
    teacher.paymentSettings.stripeSettings.stripeTestMode = !!isTestMode;

    await teacher.save();

    res.json({
      message: "Manual Stripe key saved successfully",
      testMode: teacher.paymentSettings.stripeSettings.stripeTestMode,
    });
  } catch (error: any) {
    console.error("Error updating teacher Stripe key:", error);
    res.status(500).json({
      message: "Failed to update Stripe key",
      error: error.message,
    });
  }
};
/**
 * POST /api/teachers/payment-settings/payment-mode
 * Switch between Platform Stripe and Custom Stripe
 */
export const switchTeacherPaymentMode = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { paymentMode } = req.body;

    if (!Object.values(TeacherPaymentMode).includes(paymentMode)) {
      return res.status(400).json({ message: "Invalid payment mode" });
    }

    const teacher = await Teacher.findOne({ userId });
    if (!teacher) {
      return res.status(404).json({ message: "Teacher profile not found" });
    }

    // Switching to custom Stripe requires active subscription
    if (paymentMode === TeacherPaymentMode.CUSTOM_STRIPE) {
      if (
        teacher.paymentSettings.subscriptionStatus !==
        TeacherSubscriptionStatus.ACTIVE
      ) {
        return res.status(400).json({
          message: "Active subscription required for Custom Stripe",
        });
      }

      const teacherId = teacher._id as Types.ObjectId;
      await subscriptionService.createSubscription(teacherId);
    }

    teacher.paymentSettings.paymentMode = paymentMode;
    teacher.paymentSettings.paymentModeChangedAt = new Date();

    await teacher.save();

    res.json({
      message: `Payment mode switched to ${paymentMode} successfully`,
      paymentMode,
    });
  } catch (error: any) {
    console.error("Error switching teacher payment mode:", error);
    res.status(500).json({
      message: "Failed to switch payment mode",
      error: error.message,
    });
  }
};
/**
 * GET /api/teachers/payment-settings/subscription
 */
export const getTeacherSubscriptionInfo = async (
  req: Request,
  res: Response,
) => {
  try {
    const teacher = await Teacher.findOne({ userId: req.user?.id });
    if (!teacher) {
      return res.status(404).json({ message: "Teacher profile not found" });
    }

    const teacherId = teacher._id as Types.ObjectId;
    const info = await subscriptionService.checkSubscriptionStatus(teacherId);

    res.json(info);
  } catch (error: any) {
    console.error("Error getting teacher subscription info:", error);
    res.status(500).json({
      message: "Failed to get subscription info",
      error: error.message,
    });
  }
};
/**
 * POST /api/teachers/payment-settings/subscription/pay
 */
export const payTeacherSubscription = async (req: Request, res: Response) => {
  try {
    const teacher = await Teacher.findOne({ userId: req.user?.id });
    if (!teacher) {
      return res.status(404).json({ message: "Teacher profile not found" });
    }

    const teacherId = teacher._id as Types.ObjectId;
    const result =
      await subscriptionService.processSubscriptionPayment(teacherId);

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
    console.error("Error processing teacher subscription:", error);
    res.status(500).json({
      message: "Failed to process subscription payment",
      error: error.message,
    });
  }
};

/**
 * GET /api/teachers/payment-settings/subscription/history
 */
export const getTeacherSubscriptionHistory = async (
  req: Request,
  res: Response,
) => {
  try {
    const teacher = await Teacher.findOne({ userId: req.user?.id });
    if (!teacher) {
      return res.status(404).json({ message: "Teacher profile not found" });
    }

    const teacherId = teacher._id as Types.ObjectId;
    const history = await subscriptionService.getSubscriptionHistory(teacherId);

    res.json(history);
  } catch (error: any) {
    console.error("Error getting teacher subscription history:", error);
    res.status(500).json({
      message: "Failed to get subscription history",
      error: error.message,
    });
  }
};

/**
 * POST /api/teachers/payment-settings/subscription/cancel
 */
export const cancelTeacherSubscription = async (
  req: Request,
  res: Response,
) => {
  try {
    const { reason } = req.body;

    const teacher = await Teacher.findOne({ userId: req.user?.id });
    if (!teacher) {
      return res.status(404).json({ message: "Teacher profile not found" });
    }

    const teacherId = teacher._id as Types.ObjectId;
    await subscriptionService.cancelSubscription(teacherId, reason);

    res.json({ message: "Subscription cancelled successfully" });
  } catch (error: any) {
    console.error("Error cancelling teacher subscription:", error);
    res.status(500).json({
      message: "Failed to cancel subscription",
      error: error.message,
    });
  }
};

/**
 * PUT /api/teachers/payment-settings/bank-account
 */
export const updateTeacherBankAccount = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { accountHolder, bankName, accountNumber, routingNumber } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    if (!accountHolder || !bankName || !accountNumber) {
      return res.status(400).json({
        message: "accountHolder, bankName and accountNumber are required",
      });
    }

    const teacher = await Teacher.findOne({ userId });
    if (!teacher) {
      return res.status(404).json({ message: "Teacher profile not found" });
    }

    teacher.paymentSettings.bankDetails = {
      accountHolderName: accountHolder,
      bankName,
      accountNumber,
      iban: routingNumber, // Using iban field for routing number
    };

    await teacher.save();

    res.json({
      message: "Bank account details updated successfully",
      bankAccount: {
        accountHolder,
        bankName,
      },
    });
  } catch (error: any) {
    console.error("Error updating teacher bank account:", error);
    res.status(500).json({
      message: "Failed to update bank account",
      error: error.message,
    });
  }
};

/**
 * PUT /api/teachers/payment-settings/payout-preferences
 */
export const updateTeacherPayoutPreferences = async (
  req: Request,
  res: Response,
) => {
  try {
    const userId = req.user?.id;
    const { payoutSchedule, minimumPayout, preferredPayoutMethod } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const teacher = await Teacher.findOne({ userId });
    if (!teacher) {
      return res.status(404).json({ message: "Teacher profile not found" });
    }

    if (payoutSchedule) {
      if (
        !["daily", "weekly", "bi-weekly", "monthly"].includes(payoutSchedule)
      ) {
        return res.status(400).json({ message: "Invalid payout schedule" });
      }
      teacher.paymentSettings.payoutSchedule = payoutSchedule;
    }

    if (minimumPayout !== undefined) {
      if (minimumPayout < 50) {
        return res
          .status(400)
          .json({ message: "Minimum payout must be at least 50" });
      }
      teacher.paymentSettings.minimumPayout = minimumPayout;
    }

    if (preferredPayoutMethod) {
      if (
        !["bank_transfer", "stripe", "wallet"].includes(preferredPayoutMethod)
      ) {
        return res.status(400).json({ message: "Invalid payout method" });
      }
      teacher.paymentSettings.preferredPayoutMethod = preferredPayoutMethod;
    }

    await teacher.save();

    res.json({
      message: "Payout preferences updated successfully",
      preferences: {
        payoutSchedule: teacher.paymentSettings.payoutSchedule,
        minimumPayout: teacher.paymentSettings.minimumPayout,
        preferredPayoutMethod: teacher.paymentSettings.preferredPayoutMethod,
      },
    });
  } catch (error: any) {
    console.error("Error updating teacher payout preferences:", error);
    res.status(500).json({
      message: "Failed to update payout preferences",
      error: error.message,
    });
  }
};
/**
 * POST /api/teachers/payment-settings/commission/calculate
 */
export const calculateTeacherCommissionComparison = async (
  req: Request,
  res: Response,
) => {
  try {
    const userId = req.user?.id;
    const { monthlyRevenue } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    if (!monthlyRevenue || monthlyRevenue < 0) {
      return res.status(400).json({
        message: "Valid monthly revenue is required",
      });
    }

    const teacher = await Teacher.findOne({ userId });
    if (!teacher) {
      return res.status(404).json({ message: "Teacher profile not found" });
    }

    const commissionRate = teacher.paymentSettings.commissionRate ?? 15;
    const subscriptionCost = 150;

    const commissionCost = (monthlyRevenue * commissionRate) / 100;
    const savings = commissionCost - subscriptionCost;

    res.json({
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

      recommendation:
        commissionCost > subscriptionCost ? "custom_stripe" : "platform_stripe",

      savings: Math.abs(savings),
      breakEvenPoint: (subscriptionCost / commissionRate) * 100,
    });
  } catch (error: any) {
    console.error("Error calculating teacher commission comparison:", error);
    res.status(500).json({
      message: "Failed to calculate comparison",
      error: error.message,
    });
  }
};

/**
 * PATCH /api/admin/teachers/:teacherId/verify-bank
 * Admin: approve or reject a teacher's bank account
 */
export const adminVerifyTeacherBank = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { teacherId } = req.params;
    const { verified, reason } = req.body;

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) return next(new AppError("Teacher not found", 404));

    if (!teacher.paymentSettings.bankDetails) {
      return next(new AppError("Teacher has no bank details on file", 400));
    }

    teacher.paymentSettings.bankDetails.isVerified = verified === true;
    await teacher.save();

    // Notify teacher
    const notificationType = verified ? "bank_verified" : "bank_rejected";
    const title = verified
      ? "Bank Account Verified"
      : "Bank Account Verification Failed";
    const message = verified
      ? "Your bank account has been verified and payouts are now enabled."
      : `Your bank account verification was unsuccessful.${reason ? ` Reason: ${reason}` : ""}`;

    await Notification.create({
      userId: teacher.userId,
      type: NotificationType.SYSTEM_MAINTENANCE,
      priority: NotificationPriority.HIGH,
      title,
      message,
      data: { teacherId, verified, reason },
    });

    res.json({
      success: true,
      message: `Bank account ${verified ? "verified" : "rejected"} successfully`,
      isVerified: verified === true,
    });
  } catch (error) {
    next(error);
  }
};
