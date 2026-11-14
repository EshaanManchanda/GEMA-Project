/**
 * GET /api/homepage was about 2.8 MB on production. The page only needs card data:
 *  - the collection pills read _id, slug and title; only the "handpicked" collection needs events
 *  - an event card shows a short plain-text snippet of the description and the first date slot
 * So full HTML descriptions, every date slot, and events of the other collections must not be sent.
 * Fixtures give every event a 20 KB HTML description and 12 date slots.
 */
import "../setup/mocks";
import request from "supertest";
import { Application } from "express";
import { Types } from "mongoose";
import Collection from "../../../models/Collection";
import { createTestApp } from "../setup/testApp";
import { connectTestDB, closeTestDB } from "../setup/testDB";
import { ensureCollections } from "../setup/factories";
import { signUp, vendorIdOf, insertEvent } from "../setup/session";

jest.setTimeout(90_000); // a cold ts-jest compile of the whole app happens inside beforeAll

const oid = () => new Types.ObjectId();
const LONG_HTML = `<p>${"<strong>Learn robotics</strong> with hands-on projects. ".repeat(400)}</p>`;
const slots = () =>
  Array.from({ length: 12 }, (_, i) => ({
    startDate: new Date(Date.now() + (i + 1) * 86_400_000),
    endDate: new Date(Date.now() + (i + 1) * 86_400_000 + 3_600_000),
    availableSeats: 10,
    totalSeats: 10,
    timeSlots: [{ startTime: "10:00", endTime: "11:00", availableSeats: 10 }],
  }));

let app: Application;
let body: any;
let bytes: number;

beforeAll(async () => {
  await connectTestDB();
  await ensureCollections();
  app = createTestApp();
  const vendorId = await vendorIdOf(await signUp(app, "vendor"));

  const shared = {
    description: LONG_HTML,
    category: "Arts",
    venueType: "Online",
    currency: "AED",
    isActive: true,
    isDeleted: false,
    price: 40,
    dateSchedule: slots(),
  };
  const ids: Types.ObjectId[] = [];
  for (let i = 0; i < 5; i++) {
    ids.push(new Types.ObjectId(await insertEvent(vendorId, { ...shared, title: `Robot Camp ${i}`, slug: `robot-camp-${i}`, viewsCount: i, isFeatured: i < 2 })));
  }
  await insertEvent(vendorId, { ...shared, title: "Piano Class", slug: "piano-class", type: "Class" });
  // a published Venue: the old query returned it with its full description and facilities
  await insertEvent(vendorId, { ...shared, title: "Big Hall", slug: "big-hall", type: "Venue", facilities: ["wifi"], capacity: 200 });

  const now = new Date();
  const base = { description: LONG_HTML, count: 5, isActive: true, createdAt: now, updatedAt: now, seo: { metaTitle: "m".repeat(500) } };
  await Collection.collection.insertMany([
    { _id: oid(), ...base, title: "Handpicked Experiences", slug: "handpicked-experiences", sortOrder: 1, events: ids },
    { _id: oid(), ...base, title: "Summer Camps", slug: "summer-camps", sortOrder: 2, events: ids },
    {
      _id: oid(), ...base, title: "Winter Camps", slug: "winter-camps", sortOrder: 3, events: [],
      eventsData: ids.map((_id, i) => ({ _id, title: `Robot Camp ${i}`, slug: `robot-camp-${i}`, description: LONG_HTML, price: 40, dateSchedule: slots(), status: "published", isApproved: true, isDeleted: false })),
    },
  ]);

  const res = await request(app).get("/api/homepage");
  expect(res.status).toBe(200);
  body = res.body.data ?? res.body;
  bytes = Buffer.byteLength(JSON.stringify(res.body));
});
afterAll(closeTestDB);

const eventLists = () =>
  (["events", "bestPriceEvents", "featuredEvents", "trendingEvents", "educationalEvents"] as const).map((k) => [k, body[k] as any[]] as const);

describe("GET /api/homepage payload", () => {
  it("serves the fixtures we seeded (so the size checks cannot pass on an empty response)", () => {
    expect(body.events.length).toBeGreaterThanOrEqual(5);
    expect(body.collections.map((c: any) => c.slug).sort()).toEqual(["handpicked-experiences", "summer-camps", "winter-camps"]);
    expect(body.educationalEvents.length).toBeGreaterThanOrEqual(1);
  });

  it("is a small payload for the card data the page needs", () => {
    expect(bytes).toBeLessThan(60_000);
  });

  it("collection pills keep id, slug and title", () => {
    for (const c of body.collections) {
      expect(c._id).toBeDefined();
      expect(c.slug).toBeDefined();
      expect(c.title).toBeDefined();
    }
  });

  it("sends events only for the handpicked collection, with no description or seo blocks on any collection", () => {
    for (const c of body.collections) {
      const handpicked = c.slug.startsWith("handpicked-experience");
      expect(Array.isArray(c.events)).toBe(true);
      expect(c.events.length > 0).toBe(handpicked);
      expect(c.description).toBeUndefined();
      expect(c.seo).toBeUndefined();
    }
  });

  it.each(["events", "bestPriceEvents", "featuredEvents", "trendingEvents", "educationalEvents"])(
    "%s: plain-text snippet and at most 3 date slots per event",
    (key) => {
      const list = body[key] as any[];
      expect(list.length).toBeGreaterThan(0);
      for (const e of list) {
        expect(e.description.length).toBeLessThanOrEqual(300);
        expect(e.description).not.toMatch(/<[a-z/]/i);
        expect(e.description.length).toBeGreaterThan(20); // still a real snippet, not emptied
        expect(e.dateSchedule.length).toBeLessThanOrEqual(3);
        expect(e.dateSchedule.length).toBeGreaterThan(0); // the card still has its first slot
      }
    },
  );

  it("handpicked events keep the same limits", () => {
    const handpicked = body.collections.find((c: any) => c.slug === "handpicked-experiences");
    expect(handpicked.events.length).toBe(5);
    for (const e of handpicked.events) {
      expect(e.description.length).toBeLessThanOrEqual(300);
      expect(e.dateSchedule.length).toBeLessThanOrEqual(3);
    }
  });

  it("keeps the response shape the frontend types declare", () => {
    for (const key of ["events", "bestPriceEvents", "featuredEvents", "trendingEvents", "banners", "categories", "featuredBlogs", "reels", "collections", "educationalEvents", "venues"]) {
      expect(Array.isArray(body[key])).toBe(true);
    }
    expect(body.stats).toBeDefined();
  });

  it("does not run the unused venues query (nothing on the page reads it)", () => {
    expect(body.venues).toEqual([]);
  });

  // referenced so a failing list name is easy to read
  it("covers every event list", () => {
    expect(eventLists().map(([k]) => k)).toHaveLength(5);
  });
});
