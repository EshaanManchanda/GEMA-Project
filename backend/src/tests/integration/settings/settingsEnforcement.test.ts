/**
 * Integration tests — Admin Settings enforcement
 *
 * Exercises the settings audit's core finding end-to-end: every toggle on
 * /admin/settings must actually change backend behavior, not just persist.
 * Covers, against a real (in-memory) DB and real routes:
 *  - allowRegistration: blocks/allows new account creation
 *  - autoApproveVendors: new vendor profile verificationStatus
 *  - autoApproveEvents: new vendor event status/isApproved
 *  - maintenanceMode: blocks a public route, never blocks /api/admin or /api/health
 *  - PUT /api/admin/app-settings: rejects a non-boolean toggle value (400)
 */

import request from "supertest";
import { Application } from "express";
import User, { UserStatus } from "../../../models/User";
import Vendor, { VerificationStatus } from "../../../models/Vendor";
import SystemSettings from "../../../models/SystemSettings";
import { createTestApp } from "../setup/testApp";
import { connectTestDB, clearTestDB, closeTestDB } from "../setup/testDB";

// ---------------------------------------------------------------------------
// Mocks — must come before any module that imports them (same set used by
// event.crud.test.ts / vendor.event.crud.test.ts for this transitive chain).
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

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret-key-32chars!!";
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || "test-jwt-refresh-secret-32chars!";
process.env.JWT_EXPIRES_IN = "15m";
process.env.JWT_REFRESH_EXPIRES_IN = "7d";
process.env.NODE_ENV = "test";
process.env.ADMIN_SECRET_KEY = "test-admin-secret";
process.env.BCRYPT_SALT_ROUNDS = "4";
process.env.SESSION_SECRET = "test-session-secret";

// createTestApp() (setup/testApp.ts) already mounts auth + events +
// admin/events + admin settings routes, plus the global maintenanceModeGuard
// ahead of the route table — reused here rather than re-assembling a local
// app, matching every other suite in this directory.

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const extractCookie = (cookies: string[], name: string): string => {
  const c = cookies.find((h) => h.startsWith(`${name}=`));
  if (!c) return "";
  return c.split(";")[0].replace(`${name}=`, "");
};

const authCookie = (token: string) => `accessToken=${token}`;

const uniqueEmail = (label: string) =>
  `${label}.${Date.now()}.${Math.random().toString(36).slice(2)}@example.com`;

/** Register (role passed straight through to /register so getOrCreateVendorProfile runs), verify + activate, log in. */
const registerAndLogin = async (
  app: Application,
  role: "customer" | "vendor" | "admin",
  emailLabel: string,
): Promise<{ accessToken: string; userId: string }> => {
  const email = uniqueEmail(emailLabel);
  const password = "Test@1234!";

  if (role === "admin") {
    await request(app)
      .post("/api/auth/register-admin")
      .send({ firstName: "Test", lastName: "Admin", email, password, adminSecretKey: "test-admin-secret" });
  } else {
    await request(app)
      .post("/api/auth/register")
      .send({ firstName: "Test", lastName: role === "vendor" ? "Vendor" : "Customer", email, password, role });
    await User.findOneAndUpdate(
      { email },
      { isEmailVerified: true, status: UserStatus.ACTIVE },
    );
  }

  const loginRes = await request(app).post("/api/auth/login").send({ email, password });
  const cookies: string[] = (loginRes.headers["set-cookie"] as unknown as string[]) || [];
  const accessToken = extractCookie(cookies, "accessToken");

  const user = await User.findOne({ email }).lean();
  const userId = (user as any)._id.toString();

  return { accessToken, userId };
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Admin settings enforcement", () => {
  let app: Application;

  beforeAll(async () => {
    await connectTestDB();
    app = createTestApp();
  });

  afterAll(async () => {
    await closeTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
  });

  describe("allowRegistration", () => {
    it("blocks new account creation with REGISTRATION_DISABLED when the toggle is off", async () => {
      const settings = await SystemSettings.getSettings();
      settings.allowRegistration = false;
      await settings.save();

      const res = await request(app)
        .post("/api/auth/register")
        .send({
          firstName: "Blocked",
          lastName: "User",
          email: uniqueEmail("blocked"),
          password: "Test@1234!",
        });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe("REGISTRATION_DISABLED");
    });

    it("allows new account creation when the toggle is on (default)", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          firstName: "Allowed",
          lastName: "User",
          email: uniqueEmail("allowed"),
          password: "Test@1234!",
        });

      expect(res.status).toBe(201);
    });

    it("does not block existing-account login when the toggle is off", async () => {
      const { accessToken } = await registerAndLogin(app, "customer", "existing");
      expect(accessToken).toBeTruthy();

      const settings = await SystemSettings.getSettings();
      settings.allowRegistration = false;
      await settings.save();

      const user = await User.findOne({}).sort({ createdAt: -1 }).lean();
      const loginRes = await request(app)
        .post("/api/auth/login")
        .send({ email: (user as any).email, password: "Test@1234!" });

      expect(loginRes.status).toBe(200);
    });
  });

  describe("autoApproveVendors", () => {
    it("creates a PENDING vendor profile when the toggle is off (default)", async () => {
      const { userId } = await registerAndLogin(app, "vendor", "vendorpending");
      const vendor = await Vendor.findOne({ userId }).lean();
      expect(vendor?.verificationStatus).toBe(VerificationStatus.PENDING);
    });

    it("creates a VERIFIED vendor profile when the toggle is on", async () => {
      const settings = await SystemSettings.getSettings();
      settings.autoApproveVendors = true;
      await settings.save();

      const { userId } = await registerAndLogin(app, "vendor", "vendorverified");
      const vendor = await Vendor.findOne({ userId }).lean();
      expect(vendor?.verificationStatus).toBe(VerificationStatus.VERIFIED);
    });
  });

  // autoApproveEvents (vendor event status/isApproved) is covered in its own
  // file — see autoApproveEvents.test.ts — since it's the one scenario here
  // that reaches eventService.createEvent's Mongo session/transaction path.

  describe("maintenanceMode", () => {
    it("blocks a public route with 503 MAINTENANCE_MODE when on", async () => {
      const settings = await SystemSettings.getSettings();
      settings.maintenanceMode = true;
      await settings.save();

      const res = await request(app).get("/api/events");

      expect(res.status).toBe(503);
      expect(res.body.code).toBe("MAINTENANCE_MODE");
    });

    it("never blocks /api/health or /api/admin/* for an existing admin even when on", async () => {
      // Register the admin BEFORE flipping maintenance mode on — account
      // creation itself is a separate concern (registration toggle), not
      // what this test is verifying.
      const { accessToken } = await registerAndLogin(app, "admin", "maintadmin");

      const settings = await SystemSettings.getSettings();
      settings.maintenanceMode = true;
      await settings.save();

      const health = await request(app).get("/api/health");
      expect(health.status).toBe(200);

      const adminSettings = await request(app)
        .get("/api/admin/app-settings")
        .set("Cookie", authCookie(accessToken));
      expect(adminSettings.status).toBe(200);
    });

    it("allows a public route again once turned back off", async () => {
      const settings = await SystemSettings.getSettings();
      settings.maintenanceMode = true;
      await settings.save();
      settings.maintenanceMode = false;
      await settings.save();

      const res = await request(app).get("/api/events");
      expect(res.status).toBe(200);
    });
  });

  describe("PUT /api/admin/app-settings validation", () => {
    it("rejects a non-boolean toggle value with 400", async () => {
      const { accessToken } = await registerAndLogin(app, "admin", "validationadmin");

      const res = await request(app)
        .put("/api/admin/app-settings")
        .set("Cookie", authCookie(accessToken))
        .send({ systemSettings: { maintenanceMode: "yes" } });

      expect(res.status).toBe(400);
    });

    it("accepts a valid boolean toggle update and persists it", async () => {
      const { accessToken } = await registerAndLogin(app, "admin", "validupdateadmin");

      const res = await request(app)
        .put("/api/admin/app-settings")
        .set("Cookie", authCookie(accessToken))
        .send({ systemSettings: { autoApproveReviews: true } });

      expect(res.status).toBe(200);
      expect(res.body.data.systemSettings.autoApproveReviews).toBe(true);

      const persisted = await SystemSettings.getSettings();
      expect(persisted.autoApproveReviews).toBe(true);
    });
  });
});
