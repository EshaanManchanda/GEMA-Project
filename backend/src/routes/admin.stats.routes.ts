import { Router, Response, NextFunction } from "express";
import { AuthRequest } from "../types/index";
import { authenticate, authorize, validate } from "../middleware/index";
import { UserRole } from "../models/User";
import { validateDashboardDateRange } from "../validators/admin.validator";
import Payout, { PayoutRequestStatus } from "../models/Payout";
import CommissionTransaction, {
  CommissionTransactionStatus,
} from "../models/CommissionTransaction";

const router = Router();

// Apply authentication and admin authorization to all routes
router.use(authenticate);
router.use(authorize([UserRole.ADMIN]));

/**
 * @route   GET /api/admin/payout-stats
 * @desc    Get payout statistics for admin dashboard
 * @access  Admin only
 */
router.get(
  "/payout-stats",
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { startDate, endDate, vendorType } = req.query as Record<string, string>;

      const matchStage: Record<string, unknown> = {};
      if (startDate || endDate) {
        matchStage.requestedAt = {};
        if (startDate) (matchStage.requestedAt as Record<string, unknown>).$gte = new Date(startDate);
        if (endDate)   (matchStage.requestedAt as Record<string, unknown>).$lte = new Date(endDate);
      }
      if (vendorType === "vendor" || vendorType === "teacher") {
        matchStage.vendorType = vendorType;
      }

      const [byStatus, totals, topVendors] = await Promise.all([
        // Sum by status
        Payout.aggregate([
          { $match: matchStage },
          {
            $group: {
              _id: "$status",
              count: { $sum: 1 },
              totalAmount: { $sum: "$amount" },
            },
          },
        ]),

        // Overall totals
        Payout.aggregate([
          { $match: matchStage },
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              totalAmount: { $sum: "$amount" },
              avgAmount: { $avg: "$amount" },
            },
          },
        ]),

        // Top vendors by payout amount
        Payout.aggregate([
          { $match: { ...matchStage, status: PayoutRequestStatus.COMPLETED } },
          {
            $group: {
              _id: "$vendorId",
              vendorName: { $first: "$vendorName" },
              totalPaid: { $sum: "$amount" },
              count: { $sum: 1 },
            },
          },
          { $sort: { totalPaid: -1 } },
          { $limit: 10 },
        ]),
      ]);

      const statusMap: Record<string, { count: number; totalAmount: number }> = {};
      for (const row of byStatus) {
        statusMap[row._id] = { count: row.count, totalAmount: row.totalAmount };
      }
      const overall = totals[0] || {};

      res.status(200).json({
        success: true,
        message: "Payout statistics retrieved successfully",
        data: {
          totalPayouts:     overall.total      || 0,
          totalAmount:      overall.totalAmount || 0,
          averagePayoutAmount: overall.avgAmount || 0,
          pendingPayouts:   statusMap[PayoutRequestStatus.PENDING]?.count       || 0,
          pendingAmount:    statusMap[PayoutRequestStatus.PENDING]?.totalAmount  || 0,
          completedPayouts: statusMap[PayoutRequestStatus.COMPLETED]?.count      || 0,
          completedAmount:  statusMap[PayoutRequestStatus.COMPLETED]?.totalAmount || 0,
          rejectedPayouts:  statusMap[PayoutRequestStatus.REJECTED]?.count       || 0,
          processingPayouts:statusMap[PayoutRequestStatus.PROCESSING]?.count     || 0,
          currency: "AED",
          topVendors,
          byStatus: statusMap,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * @route   GET /api/admin/commission-stats
 * @desc    Get commission statistics for admin dashboard
 * @access  Admin only
 */
router.get(
  "/commission-stats",
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { startDate, endDate } = req.query as Record<string, string>;

      const matchStage: Record<string, unknown> = {};
      if (startDate || endDate) {
        matchStage.calculatedAt = {};
        if (startDate) (matchStage.calculatedAt as Record<string, unknown>).$gte = new Date(startDate);
        if (endDate)   (matchStage.calculatedAt as Record<string, unknown>).$lte = new Date(endDate);
      }

      const [byStatus, totals, topVendors, avgRate] = await Promise.all([
        // By status
        CommissionTransaction.aggregate([
          { $match: matchStage },
          {
            $group: {
              _id: "$status",
              count: { $sum: 1 },
              totalAmount: { $sum: "$platformCommission" },
            },
          },
        ]),

        // Totals
        CommissionTransaction.aggregate([
          { $match: matchStage },
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              totalPlatformCommission: { $sum: "$platformCommission" },
              totalOriginal: { $sum: "$originalAmount" },
            },
          },
        ]),

        // Top vendors by commission paid
        CommissionTransaction.aggregate([
          { $match: { ...matchStage, status: CommissionTransactionStatus.PAID } },
          {
            $group: {
              _id: "$vendorId",
              vendorName: { $first: "$vendorName" },
              totalCommission: { $sum: "$platformCommission" },
              orderCount: { $sum: 1 },
            },
          },
          { $sort: { totalCommission: -1 } },
          { $limit: 10 },
        ]),

        // Average commission rate
        CommissionTransaction.aggregate([
          { $match: matchStage },
          {
            $group: {
              _id: null,
              avgRate: {
                $avg: {
                  $cond: [
                    { $gt: ["$originalAmount", 0] },
                    { $multiply: [{ $divide: ["$platformCommission", "$originalAmount"] }, 100] },
                    0,
                  ],
                },
              },
            },
          },
        ]),
      ]);

      const statusMap: Record<string, { count: number; totalAmount: number }> = {};
      for (const row of byStatus) {
        statusMap[row._id] = { count: row.count, totalAmount: row.totalAmount };
      }
      const overall = totals[0] || {};

      // Shape topVendors to match frontend CommissionStats interface
      const topVendorsMapped = topVendors.map((v: any) => ({
        vendorId:         String(v._id),
        vendorName:       v.vendorName || "",
        totalCommissions: v.orderCount || 0,
        totalAmount:      v.totalCommission || 0,
      }));

      res.status(200).json({
        success: true,
        message: "Commission statistics retrieved successfully",
        data: {
          totalCommissions:    overall.total || 0,
          totalAmount:         overall.totalPlatformCommission || 0,
          totalGrossAmount:    overall.totalOriginal || 0,
          averageCommissionRate: parseFloat((avgRate[0]?.avgRate || 0).toFixed(2)),
          pendingCommissions:    statusMap[CommissionTransactionStatus.CALCULATED]?.count       || 0,
          pendingAmount:         statusMap[CommissionTransactionStatus.CALCULATED]?.totalAmount  || 0,
          approvedCommissions:   statusMap[CommissionTransactionStatus.APPROVED]?.count          || 0,
          approvedAmount:        statusMap[CommissionTransactionStatus.APPROVED]?.totalAmount    || 0,
          paidCommissions:       statusMap[CommissionTransactionStatus.PAID]?.count              || 0,
          paidAmount:            statusMap[CommissionTransactionStatus.PAID]?.totalAmount        || 0,
          cancelledCommissions:  statusMap[CommissionTransactionStatus.CANCELLED]?.count         || 0,
          currency: "AED",
          topVendors: topVendorsMapped,
          byStatus: statusMap,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * @route   GET /api/admin/dashboard-all
 * @desc    Get all dashboard data in a single request
 * @access  Admin only
 */
router.get(
  "/dashboard-all",
  validateDashboardDateRange,
  validate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      // Import analytics service
      const { analyticsService } =
        await import("../services/analytics.service");

      // Fetch dashboard summary from analytics service
      const dashboardSummary = await analyticsService.getDashboardSummary();

      // Add real payout and commission stats
      const [payoutAgg, commissionAgg] = await Promise.all([
        Payout.aggregate([
          {
            $group: {
              _id: "$status",
              count: { $sum: 1 },
              totalAmount: { $sum: "$amount" },
            },
          },
        ]),
        CommissionTransaction.aggregate([
          {
            $group: {
              _id: "$status",
              count: { $sum: 1 },
              totalAmount: { $sum: "$platformCommission" },
            },
          },
        ]),
      ]);

      const payoutByStatus: Record<string, { count: number; totalAmount: number }> = {};
      for (const r of payoutAgg) payoutByStatus[r._id] = { count: r.count, totalAmount: r.totalAmount };
      const commByStatus: Record<string, { count: number; totalAmount: number }> = {};
      for (const r of commissionAgg) commByStatus[r._id] = { count: r.count, totalAmount: r.totalAmount };

      const payoutStats = {
        pendingPayouts:   payoutByStatus[PayoutRequestStatus.PENDING]?.count        || 0,
        pendingAmount:    payoutByStatus[PayoutRequestStatus.PENDING]?.totalAmount   || 0,
        completedPayouts: payoutByStatus[PayoutRequestStatus.COMPLETED]?.count       || 0,
        completedAmount:  payoutByStatus[PayoutRequestStatus.COMPLETED]?.totalAmount || 0,
        rejectedPayouts:  payoutByStatus[PayoutRequestStatus.REJECTED]?.count        || 0,
        currency: "AED",
      };

      const commissionStats = {
        paidCommissions:     commByStatus[CommissionTransactionStatus.PAID]?.count        || 0,
        paidAmount:          commByStatus[CommissionTransactionStatus.PAID]?.totalAmount   || 0,
        approvedCommissions: commByStatus[CommissionTransactionStatus.APPROVED]?.count     || 0,
        approvedAmount:      commByStatus[CommissionTransactionStatus.APPROVED]?.totalAmount || 0,
        pendingCommissions:  commByStatus[CommissionTransactionStatus.CALCULATED]?.count   || 0,
        pendingAmount:       commByStatus[CommissionTransactionStatus.CALCULATED]?.totalAmount || 0,
      };

      const allDashboardData = {
        ...dashboardSummary,
        payoutStats,
        commissionStats,
      };

      res.status(200).json({
        success: true,
        message: "All dashboard data retrieved successfully",
        data: allDashboardData,
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
