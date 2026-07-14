import mongoose from "mongoose";
import Reel, { IReel } from "../models/Reel";
import MediaAsset from "../models/MediaAsset";
import { mediaService } from "./media.service";
import logger from "../config/logger";

export interface PaginationOptions {
  page?: number;
  limit?: number;
}

export interface ReelFilters extends PaginationOptions {
  search?: string;
  visibility?: "public" | "draft" | "archived";
  isFeatured?: boolean;
}

export interface PaginatedResult<T> {
  reels: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ReelCursorPayload {
  displayOrder: number;
  createdAt: string; // ISO string — keep encode/decode symmetric
  _id: string;
}

export interface CursorPaginatedResult<T> {
  reels: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

/**
 * Encode a reel's sort-key fields into an opaque cursor string.
 * Must stay in exact sort parity with the query in getPublicReelsCursor
 * (displayOrder asc, createdAt desc, _id desc) — any mismatch here
 * silently produces duplicate or skipped reels in the feed.
 */
function encodeReelCursor(payload: ReelCursorPayload): string {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

/**
 * Decode and validate a client-supplied cursor. Never throws on malformed
 * input — callers should treat a null return as "bad cursor" and respond 400.
 */
function decodeReelCursor(cursor: string): ReelCursorPayload | null {
  try {
    const decoded = JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf-8"),
    );
    if (
      typeof decoded?.displayOrder !== "number" ||
      typeof decoded?.createdAt !== "string" ||
      typeof decoded?._id !== "string" ||
      !mongoose.Types.ObjectId.isValid(decoded._id) ||
      Number.isNaN(new Date(decoded.createdAt).getTime())
    ) {
      return null;
    }
    return decoded as ReelCursorPayload;
  } catch {
    return null;
  }
}

export class ReelService {
  /**
   * Validate that a MediaAsset exists
   */
  private async validateMediaAsset(
    mediaId: string | mongoose.Types.ObjectId,
    session?: mongoose.ClientSession,
  ): Promise<void> {
    const media = await MediaAsset.findById(mediaId).session(session || null);
    if (!media) {
      throw new Error(`MediaAsset ${mediaId} not found`);
    }
  }

  /**
   * Create a new reel with media tracking
   */
  async createReel(data: Partial<IReel>): Promise<IReel> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const videoSourceType = data.videoSourceType || "uploaded";

      // 1. Validate MediaAssets exist (uploaded + instagram reels need video file)
      if ((videoSourceType === "uploaded" || videoSourceType === "instagram") && data.videoAsset) {
        await this.validateMediaAsset(data.videoAsset, session);
      }
      if (data.thumbnailAsset) {
        await this.validateMediaAsset(data.thumbnailAsset, session);
      }

      // 2. Create reel
      const reel = new Reel(data);
      await reel.save({ session });

      // 3. Track video asset usage (only for uploaded videos)
      if (videoSourceType === "uploaded" && data.videoAsset) {
        await mediaService.trackUsage(
          data.videoAsset.toString(),
          "Reel",
          "videoAsset",
          reel._id as mongoose.Types.ObjectId,
          session,
        );
      }

      // 4. Track thumbnail asset usage (if provided)
      if (data.thumbnailAsset) {
        await mediaService.trackUsage(
          data.thumbnailAsset.toString(),
          "Reel",
          "thumbnailAsset",
          reel._id as mongoose.Types.ObjectId,
          session,
        );
      }

      await session.commitTransaction();
      return reel;
    } catch (error: any) {
      await session.abortTransaction();

      // Enhanced error logging
      logger.error("=== REEL SERVICE ERROR (CREATE) ===");
      logger.error("Error name:", error.name);
      logger.error("Error message:", error.message);
      if (error.errors) {
        logger.error(
          "Validation errors:",
          JSON.stringify(error.errors, null, 2),
        );
      }

      // Provide specific error messages
      if (error.name === "ValidationError") {
        const validationErrors = Object.keys(error.errors || {})
          .map((key) => `${key}: ${error.errors[key].message}`)
          .join(", ");
        throw new Error(`Reel validation failed: ${validationErrors}`);
      }

      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Update a reel with media tracking
   */
  async updateReel(id: string, data: Partial<IReel>): Promise<IReel> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const oldReel = await Reel.findById(id).session(session);
      if (!oldReel) {
        throw new Error("Reel not found");
      }

      const oldVideoSourceType = oldReel.videoSourceType || "uploaded";
      const newVideoSourceType = data.videoSourceType || oldVideoSourceType;

      // 1. Detect video asset changes
      const oldVideoId = oldReel.videoAsset?.toString();
      const newVideoId = data.videoAsset?.toString();

      // 2. Detect thumbnail asset changes
      const oldThumbnailId = oldReel.thumbnailAsset?.toString();
      const newThumbnailId = data.thumbnailAsset?.toString();

      // 3. Validate new video asset if changed (only for uploaded videos)
      if (
        newVideoSourceType === "uploaded" &&
        newVideoId &&
        newVideoId !== oldVideoId
      ) {
        await this.validateMediaAsset(newVideoId, session);
      }

      // 4. Validate new thumbnail asset if changed
      if (newThumbnailId && newThumbnailId !== oldThumbnailId) {
        await this.validateMediaAsset(newThumbnailId, session);
      }

      // 5. Update reel
      Object.assign(oldReel, data);
      await oldReel.save({ session });

      // 6. Handle video asset media tracking (only for uploaded videos)
      if (
        newVideoSourceType === "uploaded" &&
        newVideoId &&
        newVideoId !== oldVideoId
      ) {
        // Untrack old video (if it was uploaded)
        if (oldVideoSourceType === "uploaded" && oldVideoId) {
          await mediaService.untrackUsage(
            oldVideoId,
            "Reel",
            oldReel._id as mongoose.Types.ObjectId,
            session,
          );
        }
        // Track new video
        await mediaService.trackUsage(
          newVideoId,
          "Reel",
          "videoAsset",
          oldReel._id as mongoose.Types.ObjectId,
          session,
        );
      } else if (
        oldVideoSourceType === "uploaded" &&
        newVideoSourceType !== "uploaded" &&
        oldVideoId
      ) {
        // Switching from uploaded to external - untrack old video
        await mediaService.untrackUsage(
          oldVideoId,
          "Reel",
          oldReel._id as mongoose.Types.ObjectId,
          session,
        );
      }

      // 7. Handle thumbnail asset media tracking
      if (newThumbnailId !== oldThumbnailId) {
        // Untrack old thumbnail
        if (oldThumbnailId) {
          await mediaService.untrackUsage(
            oldThumbnailId,
            "Reel",
            oldReel._id as mongoose.Types.ObjectId,
            session,
          );
        }
        // Track new thumbnail
        if (newThumbnailId) {
          await mediaService.trackUsage(
            newThumbnailId,
            "Reel",
            "thumbnailAsset",
            oldReel._id as mongoose.Types.ObjectId,
            session,
          );
        }
      }

      await session.commitTransaction();
      return oldReel;
    } catch (error: any) {
      await session.abortTransaction();

      logger.error("=== REEL SERVICE ERROR (UPDATE) ===");
      logger.error("Error message:", error.message);

      if (error.name === "ValidationError") {
        const validationErrors = Object.keys(error.errors || {})
          .map((key) => `${key}: ${error.errors[key].message}`)
          .join(", ");
        throw new Error(`Reel validation failed: ${validationErrors}`);
      }

      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Soft delete a reel (set visibility to 'archived')
   */
  async softDeleteReel(id: string): Promise<IReel> {
    const reel = await Reel.findById(id);
    if (!reel) {
      throw new Error("Reel not found");
    }

    reel.visibility = "archived";
    await reel.save();

    return reel;
  }

  /**
   * Hard delete a reel with media untracking
   */
  async hardDeleteReel(id: string): Promise<void> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const reel = await Reel.findById(id).session(session);
      if (!reel) {
        throw new Error("Reel not found");
      }

      // 1. Untrack video asset
      if (reel.videoAsset) {
        await mediaService.untrackUsage(
          reel.videoAsset.toString(),
          "Reel",
          reel._id as mongoose.Types.ObjectId,
          session,
        );
      }

      // 2. Untrack thumbnail asset
      if (reel.thumbnailAsset) {
        await mediaService.untrackUsage(
          reel.thumbnailAsset.toString(),
          "Reel",
          reel._id as mongoose.Types.ObjectId,
          session,
        );
      }

      // 3. Delete reel document
      await Reel.findByIdAndDelete(id).session(session);

      await session.commitTransaction();
    } catch (error: any) {
      await session.abortTransaction();
      logger.error("=== REEL SERVICE ERROR (DELETE) ===");
      logger.error("Error message:", error.message);
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Get public reels (visibility='public') with pagination
   */
  async getPublicReels(
    options: PaginationOptions = {},
  ): Promise<PaginatedResult<IReel>> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 10));
    const skip = (page - 1) * limit;

    const query = { visibility: "public" };

    const [reels, total] = await Promise.all([
      Reel.find(query)
        .sort({ displayOrder: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("videoAsset", "url thumbnailUrl duration mimeType")
        .populate("thumbnailAsset", "url thumbnailUrl")
        .populate("linkedEvent", "title slug pricing location dateSchedule")
        .lean(),
      Reel.countDocuments(query),
    ]);

    return {
      reels: reels as unknown as IReel[],
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get public reels using keyset (cursor) pagination instead of .skip().
   * Offset pagination shifts as new reels publish mid-scroll, causing the
   * infinite feed to duplicate or skip reels — a cursor built from the same
   * sort key the query uses doesn't have that problem.
   *
   * Sort is { displayOrder: 1, createdAt: -1, _id: -1 } — this MUST match
   * encodeReelCursor/decodeReelCursor's field set exactly.
   *
   * Returns `{ reels: [], nextCursor: null, hasMore: false }` (not a thrown
   * error) when `cursor` is present but malformed — callers decide whether
   * that should surface as a 400.
   */
  async getPublicReelsCursor(options: {
    cursor?: string;
    limit?: number;
  }): Promise<CursorPaginatedResult<IReel> & { invalidCursor?: boolean }> {
    const limit = Math.min(50, Math.max(1, options.limit || 10));
    const query: any = { visibility: "public" };

    if (options.cursor) {
      const decoded = decodeReelCursor(options.cursor);
      if (!decoded) {
        return { reels: [], nextCursor: null, hasMore: false, invalidCursor: true };
      }

      const createdAt = new Date(decoded.createdAt);
      query.$or = [
        { displayOrder: { $gt: decoded.displayOrder } },
        { displayOrder: decoded.displayOrder, createdAt: { $lt: createdAt } },
        {
          displayOrder: decoded.displayOrder,
          createdAt,
          _id: { $lt: new mongoose.Types.ObjectId(decoded._id) },
        },
      ];
    }

    const reels = await Reel.find(query)
      .sort({ displayOrder: 1, createdAt: -1, _id: -1 })
      .limit(limit + 1) // fetch one extra to know if there's a next page
      .populate("videoAsset", "url thumbnailUrl duration mimeType")
      .populate("thumbnailAsset", "url thumbnailUrl")
      .populate("linkedEvent", "title slug pricing location dateSchedule")
      .lean();

    const hasMore = reels.length > limit;
    const page = hasMore ? reels.slice(0, limit) : reels;

    const last = page[page.length - 1] as any;
    const nextCursor =
      hasMore && last
        ? encodeReelCursor({
            displayOrder: last.displayOrder,
            createdAt: new Date(last.createdAt).toISOString(),
            _id: last._id.toString(),
          })
        : null;

    return {
      reels: page as unknown as IReel[],
      nextCursor,
      hasMore,
    };
  }

  /**
   * Get all reels (admin) with filters and pagination
   */
  async getAllReels(
    filters: ReelFilters = {},
  ): Promise<PaginatedResult<IReel>> {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const skip = (page - 1) * limit;

    const query: any = {};

    // Filter by visibility
    if (filters.visibility) {
      query.visibility = filters.visibility;
    }

    // Filter by featured status
    if (filters.isFeatured !== undefined) {
      query.isFeatured = filters.isFeatured;
    }

    // Text search
    if (filters.search && filters.search.trim()) {
      query.$text = { $search: filters.search.trim() };
    }

    const [reels, total] = await Promise.all([
      Reel.find(query)
        .sort({ displayOrder: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("videoAsset", "url thumbnailUrl duration mimeType size")
        .populate("thumbnailAsset", "url thumbnailUrl")
        .populate("linkedEvent", "title slug pricing location dateSchedule")
        .lean(),
      Reel.countDocuments(query),
    ]);

    return {
      reels: reels as unknown as IReel[],
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single reel by ID
   */
  async getReelById(
    id: string,
    populateAssets: boolean = true,
  ): Promise<IReel | null> {
    let query = Reel.findById(id);

    if (populateAssets) {
      query = query
        .populate("videoAsset", "url thumbnailUrl duration mimeType size")
        .populate("thumbnailAsset", "url thumbnailUrl")
        .populate("linkedEvent", "title slug pricing location dateSchedule");
    }

    return query.lean() as unknown as IReel | null;
  }

  /**
   * Increment view count (atomic operation)
   */
  async incrementViews(id: string): Promise<void> {
    await Reel.findByIdAndUpdate(
      id,
      { $inc: { viewsCount: 1 } },
      { new: true },
    );
  }

  /**
   * Toggle like (increment or decrement)
   */
  async toggleLike(
    id: string,
    increment: boolean = true,
  ): Promise<{ liked: boolean; likes: number }> {
    const reel = await Reel.findByIdAndUpdate(
      id,
      { $inc: { likes: increment ? 1 : -1 } },
      { new: true },
    );

    if (!reel) {
      throw new Error("Reel not found");
    }

    return {
      liked: increment,
      likes: reel.likes,
    };
  }

  /**
   * Update visibility
   */
  async updateVisibility(
    id: string,
    visibility: "public" | "draft" | "archived",
  ): Promise<IReel> {
    const reel = await Reel.findById(id);
    if (!reel) {
      throw new Error("Reel not found");
    }

    reel.visibility = visibility;
    await reel.save();

    return reel;
  }

  /**
   * Bulk update display orders
   */
  async updateDisplayOrders(
    updates: Array<{ id: string; displayOrder: number }>,
  ): Promise<void> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const updatePromises = updates.map(({ id, displayOrder }) =>
        Reel.findByIdAndUpdate(id, { displayOrder }, { session }),
      );

      await Promise.all(updatePromises);
      await session.commitTransaction();
    } catch (error: any) {
      await session.abortTransaction();
      logger.error("=== REEL SERVICE ERROR (BULK UPDATE DISPLAY ORDERS) ===");
      logger.error("Error message:", error.message);
      throw error;
    } finally {
      session.endSession();
    }
  }
}

// Export singleton instance
export const reelService = new ReelService();
