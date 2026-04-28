import mongoose from "mongoose";
import Stripe from "stripe";
import { Affiliate } from "../models/index";
import RevenueTransaction, {
  PayoutStatus,
  TransactionStatus,
  RevenueStream,
  IRevenueTransaction,
} from "../models/RevenueTransaction";
import Payout, {
  PayoutRequestStatus,
  PayoutMethodType,
} from "../models/Payout";
import VendorSubscription from "../models/VendorSubscription";
import AdminRevenueSettings from "../models/AdminRevenueSettings";
import User, { UserRole, IUser } from "../models/User";
import Vendor, { IVendor } from "../models/Vendor";
import { AppError } from "../middleware/index";
import CommissionTransaction, {
  CommissionTransactionStatus,
} from "../models/CommissionTransaction";
import logger from "../config/logger";

// Initialize Stripe (will be configured from admin settings)
let stripe: Stripe | null = null;

interface PayoutResult {
  success: boolean;
  transactionId: string;
  vendorId: string;
  amount: number;
  payoutId?: string;
  error?: string;
}

interface VendorPayoutSummary {
  vendorId: string;
  vendorName: string;
  vendorEmail: string;
  totalAmount: number;
  transactionCount: number;
  pendingTransactions: string[];
  payoutMethod: string;
  minimumPayoutMet: boolean;
}

interface PayoutSchedule {
  vendorId: string;
  scheduledDate: Date;
  amount: number;
  transactions: string[];
}

class PayoutService {
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
   * Get vendors eligible for payout
   */
  public async getVendorsEligibleForPayout(): Promise<VendorPayoutSummary[]> {
    try {
      const settings = await AdminRevenueSettings.getCurrentSettings();
      if (!settings) {
        logger.warn(
          "⚠️  [PayoutService] Admin revenue settings not found, using defaults",
        );
        // Use default minimum payout instead of throwing error
      }

      const defaultMinimumPayout = 50; // Default minimum payout in AED

      // Get pending transactions grouped by vendor
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
          $match: {
            "vendor.role": UserRole.VENDOR,
            "vendor.status": "active",
          },
        },
      ]);

      // Format results and check minimum payout requirements
      const eligibleVendors: VendorPayoutSummary[] = [];
      for (const payout of pendingPayouts) {
        const vendor = payout.vendor as IUser;
        const minimumPayout = settings
          ? settings.getMinimumPayoutForVendor(vendor._id.toString())
          : defaultMinimumPayout;

        // Determine payout method
        let payoutMethod = "bank_transfer";
        if (
          vendor.vendorPaymentSettings?.hasCustomStripeAccount &&
          vendor.vendorPaymentSettings?.stripeAccountId
        ) {
          payoutMethod = "stripe";
        }

        eligibleVendors.push({
          vendorId: vendor._id.toString(),
          vendorName: `${vendor.firstName} ${vendor.lastName}`,
          vendorEmail: vendor.email,
          totalAmount: payout.totalAmount,
          transactionCount: payout.transactionCount,
          pendingTransactions: payout.transactions.map(
            (id: mongoose.Types.ObjectId) => id.toString(),
          ),
          payoutMethod,
          minimumPayoutMet: payout.totalAmount >= minimumPayout,
        });
      }

      return eligibleVendors.filter((vendor) => vendor.minimumPayoutMet);
    } catch (error) {
      throw new AppError(
        `Failed to get eligible vendors: ${(error as Error).message}`,
        500,
      );
    }
  }

  /**
   * Process individual vendor payout
   */
  public async processVendorPayout(
    vendorId: string,
    transactionIds: string[],
    payoutMethod:
      | "stripe"
      | "bank_transfer"
      | "paypal"
      | "manual" = "bank_transfer",
  ): Promise<PayoutResult> {
    try {
      // Validate vendor
      const vendor = await User.findById(vendorId);
      if (!vendor || vendor.role !== UserRole.VENDOR) {
        throw new AppError("Invalid vendor", 400);
      }

      // Get transactions to process
      const transactions = await RevenueTransaction.find({
        _id: { $in: transactionIds },
        vendorId,
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
          payoutId = await this.processStripeTransfer(vendor, totalAmount);
          success = !!payoutId;
          break;

        case "paypal":
          payoutId = await this.processPayPalPayout(vendor, totalAmount);
          success = !!payoutId;
          break;

        case "bank_transfer":
        case "manual":
          // For bank transfer and manual, we mark as processed but don't actually transfer
          // This would integrate with banking APIs in production
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

        // Mark related CommissionTransactions as PAID
        const orderIds = transactions
          .filter((tx) => tx.orderId)
          .map((tx) => tx.orderId);
        if (orderIds.length > 0) {
          await CommissionTransaction.updateMany(
            {
              orderId: { $in: orderIds },
              vendorId,
              status: CommissionTransactionStatus.APPROVED,
            },
            {
              status: CommissionTransactionStatus.PAID,
              paidAt: new Date(),
            },
          );
        }

        // Create revenue transaction for payout processing fee (if applicable)
        await this.createPayoutFeeTransaction(
          vendorId,
          totalAmount,
          payoutMethod,
        );

        return {
          success: true,
          transactionId: transactions[0]._id.toString(),
          vendorId,
          amount: totalAmount,
          payoutId,
        };
      } else {
        return {
          success: false,
          transactionId: transactions[0]._id.toString(),
          vendorId,
          amount: totalAmount,
          error: "Payout processing failed",
        };
      }
    } catch (error) {
      return {
        success: false,
        transactionId: "",
        vendorId,
        amount: 0,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Process Stripe transfer to vendor
   */
  private async processStripeTransfer(
    vendor: IUser,
    amount: number,
  ): Promise<string | null> {
    try {
      await this.initializeStripe();

      if (!stripe) {
        throw new AppError("Stripe not configured", 500);
      }

      if (!vendor.vendorPaymentSettings?.stripeAccountId) {
        throw new AppError("Vendor Stripe account not configured", 400);
      }

      // Convert to smallest currency unit (fils for AED)
      const amountInSmallestUnit = Math.round(amount * 100);

      const transfer = await stripe.transfers.create({
        amount: amountInSmallestUnit,
        currency: "aed",
        destination: vendor.vendorPaymentSettings.stripeAccountId,
        description: `Payout to ${vendor.firstName} ${vendor.lastName}`,
        metadata: {
          vendorId: vendor._id.toString(),
          vendorEmail: vendor.email,
        },
      });

      return transfer.id;
    } catch (error) {
      logger.error("Stripe transfer failed:", error);
      return null;
    }
  }

  /**
   * Process PayPal payout
   */
  private async processPayPalPayout(
    vendor: IUser,
    amount: number,
  ): Promise<string | null> {
    try {
      // This would integrate with PayPal API in production
      // For now, return a mock payout ID
      logger.info(`PayPal payout of ${amount} AED to ${vendor.email}`);
      return `PAYPAL_${Date.now()}`;
    } catch (error) {
      logger.error("PayPal payout failed:", error);
      return null;
    }
  }

  /**
   * Create transaction for payout processing fees
   */
  private async createPayoutFeeTransaction(
    vendorId: string,
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
          vendorId,
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
      logger.error("Failed to create payout fee transaction:", error);
      // Don't throw error here as payout was successful
    }
  }

  /**
   * Process bulk payouts for multiple vendors
   */
  public async processBulkPayouts(
    vendorPayouts: Array<{
      vendorId: string;
      transactionIds: string[];
      payoutMethod?: string;
    }>,
  ): Promise<PayoutResult[]> {
    const results: PayoutResult[] = [];

    for (const payout of vendorPayouts) {
      const result = await this.processVendorPayout(
        payout.vendorId,
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

      const eligibleVendors = await this.getVendorsEligibleForPayout();
      const schedules: PayoutSchedule[] = [];

      for (const vendor of eligibleVendors) {
        // Calculate next payout date based on frequency
        const nextPayoutDate = this.calculateNextPayoutDate(
          settings.payoutFrequency,
        );

        // Schedule transactions for payout
        await RevenueTransaction.updateMany(
          { _id: { $in: vendor.pendingTransactions } },
          {
            $set: {
              payoutStatus: PayoutStatus.SCHEDULED,
              scheduledPayoutDate: nextPayoutDate,
            },
          },
        );

        schedules.push({
          vendorId: vendor.vendorId,
          scheduledDate: nextPayoutDate,
          amount: vendor.totalAmount,
          transactions: vendor.pendingTransactions,
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
   * Get payout history for a vendor
   */
  public async getVendorPayoutHistory(
    vendorId: string,
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
          vendorId,
          payoutStatus: { $in: [PayoutStatus.COMPLETED, PayoutStatus.FAILED] },
        })
          .sort({ payoutDate: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),

        RevenueTransaction.countDocuments({
          vendorId,
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
   * Calculate vendor earnings (pending balance available for payout)
   */
  public async calculateVendorEarnings(vendorId: string): Promise<{
    totalEarned: number;
    totalPaidOut: number;
    pendingBalance: number;
    inProcessing: number;
    currency: string;
  }> {
    try {
      const [earned, paidOut, processing] = await Promise.all([
        // Total earned (completed transactions that haven't been paid out)
        RevenueTransaction.aggregate([
          {
            $match: {
              vendorId: new mongoose.Types.ObjectId(vendorId),
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
              vendorId: new mongoose.Types.ObjectId(vendorId),
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

        // In processing (approved or scheduled)
        RevenueTransaction.aggregate([
          {
            $match: {
              vendorId: new mongoose.Types.ObjectId(vendorId),
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
        `Failed to calculate vendor earnings: ${(error as Error).message}`,
        500,
      );
    }
  }

  /**
   * Get vendor commission breakdown
   */
  public async getVendorCommissionBreakdown(
    vendorId: string,
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
        vendorId: new mongoose.Types.ObjectId(vendorId),
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
          vendorPayout: tx.vendorPayout,
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
   * Create payout request from vendor
   */
  public async createPayoutRequest(
    vendorId: string,
    amount?: number,
  ): Promise<{
    success: boolean;
    payout?: any;
    error?: string;
  }> {
    try {
      // Get vendor
      const vendor = await User.findById(vendorId);
      if (!vendor || vendor.role !== UserRole.VENDOR) {
        return { success: false, error: "Invalid vendor" };
      }

      // Calculate available balance
      const earnings = await this.calculateVendorEarnings(vendorId);

      // Check minimum payout requirement
      const settings = await AdminRevenueSettings.getCurrentSettings();
      const minimumPayout =
        vendor.vendorPaymentSettings?.minimumPayout ||
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
        vendorId,
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
      if (vendor.vendorPaymentSettings?.preferredPayoutMethod) {
        payoutMethod = vendor.vendorPaymentSettings
          .preferredPayoutMethod as PayoutMethodType;
      }

      // Create payout request
      const payout = new Payout({
        vendorId,
        amount: requestAmount,
        currency: earnings.currency,
        status: PayoutRequestStatus.PENDING,
        requestedBy: vendorId,
        payoutMethod,
        bankDetails: vendor.vendorPaymentSettings?.bankAccountDetails,
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
   * Get payout statistics
   */
  public async getPayoutStatistics(period: string = "month"): Promise<any> {
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
        byMethod: methodBreakdown.reduce((acc, method) => {
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
  /**
   * Process all transactions whose 24hr refund window has passed.
   * Stripe vendors → queue auto-transfer. Bank vendors → schedule or leave eligible.
   * Called hourly by cron.
   */
  public async processPendingEligiblePayouts(): Promise<void> {
    const now = new Date();

    const eligible = await RevenueTransaction.find({
      payoutEligibleAt: { $lte: now },
      payoutStatus: PayoutStatus.PENDING,
      status: TransactionStatus.COMPLETED,
    }).populate<{ vendorId: IVendor }>("vendorId");

    if (eligible.length === 0) return;

    // Group by vendorId string
    const byVendor = new Map<string, typeof eligible>();
    for (const tx of eligible) {
      const vid =
        (tx.vendorId as any)?._id?.toString() || tx.vendorId.toString();
      if (!byVendor.has(vid)) byVendor.set(vid, []);
      byVendor.get(vid)!.push(tx);
    }

    // Import queue lazily to avoid circular imports at module load time
    const { payoutQueue } = await import("../config/queue");

    for (const [vendorId, transactions] of byVendor) {
      const vendorDoc = await Vendor.findOne({
        _id: (transactions[0].vendorId as any)?._id || vendorId,
      });
      if (!vendorDoc) continue;

      const settings = vendorDoc.paymentSettings;
      const txIds = transactions.map((t) => t._id.toString());
      const amount = transactions.reduce((sum, t) => sum + t.vendorPayout, 0);

      const isStripeVendor =
        settings?.preferredPayoutMethod === "stripe" &&
        settings?.stripeSettings?.stripeConnectAccountId;

      if (isStripeVendor && payoutQueue) {
        // Auto-payout via Stripe Connect
        await payoutQueue.add("process-stripe-payout", {
          type: "process-stripe-payout",
          vendorId,
          transactionIds: txIds,
          amount,
        });

        await RevenueTransaction.updateMany(
          { _id: { $in: txIds } },
          { payoutStatus: PayoutStatus.PROCESSING },
        );

        logger.info(
          `[PayoutService] Queued Stripe payout for vendor ${vendorId}: ${amount}`,
        );
      } else {
        // Bank vendor — check if they have a schedule
        const schedule = settings?.payoutSchedule;
        if (schedule) {
          const nextDate = this.calculateNextPayoutDate(schedule);
          await RevenueTransaction.updateMany(
            { _id: { $in: txIds } },
            {
              payoutStatus: PayoutStatus.SCHEDULED,
              scheduledPayoutDate: nextDate,
            },
          );
          logger.info(
            `[PayoutService] Scheduled bank payout for vendor ${vendorId} on ${nextDate}`,
          );
        }
        // No schedule → leave as pending, eligibleBalance will show in dashboard
      }
    }
  }

  /**
   * Process bank-scheduled transactions whose scheduled date has arrived.
   * Creates a Payout request doc for admin visibility.
   * Called daily at 6 AM by cron.
   */
  public async processScheduledBankPayouts(): Promise<void> {
    const now = new Date();

    const scheduled = await RevenueTransaction.find({
      scheduledPayoutDate: { $lte: now },
      payoutStatus: PayoutStatus.SCHEDULED,
      status: TransactionStatus.COMPLETED,
    });

    if (scheduled.length === 0) return;

    const byVendor = new Map<string, typeof scheduled>();
    for (const tx of scheduled) {
      const vid = tx.vendorId.toString();
      if (!byVendor.has(vid)) byVendor.set(vid, []);
      byVendor.get(vid)!.push(tx);
    }

    const { payoutQueue } = await import("../config/queue");

    for (const [vendorId, transactions] of byVendor) {
      const txIds = transactions.map((t) => t._id.toString());
      const amount = transactions.reduce((sum, t) => sum + t.vendorPayout, 0);

      if (payoutQueue) {
        await payoutQueue.add("create-bank-payout-request", {
          type: "create-bank-payout-request",
          vendorId,
          transactionIds: txIds,
          amount,
        });
      }

      logger.info(
        `[PayoutService] Queued bank payout request for vendor ${vendorId}: ${amount}`,
      );
    }
  }

  /**
   * Execute an approved Payout doc — calls Stripe transfer or marks bank transfer for finance team.
   */
  public async executePayout(payoutId: string): Promise<any> {
    const payout = await Payout.findById(payoutId).populate("vendorId");
    if (!payout) throw new AppError("Payout not found", 404);
    if (payout.status !== PayoutRequestStatus.APPROVED) {
      throw new AppError("Payout must be in APPROVED state to execute", 400);
    }

    await payout.markAsProcessing();

    try {
      if (payout.payoutMethod === PayoutMethodType.STRIPE) {
        await this.initializeStripe();
        if (!stripe) throw new AppError("Stripe not configured", 500);

        // Fetch stripeConnectAccountId from Vendor profile
        const vendorDoc = await Vendor.findById(payout.vendorId);
        const connectAccountId =
          vendorDoc?.paymentSettings?.stripeSettings?.stripeConnectAccountId;
        if (!connectAccountId) {
          throw new AppError("No Stripe Connect account linked", 400);
        }

        const transfer = await stripe.transfers.create({
          amount: Math.round(payout.amount * 100), // smallest currency unit
          currency: (payout.currency || "AED").toLowerCase(),
          destination: connectAccountId,
          metadata: { payoutId: payout._id.toString() },
        });

        await payout.markAsCompleted(transfer.id);
      } else {
        // BANK_TRANSFER / MANUAL: record reference, mark completed (finance team processes manually)
        payout.paymentReference = `MANUAL-${Date.now()}`;
        await payout.markAsCompleted(payout.paymentReference);
      }
    } catch (err: any) {
      await payout.markAsFailed(err.message || "Unknown error");
      throw err;
    }

    return payout;
  }

  /**
   * Process affiliate payouts — transfer pending commissions via Stripe
   */
  public async processAffiliatePayouts(affiliateId: string): Promise<void> {
    await this.initializeStripe();

    const affiliate = await Affiliate.findById(affiliateId).populate("userId", "email firstName lastName");
    if (!affiliate) throw new AppError("Affiliate not found", 404);
    if (!affiliate.canReceivePayout()) {
      throw new AppError("Affiliate is not eligible for payout", 400);
    }

    const pendingCommissions = affiliate.getPendingCommissions();
    if (!pendingCommissions.length) {
      throw new AppError("No pending commissions to pay out", 400);
    }

    const totalAmount = pendingCommissions.reduce(
      (sum, c) => sum + c.commissionAmount, 0
    );

    if (affiliate.paymentMethod === "stripe") {
      if (!stripe) throw new AppError("Stripe not configured", 500);
      const stripeAccountId = affiliate.paymentDetails?.stripeAccountId;
      if (!stripeAccountId) throw new AppError("Affiliate Stripe account not configured", 400);

      await stripe.transfers.create({
        amount: Math.round(totalAmount * 100), // cents
        currency: "usd",
        destination: stripeAccountId,
        description: `Affiliate commission payout — ${affiliateId}`,
      });
    }
    // For other payment methods, mark as paid without transfer (manual process)

    const now = new Date();
    for (const commission of pendingCommissions) {
      commission.status = "paid";
      commission.paidAt = now;
    }
    affiliate.totalCommissionPaid += totalAmount;
    await affiliate.save();

    logger.info(`[PayoutService] Affiliate payout processed: ${affiliateId} — ${totalAmount}`);
  }
}

export default new PayoutService();
