import "../setup/mocks";
import request from "supertest";
import { Application } from "express";
import { Types } from "mongoose";
import AnnouncementBar from "../../../models/AnnouncementBar";
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

const send = (s: Session, method: "post" | "put" | "patch" | "delete", url: string, body: object = {}) =>
  request(app)[method](url).set("Cookie", cookie(s)).set("x-csrf-token", s.csrfToken).send(body);
const get = (s: Session, url: string) => request(app).get(url).set("Cookie", cookie(s));

const body = { message: "Free shipping!", backgroundColor: "#3B82F6", textColor: "#FFFFFF", variant: "info", displayOrder: 0, status: "active", isActive: true, targetPages: "all" };

it("creates, lists, updates and deletes an announcement; active ones are public", async () => {
  const admin = await signUpAdmin(app);

  const created = await send(admin, "post", "/api/announcements", body);
  expect(created.status).toBe(201);
  const id = created.body.data.announcement._id;

  const active = await request(app).get("/api/announcements/active");
  expect(active.body.data.announcements.map((a: { _id: string }) => a._id)).toEqual([id]);
  expect((await get(admin, `/api/announcements/${id}`)).status).toBe(200);
  expect((await get(admin, "/api/announcements")).status).toBe(200);

  expect((await send(admin, "put", `/api/announcements/${id}`, { message: "Sale ends today" })).status).toBe(200);
  expect((await AnnouncementBar.findById(id).lean())!.message).toBe("Sale ends today");

  expect((await send(admin, "patch", "/api/announcements/display-orders", { orders: [{ id, displayOrder: 2 }] })).status).toBe(200);
  expect((await AnnouncementBar.findById(id).lean())!.displayOrder).toBe(2);

  expect((await send(admin, "delete", `/api/announcements/${id}`)).status).toBe(200);
  expect(await AnnouncementBar.countDocuments()).toBe(0);
});

it("records impressions, clicks and dismissals publicly", async () => {
  const admin = await signUpAdmin(app);
  const id = (await send(admin, "post", "/api/announcements", body)).body.data.announcement._id;

  await request(app).post(`/api/announcements/${id}/impression`);
  await request(app).post(`/api/announcements/${id}/click`);
  await request(app).post(`/api/announcements/${id}/dismiss`);

  expect((await AnnouncementBar.findById(id).lean())!).toMatchObject({ impressions: 1, clicks: 1, dismissals: 1 });
  expect((await request(app).post("/api/announcements/bad/click")).status).toBe(400);
});

it("returns 400 for invalid payloads and 404 for unknown ids", async () => {
  const admin = await signUpAdmin(app);

  expect((await send(admin, "post", "/api/announcements", { ...body, message: "" })).status).toBe(400);
  expect((await send(admin, "post", "/api/announcements", { ...body, variant: "loud" })).status).toBe(400);
  expect((await send(admin, "post", "/api/announcements", { ...body, targetPages: "some" })).status).toBe(400);
  expect(await AnnouncementBar.countDocuments()).toBe(0);
  expect((await send(admin, "put", `/api/announcements/${new Types.ObjectId()}`, { message: "x" })).status).toBe(404);
});

it("forbids non-admins", async () => {
  const user = await signUp(app, "customer");
  expect((await get(user, "/api/announcements")).status).toBe(403);
  expect((await send(user, "post", "/api/announcements", body)).status).toBe(403);
  expect(await AnnouncementBar.countDocuments()).toBe(0);
});
