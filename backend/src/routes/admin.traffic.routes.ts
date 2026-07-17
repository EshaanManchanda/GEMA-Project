import { Request, Response, NextFunction } from "express";
import { Router } from "express";
import { authenticate, authorize } from "../middleware/index";
import { UserRole } from "../models/index";
import PageView from "../models/PageView";
import SearchConsoleHistory from "../models/SearchConsoleHistory";
import * as gsc from "../services/searchConsole.service";

const router = Router();

router.use(authenticate);
router.use(authorize([UserRole.ADMIN]));

// GET /api/admin/traffic/overview
router.get(
  "/traffic/overview",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const days = Math.min(parseInt(req.query.days as string) || 30, 365);
      const since = new Date(Date.now() - days * 86400000);

      const [totalResult, byDay, byDevice, topPages] = await Promise.all([
        PageView.aggregate([
          { $match: { timestamp: { $gte: since }, device: { $ne: "bot" } } },
          {
            $group: {
              _id: null,
              totalViews: { $sum: 1 },
              uniqueSessions: { $addToSet: "$sessionId" },
            },
          },
          {
            $project: {
              totalViews: 1,
              uniqueVisitors: { $size: "$uniqueSessions" },
            },
          },
        ]),
        PageView.aggregate([
          { $match: { timestamp: { $gte: since }, device: { $ne: "bot" } } },
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m-%d", date: "$timestamp" },
              },
              views: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
          { $project: { date: "$_id", views: 1, _id: 0 } },
        ]),
        PageView.aggregate([
          { $match: { timestamp: { $gte: since }, device: { $ne: "bot" } } },
          { $group: { _id: "$device", count: { $sum: 1 } } },
          { $project: { device: "$_id", count: 1, _id: 0 } },
        ]),
        PageView.aggregate([
          { $match: { timestamp: { $gte: since }, device: { $ne: "bot" } } },
          { $group: { _id: "$path", views: { $sum: 1 } } },
          { $sort: { views: -1 } },
          { $limit: 10 },
          { $project: { path: "$_id", views: 1, _id: 0 } },
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
  },
);

// GET /api/admin/traffic/referrers
router.get(
  "/traffic/referrers",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const days = Math.min(parseInt(req.query.days as string) || 30, 365);
      const since = new Date(Date.now() - days * 86400000);

      const data = await PageView.aggregate([
        {
          $match: {
            timestamp: { $gte: since },
            referrer: { $ne: null },
            device: { $ne: "bot" },
          },
        },
        { $group: { _id: "$referrer", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 15 },
        { $project: { referrer: "$_id", count: 1, _id: 0 } },
      ]);

      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/admin/search-console/sites — list configured site URLs for the frontend dropdown
router.get("/search-console/sites", (_req: Request, res: Response) => {
  res.json({
    success: true,
    configured: gsc.isSearchConsoleConfigured(),
    sites: gsc.getConfiguredSites(),
  });
});

// GET /api/admin/search-console/summary?days=28&site=sc-domain:kidrove.ae
router.get(
  "/search-console/summary",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!gsc.isSearchConsoleConfigured()) {
        return res.json({
          success: true,
          data: null,
          configured: false,
          message:
            "Google Search Console not configured. Set GOOGLE_SERVICE_ACCOUNT_JSON and SEARCH_CONSOLE_SITE_URLS.",
        });
      }

      const days = Math.min(parseInt(req.query.days as string) || 28, 90);
      const siteUrl = gsc.resolveSiteUrl(req.query.site as string | undefined);

      const { data, cached, fetchedAt } = await gsc.getCachedSummary(
        siteUrl,
        days,
      );

      res.json({
        success: true,
        data,
        siteUrl,
        configured: true,
        cached,
        fetchedAt,
      });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/admin/search-console/queries?days=28&site=sc-domain:kidrove.in
router.get(
  "/search-console/queries",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!gsc.isSearchConsoleConfigured()) {
        return res.json({ success: true, data: [], configured: false });
      }

      const days = Math.min(parseInt(req.query.days as string) || 28, 90);
      const limit = Math.min(parseInt(req.query.limit as string) || 25, 100);
      const siteUrl = gsc.resolveSiteUrl(req.query.site as string | undefined);

      const { data, cached, fetchedAt } = await gsc.getCachedQueries(
        siteUrl,
        days,
        limit,
      );

      res.json({
        success: true,
        data,
        siteUrl,
        configured: true,
        cached,
        fetchedAt,
      });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/admin/search-console/pages?days=28&site=sc-domain:kidrove.com
router.get(
  "/search-console/pages",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!gsc.isSearchConsoleConfigured()) {
        return res.json({ success: true, data: null, configured: false });
      }

      const days = Math.min(parseInt(req.query.days as string) || 28, 90);
      const siteUrl = gsc.resolveSiteUrl(req.query.site as string | undefined);

      const { data, cached, fetchedAt } = await gsc.getCachedPages(
        siteUrl,
        days,
      );

      res.json({
        success: true,
        data,
        siteUrl,
        configured: true,
        cached,
        fetchedAt,
      });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/admin/search-console/sync?site=sc-domain:kidrove.ae — force a live
// refetch from Google, bypassing the 6h cache, and persist it durably.
// Omit `site` to sync every configured property in one call (used by both the
// manual "Sync Now" button and the monthly scheduled job).
router.post(
  "/search-console/sync",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!gsc.isSearchConsoleConfigured()) {
        return res.status(400).json({
          success: false,
          message:
            "Google Search Console not configured. Set GOOGLE_SERVICE_ACCOUNT_JSON and SEARCH_CONSOLE_SITE_URLS.",
        });
      }

      const requestedSite = req.query.site as string | undefined;

      if (requestedSite) {
        const siteUrl = gsc.resolveSiteUrl(requestedSite);
        const result = await gsc.syncSite(siteUrl, "manual");
        return res.json({
          success: true,
          message: `Synced ${siteUrl}`,
          data: [{ siteUrl, success: true, result }],
        });
      }

      const results = await gsc.syncAllConfiguredSites("manual");
      const failedCount = results.filter((r) => !r.success).length;

      res.json({
        success: failedCount === 0,
        message: `Synced ${results.length - failedCount}/${results.length} site(s)`,
        data: results,
      });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/admin/search-console/history?site=...&months=12 — durable monthly
// records, independent of the rolling cache (useful for trend views that
// outlive the 6h snapshot TTL).
router.get(
  "/search-console/history",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const siteUrl = gsc.resolveSiteUrl(req.query.site as string | undefined);
      const months = Math.min(parseInt(req.query.months as string) || 12, 24);

      const history = await SearchConsoleHistory.find({ siteUrl })
        .sort({ period: -1 })
        .limit(months)
        .lean();

      res.json({ success: true, siteUrl, data: history.reverse() });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
