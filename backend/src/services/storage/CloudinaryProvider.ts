import { v2 as cloudinary, UploadApiResponse } from "cloudinary";
import {
  IStorageProvider,
  UploadResult,
  UploadOptions,
} from "./IStorageProvider";
import { uploadPresets, getOptimizedImageUrl } from "../../config/cloudinary";
import path from "path";
import fs from "fs";
import { Readable } from "stream";
import logger from "../../config/logger";

/**
 * Cloudinary Storage Provider
 *
 * Implements the IStorageProvider interface for Cloudinary cloud storage
 */
export class CloudinaryProvider implements IStorageProvider {
  /**
   * Upload a file to Cloudinary
   */
  async upload(
    file: Express.Multer.File,
    options: UploadOptions = {},
  ): Promise<UploadResult> {
    const uploadStartTime = Date.now();
    const fileSize = file.size || file.buffer?.length || 0;

    try {
      const {
        category = "documents",
        folder,
        transformation,
        tags = [],
        resourceType = "auto",
      } = options;

      // Log upload start
      logger.info(
        `[Cloudinary Upload] Starting upload - File: ${file.originalname}, Size: ${fileSize} bytes, Category: ${category}`,
      );

      // Map MediaAsset category enum to uploadPresets key (e.g. "document" → "documents")
      const CATEGORY_TO_PRESET: Record<string, string> = { document: "documents" };
      const presetKey = CATEGORY_TO_PRESET[category] || category;
      const preset = uploadPresets[presetKey as keyof typeof uploadPresets];

      // Prepare upload options
      const uploadOptions: any = {
        resource_type: (preset as any)?.resource_type || resourceType,
        folder: folder || (preset as any)?.folder || `gema/${category}`,
        tags: [...tags, category],
        use_filename: true,
        unique_filename: true,
        overwrite: false,
      };

      // Add timeout based on file size
      const timeoutMs =
        require("../../utils/uploadHelpers").getTimeoutForFileSize(fileSize);
      uploadOptions.timeout = timeoutMs;
      logger.info(
        `[Cloudinary Upload] Timeout set to ${timeoutMs}ms for ${fileSize} bytes`,
      );

      // Add transformations
      if (transformation) {
        uploadOptions.transformation = transformation;
      } else if ((preset as any)?.transformation) {
        uploadOptions.transformation = (preset as any).transformation;
      }

      // Add allowed formats if specified
      if ((preset as any)?.allowed_formats) {
        uploadOptions.allowed_formats = (preset as any).allowed_formats;
      }

      // Upload to Cloudinary using file path or buffer
      let result: UploadApiResponse;

      if (
        file.path &&
        (file.path.startsWith("http://") || file.path.startsWith("https://"))
      ) {
        // File already uploaded by multer-storage-cloudinary
        // Extract public_id from the URL to fetch metadata
        logger.info(
          "[Cloudinary Provider] File already uploaded by multer-storage-cloudinary:",
          file.path,
        );

        // Return success with URL (multer-storage-cloudinary already did the upload)
        return {
          success: true,
          url: file.path,
          publicId: (file as any).filename || undefined, // multer-storage-cloudinary sets this
          size: file.size,
          width: undefined,
          height: undefined,
          localPath: undefined,
        };
      } else if (
        file.path &&
        !file.path.startsWith("http://") &&
        !file.path.startsWith("https://")
      ) {
        // If multer saved to disk, upload from path
        result = await cloudinary.uploader.upload(file.path, uploadOptions);

        // Clean up temp file asynchronously (non-blocking)
        setImmediate(() => {
          fs.promises.unlink(file.path).catch((err) => {
            logger.error(
              "Failed to clean up temp file:",
              file.path,
              "Error:",
              err,
            );
            // Log file details if accessible
            try {
              const stats = fs.statSync(file.path);
              logger.error("File stats:", {
                size: stats.size,
                mode: stats.mode.toString(8),
                uid: stats.uid,
                gid: stats.gid,
              });
            } catch (statErr) {
              logger.error("Cannot read file stats:", statErr);
            }
          });
        });
      } else if (file.buffer) {
        // If multer used memory storage, upload from buffer
        result = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            uploadOptions,
            (error, result) => {
              if (error) return reject(error);
              resolve(result!);
            },
          );

          // Create a readable stream from the buffer
          Readable.from(file.buffer).pipe(uploadStream);
        });
      } else {
        // Log diagnostic info before throwing error
        logger.error("[Cloudinary Upload] File has neither path nor buffer:", {
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          hasPath: !!file.path,
          pathValue: file.path,
          hasBuffer: !!file.buffer,
          fieldname: file.fieldname,
          encoding: file.encoding,
        });
        throw new Error("File must have either path or buffer");
      }

      // Log successful upload
      const uploadDuration = Date.now() - uploadStartTime;
      const {
        formatBytes,
        formatDuration,
      } = require("../../utils/uploadHelpers");
      logger.info(
        `[Cloudinary Upload] Success - File: ${file.originalname}, Size: ${formatBytes(fileSize)}, Duration: ${formatDuration(uploadDuration)}, URL: ${result.secure_url}`,
      );

      return {
        success: true,
        url: result.secure_url,
        publicId: result.public_id,
        size: result.bytes,
        format: result.format,
        width: result.width,
        height: result.height,
      };
    } catch (error: any) {
      const uploadDuration = Date.now() - uploadStartTime;
      logger.error(
        `[Cloudinary Upload] Failed - File: ${file.originalname}, Size: ${fileSize} bytes, Duration: ${uploadDuration}ms, Error:`,
        error.message,
      );
      return {
        success: false,
        error: error.message || "Failed to upload to Cloudinary",
      };
    }
  }

  /**
   * Delete a file from Cloudinary
   */
  async delete(publicId: string): Promise<boolean> {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result.result === "ok" || result.result === "not found";
    } catch (error) {
      logger.error("Error deleting from Cloudinary:", error);
      return false;
    }
  }

  /**
   * Get URL for a Cloudinary asset with optional transformations
   */
  getUrl(publicId: string, transformation?: any): string {
    if (!publicId) return "";

    if (transformation) {
      return cloudinary.url(publicId, transformation);
    }

    // Use optimized URL helper
    return getOptimizedImageUrl(publicId);
  }

  /**
   * Check if an asset exists in Cloudinary
   */
  async exists(publicId: string): Promise<boolean> {
    try {
      await cloudinary.api.resource(publicId);
      return true;
    } catch (error: any) {
      if (error.error?.http_code === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get metadata for a Cloudinary asset
   */
  async getMetadata(publicId: string): Promise<any> {
    try {
      const result = await cloudinary.api.resource(publicId);
      return {
        publicId: result.public_id,
        format: result.format,
        width: result.width,
        height: result.height,
        bytes: result.bytes,
        url: result.secure_url,
        createdAt: result.created_at,
        provider: "cloudinary",
        resourceType: result.resource_type,
        type: result.type,
        tags: result.tags || [],
      };
    } catch (error) {
      logger.error("Error getting Cloudinary metadata:", error);
      return null;
    }
  }

  /**
   * Get image variations for different sizes
   */
  getImageVariations(publicId: string): { [key: string]: string } {
    if (!publicId) return {};

    return {
      thumbnail: getOptimizedImageUrl(publicId, "thumbnail"),
      small: getOptimizedImageUrl(publicId, "small"),
      medium: getOptimizedImageUrl(publicId, "medium"),
      large: getOptimizedImageUrl(publicId, "large"),
      hero: getOptimizedImageUrl(publicId, "hero"),
      square: getOptimizedImageUrl(publicId, "square"),
      avatar: getOptimizedImageUrl(publicId, "avatar"),
      original: getOptimizedImageUrl(publicId),
    };
  }
}
