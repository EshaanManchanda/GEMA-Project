import { Navigate, useLocation } from 'react-router-dom';
import { ReactNode } from 'react';

const SUPER_ADMIN = 'super_admin';
const ADMIN_ROLES = [SUPER_ADMIN, 'admin'];
const ADMIN_SUB_ROLES = ['moderator', 'blog_writer', 'support_agent', 'content_manager', 'finance_manager'];
const ALL_ADMIN_ROLES = [...ADMIN_ROLES, ...ADMIN_SUB_ROLES];

const ROLE_DASHBOARD_URLS: Record<string, string> = {
  super_admin: '/admin/dashboard',
  admin: '/admin/dashboard',
  moderator: '/admin/moderation',
  blog_writer: '/admin/blogs',
  support_agent: '/admin/support',
  content_manager: '/admin/media',
  finance_manager: '/admin/finance',
  vendor: '/vendor/dashboard',
  employee: '/employee/dashboard',
  school: '/school/dashboard',
  teacher: '/teacher/dashboard',
  customer: '/dashboard',
  student: '/student/dashboard',
  parent: '/parent/dashboard',
};

interface ProtectedRouteProps {
  children: ReactNode;
  isAuthenticated?: boolean;
  requiredRole?: string;
  userRole?: string;
}

/**
 * ProtectedRoute — checks authentication and role access.
 * 
 * Role matching rules:
 * - `requiredRole="admin"` → allows super_admin + admin
 * - `requiredRole="super_admin"` → allows super_admin only
 * - `requiredRole="moderator"` → allows super_admin + admin + moderator
 * - `requiredRole="vendor"` → allows vendor only
 * - `requiredRole="student"` → allows student only
 * - No requiredRole → any authenticated user
 */
export function ProtectedRoute({ children, isAuthenticated, requiredRole, userRole }: ProtectedRouteProps) {
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && userRole) {
    // Super admin has access to everything
    if (userRole === SUPER_ADMIN) {
      return <>{children}</>;
    }

    // Admin has access to all admin routes (admin + sub-roles)
    if (userRole === 'admin' && (requiredRole === 'admin' || ADMIN_SUB_ROLES.includes(requiredRole))) {
      return <>{children}</>;
    }

    // Exact role match
    if (userRole === requiredRole) {
      return <>{children}</>;
    }

    // Admin sub-roles can access their specific routes
    if (ADMIN_SUB_ROLES.includes(userRole) && userRole === requiredRole) {
      return <>{children}</>;
    }

    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}

/**
 * RoleRoute — checks if user has any of the allowed roles.
 * Super admin always passes.
 */
export function RoleRoute({ children, allowedRoles, userRole }: { children: ReactNode; allowedRoles: string[]; userRole?: string }) {
  const location = useLocation();

  if (!userRole) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Super admin has access to everything
  if (userRole === SUPER_ADMIN) {
    return <>{children}</>;
  }

  if (!allowedRoles.includes(userRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}

/**
 * AdminRoute — allows any admin role (super_admin, admin, or sub-roles).
 */
export function AdminRoute({ children, userRole }: { children: ReactNode; userRole?: string }) {
  const location = useLocation();

  if (!userRole) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!ALL_ADMIN_ROLES.includes(userRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}

export function getDashboardUrl(role: string): string {
  return ROLE_DASHBOARD_URLS[role] || '/';
}

export { ADMIN_ROLES, ADMIN_SUB_ROLES, ALL_ADMIN_ROLES, SUPER_ADMIN };
