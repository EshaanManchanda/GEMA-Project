/**
 * The public homepage is the same for everyone, so browsers and a proxy may keep it briefly
 * (it is the heaviest request on the site and the 1 vCPU server rebuilds the JSON for each one).
 * Anything tied to a signed-in user must never become publicly cacheable.
 */
import "../setup/mocks";
import request from "supertest";
import { Application } from "express";
import { createTestApp } from "../setup/testApp";
import { connectTestDB, closeTestDB } from "../setup/testDB";
import { ensureCollections } from "../setup/factories";
import { cookie, signUp, signUpAdmin } from "../setup/session";

jest.setTimeout(90_000); // a cold ts-jest compile of the whole app happens inside beforeAll

let app: Application;

beforeAll(async () => {
  await connectTestDB();
  await ensureCollections();
  app = createTestApp();
});
afterAll(closeTestDB);

describe("HTTP caching", () => {
  it("lets browsers and proxies keep GET /api/homepage for a minute, then serve stale while refreshing", async () => {
    const res = await request(app).get("/api/homepage");
    expect(res.status).toBe(200);
    expect(res.headers["cache-control"]).toBe("public, max-age=60, stale-while-revalidate=300");
  });

  it("never marks signed-in responses publicly cacheable", async () => {
    const customer = await signUp(app, "customer");
    const admin = await signUpAdmin(app);
    const calls: Array<[string, string]> = [
      ["/api/auth/me", cookie(customer)],
      ["/api/auth/profile", cookie(customer)],
      ["/api/auth/me", cookie(admin)],
    ];
    for (const [url, c] of calls) {
      const res = await request(app).get(url).set("Cookie", c);
      expect([200, 304]).toContain(res.status);
      expect(res.headers["cache-control"] ?? "").not.toMatch(/\bpublic\b/);
    }
  });

  it("never marks a refused request publicly cacheable", async () => {
    const res = await request(app).get("/api/auth/profile");
    expect(res.status).toBe(401);
    expect(res.headers["cache-control"] ?? "").not.toMatch(/\bpublic\b/);
  });
});
