/**
 * competitionOrder.utils.ts
 *
 * Shared helper that creates an Order document from a confirmed competition
 * payment.  Called from each competition controller's finalize / register
 * handler AFTER paymentStatus has been set to "paid".
 *
 * Design decisions:
 *  • The Order item's `eventId` is set to the submission's own _id.
 *    MongoDB does NOT enforce foreign-key integrity on ObjectId refs, so this
 *    is safe and keeps the schema happy without needing a real Event document.
 *  • The Order is created inside a try/catch that never re-throws — if the
 *    order creation fails the payment is NOT rolled back and the submission
 *    stays confirmed.  Only an error is logged so the user is unaffected.
 *  • An idempotency guard (`transactionId` unique index on Order) prevents
 *    duplicate orders if finalize is called twice for the same session.
 */

import mongoose from "mongoose";
import Order from "../models/Order";
import User from "../models/User";
import logger from "../config/logger";

export interface CompetitionOrderPayload {
  /** Competition slug used in log messages, e.g. "ai-art", "national-day" */
  competitionKey: string;

  /** Full readable name shown in the order item, e.g. "KidRove AI Art Competition 2026" */
  competitionTitle: string;

  /** Submission document _id (used as the order item eventId placeholder) */
  submissionId: mongoose.Types.ObjectId | string;

  /** Stripe checkout session ID or any unique payment reference */
  transactionId: string;

  /** Amount in AED (whole number, e.g. 50) */
  amountAED: number;

  /** Parent / guardian details from the submission */
  parentEmail: string;
  parentName: string;
  parentPhone?: string;

  /** Student name, used in order notes */
  studentName: string;

  /** IP address from the original request */
  ipAddress?: string;
}

/**
 * Creates (or skips) an Order document for a confirmed competition payment.
 *
 * Returns the created Order or null if skipped / errored.
 */
export async function createCompetitionOrder(
  payload: CompetitionOrderPayload
): Promise<InstanceType<typeof Order> | null> {
  const {
    competitionKey,
    competitionTitle,
    submissionId,
    transactionId,
    amountAED,
    parentEmail,
    parentName,
    parentPhone,
    studentName,
    ipAddress,
  } = payload;

  try {
    // ── Idempotency guard ─────────────────────────────────────────────────────
    // transactionId has a sparse unique index — if an Order already exists for
    // this session we skip silently.
    const existing = await Order.findOne({ transactionId });
    if (existing) {
      logger.info(
        `[${competitionKey}] Order already exists for transactionId ${transactionId} — skipping`
      );
      return existing as any;
    }

    // ── Resolve userId (parent user must already exist at this point) ─────────
    const parentUser = await User.findOne({ email: parentEmail }).lean();
    if (!parentUser) {
      logger.warn(
        `[${competitionKey}] Parent user not found for ${parentEmail} — cannot create Order`
      );
      return null;
    }

    // ── Build name parts for billingAddress ───────────────────────────────────
    const nameParts = (parentName || "Parent User").trim().split(/\s+/);
    const firstName = nameParts[0] || "Parent";
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "User";

    // ── Create Order ──────────────────────────────────────────────────────────
    const order = new Order({
      userId: parentUser._id,

      items: [
        {
          // Use the submission _id as a placeholder ObjectId for eventId.
          // MongoDB does not enforce ref integrity at insert time.
          eventId: new mongoose.Types.ObjectId(submissionId.toString()),
          eventTitle: competitionTitle,
          scheduleDate: new Date(),
          quantity: 1,
          unitPrice: amountAED,
          totalPrice: amountAED,
          currency: "AED",
          participants: [
            {
              name: studentName,
              // age is required by schema — use 0 as sentinel; real age is on submission
              age: 0,
            },
          ],
        },
      ],

      subtotal: amountAED,
      vat: 0,
      discount: 0,
      total: amountAED,
      currency: "AED",
      chargedCurrency: "AED",
      chargedAmount: amountAED,

      status: "confirmed",
      paymentStatus: "paid",
      paymentMethod: "stripe",
      transactionId,

      billingAddress: {
        firstName,
        lastName,
        email: parentEmail,
        phone: parentPhone || "N/A",
        address: "TBD",
        city: "TBD",
        state: "TBD",
        zipCode: "00000",
        country: "AE",
      },

      notes: `Competition entry: ${competitionTitle} — Student: ${studentName}`,

      paymentRouting: {
        usesVendorStripe: false,
        platformCommission: amountAED,
        vendorPayout: 0,
        stripeApplicationFee: 0,
      },

      adminCommission: {
        rate: 100,
        amount: amountAED,
        calculatedAt: new Date(),
      },

      revenueMetadata: {
        revenueStream: "booking",
        category: "competition",
        commissionSource: "platform_fee",
      },

      source: "web",
      ipAddress: ipAddress || undefined,

      confirmedAt: new Date(),
    });

    await order.save();

    logger.info(
      `[${competitionKey}] Order created: ${order.orderNumber} (${order._id}) for ${parentEmail} — ${amountAED} AED`
    );

    return order as any;
  } catch (err: any) {
    // ── Duplicate key on transactionId (race condition) → skip gracefully ─────
    if (err?.code === 11000 && err?.keyPattern?.transactionId) {
      logger.info(
        `[${competitionKey}] Duplicate transactionId ${transactionId} — order already created`
      );
      return null;
    }

    logger.error(
      `[${competitionKey}] Failed to create Order for submission ${submissionId}:`,
      err
    );
    return null;
  }
}

