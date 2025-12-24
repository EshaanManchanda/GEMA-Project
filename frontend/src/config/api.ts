/**
 * API Configuration - Multi-Region Support
 * Auto-detects API endpoint based on current domain
 * Enables single frontend build to work across all regions
 */

/**
 * Get the appropriate API base URL based on the current hostname
 * Supports kidrove.com, kidrove.in, and kidrove.ae
 */
const getApiBaseUrl = (): string => {
  const hostname = window.location.hostname;

  // Match domain and use corresponding API subdomain
  if (hostname.includes('kidrove.com')) {
    return 'https://api.kidrove.com/api';
  } else if (hostname.includes('kidrove.in')) {
    return 'https://api.kidrove.in/api';
  } else if (hostname.includes('kidrove.ae')) {
    return 'https://api.kidrove.ae/api';
  }

  // Fallback for localhost/development
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';
};

/**
 * API Base URL - Automatically determined based on domain
 * Production: Uses api subdomain matching current domain
 * Development: Falls back to localhost:5001
 */
export const API_BASE_URL = getApiBaseUrl();

/**
 * Get the current region based on domain
 * Useful for region-specific features (currency, language, etc.)
 */
export const getCurrentRegion = (): 'com' | 'in' | 'ae' | 'dev' => {
  const hostname = window.location.hostname;

  if (hostname.includes('kidrove.in')) return 'in';
  if (hostname.includes('kidrove.ae')) return 'ae';
  if (hostname.includes('kidrove.com')) return 'com';

  return 'dev'; // localhost/development
};

/**
 * Regional configuration (for future use)
 * Placeholder for region-specific settings
 */
export const REGIONAL_CONFIG = {
  com: {
    currency: 'AED',
    language: 'en',
    timezone: 'Asia/Dubai',
  },
  in: {
    currency: 'INR',
    language: 'en',
    timezone: 'Asia/Kolkata',
  },
  ae: {
    currency: 'AED',
    language: 'en',
    timezone: 'Asia/Dubai',
  },
  dev: {
    currency: 'AED',
    language: 'en',
    timezone: 'Asia/Dubai',
  },
};

/**
 * Get regional configuration for current domain
 */
export const getRegionalConfig = () => {
  const region = getCurrentRegion();
  return REGIONAL_CONFIG[region];
};

/**
 * Google Maps API Key
 * Used for Google Maps embeds and Places API on frontend
 */
export const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY || '';
