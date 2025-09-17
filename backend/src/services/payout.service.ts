import mongoose from 'mongoose';
import Stripe from 'stripe';
import RevenueTransaction, { PayoutStatus, TransactionStatus, RevenueStream } from '../models/RevenueTransaction';
import VendorSubscription from '../models/VendorSubscription';
import AdminRevenueSettings from '../models/AdminRevenueSettings';
import User, { UserRole, IUser } from '../models/User';
import { AppError } from '../middleware';

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
          apiVersion: '2025-07-30.basil'
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
        throw new AppError('Admin revenue settings not configured', 500);
      }

      // Get pending transactions grouped by vendor
      const pendingPayouts = await RevenueTransaction.aggregate([
        {
          $match: {
            payoutStatus: PayoutStatus.PENDING,
            status: TransactionStatus.COMPLETED
          }
        },
        {
          $group: {
            _id: '$vendorId',
            totalAmount: { $sum: '$vendorPayout' },
            transactionCount: { $sum: 1 },
            transactions: { $push: '$_id' }
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'vendor'
          }
        },
        {
          $unwind: '$vendor'
        },
        {
          $match: {
            'vendor.role': UserRole.VENDOR
          }
        }
      ]);

      // Format results and check minimum payout requirements
      const eligibleVendors: VendorPayoutSummary[] = [];

      for (const payout of pendingPayouts) {
        const vendor = payout.vendor as IUser;
        const minimumPayout = settings.getMinimumPayoutForVendor(vendor._id.toString());

        // Determine payout method
        let payoutMethod = 'bank_transfer';
        if (vendor.vendorPaymentSettings?.hasCustomStripeAccount && vendor.vendorPaymentSettings?.stripeAccountId) {
          payoutMethod = 'stripe';
        }

        eligibleVendors.push({
          vendorId: vendor._id.toString(),
          vendorName: `${vendor.firstName} ${vendor.lastName}`,
          vendorEmail: vendor.email,
          totalAmount: payout.totalAmount,
          transactionCount: payout.transactionCount,
          pendingTransactions: payout.transactions.map((id: mongoose.Types.ObjectId) => id.toString()),
          payoutMethod,
          minimumPayoutMet: payout.totalAmount >= minimumPayout
        });
      }

      return eligibleVendors.filter(vendor => vendor.minimumPayoutMet);
    } catch (error) {
      throw new AppError(`Failed to get eligible vendors: ${(error as Error).message}`, 500);
    }
  }

  /**
   * Process individual vendor payout
   */
  public async processVendorPayout(
    vendorId: string,
    transactionIds: string[],
    payoutMethod: 'stripe' | 'bank_transfer' | 'paypal' | 'manual' = 'bank_transfer'
  ): Promise<PayoutResult> {
    try {
      // Validate vendor
      const vendor = await User.findById(vendorId);
      if (!vendor || vendor.role !== UserRole.VENDOR) {
        throw new AppError('Invalid vendor', 400);
      }

      // Get transactions to process
      const transactions = await RevenueTransaction.find({
        _id: { $in: transactionIds },
        vendorId,
        payoutStatus: PayoutStatus.PENDING,
        status: TransactionStatus.COMPLETED
      });

      if (transactions.length === 0) {
        throw new AppError('No eligible transactions found', 400);
      }

      const totalAmount = transactions.reduce((sum, tx) => sum + tx.vendorPayout, 0);

      let payoutId: string | undefined;
      let success = false;

      // Process payout based on method
      switch (payoutMethod) {
        case 'stripe':
          payoutId = await this.processStripeTransfer(vendor, totalAmount);
          success = !!payoutId;
          break;

        case 'paypal':
          payoutId = await this.processPayPalPayout(vendor, totalAmount);
          success = !!payoutId;
          break;

        case 'bank_transfer':
        case 'manual':
          // For bank transfer and manual, we mark as processed but don't actually transfer
          // This would integrate with banking APIs in production
          payoutId = `MANUAL_${Date.now()}`;
          success = true;
          break;

        default:
          throw new AppError('Invalid payout method', 400);
      }

      if (success) {
        // Mark all transactions as paid
        await Promise.all(
          transactions.map(tx => tx.markAsPaid(payoutMethod, payoutId))
        );

        // Create revenue transaction for payout processing fee (if applicable)
        await this.createPayoutFeeTransaction(vendorId, totalAmount, payoutMethod);

        return {
          success: true,
          transactionId: transactions[0]._id.toString(),
          vendorId,
          amount: totalAmount,
          payoutId
        };
      } else {
        return {
          success: false,
          transactionId: transactions[0]._id.toString(),
          vendorId,
          amount: totalAmount,
          error: 'Payout processing failed'
        };
      }
    } catch (error) {
      return {
        success: false,
        transactionId: '',
        vendorId,
        amount: 0,
        error: (error as Error).message
      };
    }
  }

  /**
   * Process Stripe transfer to vendor
   */
  private async processStripeTransfer(vendor: IUser, amount: number): Promise<string | null> {
    try {
      await this.initializeStripe();

      if (!stripe) {
        throw new AppError('Stripe not configured', 500);
      }

      if (!vendor.vendorPaymentSettings?.stripeAccountId) {
        throw new AppError('Vendor Stripe account not configured', 400);
      }

      // Convert to smallest currency unit (fils for AED)
      const amountInSmallestUnit = Math.round(amount * 100);

      const transfer = await stripe.transfers.create({
        amount: amountInSmallestUnit,
        currency: 'aed',
        destination: vendor.vendorPaymentSettings.stripeAccountId,
        description: `Payout to ${vendor.firstName} ${vendor.lastName}`,
        metadata: {
          vendorId: vendor._id.toString(),
          vendorEmail: vendor.email
        }
      });

      return transfer.id;
    } catch (error) {
      console.error('Stripe transfer failed:', error);
      return null;
    }
  }

  /**
   * Process PayPal payout
   */
  private async processPayPalPayout(vendor: IUser, amount: number): Promise<string | null> {
    try {
      // This would integrate with PayPal API in production
      // For now, return a mock payout ID
      console.log(`PayPal payout of ${amount} AED to ${vendor.email}`);
      return `PAYPAL_${Date.now()}`;
    } catch (error) {
      console.error('PayPal payout failed:', error);
      return null;
    }
  }

  /**
   * Create transaction for payout processing fees
   */
  private async createPayoutFeeTransaction(
    vendorId: string,
    payoutAmount: number,
    payoutMethod: string
  ): Promise<void> {
    try {
      const settings = await AdminRevenueSettings.getCurrentSettings();
      if (!settings) return;

      let feeRate = 0;
      let feeDescription = '';

      // Calculate processing fee based on method
      switch (payoutMethod) {
        case 'stripe':
          feeRate = 0.005; // 0.5% for Stripe transfers
          feeDescription = 'Stripe transfer processing fee';
          break;
        case 'paypal':
          feeRate = 0.02; // 2% for PayPal
          feeDescription = 'PayPal payout processing fee';
          break;
        case 'bank_transfer':
          feeRate = 0.001; // 0.1% for bank transfers
          feeDescription = 'Bank transfer processing fee';
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
          currency: 'AED',
          revenueStream: RevenueStream.ANALYTICS, // Using analytics as misc fees
          category: 'payout_processing',
          description: feeDescription,
          status: TransactionStatus.COMPLETED,
          payoutStatus: PayoutStatus.COMPLETED,
          transactionDate: new Date(),
          metadata: {
            payoutMethod,
            originalPayoutAmount: payoutAmount
          }
        });

        await feeTransaction.save();
      }
    } catch (error) {
      console.error('Failed to create payout fee transaction:', error);
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
    }>
  ): Promise<PayoutResult[]> {
    const results: PayoutResult[] = [];

    for (const payout of vendorPayouts) {
      const result = await this.processVendorPayout(
        payout.vendorId,
        payout.transactionIds,
        payout.payoutMethod as any || 'bank_transfer'
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
        throw new AppError('Admin revenue settings not configured', 500);
      }

      const eligibleVendors = await this.getVendorsEligibleForPayout();
      const schedules: PayoutSchedule[] = [];

      for (const vendor of eligibleVendors) {
        // Calculate next payout date based on frequency
        const nextPayoutDate = this.calculateNextPayoutDate(settings.payoutFrequency);

        // Schedule transactions for payout
        await RevenueTransaction.updateMany(
          { _id: { $in: vendor.pendingTransactions } },
          {
            $set: {
              payoutStatus: PayoutStatus.SCHEDULED,
              scheduledPayoutDate: nextPayoutDate
            }
          }
        );

        schedules.push({
          vendorId: vendor.vendorId,
          scheduledDate: nextPayoutDate,
          amount: vendor.totalAmount,
          transactions: vendor.pendingTransactions
        });
      }

      return schedules;
    } catch (error) {
      throw new AppError(`Failed to schedule automatic payouts: ${(error as Error).message}`, 500);
    }
  }

  /**
   * Calculate next payout date based on frequency
   */
  private calculateNextPayoutDate(frequency: string): Date {
    const now = new Date();

    switch (frequency) {
      case 'daily':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);

      case 'weekly':
        // Next Friday
        const daysUntilFriday = (5 - now.getDay() + 7) % 7 || 7;
        return new Date(now.getTime() + daysUntilFriday * 24 * 60 * 60 * 1000);

      case 'biweekly':
        return new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

      case 'monthly':
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
    limit: number = 20
  ): Promise<{
    payouts: any[];
    pagination: any;
  }> {
    try {
      const skip = (page - 1) * limit;

      const [payouts, totalPayouts] = await Promise.all([
        RevenueTransaction.find({
          vendorId,
          payoutStatus: { $in: [PayoutStatus.COMPLETED, PayoutStatus.FAILED] }
        })
        .sort({ payoutDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

        RevenueTransaction.countDocuments({
          vendorId,
          payoutStatus: { $in: [PayoutStatus.COMPLETED, PayoutStatus.FAILED] }
        })
      ]);

      const totalPages = Math.ceil(totalPayouts / limit);

      return {
        payouts: payouts.map(payout => ({
          id: payout._id,
          amount: payout.vendorPayout,
          method: payout.payoutMethod,
          status: payout.payoutStatus,
          transferId: payout.stripeTransferId,
          paidAt: payout.payoutDate,
          revenueStream: payout.revenueStream,
          description: payout.description
        })),
        pagination: {
          currentPage: page,
          totalPages,
          totalPayouts,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
          limit
        }
      };
    } catch (error) {
      throw new AppError(`Failed to get payout history: ${(error as Error).message}`, 500);
    }
  }

  /**
   * Get payout statistics
   */
  public async getPayoutStatistics(period: string = 'month'): Promise<any> {
    try {
      let dateFilter: any = {};
      const now = new Date();

      switch (period) {
        case 'week':
          dateFilter = {
            payoutDate: { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) }
          };
          break;
        case 'month':
          dateFilter = {
            payoutDate: { $gte: new Date(now.getFullYear(), now.getMonth(), 1) }
          };
          break;
        case 'quarter':
          const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
          dateFilter = { payoutDate: { $gte: quarterStart } };
          break;
        case 'year':
          dateFilter = {
            payoutDate: { $gte: new Date(now.getFullYear(), 0, 1) }
          };
          break;
      }

      const [stats, methodBreakdown] = await Promise.all([
        RevenueTransaction.aggregate([
          {
            $match: {
              payoutStatus: PayoutStatus.COMPLETED,
              ...dateFilter
            }
          },
          {
            $group: {
              _id: null,
              totalPaidOut: { $sum: '$vendorPayout' },
              payoutCount: { $sum: 1 },
              avgPayoutAmount: { $avg: '$vendorPayout' }
            }
          }
        ]),

        RevenueTransaction.aggregate([
          {
            $match: {
              payoutStatus: PayoutStatus.COMPLETED,
              ...dateFilter
            }
          },
          {
            $group: {
              _id: '$payoutMethod',
              amount: { $sum: '$vendorPayout' },
              count: { $sum: 1 }
            }
          }
        ])
      ]);

      return {
        overview: stats[0] || {
          totalPaidOut: 0,
          payoutCount: 0,
          avgPayoutAmount: 0
        },
        byMethod: methodBreakdown.reduce((acc, method) => {
          acc[method._id || 'unknown'] = {
            amount: method.amount,
            count: method.count
          };
          return acc;
        }, {})
      };
    } catch (error) {
      throw new AppError(`Failed to get payout statistics: ${(error as Error).message}`, 500);
    }
  }
}

export default new PayoutService();