import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useSelector, shallowEqual } from 'react-redux';
import { RootState } from '@/store';
import LoadingSpinner from '../common/LoadingSpinner';

interface TeacherRouteProps {
  children?: React.ReactNode;
  redirectPath?: string;
}

const TeacherRoute: React.FC<TeacherRouteProps> = ({
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

  // Check if user is authenticated and has teacher role
  if (!isAuthenticated || !user || user.role !== 'teacher') {
    return <Navigate to={redirectPath} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

export default TeacherRoute;
