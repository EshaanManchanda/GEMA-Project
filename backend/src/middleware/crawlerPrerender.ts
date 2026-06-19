import { Request, Response, NextFunction } from "express";
import { redisClient } from "../config/redis";
import logger from "../config/logger";

const AI_BOT_PATTERNS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "anthropic-ai",
  "Claude-Web",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Googlebot",
  "Bingbot",
  "Applebot",
  "CCBot",
  "FacebookBot",
  "Twitterbot",
  "LinkedInBot",
  "Slackbot",
  "cohere-ai",
  "Bytespider",
  "Applebot-Extended",
];

const BOT_REGEX = new RegExp(AI_BOT_PATTERNS.join("|"), "i");

export function isCrawler(userAgent: string | undefined): boolean {
  if (!userAgent) return false;
  return BOT_REGEX.test(userAgent);
}

const PRERENDER_ROUTES: Array<{
  pattern: RegExp;
  type: string;
  paramName: string;
}> = [
  { pattern: /^\/events\/([^/]+)$/, type: "event", paramName: "slug" },
  { pattern: /^\/collections\/([^/]+)$/, type: "collection", paramName: "id" },
  { pattern: /^\/blog\/([^/]+)$/, type: "blog", paramName: "slug" },
  { pattern: /^\/vendors\/([^/]+)$/, type: "vendor", paramName: "id" },
  { pattern: /^\/teachers\/([^/]+)$/, type: "teacher", paramName: "id" },
  { pattern: /^\/categories\/([^/]+)$/, type: "category", paramName: "slug" },
  { pattern: /^\/$/, type: "homepage", paramName: "" },
];

const CACHE_TTL: Record<string, number> = {
  event: 6 * 3600,
  collection: 12 * 3600,
  blog: 24 * 3600,
  homepage: 3600,
  vendor: 6 * 3600,
  teacher: 12 * 3600,
  category: 12 * 3600,
};

// Validate param against safe patterns to prevent cache-key flooding / stored-XSS
const SAFE_PARAM = /^[a-zA-Z0-9_-]{1,200}$/;

function isValidParam(param: string): boolean {
  if (!param) return true; // homepage has no param
  return SAFE_PARAM.test(param);
}

function getCacheKey(type: string, param: string): string {
  return param ? `prerender:${type}:${param}` : `prerender:${type}`;
}

async function getCachedHtml(key: string): Promise<string | null> {
  if (!redisClient) return null;
  try {
    return await redisClient.get(key);
  } catch {
    return null;
  }
}

async function setCachedHtml(
  key: string,
  html: string,
  ttl: number,
): Promise<void> {
  if (!redisClient) return;
  try {
    await redisClient.setex(key, ttl, html);
  } catch (err) {
    logger.warn("[Prerender] Redis cache set failed:", err);
  }
}

export async function prerenderMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const ua = req.headers["user-agent"];
  if (!isCrawler(ua)) {
    next();
    return;
  }

  const path = req.path;

  let matched: { type: string; param: string } | null = null;
  for (const route of PRERENDER_ROUTES) {
    const m = path.match(route.pattern);
    if (m) {
      matched = { type: route.type, param: m[1] || "" };
      break;
    }
  }

  if (!matched) {
    next();
    return;
  }

  // Reject attacker-crafted params to prevent cache-key flooding and stored-XSS
  if (!isValidParam(matched.param)) {
    next();
    return;
  }

  const cacheKey = getCacheKey(matched.type, matched.param);

  const cached = await getCachedHtml(cacheKey);
  if (cached) {
    logger.info(`[Prerender] Cache hit: ${matched.type}/${matched.param}`);
    res.set({
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": `public, max-age=${CACHE_TTL[matched.type] || 3600}`,
      Vary: "User-Agent",
      "X-Prerender": "hit",
    });
    res.status(200).send(cached);
    return;
  }

  try {
    const { renderCrawlerHtml } = await import("../routes/og.routes");

    const html = await renderCrawlerHtml(matched.type, matched.param);

    if (!html) {
      next();
      return;
    }

    const ttl = CACHE_TTL[matched.type] || 3600;
    await setCachedHtml(cacheKey, html, ttl);

    logger.info(`[Prerender] Rendered: ${matched.type}/${matched.param}`);
    res.set({
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": `public, max-age=${ttl}`,
      Vary: "User-Agent",
      "X-Prerender": "miss",
    });
    res.status(200).send(html);
  } catch (err) {
    logger.error(`[Prerender] Render failed for ${matched.type}/${matched.param}:`, err);
    next();
  }
}
