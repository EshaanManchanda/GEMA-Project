import { Response, NextFunction } from 'express';
import { AppError } from '../middleware/index';
import { AuthRequest } from '../types';
import PayoutService from '../services/payout.service';
import Payout, { PayoutRequestStatus } from '../models/Payout';
import User from '../models/User';
import Vendor, { PaymentMode, VendorSubscriptionStatus } from '../models/Vendor';
import CommissionTransaction from '../models/CommissionTransaction';

/**
 * Get vendor payouts dashboard data
 * @route GET /api/vendors/payouts/dashboard
 */
export const getVendorPayoutsDashboard = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return next(new AppError('User ID not found', 401));
    }

    // Find vendor by userId
    const vendorDoc = await Vendor.findOne({ userId });

    if (!vendorDoc) {
      return next(new AppError('Vendor profile not found', 404));
    }

    const vendorId = vendorDoc._id.toString();

    // Get earnings overview
    const earnings = await PayoutService.calculateVendorEarnings(vendorId);

    // Get recent payout history
    const payoutHistory = await PayoutService.getVendorPayoutHistory(vendorId, 1, 5);

    // Get pending payout requests
    const pendingRequests = await Payout.find({
      vendorId: vendorDoc._id,
      status: { $in: [PayoutRequestStatus.PENDING, PayoutRequestStatus.APPROVED, PayoutRequestStatus.PROCESSING] }
    })
      .sort({ requestedAt: -1 })
      .limit(5)
      .lean();

    res.status(200).json({
      success: true,
      data: {
        earnings,
        recentPayouts: payoutHistory.payouts,
        pendingRequests: pendingRequests.map(req => ({
          id: req._id,
          amount: req.amount,
          currency: req.currency,
          status: req.status,
          requestedAt: req.requestedAt,
          approvedAt: req.approvedAt,
          completedAt: req.completedAt
        })),
        paymentSettings: {
          hasStripeAccount: vendorDoc.paymentSettings?.stripeSettings?.stripeConnectAccountId ? true : false,
          subscriptionActive: vendorDoc.paymentSettings?.subscriptionStatus === 'active',
          preferredPayoutMethod: vendorDoc.paymentSettings?.preferredPayoutMethod || 'bank_transfer',
          minimumPayout: vendorDoc.paymentSettings?.minimumPayout || 50,
          paymentMode: vendorDoc.paymentSettings?.paymentMode || 'platform_stripe',
          commissionRate: vendorDoc.getEffectiveCommissionRate(),
          payoutSchedule: vendorDoc.paymentSettings?.payoutSchedule || 'weekly'
        }
      }
    });
  } catch (error) {
    next(new AppError((error as Error).message, 500));
  }
};

/**
 * Get vendor payout history
 * @route GET /api/vendors/payouts/history
 */
export const getVendorPayoutHistory = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return next(new AppError('User ID not found', 401));
    }

    // Find vendor by userId
    const vendorDoc = await Vendor.findOne({ userId });

    if (!vendorDoc) {
      return next(new AppError('Vendor profile not found', 404));
    }

    const { page = 1, limit = 20, status } = req.query;

    const query: any = { vendorId: vendorDoc._id };
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
      Payout.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / Number(limit));

    res.status(200).json({
      success: true,
      data: {
        payouts: payouts.map(payout => ({
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
          paymentReference: payout.paymentReference
        })),
        pagination: {
          currentPage: Number(page),
          totalPages,
          total,
          hasNextPage: Number(page) < totalPages,
          hasPrevPage: Number(page) > 1
        }
      }
    });
  } catch (error) {
    next(new AppError((error as Error).message, 500));
  }
};

/**
 * Get pending earnings (detailed commission breakdown)
 * @route GET /api/vendors/payouts/pending-earnings
 */
export const getPendingEarnings = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return next(new AppError('User ID not found', 401));
    }

    // Find vendor by userId
    const vendorDoc = await Vendor.findOne({ userId });

    if (!vendorDoc) {
      return next(new AppError('Vendor profile not found', 404));
    }

    const {
      page = 1,
      limit = 20,
      startDate,
      endDate
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const breakdown = await PayoutService.getVendorCommissionBreakdown(
      vendorDoc._id.toString(),
      {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        limit: Number(limit),
        skip
      }
    );

    res.status(200).json({
      success: true,
      data: breakdown
    });
  } catch (error) {
    next(new AppError((error as Error).message, 500));
  }
};

/**
 * Request payout
 * @route POST /api/vendors/payouts/request
 */
export const requestPayout = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return next(new AppError('User ID not found', 401));
    }

    // Find vendor by userId
    const vendorDoc = await Vendor.findOne({ userId });

    if (!vendorDoc) {
      return next(new AppError('Vendor profile not found', 404));
    }

    const { amount } = req.body;

    const result = await PayoutService.createPayoutRequest(
      vendorDoc._id.toString(),
      amount ? Number(amount) : undefined
    );

    if (!result.success) {
      return next(new AppError(result.error || 'Failed to create payout request', 400));
    }

    res.status(201).json({
      success: true,
      message: 'Payout request created successfully',
      data: result.payout
    });
  } catch (error) {
    next(new AppError((error as Error).message, 500));
  }
};

/**
 * Get payout request details
 * @route GET /api/vendors/payouts/requests/:id
 */
export const getPayoutRequest = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return next(new AppError('User ID not found', 401));
    }

    // Find vendor by userId
    const vendorDoc = await Vendor.findOne({ userId });

    if (!vendorDoc) {
      return next(new AppError('Vendor profile not found', 404));
    }

    const payout = await Payout.findOne({
      _id: id,
      vendorId: vendorDoc._id
    }).lean();

    if (!payout) {
      return next(new AppError('Payout request not found', 404));
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
        metadata: payout.metadata
      }
    });
  } catch (error) {
    next(new AppError((error as Error).message, 500));
  }
};

/**
 * Cancel payout request
 * @route DELETE /api/vendors/payouts/requests/:id
 */
export const cancelPayoutRequest = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return next(new AppError('User ID not found', 401));
    }

    // Find vendor by userId
    const vendorDoc = await Vendor.findOne({ userId });

    if (!vendorDoc) {
      return next(new AppError('Vendor profile not found', 404));
    }

    const payout = await Payout.findOne({
      _id: id,
      vendorId: vendorDoc._id
    });

    if (!payout) {
      return next(new AppError('Payout request not found', 404));
    }

    if (payout.status !== PayoutRequestStatus.PENDING) {
      return next(new AppError('Only pending payout requests can be cancelled', 400));
    }

    await payout.cancel('Cancelled by vendor');

    res.status(200).json({
      success: true,
      message: 'Payout request cancelled successfully'
    });
  } catch (error) {
    next(new AppError((error as Error).message, 500));
  }
};

/**
 * Get vendor payment settings
 * @route GET /api/vendors/payouts/payment-settings
 */
export const getPaymentSettings = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return next(new AppError('User ID not found', 401));
    }

    // Find vendor by userId
    const vendorDoc = await Vendor.findOne({ userId });

    if (!vendorDoc) {
      return next(new AppError('Vendor profile not found', 404));
    }

    // Don't send sensitive Stripe keys to frontend
    const settings = {
      paymentMode: vendorDoc.paymentSettings?.paymentMode || 'platform_stripe',
      commissionRate: vendorDoc.getEffectiveCommissionRate(),
      subscriptionStatus: vendorDoc.paymentSettings?.subscriptionStatus,
      subscriptionAmount: vendorDoc.paymentSettings?.subscriptionAmount,
      subscriptionPaidUntil: vendorDoc.paymentSettings?.subscriptionPaidUntil,
      payoutSchedule: vendorDoc.paymentSettings?.payoutSchedule || 'weekly',
      minimumPayout: vendorDoc.paymentSettings?.minimumPayout || 50,
      preferredPayoutMethod: vendorDoc.paymentSettings?.preferredPayoutMethod || 'bank_transfer',
      bankAccountDetails: vendorDoc.paymentSettings?.bankAccountDetails,
      hasStripeConnect: !!vendorDoc.paymentSettings?.stripeSettings?.stripeConnectAccountId,
      stripeConnectOnboarded: vendorDoc.paymentSettings?.stripeSettings?.stripeConnectOnboardingComplete || false,
      autoPayoutEnabled: vendorDoc.paymentSettings?.autoPayoutEnabled || false
    };

    res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error) {
    next(new AppError((error as Error).message, 500));
  }
};

/**
 * Update vendor payment settings
 * @route PUT /api/vendors/payouts/payment-settings
 */
export const updatePaymentSettings = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return next(new AppError('User ID not found', 401));
    }

    const {
      preferredPayoutMethod,
      minimumPayout,
      payoutSchedule,
      bankAccountDetails,
      autoPayoutEnabled
    } = req.body;

    // Find vendor by userId
    const vendorDoc = await Vendor.findOne({ userId });

    if (!vendorDoc) {
      return next(new AppError('Vendor profile not found', 404));
    }

    // Update payment settings
    if (preferredPayoutMethod) {
      vendorDoc.paymentSettings.preferredPayoutMethod = preferredPayoutMethod;
    }

    if (minimumPayout !== undefined) {
      vendorDoc.paymentSettings.minimumPayout = Number(minimumPayout);
    }

    if (payoutSchedule) {
      vendorDoc.paymentSettings.payoutSchedule = payoutSchedule;
    }

    if (bankAccountDetails) {
      vendorDoc.paymentSettings.bankAccountDetails = {
        ...vendorDoc.paymentSettings.bankAccountDetails,
        ...bankAccountDetails
      };
    }

    if (autoPayoutEnabled !== undefined) {
      vendorDoc.paymentSettings.autoPayoutEnabled = autoPayoutEnabled;
    }

    await vendorDoc.save();

    // Return sanitized settings (no sensitive data)
    const settings = {
      paymentMode: vendorDoc.paymentSettings.paymentMode,
      commissionRate: vendorDoc.getEffectiveCommissionRate(),
      subscriptionStatus: vendorDoc.paymentSettings.subscriptionStatus,
      subscriptionAmount: vendorDoc.paymentSettings.subscriptionAmount,
      subscriptionPaidUntil: vendorDoc.paymentSettings.subscriptionPaidUntil,
      payoutSchedule: vendorDoc.paymentSettings.payoutSchedule,
      minimumPayout: vendorDoc.paymentSettings.minimumPayout,
      preferredPayoutMethod: vendorDoc.paymentSettings.preferredPayoutMethod,
      bankAccountDetails: vendorDoc.paymentSettings.bankAccountDetails,
      hasStripeConnect: !!vendorDoc.paymentSettings.stripeSettings?.stripeConnectAccountId,
      stripeConnectOnboarded: vendorDoc.paymentSettings.stripeSettings?.stripeConnectOnboardingComplete || false,
      autoPayoutEnabled: vendorDoc.paymentSettings.autoPayoutEnabled
    };

    res.status(200).json({
      success: true,
      message: 'Payment settings updated successfully',
      data: settings
    });
  } catch (error) {
    next(new AppError((error as Error).message, 500));
  }
};

/**
 * Get vendor subscription status (for subscription model vendors)
 * @route GET /api/vendors/payouts/subscription-status
 */
export const getSubscriptionStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return next(new AppError('User ID not found', 401));
    }

    const vendorDoc = await Vendor.findOne({ userId });

    if (!vendorDoc) {
      return next(new AppError('Vendor profile not found', 404));
    }

    const paymentSettings = vendorDoc.paymentSettings;
    const isSubscriptionModel = paymentSettings?.paymentMode === PaymentMode.CUSTOM_STRIPE;

    // Calculate next renewal date
    let nextRenewalDate = null;
    let daysUntilRenewal = null;
    let isExpired = false;

    if (isSubscriptionModel && paymentSettings?.subscriptionPaidUntil) {
      const paidUntil = new Date(paymentSettings.subscriptionPaidUntil);
      const now = new Date();
      nextRenewalDate = paidUntil;
      daysUntilRenewal = Math.ceil((paidUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      isExpired = daysUntilRenewal < 0;
    }

    res.status(200).json({
      success: true,
      data: {
        paymentMode: paymentSettings?.paymentMode || PaymentMode.PLATFORM_STRIPE,
        isSubscriptionModel,
        subscription: isSubscriptionModel ? {
          status: paymentSettings?.subscriptionStatus || VendorSubscriptionStatus.INACTIVE,
          amount: paymentSettings?.subscriptionAmount || 150,
          currency: 'AED',
          startDate: paymentSettings?.subscriptionStartDate,
          paidUntil: paymentSettings?.subscriptionPaidUntil,
          nextRenewalDate,
          daysUntilRenewal,
          isExpired,
          isActive: vendorDoc.isSubscriptionActive(),
          paymentHistory: (paymentSettings?.subscriptionHistory || []).slice(-10).reverse()
        } : null,
        vendorStatus: {
          isActive: vendorDoc.isActive,
          isSuspended: vendorDoc.isSuspended,
          suspensionReason: vendorDoc.suspensionReason
        }
      }
    });
  } catch (error) {
    next(new AppError((error as Error).message, 500));
  }
};

/**
 * Get vendor commission history (for commission model vendors)
 * @route GET /api/vendors/payouts/commission-history
 */
export const getCommissionHistory = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return next(new AppError('User ID not found', 401));
    }

    const vendorDoc = await Vendor.findOne({ userId });

    if (!vendorDoc) {
      return next(new AppError('Vendor profile not found', 404));
    }

    const { page = 1, limit = 20, startDate, endDate } = req.query;

    const query: any = { vendorId: vendorDoc._id };

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
        { $match: { vendorId: vendorDoc._id } },
        {
          $group: {
            _id: null,
            totalOriginalAmount: { $sum: '$originalAmount' },
            totalPlatformCommission: { $sum: '$platformCommission' },
            totalVendorCommission: { $sum: '$vendorCommission' },
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    const totalPages = Math.ceil(total / Number(limit));
    const summaryTotals = totals[0] || {
      totalOriginalAmount: 0,
      totalPlatformCommission: 0,
      totalVendorCommission: 0,
      count: 0
    };

    res.status(200).json({
      success: true,
      data: {
        paymentMode: vendorDoc.paymentSettings?.paymentMode || PaymentMode.PLATFORM_STRIPE,
        commissionRate: vendorDoc.getEffectiveCommissionRate(),
        transactions: transactions.map(tx => ({
          id: tx._id,
          transactionId: tx.transactionId,
          orderNumber: tx.orderNumber,
          originalAmount: tx.originalAmount,
          platformCommission: tx.platformCommission,
          vendorCommission: tx.vendorCommission,
          status: tx.status,
          calculatedAt: tx.calculatedAt,
          paidAt: tx.paidAt
        })),
        summary: {
          totalSales: summaryTotals.totalOriginalAmount,
          totalCommissionPaid: summaryTotals.totalPlatformCommission,
          totalEarnings: summaryTotals.totalVendorCommission,
          totalTransactions: summaryTotals.count
        },
        pagination: {
          currentPage: Number(page),
          totalPages,
          total,
          hasNextPage: Number(page) < totalPages,
          hasPrevPage: Number(page) > 1
        }
      }
    });
  } catch (error) {
    next(new AppError((error as Error).message, 500));
  }
};
