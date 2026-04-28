import { Types } from "mongoose";
import Stripe from "stripe";
import Teacher from "../models/Teacher";
import TeacherSubscription, {
  TeacherSubscriptionPlan,
  TeacherBillingCycle,
  TeacherSubscriptionStatus,
} from "../models/TeacherSubscription";
import { stripe } from "../config/stripe";
import { emailService } from "./email.service";
import logger from "../config/logger";

interface ITeacherSubscriptionService {
  createSubscription(
    teacherId: Types.ObjectId,
    plan: TeacherSubscriptionPlan,
    billingCycle: TeacherBillingCycle,
  ): Promise<TeacherSubscriptionInfo>;

  processSubscriptionPayment(teacherId: Types.ObjectId): Promise<PaymentResult>;

  checkSubscriptionStatus(
    teacherId: Types.ObjectId,
  ): Promise<TeacherSubscriptionInfo>;

  renewSubscription(teacherId: Types.ObjectId): Promise<PaymentResult>;

  cancelSubscription(teacherId: Types.ObjectId, reason?: string): Promise<void>;

  suspendSubscription(teacherId: Types.ObjectId, reason: string): Promise<void>;

  reactivateSubscription(teacherId: Types.ObjectId): Promise<void>;

  getSubscriptionHistory(
    teacherId: Types.ObjectId,
  ): Promise<SubscriptionPayment[]>;

  sendPaymentReminder(
    teacherId: Types.ObjectId,
    daysUntilDue: number,
  ): Promise<void>;

  processExpiredSubscriptions(): Promise<void>;

  calculateSubscriptionCost(
    teacherId: Types.ObjectId,
    months: number,
  ): Promise<number>;
}

export interface TeacherSubscriptionInfo {
  teacherId: Types.ObjectId;
  plan: TeacherSubscriptionPlan;
  billingCycle: TeacherBillingCycle;
  status: TeacherSubscriptionStatus;
  amount: number;
  currency: string;
  startDate?: Date;
  endDate?: Date;
  nextBillingDate?: Date;
  daysRemaining?: number;
  isActive: boolean;
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
  status: "paid" | "failed" | "pending" | "refunded";
  transactionId?: string;
  invoiceUrl?: string;
}

class TeacherSubscriptionService implements ITeacherSubscriptionService {
  private readonly CURRENCY = "AED";
  private readonly GRACE_PERIOD_DAYS = 7;
  /**
   * Create a new subscription for a teacher
   * Called when teacher selects a paid plan
   */
  async createSubscription(
    teacherId: Types.ObjectId,
    plan: TeacherSubscriptionPlan,
    billingCycle: TeacherBillingCycle,
  ): Promise<TeacherSubscriptionInfo> {
    try {
      const teacher = await Teacher.findById(teacherId);
      if (!teacher) {
        throw new Error("Teacher not found");
      }

      if (teacher.isSuspended) {
        throw new Error("Suspended teacher cannot create subscription");
      }

      // Prevent duplicate active subscriptions
      const existingSubscription = await TeacherSubscription.findOne({
        teacherId,
        status: {
          $in: [
            TeacherSubscriptionStatus.ACTIVE,
            TeacherSubscriptionStatus.TRIALING,
          ],
        },
      });

      if (existingSubscription) {
        throw new Error("Teacher already has an active subscription");
      }

      /**
       * Calculate dates
       */
      const startDate = new Date();
      const endDate = new Date(startDate);
      const nextBillingDate = new Date(startDate);

      switch (billingCycle) {
        case TeacherBillingCycle.MONTHLY:
          endDate.setMonth(endDate.getMonth() + 1);
          nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
          break;

        case TeacherBillingCycle.QUARTERLY:
          endDate.setMonth(endDate.getMonth() + 3);
          nextBillingDate.setMonth(nextBillingDate.getMonth() + 3);
          break;

        case TeacherBillingCycle.YEARLY:
          endDate.setFullYear(endDate.getFullYear() + 1);
          nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
          break;
      }

      /**
       * Create subscription
       * Pricing + features injected by schema middleware
       */
      const subscription = await TeacherSubscription.create({
        teacherId,
        plan,
        billingCycle,
        status: TeacherSubscriptionStatus.TRIALING,
        startDate,
        endDate,
        nextBillingDate,
      });

      /**
       * Mirror status in Teacher
       */
      teacher.paymentSettings.subscriptionStatus =
        TeacherSubscriptionStatus.TRIALING;
      teacher.paymentSettings.subscriptionPaidUntil = endDate;

      await teacher.save();

      /**
       * Resolve amount based on billing cycle
       */
      const amount =
        billingCycle === TeacherBillingCycle.MONTHLY
          ? subscription.currentPricing.monthlyPrice
          : billingCycle === TeacherBillingCycle.QUARTERLY
            ? subscription.currentPricing.quarterlyPrice
            : subscription.currentPricing.yearlyPrice;

      return {
        teacherId,
        plan,
        billingCycle,
        status: subscription.status,
        amount,
        currency: subscription.currentPricing.currency,
        startDate,
        endDate,
        nextBillingDate,
        isActive: subscription.isActive(),
      };
    } catch (error: any) {
      logger.error("Error creating teacher subscription:", error);
      throw new Error(`Failed to create subscription: ${error.message}`);
    }
  }
  /**
   * Process a subscription payment
   * Can be triggered manually or by cron
   */
  async processSubscriptionPayment(
    teacherId: Types.ObjectId,
  ): Promise<PaymentResult> {
    try {
      const teacher = await Teacher.findById(teacherId);
      if (!teacher) {
        throw new Error("Teacher not found");
      }

      const subscription = await TeacherSubscription.findOne({
        teacherId,
        status: {
          $in: [
            TeacherSubscriptionStatus.TRIALING,
            TeacherSubscriptionStatus.ACTIVE,
            TeacherSubscriptionStatus.PENDING,
            TeacherSubscriptionStatus.GRACE_PERIOD,
          ],
        },
      });

      if (!subscription) {
        throw new Error("No active subscription found");
      }

      /**
       * Resolve amount by billing cycle
       */
      const amount =
        subscription.billingCycle === TeacherBillingCycle.MONTHLY
          ? subscription.currentPricing.monthlyPrice
          : subscription.billingCycle === TeacherBillingCycle.QUARTERLY
            ? subscription.currentPricing.quarterlyPrice
            : subscription.currentPricing.yearlyPrice;

      /**
       * Stripe payment intent (simplified)
       */
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount * 100,
        currency: subscription.currentPricing.currency.toLowerCase(),
        description: `Teacher subscription (${subscription.plan})`,
        metadata: {
          teacherId: teacherId.toString(),
          subscriptionId: subscription._id.toString(),
          type: "teacher_subscription",
        },
      });

      /**
       * Calculate new dates
       */
      const now = new Date();
      const baseDate =
        subscription.endDate && subscription.endDate > now
          ? subscription.endDate
          : now;

      const newEndDate = new Date(baseDate);
      const newNextBillingDate = new Date(baseDate);

      switch (subscription.billingCycle) {
        case TeacherBillingCycle.MONTHLY:
          newEndDate.setMonth(newEndDate.getMonth() + 1);
          newNextBillingDate.setMonth(newNextBillingDate.getMonth() + 1);
          break;

        case TeacherBillingCycle.QUARTERLY:
          newEndDate.setMonth(newEndDate.getMonth() + 3);
          newNextBillingDate.setMonth(newNextBillingDate.getMonth() + 3);
          break;

        case TeacherBillingCycle.YEARLY:
          newEndDate.setFullYear(newEndDate.getFullYear() + 1);
          newNextBillingDate.setFullYear(newNextBillingDate.getFullYear() + 1);
          break;
      }

      /**
       * Update subscription
       */
      subscription.status = TeacherSubscriptionStatus.ACTIVE;
      subscription.endDate = newEndDate;
      subscription.nextBillingDate = newNextBillingDate;
      subscription.lastPaymentDate = now;
      subscription.lastPaymentAmount = amount;
      subscription.failedPaymentAttempts = 0;

      await subscription.save();

      /**
       * Mirror into Teacher
       */
      teacher.paymentSettings.subscriptionStatus =
        TeacherSubscriptionStatus.ACTIVE;
      teacher.paymentSettings.subscriptionPaidUntil = newEndDate;

      await teacher.save();

      return {
        success: true,
        paymentId: paymentIntent.id,
        amount,
        paidUntil: newEndDate,
      };
    } catch (error: any) {
      logger.error("Error processing teacher subscription payment:", error);

      // Increment failed attempts if subscription exists
      await TeacherSubscription.updateOne(
        { teacherId },
        { $inc: { failedPaymentAttempts: 1 } },
      );

      return {
        success: false,
        amount: 0,
        paidUntil: new Date(),
        error: error.message,
      };
    }
  }
  /**
   * Check the current subscription status for a teacher
   */
  async checkSubscriptionStatus(
    teacherId: Types.ObjectId,
  ): Promise<TeacherSubscriptionInfo> {
    try {
      const subscription = await TeacherSubscription.findOne({ teacherId });
      if (!subscription) {
        throw new Error("Subscription not found");
      }

      const now = new Date();
      const endDate = subscription.endDate;

      let isActive = false;
      let daysRemaining: number | undefined;
      let nextPaymentDue: Date | undefined;

      if (endDate) {
        const msRemaining = endDate.getTime() - now.getTime();
        daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));

        if (daysRemaining > 0) {
          isActive = true;
          nextPaymentDue = new Date(subscription.nextBillingDate);
        } else if (daysRemaining >= -this.GRACE_PERIOD_DAYS) {
          subscription.status = TeacherSubscriptionStatus.GRACE_PERIOD;
          await subscription.save();
        }
      }

      const amount =
        subscription.billingCycle === TeacherBillingCycle.MONTHLY
          ? subscription.currentPricing.monthlyPrice
          : subscription.billingCycle === TeacherBillingCycle.QUARTERLY
            ? subscription.currentPricing.quarterlyPrice
            : subscription.currentPricing.yearlyPrice;

      return {
        teacherId,
        plan: subscription.plan,
        billingCycle: subscription.billingCycle,
        status: subscription.status,
        amount,
        currency: subscription.currentPricing.currency,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        nextBillingDate: subscription.nextBillingDate,
        daysRemaining,
        isActive,
      };
    } catch (error: any) {
      logger.error("Error checking teacher subscription status:", error);
      throw new Error(`Failed to check subscription status: ${error.message}`);
    }
  }
  /**
   * Renew subscription manually
   */
  async renewSubscription(teacherId: Types.ObjectId): Promise<PaymentResult> {
    return this.processSubscriptionPayment(teacherId);
  }
  /**
   * Cancel teacher subscription
   */
  async cancelSubscription(
    teacherId: Types.ObjectId,
    reason?: string,
  ): Promise<void> {
    try {
      const subscription = await TeacherSubscription.findOne({ teacherId });
      if (!subscription) {
        throw new Error("Subscription not found");
      }

      subscription.status = TeacherSubscriptionStatus.CANCELLED;
      subscription.cancelledAt = new Date();

      if (reason) {
        subscription.adminNotes = `${
          subscription.adminNotes || ""
        }\nCancelled: ${reason}`;
      }

      await subscription.save();

      await Teacher.updateOne(
        { _id: teacherId },
        {
          "paymentSettings.subscriptionStatus":
            TeacherSubscriptionStatus.CANCELLED,
        },
      );
    } catch (error: any) {
      logger.error("Error cancelling teacher subscription:", error);
      throw new Error(`Failed to cancel subscription: ${error.message}`);
    }
  }
  /**
   * Suspend subscription due to non-payment
   */
  async suspendSubscription(
    teacherId: Types.ObjectId,
    reason: string,
  ): Promise<void> {
    try {
      const subscription = await TeacherSubscription.findOne({ teacherId });
      if (!subscription) {
        throw new Error("Subscription not found");
      }

      subscription.status = TeacherSubscriptionStatus.SUSPENDED;
      subscription.adminNotes = `${
        subscription.adminNotes || ""
      }\nSuspended: ${reason}`;

      await subscription.save();

      await Teacher.updateOne(
        { _id: teacherId },
        {
          isSuspended: true,
          "paymentSettings.subscriptionStatus":
            TeacherSubscriptionStatus.SUSPENDED,
        },
      );

      logger.info(
        `✓ Suspended subscription for teacher ${teacherId}. Reason: ${reason}`,
      );
    } catch (error: any) {
      logger.error("Error suspending teacher subscription:", error);
      throw new Error(`Failed to suspend subscription: ${error.message}`);
    }
  }
  /**
   * Reactivate suspended subscription after successful payment
   */
  async reactivateSubscription(teacherId: Types.ObjectId): Promise<void> {
    try {
      const paymentResult = await this.processSubscriptionPayment(teacherId);

      if (!paymentResult.success) {
        throw new Error("Payment failed. Cannot reactivate subscription.");
      }

      await Teacher.updateOne(
        { _id: teacherId },
        {
          isSuspended: false,
          isActive: true,
          "paymentSettings.subscriptionStatus":
            TeacherSubscriptionStatus.ACTIVE,
        },
      );

      logger.info(`✓ Reactivated subscription for teacher ${teacherId}`);
    } catch (error: any) {
      logger.error("Error reactivating teacher subscription:", error);
      throw new Error(`Failed to reactivate subscription: ${error.message}`);
    }
  }
  /**
   * Get subscription payment history
   * (Placeholder – real source should be invoices or Stripe)
   */
  async getSubscriptionHistory(
    teacherId: Types.ObjectId,
  ): Promise<SubscriptionPayment[]> {
    try {
      const subscription = await TeacherSubscription.findOne({ teacherId });
      if (!subscription) {
        throw new Error("Subscription not found");
      }

      if (!subscription.lastPaymentDate || !subscription.lastPaymentAmount) {
        return [];
      }

      return [
        {
          paymentDate: subscription.lastPaymentDate,
          amount: subscription.lastPaymentAmount,
          periodStart: subscription.startDate,
          periodEnd: subscription.endDate,
          status: "paid",
          transactionId: subscription.stripeSubscriptionId,
        },
      ];
    } catch (error: any) {
      logger.error("Error getting teacher subscription history:", error);
      throw new Error(`Failed to get subscription history: ${error.message}`);
    }
  }
  /**
   * Send payment reminder email to teacher
   */
  async sendPaymentReminder(
    teacherId: Types.ObjectId,
    daysUntilDue: number,
  ): Promise<void> {
    try {
      const teacher = await Teacher.findById(teacherId);
      if (!teacher) {
        throw new Error("Teacher not found");
      }

      const dueLabel = daysUntilDue > 0 ? `in ${daysUntilDue} days` : `${Math.abs(daysUntilDue)} days ago`;
      logger.info(`📧 Sending payment reminder to teacher ${teacherId} (${dueLabel})`);

      emailService.sendEmail({
        to: teacher.email,
        subject: "Subscription payment reminder",
        html: `<p>Hi ${teacher.fullName || "Teacher"},</p>
<p>Your subscription payment is due ${dueLabel}. Please renew to keep your account active.</p>
<p><a href="${process.env.FRONTEND_URL}/teacher/subscription">Renew subscription</a></p>`,
      }).catch((err: Error) => logger.error("Teacher subscription reminder email failed:", err));
    } catch (error: any) {
      logger.error("Error sending payment reminder:", error);
      throw new Error(`Failed to send payment reminder: ${error.message}`);
    }
  }
  /**
   * Process expired subscriptions (cron job)
   */
  async processExpiredSubscriptions(): Promise<void> {
    try {
      const now = new Date();

      const subscriptions = await TeacherSubscription.find({
        status: {
          $in: [
            TeacherSubscriptionStatus.ACTIVE,
            TeacherSubscriptionStatus.GRACE_PERIOD,
          ],
        },
      });

      for (const subscription of subscriptions) {
        if (!subscription.endDate) continue;

        if (subscription.endDate < now) {
          const daysExpired = Math.floor(
            (now.getTime() - subscription.endDate.getTime()) /
              (1000 * 60 * 60 * 24),
          );

          if (daysExpired <= this.GRACE_PERIOD_DAYS) {
            if (
              subscription.status !== TeacherSubscriptionStatus.GRACE_PERIOD
            ) {
              subscription.status = TeacherSubscriptionStatus.GRACE_PERIOD;
              await subscription.save();

              await Teacher.updateOne(
                { _id: subscription.teacherId },
                {
                  "paymentSettings.subscriptionStatus":
                    TeacherSubscriptionStatus.GRACE_PERIOD,
                },
              );

              await this.sendPaymentReminder(
                subscription.teacherId,
                -daysExpired,
              );
            }
          } else {
            subscription.status = TeacherSubscriptionStatus.EXPIRED;
            await subscription.save();

            await Teacher.updateOne(
              { _id: subscription.teacherId },
              {
                isActive: false,
                isSuspended: true,
                "paymentSettings.subscriptionStatus":
                  TeacherSubscriptionStatus.EXPIRED,
              },
            );

            logger.info(
              `⚠️ Teacher ${subscription.teacherId} subscription expired and suspended`,
            );
          }
        }
      }

      logger.info("✓ Processed expired teacher subscriptions");
    } catch (error: any) {
      logger.error("Error processing expired teacher subscriptions:", error);
      throw new Error(
        `Failed to process expired subscriptions: ${error.message}`,
      );
    }
  }

  /**
   * Calculate subscription cost for upcoming months
   */
  async calculateSubscriptionCost(
    teacherId: Types.ObjectId,
    months: number,
  ): Promise<number> {
    const subscription = await TeacherSubscription.findOne({ teacherId });
    if (!subscription) {
      throw new Error("Subscription not found");
    }

    const monthlyRate =
      subscription.billingCycle === TeacherBillingCycle.MONTHLY
        ? subscription.currentPricing.monthlyPrice
        : subscription.billingCycle === TeacherBillingCycle.QUARTERLY
          ? subscription.currentPricing.quarterlyPrice / 3
          : subscription.currentPricing.yearlyPrice / 12;

    return monthlyRate * months;
  }
}
export const teacherSubscriptionService = new TeacherSubscriptionService();

export default teacherSubscriptionService;
