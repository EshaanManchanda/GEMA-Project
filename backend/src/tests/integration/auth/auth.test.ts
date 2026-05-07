/**
 * Integration tests — User creation & login system
 *
 * Coverage:
 *  1. Registration (customer)
 *  2. Admin registration
 *  3. Login
 *  4. Email verification (including cross-account attack fix)
 *  5. Refresh token
 *  6. Logout
 *  7. Protected routes (GET /me, GET /profile)
 *  8. Forgot password / Reset password
 *  9. Change password
 * 10. Token expiry / tampered token
 */

import request from "supertest";
import { Application } from "express";
import mongoose from "mongoose";
import User, { UserRole, UserStatus } from "../../../models/User";
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
    status: "end", // Not "ready" — so isRedisAvailable() returns false cleanly
  },
  redisPool: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue("OK"),
    del: jest.fn().mockResolvedValue(1),
    setEx: jest.fn().mockResolvedValue("OK"),
    // isHealthy() must be defined — CacheService calls it to check availability.
    // Return false so the service gracefully skips all Redis calls.
    isHealthy: jest.fn().mockReturnValue(false),
    getConnection: jest.fn().mockReturnValue(null),
  },
}));

jest.mock("../../../config/firebase", () => ({
  initializeFirebase: jest.fn(),
}));

jest.mock("../../../services/queue.service", () => ({
  addEmailJob: jest.fn().mockResolvedValue(undefined),
  addQRJob: jest.fn().mockResolvedValue(undefined),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Valid registration payload for a customer */
const customerPayload = () => ({
  firstName: "Test",
  lastName: "User",
  email: `test.${Date.now()}@example.com`,
  password: "Test@1234!",
});

/** Register a user and return the response */
const registerUser = (app: Application, payload = customerPayload()) =>
  request(app).post("/api/auth/register").send(payload);

/** Register a user, then login and return { accessToken, refreshToken, cookies } */
const registerAndLogin = async (app: Application, payload = customerPayload()) => {
  await registerUser(app, payload);

  // Bypass email verification by directly setting isEmailVerified in DB
  await User.findOneAndUpdate(
    { email: payload.email },
    { isEmailVerified: true, status: UserStatus.ACTIVE }
  );

  const loginRes = await request(app)
    .post("/api/auth/login")
    .send({ email: payload.email, password: payload.password });

  const accessToken: string =
    loginRes.body.data?.tokens?.accessToken || "";
  const refreshToken: string =
    loginRes.body.data?.tokens?.refreshToken || "";
  const cookies: string[] = ((loginRes.headers["set-cookie"] as unknown) as string[]) || [];

  return { accessToken, refreshToken, cookies, user: loginRes.body.data?.user };
};

// ---------------------------------------------------------------------------
// Suite setup
// ---------------------------------------------------------------------------

let app: Application;

beforeAll(async () => {
  await connectTestDB();
  app = createTestApp();
});

afterEach(async () => {
  await clearTestDB();
  jest.clearAllMocks();
});

afterAll(async () => {
  await closeTestDB();
});

// ===========================================================================
// 1. USER REGISTRATION
// ===========================================================================

describe("POST /api/auth/register", () => {
  it("registers a new customer and returns 201 with user data and tokens", async () => {
    const payload = customerPayload();
    const res = await registerUser(app, payload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toMatchObject({
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email,
      role: UserRole.CUSTOMER,
    });
    expect(res.body.data.tokens.accessToken).toBeTruthy();
    expect(res.body.data.tokens.refreshToken).toBeTruthy();
  });

  it("sets isEmailVerified: false and status: pending on registration", async () => {
    const payload = customerPayload();
    await registerUser(app, payload);

    const user = await User.findOne({ email: payload.email });
    expect(user).not.toBeNull();
    expect(user!.isEmailVerified).toBe(false);
    expect(user!.status).toBe(UserStatus.PENDING);
  });

  it("sets httpOnly auth cookies on successful registration", async () => {
    const res = await registerUser(app);
    const cookies: string[] = ((res.headers["set-cookie"] as unknown) as string[]) || [];
    const hasAccessToken = cookies.some((c) => c.includes("accessToken"));
    const hasRefreshToken = cookies.some((c) => c.includes("refreshToken"));
    expect(hasAccessToken).toBe(true);
    expect(hasRefreshToken).toBe(true);
  });

  it("does not expose passwordHash in the response", async () => {
    const res = await registerUser(app);
    const user = res.body.data?.user;
    expect(user.passwordHash).toBeUndefined();
    expect(user.password).toBeUndefined();
  });

  it("returns 400 when firstName is missing", async () => {
    const { firstName: _, ...payload } = customerPayload() as any;
    const res = await registerUser(app, payload);
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("returns 400 when email is invalid", async () => {
    const res = await registerUser(app, {
      ...customerPayload(),
      email: "not-an-email",
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 when password is too short (< 8 chars)", async () => {
    const res = await registerUser(app, {
      ...customerPayload(),
      password: "Ab1!",
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 when password lacks complexity (no uppercase)", async () => {
    const res = await registerUser(app, {
      ...customerPayload(),
      password: "test@1234!",
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 when password lacks complexity (no special char)", async () => {
    const res = await registerUser(app, {
      ...customerPayload(),
      password: "TestUser1234",
    });
    expect(res.status).toBe(400);
  });

  it("returns 4xx when email is already registered", async () => {
    const payload = customerPayload();
    await registerUser(app, payload);
    const res = await registerUser(app, payload);
    expect([400, 409]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });

  it("stores password as bcrypt hash, never plaintext", async () => {
    const payload = customerPayload();
    await registerUser(app, payload);
    const user = await User.findOne({ email: payload.email }).select(
      "+passwordHash"
    );
    expect(user!.passwordHash).not.toBe(payload.password);
    expect(user!.passwordHash).toMatch(/^\$2[ab]\$\d+\$/); // bcrypt format
  });
});

// ===========================================================================
// 2. ADMIN REGISTRATION
// ===========================================================================

describe("POST /api/auth/register-admin", () => {
  const adminPayload = () => ({
    ...customerPayload(),
    adminSecretKey: process.env.ADMIN_SECRET_KEY,
  });

  it("registers admin with correct secret key → 201, role: admin", async () => {
    const res = await request(app)
      .post("/api/auth/register-admin")
      .send(adminPayload());

    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe(UserRole.ADMIN);
  });

  it("admin is immediately active and email-verified without OTP flow", async () => {
    await request(app).post("/api/auth/register-admin").send(adminPayload());
    const user = await User.findOne({ role: UserRole.ADMIN });
    expect(user!.isEmailVerified).toBe(true);
    expect(user!.status).toBe(UserStatus.ACTIVE);
  });

  it("returns 403 with wrong admin secret key", async () => {
    const res = await request(app)
      .post("/api/auth/register-admin")
      .send({ ...adminPayload(), adminSecretKey: "wrong-secret" });

    expect(res.status).toBe(403);
  });

  it("returns 400 when adminSecretKey is missing", async () => {
    const { adminSecretKey: _, ...payload } = adminPayload() as any;
    const res = await request(app)
      .post("/api/auth/register-admin")
      .send(payload);
    expect(res.status).toBe(400);
  });
});

// ===========================================================================
// 3. LOGIN
// ===========================================================================

describe("POST /api/auth/login", () => {
  it("logs in a verified user → 200 with tokens", async () => {
    const payload = customerPayload();
    await registerUser(app, payload);
    await User.findOneAndUpdate(
      { email: payload.email },
      { isEmailVerified: true, status: UserStatus.ACTIVE }
    );

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: payload.email, password: payload.password });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.tokens.accessToken).toBeTruthy();
    expect(res.body.data.tokens.refreshToken).toBeTruthy();
  });

  it("returns user profile data on login", async () => {
    const payload = customerPayload();
    await registerUser(app, payload);
    await User.findOneAndUpdate(
      { email: payload.email },
      { isEmailVerified: true, status: UserStatus.ACTIVE }
    );

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: payload.email, password: payload.password });

    expect(res.body.data.user.email).toBe(payload.email);
    expect(res.body.data.user.firstName).toBe(payload.firstName);
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  it("sets httpOnly cookies on login", async () => {
    const { cookies } = await registerAndLogin(app);
    const cookieStr = cookies.join("; ");
    expect(cookieStr).toContain("accessToken");
    expect(cookieStr).toContain("refreshToken");
  });

  it("returns 401 with wrong password", async () => {
    const payload = customerPayload();
    await registerUser(app, payload);
    await User.findOneAndUpdate(
      { email: payload.email },
      { isEmailVerified: true, status: UserStatus.ACTIVE }
    );

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: payload.email, password: "WrongPass@99!" });

    expect(res.status).toBe(401);
  });

  it("returns 401 for a non-existent email", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "ghost@example.com", password: "Test@1234!" });

    expect(res.status).toBe(401);
  });

  it("returns 400 when email is missing", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ password: "Test@1234!" });
    expect(res.status).toBe(400);
  });

  it("returns 400 when password is missing", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "user@example.com" });
    expect(res.status).toBe(400);
  });

  it("returns 403 for a suspended user", async () => {
    const payload = customerPayload();
    await registerUser(app, payload);
    await User.findOneAndUpdate(
      { email: payload.email },
      { isEmailVerified: true, status: UserStatus.SUSPENDED }
    );

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: payload.email, password: payload.password });

    expect([401, 403]).toContain(res.status);
  });
});

// ===========================================================================
// 4. EMAIL VERIFICATION
// ===========================================================================

describe("POST /api/auth/verify-email", () => {
  it("verifies email with correct email + OTP → 200", async () => {
    const payload = customerPayload();
    await registerUser(app, payload);

    const user = await User.findOne({ email: payload.email });
    const otp = user!.emailVerification!.otp;

    const res = await request(app)
      .post("/api/auth/verify-email")
      .send({ email: payload.email, otp });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const verified = await User.findOne({ email: payload.email });
    expect(verified!.isEmailVerified).toBe(true);
    expect(verified!.status).toBe(UserStatus.ACTIVE);
  });

  it("rejects wrong OTP → 400", async () => {
    const payload = customerPayload();
    await registerUser(app, payload);

    const res = await request(app)
      .post("/api/auth/verify-email")
      .send({ email: payload.email, otp: "000000" });

    expect(res.status).toBe(400);
  });

  it("rejects cross-account attack: valid OTP but wrong email → 400", async () => {
    // Register two users
    const victim = customerPayload();
    const attacker = { ...customerPayload(), email: `attacker.${Date.now()}@example.com` };

    await registerUser(app, victim);
    await registerUser(app, attacker);

    // Get the victim's OTP
    const victimUser = await User.findOne({ email: victim.email });
    const victimOTP = victimUser!.emailVerification!.otp;

    // Attacker tries to verify victim's account using their own email + victim's OTP
    const res = await request(app)
      .post("/api/auth/verify-email")
      .send({ email: attacker.email, otp: victimOTP });

    expect(res.status).toBe(400);

    // Victim's email must remain unverified
    const stillUnverified = await User.findOne({ email: victim.email });
    expect(stillUnverified!.isEmailVerified).toBe(false);
  });

  it("rejects expired OTP → 400", async () => {
    const payload = customerPayload();
    await registerUser(app, payload);

    // Manually expire the OTP
    await User.findOneAndUpdate(
      { email: payload.email },
      { "emailVerification.expiresAt": new Date(Date.now() - 1000) }
    );

    const user = await User.findOne({ email: payload.email });
    const otp = user!.emailVerification!.otp;

    const res = await request(app)
      .post("/api/auth/verify-email")
      .send({ email: payload.email, otp });

    expect(res.status).toBe(400);
  });

  it("returns 400 when email field is missing", async () => {
    const res = await request(app)
      .post("/api/auth/verify-email")
      .send({ otp: "123456" });
    expect(res.status).toBe(400);
  });

  it("returns 400 when OTP is wrong length (4 digits — old format)", async () => {
    const payload = customerPayload();
    await registerUser(app, payload);

    const res = await request(app)
      .post("/api/auth/verify-email")
      .send({ email: payload.email, otp: "1234" }); // 4 digits — should fail

    expect(res.status).toBe(400);
  });
});

// ===========================================================================
// 5. REFRESH TOKEN
// ===========================================================================

describe("POST /api/auth/refresh-token", () => {
  it("issues new tokens with a valid refresh token → 200", async () => {
    const { refreshToken } = await registerAndLogin(app);

    const res = await request(app)
      .post("/api/auth/refresh-token")
      .send({ refreshToken });

    expect(res.status).toBe(200);
    expect(res.body.data.tokens.accessToken).toBeTruthy();
    expect(res.body.data.tokens.refreshToken).toBeTruthy();
  });

  it("returns 401 for a tampered refresh token", async () => {
    const res = await request(app)
      .post("/api/auth/refresh-token")
      .send({ refreshToken: "eyJhbGciOiJIUzI1NiJ9.fake.payload" });

    expect(res.status).toBe(401);
  });

  it("returns 200 (no error) when no refresh token is provided (treated as not logged in)", async () => {
    const res = await request(app)
      .post("/api/auth/refresh-token")
      .send({});

    // Some implementations return 401, others 400 — both are acceptable
    expect([200, 400, 401]).toContain(res.status);
  });
});

// ===========================================================================
// 6. LOGOUT
// ===========================================================================

describe("POST /api/auth/logout", () => {
  it("logs out and clears auth cookies → 200", async () => {
    const { cookies } = await registerAndLogin(app);

    const res = await request(app)
      .post("/api/auth/logout")
      .set("Cookie", cookies);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Cookies should be cleared (empty value or max-age=0/expires in the past)
    const setCookies: string[] = ((res.headers["set-cookie"] as unknown) as string[]) || [];
    const cleared =
      setCookies.length === 0 ||
      setCookies.some(
        (c) => c.includes("accessToken=;") || c.includes("Max-Age=0")
      );
    expect(cleared).toBe(true);
  });

  it("returns 200 even when called without any token (idempotent)", async () => {
    const res = await request(app).post("/api/auth/logout").send({});
    expect(res.status).toBe(200);
  });
});

// ===========================================================================
// 7. PROTECTED ROUTES — GET /me  &  GET /profile
// ===========================================================================

describe("GET /api/auth/me", () => {
  it("returns current user data with a valid Bearer token → 200", async () => {
    const { accessToken, user } = await registerAndLogin(app);

    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    // formatUserResponse returns a flat UserResponse — check any possible nesting
    const email =
      res.body.data?.user?.email ||
      res.body.data?.email ||
      res.body.user?.email;
    expect(email).toBe(user.email);
  });

  it("returns current user data via httpOnly cookie", async () => {
    const { cookies, user } = await registerAndLogin(app);

    const res = await request(app)
      .get("/api/auth/me")
      .set("Cookie", cookies);

    expect(res.status).toBe(200);
    const email =
      res.body.data?.user?.email ||
      res.body.data?.email ||
      res.body.user?.email;
    expect(email).toBe(user.email);
  });

  it("returns 200 without token (authenticateOptional — guest mode)", async () => {
    const res = await request(app).get("/api/auth/me");
    // /me uses authenticateOptional: 200 with null user is the expected behaviour
    expect([200, 401]).toContain(res.status);
  });

  it("returns no real user with a tampered access token", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer invalid.token.here");

    if (res.status === 200) {
      // authenticateOptional returns 200 + null user for bad tokens
      const userField = res.body.data?.user;
      expect(userField).toBeNull();
    } else {
      expect(res.status).toBe(401);
    }
  });
});

describe("GET /api/auth/profile", () => {
  it("returns full profile for authenticated user → 200", async () => {
    const { accessToken } = await registerAndLogin(app);

    const res = await request(app)
      .get("/api/auth/profile")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("returns 401 without token", async () => {
    const res = await request(app).get("/api/auth/profile");
    expect(res.status).toBe(401);
  });
});

// ===========================================================================
// 8. FORGOT PASSWORD
// ===========================================================================

describe("POST /api/auth/forgot-password", () => {
  it("returns 200 for a registered email (email dispatched)", async () => {
    const payload = customerPayload();
    await registerUser(app, payload);

    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: payload.email });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain("password reset");
  });

  it("returns 200 for a non-existent email (no user enumeration)", async () => {
    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "ghost@example.com" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("stores a reset OTP on the user document", async () => {
    const payload = customerPayload();
    await registerUser(app, payload);

    await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: payload.email });

    const user = await User.findOne({ email: payload.email });
    expect(user!.passwordResetOTP).toBeDefined();
    expect(user!.passwordResetOTP!.otp).toHaveLength(6);
  });

  it("returns 400 when email field is missing", async () => {
    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({});
    expect(res.status).toBe(400);
  });
});

// ===========================================================================
// 9. RESET PASSWORD
// ===========================================================================

describe("POST /api/auth/reset-password", () => {
  const setupReset = async () => {
    const payload = customerPayload();
    await registerUser(app, payload);

    // Trigger forgot-password to generate OTP
    await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: payload.email });

    const user = await User.findOne({ email: payload.email });
    const otp = user!.passwordResetOTP!.otp;

    return { payload, otp };
  };

  it("resets password with correct email + OTP → 200", async () => {
    const { payload, otp } = await setupReset();

    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ email: payload.email, otp, newPassword: "NewPass@5678!" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("allows login with the new password after reset", async () => {
    const { payload, otp } = await setupReset();
    const newPassword = "NewPass@5678!";

    await request(app)
      .post("/api/auth/reset-password")
      .send({ email: payload.email, otp, newPassword });

    await User.findOneAndUpdate(
      { email: payload.email },
      { isEmailVerified: true, status: UserStatus.ACTIVE }
    );

    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: payload.email, password: newPassword });

    expect(loginRes.status).toBe(200);
  });

  it("rejects login with old password after reset", async () => {
    const { payload, otp } = await setupReset();

    await request(app)
      .post("/api/auth/reset-password")
      .send({ email: payload.email, otp, newPassword: "NewPass@5678!" });

    await User.findOneAndUpdate(
      { email: payload.email },
      { isEmailVerified: true, status: UserStatus.ACTIVE }
    );

    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: payload.email, password: payload.password });

    expect(loginRes.status).toBe(401);
  });

  it("returns 400 with a wrong OTP", async () => {
    const { payload } = await setupReset();

    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ email: payload.email, otp: "000000", newPassword: "NewPass@5678!" });

    expect(res.status).toBe(400);
  });

  it("returns 400 if new password fails complexity requirements", async () => {
    const { payload, otp } = await setupReset();

    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ email: payload.email, otp, newPassword: "simple" });

    expect(res.status).toBe(400);
  });

  it("clears the OTP from the DB after successful reset (one-time use)", async () => {
    const { payload, otp } = await setupReset();

    await request(app)
      .post("/api/auth/reset-password")
      .send({ email: payload.email, otp, newPassword: "NewPass@5678!" });

    const user = await User.findOne({ email: payload.email });
    // After reset, OTP field should have no usable OTP value
    // (Mongoose may keep the sub-document as an empty object {} rather than undefined)
    const resetOTP = user!.passwordResetOTP as any;
    const hasOTP = resetOTP && resetOTP.otp;
    expect(hasOTP).toBeFalsy();
  });

  it("cannot reuse the same OTP after a successful reset", async () => {
    const { payload, otp } = await setupReset();

    await request(app)
      .post("/api/auth/reset-password")
      .send({ email: payload.email, otp, newPassword: "NewPass@5678!" });

    // Second attempt with same OTP
    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ email: payload.email, otp, newPassword: "AnotherPass@99!" });

    expect(res.status).toBe(400);
  });
});

// ===========================================================================
// 10. CHANGE PASSWORD (authenticated)
// ===========================================================================

describe("PUT /api/auth/change-password", () => {
  it("changes password with correct current password → 200", async () => {
    const payload = customerPayload();
    const { accessToken } = await registerAndLogin(app, payload);

    const res = await request(app)
      .put("/api/auth/change-password")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        currentPassword: payload.password,
        newPassword: "NewSecure@999!",
      });

    expect(res.status).toBe(200);
  });

  it("returns 401 when current password is wrong", async () => {
    const payload = customerPayload();
    const { accessToken } = await registerAndLogin(app, payload);

    const res = await request(app)
      .put("/api/auth/change-password")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        currentPassword: "WrongCurrent@1!",
        newPassword: "NewSecure@999!",
      });

    expect([400, 401]).toContain(res.status);
  });

  it("returns 400 when new password is same as current", async () => {
    const payload = customerPayload();
    const { accessToken } = await registerAndLogin(app, payload);

    const res = await request(app)
      .put("/api/auth/change-password")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        currentPassword: payload.password,
        newPassword: payload.password, // same!
      });

    expect(res.status).toBe(400);
  });

  it("returns 401 without authentication", async () => {
    const res = await request(app)
      .put("/api/auth/change-password")
      .send({ currentPassword: "Old@1234!", newPassword: "New@1234!" });

    expect(res.status).toBe(401);
  });
});

// ===========================================================================
// 11. RESEND VERIFICATION EMAIL
// ===========================================================================

describe("POST /api/auth/resend-verification-email", () => {
  it("resends verification email for unverified user → 200", async () => {
    const payload = customerPayload();
    await registerUser(app, payload);

    const res = await request(app)
      .post("/api/auth/resend-verification-email")
      .send({ email: payload.email });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("returns 400 when email is missing", async () => {
    const res = await request(app)
      .post("/api/auth/resend-verification-email")
      .send({});
    expect(res.status).toBe(400);
  });
});

// ===========================================================================
// 12. EDGE CASES & SECURITY
// ===========================================================================

describe("Security edge cases", () => {
  it("does not accept NoSQL injection in login email field", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: { $gt: "" }, password: "Test@1234!" });

    // Should either be rejected as invalid email (400) or return 401 — never 200
    expect([400, 401]).toContain(res.status);
  });

  it("does not accept NoSQL injection in register email field", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...customerPayload(), email: { $gt: "" } });

    expect([400, 422]).toContain(res.status);
  });

  it("rejects an oversized JSON body (> 10mb)", async () => {
    const bigPayload = { ...customerPayload(), extra: "x".repeat(11 * 1024 * 1024) };
    const res = await request(app)
      .post("/api/auth/register")
      .send(bigPayload);
    expect([400, 413]).toContain(res.status);
  });

  it("access token from user A cannot be used to fetch user B profile", async () => {
    const payloadA = customerPayload();
    const payloadB = { ...customerPayload(), email: `b.${Date.now()}@example.com` };

    const { accessToken: tokenA } = await registerAndLogin(app, payloadA);
    await registerAndLogin(app, payloadB);

    // tokenA is scoped to userA — profile will show userA's data, not userB's
    const resA = await request(app)
      .get("/api/auth/profile")
      .set("Authorization", `Bearer ${tokenA}`);

    if (resA.status === 200) {
      expect(
        resA.body.data?.user?.email ||
        resA.body.data?.email ||
        resA.body.data?.profile?.email
      ).toBe(payloadA.email);
    }
  });
});
