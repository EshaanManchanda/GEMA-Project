import mongoose, { Schema, Document } from "mongoose";

/**
 * Unified delivery ledger for every outbound communication (WhatsApp, email
 * marketing sync/campaign, and — via retry_log — anything the communication
 * worker retries). This is the single place to look up "did this message go
 * out, and what happened to it."
 */

export enum CommunicationChannel {
  WHATSAPP = "whatsapp",
  EMAIL = "email",
  EMAIL_MARKETING = "email_marketing",
  SMS = "sms",
}

export enum CommunicationCategory {
  OTP = "otp",
  TRANSACTIONAL = "transactional",
  MARKETING = "marketing",
  ADMIN_ALERT = "admin_alert",
}

export enum CommunicationStatus {
  QUEUED = "queued",
  SENT = "sent",
  DELIVERED = "delivered",
  READ = "read",
  FAILED = "failed",
  BOUNCED = "bounced",
  UNSUBSCRIBED = "unsubscribed",
  EXPIRED = "expired",
}

/** Safe-by-default summary — never contains raw payloads or message bodies. */
export interface ISafeProviderSummary {
  providerMessageId?: string;
  status?: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface ICommunicationLog extends Document {
  channel: CommunicationChannel;
  provider: string;
  category: CommunicationCategory;

  userId?: mongoose.Types.ObjectId;
  eventId?: mongoose.Types.ObjectId;
  bookingId?: mongoose.Types.ObjectId;
  orderId?: mongoose.Types.ObjectId;
  certificateId?: mongoose.Types.ObjectId;

  recipientEmail?: string;
  recipientPhone?: string;

  templateKey?: string;
  providerTemplateName?: string;
  /** Rendered message text at send time — for admin audit/preview, not re-sending. */
  templateSnapshot?: string;
  /** Original template variables — needed to actually re-send on retry. */
  vars?: Record<string, any>;
  campaignId?: string;

  status: CommunicationStatus;
  providerMessageId?: string;
  /** Always populated. Full provider payloads are opt-in via env gate. */
  safeProviderSummary?: ISafeProviderSummary;
  /** Raw provider response — only stored when COMMUNICATION_LOG_RAW_PROVIDER_RESPONSE=true. */
  providerResponse?: any;
  errorCode?: string;
  errorMessage?: string;

  /**
   * Dedupe key, e.g. `${templateKey}:${bookingId}:${recipientPhone}`.
   * Dispatch upserts on this so retries/duplicate triggers/scheduled
   * reminders can never send the same message twice.
   */
  idempotencyKey?: string;
  retryCount: number;
  nextRetryAt?: Date;

  queuedAt?: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  failedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const safeProviderSummarySchema = new Schema<ISafeProviderSummary>(
  {
    providerMessageId: String,
    status: String,
    errorCode: String,
    errorMessage: String,
  },
  { _id: false },
);

const communicationLogSchema = new Schema<ICommunicationLog>(
  {
    channel: {
      type: String,
      enum: Object.values(CommunicationChannel),
      required: true,
    },
    provider: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: Object.values(CommunicationCategory),
      required: true,
    },

    userId: { type: Schema.Types.ObjectId, ref: "User" },
    eventId: { type: Schema.Types.ObjectId, ref: "Event" },
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking" },
    orderId: { type: Schema.Types.ObjectId, ref: "Order" },
    certificateId: { type: Schema.Types.ObjectId, ref: "Certificate" },

    recipientEmail: { type: String, trim: true, lowercase: true },
    recipientPhone: { type: String, trim: true },

    templateKey: { type: String, index: true },
    providerTemplateName: String,
    templateSnapshot: String,
    vars: Schema.Types.Mixed,
    campaignId: String,

    status: {
      type: String,
      enum: Object.values(CommunicationStatus),
      default: CommunicationStatus.QUEUED,
      required: true,
    },
    providerMessageId: String,
    safeProviderSummary: safeProviderSummarySchema,
    providerResponse: Schema.Types.Mixed,
    errorCode: String,
    errorMessage: String,

    idempotencyKey: { type: String },
    retryCount: { type: Number, default: 0 },
    nextRetryAt: Date,

    queuedAt: { type: Date, default: Date.now },
    sentAt: Date,
    deliveredAt: Date,
    readAt: Date,
    failedAt: Date,
  },
  { timestamps: true },
);

communicationLogSchema.index(
  { idempotencyKey: 1 },
  { unique: true, sparse: true },
);
communicationLogSchema.index({ userId: 1, createdAt: -1 });
communicationLogSchema.index({ providerMessageId: 1 });
communicationLogSchema.index({ channel: 1, status: 1, createdAt: -1 });
communicationLogSchema.index({ eventId: 1, channel: 1 });
communicationLogSchema.index({ category: 1, status: 1 });

export default mongoose.model<ICommunicationLog>(
  "CommunicationLog",
  communicationLogSchema,
);
