import { Schema, model, Document, Types } from "mongoose";

export type AnalyticsEventType =
  | "eventViewed"
  | "similarEventClicked"
  | "recentlyViewedClicked";

export type AnalyticsEventSection =
  | "similar"
  | "organizer"
  | "recentlyViewed"
  | "trending";

export interface IAnalyticsEvent extends Document {
  type: AnalyticsEventType;
  eventId: Types.ObjectId;
  sourceEventId?: Types.ObjectId;
  userId?: Types.ObjectId;
  sessionId?: string;
  section?: AnalyticsEventSection;
  position?: number;
  createdAt: Date;
}

const AnalyticsEventSchema = new Schema<IAnalyticsEvent>(
  {
    type: {
      type: String,
      enum: ["eventViewed", "similarEventClicked", "recentlyViewedClicked"],
      required: true,
    },
    eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true },
    sourceEventId: { type: Schema.Types.ObjectId, ref: "Event" },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    sessionId: { type: String, maxlength: 100 },
    section: {
      type: String,
      enum: ["similar", "organizer", "recentlyViewed", "trending"],
    },
    position: { type: Number },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

AnalyticsEventSchema.index({ type: 1, eventId: 1, createdAt: -1 });
AnalyticsEventSchema.index({ sessionId: 1, createdAt: -1 });

const AnalyticsEvent = model<IAnalyticsEvent>(
  "AnalyticsEvent",
  AnalyticsEventSchema,
);

export default AnalyticsEvent;
