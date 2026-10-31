import { Schema, model, Document } from "mongoose";

export interface ICount {
  key: string;
  n: number;
}

/**
 * Pre-aggregated traffic totals. PageView / AnalyticsEvent are raw and expire
 * after 90 days; these rows don't, so month-over-month and year views keep
 * working. Written only by services/analyticsRollup.service.ts.
 */
export interface IAnalyticsDaily extends Document {
  period: "day" | "month";
  start: Date;
  views: number;
  visitors: number;
  sessions: number;
  newVisitors: number;
  engagementMs: number;
  byChannel: ICount[];
  byDevice: ICount[];
  byBrowser: ICount[];
  byOs: ICount[];
  byCountry: ICount[];
  topPaths: ICount[];
  events: ICount[];
  topSearches: ICount[];
  zeroResultSearches: ICount[];
  registrations: number;
  registrationsByChannel: ICount[];
  computedAt: Date;
}

const count = [{ _id: false, key: String, n: Number }];

const AnalyticsDailySchema = new Schema<IAnalyticsDaily>({
  period: { type: String, enum: ["day", "month"], required: true },
  start: { type: Date, required: true },
  views: { type: Number, default: 0 },
  visitors: { type: Number, default: 0 },
  sessions: { type: Number, default: 0 },
  newVisitors: { type: Number, default: 0 },
  engagementMs: { type: Number, default: 0 },
  byChannel: count,
  byDevice: count,
  byBrowser: count,
  byOs: count,
  byCountry: count,
  topPaths: count,
  events: count,
  topSearches: count,
  zeroResultSearches: count,
  registrations: { type: Number, default: 0 },
  registrationsByChannel: count,
  computedAt: { type: Date, default: Date.now },
});

AnalyticsDailySchema.index({ period: 1, start: 1 }, { unique: true });

export default model<IAnalyticsDaily>("AnalyticsDaily", AnalyticsDailySchema);
