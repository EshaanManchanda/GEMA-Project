import { stripe, convertToStripeAmount } from "../config/stripe";
import { Order } from "../models/index";
import Teacher, { TeacherPaymentMode } from "../models/Teacher";
import Stripe from "stripe";
import logger from "../config/logger";

export interface CreateTeacherPaymentIntentParams {
  amount: number;
  currency: string;
  orderId: string;
  teacherId?: string;
  customerId?: string;
  metadata?: Record<string, string>;
  displayCurrency?: string;
  displayAmount?: number;
}

export interface TeacherPaymentRoutingInfo {
  usesTeacherStripe: boolean;
  stripeInstance: Stripe;
  teacherStripeAccountId?: string;
  platformCommission: number;
  serviceFee: number;
  teacherPayout: number;
}

export interface TeacherPaymentIntentResult {
  clientSecret: string;
  paymentIntentId: string;
}

export class TeacherPaymentService {
  /**
   * Determine payment routing based on teacher settings
   */
  static async getPaymentRouting(
    teacherId: string,
    amount: number,
  ): Promise<TeacherPaymentRoutingInfo> {
    try {
      const teacher = await Teacher.findById(teacherId).select(
        "+paymentSettings.stripeSettings.stripeSecretKey",
      );

      if (!teacher) {
        throw new Error("Teacher not found");
      }

      const paymentSettings = teacher.paymentSettings;
      const stripeSettings = paymentSettings.stripeSettings;

      const usesCustomStripe =
        paymentSettings.paymentMode === TeacherPaymentMode.CUSTOM_STRIPE;
      const hasSubscription = teacher.isSubscriptionActive();

      const hasStripeConnect =
        stripeSettings.stripeConnectOnboardingComplete &&
        stripeSettings.stripeConnectAccountId;

      const teacherSecretKey = stripeSettings.stripeSecretKey;

      if (
        usesCustomStripe &&
        hasSubscription &&
        (hasStripeConnect || teacherSecretKey)
      ) {
        const teacherStripe = teacherSecretKey
          ? new Stripe(teacherSecretKey, { apiVersion: "2025-08-27.basil" })
          : stripe;

        return {
          usesTeacherStripe: true,
          stripeInstance: teacherStripe,
          teacherStripeAccountId: stripeSettings.stripeConnectAccountId,
          platformCommission: 0,
          serviceFee: 0,
          teacherPayout: amount,
        };
      }

      const commissionRate = teacher.getEffectiveCommissionRate();
      // Work in fils (smallest AED unit) for precise integer math
      const amountInFils = Math.round(amount * 100);
      const serviceFeeInFils = Math.round(
        (amountInFils * commissionRate) / 100,
      );
      const serviceFee = serviceFeeInFils / 100;
      const teacherPayout = amount - serviceFee;

      return {
        usesTeacherStripe: false,
        stripeInstance: stripe,
        platformCommission: serviceFee,
        serviceFee,
        teacherPayout,
      };
    } catch (error) {
      logger.error("Error determining teacher payment routing:", error);

      const serviceFee = Math.round((Math.round(amount * 100) * 5) / 100) / 100;
      return {
        usesTeacherStripe: false,
        stripeInstance: stripe,
        platformCommission: serviceFee,
        serviceFee,
        teacherPayout: amount - serviceFee,
      };
    }
  }

  /**
   * Create payment intent for teaching event order
   */
  static async createPaymentIntent({
    amount,
    currency,
    orderId,
    teacherId,
    customerId,
    metadata = {},
    displayCurrency,
    displayAmount,
  }: CreateTeacherPaymentIntentParams): Promise<TeacherPaymentIntentResult> {
    try {
      // All payments are processed in AED
      const finalAmount = amount;
      const finalCurrency = "aed";

      const stripeAmount = convertToStripeAmount(finalAmount, finalCurrency);

      let routingInfo: TeacherPaymentRoutingInfo | null = null;
      if (teacherId) {
        routingInfo = await this.getPaymentRouting(teacherId, finalAmount);
      }

      const stripeInstance = routingInfo?.stripeInstance || stripe;

      const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
        amount: stripeAmount,
        currency: finalCurrency,
        automatic_payment_methods: { enabled: true },
        metadata: {
          orderId,
          teacherId: teacherId || "platform",
          usesTeacherStripe: String(routingInfo?.usesTeacherStripe || false),
          serviceFee: String(routingInfo?.serviceFee || 0),
          currency: "AED",
          chargedAmount: String(finalAmount),
          ...metadata,
        },
      };

      if (customerId) {
        paymentIntentParams.customer = customerId;
      }

      // Idempotency key: orderId ensures no duplicate intents per order
      const idempotencyKey = `tpi_${orderId}_${Date.now()}`;
      const paymentIntent = await stripeInstance.paymentIntents.create(
        paymentIntentParams,
        { idempotencyKey },
      );

      return {
        clientSecret: paymentIntent.client_secret!,
        paymentIntentId: paymentIntent.id,
      };
    } catch (error) {
      logger.error("Error creating teacher payment intent:", error);
      throw new Error("Failed to create payment intent");
    }
  }

  /**
   * Retrieve payment intent
   */
  static async getPaymentIntent(
    paymentIntentId: string,
  ): Promise<Stripe.PaymentIntent> {
    try {
      return await stripe.paymentIntents.retrieve(paymentIntentId);
    } catch (error) {
      logger.error("Error retrieving payment intent:", error);
      throw new Error("Failed to retrieve payment intent");
    }
  }

  /**
   * Confirm payment intent
   */
  static async confirmPaymentIntent(
    paymentIntentId: string,
    paymentMethodId?: string,
  ): Promise<Stripe.PaymentIntent> {
    try {
      const params: Stripe.PaymentIntentConfirmParams = {};
      if (paymentMethodId) {
        params.payment_method = paymentMethodId;
      }

      return await stripe.paymentIntents.confirm(paymentIntentId, params);
    } catch (error) {
      logger.error("Error confirming payment intent:", error);
      throw new Error("Failed to confirm payment intent");
    }
  }

  /**
   * Cancel payment intent
   */
  static async cancelPaymentIntent(
    paymentIntentId: string,
  ): Promise<Stripe.PaymentIntent> {
    try {
      return await stripe.paymentIntents.cancel(paymentIntentId);
    } catch (error) {
      logger.error("Error cancelling payment intent:", error);
      throw new Error("Failed to cancel payment intent");
    }
  }

  /**
   * Create refund
   */
  static async createRefund(
    paymentIntentId: string,
    amount?: number,
    reason?: string,
  ): Promise<Stripe.Refund> {
    try {
      const refundParams: Stripe.RefundCreateParams = {
        payment_intent: paymentIntentId,
      };

      if (amount) refundParams.amount = amount;
      if (reason) refundParams.reason = reason as any;

      return await stripe.refunds.create(refundParams);
    } catch (error) {
      logger.error("Error creating refund:", error);
      throw new Error("Failed to create refund");
    }
  }

  /**
   * Create or get Stripe customer
   */
  static async createOrGetCustomer(
    email: string,
    name?: string,
    userId?: string,
  ): Promise<Stripe.Customer> {
    try {
      const existing = await stripe.customers.list({ email, limit: 1 });
      if (existing.data.length > 0) return existing.data[0];

      return await stripe.customers.create({
        email,
        name,
        metadata: userId ? { userId } : undefined,
      });
    } catch (error) {
      logger.error("Error creating/getting customer:", error);
      throw new Error("Failed to create or retrieve customer");
    }
  }

  /**
   * Process Stripe webhook
   */
  static async processWebhookEvent(
    payload: string | Buffer,
    signature: string,
  ): Promise<void> {
    try {
      const event = stripe.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!,
      );

      switch (event.type) {
        case "payment_intent.succeeded":
          await this.handlePaymentSucceeded(
            event.data.object as Stripe.PaymentIntent,
          );
          break;
        case "payment_intent.payment_failed":
          await this.handlePaymentFailed(
            event.data.object as Stripe.PaymentIntent,
          );
          break;
        case "payment_intent.canceled":
          await this.handlePaymentCanceled(
            event.data.object as Stripe.PaymentIntent,
          );
          break;
        case "charge.dispute.created":
          await this.handleChargeDispute(event.data.object as Stripe.Dispute);
          break;
      }
    } catch (error) {
      logger.error("Teacher webhook error:", error);
      throw new Error("Failed to process webhook");
    }
  }

  private static async handlePaymentSucceeded(
    paymentIntent: Stripe.PaymentIntent,
  ): Promise<void> {
    try {
      const orderId = paymentIntent.metadata.orderId;
      if (!orderId) return;

      const order = await Order.findById(orderId);
      if (!order) return;

      await order.markAsPaid(paymentIntent.id, "stripe");
      await order.confirm();

      logger.info(`Teaching order ${orderId} confirmed`);
    } catch (error) {
      logger.error("Error handling payment success:", error);
    }
  }

  private static async handlePaymentFailed(
    paymentIntent: Stripe.PaymentIntent,
  ): Promise<void> {
    logger.info(`Teacher payment failed: ${paymentIntent.id}`);
  }

  private static async handlePaymentCanceled(
    paymentIntent: Stripe.PaymentIntent,
  ): Promise<void> {
    logger.info(`Teacher payment canceled: ${paymentIntent.id}`);
  }

  private static async handleChargeDispute(
    dispute: Stripe.Dispute,
  ): Promise<void> {
    logger.warn(`Teacher charge dispute: ${dispute.id}`);
  }

  /**
   * Get customer payment methods
   */
  static async getCustomerPaymentMethods(
    customerId: string,
  ): Promise<Stripe.PaymentMethod[]> {
    const methods = await stripe.paymentMethods.list({
      customer: customerId,
      type: "card",
    });
    return methods.data;
  }

  /**
   * Detach payment method
   */
  static async detachPaymentMethod(
    paymentMethodId: string,
  ): Promise<Stripe.PaymentMethod> {
    return await stripe.paymentMethods.detach(paymentMethodId);
  }

  /**
   * Platform fee calculator
   */
  static calculatePlatformFee(amount: number): number {
    return Math.round(amount * 0.03);
  }

  /**
   * Get connected account balance
   */
  static async getConnectedAccountBalance(
    accountId: string,
  ): Promise<Stripe.Balance> {
    return await stripe.balance.retrieve({ stripeAccount: accountId });
  }
}
