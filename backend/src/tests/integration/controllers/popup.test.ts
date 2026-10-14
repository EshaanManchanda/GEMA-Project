import "../setup/mocks";
import request from "supertest";
import { Application } from "express";
import { Types } from "mongoose";
import PopupNotification from "../../../models/PopupNotification";
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

const body = {
  title: "Join us",
  message: "Sign up for camp",
  targetAudience: "all",
  targetPages: "all",
  trigger: "pageLoad",
  frequency: "once",
  displayOrder: 0,
  status: "active",
  isActive: true,
};

it("creates, lists, updates and deletes a popup; active ones are public", async () => {
  const admin = await signUpAdmin(app);

  const created = await send(admin, "post", "/api/popups", body);
  expect(created.status).toBe(201);
  const id = created.body.data.popup._id;

  const active = await request(app).get("/api/popups/active");
  expect(active.body.data.popups.map((p: { _id: string }) => p._id)).toEqual([id]);
  expect((await get(admin, `/api/popups/${id}`)).status).toBe(200);
  expect((await get(admin, "/api/popups")).status).toBe(200);

  expect((await send(admin, "put", `/api/popups/${id}`, { title: "Join now" })).status).toBe(200);
  expect((await PopupNotification.findById(id).lean())!.title).toBe("Join now");

  expect((await send(admin, "patch", "/api/popups/display-orders", { orders: [{ id, displayOrder: 4 }] })).status).toBe(200);
  expect((await PopupNotification.findById(id).lean())!.displayOrder).toBe(4);

  expect((await send(admin, "delete", `/api/popups/${id}`)).status).toBe(200);
  expect(await PopupNotification.countDocuments()).toBe(0);
});

it("hides popups targeted at authenticated users from anonymous visitors", async () => {
  const admin = await signUpAdmin(app);
  await send(admin, "post", "/api/popups", { ...body, targetAudience: "authenticated" });

  expect((await request(app).get("/api/popups/active")).body.data.popups).toEqual([]);
});

it("records impressions and clicks publicly", async () => {
  const admin = await signUpAdmin(app);
  const id = (await send(admin, "post", "/api/popups", body)).body.data.popup._id;

  await request(app).post(`/api/popups/${id}/impression`);
  await request(app).post(`/api/popups/${id}/click`);

  expect((await PopupNotification.findById(id).lean())!).toMatchObject({ impressions: 1, clicks: 1 });
});

it("returns 400 for invalid payloads and 404 for unknown ids", async () => {
  const admin = await signUpAdmin(app);

  expect((await send(admin, "post", "/api/popups", { ...body, title: "" })).status).toBe(400);
  expect((await send(admin, "post", "/api/popups", { ...body, trigger: "magic" })).status).toBe(400);
  expect((await send(admin, "post", "/api/popups", { ...body, frequency: undefined })).status).toBe(400);
  expect(await PopupNotification.countDocuments()).toBe(0);
  expect((await send(admin, "put", `/api/popups/${new Types.ObjectId()}`, { title: "x" })).status).toBe(404);
});

it("forbids non-admins", async () => {
  const user = await signUp(app, "customer");
  expect((await get(user, "/api/popups")).status).toBe(403);
  expect((await send(user, "post", "/api/popups", body)).status).toBe(403);
  expect(await PopupNotification.countDocuments()).toBe(0);
});
