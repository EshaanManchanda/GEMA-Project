import { lazy, Suspense } from 'react';
import { Route } from 'react-router-dom';
import { LoadingSpinner } from '@shared/components/common/LoadingSpinner';
import { ProtectedRoute } from './route-guards';

const VendorDashboardPage = lazy(() => import('@pages/vendor/VendorDashboardPage'));
const VendorEventsPage = lazy(() => import('@pages/vendor/VendorEventsPage'));
const VendorCreateEventPage = lazy(() => import('@pages/vendor/VendorCreateEventPage'));
const VendorEditEventPage = lazy(() => import('@pages/vendor/VendorEditEventPage'));
const VendorEventDetailPage = lazy(() => import('@pages/vendor/VendorEventDetailPage'));
const VendorBookingsPage = lazy(() => import('@pages/vendor/VendorBookingsPage'));
const VendorBookingDetailPage = lazy(() => import('@pages/vendor/VendorBookingDetailPage'));
const VendorPayoutsDashboard = lazy(() => import('@pages/vendor/VendorPayoutsDashboard'));
const VendorProfilePage = lazy(() => import('@pages/vendor/VendorProfilePage'));
const VendorPaymentSettings = lazy(() => import('@pages/vendor/VendorPaymentSettings'));
const VendorAnalyticsPage = lazy(() => import('@pages/vendor/VendorAnalyticsPage'));
const VendorEmployeesPage = lazy(() => import('@pages/vendor/VendorEmployeesPage'));
const VendorCreateEmployeePage = lazy(() => import('@pages/vendor/VendorCreateEmployeePage'));
const VendorEditEmployeePage = lazy(() => import('@pages/vendor/VendorEditEmployeePage'));
const VendorRegistrationsDashboard = lazy(() => import('@pages/vendor/VendorRegistrationsDashboard'));
const VendorClaimedEventsPage = lazy(() => import('@pages/vendor/VendorClaimedEventsPage'));
const FormBuilderPage = lazy(() => import('@pages/vendor/FormBuilderPage'));

const S = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<LoadingSpinner size="lg" />}>{children}</Suspense>
);

export const vendorRoutes = (
  <>
    <Route path="vendor" element={<ProtectedRoute requiredRole="vendor"><S><VendorDashboardPage /></S></ProtectedRoute>} />
    <Route path="vendor/dashboard" element={<ProtectedRoute requiredRole="vendor"><S><VendorDashboardPage /></S></ProtectedRoute>} />
    <Route path="vendor/events" element={<ProtectedRoute requiredRole="vendor"><S><VendorEventsPage /></S></ProtectedRoute>} />
    <Route path="vendor/events/create" element={<ProtectedRoute requiredRole="vendor"><S><VendorCreateEventPage /></S></ProtectedRoute>} />
    <Route path="vendor/events/:id" element={<ProtectedRoute requiredRole="vendor"><S><VendorEventDetailPage /></S></ProtectedRoute>} />
    <Route path="vendor/events/:id/edit" element={<ProtectedRoute requiredRole="vendor"><S><VendorEditEventPage /></S></ProtectedRoute>} />
    <Route path="vendor/bookings" element={<ProtectedRoute requiredRole="vendor"><S><VendorBookingsPage /></S></ProtectedRoute>} />
    <Route path="vendor/bookings/:id" element={<ProtectedRoute requiredRole="vendor"><S><VendorBookingDetailPage /></S></ProtectedRoute>} />
    <Route path="vendor/payouts" element={<ProtectedRoute requiredRole="vendor"><S><VendorPayoutsDashboard /></S></ProtectedRoute>} />
    <Route path="vendor/profile" element={<ProtectedRoute requiredRole="vendor"><S><VendorProfilePage /></S></ProtectedRoute>} />
    <Route path="vendor/payment-settings" element={<ProtectedRoute requiredRole="vendor"><S><VendorPaymentSettings /></S></ProtectedRoute>} />
    <Route path="vendor/analytics" element={<ProtectedRoute requiredRole="vendor"><S><VendorAnalyticsPage /></S></ProtectedRoute>} />
    <Route path="vendor/employees" element={<ProtectedRoute requiredRole="vendor"><S><VendorEmployeesPage /></S></ProtectedRoute>} />
    <Route path="vendor/employees/create" element={<ProtectedRoute requiredRole="vendor"><S><VendorCreateEmployeePage /></S></ProtectedRoute>} />
    <Route path="vendor/employees/:id/edit" element={<ProtectedRoute requiredRole="vendor"><S><VendorEditEmployeePage /></S></ProtectedRoute>} />
    <Route path="vendor/registrations" element={<ProtectedRoute requiredRole="vendor"><S><VendorRegistrationsDashboard /></S></ProtectedRoute>} />
    <Route path="vendor/claimed-events" element={<ProtectedRoute requiredRole="vendor"><S><VendorClaimedEventsPage /></S></ProtectedRoute>} />
    <Route path="vendor/form-builder" element={<ProtectedRoute requiredRole="vendor"><S><FormBuilderPage /></S></ProtectedRoute>} />
  </>
);
