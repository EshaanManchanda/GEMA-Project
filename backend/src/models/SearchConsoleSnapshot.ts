import mongoose, { Document, Schema } from 'mongoose';

export type SearchConsoleSnapshotType = 'summary' | 'queries' | 'pages';

export interface ISearchConsoleSnapshot extends Document {
  siteUrl: string;
  type: SearchConsoleSnapshotType;
  days: number;
  limit: number;
  data: unknown;
  fetchedAt: Date;
}

const SearchConsoleSnapshotSchema = new Schema<ISearchConsoleSnapshot>({
  siteUrl:   { type: String, required: true },
  type:      { type: String, enum: ['summary', 'queries', 'pages'], required: true },
  days:      { type: Number, required: true },
  limit:     { type: Number, default: 0 },
  data:      { type: Schema.Types.Mixed, required: true },
  fetchedAt: { type: Date, required: true, default: Date.now },
}, { timestamps: false });

// One cached document per (site, report type, day range, limit) combination
SearchConsoleSnapshotSchema.index({ siteUrl: 1, type: 1, days: 1, limit: 1 }, { unique: true });

export default mongoose.model<ISearchConsoleSnapshot>('SearchConsoleSnapshot', SearchConsoleSnapshotSchema);
