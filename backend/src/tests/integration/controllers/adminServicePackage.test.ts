import "../setup/mocks";
import request from "supertest";
import { Application } from "express";
import { Types } from "mongoose";
import VendorServicePackage from "../../../models/VendorServicePackage";
import { createTestApp } from "../setup/testApp";
import { connectTestDB, clearTestDB, closeTestDB } from "../setup/testDB";
import { Session, cookie, signUp, signUpAdmin, vendorIdOf } from "../setup/session";

let app: Application;
beforeAll(async () => {
  await connectTestDB();
  app = createTestApp();
});
afterEach(clearTestDB);
afterAll(closeTestDB);

const BASE = "/api/admin/service-packages";
const send = (s: Session, method: "post" | "put" | "delete", url: string, body: object = {}) =>
  request(app)[method](url).set("Cookie", cookie(s)).set("x-csrf-token", s.csrfToken).send(body);
const get = (s: Session, url: string) => request(app).get(url).set("Cookie", cookie(s));

const in30Days = () => new Date(Date.now() + 30 * 864e5).toISOString();
const pkgBody = (vendorId: string) => ({
  vendorId,
  name: "Spring bundle",
  price: 500,
  items: [{ type: "blog_post", unit: "count", quantity: 2 }],
  endDate: in30Days(),
});

async function setup() {
  const admin = await signUpAdmin(app);
  const vendor = await signUp(app, "vendor");
  return { admin, vendor, vendorId: await vendorIdOf(vendor) };
}

it("creates, lists, reads, updates and cancels a package", async () => {
  const { admin, vendorId } = await setup();

  const created = await send(admin, "post", BASE, pkgBody(vendorId));
  expect(created.status).toBe(201);
  const id = created.body.data._id;
  expect((await VendorServicePackage.findById(id).lean())!).toMatchObject({ status: "active", price: 500 });

  expect((await get(admin, `${BASE}?vendorId=${vendorId}`)).body.data).toHaveLength(1);
  expect((await get(admin, `${BASE}/${id}`)).body.data.usage).toEqual([]);

  expect((await send(admin, "put", `${BASE}/${id}`, { name: "Summer bundle" })).status).toBe(200);
  expect((await VendorServicePackage.findById(id).lean())!.name).toBe("Summer bundle");

  expect((await send(admin, "delete", `${BASE}/${id}`, { reason: "Refunded" })).status).toBe(200);
  expect((await VendorServicePackage.findById(id).lean())!.status).toBe("cancelled");
  expect((await send(admin, "put", `${BASE}/${id}`, { name: "Again" })).status).toBe(400);
});

it.each([
  ["bad vendorId", { vendorId: "bad" }],
  ["no items", { items: [] }],
  ["unknown item type", { items: [{ type: "billboard", unit: "count", quantity: 1 }] }],
  ["zero quantity", { items: [{ type: "blog_post", unit: "count", quantity: 0 }] }],
  ["negative price", { price: -1 }],
  ["missing endDate", { endDate: undefined }],
  ["endDate in the past", { endDate: "2000-01-01" }],
])("returns 400 for %s", async (_label, patch) => {
  const { admin, vendorId } = await setup();
  expect((await send(admin, "post", BASE, { ...pkgBody(vendorId), ...patch })).status).toBe(400);
  expect(await VendorServicePackage.countDocuments()).toBe(0);
});

it("returns 404 for an unknown vendor or package", async () => {
  const { admin } = await setup();
  expect((await send(admin, "post", BASE, pkgBody(String(new Types.ObjectId())))).status).toBe(404);
  expect((await get(admin, `${BASE}/${new Types.ObjectId()}`)).status).toBe(404);
});

it("forbids vendors from granting themselves packages", async () => {
  const { vendor, vendorId } = await setup();
  expect((await send(vendor, "post", BASE, pkgBody(vendorId))).status).toBe(403);
  expect(await VendorServicePackage.countDocuments()).toBe(0);
});
