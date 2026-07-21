/**
 * Single source of truth for draft WhatsApp (Cunnekt) template copy — used
 * by both the Setup Guide tab (display/reference) and the Templates tab
 * (default Body copy when creating/resetting a template). Previously
 * duplicated between the two, which is how the leading/trailing-variable
 * WhatsApp rule fix had to be applied in two places at once.
 *
 * NOT pulled from any approved Cunnekt/Meta template — only
 * providerTemplateName + variable names carried over from
 * backend/src/scripts/seedNotificationTemplates.ts. Paste as a starting
 * point when creating each template in the Cunnekt dashboard, then submit
 * for approval.
 *
 * {{n}} placeholders follow the requiredVariables order — CunnektWhatsAppProvider
 * sends variables positionally in that order via
 * template.components[].parameters[].
 *
 * WhatsApp rule: a variable can't be the first or last token in the body —
 * Cunnekt rejects that with "Leading or trailing params not allowed". Every
 * body below has real words before the first variable and after the last one.
 */
export interface SampleWhatsAppTemplate {
  key: string;
  providerTemplateName: string;
  category: 'Authentication' | 'Utility';
  variables: string[];
  body: string;
}

export const SAMPLE_WHATSAPP_TEMPLATES: SampleWhatsAppTemplate[] = [
  {
    key: 'phone_verification_otp',
    providerTemplateName: 'kidrove_phone_verification_otp',
    category: 'Authentication',
    variables: ['otp_code', 'expiry_minutes'],
    body: 'Your Kidrove verification code is *{{1}}*. It expires in {{2}} minutes. Do not share this code with anyone.',
  },
  {
    key: 'booking_confirmed',
    providerTemplateName: 'kidrove_booking_confirmed',
    category: 'Utility',
    variables: ['customer_name', 'event_title', 'event_date', 'booking_id', 'ticket_link'],
    body: 'Hi {{1}}, your booking for *{{2}}* on {{3}} is confirmed! Booking ID: {{4}}. Tap to view your ticket: {{5}}. See you there!',
  },
  {
    key: 'payment_success',
    providerTemplateName: 'kidrove_payment_success',
    category: 'Utility',
    variables: ['customer_name', 'amount', 'order_id'],
    body: "Hi {{1}}, we've received your payment of {{2}} for order {{3}}. Thank you for booking with Kidrove!",
  },
  {
    key: 'payment_failed',
    providerTemplateName: 'kidrove_payment_failed',
    category: 'Utility',
    variables: ['customer_name', 'order_id'],
    body: 'Hi {{1}}, your payment for order {{2}} could not be processed. Please retry or contact support.',
  },
  {
    key: 'event_reminder_24h',
    providerTemplateName: 'kidrove_event_reminder_24h',
    category: 'Utility',
    variables: ['event_title', 'event_date', 'event_time', 'location_or_link'],
    body: 'Reminder: *{{1}}* is happening tomorrow, {{2}} at {{3}}. Location/link: {{4}}. See you there!',
  },
  {
    key: 'event_reminder_2h',
    providerTemplateName: 'kidrove_event_reminder_2h',
    category: 'Utility',
    variables: ['event_title', 'event_date', 'event_time', 'location_or_link'],
    body: "Starting soon: *{{1}}* begins today at {{3}} ({{2}}). Location/link: {{4}}. Don't miss it!",
  },
  {
    key: 'event_cancelled',
    providerTemplateName: 'kidrove_event_cancelled',
    category: 'Utility',
    variables: ['customer_name', 'event_title', 'booking_id'],
    body: "Hi {{1}}, we're sorry to inform you that *{{2}}* has been cancelled. Your booking ({{3}}) will be refunded automatically.",
  },
  {
    key: 'refund_processed',
    providerTemplateName: 'kidrove_refund_processed',
    category: 'Utility',
    variables: ['customer_name', 'amount', 'order_id'],
    body: 'Hi {{1}}, your refund of {{2}} for order {{3}} has been processed and will reflect in your account shortly.',
  },
  {
    key: 'certificate_issued',
    providerTemplateName: 'kidrove_certificate_issued',
    category: 'Utility',
    variables: ['student_name', 'competition_name', 'certificate_link'],
    body: 'Congratulations {{1}}! Your certificate for *{{2}}* is ready. Download it here: {{3}}. Well done!',
  },
  {
    key: 'ticket_delivery',
    providerTemplateName: 'kidrove_ticket_delivery',
    category: 'Utility',
    variables: ['ticket_number', 'event_title', 'event_date', 'venue'],
    body: 'Your ticket is ready! Ticket #{{1}} for *{{2}}* on {{3}} at {{4}}. Please have this ready at entry.',
  },
  {
    key: 'event_review_request',
    providerTemplateName: 'kidrove_event_review_request',
    category: 'Utility',
    variables: ['customer_name', 'event_title', 'review_link'],
    body: "Hi {{1}}, how was *{{2}}*? We'd love your feedback — leave a quick review here: {{3}}. Thank you!",
  },
  {
    key: 'vendor_approved',
    providerTemplateName: 'kidrove_vendor_approved',
    category: 'Utility',
    variables: ['vendor_name'],
    body: 'Hi {{1}}, great news — your vendor account on Kidrove has been approved! You can now start creating events.',
  },
  {
    key: 'vendor_rejected',
    providerTemplateName: 'kidrove_vendor_rejected',
    category: 'Utility',
    variables: ['vendor_name'],
    body: 'Hi {{1}}, your vendor application on Kidrove was not approved at this time. Contact support for details.',
  },
  {
    key: 'partner_form_admin_alert',
    providerTemplateName: 'kidrove_partner_form_admin_alert',
    category: 'Utility',
    variables: ['partner_name', 'partner_email'],
    body: 'New partnership inquiry from {{1}} ({{2}}). Please review in the admin dashboard.',
  },
];

export function findSampleTemplate(key: string): SampleWhatsAppTemplate | undefined {
  const trimmed = key.trim();
  if (!trimmed) return undefined;
  return SAMPLE_WHATSAPP_TEMPLATES.find((t) => t.key === trimmed);
}
