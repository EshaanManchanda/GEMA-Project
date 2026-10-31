import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import AnalyticsEvent, {
  ANALYTICS_EVENT_TYPES,
  EVENT_SCOPED_TYPES,
  IAnalyticsEventMeta,
} from "../models/AnalyticsEvent";
import { AuthRequest } from "../types/index";
import { str } from "../utils/channel";

const VALID_SECTIONS = ["similar", "organizer", "recentlyViewed", "trending"];

const isType = <T extends readonly string[]>(list: T, v: unknown): v is T[number] =>
  typeof v === "string" && (list as readonly string[]).includes(v);

/** Keep only the known meta fields, as short strings / bounded numbers. */
const parseMeta = (raw: unknown): IAnalyticsEventMeta | undefined => {
  if (!raw || typeof raw !== "object") return undefined;
  const m = raw as Record<string, unknown>;
  const meta: IAnalyticsEventMeta = {
    query: str(m.query, 100)?.toLowerCase(),
    platform: str(m.platform, 30),
    method: str(m.method, 30),
  };
  const n = Number(m.resultCount);
  if (m.resultCount !== undefined && Number.isFinite(n) && n >= 0) {
    meta.resultCount = Math.min(Math.floor(n), 1_000_000);
  }
  if (m.filters && typeof m.filters === "object") {
    const filters: Record<string, string> = {};
    for (const [k, v] of Object.entries(m.filters).slice(0, 10)) {
      const key = str(k, 30);
      const val = str(typeof v === "number" ? String(v) : v, 60);
      if (key && /^[\w-]+$/.test(key) && val) filters[key] = val;
    }
    if (Object.keys(filters).length) meta.filters = filters;
  }
  const clean = Object.fromEntries(
    Object.entries(meta).filter(([, v]) => v !== undefined),
  );
  return Object.keys(clean).length ? (clean as IAnalyticsEventMeta) : undefined;
};

// @route   POST /api/analytics/track
// @access  Public (fire-and-forget UX telemetry; auth optional)
export const trackAnalyticsEvent = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { type, eventId, blogId, sourceEventId, sessionId, visitorId, section, position, meta } =
      req.body;

    if (!isType(ANALYTICS_EVENT_TYPES, type)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid event type" });
    }
    const needsEvent = isType(EVENT_SCOPED_TYPES, type);
    if (
      (needsEvent || eventId !== undefined) &&
      !mongoose.Types.ObjectId.isValid(eventId)
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid eventId" });
    }
    if (blogId !== undefined && !mongoose.Types.ObjectId.isValid(blogId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid blogId" });
    }
    if (sourceEventId && !mongoose.Types.ObjectId.isValid(sourceEventId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid sourceEventId" });
    }
    if (section && !VALID_SECTIONS.includes(section)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid section" });
    }

    const userId = (req as AuthRequest).user?._id;

    await AnalyticsEvent.create({
      type,
      eventId: eventId || undefined,
      blogId: blogId || undefined,
      sourceEventId: sourceEventId || undefined,
      userId: userId || undefined,
      sessionId: str(sessionId, 100),
      visitorId: str(visitorId, 100),
      section: section || undefined,
      position: typeof position === "number" ? position : undefined,
      meta: parseMeta(meta),
    });

    // Fire-and-forget: 204 keeps the response tiny, no payload to parse client-side.
    res.status(204).end();
  } catch (error) {
    next(error);
  }
};
