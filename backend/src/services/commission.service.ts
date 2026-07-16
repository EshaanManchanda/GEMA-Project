import mongoose from "mongoose";
import CommissionConfig, {
  CommissionRuleType,
  RecipientType,
} from "../models/CommissionConfig";
import CommissionTransaction, {
  CommissionTransactionStatus,
  CommissionRecipientType,
} from "../models/CommissionTransaction";
import RevenueTransaction, {
  RevenueStream,
  TransactionStatus,
  PayoutStatus,
} from "../models/RevenueTransaction";
import Order from "../models/Order";
import User from "../models/User";
import Vendor from "../models/Vendor";
import Teacher from "../models/Teacher";
import AdminRevenueSettings from "../models/AdminRevenueSettings";
import logger from "../config/logger";
import { config as envConfig } from "../config";

const DEFAULT_PAYOUT_HOLD_HOURS = 24;

/**
 * Commission calculation service
 */
class CommissionService {
  /**
   * Get the active commission configuration
   */
  async getActiveCommissionConfig(): Promise<any> {
    try {
      // First, try to find the default configuration
      let config = await CommissionConfig.findOne({
        isDefault: true,
        status: "active",
      });

      // If no default, get any active config
      if (!config) {
        config = await CommissionConfig.findOne({ status: "active" });
      }

      // If still no config, create a basic default
      if (!config) {
        logger.warn(
          "⚠️  No active commission configuration found. Using fallback.",
        );
        return this.getFallbackConfig();
      }

      return config;
    } catch (error) {
      logger.error("Error fetching commission config:", error);
      return this.getFallbackConfig();
    }
  }

  /**
   * Fallback commission configuration (5%)
   */
  private getFallbackConfig() {
    return {
      name: "Fallback Commission",
      platformCommission: {
        defaultPercentage: 5,
        currency: "AED",
      },
      rules: [
        {
          id: "fallback",
          name: "Platform 5% Commission",
          type: CommissionRuleType.PERCENTAGE,
          recipient: RecipientType.PLATFORM,
          percentage: 5,
          status: "active",
          priority: 1,
        },
      ],
    };
  }

  /**
   * Calculate commission for an order
   */
  async calculateCommissionForOrder(
    orderId: string | mongoose.Types.ObjectId,
  ): Promise<any> {
    try {
      logger.info(`📊 Calculating commission for order: ${orderId}`);

      // Fetch the order with populated data
      const order = await Order.findById(orderId)
        .populate("userId", "firstName lastName email")
        .populate("items.eventId", "vendorId teacherId")
        .lean();

      if (!order) {
        throw new Error(`Order not found: ${orderId}`);
      }

      // Type cast to help TypeScript
      const orderData = order as any;

      // Get vendor info from the event
      const event: any = orderData.items[0]?.eventId;
      if (!event) {
        throw new Error(`Event not found for order: ${orderId}`);
      }

      // event.vendorId is Vendor._id (not User._id)
      const vendorProfile = event.vendorId
        ? await Vendor.findById(event.vendorId)
        : null;
      const teacherProfile = event.teacherId
        ? await Teacher.findById(event.teacherId)
        : null;

      if (!vendorProfile && !teacherProfile) {
        throw new Error(`No vendor or teacher found for order: ${orderId}`);
      }

      // Resolve display name for the transaction
      let vendorName = "Unknown Vendor";
      if (vendorProfile) {
        const vendorUser = await User.findById(vendorProfile.userId)
          .select("firstName lastName")
          .lean();
        if (vendorUser) {
          vendorName = `${(vendorUser as any).firstName} ${(vendorUser as any).lastName}`;
        }
      }

      // Check if commission already exists for this order
      const existingCommission = await CommissionTransaction.findOne({
        orderId,
      });
      if (existingCommission) {
        logger.info(`ℹ️  Commission already exists for order ${orderId}`);
        return existingCommission;
      }
      const profile: any = vendorProfile || teacherProfile;

      if (
        profile &&
        profile.paymentSettings?.paymentMode === "custom_stripe" &&
        profile.isSubscriptionActive() &&
        !envConfig.commission.chargeOnActiveSubscription
      ) {
        const transactionId = await this.generateTransactionId();
        const totalAmount = orderData.total || 0;
        const zeroCommission = new CommissionTransaction({
          transactionId,
          orderId: orderData._id,
          orderNumber: orderData.orderNumber || orderId.toString(),
          vendorId: event.vendorId,
          vendorName,
          customerId: orderData.userId,
          customerName: orderData.userId
            ? `${(orderData.userId as any).firstName} ${(orderData.userId as any).lastName}`
            : "Guest",
          commissionConfigId: null,
          originalAmount: totalAmount,
          totalCommissionAmount: 0,
          platformCommission: 0,
          vendorCommission: totalAmount,
          commissions: [],
          status: CommissionTransactionStatus.CALCULATED,
          calculatedAt: new Date(),
          metadata: { reason: "subscription_model_active" },
        });
        await zeroCommission.save();
        await this.createRevenueTransaction(orderData, event.vendorId, totalAmount, 0);
        logger.info(
          `✅ Zero commission for order ${orderId}: subscription model active`,
        );
        return zeroCommission;
      }

      // Get active commission configuration
      const config = await this.getActiveCommissionConfig();

      // Calculate commission amounts
      const totalAmount = orderData.total || 0;
      const commissionResult = this.applyCommissionRules(
        totalAmount,
        config,
        orderData,
      );

      // Generate transaction ID
      const transactionId = await this.generateTransactionId();

      // Create commission transaction inside a session to prevent orphaned records
      const session = await mongoose.startSession();
      let commissionTransaction: any;
      try {
        await session.withTransaction(async () => {
          commissionTransaction = new CommissionTransaction({
            transactionId,
            orderId: orderData._id,
            orderNumber: orderData.orderNumber || orderId.toString(),
            vendorId: event.vendorId,
            vendorName,
            customerId: orderData.userId,
            customerName: orderData.userId
              ? `${(orderData.userId as any).firstName} ${(orderData.userId as any).lastName}`
              : "Guest",
            commissionConfigId: config._id || null,
            originalAmount: totalAmount,
            totalCommissionAmount: commissionResult.totalCommission,
            platformCommission: commissionResult.platformCommission,
            vendorCommission: totalAmount - commissionResult.totalCommission,
            commissions: commissionResult.commissions,
            status: CommissionTransactionStatus.CALCULATED,
            calculatedAt: new Date(),
          });
          await commissionTransaction.save({ session });
        });
      } finally {
        await session.endSession();
      }

      await this.createRevenueTransaction(
        orderData,
        event.vendorId,
        totalAmount,
        commissionResult.totalCommission,
      );

      logger.info(
        `✅ Commission calculated: ${commissionResult.totalCommission} AED (${commissionResult.rate}%)`,
      );

      return commissionTransaction;
    } catch (error) {
      logger.error("❌ Error calculating commission:", error);
      throw error;
    }
  }

  /**
   * Admin-configurable payout hold window (hours). This is the refund/clawback
   * safety period after payment confirmation before a vendor's money becomes
   * payout-eligible. Falls back to DEFAULT_PAYOUT_HOLD_HOURS if settings are
   * unavailable. Single read point — do not hardcode this value elsewhere.
   */
  async getPayoutHoldHours(): Promise<number> {
    try {
      const settings = await AdminRevenueSettings.getCurrentSettings();
      const hours = (settings as any)?.payoutHoldHours;
      return typeof hours === "number" && hours >= 0
        ? hours
        : DEFAULT_PAYOUT_HOLD_HOURS;
    } catch (error) {
      logger.error("Error reading payoutHoldHours, using default:", error);
      return DEFAULT_PAYOUT_HOLD_HOURS;
    }
  }

  /**
   * Create RevenueTransaction for a paid order (idempotent).
   * payoutEligibleAt = payment-confirmation time + admin-configured payoutHoldHours.
   * This is the SINGLE writer of RevenueTransaction for order-driven revenue —
   * Order.ts no longer creates these on the live path (see Order.markAsPaid).
   */
  private async createRevenueTransaction(
    orderData: any,
    vendorId: any,
    totalAmount: number,
    commissionAmount: number,
  ): Promise<void> {
    try {
      if (!vendorId) return;
      const existing = await RevenueTransaction.findOne({ orderId: orderData._id });
      if (existing) return;

      const payoutHoldHours = await this.getPayoutHoldHours();
      // transactionDate = payment confirmation time (now), not order.createdAt —
      // the hold window protects against refunds from the moment money is captured.
      const transactionDate = new Date();
      const payoutEligibleAt = new Date(
        transactionDate.getTime() + payoutHoldHours * 60 * 60 * 1000,
      );

      await new RevenueTransaction({
        orderId: orderData._id,
        vendorId,
        customerId: orderData.userId?._id || orderData.userId,
        totalAmount,
        adminCommission: commissionAmount,
        vendorPayout: totalAmount - commissionAmount,
        serviceFeeRate: totalAmount > 0 ? (commissionAmount / totalAmount) * 100 : 0,
        currency: orderData.currency || "AED",
        revenueStream: RevenueStream.BOOKING,
        status: TransactionStatus.COMPLETED,
        payoutStatus: PayoutStatus.PENDING,
        transactionDate,
        payoutEligibleAt,
        payoutHoldHoursSnapshot: payoutHoldHours,
        stripePaymentId: orderData.stripePaymentIntentId,
        metadata: {
          eventTitle: orderData.items?.[0]?.eventTitle || "Event Booking",
        },
      }).save();
    } catch (err: any) {
      if (err?.code === 11000) {
        // Concurrent writer already created it (webhook + backfill race) — expected, not an error.
        logger.info(
          `ℹ️  RevenueTransaction already exists for order ${orderData._id} (duplicate-key, race with concurrent writer)`,
        );
        return;
      }
      // Non-fatal: log but don't fail the commission calculation
      logger.error("⚠️  Failed to create RevenueTransaction:", err);
    }
  }

  /**
   * Backfill: find paid orders past the payout hold window with no CommissionTransaction
   * and calculate commission + create RevenueTransaction for each.
   * Called hourly by cron. Safety net for the webhook path (see payment.service.ts
   * handlePaymentSucceeded) — should normally find nothing to process.
   */
  async processUncommissionedOrders(): Promise<{ processed: number; failed: number }> {
    const payoutHoldHours = await this.getPayoutHoldHours();
    const cutoff = new Date(Date.now() - payoutHoldHours * 60 * 60 * 1000);

    const paidOrders = await Order.find({
      paymentStatus: "paid",
      "items.0": { $exists: true },
      createdAt: { $lte: cutoff },
    })
      .select("_id")
      .lean();

    if (paidOrders.length === 0) return { processed: 0, failed: 0 };

    const orderIds = paidOrders.map((o) => (o as any)._id);
    const existingCommissions = await CommissionTransaction.find({
      orderId: { $in: orderIds },
    })
      .select("orderId")
      .lean();
    const commissionsSet = new Set(
      existingCommissions.map((c) => c.orderId.toString()),
    );

    const toProcess = paidOrders.filter(
      (o) => !commissionsSet.has((o as any)._id.toString()),
    );

    let processed = 0;
    let failed = 0;
    for (const order of toProcess) {
      try {
        await this.calculateCommissionForOrder((order as any)._id);
        processed++;
      } catch (err) {
        logger.error(`Commission backfill failed for order ${(order as any)._id}:`, err);
        failed++;
      }
    }

    if (processed > 0 || failed > 0) {
      logger.info(`📊 Commission backfill: processed=${processed}, failed=${failed}`);
    }
    return { processed, failed };
  }

  /**
   * Apply commission rules to calculate commission amount
   */
  private applyCommissionRules(
    totalAmount: number,
    config: any,
    order?: any,
  ): any {
    const commissions: any[] = [];
    let totalCommission = 0;
    let platformCommission = 0;

    // If no rules, use platform default percentage
    if (!config.rules || config.rules.length === 0) {
      const rate = config.platformCommission?.defaultPercentage || 5;
      platformCommission = Math.round(totalAmount * rate) / 100;
      totalCommission = platformCommission;

      commissions.push({
        recipientId: "platform",
        recipient: "Platform",
        recipientType: CommissionRecipientType.PLATFORM,
        grossAmount: platformCommission,
        deductions: 0,
        netAmount: platformCommission,
        percentage: rate,
        rule: "Default Platform Commission",
      });

      return {
        totalCommission,
        platformCommission,
        rate,
        commissions,
      };
    }

    // Apply each active rule
    for (const rule of config.rules.filter((r: any) => r.status === "active")) {
      let commissionAmount = 0;

      // Check if rule conditions match
      if (
        rule.conditions &&
        !this.checkRuleConditions(rule.conditions, totalAmount, order)
      ) {
        continue;
      }

      // Calculate based on rule type
      switch (rule.type) {
        case CommissionRuleType.PERCENTAGE:
          commissionAmount =
            Math.round(totalAmount * (rule.percentage || 0)) / 100;
          break;

        case CommissionRuleType.FIXED:
          commissionAmount = rule.fixedAmount || 0;
          break;

        case CommissionRuleType.TIERED:
          commissionAmount = this.calculateTieredCommission(
            totalAmount,
            rule.tiers || [],
          );
          break;

        default:
          continue;
      }

      // Track platform commission separately
      if (rule.recipient === RecipientType.PLATFORM) {
        platformCommission += commissionAmount;
      }

      totalCommission += commissionAmount;

      commissions.push({
        recipientId:
          rule.recipient === RecipientType.PLATFORM
            ? "platform"
            : order?.affiliateId || "unknown",
        recipient: this.getRecipientName(rule.recipient),
        recipientType: this.mapRecipientType(rule.recipient),
        grossAmount: commissionAmount,
        deductions: 0,
        netAmount: commissionAmount,
        percentage: rule.percentage || 0,
        rule: rule.name,
      });
    }

    const rate = totalAmount > 0 ? (totalCommission / totalAmount) * 100 : 0;

    return {
      totalCommission,
      platformCommission,
      rate: parseFloat(rate.toFixed(2)),
      commissions,
    };
  }

  /**
   * Check if order matches rule conditions
   */
  private checkRuleConditions(
    conditions: any,
    totalAmount: number,
    order?: any,
  ): boolean {
    // Check order amount range
    if (conditions.minOrderAmount && totalAmount < conditions.minOrderAmount) {
      return false;
    }
    if (conditions.maxOrderAmount && totalAmount > conditions.maxOrderAmount) {
      return false;
    }

    // Check categories (if available in order)
    if (conditions.categories && conditions.categories.length > 0 && order) {
      const eventCategory = (order.eventId as any)?.category?.toString();
      if (!eventCategory || !conditions.categories.includes(eventCategory)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Calculate tiered commission
   */
  private calculateTieredCommission(totalAmount: number, tiers: any[]): number {
    for (const tier of tiers) {
      const minAmount = tier.minAmount || 0;
      const maxAmount = tier.maxAmount || Infinity;

      if (totalAmount >= minAmount && totalAmount <= maxAmount) {
        return (totalAmount * tier.percentage) / 100;
      }
    }

    // No matching tier found, use 0
    return 0;
  }

  /**
   * Get recipient display name
   */
  private getRecipientName(recipientType: RecipientType): string {
    switch (recipientType) {
      case RecipientType.PLATFORM:
        return "Platform";
      case RecipientType.VENDOR:
        return "Vendor";
      case RecipientType.AFFILIATE:
        return "Affiliate";
      case RecipientType.REFERRER:
        return "Referrer";
      default:
        return "Unknown";
    }
  }

  /**
   * Map commission recipient type to transaction recipient type
   */
  private mapRecipientType(
    recipientType: RecipientType,
  ): CommissionRecipientType {
    switch (recipientType) {
      case RecipientType.PLATFORM:
        return CommissionRecipientType.PLATFORM;
      case RecipientType.VENDOR:
        return CommissionRecipientType.VENDOR;
      case RecipientType.AFFILIATE:
        return CommissionRecipientType.AFFILIATE;
      case RecipientType.REFERRER:
        return CommissionRecipientType.REFERRER;
      default:
        return CommissionRecipientType.PLATFORM;
    }
  }

  /**
   * Generate unique transaction ID
   */
  private async generateTransactionId(): Promise<string> {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0");
    return `COM-${timestamp}-${random}`;
  }

  /**
   * Batch calculate commissions for multiple orders
   */
  async batchCalculateCommissions(orderIds: string[]): Promise<any> {
    const results = {
      success: [],
      failed: [],
    };

    for (const orderId of orderIds) {
      try {
        const commission = await this.calculateCommissionForOrder(orderId);
        results.success.push({ orderId, commissionId: commission._id });
      } catch (error) {
        results.failed.push({ orderId, error: (error as Error).message });
      }
    }

    return results;
  }

  /**
   * Recalculate commission for an existing transaction
   */
  async recalculateCommission(transactionId: string): Promise<any> {
    try {
      const transaction = await CommissionTransaction.findById(transactionId);
      if (!transaction) {
        throw new Error(`Commission transaction not found: ${transactionId}`);
      }

      // Delete the existing transaction
      await transaction.deleteOne();

      // Recalculate
      const newCommission = await this.calculateCommissionForOrder(
        transaction.orderId,
      );

      logger.info(
        `✅ Commission recalculated for order: ${transaction.orderId}`,
      );
      return newCommission;
    } catch (error) {
      logger.error("❌ Error recalculating commission:", error);
      throw error;
    }
  }
}

export default new CommissionService();
