import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import PageView from '../models/PageView';
import { createCustomLimiter } from '../middleware/rateLimiter';
import { OWN_HOST, classifyChannel, parseAttribution, parseUserAgent, str } from '../utils/channel';

const router = Router();

const trackLimiter = createCustomLimiter({
  windowMs: 60 * 1000,
  max: 120,
  keyPrefix: 'pageview-track',
});

const MAX_ENGAGEMENT_MS = 30 * 60 * 1000;

// POST /api/track/pageview  — no auth required, fire-and-forget
router.post('/pageview', trackLimiter, (req: Request, res: Response) => {
  // Respond immediately — never block user on analytics write
  res.status(204).end();

  const path = str(req.body?.path, 500);
  if (!path) return;

  const ua = String(req.headers['user-agent'] || '').slice(0, 500);
  const { device, browser, os } = parseUserAgent(ua);
  // Skip bots
  if (device === 'bot') return;

  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
    || req.ip
    || req.socket.remoteAddress
    || '';
  const ipHash = ip
    ? crypto.createHash('sha256').update(`${process.env.ANALYTICS_IP_SALT || ''}${ip}`).digest('hex')
    : null;
  // Only set when the host/CDN in front of us provides it; no GeoIP lookup.
  const country = str(req.headers['cf-ipcountry'] || req.headers['x-vercel-ip-country'], 2)?.toUpperCase() || null;

  const attr = parseAttribution(req.body?.attribution);
  const referrer = str(req.body?.referrer, 500) ?? null;

  PageView.create({
    path,
    referrer,
    userAgent: ua || null,
    ipHash,
    country,
    device,
    browser,
    os,
    sessionId: str(req.body?.sessionId, 100) ?? null,
    visitorId: str(req.body?.visitorId, 100) ?? null,
    isNewVisitor: req.body?.isNewVisitor === true,
    channel: classifyChannel({ ...attr, referrer: attr.referrer ?? referrer ?? undefined }, OWN_HOST),
    utmSource: attr.utmSource ?? null,
    utmMedium: attr.utmMedium ?? null,
    utmCampaign: attr.utmCampaign ?? null,
    timestamp: new Date(),
  }).catch(() => {
    // silent — never surface analytics errors to user
  });
});

// POST /api/track/engagement — visible time on a page, sent via sendBeacon on hide.
// sendBeacon posts text/plain, so the body may arrive as a raw string.
router.post('/engagement', trackLimiter, (req: Request, res: Response) => {
  res.status(204).end();

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { return; }
  }
  const sessionId = str(body?.sessionId, 100);
  const path = str(body?.path, 500);
  const ms = Number(body?.ms);
  if (!sessionId || !path || !Number.isFinite(ms) || ms <= 0) return;

  PageView.findOneAndUpdate(
    { sessionId, path },
    [{ $set: { engagementMs: { $min: [{ $add: ['$engagementMs', Math.round(ms)] }, MAX_ENGAGEMENT_MS] } } }],
    { sort: { timestamp: -1 } },
  ).catch(() => {});
});

export default router;
