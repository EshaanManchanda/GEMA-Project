import { google } from 'googleapis';
import SearchConsoleSnapshot, { SearchConsoleSnapshotType } from '../models/SearchConsoleSnapshot';

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

// Re-fetch from Google only after a cached snapshot goes stale — keeps the Search
// Console API quota usage low (100 queries/day free tier) while serving instantly from Mongo.
const SNAPSHOT_STALE_MS = 6 * 60 * 60 * 1000; // 6 hours

const getOrRefreshSnapshot = async <T>(
  type: SearchConsoleSnapshotType,
  siteUrl: string,
  days: number,
  limit: number,
  fetcher: () => Promise<T>,
): Promise<{ data: T; cached: boolean; fetchedAt: Date }> => {
  const query = { siteUrl, type, days, limit };
  const existing = await SearchConsoleSnapshot.findOne(query).lean();
  if (existing && Date.now() - new Date(existing.fetchedAt).getTime() < SNAPSHOT_STALE_MS) {
    return { data: existing.data as T, cached: true, fetchedAt: existing.fetchedAt };
  }

  const data = await fetcher();
  const fetchedAt = new Date();
  await SearchConsoleSnapshot.findOneAndUpdate(
    query,
    { $set: { ...query, data, fetchedAt } },
    { upsert: true },
  );
  return { data, cached: false, fetchedAt };
};

export const getCachedSummary = (siteUrl: string, days: number) =>
  getOrRefreshSnapshot('summary', siteUrl, days, 0, async () => {
    const [summary, trend] = await Promise.all([
      getSearchSummary(siteUrl, days),
      getSearchTrend(siteUrl, days),
    ]);
    return { summary, trend };
  });

export const getCachedQueries = (siteUrl: string, days: number, limit: number) =>
  getOrRefreshSnapshot('queries', siteUrl, days, limit, () => getTopQueries(siteUrl, days, limit));

export const getCachedPages = (siteUrl: string, days: number) =>
  getOrRefreshSnapshot('pages', siteUrl, days, 0, async () => {
    const [pages, countries] = await Promise.all([
      getTopPages(siteUrl, days),
      getSearchByCountry(siteUrl, days),
    ]);
    return { pages, countries };
  });
