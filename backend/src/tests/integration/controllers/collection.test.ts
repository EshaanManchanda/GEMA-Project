import "../setup/mocks";
import request from "supertest";
import { Application } from "express";
import { Types } from "mongoose";
import Collection from "../../../models/Collection";
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

const send = (s: Session, method: "post" | "put" | "delete", url: string, body: object = {}) =>
  request(app)[method](url).set("Cookie", cookie(s)).set("x-csrf-token", s.csrfToken).send(body);

const body = { title: "Rainy Day Fun", description: "Indoor picks", icon: "https://img.example.com/rain.png" };

async function liveEvent() {
  const vendor = await signUp(app, "vendor");
  return insertEvent(await vendorIdOf(vendor), { isDeleted: false });
}

it("lets an admin create, update, attach events to and soft-delete a collection", async () => {
  const admin = await signUpAdmin(app);
  const eventId = await liveEvent();

  const created = await send(admin, "post", "/api/collections", body);
  expect(created.status).toBe(201);
  const id = created.body.data.collection._id;
  expect((await Collection.findById(id).lean())!.title).toBe("Rainy Day Fun");

  expect((await send(admin, "put", `/api/collections/${id}`, { title: "Rainy Days" })).status).toBe(200);
  expect((await Collection.findById(id).lean())!.title).toBe("Rainy Days");

  expect((await send(admin, "post", `/api/collections/${id}/events`, { eventId })).status).toBe(200);
  expect((await Collection.findById(id).lean())!.events!.map(String)).toEqual([eventId]);
  expect((await send(admin, "delete", `/api/collections/${id}/events/${eventId}`)).status).toBe(200);
  expect((await Collection.findById(id).lean())!.events).toHaveLength(0);

  expect((await send(admin, "delete", `/api/collections/${id}`)).status).toBe(200);
  expect((await Collection.findById(id).lean())!.isActive).toBe(false);
});

it("serves active collections publicly by id and hides inactive ones", async () => {
  const admin = await signUpAdmin(app);
  const id = (await send(admin, "post", "/api/collections", body)).body.data.collection._id;

  expect((await request(app).get("/api/collections")).status).toBe(200);
  expect((await request(app).get(`/api/collections/${id}`)).status).toBe(200);

  await send(admin, "delete", `/api/collections/${id}`);
  expect((await request(app).get(`/api/collections/${id}`)).status).toBe(404);
});

it("returns 400 for missing fields, a non-URL icon, and unknown events", async () => {
  const admin = await signUpAdmin(app);

  expect((await send(admin, "post", "/api/collections", { ...body, title: "" })).status).toBe(400);
  expect((await send(admin, "post", "/api/collections", { ...body, icon: "not a url" })).status).toBe(400);
  expect((await send(admin, "post", "/api/collections", { ...body, events: [String(new Types.ObjectId())] })).status).toBe(400);
  expect((await request(app).get("/api/collections?limit=500")).status).toBe(400);
  expect(await Collection.countDocuments()).toBe(0);
});

it("returns 404 when adding an unknown event", async () => {
  const admin = await signUpAdmin(app);
  const id = (await send(admin, "post", "/api/collections", body)).body.data.collection._id;
  expect((await send(admin, "post", `/api/collections/${id}/events`, { eventId: String(new Types.ObjectId()) })).status).toBe(404);
});

it("returns 400/404 when deleting with a malformed id", async () => {
  const admin = await signUpAdmin(app);
  expect([400, 404]).toContain((await send(admin, "delete", "/api/collections/not-an-id")).status);
});

it("forbids non-admins from writing", async () => {
  const vendor = await signUp(app, "vendor");
  expect((await send(vendor, "post", "/api/collections", body)).status).toBe(403);
  expect(await Collection.countDocuments()).toBe(0);
});

it("serves the admin collection list and stats (admin.collection routes)", async () => {
  const admin = await signUpAdmin(app);
  await send(admin, "post", "/api/collections", body);

  expect((await request(app).get("/api/admin/collections").set("Cookie", cookie(admin))).status).toBe(200);
  expect((await request(app).get("/api/admin/collections/stats").set("Cookie", cookie(admin))).status).toBe(200);
});
