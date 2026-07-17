import mongoose, { Document, Schema, Types } from "mongoose";

export interface IGoogleReview extends Document {
  eventId: Types.ObjectId;
  googlePlaceId: string;
  reviewId: string; // Google review name or stable fallback hash
  rawReviewName?: string; // original "places/{id}/reviews/{rid}" value from Google

  // Review content
  author_name: string;
  author_url?: string;
  profile_photo_url?: string;
  language: string;
  rating: number;
  text: string;
  relative_time_description: string;
  time: number; // unix secs

  // Source / audit
  source: string;
  firstSyncedAt: Date;
  lastSyncedAt: Date;
  lastSeenAt: Date;
  missingFromLatestSync: boolean;

  // Moderation
  isVisible: boolean;
  hiddenReason?: string;
  hiddenBy?: Types.ObjectId;
  hiddenAt?: Date;
}

const googleReviewSchema = new Schema<IGoogleReview>(
  {
    eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true },
    googlePlaceId: { type: String, required: true },
    reviewId: { type: String, required: true },
    rawReviewName: { type: String },

    author_name: { type: String, required: true },
    author_url: { type: String },
    profile_photo_url: { type: String },
    language: { type: String, default: "en" },
    rating: { type: Number, required: true, min: 1, max: 5 },
    text: { type: String, default: "" },
    relative_time_description: { type: String, default: "" },
    time: { type: Number, default: 0 },

    source: { type: String, default: "google" },
    firstSyncedAt: { type: Date, required: true },
    lastSyncedAt: { type: Date, required: true },
    lastSeenAt: { type: Date, required: true },
    missingFromLatestSync: { type: Boolean, default: false },

    isVisible: { type: Boolean, default: true },
    hiddenReason: { type: String },
    hiddenBy: { type: Schema.Types.ObjectId, ref: "User" },
    hiddenAt: { type: Date },
  },
  {
    timestamps: false,
    collection: "googlereviews",
  },
);

// Idempotent upserts — one review per event
googleReviewSchema.index({ eventId: 1, reviewId: 1 }, { unique: true });
// Event admin/public reads
googleReviewSchema.index({ eventId: 1, isVisible: 1, time: -1 });
// Homepage carousel
googleReviewSchema.index({ isVisible: 1, rating: -1, time: -1 });
// Mark missing reviews efficiently
googleReviewSchema.index({ eventId: 1, reviewId: 1 });

export default mongoose.model<IGoogleReview>(
  "GoogleReview",
  googleReviewSchema,
);
