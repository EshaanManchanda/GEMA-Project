import mongoose, { Schema, Document } from "mongoose";

export interface IAffiliateEventClick extends Document {
  eventId: mongoose.Types.ObjectId;
  sessionId: string;
  ipAddress?: string;
  userAgent?: string;
  deviceType?: "desktop" | "mobile" | "tablet" | "unknown";
  referrer?: string;
  country?: string;
  city?: string;
  clickedAt: Date;
  userId?: mongoose.Types.ObjectId; // If user is logged in
}

const affiliateEventClickSchema = new Schema<IAffiliateEventClick>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: [true, "Event ID is required"],
    },
    sessionId: {
      type: String,
      required: [true, "Session ID is required"],
      trim: true,
    },
    ipAddress: {
      type: String,
      trim: true,
    },
    userAgent: {
      type: String,
      trim: true,
    },
    deviceType: {
      type: String,
      enum: {
        values: ["desktop", "mobile", "tablet", "unknown"],
        message: "Device type must be desktop, mobile, tablet, or unknown",
      },
      default: "unknown",
    },
    referrer: {
      type: String,
      trim: true,
    },
    country: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    clickedAt: {
      type: Date,
      default: Date.now,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret: any) {
        delete ret.__v;
        return ret;
      },
    },
  },
);

// Compound indexes for analytics queries
affiliateEventClickSchema.index({ eventId: 1, clickedAt: -1 }); // For event-specific click history
affiliateEventClickSchema.index({ eventId: 1, sessionId: 1 }); // For unique click tracking
affiliateEventClickSchema.index({ eventId: 1, deviceType: 1 }); // For device analytics
affiliateEventClickSchema.index({ eventId: 1, country: 1 }); // For geographic analytics
affiliateEventClickSchema.index({ clickedAt: -1 }); // For global analytics

// TTL index - auto-delete clicks older than 90 days (optional - remove if you want to keep all data)
affiliateEventClickSchema.index(
  { clickedAt: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60 },
);

const AffiliateEventClick = mongoose.model<IAffiliateEventClick>(
  "AffiliateEventClick",
  affiliateEventClickSchema,
);

export default AffiliateEventClick;
