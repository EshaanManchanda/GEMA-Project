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
  request(app).post(`/api/vendor/venues/${id}/claim`).set("Cookie", cookie(s)).set("x-csrf-token", s.csrfToken);
const get = (s: Session, url: string) => request(app).get(url).set("Cookie", cookie(s));

async function affiliateVenue(extra: Record<string, unknown> = {}) {
  const platform = await signUp(app, "vendor");
  return insertEvent(await vendorIdOf(platform), {
    ...savableEventFields,
    type: "Venue",
    isAffiliateEvent: true,
    externalBookingLink: "https://partner.example.com/venue",
    claimStatus: "unclaimed",
    affiliateClickTracking: { totalClicks: 0, uniqueClicks: 0 },
    ...extra,
  });
}

it("lets a vendor claim an unclaimed affiliate venue and lists it as claimed", async () => {
  const venueId = await affiliateVenue();
  const vendor = await signUp(app, "vendor");

  expect((await claim(vendor, venueId)).status).toBe(200);
  const saved = (await Event.findById(venueId).lean())!;
  expect(saved.claimStatus).toBe("claimed");
  expect(String(saved.vendorId)).toBe(await vendorIdOf(vendor));
  expect(JSON.stringify((await get(vendor, "/api/vendor/claimed-venues")).body)).toContain(venueId);
});

it("refuses double claims, bad ids, and non-vendor callers", async () => {
  const venueId = await affiliateVenue();
  const first = await signUp(app, "vendor");
  const second = await signUp(app, "vendor");
  const customer = await signUp(app, "customer");
  await claim(first, venueId);

  expect((await claim(second, venueId)).status).toBe(400);
  expect((await claim(second, "bad")).status).toBe(400);
  expect((await claim(customer, venueId)).status).toBe(403);
});

it("restricts global venue-affiliate analytics to admins", async () => {
  const admin = await signUpAdmin(app);
  const vendor = await signUp(app, "vendor");
  expect((await get(admin, "/api/admin/venue-affiliate-analytics")).status).toBe(200);
  expect((await get(vendor, "/api/admin/venue-affiliate-analytics")).status).toBe(403);
});

it.failing("BUG: anonymous visitors can track a venue click (route is shadowed by /venues authenticate)", async () => {
  const venueId = await affiliateVenue();

  const res = await request(app).post(`/api/venues/${venueId}/track-click`).send({ sessionId: "s1" });

  expect(res.status).toBe(200);
});
