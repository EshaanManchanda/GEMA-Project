import "../setup/mocks";
import request from "supertest";
import { Application } from "express";
import { Types } from "mongoose";
import Notification from "../../../models/Notification";
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

const send = (s: Session, method: "post" | "put" | "delete", url: string, body: object = {}) =>
  request(app)[method](url).set("Cookie", cookie(s)).set("x-csrf-token", s.csrfToken).send(body);
const get = (s: Session, url: string) => request(app).get(url).set("Cookie", cookie(s));

async function insertNotification(userId: string, extra: Record<string, unknown> = {}) {
  const _id = new Types.ObjectId();
  await Notification.collection.insertOne({
    _id,
    userId: new Types.ObjectId(userId),
    type: "promotional",
    title: "Hello",
    message: "World",
    priority: "medium",
    channels: ["in_app"],
    isRead: false,
    clickCount: 0,
    delivery: [],
    scheduledFor: new Date(Date.now() - 1000),
    createdAt: new Date(),
    ...extra,
  });
  return String(_id);
}

describe("user notification endpoints", () => {
  it("lists only the caller's notifications with an unread count", async () => {
    const me = await signUp(app, "customer");
    const other = await signUp(app, "customer");
    await insertNotification(me.userId);
    await insertNotification(other.userId);

    const res = await get(me, "/api/notifications/my");

    expect(res.status).toBe(200);
    expect(res.body.data.notifications).toHaveLength(1);
    expect(res.body.data.unreadCount).toBe(1);
    expect((await get(me, "/api/notifications/unread-count")).body.data.count).toBe(1);
  });

  it("reads, marks read, and marks clicked an own notification", async () => {
    const me = await signUp(app, "customer");
    const id = await insertNotification(me.userId);

    expect((await get(me, `/api/notifications/${id}`)).body.data._id).toBe(id);
    expect((await send(me, "put", `/api/notifications/${id}/read`)).status).toBe(200);
    expect((await Notification.findById(id).lean())!.isRead).toBe(true);
    expect((await send(me, "put", `/api/notifications/${id}/clicked`)).status).toBe(200);
    expect((await Notification.findById(id).lean())!.clickCount).toBe(1);
  });

  it("marks all as read", async () => {
    const me = await signUp(app, "customer");
    await insertNotification(me.userId);
    await insertNotification(me.userId);

    const res = await send(me, "put", "/api/notifications/mark-all-read");

    expect(res.status).toBe(200);
    expect(await Notification.countDocuments({ userId: me.userId, isRead: false })).toBe(0);
  });

  it("hides other users' notifications (404) and rejects malformed ids (400)", async () => {
    const me = await signUp(app, "customer");
    const other = await signUp(app, "customer");
    const id = await insertNotification(other.userId);

    expect((await get(me, `/api/notifications/${id}`)).status).toBe(404);
    expect((await send(me, "put", `/api/notifications/${id}/read`)).status).toBe(404);
    expect((await Notification.findById(id).lean())!.isRead).toBe(false);
    expect((await get(me, "/api/notifications/bad-id")).status).toBe(400);
  });
});

describe("admin notification endpoints", () => {
  it("creates, lists, updates and deletes a notification", async () => {
    const admin = await signUpAdmin(app);
    const user = await signUp(app, "customer");

    const created = await send(admin, "post", "/api/notifications", { userId: user.userId, type: "promotional", title: "Sale", message: "50% off" });
    expect(created.status).toBe(201);
    const id = created.body.data._id;
    expect(await Notification.countDocuments({ userId: user.userId })).toBe(1);

    const list = await get(admin, "/api/notifications");
    expect(list.status).toBe(200);
    expect(list.body.data.pagination.total).toBe(1);

    expect((await send(admin, "put", `/api/notifications/${id}`, { title: "Big sale" })).status).toBe(200);
    expect((await Notification.findById(id).lean())!.title).toBe("Big sale");

    expect((await send(admin, "delete", `/api/notifications/${id}`)).status).toBe(200);
    expect(await Notification.countDocuments({ _id: id })).toBe(0);
  });

  it("sends bulk notifications and reports analytics", async () => {
    const admin = await signUpAdmin(app);
    const a = await signUp(app, "customer");
    const b = await signUp(app, "customer");

    const res = await send(admin, "post", "/api/notifications/bulk/send", { userIds: [a.userId, b.userId], type: "promotional", title: "T", message: "M" });

    expect(res.status).toBe(201);
    expect(await Notification.countDocuments()).toBe(2);
    expect((await get(admin, "/api/notifications/analytics/overview")).status).toBe(200);
  });

  it("returns 400 for invalid create/bulk payloads", async () => {
    const admin = await signUpAdmin(app);
    const user = await signUp(app, "customer");

    expect((await send(admin, "post", "/api/notifications", { userId: user.userId, type: "nope", title: "T", message: "M" })).status).toBe(400);
    expect((await send(admin, "post", "/api/notifications", { userId: user.userId, type: "promotional", message: "M" })).status).toBe(400);
    expect((await send(admin, "post", "/api/notifications", { type: "promotional", title: "T", message: "M" })).status).toBe(400);
    expect((await send(admin, "post", "/api/notifications/bulk/send", { userIds: [], type: "promotional", title: "T", message: "M" })).status).toBe(400);
    expect(await Notification.countDocuments()).toBe(0);
  });

  it("returns 400 when an update sets an invalid userId", async () => {
    const admin = await signUpAdmin(app);
    const user = await signUp(app, "customer");
    const id = await insertNotification(user.userId);

    expect((await send(admin, "put", `/api/notifications/${id}`, { userId: "not-an-id" })).status).toBe(400);
  });

  it("forbids non-admins from admin endpoints", async () => {
    const user = await signUp(app, "customer");
    const id = await insertNotification(user.userId);

    expect((await get(user, "/api/notifications")).status).toBe(403);
    expect((await send(user, "post", "/api/notifications", { userId: user.userId, type: "promotional", title: "T", message: "M" })).status).toBe(403);
    expect((await send(user, "delete", `/api/notifications/${id}`)).status).toBe(403);
    expect(await Notification.countDocuments({ _id: id })).toBe(1);
  });
});
