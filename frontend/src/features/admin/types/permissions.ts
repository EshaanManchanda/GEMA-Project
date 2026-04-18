const ROLE_PERMISSIONS: Record<string, string[]> = {
  super_admin: ['*'],
  admin: [
    'platform:users_manage', 'platform:admins_manage',
    'event:create', 'event:read', 'event:update', 'event:delete', 'event:publish',
    'event:approve', 'event:reject', 'event:feature',
    'booking:create', 'booking:read', 'booking:cancel', 'booking:refund',
    'student:create', 'student:read', 'student:update', 'student:delete', 'student:bulk_import',
    'certificate:generate', 'certificate:read', 'certificate:download', 'certificate:bulk_send',
    'payment:create', 'payment:read', 'payment:refund',
    'payout:approve', 'payout:read',
    'commission:read', 'commission:manage',
    'revenue:read', 'revenue:export',
    'course:create', 'course:read', 'course:enroll',
    'grade:assign', 'attendance:mark',
    'invoice:create', 'invoice:read',
    'report:view', 'settings:manage',
    'blog:create', 'blog:read', 'blog:update', 'blog:delete', 'blog:publish',
    'blog:categories_manage', 'blog:comments_moderate',
    'media:upload', 'media:read', 'media:delete',
    'banners:manage', 'popups:manage',
    'announcements:manage', 'reels:manage',
    'homepage:manage', 'seo_content:manage',
    'school:approve', 'school:reject',
    'vendor:approve', 'vendor:reject',
    'review:moderate',
    'complaint:read', 'complaint:manage',
    'ticket:read', 'ticket:manage',
    'analytics:read', 'analytics:export',
  ],
  moderator: [
    'event:read', 'event:approve', 'event:reject',
    'school:approve', 'school:reject',
    'vendor:approve', 'vendor:reject',
    'review:moderate',
    'complaint:read', 'complaint:manage',
    'blog:comments_moderate',
  ],
  blog_writer: [
    'blog:create', 'blog:read', 'blog:update', 'blog:delete', 'blog:publish',
    'blog:categories_manage', 'blog:comments_moderate',
    'seo_content:manage', 'media:upload', 'media:read',
  ],
  support_agent: [
    'ticket:read', 'ticket:manage',
    'complaint:read', 'complaint:manage',
    'student:read', 'booking:read', 'event:read',
  ],
  content_manager: [
    'banners:manage', 'popups:manage', 'announcements:manage', 'reels:manage',
    'homepage:manage', 'media:upload', 'media:read', 'media:delete', 'blog:read',
  ],
  finance_manager: [
    'payout:read', 'payout:approve', 'commission:read', 'commission:manage',
    'revenue:read', 'revenue:export', 'payment:read', 'payment:refund',
    'analytics:read', 'analytics:export', 'report:view',
  ],
  vendor: [
    'event:create', 'event:read', 'event:update', 'event:delete', 'event:publish',
    'booking:read', 'booking:cancel', 'payment:read', 'student:read',
    'certificate:generate', 'certificate:read', 'certificate:bulk_send', 'analytics:read',
  ],
  school: [
    'event:create', 'event:read', 'event:update',
    'student:create', 'student:read', 'student:update', 'student:bulk_import',
    'certificate:generate', 'certificate:read', 'certificate:bulk_send',
    'report:view', 'course:create', 'course:read',
  ],
  teacher: [
    'event:create', 'event:read', 'event:update', 'student:read',
    'certificate:generate', 'certificate:read',
    'course:create', 'course:read', 'attendance:mark', 'grade:assign',
  ],
  employee: ['event:read', 'booking:read', 'student:read'],
  student: ['event:read', 'booking:read', 'certificate:read', 'certificate:download', 'course:read'],
  parent: [
    'event:read', 'booking:create', 'booking:read', 'booking:cancel',
    'student:read', 'certificate:read', 'certificate:download',
    'payment:create', 'payment:read',
  ],
  customer: [
    'event:read', 'booking:create', 'booking:read', 'booking:cancel',
    'certificate:read', 'certificate:download',
  ],
};

export function hasPermission(permissions: string[], required: string): boolean {
  if (permissions.includes('*')) return true;
  return permissions.includes(required);
}

export function hasAnyPermission(permissions: string[], required: string[]): boolean {
  if (permissions.includes('*')) return true;
  return required.some((p) => permissions.includes(p));
}

export function getUserPermissions(userRole?: string): string[] {
  if (!userRole) return [];
  return ROLE_PERMISSIONS[userRole] || [];
}

export function useHasPermission(permission: string, userRole?: string): boolean {
  if (!userRole) return false;
  const permissions = ROLE_PERMISSIONS[userRole] || [];
  return hasPermission(permissions, permission);
}

export function useHasAnyPermission(permissions: string[], userRole?: string): boolean {
  if (!userRole) return false;
  const userPermissions = ROLE_PERMISSIONS[userRole] || [];
  return hasAnyPermission(userPermissions, permissions);
}

export { ROLE_PERMISSIONS };
