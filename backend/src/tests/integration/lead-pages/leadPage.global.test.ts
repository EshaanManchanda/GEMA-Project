/**
 * Integration tests — LeadPage global "Kidrove Lead Collection" bucket.
 *
 * Covers the hardening added around the global (event-less) lead page:
 *   - Concurrency: N simultaneous public submissions never create more than
 *     one global bucket and never drop a lead (atomic upsert + $push, with
 *     E11000-triggered retry instead of the old findOne+create+save gap).
 *   - XOR schema validation: a LeadPage must be either global (isGlobal:true,
 *     no event) or event-based (event set, isGlobal falsy) — never both,
 *     never neither.
 *   - Inactive bucket: a deactivated global bucket rejects new public
 *     submissions instead of silently reactivating/appending.
 *   - Delete protection: the admin DELETE route refuses to remove the global
 *     singleton, but still deletes ordinary event-based lead pages.
 *
 * A local, minimal Express app is built here (public + admin lead-page
 * routes only) so this suite is isolated from other integration tests, and
 * auth is mocked directly rather than exercising the full register/login
 * flow — these tests are about LeadPage behavior, not authentication.
 */

import request from "supertest";
import express, { Application, NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import LeadPage from "../../../models/LeadPage";
import { errorHandler, notFound } from "../../../middleware/index";
import { connectTestDB, clearTestDB, closeTestDB } from "../setup/testDB";

// Bypass real auth for the admin routes — these tests are about LeadPage
// business logic, not the auth middleware itself.
jest.mock("../../../middleware/auth", () => ({
  ...jest.requireActual("../../../middleware/auth"),
  authenticate: (req: Request, _res: Response, next: NextFunction) => {
    (req as any).user = { _id: new mongoose.Types.ObjectId(), role: "admin" };
    next();
  },
  authorize: () => (_req: Request, _res: Response, next: NextFunction) =>
    next(),
}));

import leadPageRoutes from "../../../routes/lead-page.routes";

import adminLeadPageRoutes from "../../../routes/admin.lead-page.routes";

const buildApp = (): Application => {
  const app = express();
  app.use(express.json());
  app.use("/api/lead-pages", leadPageRoutes);
  app.use("/api/admin/lead-pages", adminLeadPageRoutes);
  app.use(notFound);
  app.use(errorHandler);
  return app;
};

describe("LeadPage — global bucket", () => {
  let app: Application;

  beforeAll(async () => {
    await connectTestDB();
    // Ensure the model's partial unique indexes actually exist on the
    // in-memory server (declared in the schema, mongoose builds them lazily).
    await LeadPage.syncIndexes();
    app = buildApp();
  });

  afterEach(async () => {
    await clearTestDB();
  });

  afterAll(async () => {
    await closeTestDB();
  });

  it("concurrent submissions create exactly one global bucket and keep every lead", async () => {
    const N = 15;
    const requests = Array.from({ length: N }, (_, i) =>
      request(app)
        .post("/api/lead-pages/global/lead")
        .send({ name: `Parent ${i}`, email: `parent${i}@example.com` }),
    );

    const responses = await Promise.all(requests);
    responses.forEach((res) => {
      expect(res.status).toBe(201);
    });

    const globalDocs = await LeadPage.find({ isGlobal: true });
    expect(globalDocs).toHaveLength(1);
    expect(globalDocs[0].leads).toHaveLength(N);

    const submittedNames = new Set(globalDocs[0].leads.map((l) => l.name));
    expect(submittedNames.size).toBe(N);
  });

  it("rejects a LeadPage that is both global and event-based", async () => {
    await expect(
      LeadPage.create({
        event: new mongoose.Types.ObjectId(),
        isGlobal: true,
        isActive: true,
      }),
    ).rejects.toThrow(/either global.*or event-based/i);
  });

  it("rejects a LeadPage that is neither global nor event-based", async () => {
    await expect(
      LeadPage.create({
        isActive: true,
      }),
    ).rejects.toThrow(/either global.*or event-based/i);
  });

  it("rejects a public submission when the global bucket is deactivated", async () => {
    await LeadPage.create({ isGlobal: true, isActive: false, leads: [] });

    const res = await request(app)
      .post("/api/lead-pages/global/lead")
      .send({ name: "Late Parent", phone: "+971500000000" });

    expect(res.status).toBe(403);

    const globalDocs = await LeadPage.find({ isGlobal: true });
    expect(globalDocs).toHaveLength(1);
    expect(globalDocs[0].leads).toHaveLength(0);
  });

  it("refuses to delete the global bucket via the admin API", async () => {
    const global = await LeadPage.create({
      isGlobal: true,
      isActive: true,
      leads: [],
    });

    const res = await request(app).delete(
      `/api/admin/lead-pages/${global._id}`,
    );

    expect(res.status).toBe(400);
    await expect(LeadPage.findById(global._id)).resolves.not.toBeNull();
  });

  it("still deletes an ordinary event-based lead page via the admin API", async () => {
    const eventPage = await LeadPage.create({
      event: new mongoose.Types.ObjectId(),
      isGlobal: false,
      isActive: true,
      createdBy: new mongoose.Types.ObjectId(),
      leads: [],
    });

    const res = await request(app).delete(
      `/api/admin/lead-pages/${eventPage._id}`,
    );

    expect(res.status).toBe(200);
    await expect(LeadPage.findById(eventPage._id)).resolves.toBeNull();
  });
});
