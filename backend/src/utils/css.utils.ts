/**
 * CSS Sanitization Utility
 * Shared utility for sanitizing custom CSS in blogs and events
 * Removes dangerous properties while preserving safe styling
 */

/**
 * Sanitize custom CSS to remove dangerous properties
 * @param css - Raw CSS string from user input
 * @returns Sanitized CSS string
 */
export function sanitizeCustomCSS(css: string): string {
  if (!css || typeof css !== 'string') {
    return '';
  }

  let sanitized = css;

  // Remove @import statements (can load external malicious CSS)
  sanitized = sanitized.replace(/@import\s+[^;]+;?/gi, '');

  // Remove url() with http/https (keep data: URIs for embedded images)
  sanitized = sanitized.replace(/url\s*\(\s*['"]?https?:\/\/[^)'"]+['"]?\s*\)/gi, '');

  // Remove javascript: protocol (XSS vector)
  sanitized = sanitized.replace(/javascript\s*:/gi, '');

  // Remove expression() (IE-specific XSS vector)
  sanitized = sanitized.replace(/expression\s*\([^)]*\)/gi, '');

  // Remove -moz-binding (Firefox XSS vector)
  sanitized = sanitized.replace(/-moz-binding\s*:[^;]+;?/gi, '');

  // Remove behavior property (IE XSS vector)
  sanitized = sanitized.replace(/behavior\s*:[^;]+;?/gi, '');

  // Remove any <script> tags if accidentally included
  sanitized = sanitized.replace(/<script[^>]*>.*?<\/script>/gis, '');

  // Remove <style> tags (CSS should be raw, not wrapped in tags)
  sanitized = sanitized.replace(/<\/?style[^>]*>/gi, '');

  return sanitized.trim();
}

/**
 * Validate CSS character limit
 * @param css - CSS string to validate
 * @param maxLength - Maximum allowed length (default: 50000)
 * @returns True if valid, false otherwise
 */
export function validateCSSLength(css: string, maxLength: number = 50000): boolean {
  if (!css) return true; // Empty CSS is valid
  return css.length <= maxLength;
}
