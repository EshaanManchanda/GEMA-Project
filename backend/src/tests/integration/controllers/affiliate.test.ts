import "../setup/mocks";
import request from "supertest";
import { Application } from "express";
import { Types } from "mongoose";
import Affiliate from "../../../models/Affiliate";
import { createTestApp } from "../setup/testApp";
import { connectTestDB, clearTestDB, closeTestDB } from "../setup/testDB";
import { Session, cookie, signUp, signUpAdmin } from "../setup/session";

let app: Application;
beforeAll(async () => {
  await connectTestDB();
  app = createTestApp();
});
afterEach(clearTestDB);
afterAll(closeTestDB);

const send = (s: Session, method: "post" | "put", url: string, body: object = {}) =>
  request(app)[method](url).set("Cookie", cookie(s)).set("x-csrf-token", s.csrfToken).send(body);
const get = (s: Session, url: string) => request(app).get(url).set("Cookie", cookie(s));

const application = { defaultCommissionRate: 10, paymentMethod: "paypal", paymentDetails: { paypalEmail: "pay@example.com" } };

async function insertAffiliate(userId: string, extra: Record<string, unknown> = {}) {
  const _id = new Types.ObjectId();
  const affiliateCode = `AFF${String(_id).slice(-6).toUpperCase()}`;
  await Affiliate.collection.insertOne({
    _id,
    userId: new Types.ObjectId(userId),
    affiliateCode,
    status: "active",
    defaultCommissionRate: 10,
    commissionType: "percentage",
    paymentMethod: "paypal",
    paymentDetails: { paypalEmail: "pay@example.com" },
    clicks: [],
    commissions: [],
    totalClicks: 0,
    totalConversions: 0,
    totalRevenue: 0,
    totalCommissionEarned: 0,
    totalCommissionPaid: 0,
    createdAt: new Date(),
    ...extra,
  });
  return { id: String(_id), affiliateCode };
}

describe("affiliate self-service", () => {
  it("applying without an affiliateCode succeeds (code is required before the pre-save generator runs)", async () => {
    const user = await signUp(app, "customer");

    const res = await send(user, "post", "/api/affiliates/apply", application);

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe("pending");
    const saved = await Affiliate.findOne({ userId: user.userId }).lean();
    expect(saved!.affiliateCode).toMatch(/^AFF/);
  });

  it("returns 400 for missing payment method or an out-of-range commission rate", async () => {
    const user = await signUp(app, "customer");

    expect((await send(user, "post", "/api/affiliates/apply", { defaultCommissionRate: 10 })).status).toBe(400);
    expect((await send(user, "post", "/api/affiliates/apply", { ...application, defaultCommissionRate: 150 })).status).toBe(400);
    expect(await Affiliate.countDocuments()).toBe(0);
  });

  it("rejects a second application", async () => {
    const user = await signUp(app, "customer");
    await insertAffiliate(user.userId);
    expect((await send(user, "post", "/api/affiliates/apply", application)).status).toBe(400);
  });

  it("applicants cannot seed their own earnings via the apply body", async () => {
    const user = await signUp(app, "customer");

    await send(user, "post", "/api/affiliates/apply", {
      ...application,
      affiliateCode: "SELF0001", // lets the save pass; see the apply BUG above
      totalCommissionEarned: 99999,
      totalRevenue: 99999,
    });

    const saved = await Affiliate.findOne({ userId: user.userId }).lean();
    expect(saved).not.toBeNull();
    expect(saved!.totalCommissionEarned ?? 0).toBe(0);
  });

  it("reads the caller's affiliate account with stats; 404 when none", async () => {
    const user = await signUp(app, "customer");
    expect((await get(user, "/api/affiliates/my")).status).toBe(404);
    await insertAffiliate(user.userId);

    const res = await get(user, "/api/affiliates/my");

    expect(res.status).toBe(200);
    expect(res.body.data.stats).toMatchObject({ conversionRate: 0, pendingCommission: 0 });
  });

  it("updates the profile but ignores restricted fields", async () => {
    const user = await signUp(app, "customer");
    const { affiliateCode } = await insertAffiliate(user.userId);

    const res = await send(user, "put", "/api/affiliates/profile", { businessName: "Acme", affiliateCode: "HACKED", status: "active" });

    expect(res.status).toBe(200);
    const saved = await Affiliate.findOne({ userId: user.userId }).lean();
    expect(saved).toMatchObject({ businessName: "Acme", affiliateCode });
  });

  it("returns 400 for an invalid profile update", async () => {
    const user = await signUp(app, "customer");
    await insertAffiliate(user.userId);
    expect((await send(user, "put", "/api/affiliates/profile", { website: "not a url" })).status).toBe(400);
  });

  it("profile update cannot raise totalCommissionEarned", async () => {
    const user = await signUp(app, "customer");
    await insertAffiliate(user.userId);

    await send(user, "put", "/api/affiliates/profile", { totalCommissionEarned: 5000 });

    expect((await Affiliate.findOne({ userId: user.userId }).lean())!.totalCommissionEarned).toBe(0);
  });

  it("generates a tracking URL for an active affiliate; 400 on a bad eventId", async () => {
    const user = await signUp(app, "customer");
    const { affiliateCode } = await insertAffiliate(user.userId);

    const res = await send(user, "post", "/api/affiliates/generate-url", {});
    expect(res.status).toBe(200);
    expect(res.body.data.trackingUrl).toContain(affiliateCode);
    expect((await send(user, "post", "/api/affiliates/generate-url", { eventId: "bad" })).status).toBe(400);
  });

  it("returns dashboard stats and commissions", async () => {
    const user = await signUp(app, "customer");
    await insertAffiliate(user.userId);

    const stats = await get(user, "/api/affiliates/dashboard/stats?period=7");
    expect(stats.status).toBe(200);
    expect(stats.body.data.dailyBreakdown).toHaveLength(7);
    expect((await get(user, "/api/affiliates/dashboard/stats?period=0")).status).toBe(400);

    const commissions = await get(user, "/api/affiliates/commissions");
    expect(commissions.status).toBe(200);
    expect(commissions.body.data.pagination.total).toBe(0);
  });

  it("refuses a payout with nothing pending", async () => {
    const user = await signUp(app, "customer");
    await insertAffiliate(user.userId);
    expect((await send(user, "post", "/api/affiliates/payout-request")).status).toBe(400);
  });
});

describe("POST /api/affiliates/click/:affiliateCode (public)", () => {
  it("records a click for an active affiliate", async () => {
    const user = await signUp(app, "customer");
    const { id, affiliateCode } = await insertAffiliate(user.userId);

    const res = await request(app).post(`/api/affiliates/click/${affiliateCode}`).send({ deviceType: "mobile" });

    expect(res.status).toBe(200);
    expect((await Affiliate.findById(id).lean())!.totalClicks).toBe(1);
  });

  it("returns 404 for an unknown code and 400 for an invalid device type", async () => {
    expect((await request(app).post("/api/affiliates/click/NOPE1234").send({})).status).toBe(404);
    expect((await request(app).post("/api/affiliates/click/NOPE1234").send({ deviceType: "fridge" })).status).toBe(400);
  });
});

describe("affiliate admin endpoints", () => {
  it("lists, approves and reports on affiliates", async () => {
    const admin = await signUpAdmin(app);
    const user = await signUp(app, "customer");
    const { id } = await insertAffiliate(user.userId, { status: "pending" });

    const list = await get(admin, "/api/affiliates?status=pending");
    expect(list.status).toBe(200);
    expect(list.body.data.affiliates).toHaveLength(1);

    const upd = await send(admin, "put", `/api/affiliates/${id}/status`, { status: "active" });
    expect(upd.status).toBe(200);
    expect((await Affiliate.findById(id).lean())!.status).toBe("active");

    const analytics = await get(admin, "/api/affiliates/analytics/overview");
    expect(analytics.body.data).toMatchObject({ totalAffiliates: 1, activeAffiliates: 1 });
    expect((await get(admin, "/api/affiliates/top-performers")).status).toBe(200);
  });

  it("validates status updates", async () => {
    const admin = await signUpAdmin(app);
    const user = await signUp(app, "customer");
    const { id } = await insertAffiliate(user.userId);

    expect((await send(admin, "put", `/api/affiliates/${id}/status`, { status: "bogus" })).status).toBe(400);
    expect((await send(admin, "put", `/api/affiliates/${id}/status`, { status: "suspended" })).status).toBe(400);
    expect((await send(admin, "put", "/api/affiliates/bad/status", { status: "active" })).status).toBe(400);
  });

  it("forbids non-admins", async () => {
    const user = await signUp(app, "customer");
    const { id } = await insertAffiliate(user.userId, { status: "pending" });

    expect((await get(user, "/api/affiliates")).status).toBe(403);
    expect((await send(user, "put", `/api/affiliates/${id}/status`, { status: "active" })).status).toBe(403);
    expect((await Affiliate.findById(id).lean())!.status).toBe("pending");
  });
});
