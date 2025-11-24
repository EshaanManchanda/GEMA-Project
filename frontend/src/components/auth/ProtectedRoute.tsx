import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import LoadingSpinner from '../common/LoadingSpinner';
import { hasRouteAccess, type UserRole } from '@/utils/roleRedirect';

interface ProtectedRouteProps {
  children?: React.ReactNode;
  redirectPath?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  redirectPath = '/login',
}) => {
  const { isAuthenticated, isInitialized, loading, user } = useSelector((state: RootState) => state.auth);
  const location = useLocation();

  // Wait for auth initialization before making routing decisions
  if (!isInitialized || loading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <LoadingSpinner size="large" text="Loading..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={redirectPath} replace state={{ from: location }} />;
  }

  // Check if user has access to the current route based on their role
  if (user && user.role) {
    const userRole = user.role as UserRole;
    if (!hasRouteAccess(userRole, location.pathname)) {
      // Redirect to user's appropriate dashboard
      const dashboardPath = userRole === 'customer' ? '/dashboard' :
                           userRole === 'vendor' ? '/vendor' :
                           userRole === 'employee' ? '/employee' :
                           userRole === 'admin' ? '/admin' : '/';
      
      return <Navigate to={dashboardPath} replace />;
    }
  }

  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;