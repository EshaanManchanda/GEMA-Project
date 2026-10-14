import "../setup/mocks";
import request from "supertest";
import { Application } from "express";
import Gallery from "../../../models/Gallery";
import Event from "../../../models/Event";
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

const images = [{ url: "https://img.example.com/1.jpg", caption: "Fun", order: 0 }];

async function vendorEvent() {
  const vendor = await signUp(app, "vendor");
  const eventId = await insertEvent(await vendorIdOf(vendor), { isDeleted: false });
  return { vendor, eventId };
}

it("lets the event's vendor create, read publicly, update and delete a gallery", async () => {
  const { vendor, eventId } = await vendorEvent();

  const created = await send(vendor, "post", "/api/galleries", { eventId, type: "messy", images });
  expect(created.status).toBe(201);
  const id = created.body.data.gallery._id;
  expect(String((await Event.findById(eventId).lean())!.galleryId)).toBe(id);

  const pub = await request(app).get(`/api/galleries/event/${eventId}`);
  expect(pub.status).toBe(200);
  expect(pub.body.data.gallery.images).toHaveLength(1);

  expect((await send(vendor, "put", `/api/galleries/${id}`, { type: "grid" })).status).toBe(200);
  expect((await Gallery.findById(id).lean())!.type).toBe("grid");

  expect((await send(vendor, "delete", `/api/galleries/${id}`)).status).toBe(200);
  expect(await Gallery.countDocuments()).toBe(0);
  expect((await Event.findById(eventId).lean())!.galleryId).toBeUndefined();
});

it("lets an admin manage any event's gallery", async () => {
  const { eventId } = await vendorEvent();
  const admin = await signUpAdmin(app);
  expect((await send(admin, "post", "/api/galleries", { eventId, images })).status).toBe(201);
});

it("hides another vendor's event and gallery (404) and leaves them untouched", async () => {
  const { vendor, eventId } = await vendorEvent();
  const id = (await send(vendor, "post", "/api/galleries", { eventId, images })).body.data.gallery._id;
  const other = await signUp(app, "vendor");

  expect((await send(other, "post", "/api/galleries", { eventId, images })).status).toBe(404);
  expect((await send(other, "put", `/api/galleries/${id}`, { type: "messy" })).status).toBe(404);
  expect((await send(other, "delete", `/api/galleries/${id}`)).status).toBe(404);
  expect(await Gallery.countDocuments()).toBe(1);
});

it("forbids customers", async () => {
  const { eventId } = await vendorEvent();
  const customer = await signUp(app, "customer");
  expect((await send(customer, "post", "/api/galleries", { eventId, images })).status).toBe(403);
});

it("returns 400 for a malformed public eventId and 404 when no gallery exists", async () => {
  const { eventId } = await vendorEvent();
  expect((await request(app).get("/api/galleries/event/bad")).status).toBe(400);
  expect((await request(app).get(`/api/galleries/event/${eventId}`)).status).toBe(404);
});

it("rejects an invalid gallery type", async () => {
  const { vendor, eventId } = await vendorEvent();
  const res = await send(vendor, "post", "/api/galleries", { eventId, type: "collage", images });
  expect(res.status).toBe(400);
  expect(await Gallery.countDocuments()).toBe(0);
});

it.failing("BUG: malformed eventId on create returns 400, not 500 (validators run but no validateRequest)", async () => {
  const { vendor } = await vendorEvent();
  expect((await send(vendor, "post", "/api/galleries", { eventId: "bad", images })).status).toBe(400);
});

it.failing("BUG: non-array images on update returns 400, not 500", async () => {
  const { vendor, eventId } = await vendorEvent();
  const id = (await send(vendor, "post", "/api/galleries", { eventId, images })).body.data.gallery._id;

  expect((await send(vendor, "put", `/api/galleries/${id}`, { images: "nope" })).status).toBe(400);
});
