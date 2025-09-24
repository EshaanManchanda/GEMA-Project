/**
 * URL Helper Utilities
 * Provides environment-aware URL generation for consistent URL handling
 */

/**
 * Get the base app URL from environment variables or fallback to current location
 */
export const getAppBaseUrl = (): string => {
  // Try to get from environment variable first
  const envUrl = import.meta.env.VITE_APP_URL;

  if (envUrl) {
    return envUrl;
  }

  // Fallback to current window location origin
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  // Fallback for SSR or when window is not available
  return 'https://gema-project-bnp5xge4w-eshaanmanchandas-projects.vercel.app';
};

/**
 * Get current page URL with correct base URL
 */
export const getCurrentPageUrl = (): string => {
  if (typeof window === 'undefined') {
    return getAppBaseUrl();
  }

  const baseUrl = getAppBaseUrl();
  const pathname = window.location.pathname;
  const search = window.location.search;
  const hash = window.location.hash;

  return `${baseUrl}${pathname}${search}${hash}`;
};

/**
 * Generate a full URL for a given path
 */
export const generateUrl = (path: string): string => {
  const baseUrl = getAppBaseUrl();

  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  return `${baseUrl}${normalizedPath}`;
};

/**
 * Generate booking URL for QR codes and sharing
 */
export const generateBookingUrl = (bookingId: string): string => {
  return generateUrl(`/bookings/${bookingId}`);
};

/**
 * Generate order URL for QR codes and sharing
 */
export const generateOrderUrl = (orderId: string): string => {
  return generateUrl(`/orders/${orderId}`);
};

/**
 * Generate ticket URL for QR codes and sharing
 */
export const generateTicketUrl = (ticketId: string): string => {
  return generateUrl(`/tickets/${ticketId}`);
};

/**
 * Generate event URL for sharing
 */
export const generateEventUrl = (eventId: string): string => {
  return generateUrl(`/events/${eventId}`);
};

/**
 * Get sharing URL for social media or web sharing API
 * Uses current page URL but ensures it uses the correct base URL
 */
export const getSharingUrl = (): string => {
  return getCurrentPageUrl();
};

export default {
  getAppBaseUrl,
  getCurrentPageUrl,
  generateUrl,
  generateBookingUrl,
  generateOrderUrl,
  generateTicketUrl,
  generateEventUrl,
  getSharingUrl
};