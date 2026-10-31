/**
 * Refunds → money actually moves, and everything the order granted is revoked.
 *
 * Every refund entry point must (1) call Stripe, (2) invalidate the order's
 * active tickets, and (3) take a fully refunded order out of the vendor payout
 * pool. Stripe is stubbed at the client (`stripe.refunds.create`).
 */
import "../setup/mocks";
import request from "supertest";
import { Application } from "express";
import { Types } from "mongoose";
import Stripe from "stripe";
import Order from "../../../models/Order";
import Ticket from "../../../models/Ticket";
import RevenueTransaction, { TransactionStatus } from "../../../models/RevenueTransaction";
import { stripe } from "../../../config/stripe";
import { PaymentService } from "../../../services/payment.service";
import { createTestApp } from "../setup/testApp";
import { connectTestDB, clearTestDB, closeTestDB } from "../setup/testDB";
import { signUp, signUpAdmin, cookie, insertEvent, Session } from "../setup/session";
import { insertOrder, ensureCollections } from "../setup/factories";

let app: Application;
let admin: Session;
let refundSpy: jest.SpyInstance;

beforeAll(async () => {
  await connectTestDB();
  app = createTestApp();
  await ensureCollections();
  // Wait out index builds on what the refund transaction writes; one still
  // running fails the transaction with a "catalog changes" WriteConflict.
  await Promise.all([Order, Ticket, RevenueTransaction].map((m) => m.init()));
});
afterEach(clearTestDB);
afterAll(closeTestDB);

beforeEach(async () => {
  admin = await signUpAdmin(app);
  refundSpy = jest
    .spyOn(stripe.refunds, "create")
    .mockImplementation((async () => ({ id: `re_${new Types.ObjectId()}` })) as any);
});

/** A paid order with one active ticket and one payout-pending revenue row. */
async function paidOrder() {
  const customer = await signUp(app, "customer");
  const vendorId = String(new Types.ObjectId());
  const eventId = await insertEvent(vendorId);
  const orderId = await insertOrder(customer.userId, eventId, {
    paymentIntentId: `pi_${new Types.ObjectId()}`,
    currency: "AED",
  });
  await Ticket.collection.insertOne({
    ticketNumber: `T-${orderId}`,
    orderId: new Types.ObjectId(orderId),
    userId: new Types.ObjectId(customer.userId),
    eventId: new Types.ObjectId(eventId),
    qrCode: "qr",
    qrCodeImage: "img",
    ticketType: "General",
    attendeeName: "A",
    attendeeEmail: "a@example.com",
    price: 50,
    currency: "AED",
    status: "active",
  });
  await RevenueTransaction.collection.insertOne({
    orderId: new Types.ObjectId(orderId),
    vendorId: new Types.ObjectId(vendorId),
    totalAmount: 50,
    adminCommission: 5,
    vendorPayout: 45,
    currency: "AED",
    revenueStream: "booking",
    status: TransactionStatus.COMPLETED,
    payoutStatus: "pending",
  });
  return orderId;
}

async function expectRevoked(orderId: string) {
  const order = await Order.findById(orderId).lean();
  expect(order!.paymentStatus).toBe("refunded");
  const ticket = await Ticket.findOne({ orderId }).lean();
  expect(ticket!.status).toBe("refunded");
  const tx = await RevenueTransaction.findOne({ orderId }).lean();
  expect(tx!.status).toBe(TransactionStatus.REFUNDED);
}

// A retried transaction may repeat the Stripe call; the idempotency key makes that one refund.
const distinctRefunds = () => new Set(refundSpy.mock.calls.map((c) => c[1]?.idempotencyKey)).size;

const asAdmin = (req: request.Test) => req.set("Cookie", cookie(admin)).set("x-csrf-token", admin.csrfToken);

describe("admin refund endpoints", () => {
  it("POST /orders/admin/:id/refund refunds through Stripe and revokes the order", async () => {
    const orderId = await paidOrder();
    const res = await asAdmin(request(app).post(`/api/orders/admin/${orderId}/refund`)).send({ reason: "test" });
    expect(res.status).toBe(200);
    expect(distinctRefunds()).toBe(1);
    expect(refundSpy.mock.calls[0][0]).toMatchObject({ amount: 5000 });
    expect(refundSpy.mock.calls[0][1]).toMatchObject({ idempotencyKey: expect.stringContaining(`refund-${orderId}`) });
    await expectRevoked(orderId);
  });

  it("a failed Stripe refund leaves the order paid", async () => {
    const orderId = await paidOrder();
    refundSpy.mockImplementation((async () => {
      throw new Error("card_declined");
    }) as any);
    const res = await asAdmin(request(app).post(`/api/orders/admin/${orderId}/refund`)).send({});
    expect(res.status).toBeGreaterThanOrEqual(400);
    const order = await Order.findById(orderId).lean();
    expect(order!.paymentStatus).toBe("paid");
    expect((await Ticket.findOne({ orderId }).lean())!.status).toBe("active");
  });

  it("a partial refund refunds the amount but keeps vendor revenue in the pool", async () => {
    const orderId = await paidOrder();
    const res = await asAdmin(request(app).post(`/api/orders/admin/${orderId}/refund`)).send({ amount: 20 });
    expect(res.status).toBe(200);
    expect(refundSpy.mock.calls[0][0]).toMatchObject({ amount: 2000 });
    const tx = await RevenueTransaction.findOne({ orderId }).lean();
    expect(tx!.status).toBe(TransactionStatus.COMPLETED);
  });

  it("PATCH /orders/admin/bulk refund refunds each order through Stripe", async () => {
    const a = await paidOrder();
    const b = await paidOrder();
    const res = await asAdmin(request(app).patch("/api/orders/admin/bulk")).send({ orderIds: [a, b], action: "refund" });
    expect(res.status).toBe(200);
    expect(distinctRefunds()).toBe(2);
    await expectRevoked(a);
    await expectRevoked(b);
  });

  it("POST /payments/refund revokes the order too", async () => {
    const orderId = await paidOrder();
    const res = await asAdmin(request(app).post("/api/payments/refund")).send({ orderId, reason: "test" });
    expect(res.status).toBe(200);
    expect(distinctRefunds()).toBe(1);
    await expectRevoked(orderId);
  });
});

describe("charge.refunded webhook", () => {
  const refundedEvent = (orderId: string, refunded: boolean) =>
    ({
      id: `evt_${new Types.ObjectId()}`,
      type: "charge.refunded",
      data: { object: { id: "ch_1", amount_refunded: refunded ? 5000 : 1000, refunded, metadata: { orderId } } },
    }) as unknown as Stripe.Event;

  it("a full refund made in the Stripe dashboard revokes tickets and vendor revenue", async () => {
    const orderId = await paidOrder();
    await PaymentService.processWebhookEvent(refundedEvent(orderId, true));
    await expectRevoked(orderId);
  });

  it("a partial refund leaves tickets and revenue alone", async () => {
    const orderId = await paidOrder();
    await PaymentService.processWebhookEvent(refundedEvent(orderId, false));
    expect((await Ticket.findOne({ orderId }).lean())!.status).toBe("active");
    expect((await RevenueTransaction.findOne({ orderId }).lean())!.status).toBe(TransactionStatus.COMPLETED);
  });
});
