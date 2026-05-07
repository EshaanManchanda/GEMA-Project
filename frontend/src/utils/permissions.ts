/**
 * Permission utilities for role-based access control
 */

export interface User {
  id: string;
  role: 'admin' | 'vendor' | 'employee' | 'user';
  permissions?: string[];
  vendorId?: string;
}

export interface Event {
  _id: string;
  vendorId?: {
    _id: string;
  } | string;
}

export interface Blog {
  _id: string;
  author?: {
    id: string;
  };
}

/**
 * Check if user can edit SEO for events
 */
export const canEditEventSEO = (user: User | null, event?: Event): boolean => {
  if (!user) return false;

  // Admin can edit all event SEO
  if (user.role === 'admin') return true;

  // Vendor can only edit SEO for their own events
  if (user.role === 'vendor' && event) {
    const eventVendorId = typeof event.vendorId === 'string'
      ? event.vendorId
      : event.vendorId?._id;

    return user.vendorId === eventVendorId;
  }

  return false;
};

/**
 * Check if user can edit SEO for blogs
 */
export const canEditBlogSEO = (user: User | null, blog?: Blog): boolean => {
  if (!user) return false;

  // Admin can edit all blog SEO
  if (user.role === 'admin') return true;

  // Authors can edit their own blog SEO (if implemented)
  if (blog?.author && user.id === blog.author.id) return true;

  return false;
};

/**
 * Check if user can create new events
 */
export const canCreateEvent = (user: User | null): boolean => {
  if (!user) return false;
  return user.role === 'admin' || user.role === 'vendor';
};

/**
 * Check if user can create new blogs
 */
export const canCreateBlog = (user: User | null): boolean => {
  if (!user) return false;
  return user.role === 'admin';
};

/**
 * Check if user can view SEO analytics
 */
export const canViewSEOAnalytics = (user: User | null): boolean => {
  if (!user) return false;
  return user.role === 'admin' || user.role === 'vendor';
};

/**
 * Check if user can manage SEO settings globally
 */
export const canManageGlobalSEO = (user: User | null): boolean => {
  if (!user) return false;
  return user.role === 'admin';
};

/**
 * Get permission level for SEO editing
 */
export const getSEOPermissionLevel = (user: User | null, contentType: 'event' | 'blog', content?: Event | Blog): 'none' | 'basic' | 'advanced' | 'full' => {
  if (!user) return 'none';

  if (user.role === 'admin') return 'full';

  if (contentType === 'event') {
    if (canEditEventSEO(user, content as Event)) {
      return 'advanced'; // Vendors can use advanced features but not all admin features
    }
  }

  if (contentType === 'blog') {
    if (canEditBlogSEO(user, content as Blog)) {
      return 'basic'; // Blog authors get basic SEO editing
    }
  }

  return 'none';
};

/**
 * Get disabled features based on permission level
 */
export const getDisabledSEOFeatures = (permissionLevel: 'none' | 'basic' | 'advanced' | 'full'): string[] => {
  switch (permissionLevel) {
    case 'none':
      return ['all']; // All features disabled
    case 'basic':
      return ['analytics', 'advanced-settings', 'bulk-operations'];
    case 'advanced':
      return ['bulk-operations', 'global-settings'];
    case 'full':
      return []; // No restrictions
    default:
      return ['all'];
  }
};

/**
 * Check if a specific SEO feature is available
 */
export const isSEOFeatureAvailable = (feature: string, permissionLevel: 'none' | 'basic' | 'advanced' | 'full'): boolean => {
  const disabledFeatures = getDisabledSEOFeatures(permissionLevel);
  return !disabledFeatures.includes('all') && !disabledFeatures.includes(feature);
};

/**
 * Get permission message for denied access
 */
export const getPermissionMessage = (action: string, requiredRole: string): string => {
  return `You need ${requiredRole} permissions to ${action}. Please contact your administrator for access.`;
};

/**
 * Validate SEO edit permissions before submission
 */
export const validateSEOEditPermission = (
  user: User | null,
  contentType: 'event' | 'blog',
  content?: Event | Blog,
  isCreating: boolean = false
): { allowed: boolean; message?: string } => {
  if (!user) {
    return {
      allowed: false,
      message: 'You must be logged in to edit SEO settings.'
    };
  }

  if (isCreating) {
    const canCreate = contentType === 'event' ? canCreateEvent(user) : canCreateBlog(user);
    if (!canCreate) {
      return {
        allowed: false,
        message: getPermissionMessage(`create ${contentType}s`, contentType === 'event' ? 'vendor or admin' : 'admin')
      };
    }
  } else {
    const canEdit = contentType === 'event'
      ? canEditEventSEO(user, content as Event)
      : canEditBlogSEO(user, content as Blog);

    if (!canEdit) {
      return {
        allowed: false,
        message: contentType === 'event'
          ? 'You can only edit SEO for events you own.'
          : 'You can only edit SEO for blogs you authored.'
      };
    }
  }

  return { allowed: true };
};