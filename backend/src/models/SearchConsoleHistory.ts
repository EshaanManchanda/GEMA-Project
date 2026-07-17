import mongoose, { Document, Schema } from "mongoose";

export interface ISearchConsoleMetricRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface ISearchConsoleHistory extends Document {
  siteUrl: string;
  period: string; // "YYYY-MM" — one durable record per site per calendar month
  periodStart: Date;
  periodEnd: Date;
  summary: {
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  };
  topQueries: ISearchConsoleMetricRow[];
  topPages: ISearchConsoleMetricRow[];
  syncType: "manual" | "scheduled";
  syncedAt: Date;
}

const MetricRowSchema = new Schema<ISearchConsoleMetricRow>(
  {
    keys: [{ type: String }],
    clicks: { type: Number, default: 0 },
    impressions: { type: Number, default: 0 },
    ctr: { type: Number, default: 0 },
    position: { type: Number, default: 0 },
  },
  { _id: false },
);

const SearchConsoleHistorySchema = new Schema<ISearchConsoleHistory>(
  {
    siteUrl: { type: String, required: true },
    period: { type: String, required: true },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    summary: {
      clicks: { type: Number, default: 0 },
      impressions: { type: Number, default: 0 },
      ctr: { type: Number, default: 0 },
      position: { type: Number, default: 0 },
    },
    topQueries: [MetricRowSchema],
    topPages: [MetricRowSchema],
    syncType: { type: String, enum: ["manual", "scheduled"], required: true },
    syncedAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: false },
);

// One durable record per (site, calendar month) — re-syncing the same month updates it in place
SearchConsoleHistorySchema.index({ siteUrl: 1, period: 1 }, { unique: true });

export default mongoose.model<ISearchConsoleHistory>(
  "SearchConsoleHistory",
  SearchConsoleHistorySchema,
);
