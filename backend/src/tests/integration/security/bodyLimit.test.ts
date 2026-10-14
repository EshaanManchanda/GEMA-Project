/**
 * JSON body cap: 1 MB everywhere except the bulk-import routes (10 MB).
 * Exercises the same applyBodyParsers() that server.ts uses, behind an echo
 * handler and the real errorHandler, so no routes or DB are needed.
 */
import express from "express";
import request from "supertest";
import { applyBodyParsers } from "../../../middleware/bodyParsers";
import { errorHandler } from "../../../middleware/error";

const app = express();
applyBodyParsers(app);
app.post("*", (req, res) => {
  res.json({ received: typeof req.body?.data === "string" ? req.body.data.length : 0 });
});
app.use(errorHandler);

const MB = 1024 * 1024;
const body = (bytes: number) => ({ data: "x".repeat(bytes) });

describe("JSON body size limit", () => {
  it("accepts a normal-sized JSON body", async () => {
    const res = await request(app).post("/api/auth/login").send(body(500 * 1024));
    expect(res.status).toBe(200);
    expect(res.body.received).toBe(500 * 1024);
  });

  it("rejects a >1 MB JSON body on a normal route with 413", async () => {
    const res = await request(app).post("/api/events").send(body(1.5 * MB));
    expect(res.status).toBe(413);
  });

  it("rejects a >1 MB urlencoded body with 413", async () => {
    const res = await request(app).post("/api/auth/login").type("form").send(`data=${"x".repeat(1.5 * MB)}`);
    expect(res.status).toBe(413);
  });

  it.each([
    "/api/admin/bulk-import/validate",
    "/api/vendors/bookings/import",
    "/api/teachers/bookings/import",
  ])(
    "accepts a 5 MB JSON body on %s",
    async (path) => {
      const res = await request(app).post(path).send(body(5 * MB));
      expect(res.status).toBe(200);
      expect(res.body.received).toBe(5 * MB);
    },
  );

  it("rejects >10 MB even on bulk import", async () => {
    const res = await request(app).post("/api/admin/bulk-import/validate").send(body(11 * MB));
    expect(res.status).toBe(413);
  });

  it("still gives webhooks the raw body", async () => {
    const hook = express();
    applyBodyParsers(hook);
    hook.post("/api/payments/webhook", (req, res) => res.json({ raw: Buffer.isBuffer(req.body) }));
    const res = await request(hook).post("/api/payments/webhook").send({ a: 1 });
    expect(res.body.raw).toBe(true);
  });
});
