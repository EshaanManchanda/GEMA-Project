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

export const isSearchConsoleConfigured = (): boolean => {
  return !!(process.env.GOOGLE_SERVICE_ACCOUNT_JSON && process.env.SEARCH_CONSOLE_SITE_URL);
};

// Summary totals (clicks, impressions, CTR, position) for date range
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

// Top search queries — sorted by clicks (GSC default sort)
export const getTopQueries = async (siteUrl: string, days = 28, limit = 25) => {
  const { startDate, endDate } = dateRange(days);
  const res = await getSC().searchanalytics.query({
    siteUrl,
    requestBody: {
      startDate,
      endDate,
      dimensions: ['query'],
      rowLimit: limit,
    },
  });
  return res.data.rows ?? [];
};

// Top landing pages
export const getTopPages = async (siteUrl: string, days = 28, limit = 25) => {
  const { startDate, endDate } = dateRange(days);
  const res = await getSC().searchanalytics.query({
    siteUrl,
    requestBody: {
      startDate,
      endDate,
      dimensions: ['page'],
      rowLimit: limit,
    },
  });
  return res.data.rows ?? [];
};

// Clicks + impressions by date (for line chart)
export const getSearchTrend = async (siteUrl: string, days = 28) => {
  const { startDate, endDate } = dateRange(days);
  const res = await getSC().searchanalytics.query({
    siteUrl,
    requestBody: {
      startDate,
      endDate,
      dimensions: ['date'],
      rowLimit: days,
    },
  });
  return res.data.rows ?? [];
};

// Country breakdown
export const getSearchByCountry = async (siteUrl: string, days = 28) => {
  const { startDate, endDate } = dateRange(days);
  const res = await getSC().searchanalytics.query({
    siteUrl,
    requestBody: {
      startDate,
      endDate,
      dimensions: ['country'],
      rowLimit: 15,
    },
  });
  return res.data.rows ?? [];
};
