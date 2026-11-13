import Booking from "../../models/Booking";
import Payment from "../../models/Payment";
import Payout from "../../models/Payout";
import RevenueTransaction from "../../models/RevenueTransaction";
import Registration from "../../models/Registration";
import VendorSubscription from "../../models/VendorSubscription";
import { Section, make, pick, int, chance, daysAgo, fullName, emailOf, phone } from "./helpers";

export const money: Section = async (ctx) => {
  const customers = ctx.byRole("customer");
  const vendorUsers = ctx.byRole("vendor");
  if (!customers.length || !ctx.events.length) return [];

  const bookings = make("booking", 40, () => {
    const ev = pick(ctx.events);
    const n = int(1, 4);
    const when = daysAgo(int(-30, 60));
    return {
      userId: pick(customers)._id, eventId: ev._id, bookingDate: when, numberOfTickets: n,
      totalPrice: n * (ev.price || 50), status: pick(["pending", "confirmed", "confirmed", "cancelled"]),
      createdAt: when, updatedAt: when,
    };
  });

  const payments = ctx.orders.length ? make("payment", 40, (i) => {
    const o = pick(ctx.orders);
    const amount = o.totalAmount || int(40, 400);
    const status = pick(["completed", "completed", "completed", "pending", "failed", "refunded"]);
    const name = fullName();
    const at = daysAgo(int(0, 90));
    return {
      userId: o.userId, orderId: o._id, gateway: "stripe", paymentMethod: pick(["credit_card", "debit_card", "digital_wallet"]),
      amount, currency: "AED", status, transactionId: `pi_mock_${i}_${int(1000, 9999)}`, netAmount: Math.round(amount * 0.97),
      paymentDetails: { cardBrand: pick(["visa", "mastercard", "amex"]), last4: String(int(1000, 9999)) },
      billingAddress: { firstName: name.split(" ")[0], lastName: name.split(" ").slice(1).join(" "), email: emailOf(name, i), phone: phone(), address: "Sheikh Zayed Rd", city: "Dubai", state: "Dubai", zipCode: "00000", country: "AE" },
      createdAt: at, updatedAt: at,
    };
  }) : [];

  const revenue = vendorUsers.length ? make("revenue", 50, () => {
    const total = int(80, 900);
    const commission = Math.round(total * 0.12);
    const at = daysAgo(int(0, 90));
    const paid = chance(0.5);
    return {
      vendorId: pick(vendorUsers)._id, customerId: pick(customers)._id, totalAmount: total, adminCommission: commission,
      vendorPayout: total - commission, currency: "AED", revenueStream: pick(["booking", "booking", "booking", "subscription", "advertising", "addon"]),
      status: paid ? "paid" : "completed", settlementVoid: false, payoutStatus: paid ? "completed" : "pending",
      transactionDate: at, createdAt: at, updatedAt: at,
    };
  }) : [];

  const payouts = ctx.vendors.length && vendorUsers.length ? make("payout", 18, () => {
    const v = pick(ctx.vendors);
    const status = pick(["pending", "approved", "processing", "completed", "completed", "rejected"]);
    const at = daysAgo(int(0, 90));
    return {
      vendorId: v._id, amount: int(200, 5000), currency: "AED", status, requestedAt: at, requestedBy: v.userId,
      payoutMethod: pick(["bank_transfer", "stripe", "manual"]), createdAt: at, updatedAt: at,
    };
  }) : [];

  const registrations = make("registration", 25, () => {
    const at = daysAgo(int(0, 60));
    return {
      eventId: pick(ctx.events)._id, userId: pick(customers)._id,
      payment: { status: pick(["pending", "paid", "paid", "failed"]), amount: int(50, 300), currency: "AED" },
      status: pick(["draft", "submitted", "under_review", "approved", "rejected", "withdrawn"]),
      createdAt: at, updatedAt: at,
    };
  });

  const subscriptions = vendorUsers.map((v, i) => {
    const plan = pick(["basic", "standard", "premium", "enterprise"] as const);
    const start = daysAgo(int(10, 200));
    const end = new Date(start); end.setUTCFullYear(end.getUTCFullYear() + 1);
    return {
      _id: make("vsub", i + 1, () => ({}))[i]._id, vendorId: v._id, plan, status: pick(["active", "active", "trialing", "past_due", "expired"]),
      billingCycle: pick(["monthly", "quarterly", "yearly"]), startDate: start, endDate: end, nextBillingDate: daysAgo(-int(1, 30)),
      currentPricing: { monthlyPrice: 99, quarterlyPrice: 270, yearlyPrice: 990, currency: "AED" }, serviceFeeRate: 0.12,
      planFeatures: { maxEvents: 20, maxPhotosPerEvent: 10, maxVideoUploads: 5 },
    };
  });

  return [
    { label: "bookings", model: Booking, docs: bookings },
    { label: "payments", model: Payment, docs: payments },
    { label: "revenue transactions", model: RevenueTransaction, docs: revenue },
    { label: "payouts", model: Payout, docs: payouts },
    { label: "registrations", model: Registration, docs: registrations },
    { label: "vendor subscriptions", model: VendorSubscription, docs: subscriptions },
  ];
};
