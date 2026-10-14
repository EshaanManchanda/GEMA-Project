/**
 * GET /api/events/vendor/analytics was shadowed by the public
 * GET /api/events/:id/analytics ("vendor" taken as an event id → 400).
 */
import request from "supertest";
import { Application } from "express";
import { createTestApp } from "../setup/testApp";
import { connectTestDB, clearTestDB, closeTestDB } from "../setup/testDB";
import { cookie, signUp } from "../setup/session";

jest.mock("../../../services/email.service", () => ({
  sendEmail: jest.fn().mockResolvedValue(undefined),
  emailService: new Proxy({}, { get: () => jest.fn().mockResolvedValue(undefined) }),
}));
jest.mock("../../../config/firebase", () => ({ initializeFirebase: jest.fn() }));

let app: Application;
beforeAll(async () => {
  await connectTestDB();
  app = createTestApp();
});
afterEach(clearTestDB);
afterAll(closeTestDB);

it("a vendor reaches their own analytics", async () => {
  const vendor = await signUp(app, "vendor");
  const res = await request(app).get("/api/events/vendor/analytics").set("Cookie", cookie(vendor));
  expect(res.status).toBe(200);
});

it("anonymous callers are refused", async () => {
  const res = await request(app).get("/api/events/vendor/analytics");
  expect(res.status).toBe(401);
});
