import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';
import { config } from '../config/env';
import { uploadPresets, getOptimizedImageUrl, deleteCloudinaryImage, extractPublicId } from '../config/cloudinary';
import fs from 'fs';
import path from 'path';

export interface UploadResult {
  success: boolean;
  url?: string;
  publicId?: string;
  originalName?: string;
  size?: number;
  format?: string;
  width?: number;
  height?: number;
  error?: string;
}

export interface UploadOptions {
  category?: keyof typeof uploadPresets;
  transformation?: object;
  folder?: string;
  filename?: string;
  tags?: string[];
  resourceType?: 'image' | 'video' | 'raw' | 'auto';
}

export class UploadService {
  private static instance: UploadService;

  public static getInstance(): UploadService {
    if (!UploadService.instance) {
      UploadService.instance = new UploadService();
    }
    return UploadService.instance;
  }

  /**
   * Upload file to Cloudinary
   */
  async uploadToCloudinary(
    filePath: string,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    try {
      const {
        category = 'documents',
        transformation,
        folder,
        filename,
        tags = [],
        resourceType = 'auto'
      } = options;

      // Get upload preset configuration
      const preset = uploadPresets[category];
      
      // Prepare upload options
      const uploadOptions: any = {
        resource_type: (preset as any).resource_type || resourceType,
        folder: folder || preset.folder,
        tags: [...tags, category],
        use_filename: true,
        unique_filename: true,
        overwrite: false
      };

      // Add filename if specified
      if (filename) {
        uploadOptions.public_id = `${uploadOptions.folder}/${filename}`;
      }

      // Add transformations
      if (transformation) {
        uploadOptions.transformation = transformation;
      } else if ((preset as any).transformation) {
        uploadOptions.transformation = (preset as any).transformation;
      }

      // Add allowed formats if specified
      if ((preset as any).allowed_formats) {
        uploadOptions.allowed_formats = (preset as any).allowed_formats;
      }

      // Upload to Cloudinary
      const result: UploadApiResponse = await cloudinary.uploader.upload(filePath, uploadOptions);

      return {
        success: true,
        url: result.secure_url,
        publicId: result.public_id,
        originalName: path.basename(filePath),
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
   * Upload multiple files to Cloudinary
   */
  async uploadMultipleToCloudinary(
    filePaths: string[],
    options: UploadOptions = {}
  ): Promise<UploadResult[]> {
    const uploadPromises = filePaths.map(filePath => this.uploadToCloudinary(filePath, options));
    return Promise.all(uploadPromises);
  }

  /**
   * Upload file to local storage (fallback)
   */
  async uploadToLocal(
    file: Express.Multer.File,
    category: string = 'misc'
  ): Promise<UploadResult> {
    try {
      const uploadDir = path.resolve(process.cwd(), config.upload.path, category);
      
      // Ensure directory exists
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      // Generate unique filename
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const fileExtension = path.extname(file.originalname);
      const baseName = path.basename(file.originalname, fileExtension);
      const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9]/g, '');
      const filename = `${sanitizedBaseName}-${uniqueSuffix}${fileExtension}`;
      
      const filePath = path.join(uploadDir, filename);
      
      // Move file to destination
      fs.renameSync(file.path, filePath);

      const relativePath = path.relative(path.resolve(process.cwd(), config.upload.path), filePath);
      const url = `/api/uploads/files/${relativePath.replace(/\\/g, '/')}`;

      return {
        success: true,
        url,
        originalName: file.originalname,
        size: file.size,
        format: path.extname(file.originalname).substring(1)
      };

    } catch (error: any) {
      console.error('Local upload error:', error);
      return {
        success: false,
        error: error.message || 'Failed to upload locally'
      };
    }
  }

  /**
   * Delete file from Cloudinary
   */
  async deleteFromCloudinary(publicId: string): Promise<boolean> {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result.result === 'ok';
    } catch (error) {
      console.error('Error deleting from Cloudinary:', error);
      return false;
    }
  }

  /**
   * Delete file from local storage
   */
  async deleteFromLocal(filePath: string): Promise<boolean> {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting from local storage:', error);
      return false;
    }
  }

  /**
   * Get optimized image URLs for different sizes
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

  /**
   * Process single file upload (auto-detects provider)
   */
  async processFileUpload(
    file: Express.Multer.File,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    const provider = config.upload.provider;

    if (provider === 'cloudinary') {
      const result = await this.uploadToCloudinary(file.path, options);
      
      // Clean up temp file (skip Cloudinary URLs)
      if (file.path && !file.path.startsWith('http://') && !file.path.startsWith('https://')) {
        try {
          fs.unlinkSync(file.path);
        } catch (error) {
          console.warn('Failed to clean up temp file:', file.path);
        }
      }
      
      return result;
    } else {
      return this.uploadToLocal(file, options.category);
    }
  }

  /**
   * Process multiple file uploads
   */
  async processMultipleFileUploads(
    files: Express.Multer.File[],
    options: UploadOptions = {}
  ): Promise<UploadResult[]> {
    const uploadPromises = files.map(file => this.processFileUpload(file, options));
    return Promise.all(uploadPromises);
  }

  /**
   * Get file information
   */
  async getFileInfo(identifier: string): Promise<any> {
    const provider = config.upload.provider;

    if (provider === 'cloudinary') {
      try {
        const result = await cloudinary.api.resource(identifier);
        return {
          publicId: result.public_id,
          format: result.format,
          width: result.width,
          height: result.height,
          bytes: result.bytes,
          url: result.secure_url,
          createdAt: result.created_at,
          provider: 'cloudinary'
        };
      } catch (error) {
        return null;
      }
    } else {
      // Handle local file info
      try {
        const filePath = path.resolve(process.cwd(), config.upload.path, identifier);
        if (fs.existsSync(filePath)) {
          const stats = fs.statSync(filePath);
          return {
            path: identifier,
            size: stats.size,
            createdAt: stats.birthtime,
            modifiedAt: stats.mtime,
            provider: 'local'
          };
        }
        return null;
      } catch (error) {
        return null;
      }
    }
  }

  /**
   * Delete file (auto-detects provider)
   */
  async deleteFile(identifier: string): Promise<boolean> {
    const provider = config.upload.provider;

    if (provider === 'cloudinary') {
      return this.deleteFromCloudinary(identifier);
    } else {
      const filePath = path.resolve(process.cwd(), config.upload.path, identifier);
      return this.deleteFromLocal(filePath);
    }
  }

  /**
   * Validate file type
   */
  validateFileType(file: Express.Multer.File, category?: keyof typeof uploadPresets): boolean {
    const allowedTypes = config.upload.allowedFileTypes;
    
    if (category && uploadPresets[category] && uploadPresets[category].allowed_formats) {
      const preset = uploadPresets[category];
      const fileExtension = path.extname(file.originalname).substring(1).toLowerCase();
      return preset.allowed_formats?.includes(fileExtension) || false;
    }
    
    return allowedTypes.includes(file.mimetype);
  }

  /**
   * Validate file size
   */
  validateFileSize(file: Express.Multer.File): boolean {
    return file.size <= config.upload.maxFileSize;
  }
}

export default UploadService.getInstance();