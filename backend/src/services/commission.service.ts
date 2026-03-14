import mongoose from "mongoose";
import CommissionConfig, {
  CommissionRuleType,
  RecipientType,
} from "../models/CommissionConfig";
import CommissionTransaction, {
  CommissionTransactionStatus,
  CommissionRecipientType,
} from "../models/CommissionTransaction";
import Order from "../models/Order";
import User from "../models/User";

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
        console.warn(
          "⚠️  No active commission configuration found. Using fallback.",
        );
        return this.getFallbackConfig();
      }

      return config;
    } catch (error) {
      console.error("Error fetching commission config:", error);
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
      console.log(`📊 Calculating commission for order: ${orderId}`);

      // Fetch the order with populated data
      const order = await Order.findById(orderId)
        .populate("userId", "firstName lastName email")
        .populate("items.eventId")
        .lean();

      if (!order) {
        throw new Error(`Order not found: ${orderId}`);
      }

      // Type cast to help TypeScript
      const orderData = order as any;

      // Get vendor info from the event
      const event: any = orderData.items[0]?.eventId;
      if (!event || !event.vendorId) {
        throw new Error(`Event or vendor not found for order: ${orderId}`);
      }

      // Fetch vendor details
      const vendor = await User.findById(event.vendorId)
        .select("firstName lastName email")
        .lean();
      if (!vendor) {
        throw new Error(`Vendor not found: ${event.vendorId}`);
      }

      // Check if commission already exists for this order
      const existingCommission = await CommissionTransaction.findOne({
        orderId,
      });
      if (existingCommission) {
        console.log(`ℹ️  Commission already exists for order ${orderId}`);
        return existingCommission;
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
            vendorName: `${vendor.firstName} ${vendor.lastName}`,
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

      console.log(
        `✅ Commission calculated: ${commissionResult.totalCommission} AED (${commissionResult.rate}%)`,
      );

      return commissionTransaction;
    } catch (error) {
      console.error("❌ Error calculating commission:", error);
      throw error;
    }
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

      console.log(
        `✅ Commission recalculated for order: ${transaction.orderId}`,
      );
      return newCommission;
    } catch (error) {
      console.error("❌ Error recalculating commission:", error);
      throw error;
    }
  }
}

export default new CommissionService();
