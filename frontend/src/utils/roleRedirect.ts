/**
 * Role-based redirect utility
 * Determines the appropriate redirect path based on user role
 */

export type UserRole = 'customer' | 'vendor' | 'teacher' | 'employee' | 'admin';

/**
 * Get the default dashboard route for a given user role
 */
export const getRoleBasedRedirectPath = (role: UserRole): string => {
  switch (role) {
    case 'customer':
      return '/dashboard';
    case 'vendor':
      return '/vendor';
    case 'teacher':
      return '/teacher';
    case 'employee':
      return '/employee';
    case 'admin':
      return '/admin';
    default:
      return '/';
  }
};

/**
 * Check if a user has access to a specific route based on their role
 */
export const hasRouteAccess = (userRole: UserRole, requestedPath: string): boolean => {
  const path = requestedPath.toLowerCase();

  switch (userRole) {
    case 'customer':
      // Customers can access public routes and their own dashboard routes
      return !path.startsWith('/vendor') &&
             !path.startsWith('/teacher') &&
             !path.startsWith('/employee') &&
             !path.startsWith('/admin');

    case 'vendor':
      // Vendors can access public routes, vendor routes and auth routes
      return !path.startsWith('/admin') &&
             !path.startsWith('/employee') &&
             !path.startsWith('/teacher');

    case 'teacher':
      // Teachers can access public routes and teacher routes
      return !path.startsWith('/vendor') &&
             !path.startsWith('/employee') &&
             !path.startsWith('/admin');

    case 'employee':
      // Employees can access public routes, employee routes and auth routes
      return !path.startsWith('/admin') &&
             !path.startsWith('/vendor') &&
             !path.startsWith('/teacher');

    case 'admin':
      // Admins have access to all routes
      return true;

    default:
      return false;
  }
};

/**
 * Get allowed route patterns for a user role
 */
export const getAllowedRoutes = (role: UserRole): string[] => {
  switch (role) {
    case 'customer':
      return [
        '/',
        '/events',
        '/events/*',
        '/categories',
        '/categories/*',
        '/vendors',
        '/vendors/*',
        '/search',
        '/book/*',
        '/cart',
        '/checkout',
        '/payment/*',
        '/dashboard',
        '/profile',
        '/bookings',
        '/favorites',
        '/reviews',
        '/tickets',
        '/about',
        '/blog',
        '/contact',
        '/privacy',
        '/terms',
        '/faq',
        '/help'
      ];

    case 'vendor':
      return [
        '/vendor',
        '/vendor/*'
      ];

    case 'teacher':
      return [
        '/teacher',
        '/teacher/*'
      ];

    case 'employee':
      return [
        '/employee',
        '/employee/*'
      ];

    case 'admin':
      return [
        '*', // Admin has access to all routes
        '/admin',
        '/admin/*'
      ];

    default:
      return ['/'];
  }
};

/**
 * Redirect user to appropriate dashboard based on role after login
 */
export const redirectToRoleDashboard = (role: UserRole, navigate: any, replace = true) => {
  const redirectPath = getRoleBasedRedirectPath(role);
  navigate(redirectPath, { replace });
};