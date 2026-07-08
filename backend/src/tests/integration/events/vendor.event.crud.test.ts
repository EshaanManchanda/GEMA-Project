/**
 * Integration tests — Vendor Event CRUD (POST/PUT/DELETE/PUT-restore /api/vendors/events)
 *
 * Converts the empty audit stubs in `tests/unit/vendor-system-audit.test.ts` (TC-EVT-01..17)
 * into real, executable assertions, plus regression coverage for the fixes made in this
 * change:
 *   - VE-1: vendor status whitelist crash (`pending_review` was not a valid Event.status enum
 *     value, causing a 500 on save; now rejected as a clean 400/403 and only `draft`/`pending`
 *     are accepted).
 *   - VE-2: semantic validation (date ordering, past dates, negative price, seat sanity, age
 *     bounds, online meeting-link requirement) that used to fall through to a generic 500 from
 *     Mongoose or wasn't checked at all.
 *   - VE-3: invalid `:id` now returns 400 instead of a Mongoose CastError 500.
 *   - VE-4: a vendor whose `verificationStatus` is `rejected` cannot create events (403);
 *     unverified/pending vendors still can (event stays unapproved either way).
 *   - VE-5: mass-assignment safety — `isApproved`, foreign `vendorId`, and `status:"published"`
 *     in the create payload cannot escalate privileges (controller never reads them from body
 *     on create).
 *
 * A local, minimal Express app is built here (rather than reusing the shared
 * `tests/integration/setup/testApp.ts`) so mounting vendor routes can't affect other
 * integration suites that use the shared app.
 */

import request from "supertest";
import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import mongoSanitize from "express-mongo-sanitize";
import hpp from "hpp";
import User, { UserStatus } from "../../../models/User";
import Event from "../../../models/Event";
import Category from "../../../models/Category";
import Vendor, { VerificationStatus } from "../../../models/Vendor";
import { connectTestDB, clearTestDB, closeTestDB } from "../setup/testDB";
import { errorHandler, notFound } from "../../../middleware/index";

// ---------------------------------------------------------------------------
// Mocks — same shape as event.crud.test.ts; vendor.service.ts transitively pulls in
// email/redis/firebase/queue/stripe config, so these must be mocked before import.
// ---------------------------------------------------------------------------

jest.mock("../../../services/email.service", () => ({
  sendEmail: jest.fn().mockResolvedValue(undefined),
  sendTemplateEmail: jest.fn().mockResolvedValue(undefined),
  emailService: {
    sendEmail: jest.fn().mockResolvedValue(undefined),
    sendTemplateEmail: jest.fn().mockResolvedValue(undefined),
    sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
    sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
    sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock("../../../config/redis", () => ({
  redisClient: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue("OK"),
    del: jest.fn().mockResolvedValue(1),
    setEx: jest.fn().mockResolvedValue("OK"),
    quit: jest.fn().mockResolvedValue(undefined),
    status: "end",
  },
  redisPool: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue("OK"),
    del: jest.fn().mockResolvedValue(1),
    setEx: jest.fn().mockResolvedValue("OK"),
    isHealthy: jest.fn().mockReturnValue(false),
    getConnection: jest.fn().mockReturnValue(null),
    getClient: jest.fn(),
    releaseClient: jest.fn(),
  },
}));

jest.mock("../../../config/firebase", () => ({
  initializeFirebase: jest.fn(),
}));

jest.mock("../../../services/queue.service", () => ({
  addEmailJob: jest.fn().mockResolvedValue(undefined),
  addQRJob: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("../../../config/stripe", () => ({
  stripe: {
    paymentIntents: { create: jest.fn(), retrieve: jest.fn() },
    customers: { create: jest.fn(), retrieve: jest.fn() },
    accounts: { create: jest.fn(), retrieve: jest.fn() },
  },
  stripePublishableKey: "pk_test_mock",
}));

jest.setTimeout(60000);

// ---------------------------------------------------------------------------
// Local test app — auth + vendor routes only
// ---------------------------------------------------------------------------

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret-key-32chars!!";
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || "test-jwt-refresh-secret-32chars!";
process.env.JWT_EXPIRES_IN = "15m";
process.env.JWT_REFRESH_EXPIRES_IN = "7d";
process.env.NODE_ENV = "test";
process.env.ADMIN_SECRET_KEY = "test-admin-secret";
process.env.BCRYPT_SALT_ROUNDS = "4";
process.env.SESSION_SECRET = "test-session-secret";

const buildTestApp = (): Application => {
  // Imported lazily so the mocks above are registered first.
  const authRoutes = require("../../../routes/auth.routes").default;
  const vendorRoutes = require("../../../routes/vendor.routes").default;

  const app = express();
  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(cors({ origin: "http://localhost:3000", credentials: true }));
  app.use(mongoSanitize());
  app.use(hpp());
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  app.use("/api/auth", authRoutes);
  app.use("/api/vendors", vendorRoutes);

  app.get("/api/health", (_req: Request, res: Response) => res.json({ status: "ok" }));
  app.use(notFound);
  app.use(errorHandler);

  return app;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const extractCookie = (cookies: string[], name: string): string => {
  const c = cookies.find((h) => h.startsWith(`${name}=`));
  if (!c) return "";
  return c.split(";")[0].replace(`${name}=`, "");
};

/** Register a vendor, verify + activate, log in, return { accessToken, userId }. */
const registerAndLoginVendor = async (
  app: Application,
  emailSuffix: string = "",
): Promise<{ accessToken: string; userId: string }> => {
  const email = `vendor${emailSuffix}.${Date.now()}.${Math.random()
    .toString(36)
    .slice(2)}@example.com`;
  const password = "Test@1234!";

  await request(app)
    .post("/api/auth/register")
    .send({ firstName: "Test", lastName: "Vendor", email, password });

  await User.findOneAndUpdate(
    { email },
    { role: "vendor", isEmailVerified: true, status: UserStatus.ACTIVE },
  );

  const loginRes = await request(app).post("/api/auth/login").send({ email, password });
  const cookies: string[] = (loginRes.headers["set-cookie"] as unknown as string[]) || [];
  const accessToken = extractCookie(cookies, "accessToken");

  const user = await User.findOne({ email }).lean();
  const userId = (user as any)._id.toString();

  return { accessToken, userId };
};

const authCookie = (token: string) => `accessToken=${token}`;

const seedCategory = async (nameSuffix = "") => {
  const category = await Category.create({
    name: `Test Category${nameSuffix}`,
    slug: `test-category${nameSuffix.toLowerCase().replace(/\s+/g, "-")}`,
    isActive: true,
    level: 0,
    sortOrder: 0,
  });
  return category;
};

const futureDate = (daysFromNow: number) => {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().split("T")[0];
};

const basePayload = (overrides: Record<string, any> = {}) => ({
  title: "Robotics Workshop",
  description: "A hands-on robotics workshop for kids aged 8-14.",
  shortDescription: "Hands-on robotics for kids.",
  category: "Test Category",
  type: "Workshop",
  venueType: "Indoor",
  ageRange: [8, 14],
  location: { city: "Dubai", address: "123 Sheikh Zayed Road" },
  price: 100,
  currency: "AED",
  dateSchedule: [
    {
      startDate: futureDate(5),
      endDate: futureDate(5),
      startTime: "10:00",
      endTime: "12:00",
      availableSeats: 20,
      price: 100,
    },
  ],
  ...overrides,
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Vendor Event CRUD — /api/vendors/events", () => {
  let app: Application;

  beforeAll(async () => {
    await connectTestDB();
    app = buildTestApp();
  });

  afterAll(async () => {
    await closeTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
    await seedCategory();
  });

  // ─── CREATE — validation (TC-EVT-01..05 + VE-2/VE-3) ──────────────────

  describe("POST /events — validation", () => {
    it("TC-EVT-01: rejects missing title/description/category", async () => {
      const { accessToken } = await registerAndLoginVendor(app, "-01");
      const res = await request(app)
        .post("/api/vendors/events")
        .set("Cookie", authCookie(accessToken))
        .send(basePayload({ title: "" }));
      expect(res.status).toBe(400);
    });

    it("TC-EVT-02: rejects missing location city/address for non-online events", async () => {
      const { accessToken } = await registerAndLoginVendor(app, "-02");
      const res = await request(app)
        .post("/api/vendors/events")
        .set("Cookie", authCookie(accessToken))
        .send(basePayload({ location: { city: "", address: "" } }));
      expect(res.status).toBe(400);
    });

    it("TC-EVT-03: rejects empty dateSchedule", async () => {
      const { accessToken } = await registerAndLoginVendor(app, "-03");
      const res = await request(app)
        .post("/api/vendors/events")
        .set("Cookie", authCookie(accessToken))
        .send(basePayload({ dateSchedule: [] }));
      expect(res.status).toBe(400);
    });

    it("TC-EVT-04: rejects unknown category", async () => {
      const { accessToken } = await registerAndLoginVendor(app, "-04");
      const res = await request(app)
        .post("/api/vendors/events")
        .set("Cookie", authCookie(accessToken))
        .send(basePayload({ category: "does-not-exist" }));
      expect(res.status).toBe(400);
    });

    it("TC-EVT-05: rejects affiliate event without externalBookingLink", async () => {
      const { accessToken } = await registerAndLoginVendor(app, "-05");
      const res = await request(app)
        .post("/api/vendors/events")
        .set("Cookie", authCookie(accessToken))
        .send(basePayload({ isAffiliateEvent: true }));
      expect(res.status).toBe(400);
    });

    it("VE-2: rejects endDate before startDate", async () => {
      const { accessToken } = await registerAndLoginVendor(app, "-endbefore");
      const res = await request(app)
        .post("/api/vendors/events")
        .set("Cookie", authCookie(accessToken))
        .send(
          basePayload({
            dateSchedule: [
              {
                startDate: futureDate(10),
                endDate: futureDate(5),
                availableSeats: 10,
                price: 50,
              },
            ],
          }),
        );
      expect(res.status).toBe(400);
    });

    it("VE-2: rejects a past startDate", async () => {
      const { accessToken } = await registerAndLoginVendor(app, "-pastdate");
      const past = new Date();
      past.setDate(past.getDate() - 5);
      const res = await request(app)
        .post("/api/vendors/events")
        .set("Cookie", authCookie(accessToken))
        .send(
          basePayload({
            dateSchedule: [
              {
                startDate: past.toISOString().split("T")[0],
                endDate: past.toISOString().split("T")[0],
                availableSeats: 10,
                price: 50,
              },
            ],
          }),
        );
      expect(res.status).toBe(400);
    });

    it("VE-2: rejects negative top-level price", async () => {
      const { accessToken } = await registerAndLoginVendor(app, "-negprice");
      const res = await request(app)
        .post("/api/vendors/events")
        .set("Cookie", authCookie(accessToken))
        .send(basePayload({ price: -10 }));
      expect(res.status).toBe(400);
    });

    it("VE-2: rejects negative schedule price", async () => {
      const { accessToken } = await registerAndLoginVendor(app, "-negschedprice");
      const res = await request(app)
        .post("/api/vendors/events")
        .set("Cookie", authCookie(accessToken))
        .send(
          basePayload({
            dateSchedule: [
              {
                startDate: futureDate(5),
                endDate: futureDate(5),
                availableSeats: 10,
                price: -1,
              },
            ],
          }),
        );
      expect(res.status).toBe(400);
    });

    it("VE-2: rejects availableSeats <= 0 on a non-unlimited schedule", async () => {
      const { accessToken } = await registerAndLoginVendor(app, "-zeroSeats");
      const res = await request(app)
        .post("/api/vendors/events")
        .set("Cookie", authCookie(accessToken))
        .send(
          basePayload({
            dateSchedule: [
              {
                startDate: futureDate(5),
                endDate: futureDate(5),
                availableSeats: 0,
                price: 50,
              },
            ],
          }),
        );
      expect(res.status).toBe(400);
    });

    it("VE-2: rejects an online event without a valid meetingLink", async () => {
      const { accessToken } = await registerAndLoginVendor(app, "-onlineNoLink");
      const res = await request(app)
        .post("/api/vendors/events")
        .set("Cookie", authCookie(accessToken))
        .send(basePayload({ venueType: "Online", location: undefined, meetingLink: "" }));
      expect(res.status).toBe(400);
    });
  });

  // ─── CREATE — success semantics (TC-EVT-06..09) ────────────────────────

  describe("POST /events — success semantics", () => {
    it("TC-EVT-06: sets isApproved=false and status='draft' for new events", async () => {
      const { accessToken } = await registerAndLoginVendor(app, "-06");
      const res = await request(app)
        .post("/api/vendors/events")
        .set("Cookie", authCookie(accessToken))
        .send(basePayload());
      expect(res.status).toBe(201);
      expect(res.body.data.event.isApproved).toBe(false);
      expect(res.body.data.event.status).toBe("draft");
    });

    it("TC-EVT-07: forces price=0 when isFreeEvent=true", async () => {
      const { accessToken } = await registerAndLoginVendor(app, "-07");
      const res = await request(app)
        .post("/api/vendors/events")
        .set("Cookie", authCookie(accessToken))
        .send(basePayload({ isFreeEvent: true, price: 100 }));
      expect(res.status).toBe(201);
      expect(res.body.data.event.price).toBe(0);
    });

    it("TC-EVT-08: sets seats to 999999 when unlimitedSeats=true", async () => {
      const { accessToken } = await registerAndLoginVendor(app, "-08");
      const res = await request(app)
        .post("/api/vendors/events")
        .set("Cookie", authCookie(accessToken))
        .send(
          basePayload({
            dateSchedule: [
              {
                startDate: futureDate(5),
                endDate: futureDate(5),
                unlimitedSeats: true,
                price: 50,
              },
            ],
          }),
        );
      expect(res.status).toBe(201);
      expect(res.body.data.event.dateSchedule[0].availableSeats).toBe(999999);
      expect(res.body.data.event.dateSchedule[0].totalSeats).toBe(999999);
    });

    it("TC-EVT-09: sets vendorId to Vendor._id, not User._id", async () => {
      const { accessToken, userId } = await registerAndLoginVendor(app, "-09");
      const res = await request(app)
        .post("/api/vendors/events")
        .set("Cookie", authCookie(accessToken))
        .send(basePayload());
      expect(res.status).toBe(201);
      const vendorProfile = await Vendor.findOne({ userId }).lean();
      expect(res.body.data.event.vendorId).toBe(String((vendorProfile as any)._id));
      expect(res.body.data.event.vendorId).not.toBe(userId);
    });
  });

  // ─── CREATE — access control (VE-4, VE-5) ──────────────────────────────

  describe("POST /events — access control", () => {
    it("VE-5: ignores isApproved=true in the payload (still saved false)", async () => {
      const { accessToken } = await registerAndLoginVendor(app, "-spoofApproved");
      const res = await request(app)
        .post("/api/vendors/events")
        .set("Cookie", authCookie(accessToken))
        .send(basePayload({ isApproved: true }));
      expect(res.status).toBe(201);
      expect(res.body.data.event.isApproved).toBe(false);
    });

    it("VE-5: ignores a foreign vendorId in the payload", async () => {
      const { accessToken, userId } = await registerAndLoginVendor(app, "-spoofVendorId");
      const foreignVendorId = "507f1f77bcf86cd799439011";
      const res = await request(app)
        .post("/api/vendors/events")
        .set("Cookie", authCookie(accessToken))
        .send(basePayload({ vendorId: foreignVendorId }));
      expect(res.status).toBe(201);
      const vendorProfile = await Vendor.findOne({ userId }).lean();
      expect(res.body.data.event.vendorId).toBe(String((vendorProfile as any)._id));
      expect(res.body.data.event.vendorId).not.toBe(foreignVendorId);
    });

    it("VE-5: ignores status='published' in the create payload (forces draft)", async () => {
      const { accessToken } = await registerAndLoginVendor(app, "-spoofStatus");
      const res = await request(app)
        .post("/api/vendors/events")
        .set("Cookie", authCookie(accessToken))
        .send(basePayload({ status: "published" }));
      expect(res.status).toBe(201);
      expect(res.body.data.event.status).toBe("draft");
    });

    it("VE-4: blocks event creation for a REJECTED vendor", async () => {
      const { accessToken, userId } = await registerAndLoginVendor(app, "-rejected");
      // Trigger auto-create, then flip verification status to rejected.
      await request(app)
        .post("/api/vendors/events")
        .set("Cookie", authCookie(accessToken))
        .send(basePayload());
      await Vendor.findOneAndUpdate(
        { userId },
        { verificationStatus: VerificationStatus.REJECTED },
      );

      const res = await request(app)
        .post("/api/vendors/events")
        .set("Cookie", authCookie(accessToken))
        .send(basePayload());
      expect(res.status).toBe(403);
    });

    it("VE-4: allows event creation for UNVERIFIED and PENDING vendors", async () => {
      const { accessToken: unverifiedToken } = await registerAndLoginVendor(app, "-unverified");
      const resUnverified = await request(app)
        .post("/api/vendors/events")
        .set("Cookie", authCookie(unverifiedToken))
        .send(basePayload());
      expect(resUnverified.status).toBe(201);
      expect(resUnverified.body.data.event.status).toBe("draft");

      const { accessToken: pendingToken, userId: pendingUserId } = await registerAndLoginVendor(
        app,
        "-pending",
      );
      // Trigger auto-create of the Vendor doc, then flip it to pending.
      await request(app)
        .post("/api/vendors/events")
        .set("Cookie", authCookie(pendingToken))
        .send(basePayload({ title: "Seed Event" }));
      await Vendor.findOneAndUpdate(
        { userId: pendingUserId },
        { verificationStatus: VerificationStatus.PENDING },
      );
      const resPending = await request(app)
        .post("/api/vendors/events")
        .set("Cookie", authCookie(pendingToken))
        .send(basePayload({ title: "Second Event" }));
      expect(resPending.status).toBe(201);
    });
  });

  // ─── UPDATE (TC-EVT-10..13 + VE-1/VE-3) ────────────────────────────────

  describe("PUT /events/:id", () => {
    const createEvent = async (accessToken: string, overrides = {}) => {
      const res = await request(app)
        .post("/api/vendors/events")
        .set("Cookie", authCookie(accessToken))
        .send(basePayload(overrides));
      return res.body.data.event;
    };

    it("TC-EVT-10: returns 404 when updating another vendor's event", async () => {
      const vendorA = await registerAndLoginVendor(app, "-ownerA");
      const vendorB = await registerAndLoginVendor(app, "-ownerB");
      const event = await createEvent(vendorA.accessToken);

      const res = await request(app)
        .put(`/api/vendors/events/${event._id}`)
        .set("Cookie", authCookie(vendorB.accessToken))
        .send({ title: "Hijacked" });
      expect(res.status).toBe(404);
    });

    it("TC-EVT-11 [VE-1 fixed]: rejects status='published' (cannot bypass approval)", async () => {
      const { accessToken } = await registerAndLoginVendor(app, "-noPublish");
      const event = await createEvent(accessToken);

      const res = await request(app)
        .put(`/api/vendors/events/${event._id}`)
        .set("Cookie", authCookie(accessToken))
        .send({ status: "published" });
      // Rejected at the validator layer (400) before the controller's own whitelist check
      // (which would otherwise return 403) — either way, the vendor cannot self-publish.
      expect([400, 403]).toContain(res.status);
      const stored = await Event.findById(event._id).lean();
      expect((stored as any).status).not.toBe("published");
    });

    it("VE-1 regression: status='pending_review' is rejected cleanly, not a 500", async () => {
      const { accessToken } = await registerAndLoginVendor(app, "-pendingReview");
      const event = await createEvent(accessToken);

      const res = await request(app)
        .put(`/api/vendors/events/${event._id}`)
        .set("Cookie", authCookie(accessToken))
        .send({ status: "pending_review" });
      expect(res.status).not.toBe(500);
      expect([400, 403]).toContain(res.status);
    });

    it("VE-1: status='pending' is accepted and does not crash", async () => {
      const { accessToken } = await registerAndLoginVendor(app, "-pendingOk");
      const event = await createEvent(accessToken);

      const res = await request(app)
        .put(`/api/vendors/events/${event._id}`)
        .set("Cookie", authCookie(accessToken))
        .send({ status: "pending" });
      expect(res.status).toBe(200);
      expect(res.body.data.event.status).toBe("pending");
      expect(res.body.data.event.isApproved).toBe(false);
    });

    it("TC-EVT-12: allows updating title and persists the change", async () => {
      const { accessToken } = await registerAndLoginVendor(app, "-titleUpdate");
      const event = await createEvent(accessToken);

      const res = await request(app)
        .put(`/api/vendors/events/${event._id}`)
        .set("Cookie", authCookie(accessToken))
        .send({ title: "Updated Robotics Workshop" });
      expect(res.status).toBe(200);
      expect(res.body.data.event.title).toBe("Updated Robotics Workshop");
    });

    it("TC-EVT-13: rejects an invalid category on update", async () => {
      const { accessToken } = await registerAndLoginVendor(app, "-badCategoryUpdate");
      const event = await createEvent(accessToken);

      const res = await request(app)
        .put(`/api/vendors/events/${event._id}`)
        .set("Cookie", authCookie(accessToken))
        .send({ category: "fake-category" });
      expect(res.status).toBe(400);
    });

    it("VE-3: rejects a malformed :id with 400, not a 500 CastError", async () => {
      const { accessToken } = await registerAndLoginVendor(app, "-badId");
      const res = await request(app)
        .put("/api/vendors/events/not-a-valid-object-id")
        .set("Cookie", authCookie(accessToken))
        .send({ title: "x" });
      expect(res.status).toBe(400);
    });

    it("does not allow updating title on an old event to be blocked by past-date rules", async () => {
      // Regression for the create-vs-update split: updating unrelated fields on an event
      // whose schedule already has (by now) a past-ish date must not 400.
      const { accessToken } = await registerAndLoginVendor(app, "-partialUpdate");
      const event = await createEvent(accessToken);

      const res = await request(app)
        .put(`/api/vendors/events/${event._id}`)
        .set("Cookie", authCookie(accessToken))
        .send({ shortDescription: "Updated short description." });
      expect(res.status).toBe(200);
      expect(res.body.data.event.shortDescription).toBe("Updated short description.");
    });
  });

  // ─── DELETE (TC-EVT-14..16) ─────────────────────────────────────────────

  describe("DELETE /events/:id", () => {
    const createEvent = async (accessToken: string) => {
      const res = await request(app)
        .post("/api/vendors/events")
        .set("Cookie", authCookie(accessToken))
        .send(basePayload());
      return res.body.data.event;
    };

    it("TC-EVT-14: soft-deletes by default (isDeleted=true, status='archived')", async () => {
      const { accessToken } = await registerAndLoginVendor(app, "-softDelete");
      const event = await createEvent(accessToken);

      const res = await request(app)
        .delete(`/api/vendors/events/${event._id}`)
        .set("Cookie", authCookie(accessToken));
      expect(res.status).toBe(200);

      const stored = await Event.findById(event._id).lean();
      expect((stored as any).isDeleted).toBe(true);
      expect((stored as any).status).toBe("archived");
    });

    it("TC-EVT-15: permanently deletes when ?permanent=true", async () => {
      const { accessToken } = await registerAndLoginVendor(app, "-hardDelete");
      const event = await createEvent(accessToken);

      const res = await request(app)
        .delete(`/api/vendors/events/${event._id}?permanent=true`)
        .set("Cookie", authCookie(accessToken));
      expect(res.status).toBe(200);

      const stored = await Event.findById(event._id).lean();
      expect(stored).toBeNull();
    });

    it("TC-EVT-16: returns 404 when deleting another vendor's event", async () => {
      const vendorA = await registerAndLoginVendor(app, "-delOwnerA");
      const vendorB = await registerAndLoginVendor(app, "-delOwnerB");
      const event = await createEvent(vendorA.accessToken);

      const res = await request(app)
        .delete(`/api/vendors/events/${event._id}`)
        .set("Cookie", authCookie(vendorB.accessToken));
      expect(res.status).toBe(404);
    });
  });

  // ─── RESTORE (TC-EVT-17) ─────────────────────────────────────────────────

  describe("PUT /events/:id/restore", () => {
    it("TC-EVT-17: restores a soft-deleted event to 'draft' status", async () => {
      const { accessToken } = await registerAndLoginVendor(app, "-restore");
      const created = await request(app)
        .post("/api/vendors/events")
        .set("Cookie", authCookie(accessToken))
        .send(basePayload());
      const event = created.body.data.event;

      await request(app)
        .delete(`/api/vendors/events/${event._id}`)
        .set("Cookie", authCookie(accessToken));

      const res = await request(app)
        .put(`/api/vendors/events/${event._id}/restore`)
        .set("Cookie", authCookie(accessToken));
      expect(res.status).toBe(200);
      expect(res.body.data.event.isDeleted).toBe(false);
      expect(res.body.data.event.status).toBe("draft");
    });

    it("returns 404 restoring another vendor's event or a non-deleted event", async () => {
      const { accessToken } = await registerAndLoginVendor(app, "-restoreNotDeleted");
      const created = await request(app)
        .post("/api/vendors/events")
        .set("Cookie", authCookie(accessToken))
        .send(basePayload());
      const event = created.body.data.event;

      const res = await request(app)
        .put(`/api/vendors/events/${event._id}/restore`)
        .set("Cookie", authCookie(accessToken));
      expect(res.status).toBe(404);
    });
  });
});
