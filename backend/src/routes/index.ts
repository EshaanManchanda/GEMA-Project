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
import adminTeacherRoutes from "./admin.teacher.routes";
import adminDashboardRoutes from "./admin.dashboard.routes";
import adminModerationRoutes from "./admin.moderation.routes";
import adminPayoutRoutes from "./admin.payout.routes";
import adminSettingsRoutes from "./admin.settings.routes";
import adminCommissionRoutes from "./admin.commission.routes";
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
// import notificationRoutes from './notification.routes';
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
// router.use('/notifications', notificationRoutes); // Commented out - notification system disabled
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

// Admin Teacher Payout routes
router.use("/admin/teachers/payouts", adminTeacherPayoutRoutes);

// Admin Teacher Revenue routes
router.use("/admin/teacher-revenue", adminTeacherRevenueRoutes);

export default router;
