/**
 * Admin /submissions bulk CSV export (contact, newsletter, partnerships) + dateRangeFilter.
 */
import "../setup/mocks";
import request from "supertest";
import { Application } from "express";
import Contact from "../../../models/Contact";
import NewsletterSubscriber from "../../../models/NewsletterSubscriber";
import Partnership from "../../../models/Partnership";
import { dateRangeFilter } from "../../../utils/csv.utils";
import { createTestApp } from "../setup/testApp";
import { connectTestDB, clearTestDB, closeTestDB } from "../setup/testDB";
import { ensureCollections } from "../setup/factories";
import { cookie, signUp, signUpAdmin } from "../setup/session";

let app: Application;

beforeAll(async () => {
  await connectTestDB();
  app = createTestApp();
  await ensureCollections();
});
afterEach(clearTestDB);
afterAll(closeTestDB);

const seedContact = (name: string, status: string, createdAt: string) =>
  Contact.collection.insertOne({ name, email: `${name.toLowerCase()}@x.com`, subject: "Hi", message: "msg", status, createdAt: new Date(createdAt), updatedAt: new Date(createdAt) });

it("dateRangeFilter: inclusive date-only `to`, rejects garbage", () => {
  expect(dateRangeFilter()).toBeUndefined();
  expect(dateRangeFilter(undefined, "2026-11-05")!.$lte!.toISOString()).toBe("2026-11-05T23:59:59.999Z");
  expect(() => dateRangeFilter("nope")).toThrow();
});

describe("contact export", () => {
  it("returns every filtered row as CSV (ignores pagination), honouring status + date range", async () => {
    const admin = await signUpAdmin(app);
    await seedContact("Alice", "new", "2026-11-01T10:00:00Z");
    await seedContact("Bob", "new", "2026-11-05T22:00:00Z"); // on the `to` day, must be included
    await seedContact("Carol", "new", "2026-11-09T10:00:00Z"); // outside range
    await seedContact("Dave", "read", "2026-11-02T10:00:00Z"); // wrong status

    const res = await request(app)
      .get("/api/contact?format=csv&limit=1&status=new&from=2026-11-01&to=2026-11-05")
      .set({ Cookie: cookie(admin) });

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/csv");
    expect(res.headers["content-disposition"]).toContain("contact-submissions-");
    expect(res.text).toContain("Alice");
    expect(res.text).toContain("Bob");
    expect(res.text).not.toContain("Carol");
    expect(res.text).not.toContain("Dave");
    // ObjectId must be one cell, not flattened into _id_buffer_N columns
    expect(res.text).not.toContain("_buffer_");
    expect(res.text.split("\r\n")[0]).toMatch(/_id,name,/);
  });

  it("searches server-side", async () => {
    const admin = await signUpAdmin(app);
    await seedContact("Alice", "new", "2026-11-01T10:00:00Z");
    await seedContact("Bob", "new", "2026-11-01T10:00:00Z");
    const res = await request(app).get("/api/contact?format=csv&search=alice").set({ Cookie: cookie(admin) });
    expect(res.text).toContain("Alice");
    expect(res.text).not.toContain("Bob");
  });

  it("is admin only", async () => {
    const customer = await signUp(app, "customer");
    const res = await request(app).get("/api/contact?format=csv").set({ Cookie: cookie(customer) });
    expect(res.status).toBe(403);
  });
});

it("newsletter export never leaks unsubscribeToken", async () => {
  const admin = await signUpAdmin(app);
  await NewsletterSubscriber.create({ email: "sub@x.com", source: "footer" });
  const res = await request(app).get("/api/newsletter/admin/subscribers?format=csv").set({ Cookie: cookie(admin) });
  expect(res.status).toBe(200);
  expect(res.text).toContain("sub@x.com");
  expect(res.text).not.toContain("unsubscribeToken");
  const token = (await NewsletterSubscriber.findOne({ email: "sub@x.com" }).select("+unsubscribeToken").lean() as any)?.unsubscribeToken;
  if (token) expect(res.text).not.toContain(token);
});

it("partnership export applies partnershipType + search", async () => {
  const admin = await signUpAdmin(app);
  const base = { phone: "+971500000000", message: "m", status: "pending", createdAt: new Date(), updatedAt: new Date() };
  await Partnership.collection.insertMany([
    { ...base, name: "Zed", email: "zed@x.com", organization: "ZedCorp", partnershipType: "vendor" },
    { ...base, name: "Yan", email: "yan@x.com", organization: "YanSchool", partnershipType: "school" },
  ]);
  const res = await request(app).get("/api/partnerships?format=csv&partnershipType=school&search=yan").set({ Cookie: cookie(admin) });
  expect(res.status).toBe(200);
  expect(res.text).toContain("YanSchool");
  expect(res.text).not.toContain("ZedCorp");
});
