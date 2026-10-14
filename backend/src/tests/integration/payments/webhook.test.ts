/**
 * Stripe webhook → order state. The money path: a customer is charged, the
 * webhook confirms the order and issues tickets; a refund flips it back.
 *
 * The HTTP handler acks 200 and processes in the background, so the HTTP
 * tests only cover signature checks; state changes are asserted by awaiting
 * PaymentService.processWebhookEvent directly.
 */
import request from "supertest";
import { Application } from "express";
import { Types } from "mongoose";
import Stripe from "stripe";
import Order from "../../../models/Order";
import Ticket from "../../../models/Ticket";
import Event from "../../../models/Event";
import User from "../../../models/User";
import { stripe } from "../../../config/stripe";
import { PaymentService } from "../../../services/payment.service";
import { createTestApp } from "../setup/testApp";
import { connectTestDB, clearTestDB, closeTestDB } from "../setup/testDB";

// In-memory stand-in for the Redis dedup store; null = Redis unavailable.
let fakeRedis: { get: jest.Mock; set: jest.Mock } | null = null;

jest.mock("../../../config/redis", () => ({
  __esModule: true,
  get default() {
    return fakeRedis;
  },
  redisClient: { status: "end", get: jest.fn(), set: jest.fn(), del: jest.fn() },
  redisPool: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue("OK"),
    del: jest.fn().mockResolvedValue(1),
    isHealthy: jest.fn().mockReturnValue(false),
    getConnection: jest.fn().mockReturnValue(null),
  },
}));

jest.mock("../../../services/email.service", () => ({
  emailService: {
    sendEmail: jest.fn().mockResolvedValue(undefined),
    sendOrderConfirmationEmail: jest.fn().mockResolvedValue(undefined),
    sendTicketsEmail: jest.fn().mockResolvedValue(undefined),
    sendRefundProcessedEmail: jest.fn().mockResolvedValue(undefined),
  },
}));
jest.mock("../../../utils/mailer", () => ({ sendTicketByEmail: jest.fn().mockResolvedValue(undefined) }));
jest.mock("../../../config/firebase", () => ({ initializeFirebase: jest.fn() }));
jest.mock("../../../services/queue.service", () => ({
  addEmailJob: jest.fn().mockResolvedValue(undefined),
  addQRJob: jest.fn().mockResolvedValue(undefined),
}));

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET as string;

const memoryRedis = () => {
  const store = new Map<string, string>();
  return {
    get: jest.fn(async (k: string) => store.get(k) ?? null),
    set: jest.fn(async (k: string, v: string) => {
      store.set(k, v);
      return "OK";
    }),
  };
};

async function pendingOrder() {
  const user = await User.create({
    firstName: "Pay",
    lastName: "Er",
    email: `payer.${new Types.ObjectId()}@example.com`,
    passwordHash: "not-used-in-this-test",
    role: "customer",
  });
  const eventId = new Types.ObjectId();
  await Event.collection.insertOne({
    _id: eventId,
    title: "Paid Workshop",
    slug: `paid-${eventId}`,
    type: "Event",
    vendorId: new Types.ObjectId(),
    status: "published",
    isApproved: true,
  });
  return Order.create({
    userId: user._id,
    items: [
      {
        eventId,
        eventTitle: "Paid Workshop",
        scheduleDate: new Date(Date.now() + 7 * 864e5),
        quantity: 2,
        unitPrice: 50,
        totalPrice: 100,
        currency: "AED",
      },
    ],
    subtotal: 100,
    total: 100,
    currency: "AED",
    status: "pending",
    paymentStatus: "pending",
    paymentMethod: "stripe",
    billingAddress: {
      firstName: "Pay",
      lastName: "Er",
      email: user.email,
      phone: "+971500000000",
      address: "1 Test St",
      city: "Dubai",
      state: "Dubai",
      zipCode: "00000",
      country: "AE",
    },
  });
}

const event = (type: string, object: Record<string, unknown>, id = `evt_${new Types.ObjectId()}`) =>
  ({ id, type, data: { object } }) as unknown as Stripe.Event;

const succeeded = (orderId: string, id?: string) =>
  event("payment_intent.succeeded", { id: "pi_test_123", object: "payment_intent", metadata: { orderId } }, id);

let app: Application;

beforeAll(async () => {
  await connectTestDB();
  app = createTestApp();
});
beforeEach(() => {
  fakeRedis = memoryRedis();
});
afterEach(clearTestDB);
afterAll(closeTestDB);

describe("POST /api/payments/webhook (signature)", () => {
  const payload = JSON.stringify({ id: "evt_sig", object: "event", type: "ping", data: { object: {} } });

  it("rejects a missing signature", async () => {
    const res = await request(app).post("/api/payments/webhook").set("Content-Type", "application/json").send(payload);
    expect(res.status).toBe(400);
  });

  it("rejects a forged signature", async () => {
    const forged = stripe.webhooks.generateTestHeaderString({ payload, secret: "whsec_attacker_secret" });
    const res = await request(app)
      .post("/api/payments/webhook")
      .set("Content-Type", "application/json")
      .set("Stripe-Signature", forged)
      .send(payload);
    expect(res.status).toBe(400);
  });

  it("accepts a correctly signed event", async () => {
    const header = stripe.webhooks.generateTestHeaderString({ payload, secret: WEBHOOK_SECRET });
    const res = await request(app)
      .post("/api/payments/webhook")
      .set("Content-Type", "application/json")
      .set("Stripe-Signature", header)
      .send(payload);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ received: true });
  });
});

describe("PaymentService.processWebhookEvent", () => {
  it("payment_intent.succeeded marks the order paid + confirmed and issues one ticket per seat", async () => {
    const order = await pendingOrder();

    await PaymentService.processWebhookEvent(succeeded(String(order._id)));

    const after = await Order.findById(order._id).lean();
    expect(after?.paymentStatus).toBe("paid");
    expect(after?.status).toBe("confirmed");
    expect(after?.transactionId).toBe("pi_test_123");
    expect(await Ticket.countDocuments({ orderId: order._id })).toBe(2);
  });

  it("a redelivered event is skipped via the Redis dedup key", async () => {
    const order = await pendingOrder();
    const evt = succeeded(String(order._id), "evt_dup");

    await PaymentService.processWebhookEvent(evt);
    await PaymentService.processWebhookEvent(evt);

    expect(fakeRedis!.set).toHaveBeenCalledTimes(1);
    expect(await Ticket.countDocuments({ orderId: order._id })).toBe(2);
  });

  it("does not duplicate tickets when Redis is down and the event is replayed", async () => {
    fakeRedis = null;
    const order = await pendingOrder();
    const evt = succeeded(String(order._id), "evt_no_redis");

    await PaymentService.processWebhookEvent(evt);
    await PaymentService.processWebhookEvent(evt);

    expect(await Ticket.countDocuments({ orderId: order._id })).toBe(2);
  });

  it("payment_intent.payment_failed leaves the order pending and unpaid", async () => {
    const order = await pendingOrder();

    await PaymentService.processWebhookEvent(
      event("payment_intent.payment_failed", { id: "pi_fail", object: "payment_intent", metadata: { orderId: String(order._id) } }),
    );

    const after = await Order.findById(order._id).lean();
    expect(after?.paymentStatus).toBe("pending");
    expect(after?.status).toBe("pending");
    expect(await Ticket.countDocuments({ orderId: order._id })).toBe(0);
  });

  it("a full charge.refunded marks a paid order refunded", async () => {
    const order = await pendingOrder();
    await PaymentService.processWebhookEvent(succeeded(String(order._id)));

    await PaymentService.processWebhookEvent(
      event("charge.refunded", {
        id: "ch_test",
        object: "charge",
        refunded: true,
        amount_refunded: 10000,
        metadata: { orderId: String(order._id) },
      }),
    );

    const after = await Order.findById(order._id).lean();
    expect(after?.status).toBe("refunded");
    expect(after?.paymentStatus).toBe("refunded");
    expect(after?.refundAmount).toBe(100);
  });

  it("a partial refund records the amount but keeps the order paid", async () => {
    const order = await pendingOrder();
    await PaymentService.processWebhookEvent(succeeded(String(order._id)));

    await PaymentService.processWebhookEvent(
      event("charge.refunded", {
        id: "ch_partial",
        object: "charge",
        refunded: false,
        amount_refunded: 2500,
        metadata: { orderId: String(order._id) },
      }),
    );

    const after = await Order.findById(order._id).lean();
    expect(after?.paymentStatus).toBe("paid");
    expect(after?.refundAmount).toBe(25);
  });
});
