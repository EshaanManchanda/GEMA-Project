import { stripe, convertToStripeAmount } from "../config/stripe";
import { config } from "../config";
import { Order } from "../models/index";
import Vendor, { PaymentMode, VendorSubscriptionStatus } from "../models/Vendor";
import Event from "../models/Event";
import { findVendorByStripe } from "./subscription.service";
import Teacher from "../models/Teacher";
import User from "../models/User";
import Ticket from "../models/Ticket";
import Notification, { NotificationType, NotificationPriority, NotificationChannel } from "../models/Notification";
import Stripe from "stripe";
import logger from "../config/logger";
import redisClient from "../config/redis";
import { emailService } from "./email.service";
import Affiliate from "../models/Affiliate";
import Partnership from "../models/Partnership";
import CommissionService from "./commission.service";

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

        case "charge.refunded":
          await this.handleChargeRefunded(event.data.object as Stripe.Charge);
          break;

        case "account.updated":
          await this.handleConnectAccountUpdated(
            event.data.object as Stripe.Account,
          );
          break;

        case "customer.subscription.updated":
          await this.handleSubscriptionUpdated(
            event.data.object as Stripe.Subscription,
          );
          break;

        case "customer.subscription.deleted":
          await this.handleSubscriptionDeleted(
            event.data.object as Stripe.Subscription,
          );
          break;

        case "invoice.paid":
        case "invoice.payment_succeeded":
          await this.handleInvoicePaid(event.data.object as Stripe.Invoice);
          break;

        case "invoice.payment_failed":
          await this.handleInvoicePaymentFailed(
            event.data.object as Stripe.Invoice,
          );
          break;

        case "checkout.session.completed":
          await this.handleCheckoutSessionCompleted(
            event.data.object as Stripe.Checkout.Session,
          );
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
   * Handle successful checkout session.
   * Routes to the appropriate sub-handler based on mode + metadata.type.
   */
  private static async handleCheckoutSessionCompleted(
    session: Stripe.Checkout.Session,
  ): Promise<void> {
    try {
      // ── Vendor subscription checkout ─────────────────────────────────────
      if (
        session.mode === "subscription" &&
        session.metadata?.type === "vendor_subscription"
      ) {
        await this.activateVendorSubscriptionFromSession(session);
        return;
      }

      // ── Partnership one-time payment ─────────────────────────────────────
      const partnershipId = session.client_reference_id;
      if (partnershipId) {
        const partnership = await Partnership.findById(partnershipId);
        if (partnership) {
          partnership.paymentStatus = "paid";
          await partnership.save();
          logger.info(`Partnership ${partnershipId} marked as paid`);
          return;
        }
      }

      logger.info(`Checkout session completed (no specific handler): ${session.id}`);
    } catch (error) {
      logger.error("Error handling checkout session completed:", error);
    }
  }

  /**
   * Activate a vendor's platform subscription after Checkout completes.
   */
  private static async activateVendorSubscriptionFromSession(
    session: Stripe.Checkout.Session,
  ): Promise<void> {
    const vendorId = session.metadata?.vendorId;
    if (!vendorId) {
      logger.warn("vendor_subscription checkout: no vendorId in session metadata", {
        sessionId: session.id,
      });
      return;
    }

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      logger.error(`vendor_subscription checkout: vendor ${vendorId} not found`);
      return;
    }

    // Store Stripe ids
    const subscriptionId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id;
    const customerId =
      typeof session.customer === "string"
        ? session.customer
        : session.customer?.id;

    if (subscriptionId) {
      vendor.paymentSettings.stripeSettings.stripeSubscriptionId = subscriptionId;
    }
    if (customerId) {
      vendor.paymentSettings.stripeSettings.stripeCustomerId = customerId;
    }

    vendor.paymentSettings.subscriptionStatus = VendorSubscriptionStatus.ACTIVE;
    vendor.paymentSettings.subscriptionStartDate =
      vendor.paymentSettings.subscriptionStartDate || new Date();
    vendor.paymentSettings.subscriptionCancelAtPeriodEnd = false;
    vendor.paymentSettings.stripeSettings.stripeSubscriptionStatus = "active";

    await vendor.save();

    // Send activation email (fire-and-forget)
    emailService
      .sendEmail({
        to: vendor.email,
        subject: "Your Kidrove Vendor Subscription is Active!",
        html: `<p>Hi ${vendor.businessName},</p>
<p>Your subscription is now active. You can use your own Stripe account and keep 100% of your earnings (no platform commission).</p>
<p>Manage your subscription anytime from your <a href="${config.frontendUrl}/vendor/payouts">payouts dashboard</a>.</p>`,
      })
      .catch((err: Error) =>
        logger.error("Vendor subscription activation email failed:", err),
      );

    logger.info(
      `Vendor ${vendorId} subscription activated via checkout. Stripe sub: ${subscriptionId}`,
    );
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

      // Calculate commission + create RevenueTransaction immediately on payment
      // confirmation, rather than waiting for the hourly backfill cron. Non-fatal:
      // the cron (commission.service.processUncommissionedOrders) is the safety
      // net if this fails — payment is already captured, so we must not throw here.
      try {
        await CommissionService.calculateCommissionForOrder(order._id);
      } catch (commissionError) {
        logger.error(
          `Failed to calculate commission for order ${orderId} from webhook (will retry via hourly backfill):`,
          commissionError,
        );
      }

      // Attribute affiliate conversion if order has affiliate code
      if (order.affiliateCode) {
        try {
          const affiliate = await Affiliate.findOne({
            code: order.affiliateCode,
          });
          if (affiliate) {
            await affiliate.recordConversion(
              order._id,
              order.total,
            );
            logger.info(
              `Affiliate conversion recorded for code ${order.affiliateCode}`,
            );
          }
        } catch (affiliateError) {
          logger.error("Failed to record affiliate conversion:", affiliateError);
        }
      }

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

      // P1.3: Send payment failure in-app notification
      if (order.userId) {
        await Notification.create({
          userId: order.userId,
          type: NotificationType.PAYMENT_FAILED,
          priority: NotificationPriority.HIGH,
          channels: [NotificationChannel.IN_APP],
          title: "Payment Failed",
          message: `Your payment of ${order.currency} ${order.total} for order #${order.orderNumber} could not be processed. Please try again.`,
          data: {
            orderId: order._id,
            orderNumber: order.orderNumber,
            amount: order.total,
            currency: order.currency,
            failureCode: paymentIntent.last_payment_error?.code,
            failureMessage: paymentIntent.last_payment_error?.message,
          },
          scheduledFor: new Date(),
        }).catch((err: Error) => logger.error("Failed to create payment failure notification:", err));
      }
      logger.info(`Payment attempt logged for order ${orderId}, status: failed`);
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

      // P1.3: Notify all admins about the dispute
      const admins = await User.find({ role: "admin" }).select("_id").lean();
      if (admins.length > 0) {
        const notifications = admins.map((admin: { _id: unknown }) => ({
          userId: admin._id,
          type: NotificationType.SYSTEM_MAINTENANCE,
          priority: NotificationPriority.URGENT,
          channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
          title: "Stripe Dispute Received",
          message: `A dispute (${dispute.id}) for ${dispute.currency?.toUpperCase()} ${(dispute.amount / 100).toFixed(2)} has been filed. Reason: ${dispute.reason}. Action required.`,
          data: {
            disputeId: dispute.id,
            chargeId: dispute.charge,
            amount: dispute.amount,
            currency: dispute.currency,
            reason: dispute.reason,
            status: dispute.status,
            dueBy: dispute.evidence_details?.due_by,
          },
          scheduledFor: new Date(),
        }));
        await Notification.insertMany(notifications).catch((err: Error) =>
          logger.error("Failed to create dispute notifications:", err)
        );
      }
      logger.warn(`Dispute ${dispute.id} logged for manual review. Charge: ${dispute.charge}`);
    } catch (error) {
      logger.error("Error handling charge dispute:", error);
    }
  }

  /**
   * Handle charge.refunded — update order refund status and notify
   */
  private static async handleChargeRefunded(
    charge: Stripe.Charge,
  ): Promise<void> {
    try {
      const orderId = charge.metadata?.orderId;
      if (!orderId) {
        logger.warn("charge.refunded: no orderId in metadata", {
          chargeId: charge.id,
        });
        return;
      }

      const order = await Order.findById(orderId);
      if (!order) {
        logger.error(`charge.refunded: order not found: ${orderId}`);
        return;
      }

      const refundedAmount = charge.amount_refunded / 100;
      const isFullRefund = charge.refunded;

      await Order.findByIdAndUpdate(orderId, {
        refundStatus: isFullRefund ? "fully_refunded" : "partially_refunded",
        refundedAmount,
        refundedAt: new Date(),
      });

      logger.info(`Order ${orderId} refund status updated`, {
        refundedAmount,
        isFullRefund,
      });

      // Send refund email (fire-and-forget)
      (async () => {
        try {
          const user = await User.findById(order.userId)
            .select("email firstName")
            .lean();
          if (!user) return;
          const u = user as any;
          if (emailService.sendRefundProcessedEmail) {
            await emailService.sendRefundProcessedEmail({
              to: u.email,
              firstName: u.firstName,
              orderNumber: order.orderNumber,
              refundAmount: refundedAmount,
              currency: order.currency || "USD",
              refundTransactionId: charge.id,
            });
          }
        } catch (emailError) {
          logger.error("Failed to send refund email:", emailError);
        }
      })();
    } catch (error) {
      logger.error("Error handling charge.refunded:", error);
    }
  }

  /**
   * Handle account.updated (Stripe Connect) — sync vendor onboarding status
   */
  private static async handleConnectAccountUpdated(
    account: Stripe.Account,
  ): Promise<void> {
    try {
      const stripeAccountId = account.id;

      const vendor = await Vendor.findOne({
        stripeConnectAccountId: stripeAccountId,
      });

      if (vendor) {
        const chargesEnabled = account.charges_enabled;
        const payoutsEnabled = account.payouts_enabled;
        const detailsSubmitted = account.details_submitted;

        await Vendor.findByIdAndUpdate(vendor._id, {
          stripeConnectOnboardingComplete: chargesEnabled && detailsSubmitted,
          "stripeConnectCapabilities.cardPayments": chargesEnabled
            ? "active"
            : "inactive",
          "stripeConnectCapabilities.transfers": payoutsEnabled
            ? "active"
            : "inactive",
        });

        logger.info(`Vendor ${vendor._id} Stripe Connect status updated`, {
          chargesEnabled,
          payoutsEnabled,
          detailsSubmitted,
        });
        return;
      }

      // Check teacher accounts too
      const teacher = await Teacher.findOne({
        stripeConnectAccountId: stripeAccountId,
      });

      if (teacher) {
        await Teacher.findByIdAndUpdate(teacher._id, {
          stripeConnectOnboardingComplete:
            account.charges_enabled && account.details_submitted,
        });

        logger.info(`Teacher ${teacher._id} Stripe Connect status updated`);
      }
    } catch (error) {
      logger.error("Error handling account.updated:", error);
    }
  }

  /**
   * Handle customer.subscription.updated — sync Stripe state to vendor.
   * Covers: cancel_at_period_end changes, card updates, plan changes, resume.
   *
   * Note: Stripe basil API removed current_period_end from Subscription.
   * Period end is tracked via invoice.period_end in handleInvoicePaid instead.
   */
  private static async handleSubscriptionUpdated(
    subscription: Stripe.Subscription,
  ): Promise<void> {
    try {
      const vendorId = subscription.metadata?.vendorId;
      if (!vendorId) return; // Not a vendor subscription

      const vendor = await Vendor.findById(vendorId);
      if (!vendor) {
        logger.warn(`customer.subscription.updated: vendor ${vendorId} not found`);
        return;
      }

      // Derive app status from Stripe status
      const stripeStatus = subscription.status;
      let appStatus: VendorSubscriptionStatus;
      switch (stripeStatus) {
        case "active":
        case "trialing":
          appStatus = VendorSubscriptionStatus.ACTIVE;
          break;
        case "past_due":
          appStatus = VendorSubscriptionStatus.GRACE_PERIOD;
          break;
        case "unpaid":
        case "canceled":
        case "incomplete_expired":
          appStatus = VendorSubscriptionStatus.INACTIVE;
          break;
        case "incomplete":
          appStatus = VendorSubscriptionStatus.PENDING;
          break;
        default:
          appStatus = VendorSubscriptionStatus.INACTIVE;
      }

      vendor.paymentSettings.stripeSettings.stripeSubscriptionStatus = stripeStatus;
      vendor.paymentSettings.stripeSettings.stripePriceId =
        subscription.items.data[0]?.price?.id;
      vendor.paymentSettings.subscriptionStatus = appStatus;
      vendor.paymentSettings.subscriptionCancelAtPeriodEnd =
        subscription.cancel_at_period_end;

      // Track when subscription will actually end (cancel_at is Unix timestamp when cancel_at_period_end)
      if (subscription.cancel_at) {
        vendor.paymentSettings.stripeSettings.stripeCurrentPeriodEnd = new Date(
          subscription.cancel_at * 1000,
        );
      }

      await vendor.save();

      logger.info(
        `Vendor ${vendorId} subscription updated. Stripe status: ${stripeStatus}, cancelAtPeriodEnd: ${subscription.cancel_at_period_end}`,
      );

      // Notify vendor if they scheduled a cancellation
      if (subscription.cancel_at_period_end && subscription.cancel_at) {
        const cancelDate = new Date(subscription.cancel_at * 1000).toLocaleDateString();
        emailService
          .sendEmail({
            to: vendor.email,
            subject: "Your Kidrove subscription is scheduled to cancel",
            html: `<p>Hi ${vendor.businessName},</p>
<p>Your subscription has been set to cancel on <strong>${cancelDate}</strong>. You'll continue to have access until that date.</p>
<p>To change your mind, visit the <a href="${config.frontendUrl}/vendor/payouts">payouts dashboard</a> and click "Manage Subscription".</p>`,
          })
          .catch(() => {});
      }
    } catch (error) {
      logger.error("Error handling customer.subscription.updated:", error);
    }
  }

  /**
   * Handle customer.subscription.deleted — downgrade vendor to platform_stripe.
   * This fires when the subscription actually ends (period end reached or immediate cancel).
   */
  private static async handleSubscriptionDeleted(
    subscription: Stripe.Subscription,
  ): Promise<void> {
    try {
      const vendorId = subscription.metadata?.vendorId;
      const teacherId = subscription.metadata?.teacherId;

      if (vendorId) {
        const vendor = await Vendor.findById(vendorId);
        if (!vendor) {
          logger.warn(`customer.subscription.deleted: vendor ${vendorId} not found`);
          return;
        }

        // Downgrade to commission model
        vendor.paymentSettings.subscriptionStatus = VendorSubscriptionStatus.INACTIVE;
        vendor.paymentSettings.paymentMode = PaymentMode.PLATFORM_STRIPE;
        vendor.paymentSettings.paymentModeChangedAt = new Date();
        vendor.paymentSettings.stripeSettings.stripeSubscriptionId = undefined;
        vendor.paymentSettings.stripeSettings.stripeSubscriptionStatus = "canceled";
        vendor.paymentSettings.subscriptionCancelAtPeriodEnd = false;

        await vendor.save();

        emailService
          .sendEmail({
            to: vendor.email,
            subject: "Your Kidrove subscription has ended",
            html: `<p>Hi ${vendor.businessName},</p>
<p>Your Kidrove Vendor Subscription has ended. You're now on the Platform Stripe model (5% commission on sales).</p>
<p>To resubscribe, visit your <a href="${config.frontendUrl}/vendor/payouts">payouts dashboard</a>.</p>`,
          })
          .catch(() => {});

        logger.info(`Vendor ${vendorId} subscription ended — downgraded to platform_stripe`);
        return;
      }

      if (teacherId) {
        await Teacher.findByIdAndUpdate(teacherId, {
          "paymentSettings.subscriptionStatus": "cancelled",
          "paymentSettings.subscriptionPaidUntil": new Date(),
        });
        logger.info(`Teacher ${teacherId} subscription cancelled via webhook`);
        return;
      }

      logger.warn(
        "customer.subscription.deleted: no vendorId/teacherId in metadata",
        { subscriptionId: subscription.id },
      );
    } catch (error) {
      logger.error("Error handling customer.subscription.deleted:", error);
    }
  }

  /**
   * Extract subscription id from a Stripe Invoice.
   * Stripe basil API moved subscription ref into invoice.parent.subscription_details.subscription.
   */
  private static getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
    // Basil API: invoice.parent.subscription_details.subscription
    const parent = invoice.parent as any;
    const subRef = parent?.subscription_details?.subscription;
    if (subRef) {
      return typeof subRef === "string" ? subRef : subRef.id;
    }
    return null;
  }

  /**
   * Handle invoice.paid — extend vendor subscription period and push history.
   * Fires on initial payment and every subsequent renewal.
   *
   * Period dates come from invoice.period_start/period_end (basil API).
   * We do NOT fetch the subscription separately — invoice has all we need.
   */
  private static async handleInvoicePaid(
    invoice: Stripe.Invoice,
  ): Promise<void> {
    try {
      // Only handle subscription invoices
      const subscriptionId = this.getInvoiceSubscriptionId(invoice);
      if (!subscriptionId) return;

      const customerId =
        typeof invoice.customer === "string"
          ? invoice.customer
          : (invoice.customer as any)?.id;

      const vendor = await findVendorByStripe({
        subscriptionId,
        customerId: customerId || undefined,
      });

      if (!vendor) {
        logger.debug(`invoice.paid: no vendor for subscription ${subscriptionId}`);
        return;
      }

      // Use invoice period dates (Unix timestamps in seconds → ms)
      const periodStart = new Date(invoice.period_start * 1000);
      const periodEnd = new Date(invoice.period_end * 1000);

      vendor.paymentSettings.subscriptionPaidUntil = periodEnd;
      vendor.paymentSettings.subscriptionStatus = VendorSubscriptionStatus.ACTIVE;
      vendor.paymentSettings.stripeSettings.stripeSubscriptionStatus = "active";
      vendor.paymentSettings.stripeSettings.stripeCurrentPeriodEnd = periodEnd;
      vendor.paymentSettings.stripeSettings.stripeSubscriptionId = subscriptionId;

      const amount = invoice.amount_paid / 100; // fils → AED

      if (!vendor.paymentSettings.subscriptionHistory) {
        vendor.paymentSettings.subscriptionHistory = [];
      }

      vendor.paymentSettings.subscriptionHistory.push({
        paymentDate: new Date(),
        amount,
        periodStart,
        periodEnd,
        status: "paid",
        transactionId: invoice.id,
        invoiceUrl: invoice.hosted_invoice_url || undefined,
        invoicePdf: invoice.invoice_pdf || undefined,
      } as any);

      // Restore hidden events (if any were deactivated due to expiry)
      await Event.updateMany(
        {
          vendorId: vendor._id,
          isActive: false,
          "metadata.deactivationReason": "Vendor subscription expired",
        },
        {
          $set: { isActive: true },
          $unset: { "metadata.deactivationReason": "" },
        },
      );

      // Reactivate vendor if suspended due to subscription expiry
      if (vendor.isSuspended && vendor.suspensionReason?.includes("subscription")) {
        vendor.isActive = true;
        vendor.isSuspended = false;
        vendor.suspensionReason = undefined;
      }

      await vendor.save();

      emailService
        .sendEmail({
          to: vendor.email,
          subject: "Kidrove subscription renewed ✓",
          html: `<p>Hi ${vendor.businessName},</p>
<p>Your Kidrove Vendor Subscription has been renewed successfully. Amount charged: <strong>AED ${amount}</strong>.</p>
<p>Your subscription is active until <strong>${periodEnd.toLocaleDateString()}</strong>.</p>
${invoice.hosted_invoice_url ? `<p><a href="${invoice.hosted_invoice_url}">View Invoice</a></p>` : ""}`,
        })
        .catch(() => {});

      logger.info(
        `Vendor ${vendor._id} subscription period extended to ${periodEnd.toISOString()} via invoice ${invoice.id}`,
      );
    } catch (error) {
      logger.error("Error handling invoice.paid:", error);
    }
  }

  /**
   * Handle invoice.payment_failed — move vendor to GRACE_PERIOD and notify.
   * Stripe will retry; actual downgrade happens via customer.subscription.deleted.
   */
  private static async handleInvoicePaymentFailed(
    invoice: Stripe.Invoice,
  ): Promise<void> {
    try {
      const subscriptionId = this.getInvoiceSubscriptionId(invoice);
      if (!subscriptionId) return;

      const customerId =
        typeof invoice.customer === "string"
          ? invoice.customer
          : (invoice.customer as any)?.id;

      const vendor = await findVendorByStripe({
        subscriptionId,
        customerId: customerId || undefined,
      });

      if (!vendor) {
        logger.debug(
          `invoice.payment_failed: no vendor for subscription ${subscriptionId}`,
        );
        return;
      }

      vendor.paymentSettings.subscriptionStatus = VendorSubscriptionStatus.GRACE_PERIOD;
      vendor.paymentSettings.stripeSettings.stripeSubscriptionStatus = "past_due";

      const amount = invoice.amount_due / 100;

      if (!vendor.paymentSettings.subscriptionHistory) {
        vendor.paymentSettings.subscriptionHistory = [];
      }

      const now = new Date();
      vendor.paymentSettings.subscriptionHistory.push({
        paymentDate: now,
        amount,
        periodStart: now,
        periodEnd: now,
        status: "failed",
        transactionId: invoice.id,
        invoiceUrl: invoice.hosted_invoice_url || undefined,
      } as any);

      await vendor.save();

      emailService
        .sendEmail({
          to: vendor.email,
          subject: "Action required: Kidrove subscription payment failed",
          html: `<p>Hi ${vendor.businessName},</p>
<p>We were unable to charge <strong>AED ${amount}</strong> for your Kidrove Vendor Subscription.</p>
<p>Please update your payment method to avoid losing access. Visit the <a href="${config.frontendUrl}/vendor/payouts">payouts dashboard</a> → Manage Subscription.</p>
<p>We'll retry the payment automatically.</p>`,
        })
        .catch(() => {});

      logger.warn(
        `Vendor ${vendor._id} subscription payment failed — status set to GRACE_PERIOD`,
      );
    } catch (error) {
      logger.error("Error handling invoice.payment_failed:", error);
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
