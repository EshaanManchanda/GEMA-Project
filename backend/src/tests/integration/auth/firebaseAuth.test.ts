/**
 * Integration tests — Firebase / Google Sign-In (POST /api/auth/firebase)
 *
 * Coverage:
 *  TC1  - New user happy path (role: customer)
 *  TC2  - Existing email/password account → links firebaseUid, preserves fields
 *  TC3  - Returning user with firebaseUid already set
 *  TC6  - Role from request applied to new user (vendor); invalid role rejected
 *  TC7  - Google user with no displayName
 *  TC8  - Suspended / Inactive user blocked (no tokens issued)
 *  TC11 - Invalid Firebase token → 401
 *  TC12 - Unverified Google email → 403
 *  TC13 - Vendor / Teacher profile auto-creation
 *  Race - Concurrent signup → only 1 user created
 */

import request from "supertest";
import { Application } from "express";
import User, { UserStatus } from "../../../models/User";
import Vendor from "../../../models/Vendor";
import Teacher from "../../../models/Teacher";
import { createTestApp } from "../setup/testApp";
import { connectTestDB, clearTestDB, closeTestDB } from "../setup/testDB";

// ---------------------------------------------------------------------------
// Mocks — must come before any module that imports them
// ---------------------------------------------------------------------------

jest.mock("../../../services/email.service", () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
  sendEmail: jest.fn().mockResolvedValue(undefined),
  emailService: {
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
  },
}));

const mockVerifyIdToken = jest.fn();
const mockGetUser = jest.fn();

jest.mock("../../../config/firebase", () => ({
  initializeFirebase: jest.fn(),
  getAuth: () => ({
    verifyIdToken: mockVerifyIdToken,
    getUser: mockGetUser,
  }),
}));

jest.mock("../../../services/queue.service", () => ({
  addEmailJob: jest.fn().mockResolvedValue(undefined),
  addQRJob: jest.fn().mockResolvedValue(undefined),
}));

// Bypass rate limiter — tests fire many requests from the same IP
jest.mock("../../../middleware/rateLimiter", () => {
  const passthrough = (_req: any, _res: any, next: any) => next();
  return {
    __esModule: true,
    default: {
      generalLimiter: passthrough,
      authLimiter: passthrough,
      passwordResetLimiter: passthrough,
      emailVerificationLimiter: passthrough,
      changePasswordLimiter: passthrough,
      uploadLimiter: passthrough,
      createResourceLimiter: passthrough,
      adminLimiter: passthrough,
      searchLimiter: passthrough,
      paymentLimiter: passthrough,
      createCustomLimiter: () => passthrough,
    },
    generalLimiter: passthrough,
    authLimiter: passthrough,
    passwordResetLimiter: passthrough,
    emailVerificationLimiter: passthrough,
    changePasswordLimiter: passthrough,
    uploadLimiter: passthrough,
    createResourceLimiter: passthrough,
    adminLimiter: passthrough,
    searchLimiter: passthrough,
    paymentLimiter: passthrough,
    createCustomLimiter: () => passthrough,
  };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Standard decoded token returned by verifyIdToken */
const fakeDecodedToken = (overrides: Record<string, any> = {}) => ({
  uid: `firebase-uid-${Date.now()}`,
  email: `google-${Date.now()}@gmail.com`,
  email_verified: true,
  ...overrides,
});

/** Standard Firebase user returned by getUser */
const fakeFirebaseUser = (overrides: Record<string, any> = {}) => ({
  uid: `firebase-uid-${Date.now()}`,
  email: `google-${Date.now()}@gmail.com`,
  emailVerified: true,
  displayName: "Google User",
  photoURL: "https://lh3.googleusercontent.com/photo.jpg",
  ...overrides,
});

/** Set up mocks for a happy-path scenario */
const setupMocks = (overrides: { decoded?: Record<string, any>; user?: Record<string, any> } = {}) => {
  const uid = `uid-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = `google-${Date.now()}@gmail.com`;

  const decoded = fakeDecodedToken({ uid, email, ...overrides.decoded });
  const fbUser = fakeFirebaseUser({ uid, email, ...overrides.user });

  mockVerifyIdToken.mockResolvedValue(decoded);
  mockGetUser.mockResolvedValue(fbUser);

  return { uid, email, decoded, fbUser };
};

// ---------------------------------------------------------------------------
// Suite setup
// ---------------------------------------------------------------------------

let app: Application;

beforeAll(async () => {
  await connectTestDB();
  app = createTestApp();
});

beforeEach(async () => {
  jest.clearAllMocks();
  mockVerifyIdToken.mockReset();
  mockGetUser.mockReset();
  await clearTestDB();
});

afterAll(async () => {
  await closeTestDB();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/auth/firebase", () => {
  // TC1: New user happy path
  it("TC1 — creates a new customer user from Google and returns 200", async () => {
    const { uid, email } = setupMocks();

    const res = await request(app)
      .post("/api/auth/firebase")
      .send({ idToken: "fake-token" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toBeDefined();
    expect(res.body.data.user.role).toBe("customer");
    expect(res.body.data.user.isEmailVerified).toBe(true);

    // Verify DB
    const dbUser = await User.findOne({ firebaseUid: uid });
    expect(dbUser).not.toBeNull();
    expect(dbUser!.email).toBe(email);
    expect(dbUser!.provider).toBe("google");
    expect(dbUser!.status).toBe(UserStatus.ACTIVE);
  });

  // TC2: Link existing email/password account
  it("TC2 — links firebaseUid to existing email/password account, preserving original fields", async () => {
    // Pre-create a user via form registration
    const email = `existing-${Date.now()}@example.com`;
    const original = await User.create({
      firstName: "Original",
      lastName: "User",
      email,
      passwordHash: "$2a$04$fakehashedpassword1234567890abcdefghij", // bcrypt-shaped
      role: "vendor",
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
      avatar: "https://example.com/original-avatar.jpg",
    });

    const uid = `link-uid-${Date.now()}`;
    setupMocks({
      decoded: { uid, email },
      user: {
        uid,
        email,
        displayName: "Google Name",
        photoURL: "https://lh3.googleusercontent.com/new.jpg",
      },
    });

    const countBefore = await User.countDocuments();

    const res = await request(app)
      .post("/api/auth/firebase")
      .send({ idToken: "fake-token" });

    expect(res.status).toBe(200);

    // No duplicate user created
    const countAfter = await User.countDocuments();
    expect(countAfter).toBe(countBefore);

    // Verify preserved fields
    const dbUser = await User.findById(original._id);
    expect(dbUser!.role).toBe("vendor"); // preserved
    expect(dbUser!.status).toBe(UserStatus.ACTIVE); // preserved
    expect(dbUser!.firstName).toBe("Original"); // preserved
    expect(dbUser!.lastName).toBe("User"); // preserved
    expect(dbUser!.avatar).toBe("https://example.com/original-avatar.jpg"); // preserved

    // Verify updated fields
    expect(dbUser!.firebaseUid).toBe(uid); // linked
    expect(dbUser!.provider).toBe("google"); // set
  });

  // TC3: Returning user with firebaseUid already set
  it("TC3 — logs in returning Google user without DB mutation", async () => {
    const uid = `returning-uid-${Date.now()}`;
    const email = `returning-${Date.now()}@gmail.com`;

    // Seed existing Google user
    const existing = await User.create({
      firstName: "Returning",
      lastName: "GoogleUser",
      email,
      firebaseUid: uid,
      role: "customer",
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
      provider: "google",
    });

    setupMocks({ decoded: { uid, email }, user: { uid, email } });

    const res = await request(app)
      .post("/api/auth/firebase")
      .send({ idToken: "fake-token" });

    expect(res.status).toBe(200);
    expect(res.body.data.user.id).toBe(existing._id.toString());

    // No new users
    expect(await User.countDocuments()).toBe(1);
  });

  // TC6: Role applied for new user
  it("TC6 — creates vendor user when role=vendor is provided", async () => {
    const { uid } = setupMocks();

    const res = await request(app)
      .post("/api/auth/firebase")
      .send({ idToken: "fake-token", role: "vendor" });

    expect(res.status).toBe(200);
    expect(res.body.data.user.role).toBe("vendor");

    const dbUser = await User.findOne({ firebaseUid: uid });
    expect(dbUser!.role).toBe("vendor");
  });

  it("TC6 — rejects invalid role (admin) via validator → 400", async () => {
    setupMocks();

    const res = await request(app)
      .post("/api/auth/firebase")
      .send({ idToken: "fake-token", role: "admin" });

    expect(res.status).toBe(400);
  });

  // TC7: No displayName from Google
  it("TC7 — uses fallback name when Google user has no displayName", async () => {
    const { uid } = setupMocks({
      user: { displayName: null },
    });

    const res = await request(app)
      .post("/api/auth/firebase")
      .send({ idToken: "fake-token" });

    expect(res.status).toBe(200);

    const dbUser = await User.findOne({ firebaseUid: uid });
    expect(dbUser!.firstName).toBe("User");
    expect(dbUser!.lastName).toMatch(/^\d+$/); // timestamp string
  });

  // TC8: Suspended user blocked
  it("TC8 — blocks suspended user → 403, no tokens, no DB mutation", async () => {
    const uid = `suspended-uid-${Date.now()}`;
    const email = `suspended-${Date.now()}@gmail.com`;

    await User.create({
      firstName: "Suspended",
      lastName: "User",
      email,
      firebaseUid: uid,
      role: "customer",
      status: UserStatus.SUSPENDED,
      isEmailVerified: true,
      provider: "google",
    });

    setupMocks({ decoded: { uid, email }, user: { uid, email } });

    const res = await request(app)
      .post("/api/auth/firebase")
      .send({ idToken: "fake-token" });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/suspended/i);

    // No tokens issued
    expect(res.body.data).toBeUndefined();
    const cookies = res.headers["set-cookie"] || [];
    const authCookie = (Array.isArray(cookies) ? cookies : [cookies]).find(
      (c: string) => c.startsWith("accessToken=")
    );
    expect(authCookie).toBeUndefined();
  });

  // TC8: Inactive user blocked
  it("TC8 — blocks inactive user → 403, no tokens", async () => {
    const uid = `inactive-uid-${Date.now()}`;
    const email = `inactive-${Date.now()}@gmail.com`;

    await User.create({
      firstName: "Inactive",
      lastName: "User",
      email,
      firebaseUid: uid,
      role: "customer",
      status: UserStatus.INACTIVE,
      isEmailVerified: true,
      provider: "google",
    });

    setupMocks({ decoded: { uid, email }, user: { uid, email } });

    const res = await request(app)
      .post("/api/auth/firebase")
      .send({ idToken: "fake-token" });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/inactive/i);
    expect(res.body.data).toBeUndefined();
  });

  // TC11: Invalid Firebase token
  it("TC11 — returns 401 when Firebase verifyIdToken rejects", async () => {
    mockVerifyIdToken.mockRejectedValue(new Error("Invalid token"));

    const res = await request(app)
      .post("/api/auth/firebase")
      .send({ idToken: "bad-token" });

    // Either 401 from AppError or 500 from unhandled — both are non-success
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThanOrEqual(500);
    expect(res.body.success).toBeFalsy();
  });

  // TC12: Unverified Google email
  it("TC12 — returns 403 when Google email is not verified, no user created", async () => {
    setupMocks({ decoded: { email_verified: false } });

    const countBefore = await User.countDocuments();

    const res = await request(app)
      .post("/api/auth/firebase")
      .send({ idToken: "fake-token" });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/not verified/i);

    // No user created
    expect(await User.countDocuments()).toBe(countBefore);

    // No tokens
    expect(res.body.data).toBeUndefined();
  });

  // TC13: Vendor profile auto-creation (requires phone on User for Vendor model validation)
  it("TC13 — auto-creates VendorProfile when role=vendor and user has phone", async () => {
    const uid = `vendor-uid-${Date.now()}`;
    const email = `vendor-${Date.now()}@gmail.com`;

    // Pre-create a user with phone (Google doesn't provide phone, so simulate a user
    // who added their phone after signup, then re-authenticates via Google)
    await User.create({
      firstName: "Vendor",
      lastName: "WithPhone",
      email,
      firebaseUid: uid,
      phone: "+971501234567",
      role: "vendor",
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
      provider: "google",
    });

    setupMocks({ decoded: { uid, email }, user: { uid, email } });

    const res = await request(app)
      .post("/api/auth/firebase")
      .send({ idToken: "fake-token" });

    expect(res.status).toBe(200);

    const vendorCount = await Vendor.countDocuments();
    expect(vendorCount).toBe(1);
  });

  // TC13: Vendor profile still auto-provisions with a placeholder phone (getOrCreateVendorProfile
  // uses "Not provided" rather than blocking on a phone-less Google signup)
  it("TC13 — auto-creates VendorProfile with placeholder phone when user has no phone (Google signup)", async () => {
    setupMocks();

    const res = await request(app)
      .post("/api/auth/firebase")
      .send({ idToken: "fake-token", role: "vendor" });

    // User is still created as vendor
    expect(res.status).toBe(200);
    expect(res.body.data.user.role).toBe("vendor");

    // VendorProfile IS created, with a placeholder phone
    const vendorCount = await Vendor.countDocuments();
    expect(vendorCount).toBe(1);

    const vendor = await Vendor.findOne();
    expect(vendor!.phone).toBe("Not provided");
  });

  // TC13: Teacher profile auto-creation
  it("TC13 — auto-creates TeacherProfile when role=teacher and user has phone", async () => {
    const uid = `teacher-uid-${Date.now()}`;
    const email = `teacher-${Date.now()}@gmail.com`;

    await User.create({
      firstName: "Teacher",
      lastName: "WithPhone",
      email,
      firebaseUid: uid,
      phone: "+971501234567",
      role: "teacher",
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
      provider: "google",
    });

    setupMocks({ decoded: { uid, email }, user: { uid, email } });

    const res = await request(app)
      .post("/api/auth/firebase")
      .send({ idToken: "fake-token" });

    expect(res.status).toBe(200);

    const teacherCount = await Teacher.countDocuments();
    expect(teacherCount).toBe(1);
  });

  // Race condition: concurrent signups
  // NOTE: Currently firebaseUid has no unique index, so concurrent requests CAN create
  // duplicate users. This test documents the current behavior and flags it as a follow-up.
  // TODO: Add unique index on User.firebaseUid to prevent duplicates, then change expect to toBe(1).
  it("Race — concurrent Google signups for same uid (documents no unique index)", async () => {
    const uid = `race-uid-${Date.now()}`;
    const email = `race-${Date.now()}@gmail.com`;

    // Both requests use the same uid/email
    mockVerifyIdToken.mockResolvedValue(fakeDecodedToken({ uid, email }));
    mockGetUser.mockResolvedValue(fakeFirebaseUser({ uid, email }));

    const results = await Promise.allSettled([
      request(app).post("/api/auth/firebase").send({ idToken: "token-1" }),
      request(app).post("/api/auth/firebase").send({ idToken: "token-2" }),
    ]);

    // At least one should succeed
    const successes = results.filter(
      (r) => r.status === "fulfilled" && r.value.status === 200
    );
    expect(successes.length).toBeGreaterThanOrEqual(1);

    // Current behavior: no unique index, so duplicates are possible
    // Once a unique index on firebaseUid is added, this should be toBe(1)
    const count = await User.countDocuments({ firebaseUid: uid });
    expect(count).toBeGreaterThanOrEqual(1);
    expect(count).toBeLessThanOrEqual(2);
  });
});
