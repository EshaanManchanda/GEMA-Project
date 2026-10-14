/**
 * Review-by-link: admins/vendors share one link per event with (often
 * offline) attendees. The link carries a secret token; knowing an event id
 * is not enough. The link may create accounts for new attendees, but must
 * never act as an existing real account without that user logged in.
 */
import request from "supertest";
import { Application } from "express";
import Event from "../../../models/Event";
import User from "../../../models/User";
import Review from "../../../models/Review";
import Registration from "../../../models/Registration";
import { createTestApp } from "../setup/testApp";
import { connectTestDB, clearTestDB, closeTestDB } from "../setup/testDB";
import { cookie, insertEvent, signUp, signUpAdmin, vendorIdOf, Session } from "../setup/session";

jest.mock("../../../services/email.service", () => ({
  sendEmail: jest.fn().mockResolvedValue(undefined),
  emailService: new Proxy({}, { get: () => jest.fn().mockResolvedValue(undefined) }),
}));
jest.mock("../../../config/firebase", () => ({ initializeFirebase: jest.fn() }));
jest.mock("../../../modules/certificates/services/certificate.service", () => ({
  certificateService: { issueForEvent: jest.fn().mockResolvedValue(undefined) },
}));

let app: Application;
beforeAll(async () => {
  await connectTestDB();
  app = createTestApp();
});
afterEach(clearTestDB);
afterAll(closeTestDB);

const generate = (s: Session, eventId: string) =>
  request(app)
    .post(`/api/reviews/admin/link/${eventId}/generate`)
    .set("Cookie", cookie(s))
    .set("x-csrf-token", s.csrfToken);

async function sharedLink() {
  const admin = await signUpAdmin(app);
  const vendor = await signUp(app, "vendor");
  const eventId = await insertEvent(await vendorIdOf(vendor));
  const res = await generate(admin, eventId);
  const token = new URL(res.body.data.reviewLink).searchParams.get("t") ?? "";
  return { eventId, token, vendor };
}

const open = (eventId: string, email: string, t?: string) =>
  request(app).get(`/api/reviews/link/${eventId}`).query({ email, ...(t ? { t } : {}) });

const submit = (eventId: string, email: string, t?: string, s?: Session) => {
  const req = request(app).post(`/api/reviews/link/${eventId}`);
  if (s) req.set("Cookie", cookie(s)).set("x-csrf-token", s.csrfToken);
  return req.send({ email, rating: 5, ...(t ? { t } : {}) });
};

it("the generated link carries a secret token", async () => {
  const { token } = await sharedLink();
  expect(token.length).toBeGreaterThanOrEqual(20);
});

it("refuses callers without the link token, and with a wrong one", async () => {
  const { eventId } = await sharedLink();
  expect((await open(eventId, "kid@school.test")).status).toBe(403);
  expect((await open(eventId, "kid@school.test", "wrong-token-wrong-token")).status).toBe(403);
  expect((await submit(eventId, "kid@school.test")).status).toBe(403);
  expect(await User.countDocuments({ email: "kid@school.test" })).toBe(0);
});

it("an offline attendee with the link can review, without leaking ids", async () => {
  const { eventId, token } = await sharedLink();

  const ctx = await open(eventId, "kid@school.test", token);
  expect(ctx.status).toBe(200);
  expect(ctx.body.data.userId).toBeUndefined();

  const res = await submit(eventId, "kid@school.test", token);
  expect(res.status).toBe(201);
  expect(await Review.countDocuments({ event: eventId })).toBe(1);
});

it("never acts as an existing real account for an anonymous link holder", async () => {
  const { eventId, token } = await sharedLink();
  const parent = await signUp(app, "customer");
  const email = (await User.findById(parent.userId).lean())!.email;

  const ctx = await open(eventId, email, token);
  expect(ctx.status).toBe(200);
  expect(ctx.body.data.requiresLogin).toBe(true);
  expect(await Registration.countDocuments({ userId: parent.userId })).toBe(0);

  expect((await submit(eventId, email, token)).status).toBe(403);
  expect(await Review.countDocuments({ event: eventId })).toBe(0);

  // Logged in as that account, it works.
  expect((await submit(eventId, email, token, parent)).status).toBe(201);
});

it("a vendor cannot generate (rotate) the link for another vendor's event", async () => {
  const { eventId } = await sharedLink();
  const otherVendor = await signUp(app, "vendor");
  const before = (await Event.findById(eventId).select("+reviewToken").lean()) as any;

  const res = await generate(otherVendor, eventId);

  expect(res.status).toBe(403);
  const after = (await Event.findById(eventId).select("+reviewToken").lean()) as any;
  expect(after.reviewToken).toBe(before.reviewToken);
});

it("the owning vendor can generate their event's link", async () => {
  const { eventId, vendor } = await sharedLink();
  expect((await generate(vendor, eventId)).status).toBe(200);
});
