import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '../models/User';
import * as mediaController from '../controllers/media.controller';
import { uploadSingle, uploadMultiple, handleUploadError } from '../middleware/upload';
import { timeoutMiddleware } from '../middleware/timeout';
import MediaAsset from '../models/MediaAsset';
import { AppError } from '../middleware/error';
import path from 'path';
import fs from 'fs';
import { config } from '../config/env';
import { CloudinaryProvider } from '../services/storage/CloudinaryProvider';
import { LocalProvider } from '../services/storage/LocalProvider';

const router = Router();

/**
 * PUBLIC ROUTES - No authentication required
 */

// Helper function to generate SVG placeholder
const generatePlaceholder = (text: string = 'Image', width: number = 400, height: number = 300): string => {
  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f0f0f0"/>
      <text x="50%" y="50%" text-anchor="middle" dy="0.3em"
            font-family="Arial, sans-serif" font-size="${Math.min(width, height) / 10}"
            fill="#666666">${text}</text>
    </svg>
  `.trim();
};

// Serve files by UUID (public access)
router.get('/file/:uuid', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { uuid } = req.params;

    // Find media asset by UUID
    const asset = await MediaAsset.findOne({ uuid });

    if (!asset) {
      // Return placeholder SVG instead of 404
      const placeholder = generatePlaceholder('Not Found', 400, 300);
      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Cache-Control', 'public, max-age=300'); // 5 min cache for placeholders
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      return res.send(placeholder);
    }

    // Check if file is public
    if (!asset.isPublic) {
      // Return "Access Denied" placeholder instead of 403
      const placeholder = generatePlaceholder('Access Denied', 400, 300);
      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Cache-Control', 'public, max-age=300');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      return res.send(placeholder);
    }

    // For Cloudinary, redirect to reconstructed URL from publicId
    if (asset.provider === 'cloudinary' && asset.publicId) {
      try {
        // Instantiate Cloudinary provider directly for this asset
        // (not using StorageFactory which uses env config)
        const cloudinaryProvider = new CloudinaryProvider();
        const cloudinaryUrl = cloudinaryProvider.getUrl(asset.publicId);

        // Validate URL was generated successfully
        if (!cloudinaryUrl || cloudinaryUrl.trim() === '') {
          console.warn(`[Media Route] Failed to generate Cloudinary URL for publicId: ${asset.publicId}`);
          throw new Error('Invalid Cloudinary URL');
        }

        // Add CORS headers to redirect response
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year cache

        return res.redirect(cloudinaryUrl);
      } catch (error: any) {
        // Log error and fall through to placeholder
        console.error(`[Media Route] Cloudinary redirect error for ${asset.uuid}:`, error.message);
        // Return placeholder SVG if Cloudinary redirect fails
        const placeholder = generatePlaceholder('Media Error', asset.width || 400, asset.height || 300);
        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Cache-Control', 'public, max-age=300'); // 5 min cache for errors
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        return res.send(placeholder);
      }
    }

    // For local storage, serve file
    if (asset.provider === 'local' && asset.localPath) {
      const filePath = path.join(
        process.cwd(),
        config.upload.path,
        asset.localPath
      );

      if (!fs.existsSync(filePath)) {
        // Return placeholder if file missing on disk
        const placeholder = generatePlaceholder('File Missing', 400, 300);
        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Cache-Control', 'public, max-age=300');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        return res.send(placeholder);
      }

      // Set content type and CORS headers
      res.setHeader('Content-Type', asset.mimeType);
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year cache
      res.setHeader('Access-Control-Allow-Origin', '*'); // Allow all origins for public media
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'); // Allow cross-origin access

      return res.sendFile(filePath);
    }

    // Return placeholder if no valid source
    const placeholder = generatePlaceholder('Unavailable', 400, 300);
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    return res.send(placeholder);
  } catch (error) {
    next(error);
  }
});

/**
 * PROTECTED ROUTES - Require admin authentication
 */

// Apply authentication to all routes below
router.use(authenticate);

// Apply admin-only authorization to all routes
router.use(authorize([UserRole.ADMIN]));

/**
 * Upload Routes
 */

// Upload single media file (90s timeout for 10MB uploads)
router.post(
  '/upload',
  timeoutMiddleware(90),
  uploadSingle('file'),
  handleUploadError,  // Handle multer validation errors
  // Debug middleware - log file details after multer processing
  (req: Request, res: Response, next: NextFunction) => {
    console.log('[Media Upload Debug] File received from multer:', {
      hasFile: !!req.file,
      path: req.file?.path,
      hasPath: !!req.file?.path,
      buffer: req.file?.buffer ? `Buffer(${req.file.buffer.length} bytes)` : 'No buffer',
      hasBuffer: !!req.file?.buffer,
      size: req.file?.size,
      mimetype: req.file?.mimetype,
      originalname: req.file?.originalname,
      fieldname: req.file?.fieldname,
      encoding: req.file?.encoding
    });
    next();
  },
  mediaController.uploadMedia
);

// Upload multiple media files (120s timeout for multiple 10MB uploads)
router.post(
  '/upload-multiple',
  timeoutMiddleware(120),
  uploadMultiple('files', 10),
  handleUploadError,  // Handle multer validation errors
  mediaController.uploadMultipleMedia
);

/**
 * List & Statistics Routes
 */

// Get media statistics
router.get('/stats', mediaController.getMediaStats);

// Get unused media
router.get('/unused', mediaController.getUnusedMedia);

// List media assets with filtering and pagination
router.get('/', mediaController.listMedia);

/**
 * Single Asset Routes
 */

// Get media usage information
router.get('/:id/usage', mediaController.getMediaUsage);

// Get single media asset by ID
router.get('/:id', mediaController.getMediaById);

// Update media asset (tags, etc.)
router.patch('/:id', mediaController.updateMedia);

// Delete single media asset
router.delete('/:id', mediaController.deleteMedia);

/**
 * Bulk Operations
 */

// Bulk delete media assets
router.post('/bulk-delete', mediaController.bulkDeleteMedia);

export default router;
