import { Request, Response, NextFunction } from 'express';
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/index';
import { UserRole } from '../models/index';
import PageView from '../models/PageView';
import * as gsc from '../services/searchConsole.service';
import cacheService from '../services/cache.service';

const router = Router();

router.use(authenticate);
router.use(authorize([UserRole.ADMIN]));

const GSC_CACHE_TTL = 60 * 60; // 1 hour

// GET /api/admin/traffic/overview
router.get('/traffic/overview', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const days = Math.min(parseInt(req.query.days as string) || 30, 365);
    const since = new Date(Date.now() - days * 86400000);

    const [totalResult, byDay, byDevice, topPages] = await Promise.all([
      PageView.aggregate([
        { $match: { timestamp: { $gte: since }, device: { $ne: 'bot' } } },
        { $group: { _id: null, totalViews: { $sum: 1 }, uniqueSessions: { $addToSet: '$sessionId' } } },
        { $project: { totalViews: 1, uniqueVisitors: { $size: '$uniqueSessions' } } },
      ]),
      PageView.aggregate([
        { $match: { timestamp: { $gte: since }, device: { $ne: 'bot' } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } }, views: { $sum: 1 } } },
        { $sort: { _id: 1 } },
        { $project: { date: '$_id', views: 1, _id: 0 } },
      ]),
      PageView.aggregate([
        { $match: { timestamp: { $gte: since }, device: { $ne: 'bot' } } },
        { $group: { _id: '$device', count: { $sum: 1 } } },
        { $project: { device: '$_id', count: 1, _id: 0 } },
      ]),
      PageView.aggregate([
        { $match: { timestamp: { $gte: since }, device: { $ne: 'bot' } } },
        { $group: { _id: '$path', views: { $sum: 1 } } },
        { $sort: { views: -1 } },
        { $limit: 10 },
        { $project: { path: '$_id', views: 1, _id: 0 } },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        totalViews: totalResult[0]?.totalViews ?? 0,
        uniqueVisitors: totalResult[0]?.uniqueVisitors ?? 0,
        byDay,
        byDevice,
        topPages,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/traffic/referrers
router.get('/traffic/referrers', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const days = Math.min(parseInt(req.query.days as string) || 30, 365);
    const since = new Date(Date.now() - days * 86400000);

    const data = await PageView.aggregate([
      { $match: { timestamp: { $gte: since }, referrer: { $ne: null }, device: { $ne: 'bot' } } },
      { $group: { _id: '$referrer', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 15 },
      { $project: { referrer: '$_id', count: 1, _id: 0 } },
    ]);

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/search-console/sites — list configured site URLs for the frontend dropdown
router.get('/search-console/sites', (_req: Request, res: Response) => {
  res.json({
    success: true,
    configured: gsc.isSearchConsoleConfigured(),
    sites: gsc.getConfiguredSites(),
  });
});

// GET /api/admin/search-console/summary?days=28&site=sc-domain:kidrove.ae
router.get('/search-console/summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!gsc.isSearchConsoleConfigured()) {
      return res.json({
        success: true,
        data: null,
        configured: false,
        message: 'Google Search Console not configured. Set GOOGLE_SERVICE_ACCOUNT_JSON and SEARCH_CONSOLE_SITE_URLS.',
      });
    }

    const days = Math.min(parseInt(req.query.days as string) || 28, 90);
    const siteUrl = gsc.resolveSiteUrl(req.query.site as string | undefined);
    const cacheKey = `gsc:summary:${siteUrl}:${days}`;

    const cached = await cacheService.get(cacheKey);
    if (cached) return res.json({ success: true, data: cached, siteUrl, cached: true });

    const [summary, trend] = await Promise.all([
      gsc.getSearchSummary(siteUrl, days),
      gsc.getSearchTrend(siteUrl, days),
    ]);
    const result = { summary, trend };
    await cacheService.set(cacheKey, result, { ttl: GSC_CACHE_TTL });

    res.json({ success: true, data: result, siteUrl, configured: true });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/search-console/queries?days=28&site=sc-domain:kidrove.in
router.get('/search-console/queries', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!gsc.isSearchConsoleConfigured()) {
      return res.json({ success: true, data: [], configured: false });
    }

    const days = Math.min(parseInt(req.query.days as string) || 28, 90);
    const limit = Math.min(parseInt(req.query.limit as string) || 25, 100);
    const siteUrl = gsc.resolveSiteUrl(req.query.site as string | undefined);
    const cacheKey = `gsc:queries:${siteUrl}:${days}:${limit}`;

    const cached = await cacheService.get(cacheKey);
    if (cached) return res.json({ success: true, data: cached, siteUrl, cached: true });

    const data = await gsc.getTopQueries(siteUrl, days, limit);
    await cacheService.set(cacheKey, data, { ttl: GSC_CACHE_TTL });

    res.json({ success: true, data, siteUrl, configured: true });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/search-console/pages?days=28&site=sc-domain:kidrove.com
router.get('/search-console/pages', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!gsc.isSearchConsoleConfigured()) {
      return res.json({ success: true, data: null, configured: false });
    }

    const days = Math.min(parseInt(req.query.days as string) || 28, 90);
    const siteUrl = gsc.resolveSiteUrl(req.query.site as string | undefined);
    const cacheKey = `gsc:pages:${siteUrl}:${days}`;

    const cached = await cacheService.get(cacheKey);
    if (cached) return res.json({ success: true, data: cached, siteUrl, cached: true });

    const [pages, countries] = await Promise.all([
      gsc.getTopPages(siteUrl, days),
      gsc.getSearchByCountry(siteUrl, days),
    ]);
    const result = { pages, countries };
    await cacheService.set(cacheKey, result, { ttl: GSC_CACHE_TTL });

    res.json({ success: true, data: result, siteUrl, configured: true });
  } catch (err) {
    next(err);
  }
});

export default router;
