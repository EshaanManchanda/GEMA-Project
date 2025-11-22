import React, { Suspense, useEffect, lazy } from 'react';
import { Routes, Route, useLocation, Outlet, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
// Stripe Elements are handled by StripeElementsWrapper in payment components
// No need for global Elements provider

// Layout Components
import Layout from '@components/layout/Layout';
import AdminLayout from '@components/layout/AdminLayout';
import LoadingSpinner from '@components/common/LoadingSpinner';
import ScrollToTop from '@components/common/ScrollToTop';

// Page Components (Lazy loaded for better performance)
const HomePage = React.lazy(() => import(/* webpackChunkName: "home" */ './pages/HomePage'));
const EventsPage = React.lazy(() => import(/* webpackChunkName: "events" */ './pages/EventsPage'));
const EventDetailPage = React.lazy(() => import(/* webpackChunkName: "events" */ './pages/EventDetailPage'));
const CategoriesPage = React.lazy(() => import(/* webpackChunkName: "categories" */ './pages/CategoriesPage'));
const CategoryPage = React.lazy(() => import(/* webpackChunkName: "categories" */ './pages/CategoryPage'));
const CollectionsPage = React.lazy(() => import(/* webpackChunkName: "collections" */ './pages/CollectionsPage'));
const CollectionDetailPage = React.lazy(() => import(/* webpackChunkName: "collections" */ './pages/CollectionDetailPage'));
const VendorsPage = React.lazy(() => import(/* webpackChunkName: "vendors" */ './pages/VendorsPage'));
const VendorPage = React.lazy(() => import(/* webpackChunkName: "vendors" */ './pages/VendorPage'));
const SearchPage = React.lazy(() => import(/* webpackChunkName: "search" */ './pages/SearchPage'));
const BookingPage = React.lazy(() => import(/* webpackChunkName: "booking" */ './pages/BookingPage'));
const CartPage = React.lazy(() => import(/* webpackChunkName: "cart" */ './pages/CartPage'));
const CheckoutPage = React.lazy(() => import(/* webpackChunkName: "payment" */ './pages/CheckoutPage'));
const PaymentSuccessPage = React.lazy(() => import(/* webpackChunkName: "payment" */ './pages/PaymentSuccessPage'));
const PaymentCancelPage = React.lazy(() => import(/* webpackChunkName: "payment" */ './pages/PaymentCancelPage'));

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

// Registration Pages
const UserRegistrationsPage = React.lazy(() => import(/* webpackChunkName: "registration" */ './pages/UserRegistrationsPage'));
const RegistrationDetailPage = React.lazy(() => import(/* webpackChunkName: "registration" */ './pages/RegistrationDetailPage'));

// Vendor Dashboard Pages
const VendorDashboardPage = React.lazy(() => import(/* webpackChunkName: "vendor" */ './pages/vendor/VendorDashboardPage'));
const VendorEventsPage = React.lazy(() => import(/* webpackChunkName: "vendor" */ './pages/vendor/VendorEventsPage'));
const VendorCreateEventPage = React.lazy(() => import(/* webpackChunkName: "vendor" */ './pages/vendor/VendorCreateEventPage'));
const VendorEditEventPage = React.lazy(() => import(/* webpackChunkName: "vendor" */ './pages/vendor/VendorEditEventPage'));
const VendorBookingsPage = React.lazy(() => import(/* webpackChunkName: "vendor" */ './pages/vendor/VendorBookingsPage'));
const VendorEmployeesPage = React.lazy(() => import(/* webpackChunkName: "vendor" */ './pages/vendor/VendorEmployeesPage'));
const VendorCreateEmployeePage = React.lazy(() => import(/* webpackChunkName: "vendor" */ './pages/vendor/VendorCreateEmployeePage'));
const VendorEditEmployeePage = React.lazy(() => import(/* webpackChunkName: "vendor" */ './pages/vendor/VendorEditEmployeePage'));
const VendorPayoutsDashboard = React.lazy(() => import(/* webpackChunkName: "vendor" */ './pages/vendor/VendorPayoutsDashboard'));
// const VendorAnalyticsPage = React.lazy(() => import(/* webpackChunkName: "vendor" */ './pages/vendor/VendorAnalyticsPage'));
const VendorProfilePage = React.lazy(() => import(/* webpackChunkName: "vendor" */ './pages/vendor/VendorProfilePage'));
const VendorClaimedEventsPage = React.lazy(() => import(/* webpackChunkName: "vendor" */ './pages/vendor/VendorClaimedEventsPage'));

// Vendor Registration Pages
const VendorRegistrationsDashboard = React.lazy(() => import(/* webpackChunkName: "vendor" */ './pages/vendor/VendorRegistrationsDashboard'));
const FormBuilderPage = React.lazy(() => import(/* webpackChunkName: "vendor" */ './pages/vendor/FormBuilderPage'));

// Admin Dashboard Pages
const AdminDashboardPage = React.lazy(() => import(/* webpackChunkName: "admin" */ './pages/admin/AdminDashboardPage'));
const AdminUsersPage = React.lazy(() => import(/* webpackChunkName: "admin" */ './pages/admin/AdminUsersPage'));
const AdminVendorsPage = React.lazy(() => import(/* webpackChunkName: "admin" */ './pages/admin/AdminVendorsPage'));
const AdminEventsPage = React.lazy(() => import(/* webpackChunkName: "admin" */ './pages/admin/AdminEventsPage'));
const AdminEditEventPage = React.lazy(() => import(/* webpackChunkName: "admin" */ './pages/admin/AdminEditEventPage'));
const AdminVenuesPage = React.lazy(() => import(/* webpackChunkName: "admin" */ './pages/admin/AdminVenuesPage'));
const CreateVenuePage = React.lazy(() => import(/* webpackChunkName: "admin" */ './pages/admin/CreateVenuePage'));
const EditVenuePage = React.lazy(() => import(/* webpackChunkName: "admin" */ './pages/admin/EditVenuePage'));
const AdminCategoriesPage = React.lazy(() => import(/* webpackChunkName: "admin" */ './pages/admin/AdminCategoriesPage'));
const AdminOrdersPage = React.lazy(() => import(/* webpackChunkName: "admin" */ './pages/admin/AdminOrdersPage'));
const AdminPayoutsPage = React.lazy(() => import(/* webpackChunkName: "admin" */ './pages/admin/AdminPayoutsPage'));
const AdminCommissionsPage = React.lazy(() => import(/* webpackChunkName: "admin" */ './pages/admin/AdminCommissionsPage'));
const AdminBlogsPage = React.lazy(() => import(/* webpackChunkName: "admin" */ './pages/admin/AdminBlogsPage'));
const AdminBlogCategoriesPage = React.lazy(() => import(/* webpackChunkName: "admin" */ './pages/admin/AdminBlogCategoriesPage'));
const AdminCouponsPage = React.lazy(() => import(/* webpackChunkName: "admin" */ './pages/admin/AdminCouponsPage'));
const AdminAnalyticsPage = React.lazy(() => import(/* webpackChunkName: "admin" */ './pages/admin/AdminAnalyticsPage'));
const AdminSettingsPage = React.lazy(() => import(/* webpackChunkName: "admin" */ './pages/admin/AdminSettingsPage'));
const EmployeeManagement = React.lazy(() => import(/* webpackChunkName: "admin" */ './pages/admin/EmployeeManagement'));
const AdminAffiliateAnalyticsPage = React.lazy(() => import(/* webpackChunkName: "admin" */ './pages/admin/AdminAffiliateAnalyticsPage'));

// Analytics Pages
const AnalyticsDashboard = React.lazy(() => import(/* webpackChunkName: "analytics" */ './pages/analytics/AnalyticsDashboard'));
const EventPerformance = React.lazy(() => import(/* webpackChunkName: "analytics" */ './pages/analytics/EventPerformance'));

// Upload Management Pages
const FileManager = React.lazy(() => import(/* webpackChunkName: "upload" */ './pages/upload/FileManager'));

// Employee Dashboard Pages
const EmployeeDashboard = React.lazy(() => import(/* webpackChunkName: "employee" */ './pages/employee/EmployeeDashboard'));
const EmployeeTicketScanPage = React.lazy(() => import(/* webpackChunkName: "employee" */ './pages/employee/EmployeeTicketScanPage'));

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

// Error Pages
const NotFoundPage = React.lazy(() => import(/* webpackChunkName: "error" */ './pages/error/NotFoundPage'));
const ServerErrorPage = React.lazy(() => import(/* webpackChunkName: "error" */ './pages/error/ServerErrorPage'));

// Protected Route Components
import ProtectedRoute from '@components/auth/ProtectedRoute';
import VendorRoute from '@components/auth/VendorRoute';
import AdminRoute from '@components/auth/AdminRoute';
import EmployeeRoute from '@components/auth/EmployeeRoute';

// Hooks
import useAuth from '@hooks/useAuth';
import useLanguage from '@hooks/useLanguage';

function AppContent() {
  const location = useLocation();
  const { loading } = useAuth();
  const { currentLanguage } = useLanguage();

  // Set document direction based on language
  useEffect(() => {
    document.documentElement.dir = currentLanguage === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = currentLanguage || 'en';
  }, [currentLanguage]);

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <>
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
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          {/* ============ PUBLIC ROUTES (/) ============ */}
          {/* Routes accessible to all users including guests */}
          <Route path="/" element={<Layout />}>
            {/* Home Page */}
            <Route index element={
              <Suspense fallback={<LoadingSpinner />}>
                <HomePage />
              </Suspense>
            } />
            
            {/* Event Discovery Routes */}
            <Route path="events" element={
              <Suspense fallback={<LoadingSpinner />}>
                <EventsPage />
              </Suspense>
            } />
            <Route path="events/:id" element={
              <Suspense fallback={<LoadingSpinner />}>
                <EventDetailPage />
              </Suspense>
            } />
            
            {/* Category Discovery Routes */}
            <Route path="categories" element={
              <Suspense fallback={<LoadingSpinner />}>
                <CategoriesPage />
              </Suspense>
            } />
            <Route path="categories/:slug" element={
              <Suspense fallback={<LoadingSpinner />}>
                <CategoryPage />
              </Suspense>
            } />

            {/* Collections Routes */}
            <Route path="collections" element={
              <Suspense fallback={<LoadingSpinner />}>
                <CollectionsPage />
              </Suspense>
            } />
            <Route path="collections/:id" element={
              <Suspense fallback={<LoadingSpinner />}>
                <CollectionDetailPage />
              </Suspense>
            } />
            
            {/* Vendor Discovery Routes */}
            <Route path="vendors" element={
              <Suspense fallback={<LoadingSpinner />}>
                <VendorsPage />
              </Suspense>
            } />
            <Route path="vendors/:id" element={
              <Suspense fallback={<LoadingSpinner />}>
                <VendorPage />
              </Suspense>
            } />
            
            {/* Search Functionality */}
            <Route path="search" element={
              <Suspense fallback={<LoadingSpinner />}>
                <SearchPage />
              </Suspense>
            } />
            
            {/* Static Information Pages */}
            <Route path="about" element={
              <Suspense fallback={<LoadingSpinner />}>
                <AboutPage />
              </Suspense>
            } />
            <Route path="blog" element={
              <Suspense fallback={<LoadingSpinner />}>
                <BlogPage />
              </Suspense>
            } />
            <Route path="blog/:slug" element={
              <Suspense fallback={<LoadingSpinner />}>
                <BlogDetailPage />
              </Suspense>
            } />
            <Route path="contact" element={
              <Suspense fallback={<LoadingSpinner />}>
                <ContactPage />
              </Suspense>
            } />
            <Route path="privacy" element={
              <Suspense fallback={<LoadingSpinner />}>
                <PrivacyPage />
              </Suspense>
            } />
            <Route path="terms" element={
              <Suspense fallback={<LoadingSpinner />}>
                <TermsPage />
              </Suspense>
            } />
            <Route path="faq" element={
              <Suspense fallback={<LoadingSpinner />}>
                <FAQPage />
              </Suspense>
            } />
            <Route path="help" element={
              <Suspense fallback={<LoadingSpinner />}>
                <HelpPage />
              </Suspense>
            } />
            <Route path="partner-with-us" element={
              <Suspense fallback={<LoadingSpinner />}>
                <PartnerWithUsPage />
              </Suspense>
            } />
            
            {/* ============ CUSTOMER ROUTES (/) ============ */}
            {/* Routes accessible to authenticated customers */}
            
            {/* Shopping & Booking Routes */}
            <Route path="book/:eventId" element={
              <ProtectedRoute>
                <Suspense fallback={<LoadingSpinner />}>
                  <BookingPage />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="booking/:eventId" element={
              <ProtectedRoute>
                <Suspense fallback={<LoadingSpinner />}>
                  <BookingPage />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="booking/:id" element={
              <ProtectedRoute>
                <Suspense fallback={<LoadingSpinner />}>
                  <BookingPage />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="booking" element={
              <ProtectedRoute>
                <Suspense fallback={<LoadingSpinner />}>
                  <BookingPage />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="cart" element={
              <Suspense fallback={<LoadingSpinner />}>
                <CartPage />
              </Suspense>
            } />
            <Route path="checkout" element={
              <ProtectedRoute>
                <Suspense fallback={<LoadingSpinner />}>
                  <CheckoutPage />
                </Suspense>
              </ProtectedRoute>
            } />
            
            {/* Payment Routes */}
            <Route path="payment/success" element={
              <Suspense fallback={<LoadingSpinner />}>
                <PaymentSuccessPage />
              </Suspense>
            } />
            <Route path="payment/cancel" element={
              <Suspense fallback={<LoadingSpinner />}>
                <PaymentCancelPage />
              </Suspense>
            } />
            
            {/* Customer Dashboard Routes */}
            <Route path="dashboard" element={
              <ProtectedRoute>
                <Suspense fallback={<LoadingSpinner />}>
                  <DashboardPage />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="profile" element={
              <ProtectedRoute>
                <Suspense fallback={<LoadingSpinner />}>
                  <ProfilePage />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="bookings" element={
              <ProtectedRoute>
                <Suspense fallback={<LoadingSpinner />}>
                  <BookingsPage />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="bookings/:id" element={
              <ProtectedRoute>
                <Suspense fallback={<LoadingSpinner />}>
                  <BookingDetailPage />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="favorites" element={
              <ProtectedRoute>
                <Suspense fallback={<LoadingSpinner />}>
                  <FavoritesPage />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="reviews" element={
              <ProtectedRoute>
                <Suspense fallback={<LoadingSpinner />}>
                  <ReviewsPage />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="tickets" element={
              <ProtectedRoute>
                <Suspense fallback={<LoadingSpinner />}>
                  <MyTicketsPage />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="dashboard/change-password" element={
              <ProtectedRoute>
                <Suspense fallback={<LoadingSpinner />}>
                  <ChangePasswordPage />
                </Suspense>
              </ProtectedRoute>
            } />

            {/* Registration Routes */}
            <Route path="registrations" element={
              <ProtectedRoute>
                <Suspense fallback={<LoadingSpinner />}>
                  <UserRegistrationsPage />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="registrations/:registrationId" element={
              <ProtectedRoute>
                <Suspense fallback={<LoadingSpinner />}>
                  <RegistrationDetailPage />
                </Suspense>
              </ProtectedRoute>
            } />

            {/* Error Pages */}
            <Route path="500" element={
              <Suspense fallback={<LoadingSpinner />}>
                <ServerErrorPage />
              </Suspense>
            } />
            <Route path="*" element={
              <Suspense fallback={<LoadingSpinner />}>
                <NotFoundPage />
              </Suspense>
            } />
          </Route>
          
          {/* ============ VENDOR ROUTES (/vendor) ============ */}
          {/* Routes accessible only to vendors */}
          <Route path="/vendor" element={<Layout />}>
            {/* Vendor Dashboard */}
            <Route index element={
              <VendorRoute>
                <Suspense fallback={<LoadingSpinner />}>
                  <VendorDashboardPage />
                </Suspense>
              </VendorRoute>
            } />
            
            {/* Event Management */}
            <Route path="events" element={
              <VendorRoute>
                <Suspense fallback={<LoadingSpinner />}>
                  <VendorEventsPage />
                </Suspense>
              </VendorRoute>
            } />
            <Route path="events/create" element={
              <VendorRoute>
                <Suspense fallback={<LoadingSpinner />}>
                  <VendorCreateEventPage />
                </Suspense>
              </VendorRoute>
            } />
            <Route path="events/:id/edit" element={
              <VendorRoute>
                <Suspense fallback={<LoadingSpinner />}>
                  <VendorEditEventPage />
                </Suspense>
              </VendorRoute>
            } />

            {/* Claimed Affiliate Events */}
            <Route path="claimed-events" element={
              <VendorRoute>
                <Suspense fallback={<LoadingSpinner />}>
                  <VendorClaimedEventsPage />
                </Suspense>
              </VendorRoute>
            } />

            {/* Booking Management */}
            <Route path="bookings" element={
              <VendorRoute>
                <Suspense fallback={<LoadingSpinner />}>
                  <VendorBookingsPage />
                </Suspense>
              </VendorRoute>
            } />

            {/* Employee Management */}
            <Route path="employees" element={
              <VendorRoute>
                <Suspense fallback={<LoadingSpinner />}>
                  <VendorEmployeesPage />
                </Suspense>
              </VendorRoute>
            } />
            <Route path="employees/create" element={
              <VendorRoute>
                <Suspense fallback={<LoadingSpinner />}>
                  <VendorCreateEmployeePage />
                </Suspense>
              </VendorRoute>
            } />
            <Route path="employees/:id/edit" element={
              <VendorRoute>
                <Suspense fallback={<LoadingSpinner />}>
                  <VendorEditEmployeePage />
                </Suspense>
              </VendorRoute>
            } />

            {/* Analytics & Reports */}
            <Route path="analytics" element={
              <VendorRoute>
                <Suspense fallback={<LoadingSpinner />}>
                  <AnalyticsDashboard />
                </Suspense>
              </VendorRoute>
            } />
            <Route path="analytics/events/:eventId" element={
              <VendorRoute>
                <Suspense fallback={<LoadingSpinner />}>
                  <EventPerformance />
                </Suspense>
              </VendorRoute>
            } />
            
            {/* File Management */}
            <Route path="files" element={
              <VendorRoute>
                <Suspense fallback={<LoadingSpinner />}>
                  <FileManager />
                </Suspense>
              </VendorRoute>
            } />
            
            {/* Vendor Profile */}
            <Route path="profile" element={
              <VendorRoute>
                <Suspense fallback={<LoadingSpinner />}>
                  <VendorProfilePage />
                </Suspense>
              </VendorRoute>
            } />

            {/* Payouts */}
            <Route path="payouts" element={
              <VendorRoute>
                <Suspense fallback={<LoadingSpinner />}>
                  <VendorPayoutsDashboard />
                </Suspense>
              </VendorRoute>
            } />

            {/* Payment Settings - Redirect to Profile */}
            <Route path="payment-settings" element={
              <VendorRoute>
                <Navigate to="/vendor/profile" replace />
              </VendorRoute>
            } />

            {/* Registration Management */}
            <Route path="events/:eventId/registrations" element={
              <VendorRoute>
                <Suspense fallback={<LoadingSpinner />}>
                  <VendorRegistrationsDashboard />
                </Suspense>
              </VendorRoute>
            } />
            <Route path="events/:eventId/registration/builder" element={
              <VendorRoute>
                <Suspense fallback={<LoadingSpinner />}>
                  <FormBuilderPage />
                </Suspense>
              </VendorRoute>
            } />
            <Route path="registrations/:registrationId" element={
              <VendorRoute>
                <Suspense fallback={<LoadingSpinner />}>
                  <RegistrationDetailPage />
                </Suspense>
              </VendorRoute>
            } />
          </Route>
          
          {/* ============ EMPLOYEE ROUTES (/employee) ============ */}
          {/* Routes accessible only to employees */}
          <Route path="/employee" element={<Layout />}>
            {/* Employee Dashboard */}
            <Route index element={
              <EmployeeRoute>
                <Suspense fallback={<LoadingSpinner />}>
                  <EmployeeDashboard />
                </Suspense>
              </EmployeeRoute>
            } />
            
            {/* Task Management */}
            <Route path="tasks" element={
              <EmployeeRoute>
                <Suspense fallback={<LoadingSpinner />}>
                  <EmployeeDashboard />
                </Suspense>
              </EmployeeRoute>
            } />
            
            {/* Ticket Scanning */}
            <Route path="scanner" element={
              <EmployeeRoute>
                <Suspense fallback={<LoadingSpinner />}>
                  <EmployeeTicketScanPage />
                </Suspense>
              </EmployeeRoute>
            } />
            
            {/* Reports */}
            <Route path="reports" element={
              <EmployeeRoute>
                <Suspense fallback={<LoadingSpinner />}>
                  <EmployeeDashboard />
                </Suspense>
              </EmployeeRoute>
            } />
          </Route>
          
          {/* ============ ADMIN ROUTES (/admin) ============ */}
          {/* Routes accessible only to administrators */}
          <Route path="/admin" element={<AdminLayout />}>
            {/* Admin Dashboard */}
            <Route index element={
              <AdminRoute>
                <Suspense fallback={<LoadingSpinner />}>
                  <AdminDashboardPage />
                </Suspense>
              </AdminRoute>
            } />
            
            {/* User Management */}
            <Route path="users" element={
              <AdminRoute>
                <Suspense fallback={<LoadingSpinner />}>
                  <AdminUsersPage />
                </Suspense>
              </AdminRoute>
            } />

            {/* Vendor Management */}
            <Route path="vendors" element={
              <AdminRoute>
                <Suspense fallback={<LoadingSpinner />}>
                  <AdminVendorsPage />
                </Suspense>
              </AdminRoute>
            } />

            {/* Event Management */}
            <Route path="events" element={
              <AdminRoute>
                <Suspense fallback={<LoadingSpinner />}>
                  <AdminEventsPage />
                </Suspense>
              </AdminRoute>
            } />
            <Route path="events/:id/edit" element={
              <AdminRoute>
                <Suspense fallback={<LoadingSpinner />}>
                  <AdminEditEventPage />
                </Suspense>
              </AdminRoute>
            } />
            <Route path="events/:eventId/registration/builder" element={
              <AdminRoute>
                <Suspense fallback={<LoadingSpinner />}>
                  <FormBuilderPage />
                </Suspense>
              </AdminRoute>
            } />
            
            {/* Venue Management */}
            <Route path="venues" element={
              <AdminRoute>
                <Suspense fallback={<LoadingSpinner />}>
                  <AdminVenuesPage />
                </Suspense>
              </AdminRoute>
            } />
            <Route path="venues/create" element={
              <AdminRoute>
                <Suspense fallback={<LoadingSpinner />}>
                  <CreateVenuePage />
                </Suspense>
              </AdminRoute>
            } />
            <Route path="venues/:id/edit" element={
              <AdminRoute>
                <Suspense fallback={<LoadingSpinner />}>
                  <EditVenuePage />
                </Suspense>
              </AdminRoute>
            } />
            
            {/* Category Management */}
            <Route path="categories" element={
              <AdminRoute>
                <Suspense fallback={<LoadingSpinner />}>
                  <AdminCategoriesPage />
                </Suspense>
              </AdminRoute>
            } />
            
            {/* Order Management */}
            <Route path="orders" element={
              <AdminRoute>
                <Suspense fallback={<LoadingSpinner />}>
                  <AdminOrdersPage />
                </Suspense>
              </AdminRoute>
            } />
            
            {/* Payout Management */}
            <Route path="payouts" element={
              <AdminRoute>
                <Suspense fallback={<LoadingSpinner />}>
                  <AdminPayoutsPage />
                </Suspense>
              </AdminRoute>
            } />
            
            {/* Commission Management */}
            <Route path="commissions" element={
              <AdminRoute>
                <Suspense fallback={<LoadingSpinner />}>
                  <AdminCommissionsPage />
                </Suspense>
              </AdminRoute>
            } />

            {/* Blog Management */}
            <Route path="blogs" element={
              <AdminRoute>
                <Suspense fallback={<LoadingSpinner />}>
                  <AdminBlogsPage />
                </Suspense>
              </AdminRoute>
            } />

            {/* Blog Category Management */}
            <Route path="blog-categories" element={
              <AdminRoute>
                <Suspense fallback={<LoadingSpinner />}>
                  <AdminBlogCategoriesPage />
                </Suspense>
              </AdminRoute>
            } />

            {/* Coupon Management */}
            <Route path="coupons" element={
              <AdminRoute>
                <Suspense fallback={<LoadingSpinner />}>
                  <AdminCouponsPage />
                </Suspense>
              </AdminRoute>
            } />

            {/* Analytics & Reports */}
            <Route path="analytics" element={
              <AdminRoute>
                <Suspense fallback={<LoadingSpinner />}>
                  <AdminAnalyticsPage />
                </Suspense>
              </AdminRoute>
            } />
            <Route path="analytics/events/:eventId" element={
              <AdminRoute>
                <Suspense fallback={<LoadingSpinner />}>
                  <EventPerformance />
                </Suspense>
              </AdminRoute>
            } />
            <Route path="analytics/affiliate-events" element={
              <AdminRoute>
                <Suspense fallback={<LoadingSpinner />}>
                  <AdminAffiliateAnalyticsPage />
                </Suspense>
              </AdminRoute>
            } />
            
            {/* Employee Management */}
            <Route path="employees" element={
              <AdminRoute>
                <Suspense fallback={<LoadingSpinner />}>
                  <EmployeeManagement />
                </Suspense>
              </AdminRoute>
            } />
            
            {/* File Management */}
            <Route path="files" element={
              <AdminRoute>
                <Suspense fallback={<LoadingSpinner />}>
                  <FileManager />
                </Suspense>
              </AdminRoute>
            } />
            
            {/* System Settings */}
            <Route path="settings" element={
              <AdminRoute>
                <Suspense fallback={<LoadingSpinner />}>
                  <AdminSettingsPage />
                </Suspense>
              </AdminRoute>
            } />
          </Route>
          
          {/* Auth Routes (without layout) */}
          <Route path="login" element={
            <Suspense fallback={<LoadingSpinner />}>
              <LoginPage />
            </Suspense>
          } />
          <Route path="register" element={
            <Suspense fallback={<LoadingSpinner />}>
              <RegisterPage />
            </Suspense>
          } />
          <Route path="forgot-password" element={
            <Suspense fallback={<LoadingSpinner />}>
              <ForgotPasswordPage />
            </Suspense>
          } />
          <Route path="reset-password" element={
            <Suspense fallback={<LoadingSpinner />}>
              <ResetPasswordPage />
            </Suspense>
          } />
          <Route path="verify-email" element={
            <Suspense fallback={<LoadingSpinner />}>
              <VerifyEmailPage />
            </Suspense>
          } />
        </Routes>
      </AnimatePresence>
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