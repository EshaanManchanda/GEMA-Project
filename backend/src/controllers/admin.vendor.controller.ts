import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { AppError } from '../middleware/index';
import { ApiResponse, AuthRequest } from '../types/index';
import Vendor, { PaymentMode, VendorSubscriptionStatus } from '../models/Vendor';
import User from '../models/User';

/**
 * Get all vendors with pagination
 * @route GET /api/admin/vendors
 */
export const getAllVendors = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      page = '1',
      limit = '10',
      search,
      paymentMode,
      isActive,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query: any = {};

    // Search by business name or email
    if (search) {
      query.$or = [
        { businessName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by payment mode
    if (paymentMode && Object.values(PaymentMode).includes(paymentMode as PaymentMode)) {
      query['paymentSettings.paymentMode'] = paymentMode;
    }

    // Filter by active status
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const sortObj: any = {};
    sortObj[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

    const [vendors, total] = await Promise.all([
      Vendor.find(query)
        .populate('userId', 'firstName lastName email')
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Vendor.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / limitNum);

    const response: ApiResponse = {
      success: true,
      message: 'Vendors retrieved successfully',
      data: {
        vendors: vendors.map(vendor => ({
          id: vendor._id,
          businessName: vendor.businessName,
          email: vendor.email,
          phone: vendor.phone,
          user: vendor.userId,
          paymentMode: vendor.paymentSettings?.paymentMode || PaymentMode.PLATFORM_STRIPE,
          commissionRate: vendor.paymentSettings?.commissionRate || 5,
          subscriptionStatus: vendor.paymentSettings?.subscriptionStatus,
          subscriptionPaidUntil: vendor.paymentSettings?.subscriptionPaidUntil,
          isActive: vendor.isActive,
          isSuspended: vendor.isSuspended,
          verificationStatus: vendor.verificationStatus,
          createdAt: vendor.createdAt
        })),
        pagination: {
          currentPage: pageNum,
          totalPages,
          total,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1,
          limit: limitNum
        }
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get vendor by ID
 * @route GET /api/admin/vendors/:id
 */
export const getVendorById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError('Invalid vendor ID', 400));
    }

    const vendor = await Vendor.findById(id)
      .populate('userId', 'firstName lastName email')
      .lean();

    if (!vendor) {
      return next(new AppError('Vendor not found', 404));
    }

    const response: ApiResponse = {
      success: true,
      message: 'Vendor retrieved successfully',
      data: {
        vendor: {
          id: vendor._id,
          businessName: vendor.businessName,
          email: vendor.email,
          phone: vendor.phone,
          user: vendor.userId,
          paymentSettings: {
            paymentMode: vendor.paymentSettings?.paymentMode || PaymentMode.PLATFORM_STRIPE,
            paymentModeChangedAt: vendor.paymentSettings?.paymentModeChangedAt,
            commissionRate: vendor.paymentSettings?.commissionRate || 5,
            customCommissionRate: vendor.paymentSettings?.customCommissionRate,
            subscriptionStatus: vendor.paymentSettings?.subscriptionStatus,
            subscriptionAmount: vendor.paymentSettings?.subscriptionAmount || 150,
            subscriptionStartDate: vendor.paymentSettings?.subscriptionStartDate,
            subscriptionPaidUntil: vendor.paymentSettings?.subscriptionPaidUntil,
            subscriptionHistory: vendor.paymentSettings?.subscriptionHistory || []
          },
          isActive: vendor.isActive,
          isSuspended: vendor.isSuspended,
          suspensionReason: vendor.suspensionReason,
          verificationStatus: vendor.verificationStatus,
          stats: vendor.stats,
          createdAt: vendor.createdAt
        }
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Update vendor payment mode (commission/subscription)
 * @route PUT /api/admin/vendors/:id/payment-mode
 */
export const updateVendorPaymentMode = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { paymentMode, commissionRate, subscriptionAmount } = req.body;
    const adminId = req.user?._id || req.user?.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError('Invalid vendor ID', 400));
    }

    // Validate payment mode
    if (!paymentMode || !Object.values(PaymentMode).includes(paymentMode)) {
      return next(new AppError('Invalid payment mode. Must be "platform_stripe" or "custom_stripe"', 400));
    }

    const vendor = await Vendor.findById(id);

    if (!vendor) {
      return next(new AppError('Vendor not found', 404));
    }

    // Update payment mode
    vendor.paymentSettings.paymentMode = paymentMode;
    vendor.paymentSettings.paymentModeChangedAt = new Date();
    vendor.paymentSettings.paymentModeChangedBy = adminId;

    // Update commission rate if provided and in commission mode
    if (paymentMode === PaymentMode.PLATFORM_STRIPE && commissionRate !== undefined) {
      vendor.paymentSettings.commissionRate = Number(commissionRate);
    }

    // If switching to subscription mode, initialize subscription
    if (paymentMode === PaymentMode.CUSTOM_STRIPE) {
      // Set subscription amount if provided
      if (subscriptionAmount !== undefined) {
        vendor.paymentSettings.subscriptionAmount = Number(subscriptionAmount);
      }

      // If not already set, set status to pending (waiting for payment)
      if (!vendor.paymentSettings.subscriptionStatus ||
          vendor.paymentSettings.subscriptionStatus === VendorSubscriptionStatus.INACTIVE) {
        vendor.paymentSettings.subscriptionStatus = VendorSubscriptionStatus.PENDING;
      }
    }

    // If switching back to commission mode, keep subscription data but mark inactive
    if (paymentMode === PaymentMode.PLATFORM_STRIPE) {
      vendor.paymentSettings.subscriptionStatus = VendorSubscriptionStatus.INACTIVE;
    }

    await vendor.save();

    const response: ApiResponse = {
      success: true,
      message: `Vendor payment mode updated to ${paymentMode === PaymentMode.PLATFORM_STRIPE ? 'Commission' : 'Subscription'}`,
      data: {
        vendor: {
          id: vendor._id,
          businessName: vendor.businessName,
          paymentSettings: {
            paymentMode: vendor.paymentSettings.paymentMode,
            paymentModeChangedAt: vendor.paymentSettings.paymentModeChangedAt,
            commissionRate: vendor.paymentSettings.commissionRate,
            subscriptionStatus: vendor.paymentSettings.subscriptionStatus,
            subscriptionAmount: vendor.paymentSettings.subscriptionAmount,
            subscriptionPaidUntil: vendor.paymentSettings.subscriptionPaidUntil
          }
        }
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Update vendor subscription status manually
 * @route PUT /api/admin/vendors/:id/subscription-status
 */
export const updateVendorSubscriptionStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { subscriptionStatus, subscriptionPaidUntil, addPayment } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError('Invalid vendor ID', 400));
    }

    const vendor = await Vendor.findById(id);

    if (!vendor) {
      return next(new AppError('Vendor not found', 404));
    }

    // Validate subscription status
    if (subscriptionStatus && !Object.values(VendorSubscriptionStatus).includes(subscriptionStatus)) {
      return next(new AppError('Invalid subscription status', 400));
    }

    // Update subscription status
    if (subscriptionStatus) {
      vendor.paymentSettings.subscriptionStatus = subscriptionStatus;
    }

    // Update paid until date
    if (subscriptionPaidUntil) {
      vendor.paymentSettings.subscriptionPaidUntil = new Date(subscriptionPaidUntil);
    }

    // Add manual payment record if requested
    if (addPayment) {
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      if (!vendor.paymentSettings.subscriptionHistory) {
        vendor.paymentSettings.subscriptionHistory = [];
      }

      vendor.paymentSettings.subscriptionHistory.push({
        paymentDate: now,
        amount: vendor.paymentSettings.subscriptionAmount || 150,
        periodStart: now,
        periodEnd: periodEnd,
        status: 'paid',
        transactionId: `MANUAL-${Date.now()}`
      });

      // Update subscription dates
      if (!vendor.paymentSettings.subscriptionStartDate) {
        vendor.paymentSettings.subscriptionStartDate = now;
      }
      vendor.paymentSettings.subscriptionPaidUntil = periodEnd;
      vendor.paymentSettings.subscriptionStatus = VendorSubscriptionStatus.ACTIVE;
    }

    // Handle vendor status based on subscription
    if (subscriptionStatus === VendorSubscriptionStatus.ACTIVE) {
      vendor.isActive = true;
    } else if (subscriptionStatus === VendorSubscriptionStatus.EXPIRED ||
               subscriptionStatus === VendorSubscriptionStatus.SUSPENDED) {
      // Optionally deactivate vendor when subscription expires
      // vendor.isActive = false;
    }

    await vendor.save();

    const response: ApiResponse = {
      success: true,
      message: 'Vendor subscription status updated successfully',
      data: {
        vendor: {
          id: vendor._id,
          businessName: vendor.businessName,
          subscriptionStatus: vendor.paymentSettings.subscriptionStatus,
          subscriptionPaidUntil: vendor.paymentSettings.subscriptionPaidUntil,
          isActive: vendor.isActive
        }
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Update vendor active status
 * @route PUT /api/admin/vendors/:id/status
 */
export const updateVendorStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { isActive, isSuspended, suspensionReason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError('Invalid vendor ID', 400));
    }

    const vendor = await Vendor.findById(id);

    if (!vendor) {
      return next(new AppError('Vendor not found', 404));
    }

    if (isActive !== undefined) {
      vendor.isActive = isActive;
    }

    if (isSuspended !== undefined) {
      vendor.isSuspended = isSuspended;
      if (isSuspended && suspensionReason) {
        vendor.suspensionReason = suspensionReason;
      } else if (!isSuspended) {
        vendor.suspensionReason = undefined;
      }
    }

    await vendor.save();

    const response: ApiResponse = {
      success: true,
      message: 'Vendor status updated successfully',
      data: {
        vendor: {
          id: vendor._id,
          businessName: vendor.businessName,
          isActive: vendor.isActive,
          isSuspended: vendor.isSuspended,
          suspensionReason: vendor.suspensionReason
        }
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get simple vendors list for dropdowns
 * @route GET /api/admin/vendors/list
 */
export const getVendorsList = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { limit = '100' } = req.query;
    const limitNum = parseInt(limit as string);

    // Get active vendors, sorted by business name
    const vendors = await Vendor.find({ isActive: true })
      .select('_id businessName email')
      .sort({ businessName: 1 })
      .limit(limitNum)
      .lean();

    const response: ApiResponse = {
      success: true,
      message: 'Vendors list retrieved successfully',
      data: {
        vendors: vendors.map(vendor => ({
          _id: vendor._id,
          businessName: vendor.businessName,
          email: vendor.email
        }))
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get vendor statistics by payment mode
 * @route GET /api/admin/vendors/stats
 */
export const getVendorStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const [
      totalVendors,
      activeVendors,
      vendorsByPaymentMode,
      vendorsBySubscriptionStatus,
      expiringSoon
    ] = await Promise.all([
      Vendor.countDocuments(),
      Vendor.countDocuments({ isActive: true, isSuspended: false }),
      Vendor.aggregate([
        { $group: { _id: '$paymentSettings.paymentMode', count: { $sum: 1 } } }
      ]),
      Vendor.aggregate([
        {
          $match: {
            'paymentSettings.paymentMode': PaymentMode.CUSTOM_STRIPE
          }
        },
        { $group: { _id: '$paymentSettings.subscriptionStatus', count: { $sum: 1 } } }
      ]),
      // Vendors with subscription expiring in next 7 days
      Vendor.countDocuments({
        'paymentSettings.paymentMode': PaymentMode.CUSTOM_STRIPE,
        'paymentSettings.subscriptionPaidUntil': {
          $gte: new Date(),
          $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      })
    ]);

    const response: ApiResponse = {
      success: true,
      message: 'Vendor statistics retrieved successfully',
      data: {
        totalVendors,
        activeVendors,
        vendorsByPaymentMode: vendorsByPaymentMode.reduce((acc, curr) => {
          acc[curr._id || 'platform_stripe'] = curr.count;
          return acc;
        }, {} as Record<string, number>),
        vendorsBySubscriptionStatus: vendorsBySubscriptionStatus.reduce((acc, curr) => {
          acc[curr._id || 'inactive'] = curr.count;
          return acc;
        }, {} as Record<string, number>),
        subscriptionsExpiringSoon: expiringSoon
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};
