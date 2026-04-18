// Barrel export for all routes — re-exports from modules/
import { Router } from "express";

// Auth
import authRoutes from "../modules/auth/auth.routes";
import ticketRoutes from "../modules/tickets/tickets.routes";
import employeeRoutes from "../modules/employees/employees.routes";
import checkinRoutes from "../modules/checkin/checkin.routes";
import venueRoutes from "../modules/venues/venue.routes";
import eventRoutes from "../modules/events/events.routes";
import orderRoutes from "../modules/orders/orders.routes";
import paymentRoutes from "../modules/payments/payment.routes";
import reviewRoutes from "../modules/reviews/reviews.routes";
import uploadRoutes from "../modules/media/upload.routes";
import analyticsRoutes from "../modules/analytics/analytics.routes";
import adminUserRoutes from "../modules/users/admin-users.routes";
import adminEmployeeRoutes from "../modules/employees/admin-employees.routes";
import adminEventRoutes from "../modules/events/admin-events.routes";
import adminVenueRoutes from "../modules/venues/admin-venue.routes";
import adminVendorRoutes from "../modules/admin/admin-vendors.routes";
import adminTeacherRoutes from "../modules/admin/admin-teachers.routes";
import adminDashboardRoutes from "../modules/analytics/admin-dashboard.routes";
import adminModerationRoutes from "../modules/admin/admin-moderation.routes";
import adminPayoutRoutes from "../modules/admin/admin-payouts.routes";
import adminSettingsRoutes from "../modules/settings/admin-settings.routes";
import adminCommissionRoutes from "../modules/admin/admin-commissions.routes";
import vendorRoutes from "../modules/vendors/vendor.routes";
import vendorPayoutRoutes from "../modules/vendors/vendor-payout.routes";
import vendorPaymentRoutes from "../modules/payments/vendor-payment.routes";
import teacherRoutes from "../modules/teachers/teacher.routes";
import teacherPayoutRoutes from "../modules/teachers/teacher-payout.routes";
import teacherPaymentRoutes from "../modules/payments/teacher-payment.routes";
import blogRoutes from "../modules/content/blog.routes";
import adminBlogRoutes from "../modules/content/blog.routes";
import blogCommentsRoutes from "../modules/content/blog-comments.routes";
import categoryRoutes from "../modules/categories/category.routes";
import couponRoutes from "../modules/coupons/coupon.routes";
import adminCollectionRoutes from "../modules/collections/admin-collections.routes";
import notificationRoutes from "../modules/notifications/notifications.routes";
import affiliateRoutes from "../modules/affiliates/affiliates.routes";
import bookingRoutes from "../modules/bookings/bookings.routes";
import newsletterRoutes from "../modules/content/newsletter.routes";
import searchRoutes from "../modules/search/search.routes";
import collectionRoutes from "../modules/collections/collections.routes";
import favoritesRoutes from "../modules/favorites/favorites.routes";
import adminRevenueRoutes from "../modules/admin/admin-teacher-revenue.routes";
import adminStatsRoutes from "../modules/analytics/admin-stats.routes";
import adminBulkImportRoutes from "../modules/admin/admin-bulk-import.routes";
import statsRoutes from "../modules/analytics/stats.routes";
import registrationRoutes from "../modules/registrations/registration.routes";
import currencyRoutes from "../modules/currency/currency.routes";
import contactRoutes from "../modules/contact/contact.routes";
import partnershipRoutes from "../modules/partnerships/partnership.routes";
import cancellationRoutes from "../modules/checkin/event-cancellation.routes";
import eventAffiliateRoutes from "../modules/affiliates/event-affiliate.routes";
import venueAffiliateRoutes from "../modules/affiliates/venue-affiliate.routes";
import publicSettingsRoutes from "../modules/settings/public-settings.routes";
import mediaRoutes from "../modules/media/media.routes";
import bannerRoutes from "../modules/content/banners.routes";
import seoContentRoutes from "../modules/content/seo-content.routes";
import announcementBarRoutes from "../modules/content/announcements.routes";
import popupRoutes from "../modules/content/popups.routes";
import homepageRoutes from "../modules/analytics/homepage.routes";
import reelRoutes from "../modules/content/reels.routes";
import adminReelRoutes from "../modules/content/admin-reels.routes";
import adminTeacherPayoutRoutes from "../modules/admin/admin-teacher-payouts.routes";
import adminTeacherRevenueRoutes from "../modules/admin/admin-teacher-revenue.routes";
import superAdminRoutes from "../modules/admin/super-admin.routes";
import chatbotProxyRouter from "./chatbot.proxy.routes";
import { authenticate, authorize } from "../middleware/auth";
import { UserRole } from "../models/index";

// New education modules
import certificatesRoutes from "../modules/certificates/certificates.routes";
import studentPortalRoutes from "../modules/student-portal/portal.routes";
import lmsRoutes from "../modules/lms/lms.routes";
import examinationsRoutes from "../modules/examinations/examinations.routes";
import erpRoutes from "../modules/erp/erp.routes";
import messagingRoutes from "../modules/messaging/messaging.routes";
import noticesRoutes from "../modules/notices/notices.routes";
import calendarRoutes from "../modules/calendar/calendar.routes";

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

// Admin Teacher Management routes
router.use("/admin/teachers", adminTeacherRoutes);

// Admin Dashboard routes
router.use("/admin/dashboard", adminDashboardRoutes);

// Admin Moderation routes
router.use("/admin/moderation", adminModerationRoutes);

// Admin Payout routes
router.use("/admin", adminPayoutRoutes);

// Admin Commission routes
router.use("/admin", adminCommissionRoutes);

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

// Contact routes (contact form submissions)
router.use("/contact", contactRoutes);

// Partnership routes (partnership inquiry submissions)
router.use("/partnerships", partnershipRoutes);

// Public Settings routes (no authentication required)
router.use("/public/settings", publicSettingsRoutes);

// Cancellation routes (event and order cancellations with refunds)
router.use("/", cancellationRoutes);

// Event Affiliate routes (affiliate event tracking and claiming)
router.use("/", eventAffiliateRoutes);

// Venue Affiliate routes (affiliate venue tracking and claiming)
router.use("/", venueAffiliateRoutes);

// AI Chatbot proxy routes (admin only)
router.use("/chatbot", authenticate, authorize([UserRole.ADMIN]), chatbotProxyRouter);

// Admin Teacher Payout routes
router.use("/admin/teachers/payouts", adminTeacherPayoutRoutes);

// Admin Teacher Revenue routes
router.use("/admin/teacher-revenue", adminTeacherRevenueRoutes);

// Certificate Generator module
router.use("/certificates", certificatesRoutes);

// Student Portal module
router.use("/portal", studentPortalRoutes);

// LMS module
router.use("/lms", lmsRoutes);

// Examinations module
router.use("/examinations", examinationsRoutes);

// ERP module
router.use("/erp", erpRoutes);

// Messaging module
router.use("/messaging", messagingRoutes);

// Notices module
router.use("/notices", noticesRoutes);

// Calendar module
router.use("/calendar", calendarRoutes);

// Super Admin module
router.use("/super-admin", superAdminRoutes);

export default router;
