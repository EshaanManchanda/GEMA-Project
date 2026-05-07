import { Request, Response, NextFunction } from "express";
import {
  Affiliate,
  User,
  Order,
  Event,
  IAffiliate,
  AffiliateStatus,
} from "../models/index";
import { AppError } from "../middleware/index";
import { ApiResponse } from "../types/index";
import * as crypto from "crypto";
import PayoutService from "../services/payout.service";

/**
 * Apply to become an affiliate
 */
export const applyAffiliate = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?._id || req.user?.id;
    const applicationData = req.body;

    if (!userId) {
      return next(new AppError("Authentication required", 401));
    }

    // Check if user already has an affiliate account
    const existingAffiliate = await Affiliate.findOne({ userId });
    if (existingAffiliate) {
      return next(new AppError("User already has an affiliate account", 400));
    }

    // Create affiliate application
    const affiliate = new Affiliate({
      userId,
      ...applicationData,
      status: AffiliateStatus.PENDING,
      applicationDate: new Date(),
    });

    await affiliate.save();
    await affiliate.populate("userId", "firstName lastName email");

    res.status(201).json({
      success: true,
      data: affiliate,
      message: "Affiliate application submitted successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user's affiliate account
 */
export const getMyAffiliate = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return next(new AppError("Authentication required", 401));
    }

    const affiliate = await Affiliate.findOne({ userId })
      .populate("userId", "firstName lastName email")
      .populate("commissions.orderId", "orderNumber total createdAt");

    if (!affiliate) {
      return next(new AppError("Affiliate account not found", 404));
    }

    // Calculate additional stats
    const stats = {
      conversionRate: affiliate.getConversionRate(),
      pendingCommission: affiliate.getTotalPendingAmount(),
      averageOrderValue:
        affiliate.totalConversions > 0
          ? affiliate.totalRevenue / affiliate.totalConversions
          : 0,
    };

    res.status(200).json({
      success: true,
      data: {
        ...affiliate.toJSON(),
        stats,
      },
      message: "Affiliate account retrieved successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update affiliate profile
 */
export const updateAffiliateProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?._id || req.user?.id;
    const updateData = req.body;

    if (!userId) {
      return next(new AppError("Authentication required", 401));
    }

    const affiliate = await Affiliate.findOne({ userId });
    if (!affiliate) {
      return next(new AppError("Affiliate account not found", 404));
    }

    // Prevent updating certain fields
    const restrictedFields = [
      "affiliateCode",
      "status",
      "totalClicks",
      "totalConversions",
      "totalRevenue",
    ];
    restrictedFields.forEach((field) => {
      if (updateData.hasOwnProperty(field)) {
        delete updateData[field];
      }
    });

    Object.assign(affiliate, updateData);
    await affiliate.save();

    res.status(200).json({
      success: true,
      data: affiliate,
      message: "Affiliate profile updated successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Generate tracking URL
 */
export const generateTrackingUrl = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { eventId, customParams } = req.body;

    if (!userId) {
      return next(new AppError("Authentication required", 401));
    }

    const affiliate = await Affiliate.findOne({
      userId,
      status: AffiliateStatus.ACTIVE,
    });
    if (!affiliate) {
      return next(new AppError("Active affiliate account not found", 404));
    }

    // Validate event if provided
    if (eventId) {
      const event = await Event.findById(eventId);
      if (!event) {
        return next(new AppError("Event not found", 404));
      }
    }

    const trackingUrl = affiliate.generateTrackingUrl(eventId, customParams);

    res.status(200).json({
      success: true,
      data: {
        trackingUrl,
        affiliateCode: affiliate.affiliateCode,
      },
      message: "Tracking URL generated successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Record affiliate click (public endpoint)
 */
export const recordClick = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { affiliateCode } = req.params;
    const clickData = {
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers["user-agent"],
      referrer: req.headers.referer,
      ...req.body,
    };

    const affiliate = await Affiliate.findByCode(affiliateCode);
    if (!affiliate) {
      return next(new AppError("Invalid affiliate code", 404));
    }

    if (affiliate.status !== AffiliateStatus.ACTIVE) {
      return next(new AppError("Affiliate account is not active", 400));
    }

    await affiliate.recordClick(clickData);

    res.status(200).json({
      success: true,
      data: null,
      message: "Click recorded successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get affiliate dashboard stats
 */
export const getDashboardStats = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { period = "30" } = req.query; // days

    if (!userId) {
      return next(new AppError("Authentication required", 401));
    }

    const affiliate = await Affiliate.findOne({ userId });
    if (!affiliate) {
      return next(new AppError("Affiliate account not found", 404));
    }

    const periodDays = parseInt(period as string);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    // Get period-specific data
    const periodClicks = affiliate.clicks.filter(
      (click) => click.clickedAt >= startDate,
    );

    const periodConversions = affiliate.clicks.filter(
      (click) =>
        click.converted &&
        click.conversionDate &&
        click.conversionDate >= startDate,
    );

    const periodCommissions = affiliate.commissions.filter(
      (commission) => commission.createdAt >= startDate,
    );

    const periodRevenue = periodCommissions.reduce(
      (sum, c) => sum + c.orderAmount,
      0,
    );
    const periodCommissionEarned = periodCommissions.reduce(
      (sum, c) => sum + c.commissionAmount,
      0,
    );

    // Daily breakdown for charts
    const dailyStats = [];
    for (let i = periodDays - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayStart = new Date(date.setHours(0, 0, 0, 0));
      const dayEnd = new Date(date.setHours(23, 59, 59, 999));

      const dayClicks = periodClicks.filter(
        (c) => c.clickedAt >= dayStart && c.clickedAt <= dayEnd,
      ).length;

      const dayConversions = periodConversions.filter(
        (c) => c.conversionDate >= dayStart && c.conversionDate <= dayEnd,
      ).length;

      const dayCommissions = periodCommissions.filter(
        (c) => c.createdAt >= dayStart && c.createdAt <= dayEnd,
      );

      const dayRevenue = dayCommissions.reduce(
        (sum, c) => sum + c.orderAmount,
        0,
      );
      const dayEarnings = dayCommissions.reduce(
        (sum, c) => sum + c.commissionAmount,
        0,
      );

      dailyStats.push({
        date: dayStart.toISOString().split("T")[0],
        clicks: dayClicks,
        conversions: dayConversions,
        revenue: dayRevenue,
        earnings: dayEarnings,
      });
    }

    const stats = {
      overall: {
        totalClicks: affiliate.totalClicks,
        totalConversions: affiliate.totalConversions,
        totalRevenue: affiliate.totalRevenue,
        totalEarnings: affiliate.totalCommissionEarned,
        conversionRate: affiliate.getConversionRate(),
        pendingEarnings: affiliate.getTotalPendingAmount(),
      },
      period: {
        clicks: periodClicks.length,
        conversions: periodConversions.length,
        revenue: periodRevenue,
        earnings: periodCommissionEarned,
        conversionRate:
          periodClicks.length > 0
            ? (periodConversions.length / periodClicks.length) * 100
            : 0,
      },
      dailyBreakdown: dailyStats,
    };

    res.status(200).json({
      success: true,
      data: stats,
      message: "Dashboard stats retrieved successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get affiliate commissions
 */
export const getCommissions = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { page = 1, limit = 20, status, startDate, endDate } = req.query;

    if (!userId) {
      return next(new AppError("Authentication required", 401));
    }

    const affiliate = await Affiliate.findOne({ userId });
    if (!affiliate) {
      return next(new AppError("Affiliate account not found", 404));
    }

    let commissions = [...affiliate.commissions];

    // Filter by status
    if (status) {
      commissions = commissions.filter((c) => c.status === status);
    }

    // Filter by date range
    if (startDate) {
      const start = new Date(startDate as string);
      commissions = commissions.filter((c) => c.createdAt >= start);
    }

    if (endDate) {
      const end = new Date(endDate as string);
      commissions = commissions.filter((c) => c.createdAt <= end);
    }

    // Sort by creation date (newest first)
    commissions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Pagination
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const paginatedCommissions = commissions.slice(
      skip,
      skip + parseInt(limit as string),
    );

    // Populate order details
    const orderIds = paginatedCommissions.map((c) => c.orderId);
    const orders = await Order.find({ _id: { $in: orderIds } })
      .select("orderNumber total createdAt userId")
      .populate("userId", "firstName lastName");

    const commissionsWithOrders = paginatedCommissions.map((commission) => {
      const order = orders.find(
        (o) => o._id.toString() === commission.orderId.toString(),
      );
      return {
        ...commission,
        order,
      };
    });

    res.status(200).json({
      success: true,
      data: {
        commissions: commissionsWithOrders,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total: commissions.length,
          pages: Math.ceil(commissions.length / parseInt(limit as string)),
        },
      },
      message: "Commissions retrieved successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all affiliates (admin only)
 */
export const getAllAffiliates = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      sortBy = "totalRevenue",
      sortOrder = "desc",
    } = req.query;

    const query: any = {};

    if (status) {
      query.status = status;
    }

    const sort: any = {};
    sort[sortBy as string] = sortOrder === "desc" ? -1 : 1;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [affiliates, total] = await Promise.all([
      Affiliate.find(query)
        .populate("userId", "firstName lastName email")
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit as string)),
      Affiliate.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        affiliates,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          pages: Math.ceil(total / parseInt(limit as string)),
        },
      },
      message: "Affiliates retrieved successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Approve/Reject affiliate application (admin only)
 */
export const updateAffiliateStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;
    const adminId = req.user?._id || req.user?.id;

    const affiliate = await Affiliate.findById(id).populate(
      "userId",
      "firstName lastName email",
    );
    if (!affiliate) {
      return next(new AppError("Affiliate not found", 404));
    }

    if (!Object.values(AffiliateStatus).includes(status)) {
      return next(new AppError("Invalid status", 400));
    }

    affiliate.status = status;

    if (status === AffiliateStatus.ACTIVE) {
      affiliate.approvedAt = new Date();
      affiliate.approvedBy = adminId;
    } else if (status === AffiliateStatus.SUSPENDED && rejectionReason) {
      affiliate.rejectedAt = new Date();
      affiliate.rejectionReason = rejectionReason;
    }

    await affiliate.save();

    res.status(200).json({
      success: true,
      data: affiliate,
      message: `Affiliate status updated to ${status}`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get top performing affiliates (admin only)
 */
export const getTopPerformers = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { limit = 10, period = "30" } = req.query;

    const affiliates = await Affiliate.findTopPerformers(
      parseInt(limit as string),
    );

    // Calculate period-specific performance
    const periodDays = parseInt(period as string);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    const performersWithPeriodStats = await Promise.all(
      affiliates.map(async (affiliate) => {
        const periodCommissions = affiliate.commissions.filter(
          (c) => c.createdAt >= startDate,
        );

        const periodRevenue = periodCommissions.reduce(
          (sum, c) => sum + c.orderAmount,
          0,
        );
        const periodEarnings = periodCommissions.reduce(
          (sum, c) => sum + c.commissionAmount,
          0,
        );

        return {
          ...affiliate.toJSON(),
          periodStats: {
            revenue: periodRevenue,
            earnings: periodEarnings,
            conversions: periodCommissions.length,
          },
        };
      }),
    );

    res.status(200).json({
      success: true,
      data: performersWithPeriodStats,
      message: "Top performers retrieved successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get affiliate analytics (admin only)
 */
export const getAffiliateAnalytics = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;

    const matchQuery: any = {};

    if (startDate || endDate) {
      matchQuery.createdAt = {};
      if (startDate) matchQuery.createdAt.$gte = new Date(startDate as string);
      if (endDate) matchQuery.createdAt.$lte = new Date(endDate as string);
    }

    const analytics = await Affiliate.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalAffiliates: { $sum: 1 },
          activeAffiliates: {
            $sum: {
              $cond: [{ $eq: ["$status", AffiliateStatus.ACTIVE] }, 1, 0],
            },
          },
          pendingAffiliates: {
            $sum: {
              $cond: [{ $eq: ["$status", AffiliateStatus.PENDING] }, 1, 0],
            },
          },
          totalClicks: { $sum: "$totalClicks" },
          totalConversions: { $sum: "$totalConversions" },
          totalRevenue: { $sum: "$totalRevenue" },
          totalCommissionEarned: { $sum: "$totalCommissionEarned" },
          totalCommissionPaid: { $sum: "$totalCommissionPaid" },
        },
      },
      {
        $project: {
          totalAffiliates: 1,
          activeAffiliates: 1,
          pendingAffiliates: 1,
          totalClicks: 1,
          totalConversions: 1,
          totalRevenue: 1,
          totalCommissionEarned: 1,
          totalCommissionPaid: 1,
          averageConversionRate: {
            $cond: [
              { $gt: ["$totalClicks", 0] },
              {
                $multiply: [
                  { $divide: ["$totalConversions", "$totalClicks"] },
                  100,
                ],
              },
              0,
            ],
          },
          averageCommissionRate: {
            $cond: [
              { $gt: ["$totalRevenue", 0] },
              {
                $multiply: [
                  { $divide: ["$totalCommissionEarned", "$totalRevenue"] },
                  100,
                ],
              },
              0,
            ],
          },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: analytics[0] || {
        totalAffiliates: 0,
        activeAffiliates: 0,
        pendingAffiliates: 0,
        totalClicks: 0,
        totalConversions: 0,
        totalRevenue: 0,
        totalCommissionEarned: 0,
        totalCommissionPaid: 0,
        averageConversionRate: 0,
        averageCommissionRate: 0,
      },
      message: "Affiliate analytics retrieved successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/affiliates/payout-request
 * Request a payout for pending commissions
 */
export const requestAffiliatePayout = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return next(new AppError("Authentication required", 401));

    const affiliate = await Affiliate.findOne({ userId });
    if (!affiliate) return next(new AppError("Affiliate account not found", 404));
    if (!affiliate.canReceivePayout()) {
      return next(new AppError("Not eligible for payout. Check status and minimum amount.", 400));
    }

    await PayoutService.processAffiliatePayouts(affiliate._id.toString());

    res.status(200).json({
      success: true,
      message: "Affiliate payout processed successfully",
    });
  } catch (error) {
    next(error);
  }
};
