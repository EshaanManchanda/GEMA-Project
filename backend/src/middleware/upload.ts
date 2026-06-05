import multer from "multer";
import path from "path";
import fs from "fs";
import { Request } from "express";
import { config } from "../config/env";
import { AppError } from "./error";
import uploadService, { UploadResult } from "../services/upload.service";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary";

// Ensure upload directory exists
const uploadDir = path.resolve(process.cwd(), config.upload.path);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Create subdirectories for different file types
const createSubDirectories = () => {
  const subDirs = [
    "events",
    "venues",
    "users",
    "tickets",
    "documents",
    "registrations",
    "blogs",
  ];
  subDirs.forEach((dir) => {
    const subDirPath = path.join(uploadDir, dir);
    if (!fs.existsSync(subDirPath)) {
      fs.mkdirSync(subDirPath, { recursive: true });
    }
  });
};

createSubDirectories();

// Helper function to determine category from request
const getCategoryFromRequest = (req: Request): string => {
  if (req.path.includes("/events") || req.path.includes("/event-images"))
    return "events";
  if (req.path.includes("/venues") || req.path.includes("/venue-images"))
    return "venues";
  if (
    req.path.includes("/users") ||
    req.path.includes("/avatar") ||
    req.path.includes("/vendors") ||
    req.path.includes("/upload-image")
  )
    return "users";
  if (req.path.includes("/tickets")) return "tickets";
  if (req.path.includes("/document")) return "documents";
  if (req.path.includes("/registration")) return "registrations";
  if (req.path.includes("/blog"))
    return req.path.includes("/content") ? "blogContent" : "blogs";
  if (req.body.category) return req.body.category;
  return "misc";
};

// Cloudinary storage configuration with dynamic timeout
const cloudinaryStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: (req: Request, file) => {
    const category = getCategoryFromRequest(req);
    const isVideo = file.mimetype.startsWith("video/");
    const isPdf = file.mimetype === "application/pdf";
    const isDocument = [
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/csv",
      "application/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "text/plain",
      "application/zip",
      "application/x-zip-compressed",
    ].includes(file.mimetype);

    const contentLength = parseInt(req.headers["content-length"] || "0", 10);
    const timeoutMs =
      contentLength > 0
        ? require("../utils/uploadHelpers").getTimeoutForFileSize(contentLength)
        : 120000;

    const resourceType = isVideo ? "video" : isPdf || isDocument ? "raw" : "auto";
    const uniqueSuffix = `${category}-${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const publicId = isPdf ? `${uniqueSuffix}.pdf` : uniqueSuffix;

    return {
      folder: `gema/${category}`,
      allowed_formats: isPdf || isDocument
        ? undefined
        : category === "blogContent"
          ? ["jpg", "jpeg", "png", "gif", "webp", "bmp", "tiff", "svg", "heic", "heif", "mp4", "webm", "mov"]
          : ["jpg", "jpeg", "png", "gif", "webp", "bmp", "tiff", "svg", "heic", "heif", "pdf", "doc", "docx"],
      resource_type: resourceType,
      transformation: isVideo || isPdf || isDocument ? [] : [{ quality: "auto", fetch_format: "auto" }],
      public_id: publicId,
      timeout: timeoutMs,
    };
  },
});

// ──────────────────────────────────────────────────────────────────────────────
// Dedicated storage for booking attachments (image OR pdf only).
// We split image vs pdf into two separate CloudinaryStorage instances so that
// multer-storage-cloudinary always picks the correct resource_type at upload
// time rather than relying on runtime detection inside a shared params fn.
// ──────────────────────────────────────────────────────────────────────────────
const bookingAttachmentImageStorage = new CloudinaryStorage({
  cloudinary,
  params: (_req: Request, _file) => ({
    folder: "gema/booking-attachments",
    resource_type: "image",
    transformation: [{ quality: "auto", fetch_format: "auto" }],
    public_id: `booking-${Date.now()}-${Math.round(Math.random() * 1e9)}`,
  }),
});

const bookingAttachmentPdfStorage = new CloudinaryStorage({
  cloudinary,
  params: (_req: Request, _file) => ({
    folder: "gema/booking-attachments",
    resource_type: "raw",
    public_id: `booking-${Date.now()}-${Math.round(Math.random() * 1e9)}.pdf`,
  }),
});

// Local storage configuration (fallback)
const localStorage = multer.diskStorage({
  destination: (req: Request, file, cb) => {
    const subDir = getCategoryFromRequest(req);
    const destination = path.join(uploadDir, subDir);

    // Ensure destination exists
    if (!fs.existsSync(destination)) {
      fs.mkdirSync(destination, { recursive: true });
    }

    cb(null, destination);
  },
  filename: (req: Request, file, cb) => {
    // Generate unique filename with timestamp and random string
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const fileExtension = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, fileExtension);
    const sanitizedBaseName = baseName
      .replace(/[^a-zA-Z0-9]/g, "")
      .substring(0, 50);

    cb(null, `${sanitizedBaseName}-${uniqueSuffix}${fileExtension}`);
  },
});

// Storage configuration based on provider
const storage =
  config.upload.provider === "cloudinary" ? cloudinaryStorage : localStorage;

// File filter function
const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  const allowedTypes = config.upload.allowedFileTypes;

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new AppError(
        `File type ${file.mimetype} is not allowed. Allowed types: ${allowedTypes.join(", ")}`,
        400,
      ),
    );
  }
};

// Base multer configuration (general purpose)
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.upload.maxVideoSize, // Use largest limit (500MB for videos)
    files: 10, // Maximum 10 files per request
  },
});

// Blog-specific multer configuration with image size limits
const uploadBlog = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.upload.maxImageSize, // 10MB for blog images (was incorrectly using maxVideoSize)
    files: 1, // Single file for featured image
  },
});

// Specific upload middlewares
export const uploadSingle = (fieldName: string = "file") =>
  upload.single(fieldName);

export const uploadMultiple = (
  fieldName: string = "files",
  maxCount: number = 5,
) => upload.array(fieldName, maxCount);

export const uploadFields = (fields: { name: string; maxCount?: number }[]) =>
  upload.fields(fields);

// Event-specific upload middleware
export const uploadEventImages = upload.fields([
  { name: "images", maxCount: config.event.maxImageCount },
  { name: "banner", maxCount: 1 },
  { name: "thumbnail", maxCount: 1 },
]);

// Venue-specific upload middleware
export const uploadVenueImages = upload.fields([
  { name: "images", maxCount: 20 },
  { name: "floorPlan", maxCount: 1 },
  { name: "thumbnail", maxCount: 1 },
]);

// User avatar upload middleware
export const uploadUserAvatar = upload.single("avatar");

// Document upload middleware (for tickets, invoices, etc.)
export const uploadDocument = upload.single("document");

// QR code upload middleware
export const uploadQRCode = upload.single("qrCode");

// Registration files upload middleware (supports multiple dynamic fields)
export const uploadRegistrationFiles = upload.any();

// ──────────────────────────────────────────────────────────────────────────────
// Booking attachment upload middleware.
// Only image/* and application/pdf are accepted.
// Uses per-mimetype Cloudinary storage instances so resource_type is always
// correct (image → /image/upload/, pdf → /raw/upload/).
// ──────────────────────────────────────────────────────────────────────────────
const bookingAttachmentFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  const allowed = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/bmp",
    "image/tiff",
    "image/heic",
    "image/heif",
    "image/svg+xml",
    "application/pdf",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError("Only images, PDFs and Excel files are allowed for booking attachments", 400));
  }
};

/**
 * Upload a single booking attachment.
 * Internally routes to the correct Cloudinary storage based on mimetype.
 * Falls back to the generic local storage when the provider is not cloudinary.
 */
export const uploadBookingAttachment = (
  req: Request,
  res: any,
  next: any,
) => {
  const isPdf = (req.headers["x-file-mimetype"] === "application/pdf") ||
    (req as any)._bookingAttachmentIsPdf;

  // We need to choose the right Cloudinary storage BEFORE multer runs.
  // Since we don't have the file's mimetype before parsing, we use a
  // "routing" multer that applies the correct storage per file.
  const routingStorage =
    config.upload.provider === "cloudinary"
      ? new CloudinaryStorage({
          cloudinary,
          params: (_r: Request, file: Express.Multer.File) => {
            const isImage = file.mimetype.startsWith("image/");
            const ext = path.extname(file.originalname).toLowerCase() || "";
            return {
              folder: "gema/booking-attachments",
              resource_type: isImage ? "image" : "raw",
              transformation: isImage ? [{ quality: "auto", fetch_format: "auto" }] : [],
              public_id: `booking-${Date.now()}-${Math.round(Math.random() * 1e9)}${isImage ? "" : ext}`,
            };
          },
        })
      : multer.diskStorage({
          destination: (_r, _f, cb) => {
            const dest = path.join(uploadDir, "booking-attachments");
            if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
            cb(null, dest);
          },
          filename: (_r, file, cb) => {
            const ext = path.extname(file.originalname);
            cb(null, `booking-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
          },
        });

  const m = multer({
    storage: routingStorage,
    fileFilter: bookingAttachmentFilter,
    limits: { fileSize: config.upload.maxFileSize, files: 1 },
  }).single("file");

  return m(req, res, next);
};

// Blog-specific upload middleware with proper size limits
export const uploadBlogFeaturedImage = uploadBlog.single("featuredImage");

// Blog content media upload (images and videos within content)
export const uploadBlogContentMedia = upload.single("media");

// Error handling middleware for multer errors
export const handleUploadError = (
  error: any,
  req: Request,
  res: any,
  next: any,
) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return next(
        new AppError(
          "File too large. Maximum size allowed is " +
            config.upload.maxFileSize / 1024 / 1024 +
            "MB",
          400,
        ),
      );
    }
    if (error.code === "LIMIT_FILE_COUNT") {
      return next(new AppError("Too many files uploaded", 400));
    }
    if (error.code === "LIMIT_UNEXPECTED_FILE") {
      return next(new AppError("Unexpected field in file upload", 400));
    }
  }

  next(error);
};

// Helper function to get file URL (works with both Cloudinary and local)
export const getFileUrl = (file: Express.Multer.File): string => {
  if (config.upload.provider === "cloudinary") {
    // For Cloudinary, the file path is actually the secure_url
    return (file as any).path || "";
  } else {
    // For local storage
    const relativePath = path.relative(uploadDir, file.path);
    return `/api/uploads/files/${relativePath.replace(/\\/g, "/")}`;
  }
};

// Helper function to delete file
export const deleteFile = (filePath: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    fs.unlink(filePath, (err) => {
      if (err && err.code !== "ENOENT") {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

// Helper function to validate image dimensions (requires sharp)
export const validateImageDimensions = (
  filePath: string,
  minWidth?: number,
  minHeight?: number,
  maxWidth?: number,
  maxHeight?: number,
): Promise<boolean> => {
  return new Promise(async (resolve, reject) => {
    try {
      // This would require sharp package for image processing
      // For now, we'll just resolve true
      resolve(true);

      /* With sharp:
      const sharp = require('sharp');
      const metadata = await sharp(filePath).metadata();
      
      if (minWidth && metadata.width < minWidth) resolve(false);
      if (minHeight && metadata.height < minHeight) resolve(false);
      if (maxWidth && metadata.width > maxWidth) resolve(false);
      if (maxHeight && metadata.height > maxHeight) resolve(false);
      
      resolve(true);
      */
    } catch (error) {
      reject(error);
    }
  });
};

// Helper to get file info (works with both Cloudinary and local)
export const getFileInfo = (file: Express.Multer.File) => {
  const baseInfo = {
    originalName: file.originalname,
    filename: file.filename,
    size: file.size,
    mimetype: file.mimetype,
    uploadedAt: new Date(),
  };

  if (config.upload.provider === "cloudinary") {
    // For Cloudinary uploads
    const cloudinaryFile = file as any;
    return {
      ...baseInfo,
      url: cloudinaryFile.path, // Cloudinary secure_url
      publicId: cloudinaryFile.filename, // Cloudinary public_id
      provider: "cloudinary",
      cloudinaryUrl: cloudinaryFile.path,
    };
  } else {
    // For local uploads
    return {
      ...baseInfo,
      path: file.path,
      url: getFileUrl(file),
      provider: "local",
    };
  }
};

const csvFilter = (_req: any, file: Express.Multer.File, cb: any) => {
  const ext = file.originalname.split(".").pop()?.toLowerCase();
  const allowed = ["text/csv", "application/csv", "application/vnd.ms-excel", "text/plain"];
  if (allowed.includes(file.mimetype) || ext === "csv") cb(null, true);
  else cb(new Error("Only CSV files are allowed"), false);
};

export const uploadCSV = multer({
  storage: multer.memoryStorage(),
  fileFilter: csvFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

export default upload;
