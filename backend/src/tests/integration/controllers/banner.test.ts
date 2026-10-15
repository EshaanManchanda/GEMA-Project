import "../setup/mocks";
import request from "supertest";
import { Application } from "express";
import { Types } from "mongoose";
import Banner from "../../../models/Banner";
import { createTestApp } from "../setup/testApp";
import { connectTestDB, clearTestDB, closeTestDB } from "../setup/testDB";
import { Session, cookie, signUp, signUpAdmin } from "../setup/session";
import { insertMedia, ensureCollections } from "../setup/factories";

let app: Application;
beforeAll(async () => {
  await connectTestDB();
  await ensureCollections(); // services here write inside transactions
  app = createTestApp();
});
afterEach(clearTestDB);
afterAll(closeTestDB);

const send = (s: Session, method: "post" | "put" | "patch" | "delete", url: string, body: object = {}) =>
  request(app)[method](url).set("Cookie", cookie(s)).set("x-csrf-token", s.csrfToken).send(body);
const get = (s: Session, url: string) => request(app).get(url).set("Cookie", cookie(s));

const bannerBody = (imageAsset: string) => ({ title: "Summer", imageAsset, displayOrder: 0, status: "active", isActive: true });

it("creates, reads, updates, reorders and deletes a banner; only active ones are public", async () => {
  const admin = await signUpAdmin(app);
  const imageAsset = await insertMedia();

  const created = await send(admin, "post", "/api/banners", bannerBody(imageAsset));
  expect(created.status).toBe(201);
  const id = created.body.data.banner._id;
  expect(String((await Banner.findById(id).lean())!.createdBy)).toBe(admin.userId);

  const active = await request(app).get("/api/banners/active");
  expect(active.body.data.banners.map((b: { _id: string }) => b._id)).toEqual([id]);
  expect((await get(admin, `/api/banners/${id}`)).body.data.banner.title).toBe("Summer");
  expect((await get(admin, "/api/banners")).status).toBe(200);

  expect((await send(admin, "put", `/api/banners/${id}`, { title: "Winter", status: "inactive" })).status).toBe(200);
  expect((await Banner.findById(id).lean())!.title).toBe("Winter");
  expect((await request(app).get("/api/banners/active")).body.data.banners).toEqual([]);

  expect((await send(admin, "patch", "/api/banners/display-orders", { orders: [{ id, displayOrder: 3 }] })).status).toBe(200);
  expect((await Banner.findById(id).lean())!.displayOrder).toBe(3);

  expect((await send(admin, "delete", `/api/banners/${id}`)).status).toBe(200);
  expect(await Banner.countDocuments()).toBe(0);
});

it("returns 400 for missing image, bad status and end-before-start dates", async () => {
  const admin = await signUpAdmin(app);
  const imageAsset = await insertMedia();

  expect((await send(admin, "post", "/api/banners", { ...bannerBody(imageAsset), imageAsset: undefined })).status).toBe(400);
  expect((await send(admin, "post", "/api/banners", { ...bannerBody(imageAsset), status: "live" })).status).toBe(400);
  expect((await send(admin, "post", "/api/banners", { ...bannerBody(imageAsset), startDate: "2030-02-01", endDate: "2030-01-01" })).status).toBe(400);
  expect((await send(admin, "put", "/api/banners/not-an-id", { title: "X" })).status).toBe(400);
  expect(await Banner.countDocuments()).toBe(0);
});

it("returns 404 for unknown banners", async () => {
  const admin = await signUpAdmin(app);
  expect((await get(admin, `/api/banners/${new Types.ObjectId()}`)).status).toBe(404);
  expect((await send(admin, "delete", `/api/banners/${new Types.ObjectId()}`)).status).toBe(404);
});

it("creating a banner with an imageAsset id that does not exist returns 400/404, not 500", async () => {
  const admin = await signUpAdmin(app);
  const res = await send(admin, "post", "/api/banners", bannerBody(String(new Types.ObjectId())));
  expect([400, 404]).toContain(res.status);
});

it("forbids non-admins", async () => {
  const vendor = await signUp(app, "vendor");
  expect((await get(vendor, "/api/banners")).status).toBe(403);
  expect((await send(vendor, "post", "/api/banners", bannerBody(await insertMedia()))).status).toBe(403);
  expect(await Banner.countDocuments()).toBe(0);
});
