import { useSelector } from 'react-redux';
import { RootState } from '../store';
import {
  canEditEventSEO,
  canEditBlogSEO,
  canCreateEvent,
  canCreateBlog,
  canViewSEOAnalytics,
  canManageGlobalSEO,
  getSEOPermissionLevel,
  validateSEOEditPermission,
  type User,
  type Event,
  type Blog
} from '../utils/permissions';

/**
 * Hook for managing user permissions throughout the app
 */
export const usePermissions = () => {
  // Get current user from Redux store
  const user = useSelector((state: RootState) => state.auth?.user) as User | null;

  return {
    user,

    // Event permissions
    canEditEventSEO: (event?: Event) => canEditEventSEO(user, event),
    canCreateEvent: () => canCreateEvent(user),

    // Blog permissions
    canEditBlogSEO: (blog?: Blog) => canEditBlogSEO(user, blog),
    canCreateBlog: () => canCreateBlog(user),

    // SEO-specific permissions
    canViewSEOAnalytics: () => canViewSEOAnalytics(user),
    canManageGlobalSEO: () => canManageGlobalSEO(user),

    // Get permission level for content
    getSEOPermissionLevel: (contentType: 'event' | 'blog', content?: Event | Blog) =>
      getSEOPermissionLevel(user, contentType, content),

    // Validate permissions before actions
    validateSEOEditPermission: (
      contentType: 'event' | 'blog',
      content?: Event | Blog,
      isCreating?: boolean
    ) => validateSEOEditPermission(user, contentType, content, isCreating),

    // Role-based checks
    isAdmin: () => user?.role === 'admin',
    isVendor: () => user?.role === 'vendor',
    isEmployee: () => user?.role === 'employee',
    isUser: () => user?.role === 'user',

    // Vendor-specific checks
    isOwnerOfEvent: (event: Event) => {
      if (!user || user.role !== 'vendor') return false;
      const eventVendorId = typeof event.vendorId === 'string'
        ? event.vendorId
        : event.vendorId?._id;
      return user.vendorId === eventVendorId;
    }
  };
};