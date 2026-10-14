import "../setup/mocks";
import request from "supertest";
import { Application } from "express";
import { Types } from "mongoose";
import { NotificationTemplate } from "../../../models/index";
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

const BASE = "/api/admin/notification-templates";
const send = (s: Session, method: "post" | "patch" | "delete", url: string, body: object = {}) =>
  request(app)[method](url).set("Cookie", cookie(s)).set("x-csrf-token", s.csrfToken).send(body);
const get = (s: Session, url: string) => request(app).get(url).set("Cookie", cookie(s));

const body = { key: "booking_confirmed", channel: "whatsapp", provider: "cunnekt", purpose: "transactional", providerTemplateName: "booking_ok_v1" };

it("creates, lists, reads, updates and deletes a template", async () => {
  const admin = await signUpAdmin(app);

  const created = await send(admin, "post", BASE, body);
  expect(created.status).toBe(201);
  const id = created.body.data._id;
  expect(created.body.data).toMatchObject({ languageCode: "en", isEnabled: true });

  expect((await get(admin, `${BASE}?channel=whatsapp`)).body.data).toHaveLength(1);
  expect((await get(admin, `${BASE}/${id}`)).body.data.key).toBe("booking_confirmed");

  expect((await send(admin, "patch", `${BASE}/${id}`, { isEnabled: false, key: "renamed" })).status).toBe(200);
  expect((await NotificationTemplate.findById(id).lean())!).toMatchObject({ isEnabled: false, key: "booking_confirmed" });

  expect((await send(admin, "delete", `${BASE}/${id}`)).status).toBe(200);
  expect(await NotificationTemplate.countDocuments()).toBe(0);
});

it("returns 400 for missing fields or an unknown channel, 409 for a duplicate", async () => {
  const admin = await signUpAdmin(app);

  expect((await send(admin, "post", BASE, { key: "x" })).status).toBe(400);
  expect((await send(admin, "post", BASE, { ...body, channel: "pigeon" })).status).toBe(400);
  await send(admin, "post", BASE, body);
  expect((await send(admin, "post", BASE, body)).status).toBe(409);
  expect(await NotificationTemplate.countDocuments()).toBe(1);
});

it("returns 400 for an empty update and 404 for an unknown id", async () => {
  const admin = await signUpAdmin(app);
  const id = (await send(admin, "post", BASE, body)).body.data._id;

  expect((await send(admin, "patch", `${BASE}/${id}`, { key: "only-immutable" })).status).toBe(400);
  expect((await get(admin, `${BASE}/${new Types.ObjectId()}`)).status).toBe(404);
});

it.failing("BUG: a malformed template id returns 400, not 500", async () => {
  const admin = await signUpAdmin(app);
  expect((await get(admin, `${BASE}/not-an-id`)).status).toBe(400);
});

it("forbids non-admins", async () => {
  const vendor = await signUp(app, "vendor");
  expect((await get(vendor, BASE)).status).toBe(403);
  expect((await send(vendor, "post", BASE, body)).status).toBe(403);
  expect(await NotificationTemplate.countDocuments()).toBe(0);
});
