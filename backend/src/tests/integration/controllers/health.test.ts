/**
 * health.routes is mounted by server.ts (not routes/index), so mount it on a
 * small app with the same cookie/auth plumbing. The full "/" check probes
 * Stripe/queues/etc. and is left to manual/ops checks.
 */
import "../setup/mocks";
import express, { Application } from "express";
import cookieParser from "cookie-parser";
import request from "supertest";
import healthRoutes from "../../../routes/health.routes";
import { errorHandler } from "../../../middleware/index";
import { createTestApp } from "../setup/testApp";
import { connectTestDB, clearTestDB, closeTestDB } from "../setup/testDB";
import { cookie, signUp, signUpAdmin } from "../setup/session";

let app: Application;
let health: Application;
beforeAll(async () => {
  await connectTestDB();
  app = createTestApp();
  health = express();
  health.use(cookieParser());
  health.use("/health", healthRoutes);
  health.use(errorHandler);
});
afterEach(clearTestDB);
afterAll(closeTestDB);

it("reports basic health with the DB connected", async () => {
  const res = await request(health).get("/health/basic");

  expect(res.status).toBe(200);
  expect(res.body).toMatchObject({ status: "ok", database: "connected" });
});

it("lets admins read Redis stats (disabled in tests)", async () => {
  const admin = await signUpAdmin(app);

  const res = await request(health).get("/health/redis").set("Cookie", cookie(admin));

  expect(res.status).toBe(200);
  expect(res.body.data.enabled).toBe(false);
});

it("forbids non-admins from Redis stats", async () => {
  const customer = await signUp(app, "customer");

  expect((await request(health).get("/health/redis").set("Cookie", cookie(customer))).status).toBe(403);
  expect((await request(health).get("/health/redis")).status).toBe(401);
});
