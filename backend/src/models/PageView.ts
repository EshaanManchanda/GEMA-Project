import mongoose, { Document, Schema } from 'mongoose';

export interface IPageView extends Document {
  path: string;
  referrer: string | null;
  userAgent: string | null;
  ipHash: string | null;
  country: string | null;
  device: 'mobile' | 'tablet' | 'desktop' | 'bot' | 'unknown';
  sessionId: string | null;
  timestamp: Date;
}

const PageViewSchema = new Schema<IPageView>({
  path:      { type: String, required: true, index: true },
  referrer:  { type: String, default: null },
  userAgent: { type: String, default: null },
  ipHash:    { type: String, default: null },
  country:   { type: String, default: null },
  device:    { type: String, enum: ['mobile', 'tablet', 'desktop', 'bot', 'unknown'], default: 'unknown' },
  sessionId: { type: String, default: null },
  timestamp: { type: Date, default: Date.now, index: true },
}, { timestamps: false });

// TTL index — auto-delete records older than 90 days
PageViewSchema.index({ timestamp: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });
// Compound index for common query pattern
PageViewSchema.index({ path: 1, timestamp: -1 });

export default mongoose.model<IPageView>('PageView', PageViewSchema);
