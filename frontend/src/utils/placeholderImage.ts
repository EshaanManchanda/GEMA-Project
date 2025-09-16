/**
 * Utility for generating local placeholder images
 */

export interface PlaceholderOptions {
  width?: number;
  height?: number;
  text?: string;
  backgroundColor?: string;
  textColor?: string;
  format?: 'svg' | 'canvas';
}

/**
 * Generate a local placeholder image as a data URL
 */
export const generatePlaceholder = ({
  width = 400,
  height = 300,
  text = 'Image',
  backgroundColor = '#f0f0f0',
  textColor = '#666666',
  format = 'svg'
}: PlaceholderOptions = {}): string => {
  if (format === 'svg') {
    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="${backgroundColor}"/>
        <text x="50%" y="50%" text-anchor="middle" dy="0.3em" 
              font-family="Arial, sans-serif" font-size="${Math.min(width, height) / 10}" 
              fill="${textColor}">${text}</text>
      </svg>
    `;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }
  
  // Canvas fallback (though we'll primarily use SVG)
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    return generatePlaceholder({ width, height, text, backgroundColor, textColor, format: 'svg' });
  }
  
  // Fill background
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, width, height);
  
  // Add text
  ctx.fillStyle = textColor;
  ctx.font = `${Math.min(width, height) / 10}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, width / 2, height / 2);
  
  return canvas.toDataURL('image/png');
};

/**
 * Common placeholder image configurations
 */
export const placeholderConfigs = {
  eventCard: { width: 400, height: 300, text: 'Event Image' },
  userAvatar: { width: 150, height: 150, text: 'User' },
  blogThumbnail: { width: 300, height: 200, text: 'Blog Image' },
  categoryIcon: { width: 100, height: 100, text: 'Category' },
  venuePhoto: { width: 500, height: 300, text: 'Venue' },
  galleryItem: { width: 300, height: 200, text: 'Gallery' }
};

/**
 * Generate placeholder image URL for common use cases
 */
export const getPlaceholderUrl = (type: keyof typeof placeholderConfigs, customText?: string): string => {
  const config = placeholderConfigs[type];
  return generatePlaceholder({
    ...config,
    text: customText || config.text
  });
};

/**
 * Fallback image handler for broken images
 */
export const handleImageError = (
  event: React.SyntheticEvent<HTMLImageElement>,
  fallbackType: keyof typeof placeholderConfigs = 'eventCard',
  customText?: string
) => {
  const img = event.target as HTMLImageElement;
  if (img.src !== getPlaceholderUrl(fallbackType, customText)) {
    img.src = getPlaceholderUrl(fallbackType, customText);
  }
};