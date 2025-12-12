import { v2 as cloudinary } from 'cloudinary';
import { config } from './env';

// Configure Cloudinary
cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
  secure: config.cloudinary.secure
});

// Upload preset configurations
export const uploadPresets = {
  events: {
    folder: 'gema/events',
    transformation: [
      { quality: 'auto', fetch_format: 'auto' },
      { width: 1200, height: 800, crop: 'limit' }
    ],
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'avif'],
    timeout: 60000 // 60s timeout for 10MB uploads
  },
  venues: {
    folder: 'gema/venues',
    transformation: [
      { quality: 'auto', fetch_format: 'auto' },
      { width: 1200, height: 800, crop: 'limit' }
    ],
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'avif'],
    timeout: 60000 // 60s timeout for 10MB uploads
  },
  users: {
    folder: 'gema/users',
    transformation: [
      { quality: 'auto:good', fetch_format: 'auto' }, // Balanced quality/speed
      { width: 400, height: 400, crop: 'fill', gravity: 'face' }
    ],
    // Eager transformations for immediate availability
    eager: [
      { width: 150, height: 150, crop: 'fill', gravity: 'face', quality: 'auto' }, // Thumbnail
      { width: 400, height: 400, crop: 'fill', gravity: 'face', quality: 'auto:good' } // Standard
    ],
    eager_async: true, // Process eager transformations asynchronously (faster upload)
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'avif'],
    timeout: 60000 // 60s timeout for 10MB uploads
  },
  tickets: {
    folder: 'gema/tickets',
    transformation: [
      { quality: 'auto', fetch_format: 'auto' }
    ],
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'avif', 'pdf'],
    timeout: 60000 // 60s timeout for 10MB uploads
  },
  documents: {
    folder: 'gema/documents',
    resource_type: 'raw',
    allowed_formats: ['pdf', 'doc', 'docx', 'txt'],
    timeout: 60000 // 60s timeout for 10MB uploads
  },
  registrations: {
    folder: 'gema/registrations',
    resource_type: 'auto', // Supports images and documents
    transformation: [
      { quality: 'auto', fetch_format: 'auto' }
    ],
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'pdf', 'zip', 'doc', 'docx'],
    timeout: 60000 // 60s timeout for 10MB uploads
  },
  blogs: {
    folder: 'gema/blogs',
    transformation: [
      { quality: 'auto', fetch_format: 'auto' },
      { width: 1920, height: 1080, crop: 'limit' }
    ],
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'],
    timeout: 60000 // 60s timeout for 10MB uploads
  },
  blogContent: {
    folder: 'gema/blogs/content',
    resource_type: 'auto', // Supports images and videos
    transformation: [
      { quality: 'auto', fetch_format: 'auto' }
    ],
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'mp4', 'webm', 'mov'],
    timeout: 60000 // 60s timeout for 10MB uploads
  }
};

// Image transformation presets
export const imageTransformations = {
  thumbnail: { width: 200, height: 200, crop: 'fill' },
  small: { width: 400, height: 300, crop: 'limit' },
  medium: { width: 800, height: 600, crop: 'limit' },
  large: { width: 1200, height: 900, crop: 'limit' },
  hero: { width: 1920, height: 1080, crop: 'fill' },
  square: { width: 500, height: 500, crop: 'fill' },
  avatar: { width: 150, height: 150, crop: 'fill', gravity: 'face', radius: 'max' }
};

// Utility function to generate optimized image URL
export const getOptimizedImageUrl = (
  publicId: string, 
  transformation?: keyof typeof imageTransformations | object
): string => {
  if (!publicId) return '';
  
  let transformOptions: object = { quality: 'auto', fetch_format: 'auto' };
  
  if (transformation) {
    if (typeof transformation === 'string' && imageTransformations[transformation]) {
      transformOptions = { ...transformOptions, ...imageTransformations[transformation] };
    } else if (typeof transformation === 'object') {
      transformOptions = { ...transformOptions, ...transformation };
    }
  }
  
  return cloudinary.url(publicId, transformOptions);
};

// Utility function to extract public ID from Cloudinary URL
export const extractPublicId = (cloudinaryUrl: string): string => {
  if (!cloudinaryUrl) return '';
  
  try {
    const urlParts = cloudinaryUrl.split('/');
    const fileName = urlParts[urlParts.length - 1];
    return fileName.split('.')[0];
  } catch (error) {
    console.error('Error extracting public ID from Cloudinary URL:', error);
    return '';
  }
};

// Utility function to delete image from Cloudinary
export const deleteCloudinaryImage = async (publicId: string): Promise<boolean> => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result.result === 'ok';
  } catch (error) {
    console.error('Error deleting image from Cloudinary:', error);
    return false;
  }
};

// Utility function to get image details
export const getImageDetails = async (publicId: string) => {
  try {
    const result = await cloudinary.api.resource(publicId);
    return {
      publicId: result.public_id,
      format: result.format,
      width: result.width,
      height: result.height,
      bytes: result.bytes,
      url: result.secure_url,
      createdAt: result.created_at
    };
  } catch (error) {
    console.error('Error getting image details:', error);
    return null;
  }
};

// Utility function to validate upload configuration
export const validateCloudinaryConfig = (): boolean => {
  const { cloudName, apiKey, apiSecret } = config.cloudinary;
  return !!(cloudName && apiKey && apiSecret);
};

export default cloudinary;