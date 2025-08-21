import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import LoadingSpinner from '../common/LoadingSpinner';

interface VendorRouteProps {
  children?: React.ReactNode;
  redirectPath?: string;
}

const VendorRoute: React.FC<VendorRouteProps> = ({
  children,
  redirectPath = '/login',
}) => {
  const { isAuthenticated, user, loading } = useSelector((state: RootState) => state.auth);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <LoadingSpinner size="large" text="Loading..." />
      </div>
    );
  }

  // Check if user is authenticated and has vendor role
  if (!isAuthenticated || !user || user.role !== 'vendor') {
    return <Navigate to={redirectPath} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

export default VendorRoute;