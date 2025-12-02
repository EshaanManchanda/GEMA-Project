/**
 * Brand Configuration Utility
 *
 * Centralizes brand name and contact information across the frontend.
 * All values are configurable via environment variables.
 */

export interface BrandConfig {
  appName: string;
  appNameFull: string;
  appNameAr: string;
  siteName: string;
  siteDescription: string;
  contactEmail: string;
  siteAuthor: string;
}

/**
 * Get complete brand configuration from environment variables
 */
export const getBrandConfig = (): BrandConfig => ({
  appName: import.meta.env.VITE_APP_NAME || 'Kidrove',
  appNameFull: import.meta.env.VITE_APP_NAME_FULL || 'Kidrove Events',
  appNameAr: import.meta.env.VITE_APP_NAME_AR || 'كدروف',
  siteName: import.meta.env.VITE_SITE_NAME || 'Kidrove',
  siteDescription: import.meta.env.VITE_SITE_DESCRIPTION || 'Discover and book amazing family events and kids activities across the UAE',
  contactEmail: import.meta.env.VITE_CONTACT_EMAIL || 'contact@kidrove.com',
  siteAuthor: import.meta.env.VITE_SITE_AUTHOR || 'Kidrove Team'
});

/**
 * Get application name (short form)
 */
export const getAppName = (): string => getBrandConfig().appName;

/**
 * Get application name (full form)
 */
export const getAppNameFull = (): string => getBrandConfig().appNameFull;

/**
 * Get application name in Arabic
 */
export const getAppNameAr = (): string => getBrandConfig().appNameAr;

/**
 * Get contact email address
 */
export const getContactEmail = (): string => getBrandConfig().contactEmail;

/**
 * Get team name for attribution
 */
export const getTeamName = (): string => `${getBrandConfig().appName} Team`;

/**
 * Get site author for SEO
 */
export const getSiteAuthor = (): string => getBrandConfig().siteAuthor;
