import mongoose, { Schema, Document } from "mongoose";
import {
  CommunicationChannel,
  CommunicationCategory,
} from "./CommunicationLog";

/**
 * Maps a Kidrove-internal template key to a provider template (Cunnekt
 * WhatsApp template name, or an email-marketing template), the channel it
 * goes out on, and what the dispatch orchestrator must validate before send.
 *
 * `purpose` drives the consent check in CommunicationService.dispatch():
 * otp/transactional bypass marketing consent, marketing never does.
 */

export enum NotificationTemplateKey {
  BOOKING_CONFIRMED = "booking_confirmed",
  PAYMENT_SUCCESS = "payment_success",
  PAYMENT_FAILED = "payment_failed",
  EVENT_REMINDER_24H = "event_reminder_24h",
  EVENT_REMINDER_2H = "event_reminder_2h",
  EVENT_CANCELLED = "event_cancelled",
  REFUND_PROCESSED = "refund_processed",
  CERTIFICATE_ISSUED = "certificate_issued",
  PHONE_VERIFICATION_OTP = "phone_verification_otp",
  TICKET_DELIVERY = "ticket_delivery",
  EVENT_REVIEW_REQUEST = "event_review_request",
  VENDOR_APPROVED = "vendor_approved",
  VENDOR_REJECTED = "vendor_rejected",
  PARTNER_FORM_ADMIN_ALERT = "partner_form_admin_alert",
}

export interface INotificationTemplate extends Document {
  key: NotificationTemplateKey | string;
  channel: CommunicationChannel;
  provider: string;
  /** Reuses CommunicationCategory (otp/transactional/marketing/admin_alert) so the
   * consent check in CommunicationService.dispatch() and this template's purpose
   * can never drift apart. */
  purpose: CommunicationCategory;

  providerTemplateName: string;
  languageCode: string;

  /** Variable names the caller MUST supply — dispatch fails safely if any are missing. */
  requiredVariables: string[];

  isEnabled: boolean;
  /** Whether the provider (e.g. Meta/Cunnekt) has approved this WhatsApp template. */
  isApprovedOnProvider: boolean;
  lastTestedAt?: Date;
  lastTestStatus?: "success" | "failed";

  createdAt: Date;
  updatedAt: Date;
}

const notificationTemplateSchema = new Schema<INotificationTemplate>(
  {
    key: { type: String, required: true },
    channel: {
      type: String,
      enum: Object.values(CommunicationChannel),
      required: true,
    },
    provider: { type: String, required: true },
    purpose: {
      type: String,
      enum: Object.values(CommunicationCategory),
      required: true,
    },

    providerTemplateName: { type: String, required: true },
    languageCode: { type: String, default: "en" },

    requiredVariables: { type: [String], default: [] },

    isEnabled: { type: Boolean, default: true },
    isApprovedOnProvider: { type: Boolean, default: false },
    lastTestedAt: Date,
    lastTestStatus: { type: String, enum: ["success", "failed"] },
  },
  { timestamps: true },
);

// One template per key+channel+language — lets the same key have a WhatsApp
// EN template and an email AR template without collision.
notificationTemplateSchema.index(
  { key: 1, channel: 1, languageCode: 1 },
  { unique: true },
);
notificationTemplateSchema.index({ purpose: 1, isEnabled: 1 });

export default mongoose.model<INotificationTemplate>(
  "NotificationTemplate",
  notificationTemplateSchema,
);
