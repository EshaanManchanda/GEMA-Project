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

export interface IEmailDigestSettings extends Document {
  // Campaign & Scheduling
  status: "active" | "draft" | "inactive";
  campaignType: CampaignPurpose;
  targetAudience: TargetAudience;
  autoSend: boolean;
  scheduleDay: "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";
  scheduleTime: string; // "HH:MM" e.g. "10:00"
  subject: string;
  preheader: string;

  // Blog Digest Config (used when campaignType === 'blog_digest')
  blogMode: "auto" | "manual";
  autoBlogCount: number; // 4, 6, 8
  selectedBlogIds: mongoose.Types.ObjectId[];

  // Event / Camp Spotlight Config (used when campaignType === 'event_spotlight')
  featuredEventId?: mongoose.Types.ObjectId;
  secondaryEventIds: mongoose.Types.ObjectId[];
  eventCustomMessage?: string;

  // Competition Config (used when campaignType === 'competition_announcement')
  selectedCompetitionSlugs: string[];
  competitionCustomMessage?: string;

  // Free-form Broadcast Config (used when campaignType === 'custom_broadcast')
  customBroadcast: {
    heroTitle: string;
    heroSubtitle: string;
    bodyHtml: string;
    ctaText: string;
    ctaUrl: string;
  };

  // Delivery Tracking
  lastSentAt?: Date;
  lastSentStatus?: "success" | "failed";
  lastSentRecipientCount?: number;
  lastSentCampaignType?: string;
  updatedAt: Date;
  createdAt: Date;
}

export interface IEmailDigestSettingsModel extends Model<IEmailDigestSettings> {
  getSettings(): Promise<IEmailDigestSettings>;
}

const EmailDigestSettingsSchema = new Schema<IEmailDigestSettings>(
  {
    status: {
      type: String,
      enum: ["active", "draft", "inactive"],
      default: "draft",
    },
    campaignType: {
      type: String,
      enum: [
        "blog_digest",
        "event_spotlight",
        "competition_announcement",
        "custom_broadcast",
      ],
      default: "blog_digest",
    },
    targetAudience: {
      type: String,
      enum: [
        "newsletter_all",
        "customers_parents",
        "teachers",
        "vendors",
        "all_consented",
      ],
      default: "newsletter_all",
    },
    autoSend: {
      type: Boolean,
      default: false,
    },
    scheduleDay: {
      type: String,
      enum: [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
      ],
      default: "friday",
    },
    scheduleTime: {
      type: String,
      default: "10:00",
    },
    subject: {
      type: String,
      default: "✨ Kidrove Weekly: Latest Stories & Activities",
      trim: true,
    },
    preheader: {
      type: String,
      default: "Discover fresh articles, competitions, and activities on Kidrove",
      trim: true,
    },
    blogMode: {
      type: String,
      enum: ["auto", "manual"],
      default: "auto",
    },
    autoBlogCount: {
      type: Number,
      default: 6,
      min: 1,
      max: 12,
    },
    selectedBlogIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "Blog",
      },
    ],
    featuredEventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
    },
    secondaryEventIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "Event",
      },
    ],
    eventCustomMessage: {
      type: String,
      default: "",
    },
    selectedCompetitionSlugs: [
      {
        type: String,
      },
    ],
    competitionCustomMessage: {
      type: String,
      default: "",
    },
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
    lastSentCampaignType: { type: String },
  },
  { timestamps: true, collection: "email_digest_settings" },
);

EmailDigestSettingsSchema.statics.getSettings = async function () {
  return (await this.findOne()) ?? (await this.create({}));
};

const EmailDigestSettings = mongoose.model<
  IEmailDigestSettings,
  IEmailDigestSettingsModel
>("EmailDigestSettings", EmailDigestSettingsSchema);

export default EmailDigestSettings;
