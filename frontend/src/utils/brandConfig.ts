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
  contactPhone: string;
  supportEmail: string;
  companyAddress: string;
  siteAuthor: string;
  statsEventVendors: string;
  statsMonthlyBookings: string;
  statsHappyFamilies: string;
  statsActivities: string;
}

/**
 * Get complete brand configuration from environment variables
 */
export const getBrandConfig = (): BrandConfig => ({
  appName: import.meta.env.VITE_APP_NAME || 'Kidrove',
  appNameFull: import.meta.env.VITE_APP_NAME_FULL || 'Kidrove',
  appNameAr: import.meta.env.VITE_APP_NAME_AR || 'كدروف',
  siteName: import.meta.env.VITE_SITE_NAME || 'Kidrove',
  siteDescription: import.meta.env.VITE_SITE_DESCRIPTION || 'Discover and book amazing family events and kids activities across the UAE',
  contactEmail: import.meta.env.VITE_CONTACT_EMAIL || 'contact@kidrove.com',
  contactPhone: import.meta.env.VITE_CONTACT_PHONE || '+971 52 780 9450',
  supportEmail: import.meta.env.VITE_SUPPORT_EMAIL || 'contact@kidrove.com',
  companyAddress: import.meta.env.VITE_COMPANY_ADDRESS || 'Level 20, Burj Gate Tower, Downtown Dubai, UAE',
  siteAuthor: import.meta.env.VITE_SITE_AUTHOR || 'Kidrove Team',
  statsEventVendors: import.meta.env.VITE_STATS_EVENT_VENDORS || '100+',
  statsMonthlyBookings: import.meta.env.VITE_STATS_MONTHLY_BOOKINGS || '1K+',
  statsHappyFamilies: import.meta.env.VITE_STATS_HAPPY_FAMILIES || '5K+',
  statsActivities: import.meta.env.VITE_STATS_ACTIVITIES || '500+',
});

/** Get application name (short form) */
export const getAppName = (): string => getBrandConfig().appName;

/** Get application name (full form) */
export const getAppNameFull = (): string => getBrandConfig().appNameFull;

/** Get application name in Arabic */
export const getAppNameAr = (): string => getBrandConfig().appNameAr;

/** Get contact email address */
export const getContactEmail = (): string => getBrandConfig().contactEmail;

/** Get contact phone number */
export const getContactPhone = (): string => getBrandConfig().contactPhone;

/** Get support email */
export const getSupportEmail = (): string => getBrandConfig().supportEmail;

/** Get company address */
export const getCompanyAddress = (): string => getBrandConfig().companyAddress;

/** Get team name for attribution */
export const getTeamName = (): string => `${getBrandConfig().appName} Team`;

/** Get site author for SEO */
export const getSiteAuthor = (): string => getBrandConfig().siteAuthor;

/** Get stats */
export const getStatsEventVendors = (): string => getBrandConfig().statsEventVendors;
export const getStatsMonthlyBookings = (): string => getBrandConfig().statsMonthlyBookings;
export const getStatsHappyFamilies = (): string => getBrandConfig().statsHappyFamilies;
export const getStatsActivities = (): string => getBrandConfig().statsActivities;
