import Vendor, {
  PaymentMode,
  VendorSubscriptionStatus,
} from "../models/Vendor";
import Event from "../models/Event";
import { stripe } from "../config/stripe";
import { config } from "../config";
import { Types } from "mongoose";
import { emailService } from "./email.service";
import logger from "../config/logger";
import { AppError } from "../middleware";

/**
 * Subscription Management Service
 *
 * Manages vendor subscriptions: vendors on the Subscription Model pay 150 AED/month
 * to the PLATFORM Stripe account to use their own Stripe Connect and avoid the 5%
 * commission. Billing uses native Stripe Billing (Checkout + Billing Portal).
 *
 * Stripe is the source of truth. App-level VendorSubscriptionStatus is derived:
 *   active|trialing       → ACTIVE
 *   past_due              → GRACE_PERIOD
 *   unpaid|canceled|      → INACTIVE  (+ downgrade paymentMode to platform_stripe)
 *   incomplete_expired
 *   incomplete            → PENDING
 */

// ─── Portal configuration cache ─────────────────────────────────────────────
// Lazily created once per process; stores the ID of a Stripe portal configuration
// that has subscription_cancel disabled. Used for active-period vendors so they
// cannot cancel from the Billing Portal during a paid billing cycle.
let _noCancelPortalConfigId: string | null = null;

async function getOrCreateNoCancelPortalConfig(): Promise<string | null> {
  if (config.stripe.vendorPortalNoCancelConfigId) {
    return config.stripe.vendorPortalNoCancelConfigId;
  }
  if (_noCancelPortalConfigId) return _noCancelPortalConfigId;
  try {
    const pc = await stripe.billingPortal.configurations.create({
      features: {
        subscription_cancel: { enabled: false },
        payment_method_update: { enabled: true },
        invoice_history: { enabled: true },
      },
    } as any);
    _noCancelPortalConfigId = pc.id;
    logger.info(`Created no-cancel portal config: ${pc.id} — set STRIPE_PORTAL_NO_CANCEL_CONFIG_ID=${pc.id}`);
    return _noCancelPortalConfigId;
  } catch (err) {
    logger.error("Failed to create no-cancel portal config; falling back to default portal:", err);
    return null;
  }
}

// ─── Type definitions ────────────────────────────────────────────────────────

export interface SubscriptionInfo {
  vendorId: Types.ObjectId;
  status: VendorSubscriptionStatus;
  stripeSubscriptionStatus?: string;
  amount: number;
  currency: string;
  startDate?: Date;
  paidUntil?: Date;
  nextPaymentDue?: Date;
  daysRemaining?: number;
  isActive: boolean;
  isInGracePeriod: boolean;
  cancelAtPeriodEnd: boolean;
  hasStripeSubscription: boolean;
  currentPeriodEnd?: Date;
}

export interface SubscriptionPayment {
  paymentDate: Date;
  amount: number;
  periodStart: Date;
  periodEnd: Date;
  status: "paid" | "failed" | "pending" | "refunded";
  transactionId?: string;
  invoiceUrl?: string;
  invoicePdf?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Map a raw Stripe subscription status to the app's VendorSubscriptionStatus.
 */
export function deriveSubscriptionStatus(
  stripeStatus: string,
): VendorSubscriptionStatus {
  switch (stripeStatus) {
    case "active":
    case "trialing":
      return VendorSubscriptionStatus.ACTIVE;
    case "past_due":
      return VendorSubscriptionStatus.GRACE_PERIOD;
    case "unpaid":
    case "canceled":
    case "incomplete_expired":
      return VendorSubscriptionStatus.INACTIVE;
    case "incomplete":
      return VendorSubscriptionStatus.PENDING;
    default:
      return VendorSubscriptionStatus.INACTIVE;
  }
}

/**
 * Find a Vendor by Stripe Customer id or Subscription id.
 * Used by webhook handlers.
 */
export async function findVendorByStripe(opts: {
  customerId?: string;
  subscriptionId?: string;
}) {
  const query: Record<string, unknown> = {};
  if (opts.subscriptionId) {
    query["paymentSettings.stripeSettings.stripeSubscriptionId"] =
      opts.subscriptionId;
  } else if (opts.customerId) {
    query["paymentSettings.stripeSettings.stripeCustomerId"] = opts.customerId;
  }
  if (!Object.keys(query).length) return null;
  return Vendor.findOne(query);
}

// ─── SubscriptionService class ───────────────────────────────────────────────

class SubscriptionService {
  private readonly SUBSCRIPTION_AMOUNT = 150; // AED per month
  private readonly CURRENCY = "AED";
  private readonly GRACE_PERIOD_DAYS = 7;

  // ── Stripe Checkout Session ──────────────────────────────────────────────

  /**
   * Create a Stripe Checkout Session (mode: "subscription") for a vendor to
   * subscribe to the platform subscription plan.
   *
   * Returns the Stripe-hosted checkout URL. Frontend should redirect immediately.
   * After payment, the vendor lands on /vendor/payouts?subscription=success.
   * Webhook checkout.session.completed activates the subscription.
   */
  async createCheckoutSession(
    vendorId: Types.ObjectId,
  ): Promise<{ url: string }> {
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) throw new AppError("Vendor not found", 404);

    if (vendor.paymentSettings.paymentMode !== PaymentMode.CUSTOM_STRIPE) {
      throw new AppError(
        "Vendor must be switched to Subscription Model before subscribing",
        400,
      );
    }

    // Prevent duplicate active subscriptions
    const existingSubId =
      vendor.paymentSettings.stripeSettings.stripeSubscriptionId;
    const existingStatus =
      vendor.paymentSettings.stripeSettings.stripeSubscriptionStatus;
    if (
      existingSubId &&
      (existingStatus === "active" || existingStatus === "trialing")
    ) {
      throw new AppError(
        "Vendor already has an active subscription. Use the Billing Portal to manage it.",
        400,
      );
    }

    const priceId = config.stripe.vendorSubscriptionPriceId;
    if (!priceId) {
      throw new AppError(
        "Stripe vendor subscription price is not configured. Set STRIPE_VENDOR_SUBSCRIPTION_PRICE_ID in .env",
        500,
      );
    }

    const frontendUrl = config.frontendUrl;

    // Ensure Stripe Customer
    let customerId =
      vendor.paymentSettings.stripeSettings.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: vendor.email,
        name: vendor.businessName,
        metadata: {
          vendorId: vendorId.toString(),
          platform: "kidrove",
        },
      });
      customerId = customer.id;
      vendor.paymentSettings.stripeSettings.stripeCustomerId = customerId;
      await vendor.save();
      logger.info(`Created Stripe customer ${customerId} for vendor ${vendorId}`);
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        metadata: {
          vendorId: vendorId.toString(),
          type: "vendor_subscription",
          platform: "kidrove",
        },
      },
      metadata: {
        vendorId: vendorId.toString(),
        type: "vendor_subscription",
      },
      success_url: `${frontendUrl}/vendor/payouts?subscription=success`,
      cancel_url: `${frontendUrl}/vendor/payouts?subscription=cancelled`,
      allow_promotion_codes: false,
    });

    logger.info(
      `Created Checkout Session ${session.id} for vendor ${vendorId}`,
    );
    return { url: session.url! };
  }

  // ── Billing Portal ──────────────────────────────────────────────────────

  /**
   * Create a Stripe Billing Portal session so the vendor can manage their
   * subscription (cancel, update card, view invoices, reactivate).
   *
   * Returns the Stripe-hosted portal URL; frontend redirects immediately.
   * Vendor returns to /vendor/payouts when done.
   * All actions flow back via customer.subscription.updated / .deleted webhooks.
   */
  async createBillingPortalSession(
    vendorId: Types.ObjectId,
  ): Promise<{ url: string }> {
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) throw new AppError("Vendor not found", 404);

    const customerId =
      vendor.paymentSettings.stripeSettings.stripeCustomerId;
    if (!customerId) {
      throw new AppError(
        "No Stripe customer found. Please subscribe first.",
        400,
      );
    }

    // During an active paid period, open the portal without the cancel option.
    const paidUntil = vendor.paymentSettings.subscriptionPaidUntil;
    const status = vendor.paymentSettings.subscriptionStatus;
    const isActivePeriod =
      paidUntil &&
      paidUntil > new Date() &&
      status === VendorSubscriptionStatus.ACTIVE;

    const sessionParams: any = {
      customer: customerId,
      return_url: `${config.frontendUrl}/vendor/payouts`,
    };

    if (isActivePeriod) {
      const noCancelConfigId = await getOrCreateNoCancelPortalConfig();
      if (noCancelConfigId) {
        sessionParams.configuration = noCancelConfigId;
      }
    }

    const session = await stripe.billingPortal.sessions.create(sessionParams);

    logger.info(
      `Created Billing Portal session for vendor ${vendorId}${isActivePeriod ? " (no-cancel config)" : ""}`,
    );
    return { url: session.url };
  }

  // ── Subscription state (read) ────────────────────────────────────────────

  async checkSubscriptionStatus(
    vendorId: Types.ObjectId,
  ): Promise<SubscriptionInfo> {
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) throw new AppError("Vendor not found", 404);

    const now = new Date();
    const paidUntil = vendor.paymentSettings.subscriptionPaidUntil;
    const status = vendor.paymentSettings.subscriptionStatus;
    const stripeStatus =
      vendor.paymentSettings.stripeSettings.stripeSubscriptionStatus;
    const periodEnd =
      vendor.paymentSettings.stripeSettings.stripeCurrentPeriodEnd;

    let isActive = false;
    let isInGracePeriod = false;
    let daysRemaining: number | undefined;
    let nextPaymentDue: Date | undefined;

    if (paidUntil) {
      const msRemaining = paidUntil.getTime() - now.getTime();
      daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));
      if (daysRemaining > 0) {
        isActive = status === VendorSubscriptionStatus.ACTIVE;
        nextPaymentDue = new Date(paidUntil);
        nextPaymentDue.setDate(nextPaymentDue.getDate() - 3);
      } else if (daysRemaining >= -this.GRACE_PERIOD_DAYS) {
        isInGracePeriod = true;
        nextPaymentDue = now;
      }
    }

    return {
      vendorId,
      status,
      stripeSubscriptionStatus: stripeStatus,
      amount:
        vendor.paymentSettings.subscriptionAmount || this.SUBSCRIPTION_AMOUNT,
      currency: this.CURRENCY,
      startDate: vendor.paymentSettings.subscriptionStartDate,
      paidUntil,
      nextPaymentDue,
      daysRemaining,
      isActive,
      isInGracePeriod,
      cancelAtPeriodEnd:
        vendor.paymentSettings.subscriptionCancelAtPeriodEnd ?? false,
      hasStripeSubscription:
        !!vendor.paymentSettings.stripeSettings.stripeSubscriptionId,
      currentPeriodEnd: periodEnd,
    };
  }

  async getSubscriptionHistory(
    vendorId: Types.ObjectId,
  ): Promise<SubscriptionPayment[]> {
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) throw new AppError("Vendor not found", 404);
    return (vendor.paymentSettings.subscriptionHistory || []) as SubscriptionPayment[];
  }

  // ── Cancel (fallback — primary path is the Billing Portal) ──────────────

  /**
   * Cancel subscription.
   *
   * If the vendor has an active Stripe subscription, this sets cancel_at_period_end
   * so access continues until the period end (cancel anytime, not immediate).
   * The actual downgrade to platform_stripe happens via customer.subscription.deleted webhook.
   *
   * If there is no Stripe subscription (e.g. manually managed), downgrade immediately.
   */
  async cancelSubscription(
    vendorId: Types.ObjectId,
    reason?: string,
  ): Promise<void> {
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) throw new AppError("Vendor not found", 404);

    // Block cancellation during an active paid billing period.
    const paidUntil = vendor.paymentSettings.subscriptionPaidUntil;
    const status = vendor.paymentSettings.subscriptionStatus;
    if (
      paidUntil &&
      paidUntil > new Date() &&
      status === VendorSubscriptionStatus.ACTIVE
    ) {
      const endDate = paidUntil.toLocaleDateString("en-AE", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      throw new AppError(
        `Subscriptions cannot be cancelled during an active billing period. Your current period runs until ${endDate}. You may cancel after that date.`,
        400,
      );
    }

    const subId = vendor.paymentSettings.stripeSettings.stripeSubscriptionId;

    if (subId) {
      // Cancel at period end — access continues until billing period ends.
      await stripe.subscriptions.update(subId, {
        cancel_at_period_end: true,
      });
      vendor.paymentSettings.subscriptionCancelAtPeriodEnd = true;
      await vendor.save();
      logger.info(
        `Subscription ${subId} set to cancel_at_period_end for vendor ${vendorId}. Reason: ${reason || "vendor request"}`,
      );
    } else {
      // No Stripe subscription — manual / legacy downgrade.
      vendor.paymentSettings.subscriptionStatus =
        VendorSubscriptionStatus.INACTIVE;
      vendor.paymentSettings.paymentMode = PaymentMode.PLATFORM_STRIPE;
      vendor.paymentSettings.paymentModeChangedAt = new Date();
      await vendor.save();
      logger.info(
        `Subscription cancelled (no Stripe sub) for vendor ${vendorId}. Reason: ${reason || "not specified"}`,
      );
    }
  }

  // ── Legacy / manual methods (kept for safety-net cron) ──────────────────

  /**
   * Create a pending subscription record when admin sets vendor to custom_stripe.
   * The subscription is only ACTIVE once the vendor pays via Checkout.
   */
  async createSubscription(vendorId: Types.ObjectId): Promise<SubscriptionInfo> {
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) throw new AppError("Vendor not found", 404);

    if (vendor.paymentSettings.paymentMode !== PaymentMode.CUSTOM_STRIPE) {
      throw new AppError(
        "Vendor must be in custom Stripe mode to create subscription",
        400,
      );
    }

    vendor.paymentSettings.subscriptionStatus = VendorSubscriptionStatus.PENDING;
    vendor.paymentSettings.subscriptionStartDate = new Date();
    vendor.paymentSettings.subscriptionAmount = this.SUBSCRIPTION_AMOUNT;
    await vendor.save();

    logger.info(`Created pending subscription record for vendor ${vendorId}`);
    return this.checkSubscriptionStatus(vendorId);
  }

  /**
   * Legacy shim — teacher.payment.controller still calls this.
   * For vendors, real billing now goes through createCheckoutSession + webhooks.
   */
  async processSubscriptionPayment(
    _vendorId: Types.ObjectId,
  ): Promise<{ success: boolean; amount: number; paidUntil: Date; error?: string }> {
    return {
      success: false,
      amount: this.SUBSCRIPTION_AMOUNT,
      paidUntil: new Date(),
      error: "Use createCheckoutSession for real Stripe Billing. This method is deprecated.",
    };
  }

  /**
   * Suspend subscription due to non-payment (called by admin or cron).
   */
  async suspendSubscription(
    vendorId: Types.ObjectId,
    reason: string,
  ): Promise<void> {
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) throw new AppError("Vendor not found", 404);

    vendor.paymentSettings.subscriptionStatus =
      VendorSubscriptionStatus.SUSPENDED;
    vendor.isSuspended = true;
    vendor.suspensionReason = reason;
    await vendor.save();

    logger.info(`Suspended subscription for vendor ${vendorId}. Reason: ${reason}`);
    emailService
      .sendEmail({
        to: vendor.email,
        subject: "Your Kidrove subscription has been suspended",
        html: `<p>Hi ${vendor.businessName}, your subscription has been suspended. Please update your payment method to continue listing events.</p>`,
      })
      .catch(() => {});
  }

  /**
   * Process expired subscriptions (daily cron safety net).
   * Stripe usually handles expiry via webhooks but this catches edge cases.
   */
  async processExpiredSubscriptions(): Promise<void> {
    const now = new Date();
    const gracePeriodEnd = new Date();
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() - this.GRACE_PERIOD_DAYS);

    const vendors = await Vendor.find({
      "paymentSettings.paymentMode": PaymentMode.CUSTOM_STRIPE,
      "paymentSettings.subscriptionStatus": {
        $in: [
          VendorSubscriptionStatus.ACTIVE,
          VendorSubscriptionStatus.GRACE_PERIOD,
        ],
      },
    });

    for (const vendor of vendors) {
      const paidUntil = vendor.paymentSettings.subscriptionPaidUntil;
      if (!paidUntil) continue;

      if (paidUntil < now) {
        const msExpired = now.getTime() - paidUntil.getTime();
        const daysExpired = Math.floor(msExpired / (1000 * 60 * 60 * 24));

        if (daysExpired <= this.GRACE_PERIOD_DAYS) {
          if (
            vendor.paymentSettings.subscriptionStatus !==
            VendorSubscriptionStatus.GRACE_PERIOD
          ) {
            vendor.paymentSettings.subscriptionStatus =
              VendorSubscriptionStatus.GRACE_PERIOD;
            await vendor.save();
            logger.info(
              `Vendor ${vendor._id} moved to grace period (${daysExpired} days expired)`,
            );
          }
        } else {
          vendor.paymentSettings.subscriptionStatus =
            VendorSubscriptionStatus.EXPIRED;
          vendor.isActive = false;
          vendor.isSuspended = true;
          vendor.suspensionReason = `Subscription expired ${daysExpired} days ago. Grace period ended. Events are hidden from portal.`;
          await vendor.save();

          await Event.updateMany(
            { vendorId: vendor._id, isActive: true },
            {
              $set: {
                isActive: false,
                "metadata.deactivationReason": "Vendor subscription expired",
              },
            },
          );

          logger.info(
            `Vendor ${vendor._id} subscription expired and deactivated (${daysExpired} days). Events hidden.`,
          );

          emailService
            .sendEmail({
              to: vendor.email,
              subject: "Your subscription has expired — events hidden",
              html: `<p>Hi ${vendor.businessName || "Vendor"},</p>
<p>Your subscription has expired and your events have been hidden from the platform.</p>
<p>Please renew at <a href="${config.frontendUrl}/vendor/payouts">your payouts page</a>.</p>`,
            })
            .catch((err: Error) =>
              logger.error("Vendor deactivation email failed:", err),
            );
        }
      }
    }

    logger.info("Processed expired subscriptions check");
  }

  async calculateSubscriptionCost(
    vendorId: Types.ObjectId,
    months: number,
  ): Promise<number> {
    const vendor = await Vendor.findById(vendorId);
    const monthlyAmount =
      vendor?.paymentSettings.subscriptionAmount || this.SUBSCRIPTION_AMOUNT;
    return monthlyAmount * months;
  }
}

export const subscriptionService = new SubscriptionService();
export default subscriptionService;
