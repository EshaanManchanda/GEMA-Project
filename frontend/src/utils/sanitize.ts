import DOMPurify, { Config } from 'isomorphic-dompurify';

/**
 * Centralized HTML sanitization utility
 * Uses DOMPurify for XSS prevention
 */

/** Default sanitization config for blog/event content */
const CONTENT_CONFIG: Config = {
  ADD_ATTR: ['style', 'class', 'target', 'rel'],
  ADD_TAGS: ['iframe'],
  ALLOWED_ATTR: [
    'style',
    'class',
    'href',
    'src',
    'alt',
    'title',
    'target',
    'rel',
    'width',
    'height',
    'id',
    'allowfullscreen',
    'frameborder',
  ],
  ALLOW_DATA_ATTR: false,
};

/** Strict sanitization config (no iframes, minimal attributes) */
const STRICT_CONFIG: Config = {
  ALLOWED_TAGS: [
    'p',
    'br',
    'b',
    'i',
    'em',
    'strong',
    'a',
    'ul',
    'ol',
    'li',
    'span',
  ],
  ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
};

/**
 * Sanitizes HTML content to prevent XSS attacks
 * @param html Raw HTML string
 * @param config Optional DOMPurify config (defaults to CONTENT_CONFIG)
 * @returns Sanitized HTML string
 *
 * @example
 * const clean = sanitizeHtml('<script>alert("xss")</script><p>Safe content</p>');
 * // Returns: '<p>Safe content</p>'
 */
export const sanitizeHtml = (
  html: string,
  config: Config = CONTENT_CONFIG
): string => {
  if (!html) return '';
  return DOMPurify.sanitize(html, { ...config, RETURN_TRUSTED_TYPE: false }) as string;
};

/**
 * Sanitizes HTML with strict rules (no iframes, scripts, etc.)
 * Use for user-generated comments, reviews, etc.
 * @param html Raw HTML string
 * @returns Sanitized HTML string
 */
export const sanitizeStrict = (html: string): string => {
  if (!html) return '';
  return DOMPurify.sanitize(html, { ...STRICT_CONFIG, RETURN_TRUSTED_TYPE: false }) as string;
};

/**
 * Sanitizes HTML for rich content (blog posts, event descriptions)
 * Allows iframes, styles, and common formatting
 * @param html Raw HTML string
 * @returns Sanitized HTML string
 */
export const sanitizeContent = (html: string): string => {
  if (!html) return '';
  return DOMPurify.sanitize(html, { ...CONTENT_CONFIG, RETURN_TRUSTED_TYPE: false }) as string;
};

/**
 * Checks if a string contains potentially dangerous HTML
 * @param html String to check
 * @returns true if the sanitized output differs from input
 */
export const hasDangerousHtml = (html: string): boolean => {
  if (!html) return false;
  const sanitized = DOMPurify.sanitize(html, {
    ...STRICT_CONFIG,
    RETURN_TRUSTED_TYPE: false,
  }) as string;
  return sanitized !== html;
};

// Re-export DOMPurify for advanced use cases
export { DOMPurify };

// Export configs for custom sanitization
export { CONTENT_CONFIG, STRICT_CONFIG };
