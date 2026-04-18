import { lazy, Suspense } from 'react';
import { Route } from 'react-router-dom';
import { LoadingSpinner } from '@shared/components/common/LoadingSpinner';
import { ProtectedRoute } from './route-guards';

const EmployeeDashboard = lazy(() => import('@pages/employee/EmployeeDashboard'));
const EmployeeTicketScanPage = lazy(() => import('@pages/employee/EmployeeTicketScanPage'));
const EmployeeTasksPage = lazy(() => import('@pages/employee/EmployeeTasksPage'));
const EmployeeReportsPage = lazy(() => import('@pages/employee/EmployeeReportsPage'));

const S = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<LoadingSpinner size="lg" />}>{children}</Suspense>
);

export const employeeRoutes = (
  <>
    <Route path="employee" element={<ProtectedRoute requiredRole="employee"><S><EmployeeDashboard /></S></ProtectedRoute>} />
    <Route path="employee/dashboard" element={<ProtectedRoute requiredRole="employee"><S><EmployeeDashboard /></S></ProtectedRoute>} />
    <Route path="employee/scan" element={<ProtectedRoute requiredRole="employee"><S><EmployeeTicketScanPage /></S></ProtectedRoute>} />
    <Route path="employee/tasks" element={<ProtectedRoute requiredRole="employee"><S><EmployeeTasksPage /></S></ProtectedRoute>} />
    <Route path="employee/reports" element={<ProtectedRoute requiredRole="employee"><S><EmployeeReportsPage /></S></ProtectedRoute>} />
  </>
);
