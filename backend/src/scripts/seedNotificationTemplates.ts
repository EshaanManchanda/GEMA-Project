import mongoose from "mongoose";
import { config } from "../config/index";
import {
  NotificationTemplate,
  NotificationTemplateKey,
  CommunicationChannel,
  CommunicationCategory,
} from "../models/index";

const MONGODB_URI = config.mongodbUri;

/**
 * Seed the WhatsApp (Cunnekt) notification templates. Upserts by
 * {key, channel, languageCode} — safe to re-run; never deletes existing rows
 * so admin edits (isEnabled, providerTemplateName) survive a re-seed.
 */
const templates = [
  {
    key: NotificationTemplateKey.BOOKING_CONFIRMED,
    channel: CommunicationChannel.WHATSAPP,
    provider: "cunnekt",
    purpose: CommunicationCategory.TRANSACTIONAL,
    providerTemplateName: "kidrove_booking_confirmed",
    requiredVariables: [
      "customer_name",
      "event_title",
      "event_date",
      "booking_id",
      "ticket_link",
    ],
  },
  {
    key: NotificationTemplateKey.PAYMENT_SUCCESS,
    channel: CommunicationChannel.WHATSAPP,
    provider: "cunnekt",
    purpose: CommunicationCategory.TRANSACTIONAL,
    providerTemplateName: "kidrove_payment_success",
    requiredVariables: ["customer_name", "amount", "order_id"],
  },
  {
    key: NotificationTemplateKey.PAYMENT_FAILED,
    channel: CommunicationChannel.WHATSAPP,
    provider: "cunnekt",
    purpose: CommunicationCategory.TRANSACTIONAL,
    providerTemplateName: "kidrove_payment_failed",
    requiredVariables: ["customer_name", "order_id"],
  },
  {
    key: NotificationTemplateKey.EVENT_REMINDER_24H,
    channel: CommunicationChannel.WHATSAPP,
    provider: "cunnekt",
    purpose: CommunicationCategory.TRANSACTIONAL,
    providerTemplateName: "kidrove_event_reminder_24h",
    requiredVariables: [
      "event_title",
      "event_date",
      "event_time",
      "location_or_link",
    ],
  },
  {
    key: NotificationTemplateKey.EVENT_REMINDER_2H,
    channel: CommunicationChannel.WHATSAPP,
    provider: "cunnekt",
    purpose: CommunicationCategory.TRANSACTIONAL,
    providerTemplateName: "kidrove_event_reminder_2h",
    requiredVariables: [
      "event_title",
      "event_date",
      "event_time",
      "location_or_link",
    ],
  },
  {
    key: NotificationTemplateKey.EVENT_CANCELLED,
    channel: CommunicationChannel.WHATSAPP,
    provider: "cunnekt",
    purpose: CommunicationCategory.TRANSACTIONAL,
    providerTemplateName: "kidrove_event_cancelled",
    requiredVariables: ["customer_name", "event_title", "booking_id"],
  },
  {
    key: NotificationTemplateKey.REFUND_PROCESSED,
    channel: CommunicationChannel.WHATSAPP,
    provider: "cunnekt",
    purpose: CommunicationCategory.TRANSACTIONAL,
    providerTemplateName: "kidrove_refund_processed",
    requiredVariables: ["customer_name", "amount", "order_id"],
  },
  {
    key: NotificationTemplateKey.CERTIFICATE_ISSUED,
    channel: CommunicationChannel.WHATSAPP,
    provider: "cunnekt",
    purpose: CommunicationCategory.TRANSACTIONAL,
    providerTemplateName: "kidrove_certificate_issued",
    requiredVariables: ["student_name", "competition_name", "certificate_link"],
  },
  {
    key: NotificationTemplateKey.PHONE_VERIFICATION_OTP,
    channel: CommunicationChannel.WHATSAPP,
    provider: "cunnekt",
    purpose: CommunicationCategory.OTP,
    providerTemplateName: "kidrove_phone_verification_otp",
    requiredVariables: ["otp_code", "expiry_minutes"],
  },
  {
    key: NotificationTemplateKey.TICKET_DELIVERY,
    channel: CommunicationChannel.WHATSAPP,
    provider: "cunnekt",
    purpose: CommunicationCategory.TRANSACTIONAL,
    providerTemplateName: "kidrove_ticket_delivery",
    requiredVariables: ["ticket_number", "event_title", "event_date", "venue"],
  },
  {
    key: NotificationTemplateKey.EVENT_REVIEW_REQUEST,
    channel: CommunicationChannel.WHATSAPP,
    provider: "cunnekt",
    purpose: CommunicationCategory.TRANSACTIONAL,
    providerTemplateName: "kidrove_event_review_request",
    requiredVariables: ["customer_name", "event_title", "review_link"],
  },
  {
    key: NotificationTemplateKey.VENDOR_APPROVED,
    channel: CommunicationChannel.WHATSAPP,
    provider: "cunnekt",
    purpose: CommunicationCategory.TRANSACTIONAL,
    providerTemplateName: "kidrove_vendor_approved",
    requiredVariables: ["vendor_name"],
  },
  {
    key: NotificationTemplateKey.VENDOR_REJECTED,
    channel: CommunicationChannel.WHATSAPP,
    provider: "cunnekt",
    purpose: CommunicationCategory.TRANSACTIONAL,
    providerTemplateName: "kidrove_vendor_rejected",
    requiredVariables: ["vendor_name"],
  },
  {
    key: NotificationTemplateKey.PARTNER_FORM_ADMIN_ALERT,
    channel: CommunicationChannel.WHATSAPP,
    provider: "cunnekt",
    purpose: CommunicationCategory.ADMIN_ALERT,
    providerTemplateName: "kidrove_partner_form_admin_alert",
    requiredVariables: ["partner_name", "partner_email"],
  },
];

export async function seedNotificationTemplates() {
  console.log(`📝 Upserting ${templates.length} notification templates...`);

  let created = 0;
  let updated = 0;

  for (const tpl of templates) {
    const query = { key: tpl.key, channel: tpl.channel, languageCode: "en" };
    const existed = (await NotificationTemplate.exists(query)) !== null;

    await NotificationTemplate.findOneAndUpdate(
      query,
      { $setOnInsert: { languageCode: "en" }, $set: tpl },
      { upsert: true, new: true },
    );

    if (existed) {
      updated += 1;
    } else {
      created += 1;
    }
  }

  console.log(`✅ Templates seeded: ${created} created, ${updated} updated`);
}

if (require.main === module) {
  (async () => {
    try {
      console.log(`📡 Connecting to MongoDB...`);
      await mongoose.connect(MONGODB_URI);
      console.log("✅ Connected to MongoDB");

      await seedNotificationTemplates();
    } catch (error) {
      console.error("❌ Error seeding notification templates:", error);
      process.exitCode = 1;
    } finally {
      await mongoose.connection.close();
      console.log("👋 Database connection closed");
    }
  })();
}

export default seedNotificationTemplates;
