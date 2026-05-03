import MediaAsset, { IMediaAsset } from "../models/MediaAsset";
import { StorageFactory } from "./storage/StorageFactory";
import { config } from "../config/env";
import path from "path";
import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";
import logger from "../config/logger";

/**
 * Media Service
 *
 * Handles all media operations including upload, retrieval, deletion, and management
 * Coordinates between storage providers and database operations
 */
export class MediaService {
  private storageProvider = StorageFactory.getProvider();

  /**
   * Upload media file and create MediaAsset document
   */
  async uploadMedia(
    file: Express.Multer.File,
    options: {
      category: "blog" | "profile" | "event" | "document" | "misc";
      folder: string;
      uploadedBy: string;
      tags?: string[];
    },
  ): Promise<IMediaAsset> {
    // 1. Upload to storage provider
    const uploadResult = await this.storageProvider.upload(file, {
      category: options.category,
      folder: options.folder,
    });

    if (!uploadResult.success) {
      throw new Error(uploadResult.error || "Upload failed");
    }

    // 2. Generate UUID for secure access
    const uuid = uuidv4();

    // 3. Create MediaAsset document in database
    const mediaAsset = await MediaAsset.create({
      uuid,
      filename: uploadResult.publicId
        ? path.basename(uploadResult.publicId)
        : path.basename(uploadResult.localPath || file.originalname),
      originalName: file.originalname,
      mimeType: file.mimetype,
      fileExtension: path.extname(file.originalname),
      provider: config.upload.provider,
      url: uploadResult.url!, // Will be overridden below
      publicId: uploadResult.publicId,
      localPath: uploadResult.localPath,
      size: uploadResult.size || file.size,
      width: uploadResult.width,
      height: uploadResult.height,
      category: options.category,
      folder: options.folder,
      tags: options.tags || [],
      uploadedBy: options.uploadedBy,
      isPublic: true,
      usageCount: 0,
    });

    // 4. Override URL with UUID-based secure URL (for ALL providers)
    const secureUrl = `${config.upload.baseUrl}/api/media/file/${uuid}`;
    mediaAsset.url = secureUrl;

    // 5. Generate variations for images (Cloudinary only)
    if (
      file.mimetype.startsWith("image/") &&
      uploadResult.publicId &&
      config.upload.provider === "cloudinary"
    ) {
      const cloudinaryProvider = this.storageProvider as any;
      if (cloudinaryProvider.getImageVariations) {
        mediaAsset.variations = cloudinaryProvider.getImageVariations(
          uploadResult.publicId,
        );
      }
    }

    // Single save with all fields set
    await mediaAsset.save();

    return mediaAsset;
  }

  /**
   * List media assets with filters and pagination
   */
  async listMedia(
    filters: {
      category?: string;
      folder?: string;
      mimeType?: string;
      uploadedBy?: string;
      search?: string;
      page?: number;
      limit?: number;
    },
    userRole?: string,
    userId?: string,
  ): Promise<{
    assets: IMediaAsset[];
    total: number;
    pages: number;
    page: number;
    limit: number;
  }> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const query: any = {};

    // Vendors and teachers can only see their own uploads
    if ((userRole === "vendor" || userRole === "teacher") && userId) {
      query.uploadedBy = userId;
    }

    // Build query (admin explicit filter overrides role restriction)
    if (filters.category) query.category = filters.category;
    if (filters.folder) query.folder = filters.folder;
    if (filters.mimeType)
      query.mimeType = { $regex: filters.mimeType, $options: "i" };
    if (filters.uploadedBy) query.uploadedBy = filters.uploadedBy;

    // Text search
    if (filters.search) {
      query.$text = { $search: filters.search };
    }

    // Count total documents
    const total = await MediaAsset.countDocuments(query);

    // Fetch paginated results
    const assets = await MediaAsset.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("uploadedBy", "firstName lastName email avatar")
      .lean({ virtuals: true });

    // Add directUrl to each asset (for Cloudinary assets, this is the public CDN URL)
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const enhancedAssets = assets.map((asset: any) => {
      if (asset.provider === 'cloudinary' && asset.publicId && cloudName) {
        asset.directUrl = `https://res.cloudinary.com/${cloudName}/image/upload/${asset.publicId}`;
      }
      return asset;
    });

    return {
      assets: enhancedAssets,
      total,
      pages: Math.ceil(total / limit),
      page,
      limit,
    };
  }

  /**
   * Get media asset by ID
   */
  async getMediaById(id: string): Promise<IMediaAsset | null> {
    const asset = await MediaAsset.findById(id).populate(
      "uploadedBy",
      "firstName lastName email avatar",
    );

    if (asset) {
      // Update last accessed timestamp
      asset.lastAccessedAt = new Date();
      await asset.save();
    }

    return asset;
  }

  /**
   * Track media usage - increment usage count
   */
  async trackUsage(
    mediaId: string,
    model: "Blog" | "Event" | "User" | "Reel" | "TeachingEvent",
    field: string,
    documentId: mongoose.Types.ObjectId,
    session?: mongoose.ClientSession,
  ): Promise<void> {
    const media = await MediaAsset.findById(mediaId).session(session || null);
    if (!media) {
      throw new Error(`MediaAsset ${mediaId} not found`);
    }

    await MediaAsset.findByIdAndUpdate(
      mediaId,
      {
        $push: {
          usedBy: {
            model,
            field,
            documentId,
          },
        },
        $inc: { usageCount: 1 },
      },
      { session, new: true },
    );
  }

  /**
   * Untrack media usage - decrement usage count
   */
  async untrackUsage(
    mediaId: string,
    model: string,
    documentId: mongoose.Types.ObjectId,
    session?: mongoose.ClientSession,
  ): Promise<void> {
    await MediaAsset.findByIdAndUpdate(
      mediaId,
      {
        $pull: {
          usedBy: {
            model,
            documentId,
          },
        },
        $inc: { usageCount: -1 },
      },
      { session },
    );
  }

  /**
   * Delete media asset with force-delete option
   */
  async deleteMedia(id: string, force: boolean = false): Promise<boolean> {
    const asset = await MediaAsset.findById(id);

    if (!asset) {
      throw new Error("Media asset not found");
    }

    // PROTECTION: Block deletion if in use (unless forced)
    if (asset.usageCount > 0 && !force) {
      // Build helpful error message listing where it's used
      const usageList = asset.usedBy
        .map((u: any) => `${u.model} (ID: ${u.documentId})`)
        .join(", ");

      throw new Error(
        `Cannot delete: This media is used in ${asset.usageCount} place(s): ${usageList}. ` +
          `Use force=true to override and clean up references.`,
      );
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // FORCE DELETE: Clean up references from other collections
      if (force && asset.usageCount > 0) {
        const { Blog } = await import("../models/Blog");
        const Event = (await import("../models/Event")).default;

        for (const usage of asset.usedBy) {
          if (usage.model === "Blog") {
            // Remove reference from Blog
            await Blog.updateOne(
              { _id: usage.documentId },
              { $unset: { featuredImageAsset: "" } },
              { session },
            );
          } else if (usage.model === "Event") {
            // Remove from Event imageAssets array
            await Event.updateOne(
              { _id: usage.documentId },
              { $pull: { imageAssets: id } },
              { session },
            );
          }
        }
      }

      // Delete from storage provider
      const identifier = asset.publicId || asset.localPath;
      if (identifier) {
        const deleted = await this.storageProvider.delete(identifier!);
        if (!deleted) {
          logger.warn(`Failed to delete file from storage: ${identifier}`);
        }
      }

      // Delete from database
      await MediaAsset.findByIdAndDelete(id, { session });

      await session.commitTransaction();
      return true;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Bulk delete media assets
   */
  async bulkDeleteMedia(
    ids: string[],
    force: boolean = false,
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const id of ids) {
      try {
        await this.deleteMedia(id, force);
        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push(`${id}: ${error.message}`);
      }
    }

    return results;
  }

  /**
   * Update media tags
   */
  async updateMediaTags(
    id: string,
    tags: string[],
  ): Promise<IMediaAsset | null> {
    return MediaAsset.findByIdAndUpdate(id, { tags }, { new: true }).populate(
      "uploadedBy",
      "firstName lastName email avatar",
    );
  }

  /**
   * Get media statistics
   */
  async getMediaStats(uploadedBy?: string): Promise<any> {
    const query = uploadedBy ? { uploadedBy } : {};

    const stats = await MediaAsset.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          totalSize: { $sum: "$size" },
          byCategory: {
            $push: {
              category: "$category",
              size: "$size",
            },
          },
          byProvider: {
            $push: {
              provider: "$provider",
              count: 1,
            },
          },
        },
      },
    ]);

    if (stats.length === 0) {
      return {
        total: 0,
        totalSize: 0,
        byCategory: {},
        byProvider: {},
        unused: 0,
      };
    }

    // Process category statistics
    const categoryStats: any = {};
    stats[0].byCategory.forEach((item: any) => {
      if (!categoryStats[item.category]) {
        categoryStats[item.category] = { count: 0, size: 0 };
      }
      categoryStats[item.category].count++;
      categoryStats[item.category].size += item.size;
    });

    // Get unused media count
    const unused = await MediaAsset.countDocuments({ ...query, usageCount: 0 });

    return {
      total: stats[0].total,
      totalSize: stats[0].totalSize,
      byCategory: categoryStats,
      unused,
    };
  }

  /**
   * Find unused media assets
   */
  async findUnusedMedia(
    category?: string,
    limit: number = 50,
  ): Promise<IMediaAsset[]> {
    const query: any = { usageCount: 0 };
    if (category) query.category = category;

    return MediaAsset.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("uploadedBy", "firstName lastName email avatar");
  }

  /**
   * Get media usage information
   */
  async getMediaUsage(id: string): Promise<any> {
    const asset = await MediaAsset.findById(id)
      .populate("uploadedBy", "firstName lastName email avatar")
      .populate("usedBy.documentId");

    if (!asset) {
      throw new Error("Media asset not found");
    }

    return {
      asset,
      usageCount: asset.usageCount,
      usedBy: asset.usedBy,
    };
  }
}

// Export singleton instance
const mediaServiceInstance = new MediaService();
export const mediaService = mediaServiceInstance;
export default mediaServiceInstance;
