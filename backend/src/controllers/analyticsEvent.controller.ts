import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import AnalyticsEvent from "../models/AnalyticsEvent";
import { AuthRequest } from "../types/index";

const VALID_TYPES = [
  "eventViewed",
  "similarEventClicked",
  "recentlyViewedClicked",
];
const VALID_SECTIONS = ["similar", "organizer", "recentlyViewed", "trending"];

// @route   POST /api/analytics/track
// @access  Public (fire-and-forget UX telemetry; auth optional)
export const trackAnalyticsEvent = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { type, eventId, sourceEventId, sessionId, section, position } =
      req.body;

    if (!VALID_TYPES.includes(type)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid event type" });
    }
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid eventId" });
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
      eventId,
      sourceEventId: sourceEventId || undefined,
      userId: userId || undefined,
      sessionId:
        typeof sessionId === "string" ? sessionId.slice(0, 100) : undefined,
      section: section || undefined,
      position: typeof position === "number" ? position : undefined,
    });

    // Fire-and-forget: 204 keeps the response tiny, no payload to parse client-side.
    res.status(204).end();
  } catch (error) {
    next(error);
  }
};
