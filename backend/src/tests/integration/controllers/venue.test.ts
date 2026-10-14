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

const send = (s: Session, method: "post" | "put" | "delete", url: string, body: object = {}) =>
  request(app)[method](url).set("Cookie", cookie(s)).set("x-csrf-token", s.csrfToken).send(body);
const get = (s: Session, url: string) => request(app).get(url).set("Cookie", cookie(s));

const venueBody = {
  name: "Fun Hall",
  description: "Big hall",
  address: { street: "1 Main", city: "Dubai", state: "Dubai", country: "AE", zipCode: "00000" },
  capacity: 100,
  venueType: "indoor",
};

async function insertVenue(vendorId: string, extra: Record<string, unknown> = {}) {
  return insertEvent(vendorId, {
    ...savableEventFields,
    type: "Venue",
    title: "My Venue",
    isActive: true,
    location: { city: "Dubai", country: "AE", address: "1 Main" },
    ...extra,
  });
}

async function vendorWithVenue(extra: Record<string, unknown> = {}) {
  const vendor = await signUp(app, "vendor");
  const venueId = await insertVenue(await vendorIdOf(vendor), extra);
  return { vendor, venueId };
}

describe("vendor venue endpoints", () => {
  it("creates a venue from a validator-approved payload", async () => {
    const vendor = await signUp(app, "vendor");

    const res = await send(vendor, "post", "/api/venues", venueBody);

    expect(res.status).toBe(201);
  });

  it("returns 400 for missing name/address/capacity", async () => {
    const vendor = await signUp(app, "vendor");

    expect((await send(vendor, "post", "/api/venues", {})).status).toBe(400);
    expect((await send(vendor, "post", "/api/venues", { ...venueBody, capacity: 0 })).status).toBe(400);
    expect((await send(vendor, "post", "/api/venues", { ...venueBody, address: { city: "Dubai" } })).status).toBe(400);
    expect(await Event.countDocuments({ type: "Venue" })).toBe(0);
  });

  it("lists, reads, updates and archives the vendor's own venue", async () => {
    const { vendor, venueId } = await vendorWithVenue();

    const list = await get(vendor, "/api/venues");
    expect(list.status).toBe(200);
    expect(list.body.data.venues.map((v: { _id: string }) => v._id)).toEqual([venueId]);
    expect((await get(vendor, `/api/venues/${venueId}`)).body.data._id).toBe(venueId);

    expect((await send(vendor, "put", `/api/venues/${venueId}`, { name: "Renamed" })).status).toBe(200);
    expect((await Event.findById(venueId).lean())!.title).toBe("Renamed");

    expect((await send(vendor, "delete", `/api/venues/${venueId}`)).status).toBe(200);
    expect((await Event.findById(venueId).lean())!).toMatchObject({ status: "archived", isActive: false });
  });

  it("hides another vendor's venue (404) and leaves it untouched", async () => {
    const { venueId } = await vendorWithVenue();
    const other = await signUp(app, "vendor");

    expect((await get(other, `/api/venues/${venueId}`)).status).toBe(404);
    expect((await send(other, "put", `/api/venues/${venueId}`, { name: "Hijacked" })).status).toBe(404);
    expect((await send(other, "delete", `/api/venues/${venueId}`)).status).toBe(404);
    expect((await Event.findById(venueId).lean())!.title).toBe("My Venue");
  });

  it("returns 400 for invalid update fields and malformed ids", async () => {
    const { vendor, venueId } = await vendorWithVenue();

    expect((await send(vendor, "put", `/api/venues/${venueId}`, { capacity: -5 })).status).toBe(400);
    expect((await send(vendor, "put", `/api/venues/${venueId}`, { status: "bogus" })).status).toBe(400);
    expect((await get(vendor, "/api/venues/not-an-id")).status).toBe(400);
  });

  it("forbids customers", async () => {
    const { venueId } = await vendorWithVenue();
    const customer = await signUp(app, "customer");

    expect((await get(customer, "/api/venues")).status).toBe(403);
    expect((await send(customer, "post", "/api/venues", venueBody)).status).toBe(403);
    expect((await send(customer, "delete", `/api/venues/${venueId}`)).status).toBe(403);
  });

  it("a vendor cannot self-approve a venue through the update body", async () => {
    const { vendor, venueId } = await vendorWithVenue({ isApproved: false, status: "pending" });

    await send(vendor, "put", `/api/venues/${venueId}`, { isApproved: true });

    expect((await Event.findById(venueId).lean())!.isApproved).toBe(false);
  });
});

describe("public venue endpoints", () => {
  it("lists and reads only approved, active, published venues", async () => {
    const vendor = await signUp(app, "vendor");
    const vendorId = await vendorIdOf(vendor);
    const live = await insertVenue(vendorId, { slug: "live-hall" });
    await insertVenue(vendorId, { slug: "hidden-hall", isApproved: false });

    const list = await request(app).get("/api/venues/public");
    expect(list.status).toBe(200);
    expect(list.body.data.venues.map((v: { _id: string }) => v._id)).toEqual([live]);
    expect((await request(app).get("/api/venues/public/live-hall")).body.data._id).toBe(live);
    expect((await request(app).get("/api/venues/public/hidden-hall")).status).toBe(404);
  });
});

describe("admin venue endpoints (admin.venue controller)", () => {
  it("lists, reads, approves, rejects and deletes venues", async () => {
    const admin = await signUpAdmin(app);
    const { venueId } = await vendorWithVenue({ isApproved: false });

    const list = await get(admin, "/api/admin/venues");
    expect(list.status).toBe(200);
    expect(JSON.stringify(list.body.data)).toContain(venueId);
    expect((await get(admin, `/api/admin/venues/${venueId}`)).status).toBe(200);
    expect((await get(admin, "/api/admin/venues/stats")).status).toBe(200);

    expect((await send(admin, "put", `/api/admin/venues/${venueId}/approve`)).status).toBe(200);
    expect((await Event.findById(venueId).lean())!.isApproved).toBe(true);

    expect((await send(admin, "put", `/api/admin/venues/${venueId}/reject`, { reason: "Not suitable" })).status).toBe(200);
    expect((await Event.findById(venueId).lean())!.isApproved).toBe(false);

    expect((await send(admin, "delete", `/api/admin/venues/${venueId}`)).status).toBe(200);
  });

  it("forbids vendors from admin venue routes", async () => {
    const { vendor, venueId } = await vendorWithVenue({ isApproved: false });

    expect((await get(vendor, "/api/admin/venues")).status).toBe(403);
    expect((await send(vendor, "put", `/api/admin/venues/${venueId}/approve`)).status).toBe(403);
    expect((await Event.findById(venueId).lean())!.isApproved).toBe(false);
  });

  it("admin venue endpoints return 400 for a malformed id", async () => {
    const admin = await signUpAdmin(app);
    expect((await get(admin, "/api/admin/venues/not-an-id")).status).toBe(400);
  });
});
