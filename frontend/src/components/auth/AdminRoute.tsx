import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useSelector, shallowEqual } from 'react-redux';
import { RootState } from '@/store/legacyStore';
import LoadingSpinner from '../common/LoadingSpinner';

interface AdminRouteProps {
  children?: React.ReactNode;
  redirectPath?: string;
}

const AdminRoute: React.FC<AdminRouteProps> = ({
  children,
  redirectPath = '/login',
}) => {
  const { isAuthenticated, isInitialized, user, isLoading } = useSelector(
    (state: RootState) => ({
      isAuthenticated: state.auth.isAuthenticated,
      isInitialized: state.auth.isInitialized,
      user: state.auth.user,
      isLoading: state.auth.isLoading,
    }),
    shallowEqual
  );

  // Wait for auth initialization before making routing decisions
  if (!isInitialized || isLoading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <LoadingSpinner size="large" text="Loading..." />
      </div>
    );
  }

  if (!isAuthenticated || !user || user.role !== 'admin') {
    return <Navigate to={redirectPath} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

export default AdminRoute;
