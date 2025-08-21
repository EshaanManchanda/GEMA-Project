import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import LoadingSpinner from '../common/LoadingSpinner';

interface AdminRouteProps {
  children?: React.ReactNode;
  redirectPath?: string;
}

const AdminRoute: React.FC<AdminRouteProps> = ({
  children,
  redirectPath = '/login',
}) => {
  const { isAuthenticated, user, loading } = useSelector(
    (state: RootState) => state.auth
  );

  if (loading) {
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
