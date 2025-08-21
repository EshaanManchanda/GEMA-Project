import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';
import { config } from '../config/env';
import { AppError } from './error';
import uploadService, { UploadResult } from '../services/upload.service';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../config/cloudinary';

// Ensure upload directory exists
const uploadDir = path.resolve(process.cwd(), config.upload.path);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Create subdirectories for different file types
const createSubDirectories = () => {
  const subDirs = ['events', 'venues', 'users', 'tickets', 'documents'];
  subDirs.forEach(dir => {
    const subDirPath = path.join(uploadDir, dir);
    if (!fs.existsSync(subDirPath)) {
      fs.mkdirSync(subDirPath, { recursive: true });
    }
  });
};

createSubDirectories();

// Helper function to determine category from request
const getCategoryFromRequest = (req: Request): string => {
  if (req.path.includes('/events') || req.path.includes('/event-images')) return 'events';
  if (req.path.includes('/venues') || req.path.includes('/venue-images')) return 'venues';
  if (req.path.includes('/users') || req.path.includes('/avatar')) return 'users';
  if (req.path.includes('/tickets')) return 'tickets';
  if (req.path.includes('/document')) return 'documents';
  if (req.body.category) return req.body.category;
  return 'misc';
};

// Cloudinary storage configuration
const cloudinaryStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: (req: Request, file) => {
    const category = getCategoryFromRequest(req);
    return {
      folder: `gema/${category}`,
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx'],
      transformation: [{ quality: 'auto', fetch_format: 'auto' }],
      public_id: `${category}-${Date.now()}-${Math.round(Math.random() * 1E9)}`
    };
  }
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
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, fileExtension);
    const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9]/g, '');
    
    cb(null, `${sanitizedBaseName}-${uniqueSuffix}${fileExtension}`);
  }
});

// Storage configuration based on provider
const storage = config.upload.provider === 'cloudinary' ? cloudinaryStorage : localStorage;

// File filter function
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = config.upload.allowedFileTypes;
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError(`File type ${file.mimetype} is not allowed. Allowed types: ${allowedTypes.join(', ')}`, 400));
  }
};

// Base multer configuration
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.upload.maxFileSize,
    files: 10, // Maximum 10 files per request
  },
});

// Specific upload middlewares
export const uploadSingle = (fieldName: string = 'file') => upload.single(fieldName);

export const uploadMultiple = (fieldName: string = 'files', maxCount: number = 5) => 
  upload.array(fieldName, maxCount);

export const uploadFields = (fields: { name: string; maxCount?: number }[]) => 
  upload.fields(fields);

// Event-specific upload middleware
export const uploadEventImages = upload.fields([
  { name: 'images', maxCount: config.event.maxImageCount },
  { name: 'banner', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 }
]);

// Venue-specific upload middleware
export const uploadVenueImages = upload.fields([
  { name: 'images', maxCount: 20 },
  { name: 'floorPlan', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 }
]);

// User avatar upload middleware
export const uploadUserAvatar = upload.single('avatar');

// Document upload middleware (for tickets, invoices, etc.)
export const uploadDocument = upload.single('document');

// QR code upload middleware
export const uploadQRCode = upload.single('qrCode');

// Error handling middleware for multer errors
export const handleUploadError = (error: any, req: Request, res: any, next: any) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return next(new AppError('File too large. Maximum size allowed is ' + (config.upload.maxFileSize / 1024 / 1024) + 'MB', 400));
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return next(new AppError('Too many files uploaded', 400));
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return next(new AppError('Unexpected field in file upload', 400));
    }
  }
  
  next(error);
};

// Helper function to get file URL (works with both Cloudinary and local)
export const getFileUrl = (file: Express.Multer.File): string => {
  if (config.upload.provider === 'cloudinary') {
    // For Cloudinary, the file path is actually the secure_url
    return (file as any).path || '';
  } else {
    // For local storage
    const relativePath = path.relative(uploadDir, file.path);
    return `/api/uploads/files/${relativePath.replace(/\\/g, '/')}`;
  }
};

// Helper function to delete file
export const deleteFile = (filePath: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    fs.unlink(filePath, (err) => {
      if (err && err.code !== 'ENOENT') {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

// Helper function to validate image dimensions (requires sharp)
export const validateImageDimensions = (filePath: string, minWidth?: number, minHeight?: number, maxWidth?: number, maxHeight?: number): Promise<boolean> => {
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
    uploadedAt: new Date()
  };

  if (config.upload.provider === 'cloudinary') {
    // For Cloudinary uploads
    const cloudinaryFile = file as any;
    return {
      ...baseInfo,
      url: cloudinaryFile.path, // Cloudinary secure_url
      publicId: cloudinaryFile.filename, // Cloudinary public_id
      provider: 'cloudinary',
      cloudinaryUrl: cloudinaryFile.path
    };
  } else {
    // For local uploads
    return {
      ...baseInfo,
      path: file.path,
      url: getFileUrl(file),
      provider: 'local'
    };
  }
};

export default upload;