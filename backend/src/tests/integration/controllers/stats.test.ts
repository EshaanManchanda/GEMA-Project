import "../setup/mocks";
import request from "supertest";
import { Application } from "express";
import { createTestApp } from "../setup/testApp";
import { connectTestDB, clearTestDB, closeTestDB } from "../setup/testDB";
import { Session, cookie, signUp, signUpAdmin, vendorIdOf, insertEvent } from "../setup/session";

let app: Application;
beforeAll(async () => {
  await connectTestDB();
  app = createTestApp();
});
afterEach(clearTestDB);
afterAll(closeTestDB);

const post = (s: Session, url: string) => request(app).post(url).set("Cookie", cookie(s)).set("x-csrf-token", s.csrfToken);

describe("GET /api/stats (stats controller)", () => {
  it("returns numeric public stats that count approved events", async () => {
    const vendor = await signUp(app, "vendor");
    await insertEvent(await vendorIdOf(vendor), { isDeleted: false, category: "Arts", location: { city: "Dubai" } });

    const res = await request(app).get("/api/stats");

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(expect.objectContaining({ totalEvents: expect.any(Number), totalVendors: expect.any(Number) }));
    expect(res.body.data.totalEvents).toBeGreaterThanOrEqual(1);
  });
});

describe("homepage controller", () => {
  it("serves aggregated homepage data publicly", async () => {
    const res = await request(app).get("/api/homepage");

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(expect.objectContaining({ events: expect.any(Array), banners: expect.any(Array), categories: expect.any(Array) }));
  });

  it("lets only admins invalidate the homepage cache", async () => {
    const admin = await signUpAdmin(app);
    const customer = await signUp(app, "customer");

    expect((await post(admin, "/api/homepage/invalidate-cache")).status).toBe(200);
    expect((await post(customer, "/api/homepage/invalidate-cache")).status).toBe(403);
    expect((await request(app).post("/api/homepage/invalidate-cache")).status).toBe(401);
  });
});
