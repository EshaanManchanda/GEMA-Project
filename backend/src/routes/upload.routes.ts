import { Router, Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import mongoose from "mongoose";
import { config } from "../config/env";
import { AuthRequest } from "../types/express.d";
import { AppError } from "../middleware/error";
import {
  uploadSingle,
  uploadMultiple,
  uploadEventImages,
  uploadVenueImages,
  uploadUserAvatar,
  uploadDocument,
  uploadBlogFeaturedImage,
  uploadBlogContentMedia,
  uploadBookingAttachment,
  handleUploadError,
  getFileInfo,
  deleteFile,
} from "../middleware/upload";
import { authenticate } from "../middleware/auth";
import uploadService from "../services/upload.service";
import mediaService from "../services/media.service";
import { getOptimizedImageUrl, extractPublicId } from "../config/cloudinary";
import logger from "../config/logger";

const router = Router();

// Serve uploaded files statically
router.use("/files", (req: Request, res: Response, next: NextFunction) => {
  const filePath = path.join(process.cwd(), config.upload.path, req.path);

  // Security check: prevent path traversal
  const normalizedPath = path.normalize(filePath);
  const uploadDir = path.resolve(process.cwd(), config.upload.path);

  if (!normalizedPath.startsWith(uploadDir)) {
    return next(new AppError("Access denied", 403));
  }

  // Check if file exists
  if (!fs.existsSync(normalizedPath)) {
    return next(new AppError("File not found", 404));
  }

  // Set appropriate headers
  const ext = path.extname(normalizedPath).toLowerCase();
  const mimeTypes: { [key: string]: string } = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".avif": "image/avif",
    ".bmp": "image/bmp",
    ".tiff": "image/tiff",
    ".tif": "image/tiff",
    ".svg": "image/svg+xml",
    ".heic": "image/heic",
    ".heif": "image/heif",
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx":
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".csv": "text/csv",
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".ppt": "application/vnd.ms-powerpoint",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".txt": "text/plain",
    ".zip": "application/zip",
  };

  const mimeType = mimeTypes[ext] || "application/octet-stream";
  res.setHeader("Content-Type", mimeType);

  // Cache and CORS headers
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Access-Control-Allow-Origin", "*"); // Allow all origins for public media
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin"); // Allow cross-origin access

  // Disable Content-Security-Policy and other Helmet security headers for static files so PDFs can render in-browser
  res.removeHeader("Content-Security-Policy");
  res.removeHeader("X-Download-Options");
  res.removeHeader("X-Frame-Options");
  res.removeHeader("Cross-Origin-Opener-Policy");

  res.sendFile(normalizedPath);
});

// Single file upload
router.post(
  "/single",
  authenticate,
  uploadSingle("file"),
  handleUploadError,
  (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        return next(new AppError("No file uploaded", 400));
      }

      const fileInfo = getFileInfo(req.file);

      res.status(200).json({
        success: true,
        message: "File uploaded successfully",
        data: fileInfo,
      });
    } catch (error) {
      next(error);
    }
  },
);

// Multiple files upload
router.post(
  "/multiple",
  authenticate,
  uploadMultiple("files", 5),
  handleUploadError,
  (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        return next(new AppError("No files uploaded", 400));
      }

      const filesInfo = (req.files as Express.Multer.File[]).map(
        (file: Express.Multer.File) => getFileInfo(file),
      );

      res.status(200).json({
        success: true,
        message: `${filesInfo.length} files uploaded successfully`,
        data: filesInfo,
      });
    } catch (error) {
      next(error);
    }
  },
);

// Event images upload
router.post(
  "/event-images",
  authenticate,
  uploadEventImages,
  handleUploadError,
  (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };

      if (!files || Object.keys(files).length === 0) {
        return next(new AppError("No files uploaded", 400));
      }

      const uploadedFiles: { [key: string]: any } = {};

      Object.keys(files).forEach((fieldname) => {
        uploadedFiles[fieldname] = files[fieldname].map((file) =>
          getFileInfo(file),
        );
      });

      res.status(200).json({
        success: true,
        message: "Event images uploaded successfully",
        data: uploadedFiles,
      });
    } catch (error) {
      next(error);
    }
  },
);

// Venue images upload
router.post(
  "/venue-images",
  authenticate,
  uploadVenueImages,
  handleUploadError,
  (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };

      if (!files || Object.keys(files).length === 0) {
        return next(new AppError("No files uploaded", 400));
      }

      const uploadedFiles: { [key: string]: any } = {};

      Object.keys(files).forEach((fieldname) => {
        uploadedFiles[fieldname] = files[fieldname].map((file) =>
          getFileInfo(file),
        );
      });

      res.status(200).json({
        success: true,
        message: "Venue images uploaded successfully",
        data: uploadedFiles,
      });
    } catch (error) {
      next(error);
    }
  },
);

// User avatar upload
router.post(
  "/avatar",
  authenticate,
  uploadUserAvatar,
  handleUploadError,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const startTime = Date.now();

    try {
      if (!req.file) {
        return next(new AppError("No avatar image uploaded", 400));
      }

      const userId = req.user?._id || req.user?.id;
      if (!userId) {
        return next(new AppError("User not authenticated", 401));
      }

      // Upload using MediaService with 'profile' category
      const mediaAsset = await mediaService.uploadMedia(req.file, {
        category: "profile",
        folder: "profile.avatars",
        uploadedBy: userId.toString(),
        tags: ["avatar", "user-profile"],
      });

      // Track usage immediately
      await mediaService.trackUsage(
        mediaAsset._id.toString(),
        "User",
        "avatar",
        new mongoose.Types.ObjectId(userId),
      );

      const uploadDuration = Date.now() - startTime;

      // Log performance metrics for monitoring
      logger.debug(`Avatar upload completed`, {
        userId: req.user?.id,
        mediaAssetId: mediaAsset._id,
        uuid: mediaAsset.uuid,
        duration: `${uploadDuration}ms`,
        fileSize: `${(req.file.size / 1024).toFixed(2)}KB`,
        mimeType: req.file.mimetype,
        provider: config.upload.provider,
      });

      // Warn if upload is slow (> 5 seconds)
      if (uploadDuration > 5000) {
        logger.warn(`Slow avatar upload detected`, {
          userId: req.user?.id,
          duration: `${uploadDuration}ms`,
          fileSize: `${(req.file.size / 1024).toFixed(2)}KB`,
        });
      }

      res.status(200).json({
        success: true,
        message: "Avatar uploaded successfully",
        data: {
          url: mediaAsset.url, // UUID-based URL
          mediaAssetId: mediaAsset._id,
          uuid: mediaAsset.uuid,
          filename: mediaAsset.filename,
          size: mediaAsset.size,
          mimeType: mediaAsset.mimeType,
        },
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`Avatar upload failed after ${duration}ms`, {
        userId: req.user?.id,
        error,
      });
      next(error);
    }
  },
);

// Document upload
router.post(
  "/document",
  authenticate,
  uploadDocument,
  handleUploadError,
  (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        return next(new AppError("No document uploaded", 400));
      }

      const fileInfo = getFileInfo(req.file);

      res.status(200).json({
        success: true,
        message: "Document uploaded successfully",
        data: fileInfo,
      });
    } catch (error) {
      next(error);
    }
  },
);

// Booking attachment upload (image or PDF only)
// This endpoint uses a dedicated storage that always assigns the correct
// Cloudinary resource_type so PDFs get /raw/upload/ URLs and images get
// /image/upload/ URLs.  A wrong resource_type is what was causing the
// "Failed to load PDF document" error in the browser.
router.post(
  "/booking-attachment",
  authenticate,
  uploadBookingAttachment,
  handleUploadError,
  (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        return next(new AppError("No file uploaded", 400));
      }

      const fileInfo = getFileInfo(req.file);

      res.status(200).json({
        success: true,
        message: "Booking attachment uploaded successfully",
        data: fileInfo,
      });
    } catch (error) {
      next(error);
    }
  },
);

// Blog featured image upload
router.post(
  "/blog-featured-image",
  authenticate,
  uploadBlogFeaturedImage,
  handleUploadError,
  // Debug middleware - log file details after multer processing
  (req: AuthRequest, res: Response, next: NextFunction) => {
    logger.info("[Upload Debug] File received from multer:", {
      hasFile: !!req.file,
      path: req.file?.path,
      hasPath: !!req.file?.path,
      buffer: req.file?.buffer ? "Buffer present" : "No buffer",
      hasBuffer: !!req.file?.buffer,
      size: req.file?.size,
      mimetype: req.file?.mimetype,
      originalname: req.file?.originalname,
      fieldname: req.file?.fieldname,
      encoding: req.file?.encoding,
    });
    next();
  },
  (req: AuthRequest, res: Response, next: NextFunction) => {
    const uploadStartTime = Date.now();
    const fileSize = req.file?.size || 0;

    try {
      logger.info(
        `[Upload Route] Blog featured image upload started - Size: ${fileSize} bytes`,
      );

      if (!req.file) {
        return next(new AppError("No featured image uploaded", 400));
      }

      const fileInfo = getFileInfo(req.file);
      const uploadDuration = Date.now() - uploadStartTime;

      logger.info(
        `[Upload Route] Blog featured image upload completed - Size: ${fileSize} bytes, Duration: ${uploadDuration}ms`,
      );

      res.status(200).json({
        success: true,
        message: "Blog featured image uploaded successfully",
        data: fileInfo,
      });
    } catch (error) {
      const uploadDuration = Date.now() - uploadStartTime;
      logger.error(
        `[Upload Route] Blog featured image upload failed - Size: ${fileSize} bytes, Duration: ${uploadDuration}ms, Error:`,
        error,
      );
      next(error);
    }
  },
);

// Blog content media upload (images/videos within blog content)
router.post(
  "/blog-content-media",
  authenticate,
  uploadBlogContentMedia,
  handleUploadError,
  (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        return next(new AppError("No media uploaded", 400));
      }

      const fileInfo = getFileInfo(req.file);
      const isVideo = req.file.mimetype.startsWith("video/");

      res.status(200).json({
        success: true,
        message: `Blog ${isVideo ? "video" : "image"} uploaded successfully`,
        data: {
          ...fileInfo,
          mediaType: isVideo ? "video" : "image",
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

// Delete file
router.delete(
  "/file/:filename",
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { filename } = req.params;
      const { category = "misc" } = req.query;

      // Security check: validate filename
      if (!/^[a-zA-Z0-9._-]+$/.test(filename)) {
        return next(new AppError("Invalid filename", 400));
      }

      const filePath = path.join(
        process.cwd(),
        config.upload.path,
        category as string,
        filename,
      );

      // Security check: prevent path traversal
      const normalizedPath = path.normalize(filePath);
      const uploadDir = path.resolve(process.cwd(), config.upload.path);

      if (!normalizedPath.startsWith(uploadDir)) {
        return next(new AppError("Access denied", 403));
      }

      // Check if file exists
      if (!fs.existsSync(normalizedPath)) {
        return next(new AppError("File not found", 404));
      }

      await deleteFile(normalizedPath);

      res.status(200).json({
        success: true,
        message: "File deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  },
);

// Get file info
router.get(
  "/info/:filename",
  authenticate,
  (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { filename } = req.params;
      const { category = "misc" } = req.query;

      // Security check: validate filename
      if (!/^[a-zA-Z0-9._-]+$/.test(filename)) {
        return next(new AppError("Invalid filename", 400));
      }

      const filePath = path.join(
        process.cwd(),
        config.upload.path,
        category as string,
        filename,
      );

      // Security check: prevent path traversal
      const normalizedPath = path.normalize(filePath);
      const uploadDir = path.resolve(process.cwd(), config.upload.path);

      if (!normalizedPath.startsWith(uploadDir)) {
        return next(new AppError("Access denied", 403));
      }

      // Check if file exists
      if (!fs.existsSync(normalizedPath)) {
        return next(new AppError("File not found", 404));
      }

      const stats = fs.statSync(normalizedPath);
      const ext = path.extname(filename);

      const fileInfo = {
        filename,
        path: filePath,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        extension: ext,
        category,
      };

      res.status(200).json({
        success: true,
        message: "File info retrieved successfully",
        data: fileInfo,
      });
    } catch (error) {
      next(error);
    }
  },
);

// List files in category
router.get(
  "/list/:category",
  authenticate,
  (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { category } = req.params;
      const { page = 1, limit = 20 } = req.query;

      // Validate category
      const allowedCategories = [
        "events",
        "venues",
        "users",
        "tickets",
        "documents",
        "misc",
      ];
      if (!allowedCategories.includes(category)) {
        return next(new AppError("Invalid category", 400));
      }

      const categoryPath = path.join(
        process.cwd(),
        config.upload.path,
        category,
      );

      if (!fs.existsSync(categoryPath)) {
        return res.status(200).json({
          success: true,
          message: "File list retrieved successfully",
          data: {
            files: [],
            pagination: {
              page: parseInt(page as string),
              limit: parseInt(limit as string),
              total: 0,
              pages: 0,
            },
          },
        });
      }

      const files = fs.readdirSync(categoryPath);
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const startIndex = (pageNum - 1) * limitNum;
      const endIndex = startIndex + limitNum;

      const paginatedFiles = files
        .slice(startIndex, endIndex)
        .map((filename) => {
          const filePath = path.join(categoryPath, filename);
          const stats = fs.statSync(filePath);

          return {
            filename,
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime,
            extension: path.extname(filename),
            url: `/api/uploads/files/${category}/${filename}`,
          };
        });

      res.status(200).json({
        success: true,
        message: "File list retrieved successfully",
        data: {
          files: paginatedFiles,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total: files.length,
            pages: Math.ceil(files.length / limitNum),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

// Get image transformations (Cloudinary only)
router.get(
  "/transform/:publicId",
  authenticate,
  (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { publicId } = req.params;
      const { transformation } = req.query;

      if (config.upload.provider !== "cloudinary") {
        return next(
          new AppError(
            "Image transformations are only available with Cloudinary",
            400,
          ),
        );
      }

      if (!publicId) {
        return next(new AppError("Public ID is required", 400));
      }

      let transformedUrl: string;

      if (transformation && typeof transformation === "string") {
        // Parse transformation query parameter
        try {
          const transformOptions = JSON.parse(transformation);
          transformedUrl = getOptimizedImageUrl(publicId, transformOptions);
        } catch (error) {
          return next(new AppError("Invalid transformation parameters", 400));
        }
      } else {
        // Return variations
        const variations = uploadService.getImageVariations(publicId);
        return res.status(200).json({
          success: true,
          message: "Image variations generated successfully",
          data: { variations },
        });
      }

      res.status(200).json({
        success: true,
        message: "Image transformation generated successfully",
        data: {
          originalUrl: getOptimizedImageUrl(publicId),
          transformedUrl,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

// Get image variations
router.get(
  "/variations/:publicId",
  authenticate,
  (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { publicId } = req.params;

      if (config.upload.provider !== "cloudinary") {
        return next(
          new AppError(
            "Image variations are only available with Cloudinary",
            400,
          ),
        );
      }

      if (!publicId) {
        return next(new AppError("Public ID is required", 400));
      }

      const variations = uploadService.getImageVariations(publicId);

      res.status(200).json({
        success: true,
        message: "Image variations retrieved successfully",
        data: { variations },
      });
    } catch (error) {
      next(error);
    }
  },
);

// Batch upload
router.post(
  "/batch",
  authenticate,
  uploadMultiple("files", 10),
  handleUploadError,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        return next(new AppError("No files uploaded", 400));
      }

      const { category = "misc" } = req.body;
      const results = [];

      for (const file of req.files) {
        const fileInfo = getFileInfo(file);
        results.push(fileInfo);
      }

      res.status(200).json({
        success: true,
        message: `${results.length} files uploaded successfully`,
        data: {
          files: results,
          provider: config.upload.provider,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

// Get upload provider info
router.get("/provider", authenticate, (req: AuthRequest, res: Response) => {
  res.status(200).json({
    success: true,
    message: "Upload provider information",
    data: {
      provider: config.upload.provider,
      maxFileSize: config.upload.maxFileSize,
      allowedFileTypes: config.upload.allowedFileTypes,
      cloudinaryEnabled: config.upload.provider === "cloudinary",
    },
  });
});

// Enhanced file info endpoint
router.get(
  "/enhanced-info/:identifier",
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { identifier } = req.params;

      const fileInfo = await uploadService.getFileInfo(identifier);

      if (!fileInfo) {
        return next(new AppError("File not found", 404));
      }

      // Add image variations if it's an image and using Cloudinary
      if (
        config.upload.provider === "cloudinary" &&
        fileInfo.format &&
        ["jpg", "jpeg", "png", "gif", "webp"].includes(
          fileInfo.format.toLowerCase(),
        )
      ) {
        fileInfo.variations = uploadService.getImageVariations(identifier);
      }

      res.status(200).json({
        success: true,
        message: "Enhanced file info retrieved successfully",
        data: fileInfo,
      });
    } catch (error) {
      next(error);
    }
  },
);

// Delete file with provider detection
router.delete(
  "/enhanced/:identifier",
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { identifier } = req.params;

      const deleted = await uploadService.deleteFile(identifier);

      if (!deleted) {
        return next(
          new AppError("Failed to delete file or file not found", 404),
        );
      }

      res.status(200).json({
        success: true,
        message: "File deleted successfully",
        data: { provider: config.upload.provider },
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
