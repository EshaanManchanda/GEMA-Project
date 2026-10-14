import "../setup/mocks";
import request from "supertest";
import { Application } from "express";
import { Types } from "mongoose";
import Vendor from "../../../models/Vendor";
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

const BASE = "/api/admin/vendors";
const put = (s: Session, url: string, body: object) =>
  request(app).put(url).set("Cookie", cookie(s)).set("x-csrf-token", s.csrfToken).send(body);
const get = (s: Session, url: string) => request(app).get(url).set("Cookie", cookie(s));

async function setup() {
  const admin = await signUpAdmin(app);
  const vendor = await signUp(app, "vendor");
  return { admin, vendor, vendorId: await vendorIdOf(vendor) };
}

it("lists vendors, reads one, and reports stats", async () => {
  const { admin, vendorId } = await setup();

  const list = await get(admin, BASE);
  expect(list.status).toBe(200);
  expect(JSON.stringify(list.body.data)).toContain(vendorId);
  expect((await get(admin, `${BASE}/${vendorId}`)).status).toBe(200);
  expect((await get(admin, `${BASE}/stats`)).status).toBe(200);
});

it("verifies and suspends a vendor", async () => {
  const { admin, vendorId } = await setup();

  expect((await put(admin, `${BASE}/${vendorId}/verification`, { verificationStatus: "verified" })).status).toBe(200);
  expect((await Vendor.findById(vendorId).lean())!.verificationStatus).toBe("verified");

  expect((await put(admin, `${BASE}/${vendorId}/status`, { isSuspended: true, suspensionReason: "Fraud check" })).status).toBe(200);
  expect((await Vendor.findById(vendorId).lean())!).toMatchObject({ isSuspended: true, suspensionReason: "Fraud check" });
});

it("returns 400 for an unknown verification status or malformed id, 404 for an unknown vendor", async () => {
  const { admin, vendorId } = await setup();

  expect((await put(admin, `${BASE}/${vendorId}/verification`, { verificationStatus: "golden" })).status).toBe(400);
  expect((await put(admin, `${BASE}/bad/status`, { isActive: false })).status).toBe(400);
  expect((await put(admin, `${BASE}/${new Types.ObjectId()}/verification`, { verificationStatus: "verified" })).status).toBe(404);
  expect((await Vendor.findById(vendorId).lean())!.verificationStatus).toBe("pending");
});

it("forbids vendors from approving themselves", async () => {
  const { vendor, vendorId } = await setup();

  expect((await put(vendor, `${BASE}/${vendorId}/verification`, { verificationStatus: "verified" })).status).toBe(403);
  expect((await get(vendor, BASE)).status).toBe(403);
  expect((await Vendor.findById(vendorId).lean())!.verificationStatus).toBe("pending");
});
