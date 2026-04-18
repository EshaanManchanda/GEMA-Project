import { lazy, Suspense } from 'react';
import { Route } from 'react-router-dom';
import { LoadingSpinner } from '@shared/components/common/LoadingSpinner';
import { ProtectedRoute } from './route-guards';

const StudentDashboardPage = lazy(() => import('@pages/student/StudentDashboardPage').then(m => ({ default: m.StudentDashboardPage })));
const ParentDashboardPage = lazy(() => import('@pages/parent/ParentDashboardPage').then(m => ({ default: m.ParentDashboardPage })));
const SchoolDashboardPage = lazy(() => import('@pages/school/SchoolDashboardPage').then(m => ({ default: m.SchoolDashboardPage })));

// Placeholder pages — will be built incrementally
const StudentEnrollmentsPage = lazy(() => import('@pages/dashboard/BookingsPage'));
const StudentCertificatesPage = lazy(() => import('@pages/dashboard/MyTicketsPage'));
const StudentAttendancePage = lazy(() => import('@pages/dashboard/ProfilePage'));
const StudentGradesPage = lazy(() => import('@pages/dashboard/ReviewsPage'));

const S = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<LoadingSpinner size="lg" />}>{children}</Suspense>
);

export const studentRoutes = (
  <>
    <Route path="student" element={<ProtectedRoute requiredRole="student"><S><StudentDashboardPage /></S></ProtectedRoute>} />
    <Route path="student/dashboard" element={<ProtectedRoute requiredRole="student"><S><StudentDashboardPage /></S></ProtectedRoute>} />
    <Route path="student/enrollments" element={<ProtectedRoute requiredRole="student"><S><StudentEnrollmentsPage /></S></ProtectedRoute>} />
    <Route path="student/certificates" element={<ProtectedRoute requiredRole="student"><S><StudentCertificatesPage /></S></ProtectedRoute>} />
    <Route path="student/attendance" element={<ProtectedRoute requiredRole="student"><S><StudentAttendancePage /></S></ProtectedRoute>} />
    <Route path="student/grades" element={<ProtectedRoute requiredRole="student"><S><StudentGradesPage /></S></ProtectedRoute>} />
  </>
);

export const parentRoutes = (
  <>
    <Route path="parent" element={<ProtectedRoute requiredRole="parent"><S><ParentDashboardPage /></S></ProtectedRoute>} />
    <Route path="parent/dashboard" element={<ProtectedRoute requiredRole="parent"><S><ParentDashboardPage /></S></ProtectedRoute>} />
    <Route path="parent/children" element={<ProtectedRoute requiredRole="parent"><S><StudentEnrollmentsPage /></S></ProtectedRoute>} />
    <Route path="parent/children/:childId/enrollments" element={<ProtectedRoute requiredRole="parent"><S><StudentEnrollmentsPage /></S></ProtectedRoute>} />
    <Route path="parent/children/:childId/certificates" element={<ProtectedRoute requiredRole="parent"><S><StudentCertificatesPage /></S></ProtectedRoute>} />
    <Route path="parent/children/:childId/attendance" element={<ProtectedRoute requiredRole="parent"><S><StudentAttendancePage /></S></ProtectedRoute>} />
    <Route path="parent/children/:childId/grades" element={<ProtectedRoute requiredRole="parent"><S><StudentGradesPage /></S></ProtectedRoute>} />
  </>
);

export const schoolRoutes = (
  <>
    <Route path="school" element={<ProtectedRoute requiredRole="school"><S><SchoolDashboardPage /></S></ProtectedRoute>} />
    <Route path="school/dashboard" element={<ProtectedRoute requiredRole="school"><S><SchoolDashboardPage /></S></ProtectedRoute>} />
  </>
);
