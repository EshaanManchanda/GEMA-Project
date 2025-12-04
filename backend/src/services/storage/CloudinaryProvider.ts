import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { IStorageProvider, UploadResult, UploadOptions } from './IStorageProvider';
import { uploadPresets, getOptimizedImageUrl } from '../../config/cloudinary';
import path from 'path';
import fs from 'fs';

/**
 * Cloudinary Storage Provider
 *
 * Implements the IStorageProvider interface for Cloudinary cloud storage
 */
export class CloudinaryProvider implements IStorageProvider {
  /**
   * Upload a file to Cloudinary
   */
  async upload(file: Express.Multer.File, options: UploadOptions = {}): Promise<UploadResult> {
    try {
      const {
        category = 'documents',
        folder,
        transformation,
        tags = [],
        resourceType = 'auto'
      } = options;

      // Get upload preset configuration
      const preset = uploadPresets[category as keyof typeof uploadPresets];

      // Prepare upload options
      const uploadOptions: any = {
        resource_type: (preset as any)?.resource_type || resourceType,
        folder: folder || (preset as any)?.folder || `gema/${category}`,
        tags: [...tags, category],
        use_filename: true,
        unique_filename: true,
        overwrite: false
      };

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

      if (file.path) {
        // If multer saved to disk, upload from path
        result = await cloudinary.uploader.upload(file.path, uploadOptions);

        // Clean up temp file asynchronously (non-blocking)
        setImmediate(() => {
          fs.promises.unlink(file.path).catch(err =>
            console.warn('Failed to clean up temp file:', file.path)
          );
        });
      } else if (file.buffer) {
        // If multer used memory storage, upload from buffer
        result = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            uploadOptions,
            (error, result) => {
              if (error) return reject(error);
              resolve(result!);
            }
          );

          // Create a readable stream from the buffer
          const streamifier = require('streamifier');
          streamifier.createReadStream(file.buffer).pipe(uploadStream);
        });
      } else {
        throw new Error('File must have either path or buffer');
      }

      return {
        success: true,
        url: result.secure_url,
        publicId: result.public_id,
        size: result.bytes,
        format: result.format,
        width: result.width,
        height: result.height
      };

    } catch (error: any) {
      console.error('Cloudinary upload error:', error);
      return {
        success: false,
        error: error.message || 'Failed to upload to Cloudinary'
      };
    }
  }

  /**
   * Delete a file from Cloudinary
   */
  async delete(publicId: string): Promise<boolean> {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result.result === 'ok' || result.result === 'not found';
    } catch (error) {
      console.error('Error deleting from Cloudinary:', error);
      return false;
    }
  }

  /**
   * Get URL for a Cloudinary asset with optional transformations
   */
  getUrl(publicId: string, transformation?: any): string {
    if (!publicId) return '';

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
        provider: 'cloudinary',
        resourceType: result.resource_type,
        type: result.type,
        tags: result.tags || []
      };
    } catch (error) {
      console.error('Error getting Cloudinary metadata:', error);
      return null;
    }
  }

  /**
   * Get image variations for different sizes
   */
  getImageVariations(publicId: string): { [key: string]: string } {
    if (!publicId) return {};

    return {
      thumbnail: getOptimizedImageUrl(publicId, 'thumbnail'),
      small: getOptimizedImageUrl(publicId, 'small'),
      medium: getOptimizedImageUrl(publicId, 'medium'),
      large: getOptimizedImageUrl(publicId, 'large'),
      hero: getOptimizedImageUrl(publicId, 'hero'),
      square: getOptimizedImageUrl(publicId, 'square'),
      avatar: getOptimizedImageUrl(publicId, 'avatar'),
      original: getOptimizedImageUrl(publicId)
    };
  }
}
