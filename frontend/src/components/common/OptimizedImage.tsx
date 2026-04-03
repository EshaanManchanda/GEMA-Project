import React, { useState, useCallback } from 'react';
import { getCloudinaryWebP, isCloudinaryUrl, getLQIP } from '@/utils/cloudinaryHelpers';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  /** Load eagerly for above-fold images (LCP optimization) */
  priority?: boolean;
  /** Responsive sizes attribute */
  sizes?: string;
  /** CSS object-fit */
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  /** Additional CSS classes */
  className?: string;
  /** Placeholder while loading */
  placeholder?: 'blur' | 'empty';
  /** Callback when image fails to load */
  onError?: () => void;
  /** Callback when image loads */
  onLoad?: () => void;
}

/**
 * Generates AVIF format Cloudinary URL
 */
const getCloudinaryAVIF = (url: string, width: number, quality: number = 80): string => {
  if (!url || !url.includes('cloudinary.com')) return url;
  return url.replace('/upload/', `/upload/w_${width},f_avif,q_${quality},c_scale/`);
};

/**
 * Generates srcset for responsive images with specified format
 */
const generateFormatSrcSet = (
  url: string,
  widths: number[],
  format: 'avif' | 'webp' | 'auto'
): string => {
  if (!url) return '';

  return widths
    .map((width) => {
      let transformedUrl: string;
      if (format === 'avif') {
        transformedUrl = getCloudinaryAVIF(url, width);
      } else if (format === 'webp') {
        transformedUrl = getCloudinaryWebP(url, width);
      } else {
        // Auto format - Cloudinary decides best format
        if (url.includes('cloudinary.com')) {
          transformedUrl = url.replace('/upload/', `/upload/w_${width},f_auto,q_auto/`);
        } else {
          transformedUrl = url;
        }
      }
      return `${transformedUrl} ${width}w`;
    })
    .join(', ');
};

/**
 * OptimizedImage - Performance-optimized image component
 *
 * Features:
 * - AVIF → WebP → JPEG format cascade
 * - Automatic responsive srcset generation
 * - Explicit dimensions to prevent CLS
 * - Priority loading for LCP images
 * - Optional blur placeholder (LQIP)
 */
const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  priority = false,
  sizes,
  objectFit = 'cover',
  className = '',
  placeholder = 'empty',
  onError,
  onLoad,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Calculate responsive widths based on provided width
  const responsiveWidths = [
    width,
    Math.round(width * 0.75),
    Math.round(width * 0.5),
  ].filter((w) => w >= 100); // Filter out too small widths

  // Generate default sizes if not provided
  const defaultSizes = sizes || `(max-width: ${width}px) 100vw, ${width}px`;

  // Get LQIP for blur placeholder
  const lqipUrl = placeholder === 'blur' && isCloudinaryUrl(src) ? getLQIP(src) : '';

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setHasError(true);
    onError?.();
  }, [onError]);

  // Show fallback on error
  if (hasError) {
    return (
      <div
        className={`bg-gray-200 flex items-center justify-center ${className}`}
        style={{ width, height, objectFit }}
        role="img"
        aria-label={alt}
      >
        <span className="text-gray-400 text-sm">Image unavailable</span>
      </div>
    );
  }

  // For non-Cloudinary images, render simple img tag
  if (!isCloudinaryUrl(src)) {
    return (
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={`object-${objectFit} ${className}`}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
        // @ts-expect-error - fetchpriority not in React types yet
        fetchpriority={priority ? 'high' : 'auto'}
        onLoad={handleLoad}
        onError={handleError}
      />
    );
  }

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ width, height }}
    >
      {/* Blur placeholder */}
      {placeholder === 'blur' && lqipUrl && !isLoaded && (
        <img
          src={lqipUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover blur-lg scale-110"
          aria-hidden="true"
        />
      )}

      {/* Main picture element with format cascade */}
      <picture>
        {/* AVIF - best compression, limited browser support */}
        <source
          type="image/avif"
          srcSet={generateFormatSrcSet(src, responsiveWidths, 'avif')}
          sizes={defaultSizes}
        />

        {/* WebP - good compression, wide browser support */}
        <source
          type="image/webp"
          srcSet={generateFormatSrcSet(src, responsiveWidths, 'webp')}
          sizes={defaultSizes}
        />

        {/* Fallback - auto format (Cloudinary picks best for browser) */}
        <img
          src={getCloudinaryWebP(src, width)}
          alt={alt}
          width={width}
          height={height}
          className={`w-full h-full object-${objectFit} transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          loading={priority ? 'eager' : 'lazy'}
          decoding={priority ? 'sync' : 'async'}
          // @ts-expect-error - fetchpriority not in React types yet
          fetchpriority={priority ? 'high' : 'auto'}
          onLoad={handleLoad}
          onError={handleError}
        />
      </picture>
    </div>
  );
};

export default OptimizedImage;
