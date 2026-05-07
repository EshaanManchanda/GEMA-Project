/**
 * Cloudinary Image Optimization Helpers
 * Provides utilities for AVIF/WebP conversion, responsive srcSet generation,
 * and static asset optimization
 */

/**
 * Generates Cloudinary URL with AVIF format (best compression, ~20% smaller than WebP)
 * @param url Original Cloudinary URL
 * @param width Target width in pixels
 * @param quality Quality 1-100 (default 80)
 * @returns Transformed Cloudinary URL with AVIF format
 *
 * @example
 * getCloudinaryAVIF('https://res.cloudinary.com/demo/upload/v1234/image.jpg', 1920)
 * // Returns: 'https://res.cloudinary.com/demo/upload/w_1920,f_avif,q_80,c_scale/v1234/image.jpg'
 */
export const getCloudinaryAVIF = (
  url: string | undefined,
  width: number,
  quality: number = 80
): string => {
  if (!url) return '';

  if (!url.includes('cloudinary.com')) {
    return url;
  }

  return url.replace(
    '/upload/',
    `/upload/w_${width},f_avif,q_${quality},c_scale/`
  );
};

/**
 * Generates srcSet for AVIF format
 * @param url Original image URL
 * @param widths Array of target widths
 * @returns srcSet string with AVIF format
 */
export const generateAVIFSrcSet = (
  url: string | undefined,
  widths: number[]
): string => {
  if (!url) return '';

  return widths
    .map(width => `${getCloudinaryAVIF(url, width)} ${width}w`)
    .join(', ');
};

/**
 * Generates Cloudinary URL with WebP format and responsive width
 * Automatically handles both Cloudinary URLs and external URLs (via fetch API)
 * @param url Original Cloudinary URL or external URL (Unsplash, etc.)
 * @param width Target width in pixels
 * @param quality Quality 1-100 (default 85)
 * @returns Transformed Cloudinary URL with WebP format
 *
 * @example
 * getCloudinaryWebP('https://res.cloudinary.com/demo/upload/v1234/image.jpg', 1920)
 * // Returns: 'https://res.cloudinary.com/demo/upload/w_1920,f_webp,q_85,c_scale/v1234/image.jpg'
 *
 * Phase 6 Performance Optimization - Now supports external URLs via Cloudinary fetch
 */
export const getCloudinaryWebP = (
  url: string | undefined,
  width: number,
  quality: number = 85
): string => {
  if (!url) return '';

  // Check if it's a Cloudinary URL
  if (!url.includes('cloudinary.com')) {
    // External URL - Return original URL (Phase 6 optimization temporarily disabled due to loading issues)
    return url;
    // return getCloudinaryFetch(url, width, quality);
  }

  // Insert transformation parameters before /upload/
  // Example: .../upload/w_1200,f_webp,q_85,c_scale/v1234/image.jpg
  const transformed = url.replace(
    '/upload/',
    `/upload/w_${width},f_webp,q_${quality},c_scale/`
  );

  return transformed;
};

/**
 * Generates multiple srcSet entries for responsive images
 * @param url Original image URL
 * @param widths Array of target widths (e.g., [1920, 1280, 768])
 * @returns srcSet string compatible with picture/img elements
 *
 * @example
 * generateSrcSet('https://example.com/image.jpg', [1920, 1280, 768])
 * // Returns: 'https://...w_1920... 1920w, https://...w_1280... 1280w, https://...w_768... 768w'
 */
export const generateSrcSet = (
  url: string | undefined,
  widths: number[]
): string => {
  if (!url) return '';

  return widths
    .map(width => `${getCloudinaryWebP(url, width)} ${width}w`)
    .join(', ');
};

/**
 * For static assets, returns WebP version if available
 * Converts image extensions (.png, .jpg, .jpeg) to .webp
 * @param path Path to static image
 * @returns WebP path
 *
 * @example
 * getStaticWebP('/assets/images/logo.png')
 * // Returns: '/assets/images/logo.webp'
 */
export const getStaticWebP = (path: string): string => {
  if (!path) return '';

  const webpPath = path.replace(/\.(png|jpg|jpeg)$/i, '.webp');
  return webpPath;
};

/**
 * Generates Low Quality Image Placeholder (LQIP) URL for Cloudinary images
 * Creates ultra-compressed, blurred preview for perceived performance
 * @param imageUrl Original Cloudinary image URL
 * @returns LQIP URL (typically 2-3KB for instant loading)
 *
 * @example
 * getLQIP('https://res.cloudinary.com/demo/upload/v1234/image.jpg')
 * // Returns: 'https://res.cloudinary.com/demo/upload/w_40,q_20,e_blur:800,f_auto/v1234/image.jpg'
 */
export const getLQIP = (imageUrl: string | undefined): string => {
  if (!imageUrl || !imageUrl.includes('cloudinary.com')) return '';

  // Generate ultra-low quality preview (20% quality, 40px width, blur)
  const lqip = imageUrl.replace(
    '/upload/',
    '/upload/w_40,q_20,e_blur:800,f_auto/'
  );

  return lqip;
};

/**
 * Optimizes Cloudinary URL with auto format and quality
 * Useful for images where you want Cloudinary to auto-select best format
 * @param url Original Cloudinary URL
 * @param quality Quality setting (default 'auto:good')
 * @returns Optimized URL with auto format
 */
export const optimizeCloudinaryUrl = (
  url: string | undefined,
  quality: 'auto:best' | 'auto:good' | 'auto:eco' | 'auto:low' = 'auto:good'
): string => {
  if (!url || !url.includes('cloudinary.com')) return url || '';

  const optimized = url.replace(
    '/upload/',
    `/upload/f_auto,q_${quality}/`
  );

  return optimized;
};

/**
 * Type guard to check if URL is from Cloudinary
 * @param url URL to check
 * @returns True if URL is from Cloudinary
 */
export const isCloudinaryUrl = (url: string | undefined): boolean => {
  return !!url && url.includes('cloudinary.com');
};

/**
 * Extracts Cloudinary public ID from URL
 * Useful for manipulation or rebuilding URLs
 * @param url Cloudinary URL
 * @returns Public ID or empty string
 */
export const getCloudinaryPublicId = (url: string): string => {
  if (!isCloudinaryUrl(url)) return '';

  const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.\w+$/);
  return match ? match[1] : '';
};

/**
 * Fetches and transforms external images (Unsplash, etc.) through Cloudinary
 * Uses Cloudinary's fetch API to deliver optimized WebP versions of external images
 * INTERNAL USE ONLY - Called by getCloudinaryWebP for external URLs
 * @param externalUrl Full URL to external image (must NOT be Cloudinary URL)
 * @param width Target width in pixels
 * @param quality Quality 1-100 (default 85)
 * @returns Cloudinary fetch URL with transformations
 *
 * @example
 * getCloudinaryFetch('https://images.unsplash.com/photo-123?w=1920', 1920)
 * // Returns: 'https://res.cloudinary.com/ditxik56f/image/fetch/w_1920,f_webp,q_85,c_scale/https://images.unsplash.com/photo-123?w=1920'
 *
 * Phase 6 Performance Optimization - LCP improvement for external images
 */
export const getCloudinaryFetch = (
  externalUrl: string,
  width: number,
  quality: number = 85
): string => {
  // Get cloud name from environment
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'ditxik56f';

  // Build Cloudinary fetch URL with transformations
  const fetchUrl = `https://res.cloudinary.com/${cloudName}/image/fetch/w_${width},f_webp,q_${quality},c_scale/${encodeURIComponent(externalUrl)}`;

  return fetchUrl;
};
