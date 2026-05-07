/**
 * Frontend Configuration
 *
 * Centralized configuration for the frontend application.
 * All environment variables should be defined here.
 */

import { API_BASE_URL } from './config/api';

export const config = {
  /**
   * Application base URL
   * Used for generating absolute URLs, SEO, and social sharing
   */
  appUrl: (typeof window !== 'undefined' ? window.location.origin : (import.meta.env.VITE_APP_URL || '')),

  /**
   * API base URL - Runtime-detected for multi-region support
   * Automatically uses api subdomain matching current domain
   * (api.kidrove.com, api.kidrove.in, api.kidrove.ae)
   */
  apiUrl: API_BASE_URL,

  /**
   * Default author information (for blogs, etc.)
   */
  defaultAuthor: {
    name: import.meta.env.VITE_DEFAULT_AUTHOR_NAME || '',
    email: import.meta.env.VITE_DEFAULT_AUTHOR_EMAIL || '',
    avatar: import.meta.env.VITE_DEFAULT_AUTHOR_AVATAR || '',
    bio: import.meta.env.VITE_DEFAULT_AUTHOR_BIO || '',
  },
} as const;

/**
 * Validates that all required environment variables are set
 * Call this during app initialization
 */
export function validateConfig() {
  const errors: string[] = [];

  if (!config.appUrl) {
    errors.push('VITE_APP_URL is not set');
  }

  if (!config.apiUrl) {
    errors.push('VITE_API_URL is not set');
  }

  if (errors.length > 0) {
    console.error('Configuration errors:', errors);
    // In development, log warnings but don't throw
    // In production, you might want to throw an error
    if (import.meta.env.PROD) {
      throw new Error(`Missing required configuration: ${errors.join(', ')}`);
    }
  }

  return errors.length === 0;
}
