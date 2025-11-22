import Vendor, { PaymentMode, VendorSubscriptionStatus } from '../models/Vendor';
import Event from '../models/Event';
import { stripe } from '../config/stripe';
import { Types } from 'mongoose';
import Stripe from 'stripe';

/**
 * Subscription Management Service
 *
 * Manages vendor subscriptions for those using custom Stripe accounts.
 * Vendors pay 150 AED/month to use their own Stripe account (no commission).
 * Alternative: Use platform Stripe and pay 5% commission per transaction.
 */

interface ISubscriptionService {
  createSubscription(vendorId: Types.ObjectId): Promise<SubscriptionInfo>;
  processSubscriptionPayment(vendorId: Types.ObjectId): Promise<PaymentResult>;
  checkSubscriptionStatus(vendorId: Types.ObjectId): Promise<SubscriptionInfo>;
  renewSubscription(vendorId: Types.ObjectId): Promise<PaymentResult>;
  cancelSubscription(vendorId: Types.ObjectId, reason?: string): Promise<void>;
  suspendSubscription(vendorId: Types.ObjectId, reason: string): Promise<void>;
  reactivateSubscription(vendorId: Types.ObjectId): Promise<void>;
  getSubscriptionHistory(vendorId: Types.ObjectId): Promise<SubscriptionPayment[]>;
  sendPaymentReminder(vendorId: Types.ObjectId, daysUntilDue: number): Promise<void>;
  processExpiredSubscriptions(): Promise<void>;
  calculateSubscriptionCost(vendorId: Types.ObjectId, months: number): Promise<number>;
}

export interface SubscriptionInfo {
  vendorId: Types.ObjectId;
  status: VendorSubscriptionStatus;
  amount: number;
  currency: string;
  startDate?: Date;
  paidUntil?: Date;
  nextPaymentDue?: Date;
  daysRemaining?: number;
  isActive: boolean;
  isInGracePeriod: boolean;
}

export interface PaymentResult {
  success: boolean;
  paymentId?: string;
  amount: number;
  paidUntil: Date;
  error?: string;
}

export interface SubscriptionPayment {
  paymentDate: Date;
  amount: number;
  periodStart: Date;
  periodEnd: Date;
  status: 'paid' | 'failed' | 'pending' | 'refunded';
  transactionId?: string;
  invoiceUrl?: string;
}

class SubscriptionService implements ISubscriptionService {
  private readonly SUBSCRIPTION_AMOUNT = 150; // AED per month
  private readonly CURRENCY = 'AED';
  private readonly GRACE_PERIOD_DAYS = 7; // 7 days grace period after expiry

  /**
   * Create a new subscription for a vendor
   * This is called when a vendor switches to custom Stripe mode
   */
  async createSubscription(vendorId: Types.ObjectId): Promise<SubscriptionInfo> {
    try {
      const vendor = await Vendor.findById(vendorId);
      if (!vendor) {
        throw new Error('Vendor not found');
      }

      // Verify vendor has custom Stripe setup
      if (vendor.paymentSettings.paymentMode !== PaymentMode.CUSTOM_STRIPE) {
        throw new Error('Vendor must be in custom Stripe mode to create subscription');
      }

      const hasStripeConnect = vendor.paymentSettings.stripeSettings.stripeConnectOnboardingComplete;
      const hasManualKeys = vendor.paymentSettings.stripeSettings.stripePublishableKey;

      if (!hasStripeConnect && !hasManualKeys) {
        throw new Error('Vendor must have Stripe account configured');
      }

      // Create subscription record
      vendor.paymentSettings.subscriptionStatus = VendorSubscriptionStatus.PENDING;
      vendor.paymentSettings.subscriptionStartDate = new Date();
      vendor.paymentSettings.subscriptionAmount = this.SUBSCRIPTION_AMOUNT;

      await vendor.save();

      console.log(`✓ Created subscription for vendor ${vendorId}`);

      return this.checkSubscriptionStatus(vendorId);
    } catch (error: any) {
      console.error('Error creating subscription:', error);
      throw new Error(`Failed to create subscription: ${error.message}`);
    }
  }

  /**
   * Process a subscription payment
   * Can be triggered manually by vendor or automatically by scheduled job
   */
  async processSubscriptionPayment(vendorId: Types.ObjectId): Promise<PaymentResult> {
    try {
      const vendor = await Vendor.findById(vendorId);
      if (!vendor) {
        throw new Error('Vendor not found');
      }

      const amount = vendor.paymentSettings.subscriptionAmount || this.SUBSCRIPTION_AMOUNT;

      // Process payment via Stripe
      // Note: You'll need to have a payment method on file for the vendor
      // This could be a card, bank account, or other payment method

      // For now, we'll create a payment intent and assume it's paid
      // In production, you'd integrate with your payment flow

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount * 100, // Convert to fils (smallest currency unit)
        currency: this.CURRENCY.toLowerCase(),
        description: `Monthly subscription for ${vendor.businessName}`,
        metadata: {
          vendorId: vendorId.toString(),
          type: 'subscription_payment'
        }
      });

      // Calculate new paid until date (1 month from now or from current expiry)
      const currentPaidUntil = vendor.paymentSettings.subscriptionPaidUntil;
      const now = new Date();
      let newPaidUntil: Date;

      if (currentPaidUntil && currentPaidUntil > now) {
        // Extend from current expiry
        newPaidUntil = new Date(currentPaidUntil);
        newPaidUntil.setMonth(newPaidUntil.getMonth() + 1);
      } else {
        // Start from now
        newPaidUntil = new Date();
        newPaidUntil.setMonth(newPaidUntil.getMonth() + 1);
      }

      // Update vendor subscription
      vendor.paymentSettings.subscriptionStatus = VendorSubscriptionStatus.ACTIVE;
      vendor.paymentSettings.subscriptionPaidUntil = newPaidUntil;

      // Add to subscription history
      if (!vendor.paymentSettings.subscriptionHistory) {
        vendor.paymentSettings.subscriptionHistory = [];
      }

      const periodStart = currentPaidUntil && currentPaidUntil > now ? currentPaidUntil : now;
      const periodEnd = newPaidUntil;

      vendor.paymentSettings.subscriptionHistory.push({
        paymentDate: now,
        amount,
        periodStart,
        periodEnd,
        status: 'paid',
        transactionId: paymentIntent.id,
        invoiceUrl: undefined // TODO: Generate invoice PDF
      });

      await vendor.save();

      console.log(`✓ Processed subscription payment for vendor ${vendorId}`);

      return {
        success: true,
        paymentId: paymentIntent.id,
        amount,
        paidUntil: newPaidUntil
      };
    } catch (error: any) {
      console.error('Error processing subscription payment:', error);

      // Record failed payment
      const vendor = await Vendor.findById(vendorId);
      if (vendor) {
        if (!vendor.paymentSettings.subscriptionHistory) {
          vendor.paymentSettings.subscriptionHistory = [];
        }

        vendor.paymentSettings.subscriptionHistory.push({
          paymentDate: new Date(),
          amount: this.SUBSCRIPTION_AMOUNT,
          periodStart: new Date(),
          periodEnd: new Date(),
          status: 'failed',
          transactionId: undefined,
          invoiceUrl: undefined
        });

        await vendor.save();
      }

      return {
        success: false,
        amount: this.SUBSCRIPTION_AMOUNT,
        paidUntil: new Date(),
        error: error.message
      };
    }
  }

  /**
   * Check the current subscription status for a vendor
   */
  async checkSubscriptionStatus(vendorId: Types.ObjectId): Promise<SubscriptionInfo> {
    try {
      const vendor = await Vendor.findById(vendorId);
      if (!vendor) {
        throw new Error('Vendor not found');
      }

      const now = new Date();
      const paidUntil = vendor.paymentSettings.subscriptionPaidUntil;
      const status = vendor.paymentSettings.subscriptionStatus;

      let isActive = false;
      let isInGracePeriod = false;
      let daysRemaining: number | undefined;
      let nextPaymentDue: Date | undefined;

      if (paidUntil) {
        const msRemaining = paidUntil.getTime() - now.getTime();
        daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));

        if (daysRemaining > 0) {
          isActive = true;
          // Next payment due 3 days before expiry
          nextPaymentDue = new Date(paidUntil);
          nextPaymentDue.setDate(nextPaymentDue.getDate() - 3);
        } else if (daysRemaining >= -this.GRACE_PERIOD_DAYS) {
          // In grace period
          isInGracePeriod = true;
          nextPaymentDue = now; // Payment overdue
        }
      }

      return {
        vendorId,
        status,
        amount: vendor.paymentSettings.subscriptionAmount || this.SUBSCRIPTION_AMOUNT,
        currency: this.CURRENCY,
        startDate: vendor.paymentSettings.subscriptionStartDate,
        paidUntil,
        nextPaymentDue,
        daysRemaining,
        isActive,
        isInGracePeriod
      };
    } catch (error: any) {
      console.error('Error checking subscription status:', error);
      throw new Error(`Failed to check subscription status: ${error.message}`);
    }
  }

  /**
   * Renew subscription (manual renewal by vendor)
   */
  async renewSubscription(vendorId: Types.ObjectId): Promise<PaymentResult> {
    return this.processSubscriptionPayment(vendorId);
  }

  /**
   * Cancel subscription
   * Vendor will be switched back to platform Stripe mode
   */
  async cancelSubscription(vendorId: Types.ObjectId, reason?: string): Promise<void> {
    try {
      const vendor = await Vendor.findById(vendorId);
      if (!vendor) {
        throw new Error('Vendor not found');
      }

      // Update subscription status
      vendor.paymentSettings.subscriptionStatus = VendorSubscriptionStatus.INACTIVE;

      // Switch back to platform Stripe
      vendor.paymentSettings.paymentMode = PaymentMode.PLATFORM_STRIPE;
      vendor.paymentSettings.paymentModeChangedAt = new Date();

      await vendor.save();

      console.log(`✓ Cancelled subscription for vendor ${vendorId}. Reason: ${reason || 'Not specified'}`);
    } catch (error: any) {
      console.error('Error cancelling subscription:', error);
      throw new Error(`Failed to cancel subscription: ${error.message}`);
    }
  }

  /**
   * Suspend subscription due to non-payment
   */
  async suspendSubscription(vendorId: Types.ObjectId, reason: string): Promise<void> {
    try {
      const vendor = await Vendor.findById(vendorId);
      if (!vendor) {
        throw new Error('Vendor not found');
      }

      vendor.paymentSettings.subscriptionStatus = VendorSubscriptionStatus.SUSPENDED;
      vendor.isSuspended = true;
      vendor.suspensionReason = reason;

      await vendor.save();

      console.log(`✓ Suspended subscription for vendor ${vendorId}. Reason: ${reason}`);

      // TODO: Send email notification to vendor
    } catch (error: any) {
      console.error('Error suspending subscription:', error);
      throw new Error(`Failed to suspend subscription: ${error.message}`);
    }
  }

  /**
   * Reactivate suspended subscription after payment
   */
  async reactivateSubscription(vendorId: Types.ObjectId): Promise<void> {
    try {
      const vendor = await Vendor.findById(vendorId);
      if (!vendor) {
        throw new Error('Vendor not found');
      }

      // Process payment first
      const paymentResult = await this.processSubscriptionPayment(vendorId);

      if (!paymentResult.success) {
        throw new Error('Payment failed. Cannot reactivate subscription.');
      }

      // Reactivate
      vendor.paymentSettings.subscriptionStatus = VendorSubscriptionStatus.ACTIVE;
      vendor.isActive = true;
      vendor.isSuspended = false;
      vendor.suspensionReason = undefined;

      await vendor.save();

      // Reactivate vendor's events that were deactivated due to subscription expiry
      await Event.updateMany(
        {
          vendorId: vendor._id,
          isActive: false,
          'metadata.deactivationReason': 'Vendor subscription expired'
        },
        {
          $set: { isActive: true },
          $unset: { 'metadata.deactivationReason': '' }
        }
      );

      console.log(`✓ Reactivated subscription for vendor ${vendorId}. Events restored.`);

      // TODO: Send email notification to vendor
    } catch (error: any) {
      console.error('Error reactivating subscription:', error);
      throw new Error(`Failed to reactivate subscription: ${error.message}`);
    }
  }

  /**
   * Get subscription payment history
   */
  async getSubscriptionHistory(vendorId: Types.ObjectId): Promise<SubscriptionPayment[]> {
    try {
      const vendor = await Vendor.findById(vendorId);
      if (!vendor) {
        throw new Error('Vendor not found');
      }

      return vendor.paymentSettings.subscriptionHistory || [];
    } catch (error: any) {
      console.error('Error getting subscription history:', error);
      throw new Error(`Failed to get subscription history: ${error.message}`);
    }
  }

  /**
   * Send payment reminder email to vendor
   */
  async sendPaymentReminder(vendorId: Types.ObjectId, daysUntilDue: number): Promise<void> {
    try {
      const vendor = await Vendor.findById(vendorId);
      if (!vendor) {
        throw new Error('Vendor not found');
      }

      // TODO: Implement email sending
      console.log(`📧 Sending payment reminder to vendor ${vendorId} (${daysUntilDue} days until due)`);

      // Email template would include:
      // - Days until payment due
      // - Amount due
      // - Link to payment page
      // - Consequences of non-payment
    } catch (error: any) {
      console.error('Error sending payment reminder:', error);
      throw new Error(`Failed to send payment reminder: ${error.message}`);
    }
  }

  /**
   * Process expired subscriptions (run daily via cron job)
   * - Check for subscriptions that expired
   * - Move to grace period
   * - Suspend if grace period expired
   */
  async processExpiredSubscriptions(): Promise<void> {
    try {
      const now = new Date();
      const gracePeriodEnd = new Date();
      gracePeriodEnd.setDate(gracePeriodEnd.getDate() - this.GRACE_PERIOD_DAYS);

      // Find vendors with custom Stripe and expired subscriptions
      const vendors = await Vendor.find({
        'paymentSettings.paymentMode': PaymentMode.CUSTOM_STRIPE,
        'paymentSettings.subscriptionStatus': {
          $in: [VendorSubscriptionStatus.ACTIVE, VendorSubscriptionStatus.GRACE_PERIOD]
        }
      });

      for (const vendor of vendors) {
        const paidUntil = vendor.paymentSettings.subscriptionPaidUntil;

        if (!paidUntil) {
          continue;
        }

        // Check if subscription expired
        if (paidUntil < now) {
          const msExpired = now.getTime() - paidUntil.getTime();
          const daysExpired = Math.floor(msExpired / (1000 * 60 * 60 * 24));

          if (daysExpired <= this.GRACE_PERIOD_DAYS) {
            // Move to grace period
            if (vendor.paymentSettings.subscriptionStatus !== VendorSubscriptionStatus.GRACE_PERIOD) {
              vendor.paymentSettings.subscriptionStatus = VendorSubscriptionStatus.GRACE_PERIOD;
              await vendor.save();

              console.log(`✓ Vendor ${vendor._id} moved to grace period (${daysExpired} days expired)`);

              // Send reminder
              await this.sendPaymentReminder(vendor._id, -daysExpired);
            }
          } else {
            // Grace period expired, suspend subscription and deactivate vendor
            vendor.paymentSettings.subscriptionStatus = VendorSubscriptionStatus.EXPIRED;
            vendor.isActive = false;
            vendor.isSuspended = true;
            vendor.suspensionReason = `Subscription expired ${daysExpired} days ago. Grace period ended. Events are hidden from portal.`;
            await vendor.save();

            // Deactivate all vendor's events (hide from portal)
            await Event.updateMany(
              { vendorId: vendor._id, isActive: true },
              {
                $set: {
                  isActive: false,
                  'metadata.deactivationReason': 'Vendor subscription expired'
                }
              }
            );

            console.log(`⚠️  Vendor ${vendor._id} subscription expired and deactivated (${daysExpired} days expired). Events hidden.`);

            // TODO: Send email notification to vendor about deactivation
          }
        }
      }

      console.log(`✓ Processed expired subscriptions check`);
    } catch (error: any) {
      console.error('Error processing expired subscriptions:', error);
      throw new Error(`Failed to process expired subscriptions: ${error.message}`);
    }
  }

  /**
   * Calculate subscription cost for multiple months
   */
  async calculateSubscriptionCost(vendorId: Types.ObjectId, months: number): Promise<number> {
    const vendor = await Vendor.findById(vendorId);
    const monthlyAmount = vendor?.paymentSettings.subscriptionAmount || this.SUBSCRIPTION_AMOUNT;

    return monthlyAmount * months;
  }
}

// Export singleton instance
export const subscriptionService = new SubscriptionService();
export default subscriptionService;
