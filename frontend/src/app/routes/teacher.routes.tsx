import { lazy, Suspense } from 'react';
import { Route } from 'react-router-dom';
import { LoadingSpinner } from '@shared/components/common/LoadingSpinner';
import { ProtectedRoute } from './route-guards';

const TeacherDashboardPage = lazy(() => import('@pages/teacher/TeacherDashboardPage'));
const TeacherEventsPage = lazy(() => import('@pages/teacher/TeacherEventsPage'));
const TeacherEventFormPage = lazy(() => import('@pages/teacher/TeacherEventFormPage'));
const TeacherBookingsPage = lazy(() => import('@pages/teacher/TeacherBookingsPage'));
const TeacherPayoutsPage = lazy(() => import('@pages/teacher/TeacherPayoutsPage'));
const TeacherProfilePage = lazy(() => import('@pages/teacher/TeacherProfilePage'));
const TeacherPaymentSettingsPage = lazy(() => import('@pages/teacher/TeacherPaymentSettingsPage'));
const TeacherAnalyticsPage = lazy(() => import('@pages/teacher/TeacherAnalyticsPage'));

const S = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<LoadingSpinner size="lg" />}>{children}</Suspense>
);

export const teacherRoutes = (
  <>
    <Route path="teacher" element={<ProtectedRoute requiredRole="teacher"><S><TeacherDashboardPage /></S></ProtectedRoute>} />
    <Route path="teacher/dashboard" element={<ProtectedRoute requiredRole="teacher"><S><TeacherDashboardPage /></S></ProtectedRoute>} />
    <Route path="teacher/events" element={<ProtectedRoute requiredRole="teacher"><S><TeacherEventsPage /></S></ProtectedRoute>} />
    <Route path="teacher/events/create" element={<ProtectedRoute requiredRole="teacher"><S><TeacherEventFormPage /></S></ProtectedRoute>} />
    <Route path="teacher/events/:id/edit" element={<ProtectedRoute requiredRole="teacher"><S><TeacherEventFormPage /></S></ProtectedRoute>} />
    <Route path="teacher/bookings" element={<ProtectedRoute requiredRole="teacher"><S><TeacherBookingsPage /></S></ProtectedRoute>} />
    <Route path="teacher/payouts" element={<ProtectedRoute requiredRole="teacher"><S><TeacherPayoutsPage /></S></ProtectedRoute>} />
    <Route path="teacher/profile" element={<ProtectedRoute requiredRole="teacher"><S><TeacherProfilePage /></S></ProtectedRoute>} />
    <Route path="teacher/payment-settings" element={<ProtectedRoute requiredRole="teacher"><S><TeacherPaymentSettingsPage /></S></ProtectedRoute>} />
    <Route path="teacher/analytics" element={<ProtectedRoute requiredRole="teacher"><S><TeacherAnalyticsPage /></S></ProtectedRoute>} />
  </>
);
