import { Request, Response, NextFunction } from "express";
import { AppError } from "../../middleware/index";
import { ApiResponse } from "../../types/index";
import mongoose from "mongoose";
import {
  RevenueTransaction,
  RevenueStream,
  TransactionStatus,
  PayoutStatus,
  TeacherSubscription,
  TeacherSubscriptionStatus,
  AdminRevenueSettings,
  AdvertisingCampaign,
  CampaignStatus,
  EventAddon,
  Order,
  User,
  UserRole,
} from "../../models/index";

/**
 * Interface for revenue dashboard query parameters
 */
interface RevenueDashboardQuery {
  period?: "today" | "week" | "month" | "quarter" | "year" | "custom";
  startDate?: string;
  endDate?: string;
  revenueStream?: RevenueStream;
  teacherId?: string;
}
/**
 * Interface for transaction query parameters
 */
interface TransactionQueryParams {
  page?: string;
  limit?: string;
  status?: TransactionStatus;
  payoutStatus?: PayoutStatus;
  revenueStream?: RevenueStream;
  vendorId?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

/**
 * Get teacher revenue dashboard overview
 */
export const getTeacherRevenueDashboard = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const {
      period = "month",
      startDate,
      endDate,
      revenueStream,
      teacherId,
    } = req.query as RevenueDashboardQuery;

    // Calculate date range
    let dateFilter: any = {};
    const now = new Date();

    if (period === "custom" && startDate && endDate) {
      dateFilter = {
        transactionDate: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
      };
    } else {
      switch (period) {
        case "today":
          dateFilter.transactionDate = {
            $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
          };
          break;
        case "week":
          const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
          dateFilter.transactionDate = { $gte: weekStart };
          break;
        case "month":
          dateFilter.transactionDate = {
            $gte: new Date(now.getFullYear(), now.getMonth(), 1),
          };
          break;
        case "quarter":
          const quarterStart = new Date(
            now.getFullYear(),
            Math.floor(now.getMonth() / 3) * 3,
            1,
          );
          dateFilter.transactionDate = { $gte: quarterStart };
          break;
        case "year":
          dateFilter.transactionDate = {
            $gte: new Date(now.getFullYear(), 0, 1),
          };
          break;
      }
    }

    // Build query filters
    const query: any = { ...dateFilter };
    if (revenueStream) query.revenueStream = revenueStream;
    if (teacherId) query.teacherId = teacherId;

    // Execute dashboard queries in parallel
    const [
      totalRevenue,
      revenueByStream,
      revenueByStatus,
      topTeachers,
      recentTransactions,
      monthlyTrends,
      payoutsPending,
    ] = await Promise.all([
      // Total revenue
      RevenueTransaction.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            total: { $sum: "$adminCommission" },
            count: { $sum: 1 },
          },
        },
      ]),

      // Revenue by stream
      RevenueTransaction.aggregate([
        { $match: query },
        {
          $group: {
            _id: "$revenueStream",
            revenue: { $sum: "$adminCommission" },
            count: { $sum: 1 },
          },
        },
        { $sort: { revenue: -1 } },
      ]),

      // Revenue by status
      RevenueTransaction.aggregate([
        { $match: query },
        {
          $group: {
            _id: "$status",
            revenue: { $sum: "$adminCommission" },
            count: { $sum: 1 },
          },
        },
      ]),

      // Top teachers by revenue
      RevenueTransaction.aggregate([
        { $match: query },
        {
          $group: {
            _id: "$teacherId",
            revenue: { $sum: "$adminCommission" },
            transactions: { $sum: 1 },
          },
        },
        { $sort: { revenue: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "teacher",
          },
        },
        { $unwind: "$teacher" },
      ]),

      // Recent transactions
      RevenueTransaction.find(query)
        .populate("teacherId", "firstName lastName email")
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),

      // Monthly revenue trends (last 12 months)
      RevenueTransaction.aggregate([
        {
          $match: {
            transactionDate: {
              $gte: new Date(new Date().setMonth(new Date().getMonth() - 12)),
            },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: "$transactionDate" },
              month: { $month: "$transactionDate" },
            },
            revenue: { $sum: "$adminCommission" },
            transactions: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]),

      // Pending payouts
      RevenueTransaction.aggregate([
        { $match: { payoutStatus: PayoutStatus.PENDING } },
        {
          $group: {
            _id: null,
            totalPayout: { $sum: "$recipientPayout" },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    // Format dashboard data
    const dashboard = {
      overview: {
        totalRevenue: totalRevenue[0]?.total || 0,
        totalTransactions: totalRevenue[0]?.count || 0,
        pendingPayouts: payoutsPending[0]?.totalPayout || 0,
        pendingPayoutCount: payoutsPending[0]?.count || 0,
      },
      revenueByStream: revenueByStream.reduce((acc: any, item: any) => {
        acc[item._id] = { revenue: item.revenue, count: item.count };
        return acc;
      }, {}),
      revenueByStatus: revenueByStatus.reduce((acc: any, item: any) => {
        acc[item._id] = { revenue: item.revenue, count: item.count };
        return acc;
      }, {}),
      topTeachers: topTeachers.map((teacher) => ({
        teacherId: teacher._id,
        teacherName: `${teacher.teacher.firstName} ${teacher.teacher.lastName}`,
        teacherEmail: teacher.teacher.email,
        revenue: teacher.revenue,
        transactions: teacher.transactions,
      })),
      recentTransactions: recentTransactions.map((transaction) => ({
        id: transaction._id,
        teacherName: transaction.teacherId
          ? `${(transaction.teacherId as any).firstName} ${(transaction.teacherId as any).lastName}`
          : "Unknown",
        revenueStream: transaction.revenueStream,
        totalAmount: transaction.totalAmount,
        adminCommission: transaction.adminCommission,
        status: transaction.status,
        createdAt: transaction.createdAt,
      })),
      monthlyTrends: monthlyTrends.map((trend) => ({
        month: `${trend._id.year}-${String(trend._id.month).padStart(2, "0")}`,
        revenue: trend.revenue,
        transactions: trend.transactions,
      })),
    };

    const response: ApiResponse = {
      success: true,
      message: "Teacher revenue dashboard data retrieved successfully",
      data: dashboard,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};
/**
 * Get all teacher revenue transactions with filtering and pagination
 */
export const getTeacherRevenueTransactions = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const {
      page = "1",
      limit = "20",
      status,
      payoutStatus,
      revenueStream,
      teacherId,
      startDate,
      endDate,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query as TransactionQueryParams & { teacherId?: string };

    // Build query
    const query: any = {};

    if (status) query.status = status;
    if (payoutStatus) query.payoutStatus = payoutStatus;
    if (revenueStream) query.revenueStream = revenueStream;
    if (teacherId) query.teacherId = teacherId;

    if (startDate || endDate) {
      query.transactionDate = {};
      if (startDate) query.transactionDate.$gte = new Date(startDate);
      if (endDate) query.transactionDate.$lte = new Date(endDate);
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Sort
    const sortObj: any = {};
    sortObj[sortBy] = sortOrder === "asc" ? 1 : -1;

    // Execute query
    const [transactions, totalTransactions] = await Promise.all([
      RevenueTransaction.find(query)
        .populate("teacherId", "firstName lastName email")
        .populate("customerId", "firstName lastName email")
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      RevenueTransaction.countDocuments(query),
    ]);

    const totalPages = Math.ceil(totalTransactions / limitNum);

    const response: ApiResponse = {
      success: true,
      message: "Teacher revenue transactions retrieved successfully",
      data: {
        transactions,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalTransactions,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1,
          limit: limitNum,
        },
      },
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};
/**
 * Create manual teacher revenue transaction
 */
export const createTeacherRevenueTransaction = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const {
      teacherId,
      customerId,
      totalAmount,
      adminCommission,
      serviceFeeRate,
      currency = "AED",
      revenueStream,
      category,
      description,
      metadata,
    } = req.body;

    // Validate required fields
    if (!teacherId || !totalAmount || !adminCommission || !revenueStream) {
      return next(new AppError("Missing required fields", 400));
    }

    // Validate teacher exists
    const teacher = await User.findById(teacherId);
    if (!teacher || teacher.role !== UserRole.TEACHER) {
      return next(new AppError("Invalid teacher ID", 400));
    }

    // Calculate teacher payout
    const recipientPayout = totalAmount - adminCommission;

    // Create transaction
    const transaction = new RevenueTransaction({
      teacherId,
      customerId,
      totalAmount,
      adminCommission,
      recipientPayout,
      serviceFeeRate: serviceFeeRate || 0,
      currency,
      revenueStream,
      category,
      description,
      metadata,
      status: TransactionStatus.COMPLETED,
      payoutStatus: PayoutStatus.PENDING,
      transactionDate: new Date(),
    });

    await transaction.save();

    const response: ApiResponse = {
      success: true,
      message: "Teacher revenue transaction created successfully",
      data: { transaction },
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};
/**
 * Update revenue transaction
 */
export const updateRevenueTransaction = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError("Invalid transaction ID", 400));
    }

    const transaction = await RevenueTransaction.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true },
    );

    if (!transaction) {
      return next(new AppError("Transaction not found", 404));
    }

    const response: ApiResponse = {
      success: true,
      message: "Revenue transaction updated successfully",
      data: { transaction },
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};
/**
 * Process teacher payouts
 */
export const processTeacherPayouts = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { teacherIds, payoutMethod = "bank_transfer" } = req.body;

    if (!Array.isArray(teacherIds) || teacherIds.length === 0) {
      return next(new AppError("Teacher IDs array is required", 400));
    }

    // Get pending transactions for specified teachers
    const transactions = await RevenueTransaction.find({
      teacherId: { $in: teacherIds },
      payoutStatus: PayoutStatus.PENDING,
      status: TransactionStatus.COMPLETED,
    });

    if (transactions.length === 0) {
      return next(
        new AppError(
          "No pending transactions found for specified teachers",
          404,
        ),
      );
    }

    // Process payouts
    const payoutResults: any[] = [];

    for (const transaction of transactions) {
      try {
        await transaction.markAsPaid(payoutMethod);
        payoutResults.push({
          transactionId: transaction._id,
          teacherId: transaction.teacherId,
          amount: transaction.recipientPayout,
          status: "success",
        });
      } catch (error) {
        payoutResults.push({
          transactionId: transaction._id,
          teacherId: transaction.teacherId,
          amount: transaction.recipientPayout,
          status: "failed",
          error: (error as Error).message,
        });
      }
    }

    const successfulPayouts = payoutResults.filter(
      (p) => p.status === "success",
    );
    const failedPayouts = payoutResults.filter((p) => p.status === "failed");

    const response: ApiResponse = {
      success: true,
      message: `Processed ${successfulPayouts.length} payouts successfully, ${failedPayouts.length} failed`,
      data: {
        successfulPayouts: successfulPayouts.length,
        failedPayouts: failedPayouts.length,
        details: payoutResults,
      },
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};
/**
 * Get teacher subscription analytics
 */
export const getTeacherSubscriptionAnalytics = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const [subscriptionStats, revenueByPlan, churnRate, newSubscriptions] =
      await Promise.all([
        // Overall subscription statistics
        TeacherSubscription.aggregate([
          {
            $group: {
              _id: "$status",
              count: { $sum: 1 },
              totalMRR: { $sum: "$currentPricing.monthlyPrice" },
            },
          },
        ]),

        // Revenue by subscription plan
        TeacherSubscription.aggregate([
          { $match: { status: TeacherSubscriptionStatus.ACTIVE } },
          {
            $group: {
              _id: "$plan",
              count: { $sum: 1 },
              revenue: { $sum: "$currentPricing.monthlyPrice" },
            },
          },
          { $sort: { revenue: -1 } },
        ]),

        // Churn rate (cancelled in last 30 days)
        TeacherSubscription.aggregate([
          {
            $match: {
              cancelledAt: {
                $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
              },
            },
          },
          { $count: "cancelledCount" },
        ]),

        // New subscriptions in last 30 days
        TeacherSubscription.aggregate([
          {
            $match: {
              createdAt: {
                $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
              },
            },
          },
          {
            $group: {
              _id: "$plan",
              count: { $sum: 1 },
            },
          },
        ]),
      ]);

    const response: ApiResponse = {
      success: true,
      message: "Teacher subscription analytics retrieved successfully",
      data: {
        subscriptionStats: subscriptionStats.reduce((acc: any, stat: any) => {
          acc[stat._id] = { count: stat.count, mrr: stat.totalMRR || 0 };
          return acc;
        }, {}),
        revenueByPlan: revenueByPlan.reduce((acc: any, plan: any) => {
          acc[plan._id] = { count: plan.count, revenue: plan.revenue };
          return acc;
        }, {}),
        churnedThisMonth: churnRate[0]?.cancelledCount || 0,
        newSubscriptionsThisMonth: newSubscriptions.reduce(
          (total: number, sub: any) => total + sub.count,
          0,
        ),
      },
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};
/**
 * Get teacher advertising campaign analytics
 */
export const getTeacherAdvertisingAnalytics = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const [campaignStats, revenueStats, topPerformers] = await Promise.all([
      // Campaign status distribution
      AdvertisingCampaign.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            totalSpent: { $sum: "$performanceMetrics.totalSpent" },
          },
        },
      ]),

      // Admin revenue from teacher advertising
      AdvertisingCampaign.aggregate([
        { $match: { status: CampaignStatus.ACTIVE } },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$adminRevenue" },
            totalSpent: { $sum: "$performanceMetrics.totalSpent" },
            totalImpressions: { $sum: "$performanceMetrics.impressions" },
            totalClicks: { $sum: "$performanceMetrics.clicks" },
          },
        },
      ]),

      // Top performing teacher campaigns
      AdvertisingCampaign.find({ status: CampaignStatus.ACTIVE })
        .sort({ "performanceMetrics.returnOnAdSpend": -1 })
        .limit(10)
        .populate("teacherId", "firstName lastName")
        .lean(),
    ]);

    const response: ApiResponse = {
      success: true,
      message: "Teacher advertising analytics retrieved successfully",
      data: {
        campaignStats: campaignStats.reduce((acc: any, stat: any) => {
          acc[stat._id] = {
            count: stat.count,
            totalSpent: stat.totalSpent,
          };
          return acc;
        }, {}),
        overview: revenueStats[0] || {
          totalRevenue: 0,
          totalSpent: 0,
          totalImpressions: 0,
          totalClicks: 0,
        },
        topPerformers: topPerformers.map((campaign: any) => ({
          campaignId: campaign._id,
          campaignName: campaign.campaignName,
          teacherName: campaign.teacherId
            ? `${(campaign.teacherId as any).firstName} ${(campaign.teacherId as any).lastName}`
            : "Unknown",
          adminRevenue: campaign.adminRevenue,
          totalSpent: campaign.performanceMetrics.totalSpent,
          roas: campaign.performanceMetrics.returnOnAdSpend,
        })),
      },
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};
/**
 * Get admin revenue settings
 */
export const getRevenueSettings = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const settings = await AdminRevenueSettings.getCurrentSettings();

    if (!settings) {
      return next(new AppError("Revenue settings not found", 404));
    }

    const response: ApiResponse = {
      success: true,
      message: "Revenue settings retrieved successfully",
      data: { settings },
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};
/**
 * Update admin revenue settings
 */
export const updateRevenueSettings = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const updateData = req.body;
    const adminId = (req as any).user._id;

    let settings = await AdminRevenueSettings.getCurrentSettings();

    if (!settings) {
      settings = new AdminRevenueSettings({
        ...updateData,
        lastModifiedBy: adminId,
      });
    } else {
      Object.assign(settings, updateData);
      settings.lastModifiedBy = adminId;
    }

    await settings.save();

    const response: ApiResponse = {
      success: true,
      message: "Revenue settings updated successfully",
      data: { settings },
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};
/**
 * Generate teacher revenue report
 */
export const generateTeacherRevenueReport = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const {
      startDate,
      endDate,
      format = "summary",
      includeTeacherBreakdown = false,
    } = req.query as any;

    if (!startDate || !endDate) {
      return next(new AppError("Start date and end date are required", 400));
    }

    const dateFilter = {
      transactionDate: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    };

    const [overallStats, revenueByStream, teacherBreakdown] = await Promise.all(
      [
        // Overall statistics
        RevenueTransaction.aggregate([
          { $match: dateFilter },
          {
            $group: {
              _id: null,
              totalRevenue: { $sum: "$adminCommission" },
              totalRecipientPayout: { $sum: "$recipientPayout" },
              totalTransactions: { $sum: 1 },
              avgTransactionSize: { $avg: "$totalAmount" },
            },
          },
        ]),

        // Revenue by stream
        RevenueTransaction.aggregate([
          { $match: dateFilter },
          {
            $group: {
              _id: "$revenueStream",
              revenue: { $sum: "$adminCommission" },
              transactions: { $sum: 1 },
              avgAmount: { $avg: "$adminCommission" },
            },
          },
          { $sort: { revenue: -1 } },
        ]),

        // Teacher breakdown (optional)
        includeTeacherBreakdown
          ? RevenueTransaction.aggregate([
              { $match: dateFilter },
              {
                $group: {
                  _id: "$teacherId",
                  revenue: { $sum: "$adminCommission" },
                  payout: { $sum: "$recipientPayout" },
                  transactions: { $sum: 1 },
                },
              },
              { $sort: { revenue: -1 } },
              { $limit: 50 },
              {
                $lookup: {
                  from: "users",
                  localField: "_id",
                  foreignField: "_id",
                  as: "teacher",
                },
              },
              { $unwind: "$teacher" },
            ])
          : [],
      ],
    );

    const report = {
      period: {
        startDate,
        endDate,
        generatedAt: new Date(),
      },
      overview: overallStats[0] || {
        totalRevenue: 0,
        totalRecipientPayout: 0,
        totalTransactions: 0,
        avgTransactionSize: 0,
      },
      revenueByStream: revenueByStream.reduce((acc: any, stream: any) => {
        acc[stream._id] = {
          revenue: stream.revenue,
          transactions: stream.transactions,
          avgAmount: stream.avgAmount,
        };
        return acc;
      }, {}),
      ...(includeTeacherBreakdown && {
        teacherBreakdown: teacherBreakdown.map((teacher: any) => ({
          teacherId: teacher._id,
          teacherName: `${teacher.teacher.firstName} ${teacher.teacher.lastName}`,
          teacherEmail: teacher.teacher.email,
          adminRevenue: teacher.revenue,
          recipientPayout: teacher.payout,
          transactions: teacher.transactions,
        })),
      }),
    };

    const response: ApiResponse = {
      success: true,
      message: "Teacher revenue report generated successfully",
      data: { report },
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};
