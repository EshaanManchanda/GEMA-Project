import { Response, NextFunction } from 'express';
import mediaService from '../services/media.service';
import { AppError } from '../middleware/error';
import { AuthRequest } from '../types/express';
import { config } from '../config/env';

/**
 * Media Controller
 *
 * Handles HTTP requests for media operations
 */

/**
 * Validate file size based on file type
 * @param file - The uploaded file
 * @throws AppError if file size exceeds the limit for its type
 */
const validateFileSize = (file: Express.Multer.File): void => {
  const maxSize = file.mimetype.startsWith('image/')
    ? config.upload.maxImageSize
    : file.mimetype.startsWith('video/')
    ? config.upload.maxVideoSize
    : file.mimetype.includes('pdf') || file.mimetype.includes('document')
    ? config.upload.maxDocumentSize
    : config.upload.maxFileSize;

  if (file.size > maxSize) {
    const sizeMB = (maxSize / 1024 / 1024).toFixed(0);
    const fileType = file.mimetype.split('/')[0];
    throw new AppError(
      `File too large. Maximum size for ${fileType} is ${sizeMB}MB`,
      400
    );
  }
};

/**
 * Upload single media file
 * POST /api/media/upload
 */
export const uploadMedia = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      return next(new AppError('No file uploaded', 400));
    }

    // Validate file size
    validateFileSize(req.file);

    const { category, folder, tags } = req.body;

    // Validate category
    const validCategories = ['blog', 'profile', 'event', 'document', 'misc'];
    if (category && !validCategories.includes(category)) {
      return next(new AppError(`Invalid category. Must be one of: ${validCategories.join(', ')}`, 400));
    }

    const mediaAsset = await mediaService.uploadMedia(req.file, {
      category: category || 'misc',
      folder: folder || category || 'misc',
      uploadedBy: req.user!._id.toString(),
      tags: tags ? (typeof tags === 'string' ? (() => {
        try {
          return JSON.parse(tags);
        } catch {
          return [];
        }
      })() : tags) : []
    });

    res.status(201).json({
      success: true,
      message: 'Media uploaded successfully',
      data: mediaAsset
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Upload multiple media files
 * POST /api/media/upload-multiple
 */
export const uploadMultipleMedia = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return next(new AppError('No files uploaded', 400));
    }

    const { category, folder, tags } = req.body;

    // Process files individually to capture per-file errors
    const results: Array<{ success: true; file: string; data: any }> = [];
    const errors: Array<{ success: false; file: string; error: string }> = [];

    for (const file of files) {
      try {
        // Validate file size
        validateFileSize(file);

        // Upload file
        const mediaAsset = await mediaService.uploadMedia(file, {
          category: category || 'misc',
          folder: folder || category || 'misc',
          uploadedBy: req.user!._id.toString(),
          tags: tags ? (typeof tags === 'string' ? (() => {
            try {
              return JSON.parse(tags);
            } catch {
              return [];
            }
          })() : tags) : []
        });

        results.push({
          success: true,
          file: file.originalname,
          data: mediaAsset
        });
      } catch (error: any) {
        errors.push({
          success: false,
          file: file.originalname,
          error: error.message || 'Upload failed'
        });
      }
    }

    // Return mixed results
    const response = {
      success: errors.length === 0,
      message: `${results.length} of ${files.length} files uploaded successfully`,
      data: {
        successful: results,
        failed: errors,
        summary: {
          total: files.length,
          succeeded: results.length,
          failed: errors.length
        }
      }
    };

    // Return 207 Multi-Status if there were partial failures
    const statusCode = errors.length > 0 && results.length > 0 ? 207 :
                      errors.length === 0 ? 201 : 400;

    res.status(statusCode).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * List media assets with filters and pagination
 * GET /api/media
 */
export const listMedia = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const {
      category,
      folder,
      mimeType,
      search,
      page = '1',
      limit = '20'
    } = req.query;

    const result = await mediaService.listMedia({
      category: category as string,
      folder: folder as string,
      mimeType: mimeType as string,
      search: search as string,
      page: parseInt(page as string, 10),
      limit: parseInt(limit as string, 10)
    });

    res.status(200).json({
      success: true,
      message: 'Media assets retrieved successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get media asset by ID
 * GET /api/media/:id
 */
export const getMediaById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const media = await mediaService.getMediaById(id);

    if (!media) {
      return next(new AppError('Media not found', 404));
    }

    res.status(200).json({
      success: true,
      data: media
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update media asset (tags, etc.)
 * PATCH /api/media/:id
 */
export const updateMedia = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { tags } = req.body;

    if (!tags || !Array.isArray(tags)) {
      return next(new AppError('Tags must be an array', 400));
    }

    const media = await mediaService.updateMediaTags(id, tags);

    if (!media) {
      return next(new AppError('Media not found', 404));
    }

    res.status(200).json({
      success: true,
      message: 'Media updated successfully',
      data: media
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete media asset
 * DELETE /api/media/:id
 */
export const deleteMedia = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { force } = req.query;

    await mediaService.deleteMedia(id, force === 'true');

    res.status(200).json({
      success: true,
      message: 'Media deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk delete media assets
 * POST /api/media/bulk-delete
 */
export const bulkDeleteMedia = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { ids, force } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return next(new AppError('No media IDs provided', 400));
    }

    const results = await mediaService.bulkDeleteMedia(ids, force);

    if (results.failed > 0) {
      return res.status(207).json({
        success: true,
        message: `Deleted ${results.success} items. Failed to delete ${results.failed} items.`,
        data: results
      });
    }

    res.status(200).json({
      success: true,
      message: `${results.success} media items deleted successfully`,
      data: results
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get media statistics
 * GET /api/media/stats
 */
export const getMediaStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { uploadedBy } = req.query;

    const stats = await mediaService.getMediaStats(uploadedBy as string);

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get unused media assets
 * GET /api/media/unused
 */
export const getUnusedMedia = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { category, limit = '50' } = req.query;

    const unused = await mediaService.findUnusedMedia(
      category as string,
      parseInt(limit as string, 10)
    );

    res.status(200).json({
      success: true,
      data: unused
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get media usage information
 * GET /api/media/:id/usage
 */
export const getMediaUsage = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const usage = await mediaService.getMediaUsage(id);

    res.status(200).json({
      success: true,
      data: usage
    });
  } catch (error) {
    next(error);
  }
};
