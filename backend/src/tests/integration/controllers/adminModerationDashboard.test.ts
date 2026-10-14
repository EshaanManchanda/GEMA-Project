/** admin.moderation + admin.dashboard controllers. */
import "../setup/mocks";
import request from "supertest";
import { Application } from "express";
import { Types } from "mongoose";
import Review from "../../../models/Review";
import { createTestApp } from "../setup/testApp";
import { connectTestDB, clearTestDB, closeTestDB } from "../setup/testDB";
import { Session, cookie, signUp, signUpAdmin, vendorIdOf, insertEvent } from "../setup/session";

let app: Application;
beforeAll(async () => {
  await connectTestDB();
  app = createTestApp();
});
afterEach(clearTestDB);
afterAll(closeTestDB);

const post = (s: Session, url: string, body: object = {}) =>
  request(app).post(url).set("Cookie", cookie(s)).set("x-csrf-token", s.csrfToken).send(body);
const get = (s: Session, url: string) => request(app).get(url).set("Cookie", cookie(s));

async function insertReview(status = "pending") {
  const vendor = await signUp(app, "vendor");
  const eventId = await insertEvent(await vendorIdOf(vendor));
  const author = await signUp(app, "customer");
  const _id = new Types.ObjectId();
  await Review.collection.insertOne({
    _id,
    type: "event",
    event: new Types.ObjectId(eventId),
    user: new Types.ObjectId(author.userId),
    rating: 2,
    title: "Meh",
    comment: "Not great",
    status,
    createdAt: new Date(),
  });
  return String(_id);
}

describe("admin moderation", () => {
  it("reports moderation stats", async () => {
    const admin = await signUpAdmin(app);
    await insertReview();
    expect((await get(admin, "/api/admin/moderation/stats")).status).toBe(200);
  });

  it.failing("BUG: the pending-review queue loads (it populates `userId`, but Review's field is `user` -> StrictPopulateError 500)", async () => {
    const admin = await signUpAdmin(app);
    const id = await insertReview();

    const pending = await get(admin, "/api/admin/moderation/reviews/pending");

    expect(pending.status).toBe(200);
    expect(JSON.stringify(pending.body.data)).toContain(id);
  });

  it("deletes a review", async () => {
    const admin = await signUpAdmin(app);
    const id = await insertReview();

    expect((await post(admin, `/api/admin/moderation/review/${id}`, { action: "delete", reason: "Spam and abuse" })).status).toBe(200);
    expect(await Review.countDocuments({ _id: id })).toBe(0);
  });

  it("returns 400 for an unknown action, a missing reason, or a malformed id; 404 for an unknown review", async () => {
    const admin = await signUpAdmin(app);
    const id = await insertReview();

    expect((await post(admin, `/api/admin/moderation/review/${id}`, { action: "nuke" })).status).toBe(400);
    expect((await post(admin, `/api/admin/moderation/review/${id}`, { action: "reject" })).status).toBe(400);
    expect((await post(admin, `/api/admin/moderation/review/${id}`, { action: "reject", reason: "short" })).status).toBe(400);
    expect((await post(admin, "/api/admin/moderation/review/bad", { action: "approve" })).status).toBe(400);
    expect((await post(admin, `/api/admin/moderation/review/${new Types.ObjectId()}`, { action: "approve" })).status).toBe(404);
  });

  it.failing("BUG: rejecting a review actually changes its status", async () => {
    const admin = await signUpAdmin(app);
    const id = await insertReview();

    await post(admin, `/api/admin/moderation/review/${id}`, { action: "reject", reason: "Abusive language" });

    expect((await Review.findById(id).lean())!.status).toBe("rejected");
  });


  it("forbids non-admins", async () => {
    const vendor = await signUp(app, "vendor");
    const id = await insertReview();

    expect((await get(vendor, "/api/admin/moderation/reviews/pending")).status).toBe(403);
    expect((await post(vendor, `/api/admin/moderation/review/${id}`, { action: "delete", reason: "Spam and abuse" })).status).toBe(403);
    expect(await Review.countDocuments({ _id: id })).toBe(1);
  });
});

describe("admin dashboard", () => {
  it("returns stats and top performers", async () => {
    const admin = await signUpAdmin(app);
    await insertReview();

    const stats = await get(admin, "/api/admin/dashboard/stats");
    expect(stats.status).toBe(200);
    expect(stats.body.success).toBe(true);
    expect((await get(admin, "/api/admin/dashboard/top-performers")).status).toBe(200);
  });

  it.failing("BUG: recent activity loads (Review populate of `userId` -> StrictPopulateError 500)", async () => {
    const admin = await signUpAdmin(app);
    await insertReview(); // populate only throws once a Review row exists
    expect((await get(admin, "/api/admin/dashboard/activity")).status).toBe(200);
  });

  it("returns 400 for invalid pagination or date range", async () => {
    const admin = await signUpAdmin(app);
    expect((await get(admin, "/api/admin/dashboard/activity?page=0")).status).toBe(400);
    expect((await get(admin, "/api/admin/dashboard/stats?startDate=yesterday")).status).toBe(400);
  });

  it("forbids non-admins", async () => {
    const customer = await signUp(app, "customer");
    expect((await get(customer, "/api/admin/dashboard/stats")).status).toBe(403);
  });
});
