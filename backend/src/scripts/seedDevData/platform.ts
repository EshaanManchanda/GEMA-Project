import Notification from "../../models/Notification";
import AuditLog from "../../models/AuditLog";
import GoogleReview from "../../models/GoogleReview";
import ContentReport from "../../models/ContentReport";
import { Section, make, pick, int, chance, daysAgo, fullName } from "./helpers";

const NOTIFS: [string, string, string][] = [
  ["booking_confirmed", "Booking confirmed", "Your booking is confirmed. See you there!"],
  ["payment_success", "Payment received", "We received your payment. Thank you."],
  ["event_reminder", "Event tomorrow", "Your event starts tomorrow, don't forget your tickets."],
  ["review_received", "New review", "Someone left a review on your event."],
  ["promotional", "Weekend deals", "Up to 30% off family activities this weekend."],
  ["welcome", "Welcome to Kidrove", "Discover events and classes for your kids."],
];
const ACTIONS = ["login", "login", "login_failed", "logout", "register", "password_change", "role_change", "event_approval", "booking_confirmed", "settings_update"];

export const platform: Section = async (ctx) => {
  if (!ctx.users.length) return [];

  const notifications = make("notification", 80, () => {
    const [type, title, message] = pick(NOTIFS);
    const at = daysAgo(int(0, 30));
    return { userId: pick(ctx.users)._id, type, title, message, priority: pick(["low", "medium", "high"]), isRead: chance(0.5), createdAt: at, updatedAt: at };
  });

  const audit = make("audit", 80, () => {
    const at = daysAgo(int(0, 30));
    return { action: pick(ACTIONS), userId: pick(ctx.users)._id, ipAddress: `10.0.${int(0, 9)}.${int(1, 254)}`, createdAt: at, updatedAt: at };
  });

  const googleReviews = ctx.events.length ? make("googlereview", 30, (i) => {
    const at = daysAgo(int(0, 120));
    return {
      eventId: pick(ctx.events)._id, googlePlaceId: `mock_place_${int(1, 5)}`, reviewId: `mock_review_${i}`, author_name: fullName(),
      rating: pick([3, 4, 4, 5, 5, 5]), text: pick(["Kids had a blast!", "Well organised and safe.", "Good value for money.", "Staff were lovely."]),
      firstSyncedAt: at, lastSyncedAt: at, lastSeenAt: at, createdAt: at, updatedAt: at,
    };
  }) : [];

  const reports = ctx.events.length ? make("contentreport", 12, () => {
    const at = daysAgo(int(0, 30));
    return { contentType: "event", contentId: pick(ctx.events)._id, reportedBy: pick(ctx.users)._id, reason: pick(["Misleading description", "Wrong price", "Spam"]), status: pick(["pending", "pending", "reviewed", "dismissed"]), createdAt: at, updatedAt: at };
  }) : [];

  return [
    { label: "notifications", model: Notification, docs: notifications },
    { label: "audit logs", model: AuditLog, docs: audit },
    { label: "google reviews", model: GoogleReview, docs: googleReviews },
    { label: "content reports", model: ContentReport, docs: reports },
  ];
};
