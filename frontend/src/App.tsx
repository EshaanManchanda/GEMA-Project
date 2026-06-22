import React, { Suspense, useEffect } from 'react';
import { usePageTracking } from './hooks/usePageTracking';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
// Stripe Elements are handled by StripeElementsWrapper in payment components
// No need for global Elements provider

// Layout Components
import Layout from '@components/layout/Layout';
import AdminLayout from '@components/layout/AdminLayout';
import LoadingSpinner from '@components/common/LoadingSpinner';
import ScrollToTop from '@components/common/ScrollToTop';
import GlobalUploadProgress from '@components/common/GlobalUploadProgress';
import { ThemeController } from '@components/ThemeController';
import { PageErrorBoundary } from '@components/common/ErrorBoundary';

// Skeleton Components for better perceived performance
import {
  HomePageSkeleton,
  EventsPageSkeleton,
  EventDetailSkeleton,
  AdminDashboardSkeleton,
  GenericPageSkeleton
} from '@components/common/SkeletonLoaders';

// Page Components (Lazy loaded for better performance)
const HomePage = React.lazy(() => import(/* webpackChunkName: "home" */ './pages/HomePage'));
const EventsPage = React.lazy(() => import(/* webpackChunkName: "events" */ './pages/EventsPage'));
const EventDetailPage = React.lazy(() => import(/* webpackChunkName: "events" */ './pages/EventDetailPage'));


const InstructorDetailPage = React.lazy(() => import(/* webpackChunkName: "instructors" */ './pages/InstructorDetailPage'));
const TeachersListingPage = React.lazy(() => import(/* webpackChunkName: "teachers" */ './pages/TeachersListingPage'));
const TeacherPublicProfilePage = React.lazy(() => import(/* webpackChunkName: "teachers" */ './pages/TeacherPublicProfilePage'));
const CategoriesPage = React.lazy(() => import(/* webpackChunkName: "categories" */ './pages/CategoriesPage'));
const CategoryPage = React.lazy(() => import(/* webpackChunkName: "categories" */ './pages/CategoryPage'));
const CollectionsPage = React.lazy(() => import(/* webpackChunkName: "collections" */ './pages/CollectionsPage'));
const CollectionDetailPage = React.lazy(() => import(/* webpackChunkName: "collections" */ './pages/CollectionDetailPage'));
const VendorsPage = React.lazy(() => import(/* webpackChunkName: "vendors" */ './pages/VendorsPage'));
const VendorPage = React.lazy(() => import(/* webpackChunkName: "vendors" */ './pages/VendorPage'));
const SearchPage = React.lazy(() => import(/* webpackChunkName: "search" */ './pages/SearchPage'));
const BookingPage = React.lazy(() => import(/* webpackChunkName: "booking" */ './pages/BookingPage'));
const PaymentSuccessPage = React.lazy(() => import(/* webpackChunkName: "payment" */ './pages/PaymentSuccessPage'));
const PaymentCancelPage = React.lazy(() => import(/* webpackChunkName: "payment" */ './pages/PaymentCancelPage'));
const StudentProgramPage = React.lazy(() => import(/* webpackChunkName: "student-program" */ './pages/StudentProgramPage'));
const PartnershipsPage = React.lazy(() => import(/* webpackChunkName: "partnerships" */ './pages/PartnershipsPage'));
const SummerPartnershipPage = React.lazy(() => import(/* webpackChunkName: "summer" */ './pages/SummerPartnershipPage'));
const PartnershipSuccessPage = React.lazy(() => import(/* webpackChunkName: "summer" */ './pages/PartnershipSuccessPage'));
const StudentSummerRegPage = React.lazy(() => import(/* webpackChunkName: "student-summer-reg" */ './pages/StudentSummerRegPage'));
const SummerPartnersDirectoryPage = React.lazy(() => import(/* webpackChunkName: "summer" */ './pages/SummerPartnersDirectoryPage'));
const ComingJuly26Page = React.lazy(() => import(/* webpackChunkName: "summer" */ './pages/ComingJuly26Page'));

// Auth Pages
const LoginPage = React.lazy(() => import(/* webpackChunkName: "auth" */ './pages/auth/LoginPage'));
const RegisterPage = React.lazy(() => import(/* webpackChunkName: "auth" */ './pages/auth/RegisterPage'));
const ForgotPasswordPage = React.lazy(() => import(/* webpackChunkName: "auth" */ './pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = React.lazy(() => import(/* webpackChunkName: "auth" */ './pages/auth/ResetPasswordPage'));
const VerifyEmailPage = React.lazy(() => import(/* webpackChunkName: "auth" */ './pages/auth/VerifyEmailPage'));

// User Dashboard Pages
const DashboardPage = React.lazy(() => import(/* webpackChunkName: "dashboard" */ './pages/dashboard/DashboardPage'));
const ProfilePage = React.lazy(() => import(/* webpackChunkName: "dashboard" */ './pages/dashboard/ProfilePage'));
const BookingsPage = React.lazy(() => import(/* webpackChunkName: "dashboard" */ './pages/dashboard/BookingsPage'));
const BookingDetailPage = React.lazy(() => import(/* webpackChunkName: "dashboard" */ './pages/dashboard/BookingDetailPage'));
const FavoritesPage = React.lazy(() => import(/* webpackChunkName: "dashboard" */ './pages/dashboard/FavoritesPage'));
const ReviewsPage = React.lazy(() => import(/* webpackChunkName: "dashboard" */ './pages/dashboard/ReviewsPage'));
const MyTicketsPage = React.lazy(() => import(/* webpackChunkName: "dashboard" */ './pages/dashboard/MyTicketsPage'));
const ChangePasswordPage = React.lazy(() => import(/* webpackChunkName: "dashboard" */ './pages/dashboard/ChangePasswordPage'));
const VerifyTicketPage = React.lazy(() => import(/* webpackChunkName: "verify-ticket" */ './pages/VerifyTicketPage'));

// Registration Pages
const UserRegistrationsPage = React.lazy(() => import(/* webpackChunkName: "registration" */ './pages/UserRegistrationsPage'));
const RegistrationDetailPage = React.lazy(() => import(/* webpackChunkName: "registration" */ './pages/RegistrationDetailPage'));

// Vendor Dashboard Pages
const VendorDashboardPage = React.lazy(() => import(/* webpackChunkName: "vendor" */ './pages/vendor/VendorDashboardPage'));
const VendorEventsPage = React.lazy(() => import(/* webpackChunkName: "vendor" */ './pages/vendor/VendorEventsPage'));
const VendorEventFormPage = React.lazy(() => import(/* webpackChunkName: "vendor" */ './pages/vendor/VendorEventFormPage'));
const VendorEventDetailPage = React.lazy(() => import(/* webpackChunkName: "vendor" */ './pages/vendor/VendorEventDetailPage'));
const VendorBookingsPage = React.lazy(() => import(/* webpackChunkName: "vendor" */ './pages/vendor/VendorBookingsPage'));
const VendorBookingDetailPage = React.lazy(() => import(/* webpackChunkName: "vendor" */ './pages/vendor/VendorBookingDetailPage'));
const VendorEmployeesPage = React.lazy(() => import(/* webpackChunkName: "vendor" */ './pages/vendor/VendorEmployeesPage'));
const VendorCreateEmployeePage = React.lazy(() => import(/* webpackChunkName: "vendor" */ './pages/vendor/VendorCreateEmployeePage'));
const VendorEditEmployeePage = React.lazy(() => import(/* webpackChunkName: "vendor" */ './pages/vendor/VendorEditEmployeePage'));
const VendorPayoutsDashboard = React.lazy(() => import(/* webpackChunkName: "vendor" */ './pages/vendor/VendorPayoutsDashboard'));
const VendorAnalyticsPage = React.lazy(() => import(/* webpackChunkName: "vendor" */ './pages/vendor/VendorAnalyticsPage'));
const VendorProfilePage = React.lazy(() => import(/* webpackChunkName: "vendor" */ './pages/vendor/VendorProfilePage'));
const VendorClaimedEventsPage = React.lazy(() => import(/* webpackChunkName: "vendor" */ './pages/vendor/VendorClaimedEventsPage'));
const VendorLayout = React.lazy(() => import(/* webpackChunkName: "vendor" */ './components/vendor/VendorLayout'));

// Vendor Registration Pages
const VendorRegistrationsDashboard = React.lazy(() => import(/* webpackChunkName: "vendor" */ './pages/vendor/VendorRegistrationsDashboard'));
const FormBuilderPage = React.lazy(() => import(/* webpackChunkName: "vendor" */ './pages/vendor/FormBuilderPage'));
const VendorRegisterPage = React.lazy(() => import(/* webpackChunkName: "auth" */ './pages/auth/VendorRegisterPage'));

// Teacher Dashboard Pages
const TeacherDashboardPage = React.lazy(() => import(/* webpackChunkName: "teacher" */ './pages/teacher/TeacherDashboardPage'));
const TeacherEventsPage = React.lazy(() => import(/* webpackChunkName: "teacher" */ './pages/teacher/TeacherEventsPage'));
const TeacherEventFormPage = React.lazy(() => import(/* webpackChunkName: "teacher" */ './pages/teacher/TeacherEventFormPage'));
const TeacherBookingsPage = React.lazy(() => import(/* webpackChunkName: "teacher" */ './pages/teacher/TeacherBookingsPage'));
const TeacherAnalyticsPage = React.lazy(() => import(/* webpackChunkName: "teacher" */ './pages/teacher/TeacherAnalyticsPage'));
const TeacherPayoutsPage = React.lazy(() => import(/* webpackChunkName: "teacher" */ './pages/teacher/TeacherPayoutsPage'));
const TeacherPaymentSettingsPage = React.lazy(() => import(/* webpackChunkName: "teacher" */ './pages/teacher/TeacherPaymentSettingsPage'));
const TeacherProfilePage = React.lazy(() => import(/* webpackChunkName: "teacher" */ './pages/teacher/TeacherProfilePage'));

// Admin Dashboard Pages
const AdminDashboardPage = React.lazy(() => import(/* webpackChunkName: "admin" */ './pages/admin/AdminDashboardPage'));
const AdminUsersPage = React.lazy(() => import(/* webpackChunkName: "admin" */ './pages/admin/AdminUsersPage'));
const AdminUserEditPage = React.lazy(() => import(/* webpackChunkName: "admin" */ './pages/admin/AdminUserEditPage'));
const AdminVendorsPage = React.lazy(() => import(/* webpackChunkName: "admin" */ './pages/admin/AdminVendorsPage'));
const AdminTeachersPage = React.lazy(() => import(/* webpackChunkName: "admin" */ './pages/admin/AdminTeachersPage'));
const AdminOrganizationsPage = React.lazy(() => import(/* webpackChunkName: "admin" */ './pages/admin/AdminOrganizationsPage'));

const AdminEventsPage = React.lazy(() => import(/* webpackChunkName: "admin" */ './pages/admin/AdminEventsPage'));
const AdminEditEventPage = React.lazy(() => import(/* webpackChunkName: "admin" */ './pages/admin/AdminEditEventPage'));

const AdminCategoriesPage = React.lazy(() => import(/* webpackChunkName: "admin" */ './pages/admin/AdminCategoriesPage'));
const AdminCollectionsPage = React.lazy(() => import(/* webpackChunkName: "admin" */ './pages/admin/AdminCollectionsPage'));
const AdminOrdersPage = React.lazy(() => import(/* webpackChunkName: "admin" */ './pages/admin/AdminOrdersPage'));
const AdminOrderDetailPage = React.lazy(() => import(/* webpackChunkName: "admin" */ './pages/admin/AdminOrderDetailPage'));
const AdminPayoutsPage = React.lazy(() => import(/* webpackChunkName: "admin" */ './pages/admin/AdminPayoutsPage'));
const AdminCommissionsPage = React.lazy(() => import(/* webpackChunkName: "admin" */ './pages/admin/AdminCommissionsPage'));
const AdminCommissionTransactionDetailPage = React.lazy(() => import(/* webpackChunkName: "admin" */ './pages/admin/AdminCommissionTransactionDetailPage'));
const AdminBlogsPage = React.lazy(() => import(/* webpackChunkName: "admin" */ './pages/admin/AdminBlogsPage'));
const AdminBlogEditPage = React.lazy(() => import(/* webpackChunkName: "admin" */ './pages/admin/AdminBlogEditPage'));
const AdminBlogCategoriesPage = React.lazy(() => import(/* webpackChunkName: "admin" */ './pages/admin/AdminBlogCategoriesPage'));
const BlogStyleGuidePage = React.lazy(() => import(/* webpackChunkName: "admin" */ './pages/admin/BlogStyleGuidePage'));
const AdminBannersPage = React.lazy(() => import(/* webpackChunkName: "admin" */ './pages/admin/AdminBannersPage'));
const AdminAnnouncementsPage = React.lazy(() => import(/* webpackChunkName: "admin" */ './pages/admin/AdminAnnouncementsPage'));
const AdminSEOPage = React.lazy(() => import(/* webpackChunkName: "admin" */ './pages/admin/AdminSEOPage'));
const AdminPopupsPage = React.lazy(() => import(/* webpackChunkName: "admin" */ './pages/admin/AdminPopupsPage'));
const AdminCouponsPage = React.lazy(() => import(/* webpackChunkName: "admin" */ './pages/admin/AdminCouponsPage'));
const ReelsManagementPage = React.lazy(() => import(/* webpackChunkName: "admin" */ './pages/admin/ReelsManagementPage'));
const BulkImportPage = React.lazy(() => import(/* webpackChunkName: "admin" */ './pages/admin/BulkImportPage'));
const AdminAnalyticsPage = React.lazy(() => import(/* webpackChunkName: "admin" */ './pages/admin/AdminAnalyticsPage'));
const AdminTrafficPage = React.lazy(() => import(/* webpackChunkName: "admin" */ './pages/admin/AdminTrafficPage'));
const AdminSettingsPage = React.lazy(() => import(/* webpackChunkName: "admin" */ './pages/admin/AdminSettingsPage'));
const AdminEventDetailPage = React.lazy(() => import(/* webpackChunkName: "admin" */ './pages/admin/AdminEventDetailPage'));
const AdminRegistrationDetailPage = React.lazy(() => import(/* webpackChunkName: "admin" */ './pages/admin/AdminRegistrationDetailPage'));
const EmployeeManagement = React.lazy(() => import(/* webpackChunkName: "admin" */ './pages/admin/EmployeeManagement'));
const AdminAffiliateAnalyticsPage = React.lazy(() => import(/* webpackChunkName: "admin" */ './pages/admin/AdminAffiliateAnalyticsPage'));
const AdminPartnershipsPage = React.lazy(() => import(/* webpackChunkName: "admin" */ './pages/admin/AdminPartnershipsPage'));
const AdminMediaPage = React.lazy(() => import(/* webpackChunkName: "admin" */ './pages/admin/AdminMediaPage'));
const AdminReviewsPage = React.lazy(() => import(/* webpackChunkName: "admin" */ './pages/admin/AdminReviewsPage'));
const AdminGalleriesPage = React.lazy(() => import(/* webpackChunkName: "admin" */ './pages/admin/AdminGalleriesPage'));
const AdminCertificatesPage = React.lazy(() => import(/* webpackChunkName: "admin" */ './pages/admin/AdminCertificatesPage'));
const AdminStudentsPage = React.lazy(() => import(/* webpackChunkName: "admin" */ './pages/admin/AdminStudentsPage'));
const AdminSubmissionsPage = React.lazy(() => import(/* webpackChunkName: "admin" */ './pages/admin/AdminSubmissionsPage'));

// Analytics Pages
const EventPerformance = React.lazy(() => import(/* webpackChunkName: "analytics" */ './pages/analytics/EventPerformance'));

// Upload Management Pages
const FileManager = React.lazy(() => import(/* webpackChunkName: "upload" */ './pages/upload/FileManager'));

// Employee Dashboard Pages
const EmployeeDashboard = React.lazy(() => import(/* webpackChunkName: "employee" */ './pages/employee/EmployeeDashboard'));
const EmployeeTicketScanPage = React.lazy(() => import(/* webpackChunkName: "employee" */ './pages/employee/EmployeeTicketScanPage'));
const EmployeeTasksPage = React.lazy(() => import(/* webpackChunkName: "employee" */ './pages/employee/EmployeeTasksPage'));
const EmployeeReportsPage = React.lazy(() => import(/* webpackChunkName: "employee" */ './pages/employee/EmployeeReportsPage'));

// Static Pages
const AboutPage = React.lazy(() => import(/* webpackChunkName: "static" */ './pages/static/AboutPage'));
const BlogPage = React.lazy(() => import(/* webpackChunkName: "static" */ './pages/static/BlogPage'));
const BlogDetailPage = React.lazy(() => import(/* webpackChunkName: "static" */ './pages/static/BlogDetailPage'));
const ContactPage = React.lazy(() => import(/* webpackChunkName: "static" */ './pages/static/ContactPage'));
const PrivacyPage = React.lazy(() => import(/* webpackChunkName: "static" */ './pages/static/PrivacyPage'));
const TermsPage = React.lazy(() => import(/* webpackChunkName: "static" */ './pages/static/TermsPage'));
const FAQPage = React.lazy(() => import(/* webpackChunkName: "static" */ './pages/static/FAQPage'));
const HelpPage = React.lazy(() => import(/* webpackChunkName: "static" */ './pages/static/HelpPage'));
const PartnerWithUsPage = React.lazy(() => import(/* webpackChunkName: "static" */ './pages/static/PartnerWithUsPage'));
const ForOrganizationsPage = React.lazy(() => import(/* webpackChunkName: "static" */ './pages/static/ForOrganizationsPage'));
const OrganizationsPage = React.lazy(() => import(/* webpackChunkName: "static" */ '@/pages/static/OrganizationsPage'));
const TeachRegisterPage = React.lazy(() => import(/* webpackChunkName: "static" */ './pages/static/TeachRegisterPage'));
const ReviewLinkPage = React.lazy(() => import('./pages/ReviewLinkPage'));
const CertificateVerifyPage = React.lazy(() => import('./pages/CertificateVerifyPage'));
const StudentCertificatesPage = React.lazy(() => import('./pages/StudentCertificatesPage'));

// Error Pages
const NotFoundPage = React.lazy(() => import(/* webpackChunkName: "error" */ './pages/error/NotFoundPage'));
const ServerErrorPage = React.lazy(() => import(/* webpackChunkName: "error" */ './pages/error/ServerErrorPage'));

// Dev-only pages
const EventCardPreviewPage = import.meta.env.DEV
  ? React.lazy(() => import('./pages/dev/EventCardPreviewPage'))
  : null;

// Protected Route Components
import ProtectedRoute from '@components/auth/ProtectedRoute';
import VendorRoute from '@components/auth/VendorRoute';
import TeacherRoute from '@components/auth/TeacherRoute';
import AdminRoute from '@components/auth/AdminRoute';
import EmployeeRoute from '@components/auth/EmployeeRoute';

// Hooks
import useAuth from '@hooks/useAuth';
import useLanguage from '@hooks/useLanguage';
import { useDispatch } from 'react-redux';
import { fetchSocialSettings, fetchUISettings } from '@/store/slices/settingsSlice';
import { AppDispatch } from '@/store';
import logger from '@/utils/logger';

function AppContent() {
  const location = useLocation();
  const { loading, isInitialized } = useAuth();
  const { currentLanguage } = useLanguage();
  const dispatch = useDispatch<AppDispatch>();

  usePageTracking();

  // Fetch public settings on app load
  useEffect(() => {
    dispatch(fetchSocialSettings());
    dispatch(fetchUISettings());
  }, [dispatch]);

  // Set document direction based on language
  useEffect(() => {
    document.documentElement.dir = currentLanguage === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = currentLanguage || 'en';
  }, [currentLanguage]);

  // Debug: track every render — remove once issue is diagnosed
  if (import.meta.env.DEV) {
    logger.debug('[AppContent] 🔄 Render', { isInitialized, loading, path: location.pathname });
  }

  // Show loading spinner while checking authentication
  // Wait for auth initialization to complete before rendering routes
  if (!isInitialized || loading) {
    if (import.meta.env.DEV) {
      logger.warn('[AppContent] ⏳ Showing spinner — stuck?', { isInitialized, loading });
    }
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }



  return (
    <>
      <ThemeController />
      <GlobalUploadProgress />
      <ScrollToTop />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          // Success toast - Glassmorphism with green tint
          success: {
            style: {
              background: 'rgba(16, 185, 129, 0.15)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '16px',
              color: '#065f46',
              padding: '16px 20px',
              boxShadow: '0 8px 32px 0 rgba(16, 185, 129, 0.2)',
            },
            iconTheme: {
              primary: '#10b981',
              secondary: '#ecfdf5',
            },
          },
          // Error toast - Glassmorphism with red tint
          error: {
            style: {
              background: 'rgba(239, 68, 68, 0.15)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '16px',
              color: '#7f1d1d',
              padding: '16px 20px',
              boxShadow: '0 8px 32px 0 rgba(239, 68, 68, 0.2)',
            },
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fef2f2',
            },
          },
          // Loading toast - Glassmorphism with blue tint
          loading: {
            style: {
              background: 'rgba(59, 130, 246, 0.15)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '16px',
              color: '#1e3a8a',
              padding: '16px 20px',
              boxShadow: '0 8px 32px 0 rgba(59, 130, 246, 0.2)',
            },
            iconTheme: {
              primary: '#3b82f6',
              secondary: '#eff6ff',
            },
          },
        }}
      />
      <Routes location={location}>
        {/* ============ PUBLIC ROUTES (/) ============ */}
        {/* Routes accessible to all users including guests */}
        <Route path="/" element={<Layout />}>
          {/* Home Page - No ErrorBoundary (low-risk), custom skeleton */}
          <Route index element={
            <Suspense fallback={<HomePageSkeleton />}>
              <HomePage />
            </Suspense>
          } />

          {/* Event Discovery Routes - No ErrorBoundary (low-risk) */}
          <Route path="events" element={
            <Suspense fallback={<EventsPageSkeleton />}>
              <EventsPage />
            </Suspense>
          } />
          <Route path="events/:slug" element={
            <Suspense fallback={<EventDetailSkeleton />}>
              <EventDetailPage />
            </Suspense>
          } />
          {/* Legacy: redirect old teaching-events detail URLs to the unified events page */}
          <Route path="teaching-events/:id" element={<Navigate to="/events" replace />} />

          {/* Teaching Event Public Routes */}
          <Route path="teaching-event" element={
            <Suspense fallback={<EventsPageSkeleton />}>
              <EventsPage />
            </Suspense>
          } />
          <Route path="teaching-event/:id" element={
            <PageErrorBoundary>
              <Suspense fallback={<EventDetailSkeleton />}>
                <EventDetailPage />
              </Suspense>
            </PageErrorBoundary>
          } />

          {/* Teacher/Instructor Public Profile Routes */}
          <Route path="teachers" element={
            <PageErrorBoundary>
              <Suspense fallback={<GenericPageSkeleton />}>
                <TeachersListingPage />
              </Suspense>
            </PageErrorBoundary>
          } />
          <Route path="teachers/:id" element={
            <PageErrorBoundary>
              <Suspense fallback={<GenericPageSkeleton />}>
                <TeacherPublicProfilePage />
              </Suspense>
            </PageErrorBoundary>
          } />

          {/* Instructor Profile Routes */}
          <Route path="instructors/:id" element={
            <PageErrorBoundary>
              <Suspense fallback={<GenericPageSkeleton />}>
                <InstructorDetailPage />
              </Suspense>
            </PageErrorBoundary>
          } />

          {/* Category Discovery Routes */}
          <Route path="categories" element={
            <Suspense fallback={<GenericPageSkeleton />}>
              <CategoriesPage />
            </Suspense>
          } />
          <Route path="categories/:slug" element={
            <Suspense fallback={<GenericPageSkeleton />}>
              <CategoryPage />
            </Suspense>
          } />

          {/* Collections Routes */}
          <Route path="collections" element={
            <Suspense fallback={<GenericPageSkeleton />}>
              <CollectionsPage />
            </Suspense>
          } />
          <Route path="collections/:id" element={
            <Suspense fallback={<GenericPageSkeleton />}>
              <CollectionDetailPage />
            </Suspense>
          } />

          {/* Vendor Discovery Routes */}
          <Route path="vendors" element={
            <Suspense fallback={<GenericPageSkeleton />}>
              <VendorsPage />
            </Suspense>
          } />
          <Route path="vendors/:id" element={
            <Suspense fallback={<GenericPageSkeleton />}>
              <VendorPage />
            </Suspense>
          } />

          {/* Search Functionality */}
          <Route path="search" element={
            <PageErrorBoundary>
              <Suspense fallback={<GenericPageSkeleton />}>
                <SearchPage />
              </Suspense>
            </PageErrorBoundary>
          } />

          {/* Static Information Pages */}
          <Route path="about" element={
            <Suspense fallback={<GenericPageSkeleton />}>
              <AboutPage />
            </Suspense>
          } />
          <Route path="student-program" element={
            <Suspense fallback={<GenericPageSkeleton />}>
              <StudentProgramPage />
            </Suspense>
          } />
          <Route path="partnerships" element={
            <Suspense fallback={<GenericPageSkeleton />}>
              <PartnershipsPage />
            </Suspense>
          } />
          <Route path="summer-2026" element={
            <Suspense fallback={<GenericPageSkeleton />}>
              <SummerPartnershipPage />
            </Suspense>
          } />
          <Route path="summer-partners" element={
            <Suspense fallback={<GenericPageSkeleton />}>
              <SummerPartnersDirectoryPage />
            </Suspense>
          } />
          <Route path="workshops" element={
            <Suspense fallback={<GenericPageSkeleton />}>
              <ComingJuly26Page />
            </Suspense>
          } />
          <Route path="student-summer-reg" element={
            <Suspense fallback={<GenericPageSkeleton />}>
              <StudentSummerRegPage />
            </Suspense>
          } />
          <Route path="partnership-success" element={
            <Suspense fallback={<GenericPageSkeleton />}>
              <PartnershipSuccessPage />
            </Suspense>
          } />
          <Route path="blog" element={
            <Suspense fallback={<GenericPageSkeleton />}>
              <BlogPage />
            </Suspense>
          } />
          <Route path="blog/:slug" element={
            <Suspense fallback={<GenericPageSkeleton />}>
              <BlogDetailPage />
            </Suspense>
          } />
          <Route path="contact" element={
            <Suspense fallback={<GenericPageSkeleton />}>
              <ContactPage />
            </Suspense>
          } />
          <Route path="privacy" element={
            <Suspense fallback={<GenericPageSkeleton />}>
              <PrivacyPage />
            </Suspense>
          } />
          <Route path="terms" element={
            <Suspense fallback={<GenericPageSkeleton />}>
              <TermsPage />
            </Suspense>
          } />
          <Route path="faq" element={
            <Suspense fallback={<GenericPageSkeleton />}>
              <FAQPage />
            </Suspense>
          } />
          <Route path="help" element={
            <Suspense fallback={<GenericPageSkeleton />}>
              <HelpPage />
            </Suspense>
          } />
          <Route path="partner-with-us" element={
            <Suspense fallback={<GenericPageSkeleton />}>
              <PartnerWithUsPage />
            </Suspense>
          } />
          <Route path="for-organizations" element={
            <Suspense fallback={<GenericPageSkeleton />}>
              <ForOrganizationsPage />
            </Suspense>
          } />
          <Route path="organizations" element={
            <Suspense fallback={<GenericPageSkeleton />}>
              <OrganizationsPage />
            </Suspense>
          } />
          <Route path="teacher/register" element={
            <Suspense fallback={<GenericPageSkeleton />}>
              <RegisterPage />
            </Suspense>
          } />
          <Route path="teach/register" element={
            <Suspense fallback={<GenericPageSkeleton />}>
              <TeachRegisterPage />
            </Suspense>
          } />

          {/* ============ CUSTOMER ROUTES (/) ============ */}
          {/* Routes accessible to authenticated customers */}

          {/* Shopping & Booking Routes - Consolidated */}
          <Route path="booking/:eventId" element={
            <ProtectedRoute>
              <Suspense fallback={<GenericPageSkeleton />}>
                <BookingPage />
              </Suspense>
            </ProtectedRoute>
          } />
          {/* Legacy route redirect */}
          <Route path="book/:eventId" element={<Navigate to="/booking/:eventId" replace />} />

          {/* Payment Routes */}
          <Route path="payment/success" element={
            <PageErrorBoundary>
              <Suspense fallback={<GenericPageSkeleton />}>
                <PaymentSuccessPage />
              </Suspense>
            </PageErrorBoundary>
          } />
          <Route path="payment/cancel" element={
            <Suspense fallback={<GenericPageSkeleton />}>
              <PaymentCancelPage />
            </Suspense>
          } />

          {/* Customer Dashboard Routes */}
          <Route path="dashboard" element={
            <ProtectedRoute>
              <PageErrorBoundary>
                <Suspense fallback={<GenericPageSkeleton />}>
                  <DashboardPage />
                </Suspense>
              </PageErrorBoundary>
            </ProtectedRoute>
          } />
          <Route path="profile" element={
            <ProtectedRoute>
              <Suspense fallback={<GenericPageSkeleton />}>
                <ProfilePage />
              </Suspense>
            </ProtectedRoute>
          } />
          <Route path="bookings" element={
            <ProtectedRoute>
              <Suspense fallback={<GenericPageSkeleton />}>
                <BookingsPage />
              </Suspense>
            </ProtectedRoute>
          } />
          <Route path="bookings/:event_name" element={
            <ProtectedRoute>
              <Suspense fallback={<GenericPageSkeleton />}>
                <BookingDetailPage />
              </Suspense>
            </ProtectedRoute>
          } />
          <Route path="verify-ticket/:ticketNumber" element={
            <Suspense fallback={<GenericPageSkeleton />}>
              <VerifyTicketPage />
            </Suspense>
          } />
          <Route path="favorites" element={
            <ProtectedRoute>
              <Suspense fallback={<GenericPageSkeleton />}>
                <FavoritesPage />
              </Suspense>
            </ProtectedRoute>
          } />
          <Route path="reviews" element={
            <ProtectedRoute>
              <Suspense fallback={<GenericPageSkeleton />}>
                <ReviewsPage />
              </Suspense>
            </ProtectedRoute>
          } />
          <Route path="tickets" element={
            <ProtectedRoute>
              <Suspense fallback={<GenericPageSkeleton />}>
                <MyTicketsPage />
              </Suspense>
            </ProtectedRoute>
          } />
          <Route path="dashboard/change-password" element={
            <ProtectedRoute>
              <Suspense fallback={<GenericPageSkeleton />}>
                <ChangePasswordPage />
              </Suspense>
            </ProtectedRoute>
          } />

          {/* Registration Routes */}
          <Route path="registrations" element={
            <ProtectedRoute>
              <Suspense fallback={<GenericPageSkeleton />}>
                <UserRegistrationsPage />
              </Suspense>
            </ProtectedRoute>
          } />
          <Route path="registrations/:registrationId" element={
            <ProtectedRoute>
              <Suspense fallback={<GenericPageSkeleton />}>
                <RegistrationDetailPage />
              </Suspense>
            </ProtectedRoute>
          } />

          {/* Auth Pages (with Layout) */}
          <Route path="login" element={
            <Suspense fallback={<GenericPageSkeleton />}>
              <LoginPage />
            </Suspense>
          } />
          <Route path="register" element={
            <Suspense fallback={<GenericPageSkeleton />}>
              <RegisterPage />
            </Suspense>
          } />

          {/* Error Pages */}
          <Route path="500" element={
            <Suspense fallback={<GenericPageSkeleton />}>
              <ServerErrorPage />
            </Suspense>
          } />

          {/* Dev-only: EventCard variant preview */}
          {import.meta.env.DEV && EventCardPreviewPage && (
            <Route path="dev/event-cards" element={
              <Suspense fallback={<GenericPageSkeleton />}>
                <EventCardPreviewPage />
              </Suspense>
            } />
          )}

          {/* Certificate Lookup — rendered inside Layout (nav + footer) */}
          <Route path="certificates/lookup" element={
            <Suspense fallback={<GenericPageSkeleton />}>
              <StudentCertificatesPage />
            </Suspense>
          } />

          <Route path="*" element={
            <Suspense fallback={<GenericPageSkeleton />}>
              <NotFoundPage />
            </Suspense>
          } />
        </Route>

        {/* ============ VENDOR ROUTES (/vendor) ============ */}
        {/* Routes accessible only to vendors */}
        <Route path="/vendor" element={<Layout />}>
          <Route element={<VendorRoute />}>
            <Route element={<Suspense fallback={<GenericPageSkeleton />}><VendorLayout /></Suspense>}>
              {/* Vendor Dashboard */}
              <Route index element={
                <Suspense fallback={<GenericPageSkeleton />}>
                  <VendorDashboardPage />
                </Suspense>
              } />

              {/* Vendor Registration - Public (Technically this should probably not be under VendorRoute if it's for registration, 
                  but the original code had it under /vendor. However, VendorRoute redirects to login if not vendor. 
                  Wait, VendorRegisterPage is likely for new vendors. 
                  The original code had:
                  <Route path="register" element={<Suspense...><VendorRegisterPage /></Suspense>} />
                  It was NOT wrapped in VendorRoute.
                  So I need to keep it outside the VendorRoute wrapper.
              */}
            </Route>
          </Route>

          {/* Vendor Registration - Public, outside VendorRoute/VendorLayout */}
          <Route path="register" element={
            <Suspense fallback={<GenericPageSkeleton />}>
              <VendorRegisterPage />
            </Suspense>
          } />

          {/* Protected Vendor Routes */}
          <Route element={<VendorRoute />}>
            <Route element={<Suspense fallback={<GenericPageSkeleton />}><VendorLayout /></Suspense>}>

              {/* Event Management */}
              <Route path="events" element={
                <PageErrorBoundary>
                  <Suspense fallback={<GenericPageSkeleton />}>
                    <VendorEventsPage />
                  </Suspense>
                </PageErrorBoundary>
              } />
              <Route path="events/create" element={
                <Suspense fallback={<GenericPageSkeleton />}>
                  <VendorEventFormPage />
                </Suspense>
              } />
              <Route path="events/:id" element={
                <Suspense fallback={<GenericPageSkeleton />}>
                  <VendorEventDetailPage />
                </Suspense>
              } />
              <Route path="events/:id/edit" element={
                <Suspense fallback={<GenericPageSkeleton />}>
                  <VendorEventFormPage />
                </Suspense>
              } />

              {/* Claimed Affiliate Events */}
              <Route path="claimed-events" element={
                <Suspense fallback={<GenericPageSkeleton />}>
                  <VendorClaimedEventsPage />
                </Suspense>
              } />

              {/* Booking Management */}
              <Route path="bookings" element={
                <Suspense fallback={<GenericPageSkeleton />}>
                  <VendorBookingsPage />
                </Suspense>
              } />
              <Route path="bookings/:id" element={
                <Suspense fallback={<GenericPageSkeleton />}>
                  <VendorBookingDetailPage />
                </Suspense>
              } />

              {/* Employee Management */}
              <Route path="employees" element={
                <Suspense fallback={<GenericPageSkeleton />}>
                  <VendorEmployeesPage />
                </Suspense>
              } />
              <Route path="employees/create" element={
                <Suspense fallback={<GenericPageSkeleton />}>
                  <VendorCreateEmployeePage />
                </Suspense>
              } />
              <Route path="employees/:id/edit" element={
                <Suspense fallback={<GenericPageSkeleton />}>
                  <VendorEditEmployeePage />
                </Suspense>
              } />

              {/* Analytics & Reports */}
              <Route path="analytics" element={
                <Suspense fallback={<GenericPageSkeleton />}>
                  <VendorAnalyticsPage />
                </Suspense>
              } />
              <Route path="analytics/events/:eventId" element={
                <Suspense fallback={<GenericPageSkeleton />}>
                  <EventPerformance />
                </Suspense>
              } />

              {/* File Management */}
              <Route path="files" element={
                <Suspense fallback={<GenericPageSkeleton />}>
                  <FileManager />
                </Suspense>
              } />

              {/* Vendor Profile */}
              <Route path="profile" element={
                <Suspense fallback={<GenericPageSkeleton />}>
                  <VendorProfilePage />
                </Suspense>
              } />

              {/* Payouts */}
              <Route path="payouts" element={
                <Suspense fallback={<GenericPageSkeleton />}>
                  <VendorPayoutsDashboard />
                </Suspense>
              } />

              {/* Payment Settings - Redirect to Profile */}
              <Route path="payment-settings" element={
                <Navigate to="/vendor/profile" replace />
              } />

              {/* Registration Management */}
              <Route path="events/:eventId/registrations" element={
                <Suspense fallback={<GenericPageSkeleton />}>
                  <VendorRegistrationsDashboard />
                </Suspense>
              } />
              <Route path="events/:eventId/registration/builder" element={
                <Suspense fallback={<GenericPageSkeleton />}>
                  <FormBuilderPage />
                </Suspense>
              } />
              <Route path="registrations/:registrationId" element={
                <Suspense fallback={<GenericPageSkeleton />}>
                  <RegistrationDetailPage />
                </Suspense>
              } />
            </Route>
          </Route>
        </Route>

        {/* ============ TEACHER ROUTES (/teacher) ============ */}
        {/* Routes accessible only to teachers */}
        <Route path="/teacher" element={<Layout />}>
          {/* Teacher Dashboard */}
          <Route index element={
            <TeacherRoute>
              <Suspense fallback={<GenericPageSkeleton />}>
                <TeacherDashboardPage />
              </Suspense>
            </TeacherRoute>
          } />

          {/* Teaching Events Management */}
          <Route path="events" element={
            <TeacherRoute>
              <PageErrorBoundary>
                <Suspense fallback={<GenericPageSkeleton />}>
                  <TeacherEventsPage />
                </Suspense>
              </PageErrorBoundary>
            </TeacherRoute>
          } />
          <Route path="events/create" element={
            <TeacherRoute>
              <Suspense fallback={<GenericPageSkeleton />}>
                <TeacherEventFormPage />
              </Suspense>
            </TeacherRoute>
          } />
          <Route path="events/:slug/edit" element={
            <TeacherRoute>
              <Suspense fallback={<GenericPageSkeleton />}>
                <TeacherEventFormPage />
              </Suspense>
            </TeacherRoute>
          } />
          <Route path="events/:slug" element={
            <TeacherRoute>
              <Suspense fallback={<GenericPageSkeleton />}>
                <TeacherEventFormPage />
              </Suspense>
            </TeacherRoute>
          } />

          {/* Bookings Management */}
          <Route path="bookings" element={
            <TeacherRoute>
              <Suspense fallback={<GenericPageSkeleton />}>
                <TeacherBookingsPage />
              </Suspense>
            </TeacherRoute>
          } />

          {/* Teacher Profile */}
          <Route path="profile" element={
            <TeacherRoute>
              <Suspense fallback={<GenericPageSkeleton />}>
                <TeacherProfilePage />
              </Suspense>
            </TeacherRoute>
          } />

          {/* Settings - Redirect to Profile */}
          <Route path="settings" element={
            <TeacherRoute>
              <Navigate to="/teacher/profile" replace />
            </TeacherRoute>
          } />

          {/* Students - Redirect to Bookings */}
          <Route path="students" element={
            <TeacherRoute>
              <Navigate to="/teacher/bookings" replace />
            </TeacherRoute>
          } />

          {/* Analytics */}
          <Route path="analytics" element={
            <TeacherRoute>
              <Suspense fallback={<GenericPageSkeleton />}>
                <TeacherAnalyticsPage />
              </Suspense>
            </TeacherRoute>
          } />

          {/* Payouts */}
          <Route path="payouts" element={
            <TeacherRoute>
              <Suspense fallback={<GenericPageSkeleton />}>
                <TeacherPayoutsPage />
              </Suspense>
            </TeacherRoute>
          } />

          {/* Payment Settings */}
          <Route path="payment-settings" element={
            <TeacherRoute>
              <Suspense fallback={<GenericPageSkeleton />}>
                <TeacherPaymentSettingsPage />
              </Suspense>
            </TeacherRoute>
          } />
        </Route>

        {/* ============ EMPLOYEE ROUTES (/employee) ============ */}
        {/* Routes accessible only to employees */}
        <Route path="/employee" element={<Layout />}>
          {/* Employee Dashboard */}
          <Route index element={
            <EmployeeRoute>
              <Suspense fallback={<GenericPageSkeleton />}>
                <EmployeeDashboard />
              </Suspense>
            </EmployeeRoute>
          } />

          {/* Task Management */}
          <Route path="tasks" element={
            <EmployeeRoute>
              <Suspense fallback={<GenericPageSkeleton />}>
                <EmployeeTasksPage />
              </Suspense>
            </EmployeeRoute>
          } />

          {/* Ticket Scanning */}
          <Route path="scanner" element={
            <EmployeeRoute>
              <Suspense fallback={<GenericPageSkeleton />}>
                <EmployeeTicketScanPage />
              </Suspense>
            </EmployeeRoute>
          } />

          {/* Reports */}
          <Route path="reports" element={
            <EmployeeRoute>
              <Suspense fallback={<GenericPageSkeleton />}>
                <EmployeeReportsPage />
              </Suspense>
            </EmployeeRoute>
          } />
        </Route>

        {/* ============ ADMIN ROUTES (/admin) ============ */}
        {/* Routes accessible only to administrators */}
        <Route path="/admin" element={<AdminLayout />}>
          {/* Admin Dashboard - Keep ErrorBoundary for critical pages */}
          <Route index element={
            <AdminRoute>
              <PageErrorBoundary>
                <Suspense fallback={<AdminDashboardSkeleton />}>
                  <AdminDashboardPage />
                </Suspense>
              </PageErrorBoundary>
            </AdminRoute>
          } />

          {/* User Management */}
          <Route path="users" element={
            <AdminRoute>
              <Suspense fallback={<GenericPageSkeleton />}>
                <AdminUsersPage />
              </Suspense>
            </AdminRoute>
          } />
          <Route path="users/:id/edit" element={
            <AdminRoute>
              <Suspense fallback={<GenericPageSkeleton />}>
                <AdminUserEditPage />
              </Suspense>
            </AdminRoute>
          } />

          {/* Vendor Management */}
          <Route path="vendors" element={
            <AdminRoute>
              <Suspense fallback={<GenericPageSkeleton />}>
                <AdminVendorsPage />
              </Suspense>
            </AdminRoute>
          } />

          {/* Teacher Management */}
          <Route path="teachers" element={
            <AdminRoute>
              <Suspense fallback={<GenericPageSkeleton />}>
                <AdminTeachersPage />
              </Suspense>
            </AdminRoute>
          } />

          {/* Organization Management */}
          <Route path="organizations" element={
            <AdminRoute>
              <Suspense fallback={<GenericPageSkeleton />}>
                <AdminOrganizationsPage />
              </Suspense>
            </AdminRoute>
          } />

          {/* Teaching Events — consolidated into Events. Redirect all old URLs */}
          <Route path="teaching-events" element={<Navigate to="/admin/events" replace />} />
          <Route path="teaching-events/create" element={<Navigate to="/admin/events/create" replace />} />
          <Route path="teaching-events/:id/edit" element={<Navigate to="/admin/events" replace />} />

          {/* Event Management */}
          <Route path="events" element={
            <AdminRoute>
              <PageErrorBoundary>
                <Suspense fallback={<GenericPageSkeleton />}>
                  <AdminEventsPage />
                </Suspense>
              </PageErrorBoundary>
            </AdminRoute>
          } />
          <Route path="events/create" element={
            <AdminRoute>
              <PageErrorBoundary>
                <Suspense fallback={<GenericPageSkeleton />}>
                  <AdminEditEventPage />
                </Suspense>
              </PageErrorBoundary>
            </AdminRoute>
          } />
          <Route path="events/:id/edit" element={
            <AdminRoute>
              <PageErrorBoundary>
                <Suspense fallback={<GenericPageSkeleton />}>
                  <AdminEditEventPage />
                </Suspense>
              </PageErrorBoundary>
            </AdminRoute>
          } />
          <Route path="events/:id" element={
            <AdminRoute>
              <PageErrorBoundary>
                <Suspense fallback={<GenericPageSkeleton />}>
                  <AdminEventDetailPage />
                </Suspense>
              </PageErrorBoundary>
            </AdminRoute>
          } />
          <Route path="registrations/:id" element={
            <AdminRoute>
              <PageErrorBoundary>
                <Suspense fallback={<GenericPageSkeleton />}>
                  <AdminRegistrationDetailPage />
                </Suspense>
              </PageErrorBoundary>
            </AdminRoute>
          } />
          <Route path="events/:eventId/registration/builder" element={
            <AdminRoute>
              <Suspense fallback={<GenericPageSkeleton />}>
                <FormBuilderPage />
              </Suspense>
            </AdminRoute>
          } />

          {/* Review Moderation */}
          <Route path="reviews" element={
            <AdminRoute>
              <Suspense fallback={<GenericPageSkeleton />}>
                <AdminReviewsPage />
              </Suspense>
            </AdminRoute>
          } />

          {/* Gallery Management */}
          <Route path="galleries" element={
            <AdminRoute>
              <Suspense fallback={<GenericPageSkeleton />}>
                <AdminGalleriesPage />
              </Suspense>
            </AdminRoute>
          } />

          {/* Certificate Management */}
          <Route path="certificates" element={
            <AdminRoute>
              <Suspense fallback={<GenericPageSkeleton />}>
                <AdminCertificatesPage />
              </Suspense>
            </AdminRoute>
          } />

          {/* Student Management */}
          <Route path="students" element={
            <AdminRoute>
              <Suspense fallback={<GenericPageSkeleton />}>
                <AdminStudentsPage />
              </Suspense>
            </AdminRoute>
          } />

          {/* Category Management */}
          <Route path="categories" element={
            <AdminRoute>
              <Suspense fallback={<GenericPageSkeleton />}>
                <AdminCategoriesPage />
              </Suspense>
            </AdminRoute>
          } />

          {/* Collection Management */}
          <Route path="collections" element={
            <AdminRoute>
              <Suspense fallback={<GenericPageSkeleton />}>
                <AdminCollectionsPage />
              </Suspense>
            </AdminRoute>
          } />

          {/* Order Management */}
          <Route path="orders" element={
            <AdminRoute>
              <Suspense fallback={<GenericPageSkeleton />}>
                <AdminOrdersPage />
              </Suspense>
            </AdminRoute>
          } />
          <Route path="orders/:id" element={
            <AdminRoute>
              <Suspense fallback={<GenericPageSkeleton />}>
                <AdminOrderDetailPage />
              </Suspense>
            </AdminRoute>
          } />

          {/* Payout Management */}
          <Route path="payouts" element={
            <AdminRoute>
              <Suspense fallback={<GenericPageSkeleton />}>
                <AdminPayoutsPage />
              </Suspense>
            </AdminRoute>
          } />

          {/* Commission Management */}
          <Route path="commissions" element={
            <AdminRoute>
              <Suspense fallback={<GenericPageSkeleton />}>
                <AdminCommissionsPage />
              </Suspense>
            </AdminRoute>
          } />
          <Route path="commissions/transactions/:id" element={
            <AdminRoute>
              <Suspense fallback={<GenericPageSkeleton />}>
                <AdminCommissionTransactionDetailPage />
              </Suspense>
            </AdminRoute>
          } />

          {/* Blog Management */}
          <Route path="blogs" element={
            <AdminRoute>
              <Suspense fallback={<GenericPageSkeleton />}>
                <AdminBlogsPage />
              </Suspense>
            </AdminRoute>
          } />
          <Route path="blogs/create" element={
            <AdminRoute>
              <Suspense fallback={<GenericPageSkeleton />}>
                <AdminBlogEditPage />
              </Suspense>
            </AdminRoute>
          } />
          <Route path="blogs/:id/edit" element={
            <AdminRoute>
              <Suspense fallback={<GenericPageSkeleton />}>
                <AdminBlogEditPage />
              </Suspense>
            </AdminRoute>
          } />

          {/* Blog Category Management */}
          <Route path="blog-categories" element={
            <AdminRoute>
              <Suspense fallback={<GenericPageSkeleton />}>
                <AdminBlogCategoriesPage />
              </Suspense>
            </AdminRoute>
          } />

          {/* Blog Style Guide */}
          <Route path="blog-style-guide" element={
            <AdminRoute>
              <Suspense fallback={<GenericPageSkeleton />}>
                <BlogStyleGuidePage />
              </Suspense>
            </AdminRoute>
          } />

          {/* Banner Management */}
          <Route path="banners" element={
            <AdminRoute>
              <Suspense fallback={<GenericPageSkeleton />}>
                <AdminBannersPage />
              </Suspense>
            </AdminRoute>
          } />

          {/* Announcement Bar Management */}
          <Route path="announcements" element={
            <AdminRoute>
              <Suspense fallback={<GenericPageSkeleton />}>
                <AdminAnnouncementsPage />
              </Suspense>
            </AdminRoute>
          } />

          {/* SEO Content Management */}
          <Route path="seo" element={
            <AdminRoute>
              <Suspense fallback={<GenericPageSkeleton />}>
                <AdminSEOPage />
              </Suspense>
            </AdminRoute>
          } />

          {/* Popup Notifications Management */}
          <Route path="popups" element={
            <AdminRoute>
              <Suspense fallback={<GenericPageSkeleton />}>
                <AdminPopupsPage />
              </Suspense>
            </AdminRoute>
          } />

          {/* Media Library */}
          <Route path="media" element={
            <AdminRoute>
              <Suspense fallback={<GenericPageSkeleton />}>
                <AdminMediaPage />
              </Suspense>
            </AdminRoute>
          } />

          {/* Coupon Management */}
          <Route path="coupons" element={
            <AdminRoute>
              <Suspense fallback={<GenericPageSkeleton />}>
                <AdminCouponsPage />
              </Suspense>
            </AdminRoute>
          } />

          {/* Reels Management */}
          <Route path="reels" element={
            <AdminRoute>
              <Suspense fallback={<GenericPageSkeleton />}>
                <ReelsManagementPage />
              </Suspense>
            </AdminRoute>
          } />

          {/* Bulk Import/Export */}
          <Route path="bulk-import" element={
            <AdminRoute>
              <Suspense fallback={<GenericPageSkeleton />}>
                <BulkImportPage />
              </Suspense>
            </AdminRoute>
          } />

          {/* Partnership Management */}
          <Route path="partnerships" element={
            <AdminRoute>
              <Suspense fallback={<GenericPageSkeleton />}>
                <AdminPartnershipsPage />
              </Suspense>
            </AdminRoute>
          } />

          {/* Analytics & Reports */}
          <Route path="analytics" element={
            <AdminRoute>
              <Suspense fallback={<GenericPageSkeleton />}>
                <AdminAnalyticsPage />
              </Suspense>
            </AdminRoute>
          } />
          <Route path="traffic" element={
            <AdminRoute>
              <Suspense fallback={<GenericPageSkeleton />}>
                <AdminTrafficPage />
              </Suspense>
            </AdminRoute>
          } />
          <Route path="analytics/events/:eventId" element={
            <AdminRoute>
              <Suspense fallback={<GenericPageSkeleton />}>
                <EventPerformance />
              </Suspense>
            </AdminRoute>
          } />
          <Route path="analytics/affiliate-events" element={
            <AdminRoute>
              <Suspense fallback={<GenericPageSkeleton />}>
                <AdminAffiliateAnalyticsPage />
              </Suspense>
            </AdminRoute>
          } />

          {/* Employee Management */}
          <Route path="employees" element={
            <AdminRoute>
              <Suspense fallback={<GenericPageSkeleton />}>
                <EmployeeManagement />
              </Suspense>
            </AdminRoute>
          } />

          {/* File Management */}
          <Route path="files" element={
            <AdminRoute>
              <Suspense fallback={<GenericPageSkeleton />}>
                <FileManager />
              </Suspense>
            </AdminRoute>
          } />

          {/* System Settings */}
          <Route path="settings" element={
            <AdminRoute>
              <Suspense fallback={<GenericPageSkeleton />}>
                <AdminSettingsPage />
              </Suspense>
            </AdminRoute>
          } />

          {/* Form Submissions (Contact + Newsletter) */}
          <Route path="submissions" element={
            <AdminRoute>
              <Suspense fallback={<GenericPageSkeleton />}>
                <AdminSubmissionsPage />
              </Suspense>
            </AdminRoute>
          } />
        </Route>

        {/* Public standalone routes */}
        <Route path="review/:eventId" element={
          <Suspense fallback={<GenericPageSkeleton />}>
            <ReviewLinkPage />
          </Suspense>
        } />
        <Route path="certificates/verify/:serialNumber" element={
          <Suspense fallback={<GenericPageSkeleton />}>
            <CertificateVerifyPage />
          </Suspense>
        } />
        {/* Auth Routes (without layout) */}
        <Route path="forgot-password" element={
          <Suspense fallback={<GenericPageSkeleton />}>
            <ForgotPasswordPage />
          </Suspense>
        } />
        <Route path="reset-password" element={
          <Suspense fallback={<GenericPageSkeleton />}>
            <ResetPasswordPage />
          </Suspense>
        } />
        <Route path="verify-email" element={
          <Suspense fallback={<GenericPageSkeleton />}>
            <VerifyEmailPage />
          </Suspense>
        } />
      </Routes>
    </>
  );
}

function App() {
  // Note: i18n is initialized in main.tsx before React renders
  // Note: Redux Provider and PersistGate are set up in main.tsx
  // This prevents double wrapping and potential state issues
  // Note: Stripe Elements are provided by StripeElementsWrapper in payment components
  return <AppContent />;
}

export default App;