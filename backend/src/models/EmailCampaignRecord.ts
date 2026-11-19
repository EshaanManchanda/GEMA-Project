import mongoose, { Document, Schema, Model } from "mongoose";

export type CampaignPurpose =
  | "blog_digest"
  | "event_spotlight"
  | "competition_announcement"
  | "custom_broadcast";

export type TargetAudience =
  | "newsletter_all" // Tag: newsletter
  | "customers_parents" // Role: parent / has order
  | "teachers" // Role: teacher
  | "vendors" // Role: vendor
  | "all_consented"; // All users + subscribers with marketing consent

export interface IEmailCampaignRecord extends Document {
  title: string;
  subject: string;
  preheader?: string;
  campaignType: CampaignPurpose;
  targetAudience: TargetAudience;
  status: "active" | "draft" | "inactive";
  autoSend: boolean;
  scheduleDay: "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";
  scheduleTime: string; // "HH:MM"

  // Blog config
  blogMode: "auto" | "manual";
  autoBlogCount: number;
  selectedBlogIds: mongoose.Types.ObjectId[];

  // Event config
  featuredEventId?: mongoose.Types.ObjectId;
  secondaryEventIds: mongoose.Types.ObjectId[];
  eventCustomMessage?: string;

  // Competition config
  selectedCompetitionSlugs: string[];
  competitionCustomMessage?: string;

  // Custom broadcast
  customBroadcast?: {
    heroTitle: string;
    heroSubtitle: string;
    bodyHtml: string;
    ctaText: string;
    ctaUrl: string;
  };

  // Execution logs
  lastSentAt?: Date;
  lastSentStatus?: "success" | "failed";
  lastSentRecipientCount?: number;
  senderCampaignId?: string;

  createdAt: Date;
  updatedAt: Date;
}

const EmailCampaignRecordSchema = new Schema<IEmailCampaignRecord>(
  {
    title: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    preheader: { type: String, default: "" },
    campaignType: {
      type: String,
      enum: ["blog_digest", "event_spotlight", "competition_announcement", "custom_broadcast"],
      default: "blog_digest",
    },
    targetAudience: {
      type: String,
      enum: ["newsletter_all", "customers_parents", "teachers", "vendors", "all_consented"],
      default: "newsletter_all",
    },
    status: {
      type: String,
      enum: ["active", "draft", "inactive"],
      default: "draft",
    },
    autoSend: { type: Boolean, default: false },
    scheduleDay: {
      type: String,
      enum: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
      default: "friday",
    },
    scheduleTime: { type: String, default: "10:00" },
    blogMode: { type: String, enum: ["auto", "manual"], default: "auto" },
    autoBlogCount: { type: Number, default: 6 },
    selectedBlogIds: [{ type: Schema.Types.ObjectId, ref: "Blog" }],
    featuredEventId: { type: Schema.Types.ObjectId, ref: "Event" },
    secondaryEventIds: [{ type: Schema.Types.ObjectId, ref: "Event" }],
    eventCustomMessage: { type: String, default: "" },
    selectedCompetitionSlugs: [{ type: String }],
    competitionCustomMessage: { type: String, default: "" },
    customBroadcast: {
      heroTitle: { type: String, default: "" },
      heroSubtitle: { type: String, default: "" },
      bodyHtml: { type: String, default: "" },
      ctaText: { type: String, default: "" },
      ctaUrl: { type: String, default: "" },
    },
    lastSentAt: { type: Date },
    lastSentStatus: { type: String, enum: ["success", "failed"] },
    lastSentRecipientCount: { type: Number, default: 0 },
    senderCampaignId: { type: String },
  },
  { timestamps: true, collection: "email_campaign_records" },
);

const EmailCampaignRecord = mongoose.model<IEmailCampaignRecord>(
  "EmailCampaignRecord",
  EmailCampaignRecordSchema,
);

export default EmailCampaignRecord;
