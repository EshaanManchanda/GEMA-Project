import mongoose, { Schema, Document } from "mongoose";

export interface IAffiliateVenueClick extends Document {
  venueId: mongoose.Types.ObjectId;
  sessionId: string;
  ipAddress?: string;
  userAgent?: string;
  deviceType?: "desktop" | "mobile" | "tablet" | "unknown";
  referrer?: string;
  country?: string;
  city?: string;
  clickedAt: Date;
  userId?: mongoose.Types.ObjectId;
}

const affiliateVenueClickSchema = new Schema<IAffiliateVenueClick>(
  {
    venueId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: [true, "Venue ID is required"],
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

affiliateVenueClickSchema.index({ venueId: 1, clickedAt: -1 });
affiliateVenueClickSchema.index({ venueId: 1, sessionId: 1 });
affiliateVenueClickSchema.index({ venueId: 1, deviceType: 1 });
affiliateVenueClickSchema.index({ venueId: 1, country: 1 });
affiliateVenueClickSchema.index({ clickedAt: -1 });

affiliateVenueClickSchema.index(
  { clickedAt: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60 },
);

const AffiliateVenueClick = mongoose.model<IAffiliateVenueClick>(
  "AffiliateVenueClick",
  affiliateVenueClickSchema,
);

export default AffiliateVenueClick;
