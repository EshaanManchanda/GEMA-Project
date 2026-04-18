import { lazy, Suspense } from 'react';
import { Route } from 'react-router-dom';
import { LoadingSpinner } from '@shared/components/common/LoadingSpinner';
import { ProtectedRoute } from './route-guards';

const LoginPage = lazy(() => import('@pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('@pages/auth/RegisterPage'));
const VendorRegisterPage = lazy(() => import('@pages/auth/VendorRegisterPage'));
const ForgotPasswordPage = lazy(() => import('@pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@pages/auth/ResetPasswordPage'));
const VerifyEmailPage = lazy(() => import('@pages/auth/VerifyEmailPage'));
const DashboardPage = lazy(() => import('@pages/dashboard/DashboardPage'));
const BookingsPage = lazy(() => import('@pages/dashboard/BookingsPage'));
const BookingDetailPage = lazy(() => import('@pages/dashboard/BookingDetailPage'));
const MyTicketsPage = lazy(() => import('@pages/dashboard/MyTicketsPage'));
const FavoritesPage = lazy(() => import('@pages/dashboard/FavoritesPage'));
const ProfilePage = lazy(() => import('@pages/dashboard/ProfilePage'));
const ChangePasswordPage = lazy(() => import('@pages/dashboard/ChangePasswordPage'));
const ReviewsPage = lazy(() => import('@pages/dashboard/ReviewsPage'));

const S = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<LoadingSpinner size="lg" />}>{children}</Suspense>
);

export const authRoutes = (
  <>
    <Route path="login" element={<S><LoginPage /></S>} />
    <Route path="register" element={<S><RegisterPage /></S>} />
    <Route path="register/vendor" element={<S><VendorRegisterPage /></S>} />
    <Route path="forgot-password" element={<S><ForgotPasswordPage /></S>} />
    <Route path="reset-password" element={<S><ResetPasswordPage /></S>} />
    <Route path="verify-email" element={<S><VerifyEmailPage /></S>} />
  </>
);

export const customerRoutes = (
  <>
    <Route path="dashboard" element={<ProtectedRoute><S><DashboardPage /></S></ProtectedRoute>} />
    <Route path="dashboard/bookings" element={<ProtectedRoute><S><BookingsPage /></S></ProtectedRoute>} />
    <Route path="dashboard/bookings/:id" element={<ProtectedRoute><S><BookingDetailPage /></S></ProtectedRoute>} />
    <Route path="dashboard/tickets" element={<ProtectedRoute><S><MyTicketsPage /></S></ProtectedRoute>} />
    <Route path="dashboard/favorites" element={<ProtectedRoute><S><FavoritesPage /></S></ProtectedRoute>} />
    <Route path="dashboard/profile" element={<ProtectedRoute><S><ProfilePage /></S></ProtectedRoute>} />
    <Route path="dashboard/change-password" element={<ProtectedRoute><S><ChangePasswordPage /></S></ProtectedRoute>} />
    <Route path="dashboard/reviews" element={<ProtectedRoute><S><ReviewsPage /></S></ProtectedRoute>} />
  </>
);
