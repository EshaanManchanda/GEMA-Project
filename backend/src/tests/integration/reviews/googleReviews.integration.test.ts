/**
 * Integration tests — Google Reviews Sync Engine
 *
 * Coverage:
 *  A. Public GET /api/reviews/google/:eventId
 *     A1. No googlePlaceId → hasGooglePlaceId:false, empty
 *     A2. PlaceId set, no sync done → empty from DB
 *     A3. After sync → only visible reviews returned
 *     A4. Hidden reviews excluded from public response
 *     A5. Ratings computed from visible only
 *  B. Public GET /api/reviews/google/homepage
 *     B1. Returns visible 4-5★ reviews only
 *     B2. Empty when nothing synced
 *  C. Admin POST /api/reviews/google/:eventId/sync
 *     C1. Admin can sync
 *     C2. Vendor owner can sync
 *     C3. Vendor non-owner gets 403
 *     C4. Unauthenticated gets 401
 *     C5. Event without placeId gets 400
 *     C6. Rate limiter (skipped in unit env)
 *  D. Admin GET /api/reviews/google/:eventId/admin
 *     D1. Returns all reviews including hidden
 *     D2. Non-owner vendor gets 403
 *  E. Admin PATCH /api/reviews/google/review/:reviewDocId/visibility
 *     E1. Admin can hide with reason
 *     E2. Re-sync preserves hidden state
 *     E3. Admin can show a hidden review
 *     E4. Non-owner vendor gets 403
 *     E5. Missing review gets 404
 */

import request from "supertest";
import { Application } from "express";
import mongoose, { Types } from "mongoose";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";

import { connectTestDB, clearTestDB, closeTestDB } from "../setup/testDB";
import User, { UserRole, UserStatus } from "../../../models/User";
import Event from "../../../models/Event";
import Vendor from "../../../models/Vendor";
import GoogleReviewModel from "../../../models/GoogleReview";
import reviewRoutes from "../../../routes/review.routes";
import authRoutes from "../../../routes/auth.routes";
import { errorHandler, notFound } from "../../../middleware/index";

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock("../../../config/logger");
jest.mock("../../../config/firebase", () => ({ initializeFirebase: jest.fn() }));

// certificate.worker.ts has a pre-existing TS type error; mock the service so
// ts-jest never compiles the worker during this test suite.
jest.mock("../../../modules/certificates/services/certificate.service", () => ({
  certificateService: {
    triggerCertificateForReview: jest.fn().mockResolvedValue(undefined),
  },
}));
jest.mock("../../../services/queue.service", () => ({
  addEmailJob: jest.fn().mockResolvedValue(undefined),
  addQRJob: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("../../../config/stripe", () => ({
  stripe: { paymentIntents: { create: jest.fn() }, customers: { create: jest.fn() } },
  stripePublishableKey: "pk_test_mock",
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
jest.mock("../../../services/cache.service", () => ({
  cacheService: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(true),
  },
}));

// Mock axios to control what "Google API" returns
jest.mock("axios");
import axios from "axios";
const mockedAxios = axios as jest.Mocked<typeof axios>;

jest.setTimeout(30000);

// ─── Test app ─────────────────────────────────────────────────────────────────

const createApp = (): Application => {
  process.env.JWT_SECRET = "test-jwt-secret-key-32chars!!!!!";
  process.env.JWT_REFRESH_SECRET = "test-jwt-refresh-secret-32chars!";
  process.env.JWT_EXPIRES_IN = "15m";
  process.env.JWT_REFRESH_EXPIRES_IN = "7d";
  process.env.NODE_ENV = "test";
  process.env.ADMIN_SECRET_KEY = "test-admin-secret";
  process.env.BCRYPT_SALT_ROUNDS = "4";
  process.env.SESSION_SECRET = "test-session-secret";
  process.env.GOOGLE_PLACES_API_KEY = "test-places-key";

  const app = express();
  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(cors({ origin: "http://localhost:3000", credentials: true }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use("/api/auth", authRoutes);
  app.use("/api/reviews", reviewRoutes);
  app.use(notFound);
  app.use(errorHandler);
  return app;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const extractCookie = (cookies: string[], name: string): string => {
  const c = cookies.find((h) => h.startsWith(`${name}=`));
  return c ? c.split(";")[0].replace(`${name}=`, "") : "";
};

const loginAs = async (
  app: Application,
  role: "admin" | "vendor" | "customer",
  suffix = ""
): Promise<{ token: string; userId: string }> => {
  const email = `${role}${suffix}.${Date.now()}@test.com`;
  const password = "Test@1234!";

  if (role === "admin") {
    await request(app).post("/api/auth/register-admin").send({
      firstName: "Admin",
      lastName: "Test",
      email,
      password,
      adminSecretKey: process.env.ADMIN_SECRET_KEY,
    });
  } else {
    await request(app).post("/api/auth/register").send({
      firstName: role,
      lastName: "Test",
      email,
      password,
    });
    await User.findOneAndUpdate(
      { email },
      { role, isEmailVerified: true, status: UserStatus.ACTIVE }
    );
  }

  await User.findOneAndUpdate({ email }, { isEmailVerified: true, status: UserStatus.ACTIVE });

  const loginRes = await request(app).post("/api/auth/login").send({ email, password });
  const cookies = ((loginRes.headers["set-cookie"] as unknown) as string[]) || [];
  const token = extractCookie(cookies, "accessToken");
  const user = await User.findOne({ email }).lean();
  return { token, userId: user!._id.toString() };
};

const makeEvent = async (overrides: Record<string, any> = {}) => {
  return Event.create({
    title: "Test Event",
    description: "desc",
    shortDescription: "short",
    slug: `test-event-${Date.now()}`,
    category: "sports",
    type: "Event",
    venueType: "Indoor",
    ageRange: [5, 15],
    location: { city: "Dubai", address: "123 St", coordinates: { lat: 25, lng: 55 } },
    price: 0,
    currency: "AED",
    dateSchedule: [{
      startDate: new Date(Date.now() + 86400000),
      endDate: new Date(Date.now() + 172800000),
      availableSeats: 50,
      price: 0,
    }],
    status: "published",
    isDeleted: false,
    vendorId: new Types.ObjectId(), // satisfies "vendorId OR teacherId" pre-validate requirement
    ...overrides,
  });
};

const makeVendorProfile = async (userId: string) => {
  return Vendor.create({
    userId: new Types.ObjectId(userId),
    businessName: "Test Vendor",
    businessType: "individual",
    email: `vendor.${Date.now()}@test.com`,
    phone: "+971500000000",
    address: {
      street: "123 Test Street",
      city: "Dubai",
      state: "Dubai",
      zipCode: "00000",
      country: "AE",
    },
    contactPerson: {
      name: "Test Contact",
      email: `contact.${Date.now()}@test.com`,
      phone: "+971500000001",
    },
  });
};

const seedReview = async (
  eventId: Types.ObjectId,
  overrides: Partial<any> = {}
) => {
  const now = new Date();
  return GoogleReviewModel.create({
    eventId,
    googlePlaceId: "ChIJtestplace1",
    reviewId: `REV_${Math.random()}`,
    author_name: "Test User",
    language: "en",
    rating: 5,
    text: "Great!",
    relative_time_description: "a week ago",
    time: 1000,
    source: "google",
    firstSyncedAt: now,
    lastSyncedAt: now,
    lastSeenAt: now,
    isVisible: true,
    missingFromLatestSync: false,
    ...overrides,
  });
};

const makePlacesResponse = (reviews: any[] = []) => ({
  data: {
    id: "ChIJtestplace1",
    rating: 4.5,
    userRatingCount: 10,
    reviews,
  },
});

const makeGoogleReviewPayload = (name: string, rating = 5) => ({
  name,
  relativePublishTimeDescription: "a month ago",
  rating,
  text: { text: "Fantastic!", languageCode: "en" },
  authorAttribution: {
    displayName: "Reviewer",
    uri: "https://google.com/user/1",
    photoUri: "https://photo.url/1.jpg",
  },
  publishTime: new Date().toISOString(),
});

// ─── Setup ────────────────────────────────────────────────────────────────────

let app: Application;

beforeAll(async () => {
  await connectTestDB();
  app = createApp();
});

afterAll(async () => {
  await closeTestDB();
});

beforeEach(async () => {
  await clearTestDB();
  jest.clearAllMocks();
});

// ─── A. Public GET /api/reviews/google/:eventId ───────────────────────────────

describe("A. Public GET /api/reviews/google/:eventId", () => {
  it("A1. event without googlePlaceId → hasGooglePlaceId:false, empty reviews", async () => {
    const event = await makeEvent({ googlePlaceId: undefined });

    const res = await request(app)
      .get(`/api/reviews/google/${event._id}`)
      .expect(200);

    expect(res.body.data.hasGooglePlaceId).toBe(false);
    expect(res.body.data.reviews).toHaveLength(0);
    expect(res.body.data.source).toBe("db");
  });

  it("A2. placeId set but no sync yet → empty reviews from DB", async () => {
    const event = await makeEvent({ googlePlaceId: "ChIJNOT_SYNCED" });

    const res = await request(app)
      .get(`/api/reviews/google/${event._id}`)
      .expect(200);

    expect(res.body.data.reviews).toHaveLength(0);
    expect(res.body.data.hasGooglePlaceId).toBe(true);
    expect(res.body.data.source).toBe("db");
  });

  it("A3. after sync → returns visible reviews", async () => {
    const event = await makeEvent({ googlePlaceId: "ChIJtestplace1" });
    await seedReview(event._id as Types.ObjectId, { isVisible: true });

    const res = await request(app)
      .get(`/api/reviews/google/${event._id}`)
      .expect(200);

    expect(res.body.data.reviews).toHaveLength(1);
    expect(res.body.data.reviews[0].author_name).toBe("Test User");
  });

  it("A4. hidden reviews excluded from public response", async () => {
    const event = await makeEvent({ googlePlaceId: "ChIJtestplace1" });
    await seedReview(event._id as Types.ObjectId, { isVisible: true });
    await seedReview(event._id as Types.ObjectId, {
      isVisible: false,
      author_name: "Hidden User",
    });

    const res = await request(app)
      .get(`/api/reviews/google/${event._id}`)
      .expect(200);

    expect(res.body.data.reviews).toHaveLength(1);
    expect(
      res.body.data.reviews.every((r: any) => r.author_name !== "Hidden User")
    ).toBe(true);
  });

  it("A5. averageRating and totalRatings computed from visible only", async () => {
    const event = await makeEvent({ googlePlaceId: "ChIJtestplace1" });
    await seedReview(event._id as Types.ObjectId, { rating: 5, isVisible: true });
    await seedReview(event._id as Types.ObjectId, { rating: 3, isVisible: true });
    await seedReview(event._id as Types.ObjectId, { rating: 1, isVisible: false }); // hidden — must not affect avg

    const res = await request(app)
      .get(`/api/reviews/google/${event._id}`)
      .expect(200);

    expect(res.body.data.totalRatings).toBe(2);
    expect(res.body.data.averageRating).toBe(4); // (5+3)/2
  });

  it("A6. unknown event id → 404", async () => {
    await request(app)
      .get(`/api/reviews/google/${new Types.ObjectId()}`)
      .expect(404);
  });
});

// ─── B. Public GET /api/reviews/google/homepage ───────────────────────────────

describe("B. Public GET /api/reviews/google/homepage", () => {
  it("B1. returns only visible 4+ star reviews", async () => {
    const eventId = new Types.ObjectId();
    await seedReview(eventId, { rating: 5, isVisible: true });
    await seedReview(eventId, { rating: 4, isVisible: true });
    await seedReview(eventId, { rating: 3, isVisible: true });   // excluded
    await seedReview(eventId, { rating: 5, isVisible: false });  // excluded

    const res = await request(app)
      .get("/api/reviews/google/homepage")
      .expect(200);

    expect(res.body.data.reviews.length).toBeLessThanOrEqual(2);
    expect(
      res.body.data.reviews.every((r: any) => r.rating >= 4)
    ).toBe(true);
  });

  it("B2. empty array when nothing qualifies", async () => {
    const eventId = new Types.ObjectId();
    await seedReview(eventId, { rating: 2, isVisible: true });

    const res = await request(app)
      .get("/api/reviews/google/homepage")
      .expect(200);

    expect(res.body.data.reviews).toHaveLength(0);
  });

  it("B3. limit query param respected", async () => {
    for (let i = 0; i < 5; i++) {
      const eventId = new Types.ObjectId();
      await seedReview(eventId, { rating: 5, isVisible: true });
      await seedReview(eventId, { rating: 5, isVisible: true });
    }

    const res = await request(app)
      .get("/api/reviews/google/homepage?limit=4")
      .expect(200);

    expect(res.body.data.reviews.length).toBeLessThanOrEqual(4);
  });
});

// ─── C. Admin POST /api/reviews/google/:eventId/sync ─────────────────────────

describe("C. POST /api/reviews/google/:eventId/sync", () => {
  it("C1. admin can sync and reviews saved to DB", async () => {
    const { token } = await loginAs(app, "admin");
    const event = await makeEvent({ googlePlaceId: "ChIJADMIN_SYNC1" });

    mockedAxios.get.mockResolvedValue(
      makePlacesResponse([
        makeGoogleReviewPayload("places/ADMIN_SYNC/reviews/R1"),
        makeGoogleReviewPayload("places/ADMIN_SYNC/reviews/R2"),
      ])
    );

    const res = await request(app)
      .post(`/api/reviews/google/${event._id}/sync`)
      .set("Cookie", [`accessToken=${token}`])
      .expect(200);

    expect(res.body.data.totalFetched).toBe(2);
    expect(res.body.data.inserted).toBe(2);

    const count = await GoogleReviewModel.countDocuments({ eventId: event._id });
    expect(count).toBe(2);
  });

  it("C2. vendor owner can sync their own event", async () => {
    const { token, userId } = await loginAs(app, "vendor", "owner");
    const vendor = await makeVendorProfile(userId);
    const event = await makeEvent({
      googlePlaceId: "ChIJVENDORSYNC1",
      vendorId: vendor._id,
    });

    mockedAxios.get.mockResolvedValue(
      makePlacesResponse([makeGoogleReviewPayload("places/VENDOR_SYNC/reviews/R1")])
    );

    await request(app)
      .post(`/api/reviews/google/${event._id}/sync`)
      .set("Cookie", [`accessToken=${token}`])
      .expect(200);

    const count = await GoogleReviewModel.countDocuments({ eventId: event._id });
    expect(count).toBe(1);
  });

  it("C3. vendor non-owner gets 403", async () => {
    const { token: ownerToken, userId: ownerId } = await loginAs(app, "vendor", "own");
    const ownerVendor = await makeVendorProfile(ownerId);
    const event = await makeEvent({
      googlePlaceId: "ChIJNONOWNER01",
      vendorId: ownerVendor._id,
    });

    // Different vendor tries to sync
    const { token: otherToken, userId: otherId } = await loginAs(app, "vendor", "other");
    await makeVendorProfile(otherId);

    await request(app)
      .post(`/api/reviews/google/${event._id}/sync`)
      .set("Cookie", [`accessToken=${otherToken}`])
      .expect(403);

    // Verify owner token still works (403 is scoped to non-owner)
    mockedAxios.get.mockResolvedValue(makePlacesResponse([]));
    await request(app)
      .post(`/api/reviews/google/${event._id}/sync`)
      .set("Cookie", [`accessToken=${ownerToken}`])
      .expect(200);
  });

  it("C4. unauthenticated gets 401", async () => {
    const event = await makeEvent({ googlePlaceId: "ChIJauthplace1" });

    await request(app)
      .post(`/api/reviews/google/${event._id}/sync`)
      .expect(401);
  });

  it("C5. event without googlePlaceId returns 400", async () => {
    const { token } = await loginAs(app, "admin");
    const event = await makeEvent({ googlePlaceId: undefined });

    await request(app)
      .post(`/api/reviews/google/${event._id}/sync`)
      .set("Cookie", [`accessToken=${token}`])
      .expect(400);
  });

  it("C6. sync is idempotent — syncing same reviews twice creates no duplicates", async () => {
    const { token } = await loginAs(app, "admin");
    const event = await makeEvent({ googlePlaceId: "ChIJIDEM_INT01" });
    const payload = makePlacesResponse([
      makeGoogleReviewPayload("places/IDEM_INT/reviews/STABLE_R1"),
    ]);

    mockedAxios.get.mockResolvedValue(payload);
    await request(app)
      .post(`/api/reviews/google/${event._id}/sync`)
      .set("Cookie", [`accessToken=${token}`])
      .expect(200);

    mockedAxios.get.mockResolvedValue(payload);
    const res2 = await request(app)
      .post(`/api/reviews/google/${event._id}/sync`)
      .set("Cookie", [`accessToken=${token}`])
      .expect(200);

    expect(res2.body.data.inserted).toBe(0);
    const count = await GoogleReviewModel.countDocuments({ eventId: event._id });
    expect(count).toBe(1);
  });
});

// ─── D. Admin GET /api/reviews/google/:eventId/admin ─────────────────────────

describe("D. GET /api/reviews/google/:eventId/admin", () => {
  it("D1. admin sees all reviews including hidden", async () => {
    const { token } = await loginAs(app, "admin");
    const event = await makeEvent({ googlePlaceId: "ChIJadmplace01" });
    await seedReview(event._id as Types.ObjectId, { isVisible: true });
    await seedReview(event._id as Types.ObjectId, { isVisible: false });

    const res = await request(app)
      .get(`/api/reviews/google/${event._id}/admin`)
      .set("Cookie", [`accessToken=${token}`])
      .expect(200);

    expect(res.body.data.reviews).toHaveLength(2);
    expect(res.body.data.visibleCount).toBe(1);
    expect(res.body.data.hiddenCount).toBe(1);
  });

  it("D2. non-owner vendor gets 403", async () => {
    const { userId: ownerId } = await loginAs(app, "vendor", "adm-own");
    const ownerVendor = await makeVendorProfile(ownerId);
    const event = await makeEvent({ googlePlaceId: "ChIJadmplace02", vendorId: ownerVendor._id });

    const { token: otherToken, userId: otherId } = await loginAs(app, "vendor", "adm-oth");
    await makeVendorProfile(otherId);

    await request(app)
      .get(`/api/reviews/google/${event._id}/admin`)
      .set("Cookie", [`accessToken=${otherToken}`])
      .expect(403);
  });

  it("D3. unauthenticated gets 401", async () => {
    const event = await makeEvent({ googlePlaceId: "ChIJadmplace03" });
    await request(app)
      .get(`/api/reviews/google/${event._id}/admin`)
      .expect(401);
  });

  it("D4. event without placeId returns hasGooglePlaceId:false", async () => {
    const { token } = await loginAs(app, "admin");
    const event = await makeEvent({ googlePlaceId: undefined });

    const res = await request(app)
      .get(`/api/reviews/google/${event._id}/admin`)
      .set("Cookie", [`accessToken=${token}`])
      .expect(200);

    expect(res.body.data.hasGooglePlaceId).toBe(false);
    expect(res.body.data.reviews).toHaveLength(0);
  });
});

// ─── E. Admin PATCH /api/reviews/google/review/:reviewDocId/visibility ────────

describe("E. PATCH /api/reviews/google/review/:reviewDocId/visibility", () => {
  it("E1. admin can hide a review with a reason", async () => {
    const { token } = await loginAs(app, "admin");
    const event = await makeEvent({ googlePlaceId: "ChIJhideplace1" });
    const doc = await seedReview(event._id as Types.ObjectId, { isVisible: true });

    const res = await request(app)
      .patch(`/api/reviews/google/review/${doc._id}/visibility`)
      .set("Cookie", [`accessToken=${token}`])
      .send({ isVisible: false, hiddenReason: "spam" })
      .expect(200);

    expect(res.body.data.isVisible).toBe(false);

    const updated = await GoogleReviewModel.findById(doc._id);
    expect(updated?.isVisible).toBe(false);
    expect(updated?.hiddenReason).toBe("spam");
    expect(updated?.hiddenAt).toBeTruthy();
  });

  it("E2. re-sync preserves isVisible=false after hiding", async () => {
    const { token } = await loginAs(app, "admin");
    const event = await makeEvent({ googlePlaceId: "ChIJpresvplace" });
    const reviewName = "places/PRESV/reviews/PRESERVED_R";

    // Initial sync
    mockedAxios.get.mockResolvedValue(
      makePlacesResponse([makeGoogleReviewPayload(reviewName)])
    );
    await request(app)
      .post(`/api/reviews/google/${event._id}/sync`)
      .set("Cookie", [`accessToken=${token}`])
      .expect(200);

    const doc = await GoogleReviewModel.findOne({ eventId: event._id });

    // Admin hides it
    await request(app)
      .patch(`/api/reviews/google/review/${doc!._id}/visibility`)
      .set("Cookie", [`accessToken=${token}`])
      .send({ isVisible: false, hiddenReason: "off-topic" })
      .expect(200);

    // Re-sync
    mockedAxios.get.mockResolvedValue(
      makePlacesResponse([makeGoogleReviewPayload(reviewName)])
    );
    await request(app)
      .post(`/api/reviews/google/${event._id}/sync`)
      .set("Cookie", [`accessToken=${token}`])
      .expect(200);

    const afterSync = await GoogleReviewModel.findById(doc!._id);
    expect(afterSync?.isVisible).toBe(false);
    expect(afterSync?.hiddenReason).toBe("off-topic");
  });

  it("E3. admin can show a previously hidden review", async () => {
    const { token } = await loginAs(app, "admin");
    const event = await makeEvent({ googlePlaceId: "ChIJshowplace1" });
    const doc = await seedReview(event._id as Types.ObjectId, {
      isVisible: false,
      hiddenReason: "old reason",
    });

    const res = await request(app)
      .patch(`/api/reviews/google/review/${doc._id}/visibility`)
      .set("Cookie", [`accessToken=${token}`])
      .send({ isVisible: true })
      .expect(200);

    expect(res.body.data.isVisible).toBe(true);

    const updated = await GoogleReviewModel.findById(doc._id);
    expect(updated?.isVisible).toBe(true);
    expect(updated?.hiddenReason).toBeUndefined();
    expect(updated?.hiddenAt).toBeUndefined();
  });

  it("E4. vendor non-owner cannot toggle another event's review", async () => {
    const { userId: ownerId } = await loginAs(app, "vendor", "vis-own");
    const ownerVendor = await makeVendorProfile(ownerId);
    const event = await makeEvent({ googlePlaceId: "ChIJvis4place1", vendorId: ownerVendor._id });
    const doc = await seedReview(event._id as Types.ObjectId, { isVisible: true });

    const { token: otherToken, userId: otherId } = await loginAs(app, "vendor", "vis-oth");
    await makeVendorProfile(otherId);

    await request(app)
      .patch(`/api/reviews/google/review/${doc._id}/visibility`)
      .set("Cookie", [`accessToken=${otherToken}`])
      .send({ isVisible: false })
      .expect(403);

    // Review must still be visible
    const unchanged = await GoogleReviewModel.findById(doc._id);
    expect(unchanged?.isVisible).toBe(true);
  });

  it("E5. non-existent review doc → 404", async () => {
    const { token } = await loginAs(app, "admin");

    await request(app)
      .patch(`/api/reviews/google/review/${new Types.ObjectId()}/visibility`)
      .set("Cookie", [`accessToken=${token}`])
      .send({ isVisible: false })
      .expect(404);
  });

  it("E6. missing isVisible field → 400 validation error", async () => {
    const { token } = await loginAs(app, "admin");
    const event = await makeEvent({ googlePlaceId: "ChIJvalplace01" });
    const doc = await seedReview(event._id as Types.ObjectId);

    await request(app)
      .patch(`/api/reviews/google/review/${doc._id}/visibility`)
      .set("Cookie", [`accessToken=${token}`])
      .send({}) // no isVisible
      .expect(400);
  });
});
