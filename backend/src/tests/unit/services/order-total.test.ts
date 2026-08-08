/**
 * Characterization test for Order.ts's pre-save total calculation
 * (models/Order.ts, post Phase-3 rename):
 *
 *   total = subtotal + vat + serviceFee - discount - couponDiscount
 *
 * `serviceFee` is legacy-only after Phase 5 (service-fee removal) — new
 * orders always write 0, so this term is inert going forward. It stays in
 * the formula so a legacy order that gets re-saved keeps its historical
 * total intact instead of silently dropping the fee the customer actually
 * paid. See plan Phase 4.
 */
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import Order from "../../../models/Order";

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterEach(async () => {
  await Order.deleteMany({});
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongod.stop();
});

const minimalOrder = (overrides: Record<string, any> = {}) => {
  const eventId = new mongoose.Types.ObjectId();
  return new Order({
    userId: new mongoose.Types.ObjectId(),
    items: [
      {
        eventId,
        eventTitle: "Test Event",
        scheduleDate: new Date(),
        quantity: 1,
        unitPrice: 100,
        totalPrice: 100,
        currency: "AED",
      },
    ],
    subtotal: 100,
    total: 0, // recomputed by the pre-save hook unless it's a free order
    currency: "AED",
    paymentMethod: "stripe",
    billingAddress: {
      firstName: "Test",
      lastName: "User",
      email: "test@example.com",
      phone: "+971500000000",
      country: "AE",
    },
    ...overrides,
  });
};

describe("Order pre-save total calculation (current formula)", () => {
  it("adds tax and serviceFee, subtracts discount and couponDiscount", async () => {
    const order = await minimalOrder({
      vat: 5.25,
      serviceFee: 5,
      discount: 2,
      couponDiscount: 10,
    }).save();
    expect(order.total).toBeCloseTo(98.25); // 100 + 5.25 + 5 - 2 - 10
  });

  it("defaults tax/serviceFee/discount/couponDiscount to zero", async () => {
    const order = await minimalOrder().save();
    expect(order.total).toBe(100);
  });

  it("floors total at zero rather than going negative", async () => {
    const order = await minimalOrder({ discount: 500 }).save();
    expect(order.total).toBe(0);
  });

  it("does not recompute total for a free order (paymentMethod free)", async () => {
    const order = await minimalOrder({
      paymentMethod: "free",
      subtotal: 0,
      total: 0,
      vat: 999, // must be ignored — free orders skip recalculation
    }).save();
    expect(order.total).toBe(0);
  });
});

/**
 * calculateRefundAmount() is a SEPARATE code path from
 * RefundService.calculateRefundableAmount (services/refund.service.ts) —
 * it drives the real Stripe refund amount in booking.controller.ts's
 * PUT /bookings/:id/cancel and three sites in order.controller.ts. It was
 * missed in the initial VAT-refundable pass (Phase 7) and still excluded
 * VAT from the refund; fixed here to match the same policy: ticket price +
 * VAT refundable, only a legacy serviceFee withheld.
 */
describe("Order.calculateRefundAmount (drives the real Stripe refund)", () => {
  const paidOrder = (overrides: Record<string, any> = {}) =>
    minimalOrder({
      paymentStatus: "paid",
      // > 24h in the future so user_requested cancellation is allowed
      items: [
        {
          eventId: new mongoose.Types.ObjectId(),
          eventTitle: "Test Event",
          scheduleDate: new Date(Date.now() + 72 * 60 * 60 * 1000),
          quantity: 1,
          unitPrice: 100,
          totalPrice: 100,
          currency: "AED",
        },
      ],
      ...overrides,
    });

  it("refunds subtotal plus VAT, net of coupon discount", async () => {
    const order = await paidOrder({ vat: 5.25, couponDiscount: 10 }).save();
    expect(order.calculateRefundAmount("user_requested")).toBeCloseTo(95.25); // (100-10) + 5.25
  });

  it("does not add a legacy serviceFee to the refund", async () => {
    const order = await paidOrder({ vat: 5.25, serviceFee: 5 }).save();
    expect(order.calculateRefundAmount("user_requested")).toBeCloseTo(105.25); // 100 + 5.25, serviceFee withheld
  });

  it("returns 0 when the order was never paid", async () => {
    const order = await paidOrder({ paymentStatus: "pending", vat: 5.25 }).save();
    expect(order.calculateRefundAmount("user_requested")).toBe(0);
  });

  it("returns 0 for a user-requested cancellation within 24 hours of the event", async () => {
    const order = await paidOrder({
      vat: 5.25,
      items: [
        {
          eventId: new mongoose.Types.ObjectId(),
          eventTitle: "Test Event",
          scheduleDate: new Date(Date.now() + 1 * 60 * 60 * 1000), // 1h away
          quantity: 1,
          unitPrice: 100,
          totalPrice: 100,
          currency: "AED",
        },
      ],
    }).save();
    expect(order.calculateRefundAmount("user_requested")).toBe(0);
  });

  it("admin-cancelled orders skip the 24-hour check and still refund VAT", async () => {
    const order = await paidOrder({
      vat: 5.25,
      items: [
        {
          eventId: new mongoose.Types.ObjectId(),
          eventTitle: "Test Event",
          scheduleDate: new Date(Date.now() + 1 * 60 * 60 * 1000), // 1h away
          quantity: 1,
          unitPrice: 100,
          totalPrice: 100,
          currency: "AED",
        },
      ],
    }).save();
    expect(order.calculateRefundAmount("admin_cancelled")).toBeCloseTo(105.25);
  });
});
