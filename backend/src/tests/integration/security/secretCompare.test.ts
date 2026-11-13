/**
 * Secret/token comparisons must answer a clean 4xx for hostile input, never throw.
 * timingSafeEqual throws RangeError when BYTE lengths differ, and the old code only
 * compared string lengths, so a same-length value with multi-byte characters threw:
 *  - Cunnekt webhook: an async handler with no catch. Express 4 never sees the
 *    rejection, and server.ts exits the process on unhandledRejection, so one
 *    unauthenticated request could take the API down.
 *  - CSRF check: a 500 for a crafted X-CSRF-Token header.
 */
import "../setup/mocks";
import request from "supertest";
import { Application } from "express";
import { config } from "../../../config/env";
import { createTestApp } from "../setup/testApp";

// The real handler also kicks off WhatsApp event processing; this suite is
// about the secret check, so keep that part inert (plain function: resetMocks
// would wipe a jest.fn implementation).
jest.mock("../../../services/communication/providers/whatsapp.provider", () => ({
  ...jest.requireActual("../../../services/communication/providers/whatsapp.provider"),
  processCunnektWebhookEvent: async () => undefined,
}));

const SECRET = "cunnekt-test-secret-123";
const saved = (config as any).whatsapp.cunnektWebhookSecret;
let app: Application;
beforeAll(() => {
  (config as any).whatsapp.cunnektWebhookSecret = SECRET;
  app = createTestApp();
});
afterAll(() => {
  (config as any).whatsapp.cunnektWebhookSecret = saved;
});

const cunnekt = (secret: string) =>
  request(app)
    .post(`/api/webhooks/cunnekt/${encodeURIComponent(secret)}`)
    .set("Content-Type", "application/json")
    .timeout({ deadline: 4000 }) // an unhandled throw never answers: fail fast, not after 30 s
    .send("{}");

describe("Cunnekt webhook secret", () => {
  it("accepts the right secret", async () => {
    const res = await cunnekt(SECRET);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ received: true });
  });

  it.each([
    ["wrong, same length", "x".repeat(SECRET.length)],
    ["wrong, different length", "short"],
    ["multi-byte, same character count", "é".repeat(SECRET.length)],
  ])("rejects a %s secret with 401", async (_label, secret) => {
    const res = await cunnekt(secret);
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ received: false });
  });
});

describe("CSRF double-submit check", () => {
  const post = (cookieToken: string, headerToken: string) =>
    request(app)
      .post("/api/auth/change-password")
      .set("Cookie", `accessToken=x; XSRF-TOKEN=${cookieToken}`)
      .set("X-CSRF-Token", headerToken)
      .send({});

  it("a matching token passes the CSRF check", async () => {
    const res = await post("abcdef", "abcdef");
    expect(res.body.message).not.toMatch(/csrf/i);
  });

  it.each([
    ["different token, same length", "abcdef", "abcdeg"],
    // cookie-parser URL-decodes, so %C3%A9%C3%A9 is 2 characters but 4 bytes.
    ["multi-byte cookie, same character count", "%C3%A9%C3%A9", "ab"],
  ])("rejects %s with 403, not a 500", async (_label, cookieToken, headerToken) => {
    const res = await post(cookieToken, headerToken);
    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/csrf/i);
  });
});
