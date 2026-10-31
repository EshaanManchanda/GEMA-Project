import { Schema, model, Document, Types } from "mongoose";

/** Types that are about one event listing and therefore require `eventId`. */
export const EVENT_SCOPED_TYPES = [
  "eventViewed",
  "similarEventClicked",
  "recentlyViewedClicked",
  "bookingClicked",
  "favouriteAdded",
  "eventShared",
  "organiserProfileClicked",
] as const;

export const ANALYTICS_EVENT_TYPES = [
  ...EVENT_SCOPED_TYPES,
  "searchPerformed",
  "filterApplied",
  "blogViewed",
  "blogShared",
  "registrationCompleted",
  "loginCompleted",
] as const;

export type AnalyticsEventType = (typeof ANALYTICS_EVENT_TYPES)[number];

export type AnalyticsEventSection =
  | "similar"
  | "organizer"
  | "recentlyViewed"
  | "trending";

/** Small, type-specific detail. Every field is validated by the controller. */
export interface IAnalyticsEventMeta {
  query?: string;
  resultCount?: number;
  filters?: Record<string, string>;
  platform?: string;
  method?: string;
}

export interface IAnalyticsEvent extends Document {
  type: AnalyticsEventType;
  eventId?: Types.ObjectId;
  blogId?: Types.ObjectId;
  sourceEventId?: Types.ObjectId;
  userId?: Types.ObjectId;
  sessionId?: string;
  visitorId?: string;
  section?: AnalyticsEventSection;
  position?: number;
  meta?: IAnalyticsEventMeta;
  createdAt: Date;
}

const AnalyticsEventSchema = new Schema<IAnalyticsEvent>(
  {
    type: {
      type: String,
      enum: ANALYTICS_EVENT_TYPES,
      required: true,
    },
    eventId: { type: Schema.Types.ObjectId, ref: "Event" },
    blogId: { type: Schema.Types.ObjectId, ref: "Blog" },
    sourceEventId: { type: Schema.Types.ObjectId, ref: "Event" },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    sessionId: { type: String, maxlength: 100 },
    visitorId: { type: String, maxlength: 100 },
    section: {
      type: String,
      enum: ["similar", "organizer", "recentlyViewed", "trending"],
    },
    position: { type: Number },
    meta: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

AnalyticsEventSchema.index({ type: 1, eventId: 1, createdAt: -1 });
AnalyticsEventSchema.index({ sessionId: 1, createdAt: -1 });
AnalyticsEventSchema.index({ type: 1, createdAt: -1 });

const AnalyticsEvent = model<IAnalyticsEvent>(
  "AnalyticsEvent",
  AnalyticsEventSchema,
);

export default AnalyticsEvent;
