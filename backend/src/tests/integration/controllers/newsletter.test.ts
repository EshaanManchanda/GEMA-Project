import "../setup/mocks";
import request from "supertest";
import { Application } from "express";
import { Types } from "mongoose";
import NewsletterSubscriber from "../../../models/NewsletterSubscriber";
import User from "../../../models/User";
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
const emailOf = async (s: Session) => (await User.findById(s.userId).lean())!.email;

async function insertSubscriber(email: string, extra: Record<string, unknown> = {}) {
  const token = new Types.ObjectId().toHexString() + "abcdefgh"; // 32 chars
  await NewsletterSubscriber.collection.insertOne({
    email,
    name: "Sub",
    source: "blog",
    isActive: true,
    tags: [],
    preferences: { frequency: "weekly", categories: [], receivePromotions: true },
    unsubscribeToken: token,
    subscriptionDate: new Date(),
    ...extra,
  });
  return token;
}

describe("public newsletter endpoints", () => {
  it("subscribes a new email (201) and stores it", async () => {
    const res = await request(app).post("/api/newsletter/subscribe").send({ email: "new.sub@example.com", name: "Lina" });

    expect(res.status).toBe(201);
    expect(res.body.data.subscriber).toMatchObject({ email: "new.sub@example.com", isActive: true });
    expect(await NewsletterSubscriber.countDocuments({ email: "new.sub@example.com", isActive: true })).toBe(1);
  });

  it("reactivates an unsubscribed email with 200", async () => {
    await insertSubscriber("back@example.com", { isActive: false });

    const res = await request(app).post("/api/newsletter/subscribe").send({ email: "back@example.com", name: "Back" });

    expect(res.status).toBe(200);
    expect((await NewsletterSubscriber.findOne({ email: "back@example.com" }).lean())!.isActive).toBe(true);
  });

  it.each([
    ["missing email", { name: "Lina" }],
    ["invalid email", { email: "nope", name: "Lina" }],
    ["missing name", { email: "a@example.com" }],
    ["bad source", { email: "a@example.com", name: "Lina", source: "tv" }],
  ])("returns 400 for %s", async (_label, body) => {
    expect((await request(app).post("/api/newsletter/subscribe").send(body)).status).toBe(400);
    expect(await NewsletterSubscriber.countDocuments()).toBe(0);
  });

  it("unsubscribes by token; unknown token → 404, short token → 400", async () => {
    const token = await insertSubscriber("bye@example.com");

    expect((await request(app).get(`/api/newsletter/unsubscribe/${token}`)).status).toBe(200);
    expect((await NewsletterSubscriber.findOne({ email: "bye@example.com" }).lean())!.isActive).toBe(false);
    expect((await request(app).get(`/api/newsletter/unsubscribe/${"x".repeat(32)}`)).status).toBe(404);
    expect((await request(app).get("/api/newsletter/unsubscribe/short")).status).toBe(400);
  });

  it("an anonymous subscribe call cannot overwrite an existing subscriber's profile", async () => {
    await insertSubscriber("victim@example.com", { name: "Victim", city: "Dubai" });

    await request(app).post("/api/newsletter/subscribe").send({ email: "victim@example.com", name: "Hacked Name", city: "Nowhere" });

    expect((await NewsletterSubscriber.findOne({ email: "victim@example.com" }).lean())!.name).toBe("Victim");
  });
});

describe("authenticated subscriber endpoints", () => {
  it("reports status, updates preferences and unsubscribes", async () => {
    const me = await signUp(app, "customer");
    const email = await emailOf(me);
    expect((await get(me, "/api/newsletter/status")).body.data.isSubscribed).toBe(false);
    await insertSubscriber(email);

    expect((await get(me, "/api/newsletter/status")).body.data.isSubscribed).toBe(true);

    const upd = await send(me, "put", "/api/newsletter/preferences", { frequency: "monthly" });
    expect(upd.status).toBe(200);
    expect((await NewsletterSubscriber.findOne({ email }).lean())!.preferences.frequency).toBe("monthly");
    expect((await send(me, "put", "/api/newsletter/preferences", { frequency: "hourly" })).status).toBe(400);

    expect((await send(me, "post", "/api/newsletter/unsubscribe", {})).status).toBe(200);
    expect((await NewsletterSubscriber.findOne({ email }).lean())!.isActive).toBe(false);
  });
});

describe("admin newsletter endpoints", () => {
  it("returns stats and the subscriber list, and sends to active subscribers", async () => {
    const admin = await signUpAdmin(app);
    await insertSubscriber("one@example.com");

    expect((await get(admin, "/api/newsletter/admin/stats")).status).toBe(200);
    const list = await get(admin, "/api/newsletter/admin/subscribers");
    expect(list.status).toBe(200);
    expect(JSON.stringify(list.body.data)).toContain("one@example.com");

    const sent = await send(admin, "post", "/api/newsletter/admin/send", { subject: "News", content: "<p>Hello families!</p>" });
    expect(sent.status).toBe(200);
    expect((await NewsletterSubscriber.findOne({ email: "one@example.com" }).lean())!.lastEmailSent).toBeTruthy();
  });

  it("returns 400 when subject/content are missing", async () => {
    const admin = await signUpAdmin(app);
    await insertSubscriber("one@example.com");
    expect((await send(admin, "post", "/api/newsletter/admin/send", {})).status).toBe(400);
  });

  it("forbids non-admins", async () => {
    const me = await signUp(app, "customer");
    expect((await get(me, "/api/newsletter/admin/subscribers")).status).toBe(403);
    expect((await get(me, "/api/newsletter/admin/stats")).status).toBe(403);
    expect((await send(me, "post", "/api/newsletter/admin/send", { subject: "News", content: "<p>Hello families!</p>" })).status).toBe(403);
  });
});
