import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import PageView, { IPageView } from '../models/PageView';

const router = Router();

const detectDevice = (ua: string): IPageView['device'] => {
  if (!ua) return 'unknown';
  if (/bot|crawl|spider|slurp|headless/i.test(ua)) return 'bot';
  if (/mobile|android|iphone/i.test(ua)) return 'mobile';
  if (/tablet|ipad/i.test(ua)) return 'tablet';
  return 'desktop';
};

// POST /api/track/pageview  — no auth required, fire-and-forget
router.post('/pageview', (req: Request, res: Response) => {
  // Respond immediately — never block user on analytics write
  res.status(204).end();

  const { path, referrer, sessionId } = req.body;
  if (!path || typeof path !== 'string') return;

  const ua = req.headers['user-agent'] || null;
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
    || req.ip
    || req.socket.remoteAddress
    || '';
  const ipHash = ip ? crypto.createHash('sha256').update(ip).digest('hex') : null;

  // Skip bots
  if (ua && detectDevice(ua) === 'bot') return;

  PageView.create({
    path: path.substring(0, 500),
    referrer: typeof referrer === 'string' ? referrer.substring(0, 500) : null,
    userAgent: ua,
    ipHash,
    device: detectDevice(ua || ''),
    sessionId: typeof sessionId === 'string' ? sessionId : null,
    timestamp: new Date(),
  }).catch(() => {
    // silent — never surface analytics errors to user
  });
});

export default router;
