/**
 * Coupon usage limits hold under concurrency and on every checkout path.
 *
 * Usage is reserved atomically when the order is created and released when an
 * unpaid order expires, so a limit can't be beaten by racing requests or by
 * booking through /bookings/initiate.
 */
import "../setup/mocks";
import request from "supertest";
import { Application } from "express";
import { Types } from "mongoose";
import Coupon, { CouponType } from "../../../models/Coupon";
import Order from "../../../models/Order";
import { createTestApp } from "../setup/testApp";
import { connectTestDB, clearTestDB, closeTestDB } from "../setup/testDB";
import { signUp, cookie, insertEvent } from "../setup/session";
import { ensureCollections, savableEventFields, insertOrder } from "../setup/factories";

let app: Application;

beforeAll(async () => {
  await connectTestDB();
  app = createTestApp();
  await ensureCollections();
});
afterEach(clearTestDB);
afterAll(closeTestDB);

const makeCoupon = (extra: Record<string, unknown> = {}) =>
  Coupon.create({
    code: `SAVE${Math.floor(Math.random() * 1e6)}`,
    name: "Test coupon",
    type: CouponType.FIXED_AMOUNT,
    value: 10,
    validFrom: new Date(Date.now() - 864e5),
    validUntil: new Date(Date.now() + 864e5),
    isActive: true,
    createdBy: new Types.ObjectId(),
    ...extra,
  });

const oid = () => new Types.ObjectId();

describe("Coupon.reserveUsage", () => {
  it("never exceeds usageLimit under concurrent checkouts", async () => {
    const coupon = await makeCoupon({ usageLimit: 3 });
    const results = await Promise.all(
      Array.from({ length: 10 }, () => Coupon.reserveUsage(coupon._id, oid(), oid(), 10)),
    );
    expect(results.filter(Boolean)).toHaveLength(3);
    expect((await Coupon.findById(coupon._id).lean())!.usageCount).toBe(3);
  });

  it("enforces the per-user limit under concurrency", async () => {
    const coupon = await makeCoupon({ userUsageLimit: 1 });
    const user = oid();
    const results = await Promise.all(
      Array.from({ length: 5 }, () => Coupon.reserveUsage(coupon._id, user, oid(), 10)),
    );
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(await Coupon.reserveUsage(coupon._id, oid(), oid(), 10)).toBe(true);
  });

  it("is idempotent per order", async () => {
    const coupon = await makeCoupon({ usageLimit: 5 });
    const [user, order] = [oid(), oid()];
    expect(await Coupon.reserveUsage(coupon._id, user, order, 10)).toBe(true);
    expect(await Coupon.reserveUsage(coupon._id, user, order, 10)).toBe(true);
    expect((await Coupon.findById(coupon._id).lean())!.usageCount).toBe(1);
  });

  it("releasing an expired order's usage frees the slot exactly once", async () => {
    const coupon = await makeCoupon({ usageLimit: 1, userUsageLimit: 1 });
    const [user, order] = [oid(), oid()];
    await Coupon.reserveUsage(coupon._id, user, order, 10);
    expect(await Coupon.reserveUsage(coupon._id, user, oid(), 10)).toBe(false);

    await Coupon.releaseUsage(coupon.code, order);
    await Coupon.releaseUsage(coupon.code, order);
    const after = await Coupon.findById(coupon._id).lean();
    expect(after!.usageCount).toBe(0);
    expect(await Coupon.reserveUsage(coupon._id, user, oid(), 10)).toBe(true);
  });
});

describe("POST /api/bookings/initiate with a coupon", () => {
  async function bookableEvent() {
    const scheduleId = new Types.ObjectId();
    const eventId = await insertEvent(String(oid()), {
      ...savableEventFields,
      price: 100,
      location: { address: "1 Test St", city: "Dubai" },
      dateSchedule: [
        {
          _id: scheduleId,
          date: new Date(Date.now() + 7 * 864e5),
          startDate: new Date(Date.now() + 7 * 864e5),
          endDate: new Date(Date.now() + 7 * 864e5 + 36e5),
          availableSeats: 10,
          totalSeats: 10,
          price: 100,
        },
      ],
    });
    return { eventId, scheduleId: String(scheduleId) };
  }

  const initiate = async (couponCode: string, ev: { eventId: string; scheduleId: string }) => {
    const s = await signUp(app, "customer");
    return request(app)
      .post("/api/bookings/initiate")
      .set("Cookie", cookie(s))
      .set("x-csrf-token", s.csrfToken)
      .send({ eventId: ev.eventId, dateScheduleId: ev.scheduleId, seats: 1, paymentMethod: "test", couponCode });
  };

  it("records usage, and rejects the booking once the limit is used up", async () => {
    const coupon = await makeCoupon({ usageLimit: 1 });
    const ev = await bookableEvent();

    const first = await initiate(coupon.code, ev);
    expect(first.status).toBe(201);
    expect(first.body.data.couponDiscount).toBe(10);
    expect((await Coupon.findById(coupon._id).lean())!.usageCount).toBe(1);

    const second = await initiate(coupon.code, ev);
    expect(second.status).toBe(400);
    expect(await Order.countDocuments({ couponCode: coupon.code })).toBe(1);
  });
});

describe("POST /api/coupons/apply", () => {
  const apply = async (paymentStatus: string) => {
    const s = await signUp(app, "customer");
    const coupon = await makeCoupon();
    const eventId = await insertEvent(String(oid()));
    const orderId = await insertOrder(s.userId, eventId, { status: "pending", paymentStatus });
    const res = await request(app)
      .post("/api/coupons/apply")
      .set("Cookie", cookie(s))
      .set("x-csrf-token", s.csrfToken)
      .send({ couponId: String(coupon._id), orderId });
    return { res, coupon };
  };

  it("lets the order's owner apply a coupon to an unpaid order", async () => {
    const { res, coupon } = await apply("pending");
    expect(res.status).toBe(200);
    expect(res.body.data.discountAmount).toBe(10);
    expect((await Coupon.findById(coupon._id).lean())!.usageCount).toBe(1);
  });

  it("refuses to discount an order that is already paid", async () => {
    const { res } = await apply("paid");
    expect(res.status).toBe(400);
  });

  it("only discounts the order that wins the last use", async () => {
    const coupon = await makeCoupon({ usageLimit: 1 });
    const eventId = await insertEvent(String(oid()));
    const tries = await Promise.all(
      [1, 2].map(async () => {
        const s = await signUp(app, "customer");
        const orderId = await insertOrder(s.userId, eventId, { status: "pending", paymentStatus: "pending" });
        return { s, orderId };
      }),
    );
    const results = await Promise.all(
      tries.map(({ s, orderId }) =>
        request(app)
          .post("/api/coupons/apply")
          .set("Cookie", cookie(s))
          .set("x-csrf-token", s.csrfToken)
          .send({ couponId: String(coupon._id), orderId }),
      ),
    );
    expect(results.map((r) => r.status).sort()).toEqual([200, 400]);
    expect(await Order.countDocuments({ couponCode: coupon.code })).toBe(1);
  });
});

describe("PUT /api/orders/:id/cancel", () => {
  it("gives an unpaid order's coupon use back", async () => {
    const s = await signUp(app, "customer");
    const coupon = await makeCoupon({ usageLimit: 1 });
    const eventId = await insertEvent(String(oid()));
    const orderId = await insertOrder(s.userId, eventId, {
      status: "pending",
      paymentStatus: "pending",
      couponCode: coupon.code,
    });
    await Coupon.reserveUsage(coupon._id, s.userId, orderId, 10);

    const res = await request(app)
      .put(`/api/orders/${orderId}/cancel`)
      .set("Cookie", cookie(s))
      .set("x-csrf-token", s.csrfToken)
      .send({});
    expect(res.status).toBe(200);
    expect((await Coupon.findById(coupon._id).lean())!.usageCount).toBe(0);
  });
});
