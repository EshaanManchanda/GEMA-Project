import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { AppError } from "../middleware/index";
import PayoutService from "../services/payout.service";
import RevenueTransaction from "../models/RevenueTransaction";
import Payout from "../models/Payout";
import User from "../models/User";

/**
 * Get vendor earnings (eligible for payout)
 */
export const getVendorEarnings = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const vendors = await PayoutService.getVendorsEligibleForPayout();

    res.status(200).json({
      success: true,
      data: vendors,
      count: vendors.length,
    });
  } catch (error) {
    next(new AppError((error as Error).message, 500));
  }
};

/**
 * Get specific vendor earning details
 */
export const getVendorEarning = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { vendorId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    // Get vendor info
    const vendor = await User.findById(vendorId).select(
      "firstName lastName email",
    );
    if (!vendor) {
      return next(new AppError("Vendor not found", 404));
    }

    // Get payout history
    const payoutHistory = await PayoutService.getVendorPayoutHistory(
      vendorId,
      parseInt(page as string),
      parseInt(limit as string),
    );

    // Get pending transactions
    const pendingTransactions = await RevenueTransaction.find({
      vendorId,
      payoutStatus: "pending",
      status: "completed",
    }).lean();

    const totalPending = pendingTransactions.reduce(
      (sum, tx) => sum + tx.vendorPayout,
      0,
    );

    res.status(200).json({
      success: true,
      data: {
        vendor: {
          id: vendor._id,
          name: `${vendor.firstName} ${vendor.lastName}`,
          email: vendor.email,
        },
        pending: {
          amount: totalPending,
          transactionCount: pendingTransactions.length,
          transactions: pendingTransactions,
        },
        history: payoutHistory,
      },
    });
  } catch (error) {
    next(new AppError((error as Error).message, 500));
  }
};

/**
 * Get payout requests
 */
export const getPayoutRequests = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const {
      page = 1,
      limit = 20,
      status = "all",
      vendorId,
      sortBy = "requestedAt",
      sortOrder = "desc",
    } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const query: any = {};

    if (status !== "all") {
      query.status = status;
    }

    if (vendorId) {
      query.vendorId = vendorId;
    }

    const [payoutRequests, totalRequests] = await Promise.all([
      Payout.find(query)
        .populate("vendorId", "businessName email phone")
        .populate("teacherId", "fullName email phone")
        .populate("requestedBy", "firstName lastName email")
        .sort({ [sortBy as string]: sortOrder === "asc" ? 1 : -1 })
        .skip(skip)
        .limit(parseInt(limit as string))
        .lean(),
      Payout.countDocuments(query),
    ]);

    const totalPages = Math.ceil(totalRequests / parseInt(limit as string));

    res.status(200).json({
      success: true,
      data: payoutRequests,
      pagination: {
        currentPage: parseInt(page as string),
        totalPages,
        totalRequests,
        hasNextPage: parseInt(page as string) < totalPages,
        hasPrevPage: parseInt(page as string) > 1,
        limit: parseInt(limit as string),
      },
    });
  } catch (error) {
    next(new AppError((error as Error).message, 500));
  }
};

/**
 * Get specific payout request
 */
export const getPayoutRequest = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    const payoutRequest = await Payout.findById(id)
      .populate("vendorId", "businessName email phone")
      .populate("teacherId", "fullName email phone")
      .populate("requestedBy", "firstName lastName email")
      .populate("approvedBy", "firstName lastName email")
      .lean();

    if (!payoutRequest) {
      return next(new AppError("Payout request not found", 404));
    }

    res.status(200).json({
      success: true,
      data: payoutRequest,
    });
  } catch (error) {
    next(new AppError((error as Error).message, 500));
  }
};

/**
 * Approve payout request
 */
export const approvePayoutRequest = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const payoutRequest = await Payout.findById(id);
    if (!payoutRequest) {
      return next(new AppError("Payout request not found", 404));
    }

    const adminId = (req.user?._id || req.user?.id) as mongoose.Types.ObjectId;
    await payoutRequest.approve(adminId, notes);

    res.status(200).json({
      success: true,
      message: "Payout request approved",
      data: payoutRequest,
    });
  } catch (error) {
    next(new AppError((error as Error).message, 500));
  }
};

/**
 * Reject payout request
 */
export const rejectPayoutRequest = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return next(new AppError("Rejection reason is required", 400));
    }

    const payoutRequest = await Payout.findById(id);
    if (!payoutRequest) {
      return next(new AppError("Payout request not found", 404));
    }

    const adminId = (req.user?._id || req.user?.id) as mongoose.Types.ObjectId;
    await payoutRequest.reject(adminId, reason);

    res.status(200).json({
      success: true,
      message: "Payout request rejected",
      data: payoutRequest,
    });
  } catch (error) {
    next(new AppError((error as Error).message, 500));
  }
};

/**
 * Process payout request manually
 */
export const processPayoutRequest = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { paymentReference, notes } = req.body;

    const payoutRequest = await Payout.findById(id);
    if (!payoutRequest) {
      return next(new AppError("Payout request not found", 404));
    }

    await payoutRequest.markAsCompleted(paymentReference);

    if (notes) {
      payoutRequest.adminNotes = notes;
      await payoutRequest.save();
    }

    res.status(200).json({
      success: true,
      message: "Payout marked as processed",
      data: payoutRequest,
    });
  } catch (error) {
    next(new AppError((error as Error).message, 500));
  }
};

/**
 * Bulk approve payouts
 */
export const bulkApprovePayouts = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { payoutIds, payoutMethod = "bank_transfer" } = req.body;

    if (!Array.isArray(payoutIds) || payoutIds.length === 0) {
      return next(new AppError("Payout IDs array is required", 400));
    }

    const results = [];
    const failed = [];

    const adminId = (req.user?._id || req.user?.id) as mongoose.Types.ObjectId;

    for (const payoutId of payoutIds) {
      try {
        const payoutRequest = await Payout.findById(payoutId);
        if (!payoutRequest) {
          failed.push({ id: payoutId, reason: "Not found" });
          continue;
        }

        await payoutRequest.approve(adminId);
        results.push({ id: payoutId, status: "approved" });
      } catch (error) {
        failed.push({ id: payoutId, reason: (error as Error).message });
      }
    }

    res.status(200).json({
      success: true,
      message: `${results.length} payout(s) approved successfully`,
      data: {
        successful: results,
        failed,
      },
    });
  } catch (error) {
    next(new AppError((error as Error).message, 500));
  }
};

/**
 * Bulk reject payouts
 */
export const bulkRejectPayouts = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { payoutIds, reason } = req.body;

    if (!Array.isArray(payoutIds) || payoutIds.length === 0) {
      return next(new AppError("Payout IDs array is required", 400));
    }

    if (!reason) {
      return next(new AppError("Rejection reason is required", 400));
    }

    const adminId = (req.user?._id || req.user?.id) as mongoose.Types.ObjectId;
    let rejectedCount = 0;

    for (const payoutId of payoutIds) {
      try {
        const payoutRequest = await Payout.findById(payoutId);
        if (payoutRequest) {
          await payoutRequest.reject(adminId, reason);
          rejectedCount++;
        }
      } catch {
        // continue with remaining
      }
    }

    res.status(200).json({
      success: true,
      message: `${rejectedCount} payout(s) rejected`,
      data: { modified: rejectedCount },
    });
  } catch (error) {
    next(new AppError((error as Error).message, 500));
  }
};

/**
 * Get payout statistics
 */
export const getPayoutStats = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { period = "month" } = req.query;

    const stats = await PayoutService.getPayoutStatistics(period as string);

    // Get additional stats
    const [totalPending, totalScheduled] = await Promise.all([
      RevenueTransaction.aggregate([
        {
          $match: {
            payoutStatus: "pending",
            status: "completed",
          },
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: "$vendorPayout" },
            count: { $sum: 1 },
          },
        },
      ]),
      RevenueTransaction.aggregate([
        {
          $match: {
            payoutStatus: "scheduled",
          },
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: "$vendorPayout" },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    res.status(200).json({
      success: true,
      data: {
        ...stats,
        pending: {
          amount: totalPending[0]?.totalAmount || 0,
          count: totalPending[0]?.count || 0,
        },
        scheduled: {
          amount: totalScheduled[0]?.totalAmount || 0,
          count: totalScheduled[0]?.count || 0,
        },
      },
    });
  } catch (error) {
    next(new AppError((error as Error).message, 500));
  }
};

/**
 * Get payout analytics
 */
export const getPayoutAnalytics = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const {
      startDate = new Date(new Date().setMonth(new Date().getMonth() - 1)),
      endDate = new Date(),
      groupBy = "day",
    } = req.query;

    // Get payout trends over time
    const trends = await RevenueTransaction.aggregate([
      {
        $match: {
          payoutStatus: "completed",
          payoutDate: {
            $gte: new Date(startDate as string),
            $lte: new Date(endDate as string),
          },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: groupBy === "month" ? "%Y-%m" : "%Y-%m-%d",
              date: "$payoutDate",
            },
          },
          totalAmount: { $sum: "$vendorPayout" },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    // Get payout by method
    const byMethod = await RevenueTransaction.aggregate([
      {
        $match: {
          payoutStatus: "completed",
          payoutDate: {
            $gte: new Date(startDate as string),
            $lte: new Date(endDate as string),
          },
        },
      },
      {
        $group: {
          _id: "$payoutMethod",
          totalAmount: { $sum: "$vendorPayout" },
          count: { $sum: 1 },
        },
      },
    ]);

    // Get top vendors by payout
    const topVendors = await RevenueTransaction.aggregate([
      {
        $match: {
          payoutStatus: "completed",
          payoutDate: {
            $gte: new Date(startDate as string),
            $lte: new Date(endDate as string),
          },
        },
      },
      {
        $group: {
          _id: "$vendorId",
          totalAmount: { $sum: "$vendorPayout" },
          payoutCount: { $sum: 1 },
        },
      },
      {
        $sort: { totalAmount: -1 },
      },
      {
        $limit: 10,
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "vendor",
        },
      },
      {
        $unwind: "$vendor",
      },
      {
        $project: {
          vendorId: "$_id",
          vendorName: {
            $concat: ["$vendor.firstName", " ", "$vendor.lastName"],
          },
          vendorEmail: "$vendor.email",
          totalAmount: 1,
          payoutCount: 1,
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        trends,
        byMethod,
        topVendors,
      },
    });
  } catch (error) {
    next(new AppError((error as Error).message, 500));
  }
};

/**
 * Execute an approved Payout via Stripe transfer or bank transfer
 */
export const executePayout = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    const payout = await PayoutService.executePayout(id);

    res.status(200).json({
      success: true,
      message: "Payout executed successfully",
      data: payout,
    });
  } catch (error) {
    next(new AppError((error as Error).message, 500));
  }
};

/**
 * Export payout data
 */
export const exportPayoutData = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const {
      format = "json",
      startDate,
      endDate,
      status = "all",
      vendorId,
    } = req.query;

    // Build query
    const query: any = {};

    if (status !== "all") {
      query.payoutStatus = status;
    }

    if (vendorId) {
      query.vendorId = vendorId;
    }

    if (startDate && endDate) {
      query.payoutDate = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string),
      };
    }

    // Get payout data
    const payouts = await RevenueTransaction.find(query)
      .populate("vendorId", "firstName lastName email")
      .sort({ payoutDate: -1 })
      .lean();

    if (format === "csv") {
      // Convert to CSV format
      const csvHeader = "Vendor,Email,Amount,Method,Status,Date,Reference\n";
      const csvRows = payouts
        .map((payout) => {
          const vendor = payout.vendorId as any;
          return `"${vendor.firstName} ${vendor.lastName}","${vendor.email}",${payout.vendorPayout},"${payout.payoutMethod}","${payout.payoutStatus}","${payout.payoutDate}","${payout.stripeTransferId || "N/A"}"`;
        })
        .join("\n");

      const csv = csvHeader + csvRows;

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=payouts-${Date.now()}.csv`,
      );
      res.send(csv);
    } else {
      // Return JSON
      res.status(200).json({
        success: true,
        data: payouts,
        count: payouts.length,
      });
    }
  } catch (error) {
    next(new AppError((error as Error).message, 500));
  }
};
