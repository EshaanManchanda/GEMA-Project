import crypto from "crypto";
import axios from "axios";
import { Types } from "mongoose";
import { config } from "../config/env";
import { cacheService } from "./cache.service";
import logger from "../config/logger";
import GoogleReviewModel from "../models/GoogleReview";

// Canonical shape exposed to the rest of the app (matches frontend ReviewsTab)
export interface GoogleReview {
  author_name: string;
  author_url?: string;
  language: string;
  profile_photo_url?: string;
  rating: number;
  relative_time_description: string;
  text: string;
  time: number;
  // Internal fields for sync engine
  _reviewId?: string;
  _rawReviewName?: string;
  // Admin-only fields (populated when visibleOnly=false)
  _id?: string;
  isVisible?: boolean;
  hiddenReason?: string;
  missingFromLatestSync?: boolean;
  firstSyncedAt?: Date;
  lastSyncedAt?: Date;
}

export interface SyncSummary {
  totalFetched: number;
  inserted: number;
  updated: number;
  unchanged: number;
  hiddenPreserved: number;
  markedMissing: number;
}

export interface StoredReviewsResult {
  reviews: GoogleReview[];
  averageRating: number;
  totalRatings: number;
  hasGooglePlaceId: boolean;
  source: "db";
  lastSyncedAt: Date | null;
  // admin only
  visibleCount?: number;
  hiddenCount?: number;
}

// Places API (New) response shapes
interface NewPlacesReview {
  name?: string; // "places/{placeId}/reviews/{reviewId}"
  relativePublishTimeDescription: string;
  rating: number;
  text?: { text: string; languageCode: string };
  originalText?: { text: string; languageCode: string };
  authorAttribution?: {
    displayName: string;
    uri?: string;
    photoUri?: string;
  };
  publishTime?: string;
}

interface NewPlacesResponse {
  id: string;
  displayName?: { text: string; languageCode: string };
  rating?: number;
  userRatingCount?: number;
  reviews?: NewPlacesReview[];
}

export class GooglePlacesService {
  private apiKey: string;
  // Places API (New) base URL
  private baseUrl = "https://places.googleapis.com/v1/places";
  private cacheTTL = 30 * 24 * 60 * 60; // 30 days (Google TOS requirement)

  constructor() {
    this.apiKey = config.google.placesApiKey;
  }

  /**
   * Build a stable review identity from the Google review `name` field when
   * present, otherwise fall back to a deterministic hash that includes the
   * placeId so the same review on two different events never collides.
   */
  private buildReviewId(r: NewPlacesReview, placeId: string): { reviewId: string; rawReviewName?: string } {
    if (r.name) {
      return { reviewId: r.name, rawReviewName: r.name };
    }
    const authorName = r.authorAttribution?.displayName ?? "";
    const time = r.publishTime ?? "";
    const text = (r.text?.text ?? r.originalText?.text ?? "").trim().toLowerCase();
    const raw = `${placeId}|${authorName}|${time}|${text}`;
    const reviewId = crypto.createHash("sha256").update(raw).digest("hex");
    return { reviewId };
  }

  private mapReview(r: NewPlacesReview, placeId: string): GoogleReview {
    const { reviewId, rawReviewName } = this.buildReviewId(r, placeId);
    return {
      author_name: r.authorAttribution?.displayName ?? "Anonymous",
      author_url: r.authorAttribution?.uri,
      language: r.text?.languageCode ?? r.originalText?.languageCode ?? "en",
      profile_photo_url: r.authorAttribution?.photoUri,
      rating: r.rating,
      relative_time_description: r.relativePublishTimeDescription,
      text: r.text?.text ?? r.originalText?.text ?? "",
      time: r.publishTime ? Math.floor(new Date(r.publishTime).getTime() / 1000) : 0,
      _reviewId: reviewId,
      _rawReviewName: rawReviewName,
    };
  }

  async getPlaceReviews(placeId: string): Promise<{
    reviews: GoogleReview[];
    rating: number;
    totalRatings: number;
  }> {
    if (!this.apiKey) {
      logger.warn("Google Places API key not configured");
      return { reviews: [], rating: 0, totalRatings: 0 };
    }

    if (!placeId) {
      throw new Error("Place ID is required");
    }

    const cacheKey = `google:place:v3:${placeId}`;
    const cached = await cacheService.get<{
      reviews: GoogleReview[];
      rating: number;
      totalRatings: number;
    }>(cacheKey);

    if (cached) {
      logger.info(`Google reviews cache HIT for place ${placeId}`);
      return cached;
    }

    try {
      logger.info(`Fetching Google reviews for place ${placeId}`);

      const response = await axios.get<NewPlacesResponse>(
        `${this.baseUrl}/${placeId}`,
        {
          headers: {
            "X-Goog-Api-Key": this.apiKey,
            "X-Goog-FieldMask": "id,displayName,rating,userRatingCount,reviews",
          },
          params: {
            // Google always caps this endpoint at 5 reviews regardless of these
            // params — reviewsSort picks *which* 5, languageCode stabilizes
            // text/locale instead of inferring it from the server's IP.
            reviewsSort: "newest",
            languageCode: "en",
          },
          timeout: 5000,
        },
      );

      const place = response.data;
      const data = {
        reviews: (place.reviews ?? []).map((r) => this.mapReview(r, placeId)),
        rating: place.rating ?? 0,
        totalRatings: place.userRatingCount ?? 0,
      };

      await cacheService.set(cacheKey, data, { ttl: this.cacheTTL });

      logger.info(`Fetched ${data.reviews.length} Google reviews for place ${placeId}`);
      return data;
    } catch (error: any) {
      logger.error("Error fetching Google Place reviews:", error);

      if (error.response?.status === 429) {
        throw new Error("Google Places API rate limit exceeded");
      }

      if (error.response?.status === 403) {
        throw new Error("Invalid Google Places API key");
      }

      if (error.response?.status === 404) {
        return { reviews: [], rating: 0, totalRatings: 0 };
      }

      if (error.code === "ECONNABORTED") {
        throw new Error("Google Places API request timeout");
      }

      logger.warn("Returning empty reviews due to Google API error");
      return { reviews: [], rating: 0, totalRatings: 0 };
    }
  }

  /**
   * Invalidate cache for a specific Place ID (admin use only)
   */
  async invalidatePlaceCache(placeId: string): Promise<boolean> {
    const cacheKey = `google:place:v3:${placeId}`;
    const deleted = await cacheService.delete(cacheKey);

    if (deleted) {
      logger.info(`Invalidated Google reviews cache for place ${placeId}`);
    }

    return deleted;
  }

  // ─── DB-backed sync engine ────────────────────────────────────────────────

  /**
   * Pull reviews from Google and upsert into MongoDB.
   * Moderation fields (isVisible, hiddenReason, hiddenBy, hiddenAt) are NEVER
   * overwritten — $setOnInsert only sets them on first insert.
   */
  async syncPlaceReviews(
    eventId: Types.ObjectId,
    placeId: string,
  ): Promise<SyncSummary> {
    const liveData = await this.getPlaceReviews(placeId);
    const now = new Date();
    const fetchedIds: string[] = [];

    let inserted = 0;
    let updated = 0;
    let unchanged = 0;

    if (liveData.reviews.length > 0) {
      const ops = liveData.reviews.map((r) => {
        const reviewId = r._reviewId!;
        fetchedIds.push(reviewId);

        return {
          updateOne: {
            filter: { eventId, reviewId },
            update: {
              $set: {
                googlePlaceId: placeId,
                author_name: r.author_name,
                author_url: r.author_url,
                profile_photo_url: r.profile_photo_url,
                language: r.language,
                rating: r.rating,
                text: r.text,
                relative_time_description: r.relative_time_description,
                time: r.time,
                rawReviewName: r._rawReviewName,
                lastSyncedAt: now,
                lastSeenAt: now,
                missingFromLatestSync: false,
              },
              $setOnInsert: {
                eventId,
                reviewId,
                source: "google",
                firstSyncedAt: now,
                isVisible: true,
              },
            },
            upsert: true,
          },
        };
      });

      const result = await GoogleReviewModel.bulkWrite(ops, { ordered: false });
      inserted = result.upsertedCount;
      updated = result.modifiedCount;
      unchanged = liveData.reviews.length - inserted - updated;
    }

    // Mark reviews that were not in this sync (Google returns limited subsets;
    // do NOT delete them — flag only)
    let markedMissing = 0;
    if (fetchedIds.length > 0) {
      const missResult = await GoogleReviewModel.updateMany(
        { eventId, reviewId: { $nin: fetchedIds } },
        { $set: { missingFromLatestSync: true } },
      );
      markedMissing = missResult.modifiedCount;
    }

    // Count how many hidden reviews survived (for the summary)
    const hiddenPreserved = await GoogleReviewModel.countDocuments({
      eventId,
      isVisible: false,
    });

    logger.info(
      `Google reviews sync for event ${eventId}: ${inserted} inserted, ${updated} updated, ` +
        `${unchanged} unchanged, ${markedMissing} marked missing, ${hiddenPreserved} hidden preserved`,
    );

    return {
      totalFetched: liveData.reviews.length,
      inserted,
      updated,
      unchanged,
      hiddenPreserved,
      markedMissing,
    };
  }

  /**
   * Read stored reviews for an event from MongoDB.
   * Public: visibleOnly=true → filters + recomputes rating from visible set.
   * Admin: visibleOnly=false → all reviews + counts + lastSyncedAt.
   */
  async getStoredReviews(
    eventId: Types.ObjectId,
    options: { visibleOnly: boolean },
  ): Promise<StoredReviewsResult> {
    const filter: Record<string, unknown> = { eventId };
    if (options.visibleOnly) filter.isVisible = true;

    const docs = await GoogleReviewModel.find(filter)
      .sort({ time: -1 })
      .lean();

    const reviews: GoogleReview[] = docs.map((d) => ({
      author_name: d.author_name,
      author_url: d.author_url,
      language: d.language,
      profile_photo_url: d.profile_photo_url,
      rating: d.rating,
      relative_time_description: d.relative_time_description,
      text: d.text,
      time: d.time,
      ...(!options.visibleOnly && {
        _id: (d._id as Types.ObjectId).toString(),
        isVisible: d.isVisible,
        hiddenReason: d.hiddenReason,
        missingFromLatestSync: d.missingFromLatestSync,
        firstSyncedAt: d.firstSyncedAt,
        lastSyncedAt: d.lastSyncedAt,
      }),
    }));

    // Ratings always computed from the visible subset for public
    const visibleDocs = options.visibleOnly ? docs : docs.filter((d) => d.isVisible);
    const totalRatings = visibleDocs.length;
    const averageRating =
      totalRatings > 0
        ? visibleDocs.reduce((s, d) => s + d.rating, 0) / totalRatings
        : 0;

    const lastSyncedAt =
      docs.length > 0
        ? docs.reduce<Date | null>((latest, d) => {
            const t = d.lastSyncedAt;
            return !latest || t > latest ? t : latest;
          }, null)
        : null;

    const result: StoredReviewsResult = {
      reviews,
      averageRating: Math.round(averageRating * 10) / 10,
      totalRatings,
      hasGooglePlaceId: true,
      source: "db",
      lastSyncedAt,
    };

    if (!options.visibleOnly) {
      result.visibleCount = visibleDocs.length;
      result.hiddenCount = docs.length - visibleDocs.length;
    }

    return result;
  }

  /**
   * Aggregate visible 4-5★ reviews across all events for the homepage carousel.
   * Diversity: max 2 reviews per event. Sorted rating desc, time desc.
   */
  async getHomepageReviews(limit = 12): Promise<GoogleReview[]> {
    // Fetch candidates (rating >= 4, visible), sorted best-first.
    // We over-fetch (limit * 4) so diversity filtering still fills the quota.
    const candidates = await GoogleReviewModel.find({ isVisible: true, rating: { $gte: 4 } })
      .sort({ rating: -1, time: -1 })
      .limit(limit * 4)
      .lean();

    // Diversity cap: max 2 reviews per event
    const eventCounts = new Map<string, number>();
    const result: GoogleReview[] = [];

    for (const doc of candidates) {
      if (result.length >= limit) break;
      const eid = doc.eventId.toString();
      const count = eventCounts.get(eid) ?? 0;
      if (count >= 2) continue;
      eventCounts.set(eid, count + 1);
      result.push({
        author_name: doc.author_name,
        author_url: doc.author_url,
        language: doc.language,
        profile_photo_url: doc.profile_photo_url,
        rating: doc.rating,
        relative_time_description: doc.relative_time_description,
        text: doc.text,
        time: doc.time,
      });
    }

    return result;
  }
}

export const googlePlacesService = new GooglePlacesService();
