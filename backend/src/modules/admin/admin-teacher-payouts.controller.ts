import { Request, Response, NextFunction } from "express";
import { AppError } from "../../middleware/index";
import PayoutService from "../teachers/teacher-payout.service";
import { User, RevenueTransaction, PayoutStatus } from "../../models/index";

/**
 * Get teacher earnings (eligible for payout)
 */
export const getTeacherEarnings = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const teachers = await PayoutService.getTeachersEligibleForPayout();

    res.status(200).json({
      success: true,
      data: teachers,
      count: teachers.length,
    });
  } catch (error) {
    next(new AppError((error as Error).message, 500));
  }
};

/**
 * Get specific teacher earning details
 */
export const getTeacherEarning = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { teacherId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    // Get teacher info
    const teacher = await User.findById(teacherId).select(
      "firstName lastName email",
    );
    if (!teacher) {
      return next(new AppError("Teacher not found", 404));
    }

    // Get payout history
    const payoutHistory = await PayoutService.getTeacherPayoutHistory(
      teacherId,
      parseInt(page as string),
      parseInt(limit as string),
    );

    // Get pending transactions
    const pendingTransactions = await RevenueTransaction.find({
      teacherId,
      payoutStatus: "pending",
      status: "completed",
    }).lean();

    const totalPending = pendingTransactions.reduce(
      (sum, tx) => sum + tx.recipientPayout,
      0,
    );

    res.status(200).json({
      success: true,
      data: {
        teacher: {
          id: teacher._id,
          name: `${teacher.firstName} ${teacher.lastName}`,
          email: teacher.email,
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
export const getTeacherPayoutRequests = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const {
      page = 1,
      limit = 20,
      status = "all",
      teacherId,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    // Build query
    const query: any = {
      payoutStatus: {
        $in: ["scheduled", "processing", "completed", "failed"],
      },
    };

    if (status !== "all") {
      query.payoutStatus = status;
    }

    if (teacherId) {
      query.teacherId = teacherId;
    }

    // Get payout requests
    const [payoutRequests, totalRequests] = await Promise.all([
      RevenueTransaction.find(query)
        .populate(
          "teacherId",
          "firstName lastName email teacherPaymentSettings",
        )
        .sort({ [sortBy as string]: sortOrder === "asc" ? 1 : -1 })
        .skip(skip)
        .limit(parseInt(limit as string))
        .lean(),
      RevenueTransaction.countDocuments(query),
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
export const getTeacherPayoutRequest = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    const payoutRequest = await RevenueTransaction.findById(id)
      .populate("teacherId", "firstName lastName email teacherPaymentSettings")
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
export const approveTeacherPayoutRequest = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { payoutMethod = "bank_transfer", notes } = req.body;

    const payoutRequest = await RevenueTransaction.findById(id);
    if (!payoutRequest) {
      return next(new AppError("Payout request not found", 404));
    }

    // Process the payout
    const result = await PayoutService.processTeacherPayout(
      payoutRequest.teacherId.toString(),
      [id],
      payoutMethod,
    );

    if (!result.success) {
      return next(
        new AppError(result.error || "Failed to process payout", 500),
      );
    }

    // Add admin notes if provided
    if (notes) {
      payoutRequest.metadata = {
        ...payoutRequest.metadata,
        adminNotes: notes,
        approvedBy: req.user?._id || req.user?.id,
        approvedAt: new Date(),
      };
      await payoutRequest.save();
    }

    res.status(200).json({
      success: true,
      message: "Payout request approved and processed",
      data: result,
    });
  } catch (error) {
    next(new AppError((error as Error).message, 500));
  }
};

/**
 * Reject payout request
 */
export const rejectTeacherPayoutRequest = async (
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

    const payoutRequest = await RevenueTransaction.findById(id);
    if (!payoutRequest) {
      return next(new AppError("Payout request not found", 404));
    }

    // Update status to failed with reason
    payoutRequest.payoutStatus = PayoutStatus.FAILED;
    payoutRequest.metadata = {
      ...payoutRequest.metadata,
      rejectionReason: reason,
      rejectedBy: req.user?._id || req.user?.id,
      rejectedAt: new Date(),
    };
    await payoutRequest.save();

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
export const processTeacherPayoutRequest = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { payoutMethod = "manual", paymentReference, notes } = req.body;

    const payoutRequest = await RevenueTransaction.findById(id);
    if (!payoutRequest) {
      return next(new AppError("Payout request not found", 404));
    }

    // Mark as paid with manual method
    await payoutRequest.markAsPaid(payoutMethod, paymentReference);

    // Add admin notes
    payoutRequest.metadata = {
      ...payoutRequest.metadata,
      adminNotes: notes,
      processedBy: req.user?._id || req.user?.id,
      processedAt: new Date(),
    };
    await payoutRequest.save();

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
export const bulkApproveTeacherPayouts = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { payoutIds, payoutMethod = "bank_transfer" } = req.body;

    if (!Array.isArray(payoutIds) || payoutIds.length === 0) {
      return next(new AppError("Payout IDs array is required", 400));
    }

    const results: any[] = [];
    const failed: any[] = [];

    for (const payoutId of payoutIds) {
      try {
        const payoutRequest = await RevenueTransaction.findById(payoutId);
        if (!payoutRequest) {
          failed.push({ id: payoutId, reason: "Not found" });
          continue;
        }

        const result = await PayoutService.processTeacherPayout(
          payoutRequest.teacherId.toString(),
          [payoutId],
          payoutMethod,
        );

        if (result.success) {
          results.push(result);
        } else {
          failed.push({ id: payoutId, reason: result.error });
        }
      } catch (error) {
        failed.push({
          id: payoutId,
          reason: (error as Error).message,
        });
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
export const bulkRejectTeacherPayouts = async (
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

    const results = await RevenueTransaction.updateMany(
      { _id: { $in: payoutIds } },
      {
        $set: {
          payoutStatus: PayoutStatus.FAILED,
          "metadata.rejectionReason": reason,
          "metadata.rejectedBy": req.user?._id || req.user?.id,
          "metadata.rejectedAt": new Date(),
        },
      },
    );

    res.status(200).json({
      success: true,
      message: `${results.modifiedCount} payout(s) rejected`,
      data: {
        modified: results.modifiedCount,
      },
    });
  } catch (error) {
    next(new AppError((error as Error).message, 500));
  }
};

/**
 * Get payout statistics
 */
export const getTeacherPayoutStats = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { period = "month" } = req.query;

    const stats = await PayoutService.getTeacherPayoutStatistics(
      period as string,
    );

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
            totalAmount: { $sum: "$recipientPayout" },
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
            totalAmount: { $sum: "$recipientPayout" },
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
export const getTeacherPayoutAnalytics = async (
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
          totalAmount: { $sum: "$recipientPayout" },
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
          totalAmount: { $sum: "$recipientPayout" },
          count: { $sum: 1 },
        },
      },
    ]);

    // Get top teachers by payout
    const topTeachers = await RevenueTransaction.aggregate([
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
          _id: "$teacherId",
          totalAmount: { $sum: "$recipientPayout" },
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
          as: "teacher",
        },
      },
      {
        $unwind: "$teacher",
      },
      {
        $project: {
          teacherId: "$_id",
          teacherName: {
            $concat: ["$teacher.firstName", " ", "$teacher.lastName"],
          },
          teacherEmail: "$teacher.email",
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
        topTeachers,
      },
    });
  } catch (error) {
    next(new AppError((error as Error).message, 500));
  }
};

/**
 * Export payout data
 */
export const exportTeacherPayoutData = async (
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
      teacherId,
    } = req.query;

    // Build query
    const query: any = {};

    if (status !== "all") {
      query.payoutStatus = status;
    }

    if (teacherId) {
      query.teacherId = teacherId;
    }

    if (startDate && endDate) {
      query.payoutDate = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string),
      };
    }

    // Get payout data
    const payouts = await RevenueTransaction.find(query)
      .populate("teacherId", "firstName lastName email")
      .sort({ payoutDate: -1 })
      .lean();

    if (format === "csv") {
      // Convert to CSV format
      const csvHeader = "Teacher,Email,Amount,Method,Status,Date,Reference\n";
      const csvRows = payouts
        .map((payout) => {
          const teacher = payout.teacherId as any;
          return `"${teacher.firstName} ${teacher.lastName}","${teacher.email}",${payout.recipientPayout},"${payout.payoutMethod}","${payout.payoutStatus}","${payout.payoutDate}","${payout.stripeTransferId || "N/A"}"`;
        })
        .join("\n");

      const csv = csvHeader + csvRows;

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=teacher-payouts-${Date.now()}.csv`,
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
