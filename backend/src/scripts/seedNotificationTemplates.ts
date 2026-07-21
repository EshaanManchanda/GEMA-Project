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
 * so admin edits (isEnabled, providerTemplateName, bodyText) survive a re-seed.
 *
 * `providerTemplateName` values below are PLACEHOLDERS (the old slug names,
 * e.g. "kidrove_booking_confirmed") — Cunnekt's real send API needs the
 * numeric/opaque `templateid` it assigns once each template is created and
 * approved on their Template List page. Replace each via the admin
 * NotificationTemplate editor once those IDs exist; sends will fail against
 * these placeholders in the meantime (dev/test-mode provider is unaffected).
 */
const templates = [
  {
    key: NotificationTemplateKey.BOOKING_CONFIRMED,
    channel: CommunicationChannel.WHATSAPP,
    provider: "cunnekt",
    purpose: CommunicationCategory.TRANSACTIONAL,
    providerTemplateName: "kidrove_booking_confirmed",
    // WhatsApp template rule: a variable can't be the first or last token in
    // the body — trailing text added after {{ticket_link}} to satisfy that.
    bodyText:
      "Hi {{customer_name}}, your booking for *{{event_title}}* on {{event_date}} is confirmed! Booking ID: {{booking_id}}. Tap to view your ticket: {{ticket_link}}. See you there!",
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
    bodyText:
      "Hi {{customer_name}}, we've received your payment of {{amount}} for order {{order_id}}. Thank you for booking with Kidrove!",
    requiredVariables: ["customer_name", "amount", "order_id"],
  },
  {
    key: NotificationTemplateKey.PAYMENT_FAILED,
    channel: CommunicationChannel.WHATSAPP,
    provider: "cunnekt",
    purpose: CommunicationCategory.TRANSACTIONAL,
    providerTemplateName: "kidrove_payment_failed",
    bodyText:
      "Hi {{customer_name}}, your payment for order {{order_id}} could not be processed. Please retry or contact support.",
    requiredVariables: ["customer_name", "order_id"],
  },
  {
    key: NotificationTemplateKey.EVENT_REMINDER_24H,
    channel: CommunicationChannel.WHATSAPP,
    provider: "cunnekt",
    purpose: CommunicationCategory.TRANSACTIONAL,
    providerTemplateName: "kidrove_event_reminder_24h",
    bodyText:
      "Reminder: *{{event_title}}* is happening tomorrow, {{event_date}} at {{event_time}}. Location/link: {{location_or_link}}. See you there!",
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
    // WhatsApp template rule: a variable can't be the first or last token in
    // the body — trailing text added after {{location_or_link}} (a bare
    // period right after a variable isn't reliably enough for some templates).
    bodyText:
      "Starting soon: *{{event_title}}* begins today at {{event_time}} ({{event_date}}). Location/link: {{location_or_link}}. Don't miss it!",
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
    bodyText:
      "Hi {{customer_name}}, we're sorry to inform you that *{{event_title}}* has been cancelled. Your booking ({{booking_id}}) will be refunded automatically.",
    requiredVariables: ["customer_name", "event_title", "booking_id"],
  },
  {
    key: NotificationTemplateKey.REFUND_PROCESSED,
    channel: CommunicationChannel.WHATSAPP,
    provider: "cunnekt",
    purpose: CommunicationCategory.TRANSACTIONAL,
    providerTemplateName: "kidrove_refund_processed",
    bodyText:
      "Hi {{customer_name}}, your refund of {{amount}} for order {{order_id}} has been processed and will reflect in your account shortly.",
    requiredVariables: ["customer_name", "amount", "order_id"],
  },
  {
    key: NotificationTemplateKey.CERTIFICATE_ISSUED,
    channel: CommunicationChannel.WHATSAPP,
    provider: "cunnekt",
    purpose: CommunicationCategory.TRANSACTIONAL,
    providerTemplateName: "kidrove_certificate_issued",
    // WhatsApp template rule: a variable can't be the first or last token in
    // the body — trailing text added after {{certificate_link}}.
    bodyText:
      "Congratulations {{student_name}}! Your certificate for *{{competition_name}}* is ready. Download it here: {{certificate_link}}. Well done!",
    requiredVariables: ["student_name", "competition_name", "certificate_link"],
  },
  {
    key: NotificationTemplateKey.PHONE_VERIFICATION_OTP,
    channel: CommunicationChannel.WHATSAPP,
    provider: "cunnekt",
    purpose: CommunicationCategory.OTP,
    providerTemplateName: "kidrove_phone_verification_otp",
    // WhatsApp template rule: a variable can't be the first or last token in
    // the body — leading text added before {{otp_code}}.
    bodyText:
      "Your Kidrove verification code is *{{otp_code}}*. It expires in {{expiry_minutes}} minutes. Do not share this code with anyone.",
    requiredVariables: ["otp_code", "expiry_minutes"],
  },
  {
    key: NotificationTemplateKey.TICKET_DELIVERY,
    channel: CommunicationChannel.WHATSAPP,
    provider: "cunnekt",
    purpose: CommunicationCategory.TRANSACTIONAL,
    providerTemplateName: "kidrove_ticket_delivery",
    bodyText:
      "Your ticket is ready! Ticket #{{ticket_number}} for *{{event_title}}* on {{event_date}} at {{venue}}. Please have this ready at entry.",
    requiredVariables: ["ticket_number", "event_title", "event_date", "venue"],
  },
  {
    key: NotificationTemplateKey.EVENT_REVIEW_REQUEST,
    channel: CommunicationChannel.WHATSAPP,
    provider: "cunnekt",
    purpose: CommunicationCategory.TRANSACTIONAL,
    providerTemplateName: "kidrove_event_review_request",
    // WhatsApp template rule: a variable can't be the first or last token in
    // the body — trailing text added after {{review_link}}.
    bodyText:
      "Hi {{customer_name}}, how was *{{event_title}}*? We'd love your feedback — leave a quick review here: {{review_link}}. Thank you!",
    requiredVariables: ["customer_name", "event_title", "review_link"],
  },
  {
    key: NotificationTemplateKey.VENDOR_APPROVED,
    channel: CommunicationChannel.WHATSAPP,
    provider: "cunnekt",
    purpose: CommunicationCategory.TRANSACTIONAL,
    providerTemplateName: "kidrove_vendor_approved",
    bodyText:
      "Hi {{vendor_name}}, great news — your vendor account on Kidrove has been approved! You can now start creating events.",
    requiredVariables: ["vendor_name"],
  },
  {
    key: NotificationTemplateKey.VENDOR_REJECTED,
    channel: CommunicationChannel.WHATSAPP,
    provider: "cunnekt",
    purpose: CommunicationCategory.TRANSACTIONAL,
    providerTemplateName: "kidrove_vendor_rejected",
    bodyText:
      "Hi {{vendor_name}}, your vendor application on Kidrove was not approved at this time. Contact support for details.",
    requiredVariables: ["vendor_name"],
  },
  {
    key: NotificationTemplateKey.PARTNER_FORM_ADMIN_ALERT,
    channel: CommunicationChannel.WHATSAPP,
    provider: "cunnekt",
    purpose: CommunicationCategory.ADMIN_ALERT,
    providerTemplateName: "kidrove_partner_form_admin_alert",
    bodyText:
      "New partnership inquiry from {{partner_name}} ({{partner_email}}). Please review in the admin dashboard.",
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
