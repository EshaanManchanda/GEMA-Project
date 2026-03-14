import { stripe, convertToStripeAmount } from "../config/stripe";
import { Order } from "../models/index";
import Vendor, { PaymentMode } from "../models/Vendor";
import Teacher from "../models/Teacher";
import User from "../models/User";
import Ticket from "../models/Ticket";
import Stripe from "stripe";
import logger from "../config/logger";
import redisClient from "../config/redis";
import { emailService } from "./email.service";

export interface CreatePaymentIntentParams {
  amount: number;
  currency: string;
  orderId: string;
  vendorId?: string;
  customerId?: string;
  metadata?: Record<string, string>;
  // Multi-currency support
  displayCurrency?: string;
  displayAmount?: number;
}

export interface PaymentRoutingInfo {
  usesVendorStripe: boolean;
  stripeInstance: Stripe;
  vendorStripeAccountId?: string;
  platformCommission: number;
  serviceFee: number;
  vendorPayout: number;
}

export interface PaymentIntentResult {
  clientSecret: string;
  paymentIntentId: string;
}

/**
 * Retry a Stripe API call with exponential backoff on rate limit errors
 */
async function withStripeRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const isRateLimit = err?.type === "StripeRateLimitError";
      if (isRateLimit && attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500;
        await new Promise((r) => setTimeout(r, delay));
      } else {
        throw err;
      }
    }
  }
  throw new Error("Stripe retries exhausted");
}

interface RoutingCache {
  usesVendorStripe: boolean;
  vendorStripeAccountId?: string;
  commissionRate: number;
}

export class PaymentService {
  /**
   * Determine payment routing based on vendor/teacher settings
   * @param vendorOrTeacherId - The Vendor._id or Teacher._id (NOT User._id)
   */
  static async getPaymentRouting(
    vendorOrTeacherId: string,
    amount: number,
  ): Promise<PaymentRoutingInfo> {
    const CACHE_KEY = `payment-routing:${vendorOrTeacherId}`;
    const CACHE_TTL = 300; // 5 minutes

    // Cache-aside: skip vendors with custom secret keys (not serializable safely)
    if (redisClient) {
      try {
        const cached = await redisClient.get(CACHE_KEY);
        if (cached) {
          const c = JSON.parse(cached) as RoutingCache;
          const amountInFils = Math.round(amount * 100);
          const serviceFeeInFils = Math.round(
            (amountInFils * c.commissionRate) / 100,
          );
          const serviceFee = serviceFeeInFils / 100;
          return {
            usesVendorStripe: c.usesVendorStripe,
            stripeInstance: stripe,
            vendorStripeAccountId: c.vendorStripeAccountId,
            platformCommission: c.usesVendorStripe ? 0 : serviceFee,
            serviceFee: c.usesVendorStripe ? 0 : serviceFee,
            vendorPayout: c.usesVendorStripe ? amount : amount - serviceFee,
          };
        }
      } catch {
        // Cache error - fall through to DB lookup
      }
    }

    try {
      // Try to fetch vendor first
      let vendor = await Vendor.findById(vendorOrTeacherId).select(
        "+paymentSettings.stripeSettings.stripeSecretKey",
      );

      // If not found as vendor, try as teacher
      if (!vendor) {
        const teacher = await Teacher.findById(vendorOrTeacherId).select(
          "+paymentSettings.stripeSettings.stripeSecretKey",
        );

        if (teacher) {
          // Cast teacher to vendor type for compatibility (they have same payment structure)
          vendor = teacher as any;
        }
      }

      if (!vendor) {
        throw new Error("Vendor or Teacher not found");
      }

      const paymentSettings = vendor.paymentSettings;
      const stripeSettings = paymentSettings.stripeSettings;

      // Check if vendor/teacher uses custom Stripe (with active subscription)
      const usesCustomStripe =
        paymentSettings.paymentMode === PaymentMode.CUSTOM_STRIPE;
      const hasSubscription = vendor.isSubscriptionActive();

      // Check if vendor/teacher has Stripe Connect or manual keys
      const hasStripeConnect =
        stripeSettings.stripeConnectOnboardingComplete &&
        stripeSettings.stripeConnectAccountId;
      const vendorSecretKey = stripeSettings.stripeSecretKey;

      if (
        usesCustomStripe &&
        hasSubscription &&
        (hasStripeConnect || vendorSecretKey)
      ) {
        // Use vendor's/teacher's Stripe account - no commission (they pay subscription instead)
        const vendorStripe = vendorSecretKey
          ? new Stripe(vendorSecretKey, { apiVersion: "2025-08-27.basil" })
          : stripe; // Use platform Stripe for Stripe Connect

        const result: PaymentRoutingInfo = {
          usesVendorStripe: true,
          stripeInstance: vendorStripe,
          vendorStripeAccountId: stripeSettings.stripeConnectAccountId,
          platformCommission: 0,
          serviceFee: 0,
          vendorPayout: amount,
        };

        // Only cache Stripe Connect vendors (not custom secret key vendors)
        if (redisClient && !vendorSecretKey) {
          const cacheData: RoutingCache = {
            usesVendorStripe: true,
            vendorStripeAccountId: stripeSettings.stripeConnectAccountId,
            commissionRate: 0,
          };
          redisClient
            .set(CACHE_KEY, JSON.stringify(cacheData), "EX", CACHE_TTL)
            .catch(() => {});
        }

        return result;
      } else {
        // Use platform Stripe with commission
        const commissionRate = vendor.getEffectiveCommissionRate();
        // Work in fils (smallest AED unit) for precise integer math
        const amountInFils = Math.round(amount * 100);
        const serviceFeeInFils = Math.round(
          (amountInFils * commissionRate) / 100,
        );
        const serviceFee = serviceFeeInFils / 100;
        const vendorPayout = amount - serviceFee;

        const result: PaymentRoutingInfo = {
          usesVendorStripe: false,
          stripeInstance: stripe,
          platformCommission: serviceFee,
          serviceFee,
          vendorPayout,
        };

        // Cache platform Stripe routing
        if (redisClient) {
          const cacheData: RoutingCache = {
            usesVendorStripe: false,
            commissionRate,
          };
          redisClient
            .set(CACHE_KEY, JSON.stringify(cacheData), "EX", CACHE_TTL)
            .catch(() => {});
        }

        return result;
      }
    } catch (error) {
      logger.error("Error determining payment routing:", error);
      // Fallback to platform Stripe with default 5% commission
      const serviceFeeInFils = Math.round((amount * 100 * 5) / 100);
      const serviceFee = serviceFeeInFils / 100;
      return {
        usesVendorStripe: false,
        stripeInstance: stripe,
        platformCommission: serviceFee,
        serviceFee,
        vendorPayout: amount - serviceFee,
      };
    }
  }

  /**
   * Create a Stripe payment intent for an order with routing support
   */
  static async createPaymentIntent({
    amount,
    currency,
    orderId,
    vendorId,
    customerId,
    metadata = {},
    displayCurrency,
    displayAmount,
  }: CreatePaymentIntentParams): Promise<PaymentIntentResult> {
    try {
      // All payments are processed in AED
      const finalAmount = amount;
      const finalCurrency = "aed";

      const stripeAmount = convertToStripeAmount(finalAmount, finalCurrency);

      // Determine payment routing if vendor is provided
      let routingInfo: PaymentRoutingInfo | null = null;
      if (vendorId) {
        routingInfo = await this.getPaymentRouting(vendorId, finalAmount);
        logger.info("Payment routing determined:", {
          vendorId,
          usesVendorStripe: routingInfo.usesVendorStripe,
          hasVendorAccount: !!routingInfo.vendorStripeAccountId,
          serviceFee: routingInfo.serviceFee,
        });
      }

      const stripeInstance = routingInfo?.stripeInstance || stripe;
      logger.info("Creating PaymentIntent with:", {
        usesVendorStripe: routingInfo?.usesVendorStripe || false,
        amount: stripeAmount,
        currency: finalCurrency,
        displayCurrency: displayCurrency || finalCurrency,
        displayAmount: displayAmount || finalAmount,
      });

      const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
        amount: stripeAmount,
        currency: finalCurrency,
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          orderId,
          vendorId: vendorId || "platform",
          usesVendorStripe: String(routingInfo?.usesVendorStripe || false),
          serviceFee: String(routingInfo?.serviceFee || 0),
          currency: "AED",
          chargedAmount: String(finalAmount),
          ...metadata,
        },
      };

      // Add customer if provided
      if (customerId) {
        paymentIntentParams.customer = customerId;
      }

      // For platform payments with application fee (future Stripe Connect integration)
      if (
        !routingInfo?.usesVendorStripe &&
        routingInfo?.platformCommission > 0
      ) {
        // This would be used with Stripe Connect in the future
        // paymentIntentParams.application_fee_amount = convertToStripeAmount(routingInfo.platformCommission, currency);
      }

      // Idempotency key: orderId ensures no duplicate intents per order
      const idempotencyKey = `pi_${orderId}_${Date.now()}`;
      const paymentIntent = await withStripeRetry(() =>
        stripeInstance.paymentIntents.create(paymentIntentParams, {
          idempotencyKey,
        }),
      );

      return {
        clientSecret: paymentIntent.client_secret!,
        paymentIntentId: paymentIntent.id,
      };
    } catch (error) {
      logger.error("Error creating payment intent:", error);
      throw new Error("Failed to create payment intent");
    }
  }

  /**
   * Retrieve a payment intent by ID
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
   * Confirm a payment intent
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
   * Cancel a payment intent
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
   * Create a refund for a payment intent
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

      if (amount) {
        refundParams.amount = amount;
      }

      if (reason) {
        refundParams.reason = reason as Stripe.RefundCreateParams.Reason;
      }

      return await stripe.refunds.create(refundParams);
    } catch (error) {
      logger.error("Error creating refund:", error);
      throw new Error("Failed to create refund");
    }
  }

  /**
   * Create or retrieve a Stripe customer
   */
  static async createOrGetCustomer(
    email: string,
    name?: string,
    userId?: string,
  ): Promise<Stripe.Customer> {
    try {
      // First, try to find existing customer by email
      const existingCustomers = await stripe.customers.list({
        email,
        limit: 1,
      });

      if (existingCustomers.data.length > 0) {
        return existingCustomers.data[0];
      }

      // Create new customer
      const customerParams: Stripe.CustomerCreateParams = {
        email,
      };

      if (name) {
        customerParams.name = name;
      }

      if (userId) {
        customerParams.metadata = { userId };
      }

      return await stripe.customers.create(customerParams);
    } catch (error) {
      logger.error("Error creating/getting customer:", error);
      throw new Error("Failed to create or retrieve customer");
    }
  }

  /**
   * Process webhook event from Stripe
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

      logger.info(`Received Stripe webhook: ${event.type}`);

      // Deduplicate webhook events using Redis
      if (redisClient) {
        const dedupKey = `webhook:${event.id}`;
        const alreadyProcessed = await redisClient.get(dedupKey);
        if (alreadyProcessed) {
          logger.info(`Skipping duplicate webhook event: ${event.id}`);
          return;
        }
        // Mark as processed with 24h TTL
        await redisClient.set(dedupKey, "1", "EX", 86400);
      }

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

        case "charge.failed":
          await this.handleChargeFailed(event.data.object as Stripe.Charge);
          break;

        case "charge.dispute.created":
        case "charge.dispute.updated":
          await this.handleChargeDispute(event.data.object as Stripe.Dispute);
          break;

        default:
          logger.info(`Unhandled webhook event type: ${event.type}`);
      }
    } catch (error) {
      logger.error("Error processing webhook:", error);
      throw new Error("Failed to process webhook event");
    }
  }

  /**
   * Handle successful payment
   */
  private static async handlePaymentSucceeded(
    paymentIntent: Stripe.PaymentIntent,
  ): Promise<void> {
    try {
      const orderId = paymentIntent.metadata.orderId;
      if (!orderId) {
        logger.error("No orderId found in payment intent metadata");
        return;
      }

      const order = await Order.findById(orderId);
      if (!order) {
        logger.error(`Order not found: ${orderId}`);
        return;
      }

      // Update order status and generate tickets
      await order.markAsPaid(paymentIntent.id, "stripe");
      await order.confirm(); // This will automatically generate tickets

      logger.info(
        `Order ${orderId} marked as paid, confirmed, and tickets generated`,
      );

      // Send confirmation + ticket emails (fire-and-forget)
      (async () => {
        try {
          const user = await User.findById(order.userId)
            .select("email firstName")
            .lean();
          if (!user) return;
          const u = user as any;

          // Populate event details for email
          await order.populate(
            "items.eventId",
            "title venueType meetingLink meetingPassword type",
          );

          // 1. Order confirmation email
          await emailService.sendOrderConfirmationEmail({
            to: u.email,
            firstName: u.firstName,
            orderNumber: order.orderNumber,
            orderTotal: order.total,
            currency: order.currency,
            items: order.items.map((item: any) => ({
              eventTitle: item.eventTitle,
              quantity: item.quantity,
              price: item.totalPrice,
              date: item.scheduleDate,
              venueType: item.eventId?.venueType,
              eventType: item.eventId?.type,
              meetingLink: item.eventId?.meetingLink,
              meetingPassword: item.eventId?.meetingPassword,
            })),
          });

          // 2. Tickets email with QR codes
          const tickets = await Ticket.find({ orderId: order._id })
            .populate(
              "eventId",
              "title venueType meetingLink meetingPassword type location",
            )
            .lean();

          if (tickets.length > 0) {
            await emailService.sendTicketsEmail({
              to: u.email,
              firstName: u.firstName,
              tickets: tickets.map((t: any) => ({
                eventTitle: t.eventId?.title || "",
                qrCode: t.qrCodeImage || t.qrCode || "",
                ticketNumber: t.ticketNumber,
                eventDate: t.eventDate,
                venue:
                  t.eventId?.location?.address ||
                  t.eventId?.location?.city ||
                  "",
                venueType: t.eventId?.venueType,
                eventType: t.eventId?.type,
                meetingLink: t.eventId?.meetingLink,
                meetingPassword: t.eventId?.meetingPassword,
              })),
            });
          }

          logger.info(
            `Confirmation and ticket emails sent for order ${orderId}`,
          );
        } catch (emailError) {
          logger.error("Failed to send post-payment emails:", emailError);
        }
      })();
    } catch (error) {
      logger.error("Error handling payment succeeded:", error);
    }
  }

  /**
   * Handle failed payment
   */
  private static async handlePaymentFailed(
    paymentIntent: Stripe.PaymentIntent,
  ): Promise<void> {
    try {
      const orderId = paymentIntent.metadata.orderId;
      if (!orderId) {
        logger.error("No orderId found in payment intent metadata");
        return;
      }

      const order = await Order.findById(orderId);
      if (!order) {
        logger.error(`Order not found: ${orderId}`);
        return;
      }

      // Keep order as pending, but log the failure
      logger.info(`Payment failed for order ${orderId}`);

      // TODO: Send payment failure notification
      // TODO: Log payment attempt
    } catch (error) {
      logger.error("Error handling payment failed:", error);
    }
  }

  /**
   * Handle canceled payment
   */
  private static async handlePaymentCanceled(
    paymentIntent: Stripe.PaymentIntent,
  ): Promise<void> {
    try {
      const orderId = paymentIntent.metadata.orderId;
      if (!orderId) {
        logger.error("No orderId found in payment intent metadata");
        return;
      }

      logger.info(`Payment canceled for order ${orderId}`);
    } catch (error) {
      logger.error("Error handling payment canceled:", error);
    }
  }

  /**
   * Handle charge.failed (distinct from payment_intent.payment_failed)
   */
  private static async handleChargeFailed(
    charge: Stripe.Charge,
  ): Promise<void> {
    try {
      const orderId = charge.metadata?.orderId;
      logger.warn("Charge failed", {
        chargeId: charge.id,
        orderId,
        failureCode: charge.failure_code,
        failureMessage: charge.failure_message,
      });
      // Order stays pending — customer can retry
    } catch (error) {
      logger.error("Error handling charge.failed:", error);
    }
  }

  /**
   * Handle charge dispute
   */
  private static async handleChargeDispute(
    dispute: Stripe.Dispute,
  ): Promise<void> {
    try {
      logger.info(`Charge dispute created: ${dispute.id}`);

      // TODO: Send admin notification about dispute
      // TODO: Log dispute for manual review
    } catch (error) {
      logger.error("Error handling charge dispute:", error);
    }
  }

  /**
   * Get payment methods for a customer
   */
  static async getCustomerPaymentMethods(
    customerId: string,
  ): Promise<Stripe.PaymentMethod[]> {
    try {
      const paymentMethods = await stripe.paymentMethods.list({
        customer: customerId,
        type: "card",
      });

      return paymentMethods.data;
    } catch (error) {
      logger.error("Error getting customer payment methods:", error);
      throw new Error("Failed to retrieve payment methods");
    }
  }

  /**
   * Detach a payment method from a customer
   */
  static async detachPaymentMethod(
    paymentMethodId: string,
  ): Promise<Stripe.PaymentMethod> {
    try {
      return await stripe.paymentMethods.detach(paymentMethodId);
    } catch (error) {
      logger.error("Error detaching payment method:", error);
      throw new Error("Failed to detach payment method");
    }
  }

  /**
   * Calculate platform fee (if using Stripe Connect)
   */
  static calculatePlatformFee(amount: number): number {
    // Example: 3% platform fee
    const feePercentage = 0.03;
    return Math.round(amount * feePercentage);
  }

  /**
   * Get balance for connected account (if using Stripe Connect)
   */
  static async getConnectedAccountBalance(
    accountId: string,
  ): Promise<Stripe.Balance> {
    try {
      return await stripe.balance.retrieve({
        stripeAccount: accountId,
      });
    } catch (error) {
      logger.error("Error getting connected account balance:", error);
      throw new Error("Failed to retrieve account balance");
    }
  }
}
