import { UserRole } from '@features/auth/types/auth.types';

export const ROLE_DASHBOARD_URLS: Record<UserRole, string> = {
  [UserRole.SUPER_ADMIN]: '/admin/dashboard',
  [UserRole.ADMIN]: '/admin/dashboard',
  [UserRole.MODERATOR]: '/admin/moderation',
  [UserRole.BLOG_WRITER]: '/admin/blogs',
  [UserRole.SUPPORT_AGENT]: '/admin/support',
  [UserRole.CONTENT_MANAGER]: '/admin/media',
  [UserRole.FINANCE_MANAGER]: '/admin/finance',
  [UserRole.VENDOR]: '/vendor/dashboard',
  [UserRole.EMPLOYEE]: '/employee/dashboard',
  [UserRole.SCHOOL]: '/school/dashboard',
  [UserRole.TEACHER]: '/teacher/dashboard',
  [UserRole.CUSTOMER]: '/dashboard',
  [UserRole.STUDENT]: '/student/dashboard',
  [UserRole.PARENT]: '/parent/dashboard',
};

export const ADMIN_ROLES = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.MODERATOR,
  UserRole.BLOG_WRITER,
  UserRole.SUPPORT_AGENT,
  UserRole.CONTENT_MANAGER,
  UserRole.FINANCE_MANAGER,
];

export const ROLE_PERMISSIONS = {
  [UserRole.SUPER_ADMIN]: ['all'],
  [UserRole.ADMIN]: ['events', 'users', 'vendors', 'schools', 'settings', 'analytics', 'moderation'],
  [UserRole.MODERATOR]: ['events', 'schools', 'vendors', 'reviews', 'complaints'],
  [UserRole.BLOG_WRITER]: ['blogs', 'categories', 'comments', 'seo', 'media'],
  [UserRole.SUPPORT_AGENT]: ['tickets', 'complaints', 'users', 'bookings', 'events'],
  [UserRole.CONTENT_MANAGER]: ['banners', 'popups', 'announcements', 'reels', 'media', 'homepage'],
  [UserRole.FINANCE_MANAGER]: ['payouts', 'commissions', 'revenue', 'payments', 'analytics'],
  [UserRole.VENDOR]: ['events', 'bookings', 'employees', 'payouts', 'analytics'],
  [UserRole.EMPLOYEE]: ['events', 'bookings', 'checkin'],
  [UserRole.SCHOOL]: ['teachers', 'students', 'events', 'courses', 'certificates', 'analytics'],
  [UserRole.TEACHER]: ['events', 'bookings', 'payouts', 'courses', 'certificates'],
  [UserRole.CUSTOMER]: ['events', 'bookings', 'tickets', 'favorites', 'reviews'],
  [UserRole.STUDENT]: ['enrollments', 'certificates', 'attendance', 'grades'],
  [UserRole.PARENT]: ['children', 'bookings', 'certificates', 'attendance', 'grades'],
};

export function getDashboardUrl(role: UserRole): string {
  return ROLE_DASHBOARD_URLS[role] || '/';
}
