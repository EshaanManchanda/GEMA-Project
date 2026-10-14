import "../setup/mocks";
import request from "supertest";
import { Application } from "express";
import { Types } from "mongoose";
import AnalyticsEvent from "../../../models/AnalyticsEvent";
import { createTestApp } from "../setup/testApp";
import { connectTestDB, clearTestDB, closeTestDB } from "../setup/testDB";

let app: Application;
beforeAll(async () => {
  await connectTestDB();
  app = createTestApp();
});
afterEach(clearTestDB);
afterAll(closeTestDB);

const track = (body: object) => request(app).post("/api/analytics/track").send(body);

it("records a valid anonymous tracking event (204)", async () => {
  const eventId = String(new Types.ObjectId());

  const res = await track({ type: "similarEventClicked", eventId, sourceEventId: String(new Types.ObjectId()), section: "similar", position: 2, sessionId: "s".repeat(150) });

  expect(res.status).toBe(204);
  const saved = (await AnalyticsEvent.findOne({ eventId }).lean())!;
  expect(saved).toMatchObject({ type: "similarEventClicked", section: "similar", position: 2 });
  expect(saved.sessionId).toHaveLength(100);
});

it.each([
  ["unknown type", { type: "hack", eventId: String(new Types.ObjectId()) }],
  ["missing eventId", { type: "eventViewed" }],
  ["malformed sourceEventId", { type: "eventViewed", eventId: String(new Types.ObjectId()), sourceEventId: "x" }],
  ["unknown section", { type: "eventViewed", eventId: String(new Types.ObjectId()), section: "ads" }],
])("returns 400 for %s and stores nothing", async (_label, body) => {
  expect((await track(body)).status).toBe(400);
  expect(await AnalyticsEvent.countDocuments()).toBe(0);
});
