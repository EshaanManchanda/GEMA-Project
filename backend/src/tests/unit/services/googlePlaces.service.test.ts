/**
 * Unit tests — GooglePlacesService (sync engine)
 *
 * Coverage:
 *  A. buildReviewId  — stable ID from Google name; fallback hash; cross-event isolation
 *  B. syncPlaceReviews — upserts, visibility preservation, missingFromLatestSync, summary
 *  C. getStoredReviews — public (visible only, rating from visible); admin (all + counts)
 *  D. getHomepageReviews — rating >= 4 filter, per-event diversity cap
 */

import mongoose, { Types } from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import GoogleReviewModel from "../../../models/GoogleReview";

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock("../../../config/logger");
jest.mock("../../../config/redis", () => ({
  redisClient: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue("OK"),
    del: jest.fn().mockResolvedValue(1),
    setEx: jest.fn().mockResolvedValue("OK"),
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

// Mock cache.service so getPlaceReviews always misses cache (forces live fetch mock)
jest.mock("../../../services/cache.service", () => ({
  cacheService: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(true),
  },
}));

// Mock axios so we never hit the real Google API
jest.mock("axios");
import axios from "axios";
const mockedAxios = axios as jest.Mocked<typeof axios>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makePlacesResponse(reviews: any[] = [], rating = 4.5, count = 100) {
  return {
    data: {
      id: "places/TEST_PLACE_ID",
      rating,
      userRatingCount: count,
      reviews,
    },
  };
}

function makeGoogleReview(overrides: Partial<any> = {}) {
  return {
    name: `places/PLACE/reviews/REV_${Math.random()}`,
    relativePublishTimeDescription: "a month ago",
    rating: 5,
    text: { text: "Great experience!", languageCode: "en" },
    authorAttribution: {
      displayName: "Test User",
      uri: "https://google.com/user/1",
      photoUri: "https://photo.url/1.jpg",
    },
    publishTime: new Date(Date.now() - 86400000).toISOString(),
    ...overrides,
  };
}

// ─── Setup ────────────────────────────────────────────────────────────────────

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongod.stop();
});

beforeEach(async () => {
  await GoogleReviewModel.deleteMany({});
  jest.clearAllMocks();
});

// Lazy-import service AFTER mocks are set up
const getService = () =>
  require("../../../services/googlePlaces.service").googlePlacesService as import("../../../services/googlePlaces.service").GooglePlacesService;

// ─── A. buildReviewId ─────────────────────────────────────────────────────────

describe("A. reviewId identity", () => {
  it("uses the Google review name when present", async () => {
    const placeId = "places/TEST";
    const reviewName = "places/TEST/reviews/ABC123";
    mockedAxios.get.mockResolvedValue(
      makePlacesResponse([makeGoogleReview({ name: reviewName })])
    );

    const svc = getService();
    const eventId = new Types.ObjectId();
    await svc.syncPlaceReviews(eventId, placeId);

    const doc = await GoogleReviewModel.findOne({ eventId });
    expect(doc?.reviewId).toBe(reviewName);
    expect(doc?.rawReviewName).toBe(reviewName);
  });

  it("generates a stable fallback hash when name is absent", async () => {
    const placeId = "places/TEST";
    const review = makeGoogleReview({ name: undefined });
    mockedAxios.get.mockResolvedValue(makePlacesResponse([review]));

    const svc = getService();
    const eventId = new Types.ObjectId();
    await svc.syncPlaceReviews(eventId, placeId);

    const doc = await GoogleReviewModel.findOne({ eventId });
    expect(doc?.reviewId).toBeTruthy();
    expect(doc?.rawReviewName).toBeUndefined();
  });

  it("fallback hash is stable — same input always same output", async () => {
    const placeId = "places/STABLE";
    const time = new Date("2024-01-01T00:00:00Z").toISOString();
    const review = makeGoogleReview({ name: undefined, publishTime: time });
    review.text.text = "fixed text";
    review.authorAttribution.displayName = "Alice";

    mockedAxios.get.mockResolvedValue(makePlacesResponse([review]));

    const svc = getService();
    const eventId = new Types.ObjectId();
    await svc.syncPlaceReviews(eventId, placeId);
    const doc1 = await GoogleReviewModel.findOne({ eventId });

    // Second sync — same review, must not create a duplicate
    await svc.syncPlaceReviews(eventId, placeId);
    const count = await GoogleReviewModel.countDocuments({ eventId });

    expect(count).toBe(1);
    expect(doc1?.reviewId).toBeTruthy();
  });

  it("fallback hash scoped to placeId — same review on two events gets different reviewIds", async () => {
    const review = makeGoogleReview({ name: undefined });
    mockedAxios.get.mockResolvedValue(makePlacesResponse([review]));

    const svc = getService();
    const eventA = new Types.ObjectId();
    const eventB = new Types.ObjectId();

    await svc.syncPlaceReviews(eventA, "places/PLACE_A");
    mockedAxios.get.mockResolvedValue(makePlacesResponse([review]));
    await svc.syncPlaceReviews(eventB, "places/PLACE_B");

    const docA = await GoogleReviewModel.findOne({ eventId: eventA });
    const docB = await GoogleReviewModel.findOne({ eventId: eventB });

    expect(docA?.reviewId).not.toBe(docB?.reviewId);
  });
});

// ─── B. syncPlaceReviews ─────────────────────────────────────────────────────

describe("B. syncPlaceReviews", () => {
  it("inserts new reviews and returns correct summary", async () => {
    const eventId = new Types.ObjectId();
    const placeId = "places/SYNC_TEST";
    mockedAxios.get.mockResolvedValue(
      makePlacesResponse([makeGoogleReview(), makeGoogleReview()])
    );

    const svc = getService();
    const summary = await svc.syncPlaceReviews(eventId, placeId);

    expect(summary.totalFetched).toBe(2);
    expect(summary.inserted).toBe(2);
    expect(summary.updated).toBe(0);
    expect(await GoogleReviewModel.countDocuments({ eventId })).toBe(2);
  });

  it("upserts on re-sync — no duplicates", async () => {
    const eventId = new Types.ObjectId();
    const placeId = "places/IDEM";
    const review = makeGoogleReview();
    mockedAxios.get.mockResolvedValue(makePlacesResponse([review]));

    const svc = getService();
    await svc.syncPlaceReviews(eventId, placeId);
    mockedAxios.get.mockResolvedValue(makePlacesResponse([review]));
    await svc.syncPlaceReviews(eventId, placeId);

    const count = await GoogleReviewModel.countDocuments({ eventId });
    expect(count).toBe(1);
  });

  it("preserves isVisible=false across re-sync", async () => {
    const eventId = new Types.ObjectId();
    const placeId = "places/VIS";
    const review = makeGoogleReview({ name: "places/P/reviews/HIDDEN_REV" });
    mockedAxios.get.mockResolvedValue(makePlacesResponse([review]));

    const svc = getService();
    await svc.syncPlaceReviews(eventId, placeId);

    // Admin hides the review
    await GoogleReviewModel.findOneAndUpdate(
      { eventId },
      { isVisible: false, hiddenReason: "spam" }
    );

    // Re-sync same review
    mockedAxios.get.mockResolvedValue(makePlacesResponse([review]));
    const summary = await svc.syncPlaceReviews(eventId, placeId);

    const doc = await GoogleReviewModel.findOne({ eventId });
    expect(doc?.isVisible).toBe(false);
    expect(doc?.hiddenReason).toBe("spam");
    expect(summary.hiddenPreserved).toBe(1);
  });

  it("marks reviews missing from latest sync without deleting them", async () => {
    const eventId = new Types.ObjectId();
    const placeId = "places/MISS";
    const rev1 = makeGoogleReview({ name: "places/P/reviews/OLD" });
    const rev2 = makeGoogleReview({ name: "places/P/reviews/NEW" });

    // First sync: two reviews
    mockedAxios.get.mockResolvedValue(makePlacesResponse([rev1, rev2]));
    const svc = getService();
    await svc.syncPlaceReviews(eventId, placeId);

    // Second sync: only rev2 returned (Google returned fewer)
    mockedAxios.get.mockResolvedValue(makePlacesResponse([rev2]));
    const summary = await svc.syncPlaceReviews(eventId, placeId);

    const oldDoc = await GoogleReviewModel.findOne({ eventId, reviewId: rev1.name });
    const newDoc = await GoogleReviewModel.findOne({ eventId, reviewId: rev2.name });

    expect(oldDoc).not.toBeNull(); // not deleted
    expect(oldDoc?.missingFromLatestSync).toBe(true);
    expect(newDoc?.missingFromLatestSync).toBe(false);
    expect(summary.markedMissing).toBe(1);
  });

  it("sets firstSyncedAt only on insert, not on update", async () => {
    const eventId = new Types.ObjectId();
    const placeId = "places/DATES";
    const review = makeGoogleReview({ name: "places/P/reviews/DATE_TEST" });

    mockedAxios.get.mockResolvedValue(makePlacesResponse([review]));
    const svc = getService();
    await svc.syncPlaceReviews(eventId, placeId);

    const before = await GoogleReviewModel.findOne({ eventId });
    const firstSyncedAt = before?.firstSyncedAt;

    // Small delay then re-sync
    await new Promise((r) => setTimeout(r, 10));
    mockedAxios.get.mockResolvedValue(makePlacesResponse([review]));
    await svc.syncPlaceReviews(eventId, placeId);

    const after = await GoogleReviewModel.findOne({ eventId });
    expect(after?.firstSyncedAt?.getTime()).toBe(firstSyncedAt?.getTime()); // unchanged
    expect(after?.lastSyncedAt?.getTime()).toBeGreaterThanOrEqual(
      firstSyncedAt!.getTime()
    );
  });

  it("returns summary with hiddenPreserved count for multiple hidden reviews", async () => {
    const eventId = new Types.ObjectId();
    const placeId = "places/MULTI_HIDE";
    const reviews = [
      makeGoogleReview({ name: "places/P/reviews/R1" }),
      makeGoogleReview({ name: "places/P/reviews/R2" }),
      makeGoogleReview({ name: "places/P/reviews/R3" }),
    ];

    mockedAxios.get.mockResolvedValue(makePlacesResponse(reviews));
    const svc = getService();
    await svc.syncPlaceReviews(eventId, placeId);

    // Hide two
    await GoogleReviewModel.updateMany(
      { eventId, reviewId: { $in: ["places/P/reviews/R1", "places/P/reviews/R2"] } },
      { isVisible: false }
    );

    mockedAxios.get.mockResolvedValue(makePlacesResponse(reviews));
    const summary = await svc.syncPlaceReviews(eventId, placeId);

    expect(summary.hiddenPreserved).toBe(2);
  });
});

// ─── C. getStoredReviews ──────────────────────────────────────────────────────

describe("C. getStoredReviews", () => {
  async function seedReviews(eventId: Types.ObjectId, placeId: string) {
    const now = new Date();
    await GoogleReviewModel.create([
      {
        eventId, googlePlaceId: placeId, reviewId: "R1",
        author_name: "Alice", language: "en", rating: 5, text: "Loved it",
        relative_time_description: "1 week ago", time: 1000,
        source: "google", firstSyncedAt: now, lastSyncedAt: now, lastSeenAt: now,
        isVisible: true,
      },
      {
        eventId, googlePlaceId: placeId, reviewId: "R2",
        author_name: "Bob", language: "en", rating: 2, text: "Meh",
        relative_time_description: "2 weeks ago", time: 900,
        source: "google", firstSyncedAt: now, lastSyncedAt: now, lastSeenAt: now,
        isVisible: false, hiddenReason: "spam",
      },
      {
        eventId, googlePlaceId: placeId, reviewId: "R3",
        author_name: "Carol", language: "en", rating: 4, text: "Good",
        relative_time_description: "3 weeks ago", time: 800,
        source: "google", firstSyncedAt: now, lastSyncedAt: now, lastSeenAt: now,
        isVisible: true,
      },
    ]);
  }

  it("public (visibleOnly=true) returns only visible reviews", async () => {
    const eventId = new Types.ObjectId();
    await seedReviews(eventId, "places/P");

    const svc = getService();
    const result = await svc.getStoredReviews(eventId, { visibleOnly: true });

    expect(result.reviews).toHaveLength(2);
    expect(result.reviews.every((r) => r.author_name !== "Bob")).toBe(true);
    expect(result.hasGooglePlaceId).toBe(true);
    expect(result.source).toBe("db");
  });

  it("public averageRating computed from visible reviews only", async () => {
    const eventId = new Types.ObjectId();
    await seedReviews(eventId, "places/P");

    const svc = getService();
    // visible: Alice(5) + Carol(4) → avg 4.5
    const result = await svc.getStoredReviews(eventId, { visibleOnly: true });

    expect(result.averageRating).toBe(4.5);
    expect(result.totalRatings).toBe(2);
  });

  it("admin (visibleOnly=false) returns all reviews including hidden", async () => {
    const eventId = new Types.ObjectId();
    await seedReviews(eventId, "places/P");

    const svc = getService();
    const result = await svc.getStoredReviews(eventId, { visibleOnly: false });

    expect(result.reviews).toHaveLength(3);
    expect(result.visibleCount).toBe(2);
    expect(result.hiddenCount).toBe(1);
  });

  it("returns hasGooglePlaceId=true and empty reviews when no docs synced", async () => {
    const eventId = new Types.ObjectId();
    const svc = getService();
    const result = await svc.getStoredReviews(eventId, { visibleOnly: true });

    expect(result.reviews).toHaveLength(0);
    expect(result.averageRating).toBe(0);
    expect(result.totalRatings).toBe(0);
    expect(result.lastSyncedAt).toBeNull();
  });

  it("reviews sorted newest first (time desc)", async () => {
    const eventId = new Types.ObjectId();
    const now = new Date();
    await GoogleReviewModel.create([
      { eventId, googlePlaceId: "P", reviewId: "OLD", author_name: "A", language: "en", rating: 4, text: "", relative_time_description: "", time: 100, source: "google", firstSyncedAt: now, lastSyncedAt: now, lastSeenAt: now, isVisible: true },
      { eventId, googlePlaceId: "P", reviewId: "NEW", author_name: "B", language: "en", rating: 5, text: "", relative_time_description: "", time: 999, source: "google", firstSyncedAt: now, lastSyncedAt: now, lastSeenAt: now, isVisible: true },
    ]);

    const svc = getService();
    const result = await svc.getStoredReviews(eventId, { visibleOnly: true });

    expect(result.reviews[0].time).toBe(999);
    expect(result.reviews[1].time).toBe(100);
  });
});

// ─── D. getHomepageReviews ────────────────────────────────────────────────────

describe("D. getHomepageReviews", () => {
  async function seed(
    eventId: Types.ObjectId,
    placeId: string,
    reviews: { rating: number; isVisible: boolean; time?: number }[]
  ) {
    const now = new Date();
    await GoogleReviewModel.create(
      reviews.map((r, i) => ({
        eventId,
        googlePlaceId: placeId,
        reviewId: `${placeId}-R${i}`,
        author_name: `User ${i}`,
        language: "en",
        rating: r.rating,
        text: `Review ${i}`,
        relative_time_description: "recently",
        time: r.time ?? (1000 - i),
        source: "google",
        firstSyncedAt: now,
        lastSyncedAt: now,
        lastSeenAt: now,
        isVisible: r.isVisible,
      }))
    );
  }

  it("only returns visible reviews with rating >= 4", async () => {
    const eventId = new Types.ObjectId();
    await seed(eventId, "places/HOM", [
      { rating: 5, isVisible: true },   // included
      { rating: 4, isVisible: true },   // included
      { rating: 3, isVisible: true },   // excluded (< 4)
      { rating: 5, isVisible: false },  // excluded (hidden)
    ]);

    const svc = getService();
    const reviews = await svc.getHomepageReviews(10);

    expect(reviews).toHaveLength(2);
    expect(reviews.every((r) => r.rating >= 4)).toBe(true);
  });

  it("respects per-event diversity cap (max 2 per event)", async () => {
    const eventId = new Types.ObjectId();
    await seed(eventId, "places/DIV", [
      { rating: 5, isVisible: true },
      { rating: 5, isVisible: true },
      { rating: 5, isVisible: true }, // 3rd from same event
    ]);

    const svc = getService();
    const reviews = await svc.getHomepageReviews(10);

    expect(reviews.length).toBeLessThanOrEqual(2);
  });

  it("respects limit parameter", async () => {
    const now = new Date();
    // 10 reviews across 5 events (2 each)
    await Promise.all(
      Array.from({ length: 5 }, (_, e) => {
        const eventId = new Types.ObjectId();
        return GoogleReviewModel.create([
          { eventId, googlePlaceId: `places/E${e}`, reviewId: `E${e}-R0`, author_name: "X", language: "en", rating: 5, text: "A", relative_time_description: "now", time: 100, source: "google", firstSyncedAt: now, lastSyncedAt: now, lastSeenAt: now, isVisible: true },
          { eventId, googlePlaceId: `places/E${e}`, reviewId: `E${e}-R1`, author_name: "Y", language: "en", rating: 4, text: "B", relative_time_description: "now", time: 99, source: "google", firstSyncedAt: now, lastSyncedAt: now, lastSeenAt: now, isVisible: true },
        ]);
      })
    );

    const svc = getService();
    const reviews = await svc.getHomepageReviews(6);

    expect(reviews.length).toBeLessThanOrEqual(6);
  });

  it("returns empty array when no visible 4+ star reviews exist", async () => {
    const eventId = new Types.ObjectId();
    await seed(eventId, "places/EMP", [
      { rating: 3, isVisible: true },
      { rating: 5, isVisible: false },
    ]);

    const svc = getService();
    const reviews = await svc.getHomepageReviews(12);

    expect(reviews).toHaveLength(0);
  });
});
