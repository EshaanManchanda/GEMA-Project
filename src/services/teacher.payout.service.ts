import mongoose from "mongoose";
import { ITeacher } from "../models/Teacher";
import Teacher from "../models/Teacher";
import User from "../models/User";
import RevenueTransaction, {
  TransactionStatus,
  PayoutStatus,
  RevenueStream,
} from "../models/RevenueTransaction";
import Payout, {
  PayoutRequestStatus,
  PayoutMethodType,
} from "../models/Payout";
import AdminRevenueSettings from "../models/AdminRevenueSettings";
import Stripe from "stripe";
import { AppError } from "../middleware/error";

let stripe: Stripe | null = null;

interface TeacherPayoutSummary {
  teacherId: string;
  teacherName: string;
  teacherEmail: string;
  totalAmount: number;
  transactionCount: number;
  pendingTransactions: string[];
  payoutMethod: string;
  minimumPayoutMet: boolean;
}

interface PayoutResult {
  success: boolean;
  transactionId?: string;
  teacherId?: string;
  amount?: number;
  payoutId?: string;
  error?: string;
}

interface PayoutSchedule {
  teacherId: string;
  scheduledDate: Date;
  amount: number;
  transactions: string[];
}

class TeacherPayoutService {
  /**
   * Initialize Stripe client from admin settings
   */
  private async initializeStripe(): Promise<void> {
    if (!stripe) {
      const settings = await AdminRevenueSettings.getCurrentSettings();
      if (settings?.paymentGateways?.stripe?.secretKey) {
        stripe = new Stripe(settings.paymentGateways.stripe.secretKey, {
          apiVersion: "2025-08-27.basil",
        });
      }
    }
  }

  /**
   * Get teachers eligible for payout
   */
  public async getTeachersEligibleForPayout(): Promise<TeacherPayoutSummary[]> {
    try {
      const settings = await AdminRevenueSettings.getCurrentSettings();
      if (!settings) {
        console.warn(
          "⚠️  [TeacherPayoutService] Admin revenue settings not found, using defaults",
        );
      }

      const defaultMinimumPayout = 50; // Default minimum payout in AED

      // Get pending transactions grouped by teacher
      const pendingPayouts = await RevenueTransaction.aggregate([
        {
          $match: {
            payoutStatus: PayoutStatus.PENDING,
            status: TransactionStatus.COMPLETED,
          },
        },
        {
          $group: {
            _id: "$vendorId",
            totalAmount: { $sum: "$vendorPayout" },
            transactionCount: { $sum: 1 },
            transactions: { $push: "$_id" },
          },
        },
        {
          $lookup: {
            from: "teachers",
            localField: "_id",
            foreignField: "_id",
            as: "teacher",
          },
        },
        {
          $unwind: "$teacher",
        },
      ]);

      // Format results and check minimum payout requirements
      const eligibleTeachers: TeacherPayoutSummary[] = [];
      for (const payout of pendingPayouts) {
        const teacher = payout.teacher;
        const minimumPayout = settings
          ? settings.getMinimumPayoutForVendor(teacher._id.toString())
          : defaultMinimumPayout;

        // Determine payout method
        let payoutMethod = "bank_transfer";
        if (teacher.paymentSettings?.stripeSettings?.stripeConnectAccountId) {
          payoutMethod = "stripe";
        }

        eligibleTeachers.push({
          teacherId: teacher._id.toString(),
          teacherName: `${teacher.firstName} ${teacher.lastName}`,
          teacherEmail: teacher.email,
          totalAmount: payout.totalAmount,
          transactionCount: payout.transactionCount,
          pendingTransactions: payout.transactions.map(
            (id: mongoose.Types.ObjectId) => id.toString(),
          ),
          payoutMethod,
          minimumPayoutMet: payout.totalAmount >= minimumPayout,
        });
      }

      return eligibleTeachers.filter((teacher) => teacher.minimumPayoutMet);
    } catch (error) {
      throw new AppError(
        `Failed to get eligible teachers: ${(error as Error).message}`,
        500,
      );
    }
  }

  /**
   * Process individual teacher payout
   */
  public async processTeacherPayout(
    teacherId: string,
    transactionIds: string[],
    payoutMethod:
      | "stripe"
      | "bank_transfer"
      | "paypal"
      | "manual" = "bank_transfer",
  ): Promise<PayoutResult> {
    try {
      // Validate teacher
      const teacher = await Teacher.findById(teacherId);
      if (!teacher) {
        throw new AppError("Invalid teacher", 400);
      }

      // Get transactions to process
      const transactions = await RevenueTransaction.find({
        _id: { $in: transactionIds },
        vendorId: teacherId, // Using vendorId for teacher
        payoutStatus: PayoutStatus.PENDING,
        status: TransactionStatus.COMPLETED,
      });

      if (transactions.length === 0) {
        throw new AppError("No eligible transactions found", 400);
      }

      const totalAmount = transactions.reduce(
        (sum, tx) => sum + tx.vendorPayout,
        0,
      );

      let payoutId: string | undefined;
      let success = false;

      // Process payout based on method
      switch (payoutMethod) {
        case "stripe":
          payoutId = `STRIPE_${Date.now()}`;
          success = true;
          break;

        case "paypal":
          payoutId = `PAYPAL_${Date.now()}`;
          success = true;
          break;

        case "bank_transfer":
        case "manual":
          payoutId = `MANUAL_${Date.now()}`;
          success = true;
          break;

        default:
          throw new AppError("Invalid payout method", 400);
      }

      if (success) {
        // Mark all transactions as paid
        await Promise.all(
          transactions.map((tx) => tx.markAsPaid(payoutMethod, payoutId)),
        );

        return {
          success: true,
          transactionId: transactions[0]._id.toString(),
          teacherId,
          amount: totalAmount,
          payoutId,
        };
      } else {
        return {
          success: false,
          transactionId: transactions[0]._id.toString(),
          teacherId,
          amount: totalAmount,
          error: "Payout processing failed",
        };
      }
    } catch (error) {
      return {
        success: false,
        transactionId: "",
        teacherId,
        amount: 0,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Process Stripe transfer to teacher
   */
  private async processStripeTransfer(
    teacher: any,
    amount: number,
  ): Promise<string | null> {
    try {
      await this.initializeStripe();

      if (!stripe) {
        throw new AppError("Stripe not configured", 500);
      }

      if (!teacher.paymentSettings?.stripeSettings?.stripeConnectAccountId) {
        throw new AppError("Teacher Stripe account not configured", 400);
      }

      // Convert to smallest currency unit (fils for AED)
      const amountInSmallestUnit = Math.round(amount * 100);

      const transfer = await stripe.transfers.create({
        amount: amountInSmallestUnit,
        currency: "aed",
        destination:
          teacher.paymentSettings.stripeSettings.stripeConnectAccountId,
        description: `Payout to ${teacher.firstName} ${teacher.lastName}`,
        metadata: {
          teacherId: teacher._id.toString(),
          teacherEmail: teacher.email,
        },
      });

      return transfer.id;
    } catch (error) {
      console.error("Stripe transfer failed:", error);
      return null;
    }
  }

  /**
   * Process PayPal payout
   */
  private async processPayPalPayout(
    teacher: any,
    amount: number,
  ): Promise<string | null> {
    try {
      // This would integrate with PayPal API in production
      // For now, return a mock payout ID
      console.log(`PayPal payout of ${amount} AED to ${teacher.email}`);
      return `PAYPAL_${Date.now()}`;
    } catch (error) {
      console.error("PayPal payout failed:", error);
      return null;
    }
  }

  /**
   * Create transaction for payout processing fees
   */
  private async createPayoutFeeTransaction(
    teacherId: string,
    payoutAmount: number,
    payoutMethod: string,
  ): Promise<void> {
    try {
      const settings = await AdminRevenueSettings.getCurrentSettings();
      if (!settings) return;

      let feeRate = 0;
      let feeDescription = "";

      // Calculate processing fee based on method
      switch (payoutMethod) {
        case "stripe":
          feeRate = 0.005; // 0.5% for Stripe transfers
          feeDescription = "Stripe transfer processing fee";
          break;
        case "paypal":
          feeRate = 0.02; // 2% for PayPal
          feeDescription = "PayPal payout processing fee";
          break;
        case "bank_transfer":
          feeRate = 0.001; // 0.1% for bank transfers
          feeDescription = "Bank transfer processing fee";
          break;
        default:
          return; // No fee for manual payouts
      }

      const feeAmount = payoutAmount * feeRate;

      if (feeAmount > 0) {
        const feeTransaction = new RevenueTransaction({
          vendorId: teacherId, // Using vendorId
          totalAmount: feeAmount,
          adminCommission: feeAmount,
          vendorPayout: 0,
          serviceFeeRate: 100, // 100% goes to admin
          currency: "AED",
          revenueStream: RevenueStream.ANALYTICS, // Using analytics as misc fees
          category: "payout_processing",
          description: feeDescription,
          status: TransactionStatus.COMPLETED,
          payoutStatus: PayoutStatus.COMPLETED,
          transactionDate: new Date(),
          metadata: {
            payoutMethod,
            originalPayoutAmount: payoutAmount,
          },
        });

        await feeTransaction.save();
      }
    } catch (error) {
      console.error("Failed to create payout fee transaction:", error);
      // Don't throw error here as payout was successful
    }
  }

  /**
   * Process bulk payouts for multiple teachers
   */
  public async processBulkPayouts(
    teacherPayouts: Array<{
      teacherId: string;
      transactionIds: string[];
      payoutMethod?: string;
    }>,
  ): Promise<PayoutResult[]> {
    const results: PayoutResult[] = [];

    for (const payout of teacherPayouts) {
      const result = await this.processTeacherPayout(
        payout.teacherId,
        payout.transactionIds,
        (payout.payoutMethod as any) || "bank_transfer",
      );
      results.push(result);
    }

    return results;
  }

  /**
   * Schedule automatic payouts based on admin settings
   */
  public async scheduleAutomaticPayouts(): Promise<PayoutSchedule[]> {
    try {
      const settings = await AdminRevenueSettings.getCurrentSettings();
      if (!settings) {
        throw new AppError("Admin revenue settings not configured", 500);
      }

      const eligibleTeachers = await this.getTeachersEligibleForPayout();
      const schedules: PayoutSchedule[] = [];

      for (const teacher of eligibleTeachers) {
        // Calculate next payout date based on frequency
        const nextPayoutDate = this.calculateNextPayoutDate(
          settings.payoutFrequency,
        );

        // Schedule transactions for payout
        await RevenueTransaction.updateMany(
          { _id: { $in: teacher.pendingTransactions } },
          {
            $set: {
              payoutStatus: PayoutStatus.SCHEDULED,
              scheduledPayoutDate: nextPayoutDate,
            },
          },
        );

        schedules.push({
          teacherId: teacher.teacherId,
          scheduledDate: nextPayoutDate,
          amount: teacher.totalAmount,
          transactions: teacher.pendingTransactions,
        });
      }

      return schedules;
    } catch (error) {
      throw new AppError(
        `Failed to schedule automatic payouts: ${(error as Error).message}`,
        500,
      );
    }
  }

  /**
   * Calculate next payout date based on frequency
   */
  private calculateNextPayoutDate(frequency: string): Date {
    const now = new Date();

    switch (frequency) {
      case "daily":
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);

      case "weekly":
        // Next Friday
        const daysUntilFriday = (5 - now.getDay() + 7) % 7 || 7;
        return new Date(now.getTime() + daysUntilFriday * 24 * 60 * 60 * 1000);

      case "biweekly":
        return new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

      case "monthly":
        // First of next month
        return new Date(now.getFullYear(), now.getMonth() + 1, 1);

      default:
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }
  }

  /**
   * Get payout history for a teacher
   */
  public async getTeacherPayoutHistory(
    teacherId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    payouts: any[];
    pagination: any;
  }> {
    try {
      const skip = (page - 1) * limit;

      const [payouts, totalPayouts] = await Promise.all([
        RevenueTransaction.find({
          vendorId: teacherId, // Using vendorId
          payoutStatus: { $in: [PayoutStatus.COMPLETED, PayoutStatus.FAILED] },
        })
          .sort({ payoutDate: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),

        RevenueTransaction.countDocuments({
          vendorId: teacherId, // Using vendorId
          payoutStatus: { $in: [PayoutStatus.COMPLETED, PayoutStatus.FAILED] },
        }),
      ]);

      const totalPages = Math.ceil(totalPayouts / limit);

      return {
        payouts: payouts.map((payout) => ({
          id: payout._id,
          amount: payout.vendorPayout,
          method: payout.payoutMethod,
          status: payout.payoutStatus,
          transferId: payout.stripeTransferId,
          paidAt: payout.payoutDate,
          revenueStream: payout.revenueStream,
          description: payout.description,
        })),
        pagination: {
          currentPage: page,
          totalPages,
          totalPayouts,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
          limit,
        },
      };
    } catch (error) {
      throw new AppError(
        `Failed to get payout history: ${(error as Error).message}`,
        500,
      );
    }
  }

  /**
   * Calculate teacher earnings (pending balance available for payout)
   */
  public async calculateTeacherEarnings(teacherId: string): Promise<{
    totalEarned: number;
    totalPaidOut: number;
    pendingBalance: number;
    inProcessing: number;
    currency: string;
  }> {
    try {
      const [earned, paidOut, processing] = await Promise.all([
        // Total earned
        RevenueTransaction.aggregate([
          {
            $match: {
              vendorId: new mongoose.Types.ObjectId(teacherId),
              status: TransactionStatus.COMPLETED,
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: "$vendorPayout" },
            },
          },
        ]),

        // Total already paid out
        RevenueTransaction.aggregate([
          {
            $match: {
              vendorId: new mongoose.Types.ObjectId(teacherId),
              payoutStatus: PayoutStatus.COMPLETED,
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: "$vendorPayout" },
            },
          },
        ]),

        // In processing
        RevenueTransaction.aggregate([
          {
            $match: {
              vendorId: new mongoose.Types.ObjectId(teacherId),
              payoutStatus: {
                $in: [PayoutStatus.SCHEDULED, PayoutStatus.PROCESSING],
              },
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: "$vendorPayout" },
            },
          },
        ]),
      ]);

      const totalEarned = earned[0]?.total || 0;
      const totalPaidOut = paidOut[0]?.total || 0;
      const inProcessing = processing[0]?.total || 0;
      const pendingBalance = totalEarned - totalPaidOut - inProcessing;

      return {
        totalEarned,
        totalPaidOut,
        pendingBalance: Math.max(0, pendingBalance),
        inProcessing,
        currency: "AED",
      };
    } catch (error) {
      throw new AppError(
        `Failed to calculate teacher earnings: ${(error as Error).message}`,
        500,
      );
    }
  }

  /**
   * Get teacher commission breakdown
   */
  public async getTeacherCommissionBreakdown(
    teacherId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      skip?: number;
    },
  ): Promise<{
    transactions: any[];
    total: number;
    pagination: any;
  }> {
    try {
      const query: any = {
        vendorId: new mongoose.Types.ObjectId(teacherId),
        status: TransactionStatus.COMPLETED,
      };

      if (options?.startDate || options?.endDate) {
        query.transactionDate = {};
        if (options.startDate) query.transactionDate.$gte = options.startDate;
        if (options.endDate) query.transactionDate.$lte = options.endDate;
      }

      const limit = options?.limit || 20;
      const skip = options?.skip || 0;

      const [transactions, total] = await Promise.all([
        RevenueTransaction.find(query)
          .populate("orderId", "orderNumber total items")
          .sort({ transactionDate: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        RevenueTransaction.countDocuments(query),
      ]);

      return {
        transactions: transactions.map((tx) => ({
          id: tx._id,
          orderNumber: (tx.orderId as any)?.orderNumber,
          totalAmount: tx.totalAmount,
          adminCommission: tx.adminCommission,
          recipientPayout: tx.vendorPayout,
          commissionRate: tx.serviceFeeRate,
          date: tx.transactionDate,
          payoutStatus: tx.payoutStatus,
          revenueStream: tx.revenueStream,
        })),
        total,
        pagination: {
          currentPage: Math.floor(skip / limit) + 1,
          totalPages: Math.ceil(total / limit),
          hasNextPage: skip + limit < total,
          hasPrevPage: skip > 0,
        },
      };
    } catch (error) {
      throw new AppError(
        `Failed to get commission breakdown: ${(error as Error).message}`,
        500,
      );
    }
  }

  /**
   * Create payout request from teacher
   */
  public async createTeacherPayoutRequest(
    teacherId: string,
    amount?: number,
  ): Promise<{
    success: boolean;
    payout?: any;
    error?: string;
  }> {
    try {
      // Get teacher (USE TEACHER MODEL)
      const teacher = await Teacher.findById(teacherId);
      if (!teacher) {
        return { success: false, error: "Invalid teacher" };
      }

      // Calculate available balance
      const earnings = await this.calculateTeacherEarnings(teacherId);

      // Check minimum payout requirement
      const settings = await AdminRevenueSettings.getCurrentSettings();
      const minimumPayout =
        teacher.paymentSettings?.minimumPayout ||
        settings?.minimumPayoutAmount ||
        50;

      if (earnings.pendingBalance < minimumPayout) {
        return {
          success: false,
          error: `Minimum payout amount is ${minimumPayout} ${earnings.currency}. Current balance: ${earnings.pendingBalance}`,
        };
      }

      // Get pending transactions
      const pendingTransactions = await RevenueTransaction.find({
        vendorId: teacherId, // Using vendorId
        status: TransactionStatus.COMPLETED,
        payoutStatus: PayoutStatus.PENDING,
      }).select("_id");

      const requestAmount = amount || earnings.pendingBalance;

      if (requestAmount > earnings.pendingBalance) {
        return {
          success: false,
          error: `Requested amount exceeds available balance of ${earnings.pendingBalance}`,
        };
      }

      // Determine payout method
      let payoutMethod: PayoutMethodType = PayoutMethodType.BANK_TRANSFER;
      if (teacher.paymentSettings?.preferredPayoutMethod) {
        payoutMethod = teacher.paymentSettings
          .preferredPayoutMethod as PayoutMethodType;
      }

      // Create payout request
      const payout = new Payout({
        teacherId,
        amount: requestAmount,
        currency: earnings.currency,
        status: PayoutRequestStatus.PENDING,
        requestedBy: teacher.userId, // Use userId
        payoutMethod,
        bankDetails: teacher.paymentSettings?.bankDetails,
        revenueTransactionIds: pendingTransactions.map((tx) => tx._id),
        totalOrders: pendingTransactions.length,
        metadata: {
          requestedBalance: earnings.pendingBalance,
          totalEarned: earnings.totalEarned,
        },
      });

      await payout.save();

      return {
        success: true,
        payout: {
          id: payout._id,
          amount: payout.amount,
          currency: payout.currency,
          status: payout.status,
          requestedAt: payout.requestedAt,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Get payout statistics (teacher)
   */
  public async getTeacherPayoutStatistics(
    period: string = "month",
  ): Promise<any> {
    try {
      let dateFilter: any = {};
      const now = new Date();

      switch (period) {
        case "week":
          dateFilter = {
            payoutDate: {
              $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
            },
          };
          break;

        case "month":
          dateFilter = {
            payoutDate: {
              $gte: new Date(now.getFullYear(), now.getMonth(), 1),
            },
          };
          break;

        case "quarter":
          const quarterStart = new Date(
            now.getFullYear(),
            Math.floor(now.getMonth() / 3) * 3,
            1,
          );
          dateFilter = { payoutDate: { $gte: quarterStart } };
          break;

        case "year":
          dateFilter = {
            payoutDate: { $gte: new Date(now.getFullYear(), 0, 1) },
          };
          break;
      }

      const [stats, methodBreakdown] = await Promise.all([
        RevenueTransaction.aggregate([
          {
            $match: {
              payoutStatus: PayoutStatus.COMPLETED,
              // recipientType: 'teacher', // Removed
              ...dateFilter,
            },
          },
          {
            $group: {
              _id: null,
              totalPaidOut: { $sum: "$vendorPayout" },
              payoutCount: { $sum: 1 },
              avgPayoutAmount: { $avg: "$vendorPayout" },
            },
          },
        ]),

        RevenueTransaction.aggregate([
          {
            $match: {
              payoutStatus: PayoutStatus.COMPLETED,
              // recipientType: 'teacher', // Removed
              ...dateFilter,
            },
          },
          {
            $group: {
              _id: "$payoutMethod",
              amount: { $sum: "$vendorPayout" },
              count: { $sum: 1 },
            },
          },
        ]),
      ]);

      return {
        overview: stats[0] || {
          totalPaidOut: 0,
          payoutCount: 0,
          avgPayoutAmount: 0,
        },
        byMethod: methodBreakdown.reduce((acc: any, method: any) => {
          acc[method._id || "unknown"] = {
            amount: method.amount,
            count: method.count,
          };
          return acc;
        }, {}),
      };
    } catch (error) {
      throw new AppError(
        `Failed to get payout statistics: ${(error as Error).message}`,
        500,
      );
    }
  }
}

export default new TeacherPayoutService();
