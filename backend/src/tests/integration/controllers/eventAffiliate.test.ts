import "../setup/mocks";
import request from "supertest";
import { Application } from "express";
import Event from "../../../models/Event";
import { createTestApp } from "../setup/testApp";
import { connectTestDB, clearTestDB, closeTestDB } from "../setup/testDB";
import { Session, cookie, signUp, signUpAdmin, vendorIdOf, insertEvent } from "../setup/session";
import { savableEventFields } from "../setup/factories";

let app: Application;
beforeAll(async () => {
  await connectTestDB();
  app = createTestApp();
});
afterEach(clearTestDB);
afterAll(closeTestDB);

const claim = (s: Session, id: string) =>
  request(app).post(`/api/vendor/events/${id}/claim`).set("Cookie", cookie(s)).set("x-csrf-token", s.csrfToken);
const get = (s: Session, url: string) => request(app).get(url).set("Cookie", cookie(s));

async function affiliateEvent(extra: Record<string, unknown> = {}) {
  const platform = await signUp(app, "vendor");
  return insertEvent(await vendorIdOf(platform), {
    ...savableEventFields,
    isAffiliateEvent: true,
    externalBookingLink: "https://partner.example.com/book",
    claimStatus: "unclaimed",
    affiliateClickTracking: { totalClicks: 0, uniqueClicks: 0 },
    ...extra,
  });
}

it("lets a vendor claim an unclaimed affiliate event, which goes back to pending review", async () => {
  const eventId = await affiliateEvent();
  const vendor = await signUp(app, "vendor");

  const res = await claim(vendor, eventId);

  expect(res.status).toBe(200);
  const saved = (await Event.findById(eventId).lean())!;
  expect(saved).toMatchObject({ claimStatus: "claimed", isApproved: false, status: "pending" });
  expect(String(saved.vendorId)).toBe(await vendorIdOf(vendor));
  const claimed = await get(vendor, "/api/vendor/claimed-events");
  expect(claimed.status).toBe(200);
  expect(JSON.stringify(claimed.body)).toContain(eventId);
});

it("refuses a second claim and claims on non-affiliate events", async () => {
  const eventId = await affiliateEvent();
  const plain = await affiliateEvent({ isAffiliateEvent: false });
  const first = await signUp(app, "vendor");
  const second = await signUp(app, "vendor");
  await claim(first, eventId);

  expect((await claim(second, eventId)).status).toBe(400);
  expect(String((await Event.findById(eventId).lean())!.vendorId)).toBe(await vendorIdOf(first));
  expect((await claim(second, plain)).status).toBe(400);
});

it("returns 400 for a malformed id and 404 for an unknown event", async () => {
  const vendor = await signUp(app, "vendor");
  expect((await claim(vendor, "bad")).status).toBe(400);
  expect((await claim(vendor, "64b7f0c2a1b2c3d4e5f60718")).status).toBe(404);
});

it("forbids customers from claiming and non-admins from global analytics", async () => {
  const eventId = await affiliateEvent();
  const customer = await signUp(app, "customer");
  const admin = await signUpAdmin(app);

  expect((await claim(customer, eventId)).status).toBe(403);
  expect((await get(customer, "/api/admin/affiliate-analytics")).status).toBe(403);
  expect((await get(admin, "/api/admin/affiliate-analytics")).status).toBe(200);
});

it("tracks public clicks and returns the external URL", async () => {
  const eventId = await affiliateEvent();

  const res = await request(app).post(`/api/events/${eventId}/track-click`).send({ sessionId: "s1" });
  await request(app).post(`/api/events/${eventId}/track-click`).send({ sessionId: "s1" });

  expect(res.status).toBe(200);
  expect(res.body.externalUrl).toBe("https://partner.example.com/book");
  expect((await Event.findById(eventId).lean())!.affiliateClickTracking).toMatchObject({ totalClicks: 2, uniqueClicks: 1 });
  expect((await request(app).post(`/api/events/${eventId}/track-click`).send({})).status).toBe(400);
});
