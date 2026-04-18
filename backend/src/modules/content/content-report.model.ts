import mongoose, { Document, Schema, model } from "mongoose";

export interface IContentReport extends Document {
  contentType: "comment" | "blog" | "event" | "review";
  contentId: mongoose.Types.ObjectId;
  reportedBy: mongoose.Types.ObjectId;
  reason: string;
  description?: string;
  status: "pending" | "reviewed" | "dismissed";
  createdAt: Date;
  updatedAt: Date;
}

const contentReportSchema = new Schema<IContentReport>(
  {
    contentType: {
      type: String,
      enum: ["comment", "blog", "event", "review"],
      required: true,
    },
    contentId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    reportedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reason: {
      type: String,
      required: true,
      maxlength: 500,
    },
    description: {
      type: String,
      maxlength: 2000,
    },
    status: {
      type: String,
      enum: ["pending", "reviewed", "dismissed"],
      default: "pending",
    },
  },
  { timestamps: true },
);

contentReportSchema.index({ contentType: 1, contentId: 1 });
contentReportSchema.index({ reportedBy: 1 });
contentReportSchema.index({ status: 1 });

export const ContentReport = model<IContentReport>("ContentReport", contentReportSchema);
export default ContentReport;
