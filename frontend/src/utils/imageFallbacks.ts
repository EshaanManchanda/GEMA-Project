// Utility functions for handling image fallbacks

type ImageLike = string | {
  url?: string;
  secureUrl?: string;
  thumbnailUrl?: string;
  [key: string]: any;
};

/**
 * Generates a fallback image URL using data URIs for better reliability
 * @param text - Text to display in the fallback image
 * @param width - Image width (default: 400)
 * @param height - Image height (default: 300)
 * @param bgColor - Background color (default: '#f3f4f6')
 * @param textColor - Text color (default: '#6b7280')
 * @returns Data URI for the fallback image
 */
export const generateFallbackImage = (
  text: string,
  width: number = 400,
  height: number = 300,
  bgColor: string = '#f3f4f6',
  textColor: string = '#6b7280'
): string => {
  // Create SVG content
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${bgColor}"/>
      <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="16" font-weight="500" text-anchor="middle" dominant-baseline="middle" fill="${textColor}">
        ${text.length > 20 ? text.substring(0, 20) + '...' : text}
      </text>
    </svg>
  `;

  // Convert to data URI with UTF-8 encoding support
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

/**
 * Gets an event image with fallback
 * @param images - Array of image URLs
 * @param title - Event title for fallback
 * @param width - Image width
 * @param height - Image height
 * @returns Image URL or fallback
 */
const isAbsoluteUrl = (url: string): boolean =>
  /^(https?:\/\/|data:)/.test(url);

const resolveImageUrl = (image?: ImageLike): string | null => {
  if (!image) return null;

  if (typeof image === 'string') {
    return isAbsoluteUrl(image) ? image : null;
  }

  const candidate = image.url || image.secureUrl || image.thumbnailUrl;
  return candidate && isAbsoluteUrl(candidate) ? candidate : null;
};

type EventImageSource = {
  image?: string;
  imageUrl?: string;
  coverImage?: string;
  images?: ImageLike[];
  imageUrls?: ImageLike[];
  imageAssets?: ImageLike[];
  title?: string;
};

export const getEventImageFromEvent = (
  event?: EventImageSource,
  width: number = 400,
  height: number = 300
): string => {
  if (!event) {
    return generateFallbackImage('Event Image', width, height);
  }

  const directUrl = [event.image, event.imageUrl, event.coverImage].find(
    (url) => typeof url === 'string' && url.trim().length > 0
  );
  if (directUrl) return directUrl;

  const fromArrays = [event.images, event.imageUrls, event.imageAssets]
    .flatMap((items) => items || [])
    .map(resolveImageUrl)
    .find(Boolean);

  if (fromArrays) return fromArrays;

  const rawArrayImage = [event.images, event.imageUrls, event.imageAssets]
    .flatMap((items) => items || [])
    .find((image) => typeof image === 'string' && image.trim().length > 0);

  if (rawArrayImage) return rawArrayImage as string;

  return generateFallbackImage(event.title || 'Event Image', width, height);
};

export const getEventImage = (
  images?: ImageLike[],
  title?: string,
  width: number = 400,
  height: number = 300
): string => {
  const validUrl = images?.map(resolveImageUrl).find(Boolean) || null;
  if (validUrl) return validUrl;

  return generateFallbackImage(title || 'Event Image', width, height);
};

/**
 * Gets a vendor logo with fallback
 * @param logo - Logo URL
 * @param name - Vendor name for fallback
 * @param size - Logo size
 * @returns Logo URL or fallback
 */
export const getVendorLogo = (
  logo?: string,
  name?: string,
  size: number = 150
): string => {
  if (logo) {
    return logo;
  }

  // Use initials for vendor logos
  const initials = name
    ? name.split(' ').map(word => word[0]).join('').toUpperCase().substring(0, 2)
    : '??';

  return generateFallbackImage(initials, size, size, '#3b82f6', '#ffffff');
};

/**
 * Gets a category image with fallback
 * @param image - Category image URL
 * @param name - Category name for fallback
 * @param width - Image width
 * @param height - Image height
 * @returns Image URL or fallback
 */
export const getCategoryImage = (
  image?: string,
  name?: string,
  width: number = 400,
  height: number = 300
): string => {
  if (image) {
    return image;
  }

  return generateFallbackImage(name || 'Category', width, height, '#10b981', '#ffffff');
};

/**
 * Creates an error handler for image loading
 * @param fallbackSrc - Fallback image source
 * @returns Error handler function
 */
export const createImageErrorHandler = (fallbackSrc: string) => {
  return (event: React.SyntheticEvent<HTMLImageElement>) => {
    const target = event.target as HTMLImageElement;
    if (target.src !== fallbackSrc) {
      target.src = fallbackSrc;
    }
  };
};