/**
 * Brand Configuration Utility
 *
 * Centralizes brand name and contact information across the backend.
 * All values are configurable via environment variables.
 */

export interface BrandConfig {
  appName: string;
  appNameFull: string;
  siteName: string;
  siteDescription: string;
  contactEmail: string;
}

/**
 * Get complete brand configuration from environment variables
 */
export const getBrandConfig = (): BrandConfig => ({
  appName: process.env.APP_NAME || "Kidrove",
  appNameFull: process.env.APP_NAME_FULL || "Kidrove Events",
  siteName: process.env.SITE_NAME || "Kidrove",
  siteDescription:
    process.env.SITE_DESCRIPTION ||
    "Discover and book amazing family events and kids activities across the UAE",
  contactEmail:
    process.env.CONTACT_EMAIL ||
    process.env.EMAIL_FROM ||
    "contact@kidrove.com",
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
 * Get contact email address
 */
export const getContactEmail = (): string => getBrandConfig().contactEmail;

/**
 * Get team signature for emails
 */
export const getTeamSignature = (): string =>
  `The ${getBrandConfig().appName} Team`;
