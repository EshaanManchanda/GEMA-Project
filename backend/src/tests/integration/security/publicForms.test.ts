/**
 * Public forms that write data or send mail are rate limited (per IP) and
 * reject malformed input with 400 instead of crashing.
 */
import request from "supertest";
import { Application } from "express";
import { createTestApp } from "../setup/testApp";
import { connectTestDB, clearTestDB, closeTestDB } from "../setup/testDB";

jest.mock("../../../services/email.service", () => {
  const svc = new Proxy({}, { get: () => jest.fn().mockResolvedValue(undefined) });
  return { __esModule: true, default: svc, emailService: svc, sendEmail: jest.fn() };
});
jest.mock("../../../config/firebase", () => ({ initializeFirebase: jest.fn() }));

const EVENT = "507f1f77bcf86cd799439011";

let app: Application;
beforeEach(() => {
  app = createTestApp(); // fresh app per test; limiter stores are module-level, so each test uses its own form
});
beforeAll(connectTestDB);
afterEach(clearTestDB);
afterAll(closeTestDB);

it("event lead form rejects non-string and oversized fields with 400", async () => {
  const typeConfusion = await request(app).post(`/api/lead-pages/${EVENT}/lead`).send({ name: { $gt: "" }, email: "a@b.co" });
  expect(typeConfusion.status).toBe(400);
  const huge = await request(app).post(`/api/lead-pages/${EVENT}/lead`).send({ name: "x".repeat(5000), email: "a@b.co" });
  expect(huge.status).toBe(400);
});

it.each([
  ["contact", "/api/contact"],
  ["newsletter", "/api/newsletter/subscribe"],
  ["partnership", "/api/partnerships"],
  ["event lead", `/api/lead-pages/${EVENT}/lead`],
  ["competition draft", "/api/competition/save-draft"],
])("%s form is rate limited", async (_label, path) => {
  let last = 0;
  for (let i = 0; i < 61 && last !== 429; i++) {
    last = (await request(app).post(path).send({})).status;
  }
  expect(last).toBe(429);
});
