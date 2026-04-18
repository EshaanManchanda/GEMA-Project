import { Response, NextFunction } from "express";
import { AppError } from "../../middleware/index";
import { AuthRequest } from "../../types/index";
import PayoutService from "./teacher-payout.service";
import { Payout, PayoutRequestStatus } from "../../models/index";
import { User } from "../../models/index";
import { Teacher, TeacherPaymentMode } from "../../models/index";
import { CommissionTransaction } from "../../models/index";
import {
  TeacherSubscriptionStatus,
  TeacherSubscriptionPlan,
  TeacherBillingCycle,
} from "../../models/index";

/**
 * Get teacher payouts dashboard data
 * @route GET /api/teachers/payouts/dashboard
 */
export const getTeacherPayoutsDashboard = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return next(new AppError("User ID not found", 401));
    }

    // Find teacher by userId
    const teacherDoc = await Teacher.findOne({ userId });

    if (!teacherDoc) {
      return next(new AppError("Teacher profile not found", 404));
    }

    const teacherId = teacherDoc._id.toString();

    // Get earnings overview
    const earnings = await PayoutService.calculateTeacherEarnings(teacherId);

    // Get recent payout history
    const payoutHistory = await PayoutService.getTeacherPayoutHistory(
      teacherId,
      1,
      5,
    );

    // Get pending payout requests
    const pendingRequests = await Payout.find({
      teacherId: teacherDoc._id,
      status: {
        $in: [
          PayoutRequestStatus.PENDING,
          PayoutRequestStatus.APPROVED,
          PayoutRequestStatus.PROCESSING,
        ],
      },
    })
      .sort({ requestedAt: -1 })
      .limit(5)
      .lean();

    res.status(200).json({
      success: true,
      data: {
        earnings,
        recentPayouts: payoutHistory.payouts,
        pendingRequests: pendingRequests.map((req) => ({
          id: req._id,
          amount: req.amount,
          currency: req.currency,
          status: req.status,
          requestedAt: req.requestedAt,
          approvedAt: req.approvedAt,
          completedAt: req.completedAt,
        })),
        paymentSettings: {
          hasStripeAccount: teacherDoc.paymentSettings?.stripeSettings
            ?.stripeConnectAccountId
            ? true
            : false,
          subscriptionActive:
            teacherDoc.paymentSettings?.subscriptionStatus === "active",
          preferredPayoutMethod:
            teacherDoc.paymentSettings?.preferredPayoutMethod ||
            "bank_transfer",
          minimumPayout: teacherDoc.paymentSettings?.minimumPayout || 50,
          paymentMode:
            teacherDoc.paymentSettings?.paymentMode || "platform_stripe",
          commissionRate: teacherDoc.getEffectiveCommissionRate(),
          payoutSchedule:
            teacherDoc.paymentSettings?.payoutSchedule || "weekly",
        },
      },
    });
  } catch (error) {
    next(new AppError((error as Error).message, 500));
  }
};

/**
 * Get teacher payout history
 * @route GET /api/teachers/payouts/history
 */
export const getTeacherPayoutHistory = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return next(new AppError("User ID not found", 401));
    }

    // Find teacher by userId
    const teacherDoc = await Teacher.findOne({ userId });

    if (!teacherDoc) {
      return next(new AppError("Teacher profile not found", 404));
    }

    const { page = 1, limit = 20, status } = req.query;

    const query: any = { teacherId: teacherDoc._id };
    if (status) {
      query.status = status;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [payouts, total] = await Promise.all([
      Payout.find(query)
        .sort({ requestedAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Payout.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / Number(limit));

    res.status(200).json({
      success: true,
      data: {
        payouts: payouts.map((payout) => ({
          id: payout._id,
          amount: payout.amount,
          currency: payout.currency,
          status: payout.status,
          payoutMethod: payout.payoutMethod,
          requestedAt: payout.requestedAt,
          approvedAt: payout.approvedAt,
          rejectedAt: payout.rejectedAt,
          rejectionReason: payout.rejectionReason,
          completedAt: payout.completedAt,
          totalOrders: payout.totalOrders,
          paymentReference: payout.paymentReference,
        })),
        pagination: {
          currentPage: Number(page),
          totalPages,
          total,
          hasNextPage: Number(page) < totalPages,
          hasPrevPage: Number(page) > 1,
        },
      },
    });
  } catch (error) {
    next(new AppError((error as Error).message, 500));
  }
};

/**
 * Get pending earnings (detailed commission breakdown)
 * @route GET /api/teachers/payouts/pending-earnings
 */
export const getPendingEarnings = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return next(new AppError("User ID not found", 401));
    }

    // Find teacher by userId
    const teacherDoc = await Teacher.findOne({ userId });

    if (!teacherDoc) {
      return next(new AppError("Teacher profile not found", 404));
    }

    const { page = 1, limit = 20, startDate, endDate } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const breakdown = await PayoutService.getTeacherCommissionBreakdown(
      teacherDoc._id.toString(),
      {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        limit: Number(limit),
        skip,
      },
    );

    res.status(200).json({
      success: true,
      data: breakdown,
    });
  } catch (error) {
    next(new AppError((error as Error).message, 500));
  }
};

/**
 * Request payout
 * @route POST /api/teachers/payouts/request
 */
export const requestPayout = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return next(new AppError("User ID not found", 401));
    }

    // Find teacher by userId
    const teacherDoc = await Teacher.findOne({ userId });

    if (!teacherDoc) {
      return next(new AppError("Teacher profile not found", 404));
    }

    const { amount } = req.body;

    const result = await PayoutService.createTeacherPayoutRequest(
      teacherDoc._id.toString(),
      amount ? Number(amount) : undefined,
    );

    if (!result.success) {
      return next(
        new AppError(result.error || "Failed to create payout request", 400),
      );
    }

    res.status(201).json({
      success: true,
      message: "Payout request created successfully",
      data: result.payout,
    });
  } catch (error) {
    next(new AppError((error as Error).message, 500));
  }
};

/**
 * Get payout request details
 * @route GET /api/teachers/payouts/requests/:id
 */
export const getPayoutRequest = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return next(new AppError("User ID not found", 401));
    }

    // Find teacher by userId
    const teacherDoc = await Teacher.findOne({ userId });

    if (!teacherDoc) {
      return next(new AppError("Teacher profile not found", 404));
    }

    const payout = await Payout.findOne({
      _id: id,
      teacherId: teacherDoc._id,
    }).lean();

    if (!payout) {
      return next(new AppError("Payout request not found", 404));
    }

    res.status(200).json({
      success: true,
      data: {
        id: payout._id,
        amount: payout.amount,
        currency: payout.currency,
        status: payout.status,
        payoutMethod: payout.payoutMethod,
        bankDetails: payout.bankDetails,
        requestedAt: payout.requestedAt,
        approvedAt: payout.approvedAt,
        rejectedAt: payout.rejectedAt,
        rejectionReason: payout.rejectionReason,
        completedAt: payout.completedAt,
        failedAt: payout.failedAt,
        failureReason: payout.failureReason,
        totalOrders: payout.totalOrders,
        paymentReference: payout.paymentReference,
        metadata: payout.metadata,
      },
    });
  } catch (error) {
    next(new AppError((error as Error).message, 500));
  }
};

/**
 * Cancel payout request
 * @route DELETE /api/teachers/payouts/requests/:id
 */
export const cancelPayoutRequest = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return next(new AppError("User ID not found", 401));
    }

    // Find teacher by userId
    const teacherDoc = await Teacher.findOne({ userId });

    if (!teacherDoc) {
      return next(new AppError("Teacher profile not found", 404));
    }

    const payout = await Payout.findOne({
      _id: id,
      teacherId: teacherDoc._id,
    });

    if (!payout) {
      return next(new AppError("Payout request not found", 404));
    }

    if (payout.status !== PayoutRequestStatus.PENDING) {
      return next(
        new AppError("Only pending payout requests can be cancelled", 400),
      );
    }

    await payout.cancel("Cancelled by teacher");

    res.status(200).json({
      success: true,
      message: "Payout request cancelled successfully",
    });
  } catch (error) {
    next(new AppError((error as Error).message, 500));
  }
};

/**
 * Get teacher payment settings
 * @route GET /api/teachers/payouts/payment-settings
 */
export const getPaymentSettings = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return next(new AppError("User ID not found", 401));
    }

    // Find teacher by userId
    const teacherDoc = await Teacher.findOne({ userId });

    if (!teacherDoc) {
      return next(new AppError("Teacher profile not found", 404));
    }

    // Don't send sensitive Stripe keys to frontend
    const settings = {
      paymentMode: teacherDoc.paymentSettings?.paymentMode || "platform_stripe",
      commissionRate: teacherDoc.getEffectiveCommissionRate(),
      subscriptionStatus: teacherDoc.paymentSettings?.subscriptionStatus,
      subscriptionAmount: teacherDoc.paymentSettings?.subscriptionAmount,
      subscriptionPaidUntil: teacherDoc.paymentSettings?.subscriptionPaidUntil,
      payoutSchedule: teacherDoc.paymentSettings?.payoutSchedule || "weekly",
      minimumPayout: teacherDoc.paymentSettings?.minimumPayout || 50,
      preferredPayoutMethod:
        teacherDoc.paymentSettings?.preferredPayoutMethod || "bank_transfer",
      bankDetails: teacherDoc.paymentSettings?.bankDetails,
      hasStripeConnect:
        !!teacherDoc.paymentSettings?.stripeSettings?.stripeConnectAccountId,
      stripeConnectOnboarded:
        teacherDoc.paymentSettings?.stripeSettings
          ?.stripeConnectOnboardingComplete || false,
      autoPayoutEnabled: teacherDoc.paymentSettings?.autoPayoutEnabled || false,
    };

    res.status(200).json({
      success: true,
      data: settings,
    });
  } catch (error) {
    next(new AppError((error as Error).message, 500));
  }
};

/**
 * Update teacher payment settings
 * @route PUT /api/teachers/payouts/payment-settings
 */
export const updatePaymentSettings = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return next(new AppError("User ID not found", 401));
    }

    const {
      preferredPayoutMethod,
      minimumPayout,
      payoutSchedule,
      bankDetails,
      autoPayoutEnabled,
    } = req.body;

    // Find teacher by userId
    const teacherDoc = await Teacher.findOne({ userId });

    if (!teacherDoc) {
      return next(new AppError("Teacher profile not found", 404));
    }

    // Update payment settings
    if (preferredPayoutMethod) {
      teacherDoc.paymentSettings.preferredPayoutMethod = preferredPayoutMethod;
    }

    if (minimumPayout !== undefined) {
      teacherDoc.paymentSettings.minimumPayout = Number(minimumPayout);
    }

    if (payoutSchedule) {
      teacherDoc.paymentSettings.payoutSchedule = payoutSchedule;
    }

    if (bankDetails) {
      teacherDoc.paymentSettings.bankDetails = {
        ...teacherDoc.paymentSettings.bankDetails,
        ...bankDetails,
      };
    }

    if (autoPayoutEnabled !== undefined) {
      teacherDoc.paymentSettings.autoPayoutEnabled = autoPayoutEnabled;
    }

    await teacherDoc.save();

    // Return sanitized settings (no sensitive data)
    const settings = {
      paymentMode: teacherDoc.paymentSettings.paymentMode,
      commissionRate: teacherDoc.getEffectiveCommissionRate(),
      subscriptionStatus: teacherDoc.paymentSettings.subscriptionStatus,
      subscriptionAmount: teacherDoc.paymentSettings.subscriptionAmount,
      subscriptionPaidUntil: teacherDoc.paymentSettings.subscriptionPaidUntil,
      payoutSchedule: teacherDoc.paymentSettings.payoutSchedule,
      minimumPayout: teacherDoc.paymentSettings.minimumPayout,
      preferredPayoutMethod: teacherDoc.paymentSettings.preferredPayoutMethod,
      bankDetails: teacherDoc.paymentSettings.bankDetails,
      hasStripeConnect:
        !!teacherDoc.paymentSettings.stripeSettings?.stripeConnectAccountId,
      stripeConnectOnboarded:
        teacherDoc.paymentSettings.stripeSettings
          ?.stripeConnectOnboardingComplete || false,
      autoPayoutEnabled: teacherDoc.paymentSettings.autoPayoutEnabled,
    };

    res.status(200).json({
      success: true,
      message: "Payment settings updated successfully",
      data: settings,
    });
  } catch (error) {
    next(new AppError((error as Error).message, 500));
  }
};

/**
 * Get teacher subscription status (for subscription model teachers)
 * @route GET /api/teachers/payouts/subscription-status
 */
export const getSubscriptionStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return next(new AppError("User ID not found", 401));
    }

    const teacherDoc = await Teacher.findOne({ userId });

    if (!teacherDoc) {
      return next(new AppError("Teacher profile not found", 404));
    }

    const paymentSettings = teacherDoc.paymentSettings;
    const isSubscriptionModel =
      paymentSettings?.paymentMode === TeacherPaymentMode.CUSTOM_STRIPE;

    // Calculate next renewal date
    let nextRenewalDate = null;
    let daysUntilRenewal = null;
    let isExpired = false;

    if (isSubscriptionModel && paymentSettings?.subscriptionPaidUntil) {
      const paidUntil = new Date(paymentSettings.subscriptionPaidUntil);
      const now = new Date();
      nextRenewalDate = paidUntil;
      daysUntilRenewal = Math.ceil(
        (paidUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );
      isExpired = daysUntilRenewal < 0;
    }

    res.status(200).json({
      success: true,
      data: {
        paymentMode:
          paymentSettings?.paymentMode || TeacherPaymentMode.PLATFORM_STRIPE,
        isSubscriptionModel,
        subscription: isSubscriptionModel
          ? {
              status:
                paymentSettings?.subscriptionStatus ||
                TeacherSubscriptionStatus.INACTIVE,
              amount: paymentSettings?.subscriptionAmount || 150,
              currency: "AED",
              // startDate: paymentSettings?.startDate, // Not available in paymentSettings
              paidUntil: paymentSettings?.subscriptionPaidUntil,
              nextRenewalDate,
              daysUntilRenewal,
              isExpired,
              isActive: teacherDoc.isSubscriptionActive(),
            }
          : null,
        teacherStatus: {
          isActive: teacherDoc.isActive,
          isSuspended: teacherDoc.isSuspended,
        },
      },
    });
  } catch (error) {
    next(new AppError((error as Error).message, 500));
  }
};

/**
 * Get teacher commission history (for commission model teachers)
 * @route GET /api/teachers/payouts/commission-history
 */
export const getCommissionHistory = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return next(new AppError("User ID not found", 401));
    }

    const teacherDoc = await Teacher.findOne({ userId });

    if (!teacherDoc) {
      return next(new AppError("Teacher profile not found", 404));
    }

    const { page = 1, limit = 20, startDate, endDate } = req.query;

    const query: any = { teacherId: teacherDoc._id };

    // Date filters
    if (startDate || endDate) {
      query.calculatedAt = {};
      if (startDate) query.calculatedAt.$gte = new Date(startDate as string);
      if (endDate) query.calculatedAt.$lte = new Date(endDate as string);
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [transactions, total, totals] = await Promise.all([
      CommissionTransaction.find(query)
        .sort({ calculatedAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      CommissionTransaction.countDocuments(query),
      CommissionTransaction.aggregate([
        { $match: { teacherId: teacherDoc._id } },
        {
          $group: {
            _id: null,
            totalOriginalAmount: { $sum: "$originalAmount" },
            totalPlatformCommission: { $sum: "$platformCommission" },
            totalTeacherCommission: { $sum: "$vendorCommission" },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const totalPages = Math.ceil(total / Number(limit));
    const summaryTotals = totals[0] || {
      totalOriginalAmount: 0,
      totalPlatformCommission: 0,
      totalTeacherCommission: 0,
      count: 0,
    };

    res.status(200).json({
      success: true,
      data: {
        paymentMode:
          teacherDoc.paymentSettings?.paymentMode ||
          TeacherPaymentMode.PLATFORM_STRIPE,
        commissionRate: teacherDoc.getEffectiveCommissionRate(),
        transactions: transactions.map((tx) => ({
          id: tx._id,
          transactionId: tx.transactionId,
          orderNumber: tx.orderNumber,
          originalAmount: tx.originalAmount,
          platformCommission: tx.platformCommission,
          teacherCommission: tx.vendorCommission,
          status: tx.status,
          calculatedAt: tx.calculatedAt,
          paidAt: tx.paidAt,
        })),
        summary: {
          totalSales: summaryTotals.totalOriginalAmount,
          totalCommissionPaid: summaryTotals.totalPlatformCommission,
          totalEarnings: summaryTotals.totalTeacherCommission,
          totalTransactions: summaryTotals.count,
        },
        pagination: {
          currentPage: Number(page),
          totalPages,
          total,
          hasNextPage: Number(page) < totalPages,
          hasPrevPage: Number(page) > 1,
        },
      },
    });
  } catch (error) {
    next(new AppError((error as Error).message, 500));
  }
};
