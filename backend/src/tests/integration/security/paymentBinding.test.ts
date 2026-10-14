/**
 * A succeeded Stripe PaymentIntent only pays for the record it was created
 * for. Reusing one paid intent ID on another order/registration must fail.
 */
import request from "supertest";
import { Application } from "express";
import { Types } from "mongoose";
import Order from "../../../models/Order";
import Event from "../../../models/Event";
import Registration from "../../../models/Registration";
import { PaymentService } from "../../../services/payment.service";
import { createTestApp } from "../setup/testApp";
import { connectTestDB, clearTestDB, closeTestDB } from "../setup/testDB";
import { cookie, signUp } from "../setup/session";

jest.mock("../../../services/email.service", () => ({
  sendEmail: jest.fn().mockResolvedValue(undefined),
  emailService: new Proxy({}, { get: () => jest.fn().mockResolvedValue(undefined) }),
}));
jest.mock("../../../config/firebase", () => ({ initializeFirebase: jest.fn() }));
jest.mock("../../../services/queue.service", () => ({
  addEmailJob: jest.fn().mockResolvedValue(undefined),
  addQRJob: jest.fn().mockResolvedValue(undefined),
}));

// A real, succeeded intent — but paid for some OTHER record.
const paidElsewhere = (amount: number, metadata: Record<string, string>) =>
  jest.spyOn(PaymentService, "getPaymentIntent").mockResolvedValue({
    id: "pi_paid_elsewhere",
    status: "succeeded",
    amount,
    currency: "aed",
    metadata,
  } as any);

let app: Application;

beforeAll(async () => {
  await connectTestDB();
  app = createTestApp();
});
afterEach(async () => {
  jest.restoreAllMocks();
  await clearTestDB();
});
afterAll(closeTestDB);

it("registration confirm rejects an intent created for a different registration", async () => {
  const user = await signUp(app, "customer");
  const regId = new Types.ObjectId();
  const eventId = new Types.ObjectId();
  await Event.collection.insertOne({ _id: eventId, title: "Paid Reg", slug: `reg-${eventId}`, price: 500, currency: "AED" });
  await Registration.collection.insertOne({
    _id: regId,
    eventId,
    userId: new Types.ObjectId(user.userId),
    status: "submitted",
    payment: { status: "pending", amount: 500, currency: "AED", stripePaymentIntentId: "pi_this_registration" },
  });
  paidElsewhere(1000, { registrationId: String(new Types.ObjectId()) });

  const res = await request(app)
    .post(`/api/registrations/${regId}/confirm-payment`)
    .set("Cookie", cookie(user))
    .set("x-csrf-token", user.csrfToken)
    .send({ paymentIntentId: "pi_paid_elsewhere" });

  expect(res.status).toBe(400);
  expect((await Registration.findById(regId).lean())?.payment?.status).toBe("pending");
});

it("booking confirm rejects an intent created for a different order (same amount)", async () => {
  const user = await signUp(app, "customer");
  const orderId = new Types.ObjectId();
  await Order.collection.insertOne({
    _id: orderId,
    userId: new Types.ObjectId(user.userId),
    orderNumber: "ORD-BIND-1",
    items: [{ eventId: new Types.ObjectId(), eventTitle: "E", quantity: 1, unitPrice: 100, totalPrice: 100, scheduleDate: new Date() }],
    subtotal: 100,
    total: 100,
    currency: "AED",
    status: "pending",
    paymentStatus: "pending",
    paymentIntentId: "pi_this_order",
  });
  paidElsewhere(10000, { orderId: String(new Types.ObjectId()) });

  const res = await request(app)
    .post("/api/bookings/confirm")
    .set("Cookie", cookie(user))
    .set("x-csrf-token", user.csrfToken)
    .send({ paymentIntentId: "pi_paid_elsewhere", orderId: String(orderId) });

  expect(res.status).toBe(400);
  expect((await Order.findById(orderId).lean())?.paymentStatus).toBe("pending");
});

describe("the genuine payment still confirms", () => {
  it("registration: its own intent", async () => {
    const user = await signUp(app, "customer");
    const regId = new Types.ObjectId();
    const eventId = new Types.ObjectId();
    await Event.collection.insertOne({ _id: eventId, title: "Paid Reg", slug: `reg-${eventId}`, price: 500, currency: "AED" });
    await Registration.collection.insertOne({
      _id: regId,
      eventId,
      userId: new Types.ObjectId(user.userId),
      status: "submitted",
      payment: { status: "pending", amount: 500, currency: "AED", stripePaymentIntentId: "pi_this_registration" },
    });
    jest.spyOn(PaymentService, "getPaymentIntent").mockResolvedValue({
      id: "pi_this_registration", status: "succeeded", amount: 50000, currency: "aed", metadata: { registrationId: String(regId) },
    } as any);

    const res = await request(app)
      .post(`/api/registrations/${regId}/confirm-payment`)
      .set("Cookie", cookie(user))
      .set("x-csrf-token", user.csrfToken)
      .send({ paymentIntentId: "pi_this_registration" });

    expect(res.status).toBe(200);
    expect((await Registration.findById(regId).lean())?.payment?.status).toBe("paid");
  });

  it("booking: its own intent", async () => {
    const user = await signUp(app, "customer");
    const orderId = new Types.ObjectId();
    await Order.collection.insertOne({
      _id: orderId,
      userId: new Types.ObjectId(user.userId),
      orderNumber: "ORD-BIND-2",
      items: [{ eventId: new Types.ObjectId(), eventTitle: "E", quantity: 1, unitPrice: 100, totalPrice: 100, scheduleDate: new Date() }],
      subtotal: 100,
      total: 100,
      currency: "AED",
      status: "pending",
      paymentStatus: "pending",
      paymentIntentId: "pi_this_order",
    });
    jest.spyOn(PaymentService, "getPaymentIntent").mockResolvedValue({
      id: "pi_this_order", status: "succeeded", amount: 10000, currency: "aed", metadata: { orderId: String(orderId) },
    } as any);

    const res = await request(app)
      .post("/api/bookings/confirm")
      .set("Cookie", cookie(user))
      .set("x-csrf-token", user.csrfToken)
      .send({ paymentIntentId: "pi_this_order", orderId: String(orderId) });

    expect(res.status).toBe(200);
    expect((await Order.findById(orderId).lean())?.paymentStatus).toBe("paid");
  });
});
