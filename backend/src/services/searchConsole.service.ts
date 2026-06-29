import { google } from 'googleapis';

const getAuth = () => new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!),
  scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
});

const getSC = () => google.searchconsole({ version: 'v1', auth: getAuth() });

const dateRange = (days: number) => {
  const end = new Date();
  const start = new Date(Date.now() - days * 86400000);
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
  };
};

/** Parse SEARCH_CONSOLE_SITE_URLS (comma-separated) → array of site URLs. */
export const getConfiguredSites = (): string[] => {
  const raw = process.env.SEARCH_CONSOLE_SITE_URLS || process.env.SEARCH_CONSOLE_SITE_URL || '';
  return raw.split(',').map(s => s.trim()).filter(Boolean);
};

/** Returns true only when credentials + at least one site URL are present. */
export const isSearchConsoleConfigured = (): boolean => {
  return !!(process.env.GOOGLE_SERVICE_ACCOUNT_JSON && getConfiguredSites().length > 0);
};

/**
 * Resolve the requested site URL.
 * Falls back to the first configured site if the requested one isn't in the list.
 */
export const resolveSiteUrl = (requested?: string): string => {
  const sites = getConfiguredSites();
  if (requested && sites.includes(requested)) return requested;
  return sites[0];
};

export const getSearchSummary = async (siteUrl: string, days = 28) => {
  const { startDate, endDate } = dateRange(days);
  const res = await getSC().searchanalytics.query({
    siteUrl,
    requestBody: { startDate, endDate, rowLimit: 1 },
  });
  const row = res.data.rows?.[0];
  return {
    clicks: row?.clicks ?? 0,
    impressions: row?.impressions ?? 0,
    ctr: row?.ctr ?? 0,
    position: row?.position ?? 0,
  };
};

export const getTopQueries = async (siteUrl: string, days = 28, limit = 25) => {
  const { startDate, endDate } = dateRange(days);
  const res = await getSC().searchanalytics.query({
    siteUrl,
    requestBody: { startDate, endDate, dimensions: ['query'], rowLimit: limit },
  });
  return res.data.rows ?? [];
};

export const getTopPages = async (siteUrl: string, days = 28, limit = 25) => {
  const { startDate, endDate } = dateRange(days);
  const res = await getSC().searchanalytics.query({
    siteUrl,
    requestBody: { startDate, endDate, dimensions: ['page'], rowLimit: limit },
  });
  return res.data.rows ?? [];
};

export const getSearchTrend = async (siteUrl: string, days = 28) => {
  const { startDate, endDate } = dateRange(days);
  const res = await getSC().searchanalytics.query({
    siteUrl,
    requestBody: { startDate, endDate, dimensions: ['date'], rowLimit: days },
  });
  return res.data.rows ?? [];
};

export const getSearchByCountry = async (siteUrl: string, days = 28) => {
  const { startDate, endDate } = dateRange(days);
  const res = await getSC().searchanalytics.query({
    siteUrl,
    requestBody: { startDate, endDate, dimensions: ['country'], rowLimit: 15 },
  });
  return res.data.rows ?? [];
};
