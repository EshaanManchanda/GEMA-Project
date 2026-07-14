import authRoutes from "./auth.routes";
import ticketRoutes from "./ticket.routes";
import employeeRoutes from "./employee.routes";
import checkinRoutes from "./checkin.routes";
import venueRoutes from "./venue.routes";
import eventRoutes from "./event.routes";
import orderRoutes from "./order.routes";
import paymentRoutes from "./payment.routes";
import reviewRoutes from "./review.routes";
import uploadRoutes from "./upload.routes";
import analyticsRoutes from "./analytics.routes";
import adminUserRoutes from "./admin.user.routes";
import adminEmployeeRoutes from "./admin.employee.routes";
import adminEventRoutes from "./admin.event.routes";
import adminVenueRoutes from "./admin.venue.routes";
import adminVendorRoutes from "./admin.vendor.routes";
import adminServicePackageRoutes from "./admin.servicePackage.routes";
import adminTeacherRoutes from "./admin.teacher.routes";
import adminOrganizationRoutes from "./admin.organization.routes";
import adminDashboardRoutes from "./admin.dashboard.routes";
import adminModerationRoutes from "./admin.moderation.routes";
import adminPayoutRoutes from "./admin.payout.routes";
import adminSettingsRoutes from "./admin.settings.routes";
import adminCommissionRoutes from "./admin.commission.routes";
import adminCommunicationRoutes from "./admin.communication.routes";
import cunnektWebhookRoutes from "./cunnekt.webhook.routes";
import vendorRoutes from "./vendor.routes";
import vendorPayoutRoutes from "./vendor.payout.routes";
import vendorPaymentRoutes from "./vendor.payment.routes";
import teacherRoutes from "./teacher.routes";
import teacherPayoutRoutes from "./teacher.payout.routes";
import teacherPaymentRoutes from "./teacher.payment.routes";
import blogRoutes from "./blog.routes";
import adminBlogRoutes from "./admin.blog.routes";
import blogCommentsRoutes from "./blog.comments.routes";
// New routes
import categoryRoutes from "./category.routes";
import couponRoutes from "./coupon.routes";
import adminCollectionRoutes from "./admin.collection.routes";
import notificationRoutes from './notification.routes';
import affiliateRoutes from "./affiliate.routes";
import bookingRoutes from "./booking.routes";
import newsletterRoutes from "./newsletter.routes";
import searchRoutes from "./search.routes";
import collectionRoutes from "./collection.routes";
import favoritesRoutes from "./favorites.routes";
import adminRevenueRoutes from "./admin.revenue.routes";
import adminStatsRoutes from "./admin.stats.routes";
import adminBulkImportRoutes from "./admin.bulk-import.routes";
import statsRoutes from "./stats.routes";
import seoRoutes from "./seo.routes";
import registrationRoutes from "./registration.routes";
import currencyRoutes from "./currency.routes";
import contactRoutes from "./contact.routes";
import partnershipRoutes from "./partnership.routes";
import organizationRoutes from "./organization.routes";
import cancellationRoutes from "./event.cancellation.routes";
import eventAffiliateRoutes from "./event.affiliate.routes";
import venueAffiliateRoutes from "./venue.affiliate.routes";
import publicSettingsRoutes from "./public.settings.routes";
import mediaRoutes from "./media.routes";
import bannerRoutes from "./banner.routes";
import seoContentRoutes from "./seoContent.routes";
import announcementBarRoutes from "./announcementBar.routes";
import popupRoutes from "./popup.routes";
import homepageRoutes from "./homepage.routes";
import reelRoutes from "./reel.routes";
import adminReelRoutes from "./admin.reel.routes";
import galleryRoutes from "./gallery.routes";
import certificateRoutes from "./certificate.routes";
import { Router } from "express";

const router = Router();

// Root route
router.get("/", (req, res) => {
  res.status(200).json({
    message: `Welcome to the ${process.env.APP_NAME || "Kidrove"} API!`,
  });
});

// Homepage aggregated data (Public)
router.use("/homepage", homepageRoutes);

// Auth routes
router.use("/auth", authRoutes);

// Ticket routes
router.use("/tickets", ticketRoutes);

// Employee routes
router.use("/employees", employeeRoutes);

// Check-in routes
router.use("/checkin", checkinRoutes);

// Venue routes
router.use("/venues", venueRoutes);

// Event routes
router.use("/events", eventRoutes);

// Order routes
router.use("/orders", orderRoutes);

// Payment routes
router.use("/payments", paymentRoutes);

// Cunnekt WhatsApp webhook — unauthenticated, secret-verified in controller.
// Raw body for this path is mounted in server.ts before express.json().
router.use("/webhooks/cunnekt", cunnektWebhookRoutes);

// Review routes
router.use("/reviews", reviewRoutes);

// Reel routes (public)
router.use("/reels", reelRoutes);

// Upload routes
router.use("/uploads", uploadRoutes);

// Media Management routes (Admin-only)
router.use("/media", mediaRoutes);

// Banner Management routes (Public + Admin)
router.use("/banners", bannerRoutes);

// SEO Content Management routes (Public + Admin)
router.use("/seo-content", seoContentRoutes);

// Announcement Bar Management routes (Public + Admin)
router.use("/announcements", announcementBarRoutes);

// Popup Notification Management routes (Public + Admin)
router.use("/popups", popupRoutes);

// Analytics routes
// Mounted at both paths: "/insights" is the canonical path (ad-blockers/Requestly
// commonly block URLs containing "analytics"); "/analytics" kept alive for any
// external caller (WP plugins, cached frontend bundles) hitting the old path directly.
router.use("/insights", analyticsRoutes);
router.use("/analytics", analyticsRoutes);

// Admin User Management routes
router.use("/admin/users", adminUserRoutes);

// Admin Employee Management routes
router.use("/admin/employees", adminEmployeeRoutes);

// Admin Event Management routes
router.use("/admin/events", adminEventRoutes);

// Admin Venue Management routes
router.use("/admin/venues", adminVenueRoutes);

// Admin Vendor Management routes
router.use("/admin/vendors", adminVendorRoutes);
router.use("/admin/service-packages", adminServicePackageRoutes);

// Admin Teacher Management routes
router.use("/admin/teachers", adminTeacherRoutes);

// Admin Organization Management routes
router.use("/admin/organizations", adminOrganizationRoutes);

// Admin Dashboard routes
router.use("/admin/dashboard", adminDashboardRoutes);

// Admin Moderation routes
router.use("/admin/moderation", adminModerationRoutes);

// Admin Payout routes
router.use("/admin", adminPayoutRoutes);

// Admin Commission routes
router.use("/admin", adminCommissionRoutes);

// Admin Communication routes (WhatsApp/email-marketing logs, settings, retry)
router.use("/admin", adminCommunicationRoutes);

// Admin Settings routes
router.use("/admin", adminSettingsRoutes);

// Admin Collection Management routes
router.use("/admin/collections", adminCollectionRoutes);

// Admin Reel Management routes
router.use("/admin/reels", adminReelRoutes);

// Vendor routes
router.use("/vendors", vendorRoutes);

// Vendor Payout routes
router.use("/vendors/payouts", vendorPayoutRoutes);

// Vendor Payment Settings routes
router.use("/vendors/payment-settings", vendorPaymentRoutes);

// Teacher routes
router.use("/teachers", teacherRoutes);

// Teacher Payout routes
router.use("/teachers/payouts", teacherPayoutRoutes);

// Teacher Payment Settings routes
router.use("/teachers/payment-settings", teacherPaymentRoutes);

// Blog routes
router.use("/blogs", blogRoutes);
router.use("/blog", blogCommentsRoutes);

// Admin Blog Management routes
router.use("/admin/blogs", adminBlogRoutes);

// New feature routes
router.use("/categories", categoryRoutes);
router.use("/coupons", couponRoutes);
router.use('/notifications', notificationRoutes);
router.use("/affiliates", affiliateRoutes);
router.use("/newsletter", newsletterRoutes);

// Booking routes (enhanced booking flow)
router.use("/bookings", bookingRoutes);

// Search routes
router.use("/search", searchRoutes);

// Collection routes
router.use("/collections", collectionRoutes);

// Favorites routes
router.use("/favorites", favoritesRoutes);

// Currency routes (exchange rates, conversion, etc.)
router.use("/currency", currencyRoutes);

// Admin Revenue Management routes
router.use("/admin/revenue", adminRevenueRoutes);

// Public Statistics routes
router.use("/stats", statsRoutes);

// Admin Statistics routes
router.use("/admin", adminStatsRoutes);

// Admin Bulk Import/Export routes
router.use("/admin/bulk-import", adminBulkImportRoutes);

// Registration routes (event registration system)
router.use("/registrations", registrationRoutes);

// SEO routes (sitemap, robots.txt, etc.)
router.use("/", seoRoutes);

// Contact routes (contact form submissions)
router.use("/contact", contactRoutes);

// Partnership routes (partnership inquiry submissions)
router.use("/partnerships", partnershipRoutes);

// Organization onboarding routes
router.use("/organizations", organizationRoutes);

// Public Settings routes (no authentication required)
router.use("/public/settings", publicSettingsRoutes);

// Cancellation routes (event and order cancellations with refunds)
router.use("/", cancellationRoutes);

// Event Affiliate routes (affiliate event tracking and claiming)
router.use("/", eventAffiliateRoutes);

// Venue Affiliate routes (affiliate venue tracking and claiming)
router.use("/", venueAffiliateRoutes);

import adminTeacherPayoutRoutes from "./admin.teacher.payout.routes";
import adminTeacherRevenueRoutes from "./admin.teacher.revenue.routes";
import chatbotProxyRouter from "./chatbot.proxy.routes";
import trackRoutes from "./track.routes";
import adminTrafficRoutes from "./admin.traffic.routes";
import { authenticate, authorize } from "../middleware/auth";
import { UserRole } from "../models/index";

// AI Chatbot proxy routes (admin only)
router.use("/chatbot", authenticate, authorize([UserRole.ADMIN]), chatbotProxyRouter);

// Admin Teacher Payout routes
router.use("/admin/teachers/payouts", adminTeacherPayoutRoutes);

// Admin Teacher Revenue routes
router.use("/admin/teacher-revenue", adminTeacherRevenueRoutes);

// Pageview tracking (public, no auth)
router.use("/track", trackRoutes);

// Admin Traffic & Search Console routes
router.use("/admin", adminTrafficRoutes);

// Gallery routes
router.use("/galleries", galleryRoutes);

// Certificate routes
router.use("/certificates", certificateRoutes);

import studentRoutes from "./student.routes";
router.use("/students", studentRoutes);

export default router;
