import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '../models/User';
import * as mediaController from '../controllers/media.controller';
import { uploadSingle, uploadMultiple } from '../middleware/upload';
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

// Serve files by UUID (public access)
router.get('/file/:uuid', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { uuid } = req.params;

    // Find media asset by UUID
    const asset = await MediaAsset.findOne({ uuid });

    if (!asset) {
      return next(new AppError('File not found', 404));
    }

    // Check if file is public
    if (!asset.isPublic) {
      return next(new AppError('Access denied', 403));
    }

    // For Cloudinary, redirect to reconstructed URL from publicId
    if (asset.provider === 'cloudinary' && asset.publicId) {
      // Instantiate Cloudinary provider directly for this asset
      // (not using StorageFactory which uses env config)
      const cloudinaryProvider = new CloudinaryProvider();
      const cloudinaryUrl = cloudinaryProvider.getUrl(asset.publicId);

      // Add CORS headers to redirect response
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

      return res.redirect(cloudinaryUrl);
    }

    // For local storage, serve file
    if (asset.provider === 'local' && asset.localPath) {
      const filePath = path.join(
        process.cwd(),
        config.upload.path,
        asset.localPath
      );

      if (!fs.existsSync(filePath)) {
        return next(new AppError('File not found on disk', 404));
      }

      // Set content type and CORS headers
      res.setHeader('Content-Type', asset.mimeType);
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year cache
      res.setHeader('Access-Control-Allow-Origin', '*'); // Allow all origins for public media
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'); // Allow cross-origin access

      return res.sendFile(filePath);
    }

    return next(new AppError('File source not available', 404));
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

// Upload single media file
router.post(
  '/upload',
  uploadSingle('file'),
  mediaController.uploadMedia
);

// Upload multiple media files
router.post(
  '/upload-multiple',
  uploadMultiple('files', 10),
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
