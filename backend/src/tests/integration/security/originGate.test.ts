/**
 * Production perimeter: the Origin gate and CORS policy exactly as server.ts
 * mounts them. A production probe (13 Nov 2026) showed Stripe's webhook, which
 * sends no Origin header, answered 403 by the gate before reaching its
 * signature check, and a foreign Origin answered 500 instead of a clean refusal.
 */
import "../setup/mocks";
import request from "supertest";
import { Application } from "express";
import { createTestApp } from "../setup/testApp";
import { connectTestDB, clearTestDB, closeTestDB } from "../setup/testDB";

const SITE = "https://kidrove.com";
const GATE_BODY = { success: false, message: "Forbidden" };

let app: Application;
const savedOrigins = process.env.ALLOWED_ORIGINS;
beforeAll(async () => {
  await connectTestDB(); // the email-marketing webhook reads its settings from the DB
  process.env.ALLOWED_ORIGINS = SITE;
  app = createTestApp({ productionPerimeter: true });
});
afterEach(clearTestDB);
afterAll(async () => {
  if (savedOrigins === undefined) delete process.env.ALLOWED_ORIGINS;
  else process.env.ALLOWED_ORIGINS = savedOrigins;
  await closeTestDB();
});

describe("webhooks send no Origin header and must still reach their handler", () => {
  it("Stripe: reaches the signature check", async () => {
    const res = await request(app)
      .post("/api/payments/webhook")
      .set("Content-Type", "application/json")
      .send("{}");
    expect(res.body).not.toEqual(GATE_BODY);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Missing Stripe signature/i);
  });

  it("Cunnekt: reaches the secret check", async () => {
    const res = await request(app)
      .post("/api/webhooks/cunnekt/not-the-secret")
      .set("Content-Type", "application/json")
      .send("{}");
    expect(res.body).not.toEqual(GATE_BODY);
    expect(res.status).toBe(401);
  });

  it("Sender/Mailchimp: reaches the secret check", async () => {
    const res = await request(app)
      .post("/api/webhooks/email-marketing/mailchimp/not-the-secret")
      .type("form")
      .send("type=unsubscribe");
    expect(res.body).not.toEqual(GATE_BODY);
    expect(res.status).toBe(401);
  });
});

describe("every other state-changing request must carry an Origin", () => {
  it.each(["post", "put", "patch", "delete"] as const)(
    "%s without Origin is refused with 403",
    async (method) => {
      const res = await request(app)[method]("/api/auth/login").send({});
      expect(res.status).toBe(403);
      expect(res.body).toEqual(GATE_BODY);
    },
  );

  it("a webhook-lookalike path is not exempt", async () => {
    const res = await request(app).post("/api/payments/webhook-evil").send({});
    expect(res.status).toBe(403);
    expect(res.body).toEqual(GATE_BODY);
    const other = await request(app).post("/api/webhooksevil/x").send({});
    expect(other.status).toBe(403);
  });

  it("safe methods need no Origin", async () => {
    expect((await request(app).get("/api/health")).status).toBe(200);
  });

  it("an allowed Origin passes the gate and gets CORS headers", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .set("Origin", SITE)
      .send({});
    expect(res.status).not.toBe(403);
    expect(res.headers["access-control-allow-origin"]).toBe(SITE);
    expect(res.headers["access-control-allow-credentials"]).toBe("true");
  });
});

// A clean 403, not the 500 a bare thrown Error produced. It must still stop the
// request: with `callback(null, false)` the handler would run and a cross-site
// form POST to an unauthenticated endpoint would go through.
describe("a disallowed Origin is refused with 403 and never reaches the handler", () => {
  it.each(["https://evil.example", "null"])("Origin %s", async (origin) => {
    const get = await request(app).get("/api/health").set("Origin", origin);
    expect(get.status).toBe(403);
    expect(get.body.message).toMatch(/not allowed by CORS/i);
    expect(get.headers["access-control-allow-origin"]).toBeUndefined();

    const preflight = await request(app)
      .options("/api/auth/login")
      .set("Origin", origin)
      .set("Access-Control-Request-Method", "POST");
    expect(preflight.status).toBe(403);
    expect(preflight.headers["access-control-allow-origin"]).toBeUndefined();

    // The login handler would answer 400/401 here; 403 + the CORS message proves it never ran.
    const post = await request(app)
      .post("/api/auth/login")
      .set("Origin", origin)
      .send({});
    expect(post.status).toBe(403);
    expect(post.body.message).toMatch(/not allowed by CORS/i);
  });
});
