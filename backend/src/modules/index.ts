import { Router } from "express";
import type { Application } from "express";

// ============================================================
// ADMIN
// ============================================================
import adminBulkImportRoutes from "./admin/admin-bulk-import.routes";
import adminCommissionsRoutes from "./admin/admin-commissions.routes";
import adminModerationRoutes from "./admin/admin-moderation.routes";
import adminPayoutsRoutes from "./admin/admin-payouts.routes";
import adminTeacherPayoutsRoutes from "./admin/admin-teacher-payouts.routes";
import adminTeacherRevenueRoutes from "./admin/admin-teacher-revenue.routes";
import adminTeachersRoutes from "./admin/admin-teachers.routes";
import adminVendorsRoutes from "./admin/admin-vendors.routes";

// ============================================================
// AFFILIATES
// ============================================================
import affiliatesRoutes from "./affiliates/affiliates.routes";
import eventAffiliateRoutes from "./affiliates/event-affiliate.routes";
import venueAffiliateRoutes from "./affiliates/venue-affiliate.routes";

// ============================================================
// ANALYTICS
// ============================================================
import adminDashboardRoutes from "./analytics/admin-dashboard.routes";
import adminStatsRoutes from "./analytics/admin-stats.routes";
import analyticsRoutes from "./analytics/analytics.routes";
import homepageRoutes from "./analytics/homepage.routes";
import statsRoutes from "./analytics/stats.routes";

// ============================================================
// AUTH
// ============================================================
import authRoutes from "./auth/auth.routes";

// ============================================================
// BOOKINGS
// ============================================================
import bookingsRoutes from "./bookings/bookings.routes";

// ============================================================
// CATEGORIES
// ============================================================
import categoryRoutes from "./categories/category.routes";

// ============================================================
// CHECKIN
// ============================================================
import checkinRoutes from "./checkin/checkin.routes";
import eventCancellationRoutes from "./checkin/event-cancellation.routes";

// ============================================================
// COLLECTIONS
// ============================================================
import adminCollectionsRoutes from "./collections/admin-collections.routes";
import collectionsRoutes from "./collections/collections.routes";

// ============================================================
// CONTACT
// ============================================================
import contactRoutes from "./contact/contact.routes";

// ============================================================
// CONTENT
// ============================================================
import adminReelsRoutes from "./content/admin-reels.routes";
import announcementsRoutes from "./content/announcements.routes";
import bannersRoutes from "./content/banners.routes";
import blogCommentsRoutes from "./content/blog-comments.routes";
import blogRoutes from "./content/blog.routes";
import newsletterRoutes from "./content/newsletter.routes";
import popupsRoutes from "./content/popups.routes";
import reelsRoutes from "./content/reels.routes";
import seoContentRoutes from "./content/seo-content.routes";

// ============================================================
// COUPONS
// ============================================================
import couponRoutes from "./coupons/coupon.routes";

// ============================================================
// CURRENCY
// ============================================================
import currencyRoutes from "./currency/currency.routes";

// ============================================================
// EMPLOYEES
// ============================================================
import adminEmployeesRoutes from "./employees/admin-employees.routes";
import employeesRoutes from "./employees/employees.routes";

// ============================================================
// EVENTS
// ============================================================
import adminEventsRoutes from "./events/admin-events.routes";
import eventsRoutes from "./events/events.routes";

// ============================================================
// FAVORITES
// ============================================================
import favoritesRoutes from "./favorites/favorites.routes";

// ============================================================
// HEALTH
// ============================================================
import healthRoutes from "./health/health.routes";

// ============================================================
// MEDIA
// ============================================================
import mediaRoutes from "./media/media.routes";
import uploadRoutes from "./media/upload.routes";

// ============================================================
// NOTIFICATIONS
// ============================================================
import notificationsRoutes from "./notifications/notifications.routes";

// ============================================================
// ORDERS
// ============================================================
import ordersRoutes from "./orders/orders.routes";

// ============================================================
// PARENTS
// ============================================================
import parentsRoutes from "./parents/parents.routes";

// ============================================================
// PARTNERSHIPS
// ============================================================
import partnershipRoutes from "./partnerships/partnership.routes";

// ============================================================
// PAYMENTS
// ============================================================
import paymentRoutes from "./payments/payment.routes";
import teacherPaymentRoutes from "./payments/teacher-payment.routes";
import vendorPaymentRoutes from "./payments/vendor-payment.routes";

// ============================================================
// REGISTRATIONS
// ============================================================
import registrationRoutes from "./registrations/registration.routes";

// ============================================================
// REVIEWS
// ============================================================
import reviewsRoutes from "./reviews/reviews.routes";

// ============================================================
// SCHOOLS
// ============================================================
import schoolsRoutes from "./schools/schools.routes";

// ============================================================
// SEARCH
// ============================================================
import searchRoutes from "./search/search.routes";

// ============================================================
// SETTINGS
// ============================================================
import adminAppSettingsRoutes from "./settings/admin-app-settings.routes";
import adminSettingsRoutes from "./settings/admin-settings.routes";
import publicSettingsRoutes from "./settings/public-settings.routes";

// ============================================================
// STUDENTS
// ============================================================
import studentsRoutes from "./students/students.routes";

// ============================================================
// TEACHERS
// ============================================================
import teacherPayoutRoutes from "./teachers/teacher-payout.routes";
import teacherRoutes from "./teachers/teacher.routes";

// ============================================================
// TICKETS
// ============================================================
import ticketsRoutes from "./tickets/tickets.routes";

// ============================================================
// USERS
// ============================================================
import adminUsersRoutes from "./users/admin-users.routes";

// ============================================================
// VENDORS
// ============================================================
import vendorPayoutRoutes from "./vendors/vendor-payout.routes";
import vendorRoutes from "./vendors/vendor.routes";

// ============================================================
// VENUES
// ============================================================
import adminVenueRoutes from "./venues/admin-venue.routes";
import venueRoutes from "./venues/venue.routes";

// ============================================================
// MODULE ROUTE MAP
// Each entry: [mountPath, router]
// ============================================================
interface ModuleRoute {
  path: string;
  router: any;
}

const publicRoutes: ModuleRoute[] = [
  { path: "/health", router: healthRoutes },
  { path: "/homepage", router: homepageRoutes },
  { path: "/auth", router: authRoutes },
  { path: "/tickets", router: ticketsRoutes },
  { path: "/employees", router: employeesRoutes },
  { path: "/checkin", router: checkinRoutes },
  { path: "/venues", router: venueRoutes },
  { path: "/events", router: eventsRoutes },
  { path: "/orders", router: ordersRoutes },
  { path: "/payments", router: paymentRoutes },
  { path: "/reviews", router: reviewsRoutes },
  { path: "/reels", router: reelsRoutes },
  { path: "/uploads", router: uploadRoutes },
  { path: "/media", router: mediaRoutes },
  { path: "/banners", router: bannersRoutes },
  { path: "/seo-content", router: seoContentRoutes },
  { path: "/announcements", router: announcementsRoutes },
  { path: "/popups", router: popupsRoutes },
  { path: "/analytics", router: analyticsRoutes },
  { path: "/vendors", router: vendorRoutes },
  { path: "/vendors/payouts", router: vendorPayoutRoutes },
  { path: "/vendors/payment-settings", router: vendorPaymentRoutes },
  { path: "/teachers", router: teacherRoutes },
  { path: "/teachers/payouts", router: teacherPayoutRoutes },
  { path: "/teachers/payment-settings", router: teacherPaymentRoutes },
  { path: "/blogs", router: blogRoutes },
  { path: "/blog", router: blogCommentsRoutes },
  { path: "/categories", router: categoryRoutes },
  { path: "/coupons", router: couponRoutes },
  { path: "/notifications", router: notificationsRoutes },
  { path: "/affiliates", router: affiliatesRoutes },
  { path: "/newsletter", router: newsletterRoutes },
  { path: "/bookings", router: bookingsRoutes },
  { path: "/search", router: searchRoutes },
  { path: "/collections", router: collectionsRoutes },
  { path: "/favorites", router: favoritesRoutes },
  { path: "/currency", router: currencyRoutes },
  { path: "/stats", router: statsRoutes },
  { path: "/registrations", router: registrationRoutes },
  { path: "/contact", router: contactRoutes },
  { path: "/partnerships", router: partnershipRoutes },
  { path: "/public/settings", router: publicSettingsRoutes },
  { path: "/", router: eventCancellationRoutes },
  { path: "/", router: eventAffiliateRoutes },
  { path: "/", router: venueAffiliateRoutes },
  { path: "/schools", router: schoolsRoutes },
  { path: "/students", router: studentsRoutes },
  { path: "/parents", router: parentsRoutes },
];

const adminRoutes: ModuleRoute[] = [
  { path: "/admin/users", router: adminUsersRoutes },
  { path: "/admin/employees", router: adminEmployeesRoutes },
  { path: "/admin/events", router: adminEventsRoutes },
  { path: "/admin/venues", router: adminVenueRoutes },
  { path: "/admin/vendors", router: adminVendorsRoutes },
  { path: "/admin/teachers", router: adminTeachersRoutes },
  { path: "/admin/dashboard", router: adminDashboardRoutes },
  { path: "/admin/moderation", router: adminModerationRoutes },
  { path: "/admin", router: adminPayoutsRoutes },
  { path: "/admin", router: adminCommissionsRoutes },
  { path: "/admin", router: adminSettingsRoutes },
  { path: "/admin", router: adminAppSettingsRoutes },
  { path: "/admin/collections", router: adminCollectionsRoutes },
  { path: "/admin/blogs", router: blogRoutes },
  { path: "/admin/reels", router: adminReelsRoutes },
  { path: "/admin/revenue", router: adminTeacherRevenueRoutes },
  { path: "/admin", router: adminStatsRoutes },
  { path: "/admin/bulk-import", router: adminBulkImportRoutes },
  { path: "/admin/teachers/payouts", router: adminTeacherPayoutsRoutes },
  { path: "/admin/teacher-revenue", router: adminTeacherRevenueRoutes },
];

// ============================================================
// EXPORTS — individual routers for selective mounting
// ============================================================
export {
  // Admin
  adminBulkImportRoutes,
  adminCommissionsRoutes,
  adminModerationRoutes,
  adminPayoutsRoutes,
  adminTeacherPayoutsRoutes,
  adminTeacherRevenueRoutes,
  adminTeachersRoutes,
  adminVendorsRoutes,

  // Affiliates
  affiliatesRoutes,
  eventAffiliateRoutes,
  venueAffiliateRoutes,

  // Analytics
  adminDashboardRoutes,
  adminStatsRoutes,
  analyticsRoutes,
  homepageRoutes,
  statsRoutes,

  // Auth
  authRoutes,

  // Bookings
  bookingsRoutes,

  // Categories
  categoryRoutes,

  // Checkin
  checkinRoutes,
  eventCancellationRoutes,

  // Collections
  adminCollectionsRoutes,
  collectionsRoutes,

  // Contact
  contactRoutes,

  // Content
  adminReelsRoutes,
  announcementsRoutes,
  bannersRoutes,
  blogCommentsRoutes,
  blogRoutes,
  newsletterRoutes,
  popupsRoutes,
  reelsRoutes,
  seoContentRoutes,

  // Coupons
  couponRoutes,

  // Currency
  currencyRoutes,

  // Employees
  adminEmployeesRoutes,
  employeesRoutes,

  // Events
  adminEventsRoutes,
  eventsRoutes,

  // Favorites
  favoritesRoutes,

  // Health
  healthRoutes,

  // Media
  mediaRoutes,
  uploadRoutes,

  // Notifications
  notificationsRoutes,

  // Orders
  ordersRoutes,

  // Parents
  parentsRoutes,

  // Partnerships
  partnershipRoutes,

  // Payments
  paymentRoutes,
  teacherPaymentRoutes,
  vendorPaymentRoutes,

  // Registrations
  registrationRoutes,

  // Reviews
  reviewsRoutes,

  // Schools
  schoolsRoutes,

  // Search
  searchRoutes,

  // Settings
  adminAppSettingsRoutes,
  adminSettingsRoutes,
  publicSettingsRoutes,

  // Students
  studentsRoutes,

  // Teachers
  teacherPayoutRoutes,
  teacherRoutes,

  // Tickets
  ticketsRoutes,

  // Users
  adminUsersRoutes,

  // Vendors
  vendorPayoutRoutes,
  vendorRoutes,

  // Venues
  adminVenueRoutes,
  venueRoutes,
};

// ============================================================
// REGISTER MODULES
// Mounts all routes on the given Express application
// ============================================================
export function registerModules(app: Application): void {
  const apiRouter = Router();

  for (const { path, router } of publicRoutes) {
    apiRouter.use(path, router);
  }

  for (const { path, router } of adminRoutes) {
    apiRouter.use(path, router);
  }

  app.use("/api", apiRouter);
}
