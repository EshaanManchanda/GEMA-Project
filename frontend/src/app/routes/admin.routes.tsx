import { lazy, Suspense } from 'react';
import { Route } from 'react-router-dom';
import { LoadingSpinner } from '@shared/components/common/LoadingSpinner';
import { ProtectedRoute } from './route-guards';

const AdminDashboardPage = lazy(() => import('@pages/admin/AdminDashboardPage'));
const AdminEventsPage = lazy(() => import('@pages/admin/AdminEventsPage'));
const AdminEventDetailPage = lazy(() => import('@pages/admin/AdminEventDetailPage'));
const AdminEditEventPage = lazy(() => import('@pages/admin/AdminEditEventPage'));
const AdminUsersPage = lazy(() => import('@pages/admin/AdminUsersPage'));
const AdminUserEditPage = lazy(() => import('@pages/admin/AdminUserEditPage'));
const AdminVendorsPage = lazy(() => import('@pages/admin/AdminVendorsPage'));
const AdminTeachersPage = lazy(() => import('@pages/admin/AdminTeachersPage'));
const AdminTeachingEventsPage = lazy(() => import('@pages/admin/AdminTeachingEventsPage'));
const AdminTeachingEditEventPage = lazy(() => import('@pages/admin/AdminTeachingEditEventPage'));
const AdminOrdersPage = lazy(() => import('@pages/admin/AdminOrdersPage'));
const AdminOrderDetailPage = lazy(() => import('@pages/admin/AdminOrderDetailPage'));
const AdminPayoutsPage = lazy(() => import('@pages/admin/AdminPayoutsPage'));
const AdminCommissionsPage = lazy(() => import('@pages/admin/AdminCommissionsPage'));
const AdminCommissionTransactionDetailPage = lazy(() => import('@pages/admin/AdminCommissionTransactionDetailPage'));
const AdminCouponsPage = lazy(() => import('@pages/admin/AdminCouponsPage'));
const AdminCategoriesPage = lazy(() => import('@pages/admin/AdminCategoriesPage'));
const AdminCollectionsPage = lazy(() => import('@pages/admin/AdminCollectionsPage'));
const AdminBlogsPage = lazy(() => import('@pages/admin/AdminBlogsPage'));
const AdminBlogEditPage = lazy(() => import('@pages/admin/AdminBlogEditPage'));
const AdminBlogCategoriesPage = lazy(() => import('@pages/admin/AdminBlogCategoriesPage'));
const AdminSettingsPage = lazy(() => import('@pages/admin/AdminSettingsPage'));
const AdminMediaPage = lazy(() => import('@pages/admin/AdminMediaPage'));
const AdminAnalyticsPage = lazy(() => import('@pages/admin/AdminAnalyticsPage'));
const AdminReviewsPage = lazy(() => import('@pages/admin/AdminReviewsPage'));
const AdminBannersPage = lazy(() => import('@pages/admin/AdminBannersPage'));
const AdminPopupsPage = lazy(() => import('@pages/admin/AdminPopupsPage'));
const AdminAnnouncementsPage = lazy(() => import('@pages/admin/AdminAnnouncementsPage'));
const AdminSEOPage = lazy(() => import('@pages/admin/AdminSEOPage'));
const AdminAffiliateAnalyticsPage = lazy(() => import('@pages/admin/AdminAffiliateAnalyticsPage'));
const AdminSubmissionsPage = lazy(() => import('@pages/admin/AdminSubmissionsPage'));
const BulkImportPage = lazy(() => import('@pages/admin/BulkImportPage'));
const EmployeeManagement = lazy(() => import('@pages/admin/EmployeeManagement'));
const ReelsManagementPage = lazy(() => import('@pages/admin/ReelsManagementPage'));
const AdminPartnershipsPage = lazy(() => import('@pages/admin/AdminPartnershipsPage'));
const FileManager = lazy(() => import('@pages/upload/FileManager'));
const BlogStyleGuidePage = lazy(() => import('@pages/admin/BlogStyleGuidePage'));
const ModeratorDashboardPage = lazy(() => import('@pages/admin/ModeratorDashboardPage').then(m => ({ default: m.ModeratorDashboardPage })));
const BlogWriterDashboardPage = lazy(() => import('@pages/admin/BlogWriterDashboardPage').then(m => ({ default: m.BlogWriterDashboardPage })));
const SupportAgentDashboardPage = lazy(() => import('@pages/admin/SupportAgentDashboardPage').then(m => ({ default: m.SupportAgentDashboardPage })));
const ContentManagerDashboardPage = lazy(() => import('@pages/admin/ContentManagerDashboardPage').then(m => ({ default: m.ContentManagerDashboardPage })));
const FinanceManagerDashboardPage = lazy(() => import('@pages/admin/FinanceManagerDashboardPage').then(m => ({ default: m.FinanceManagerDashboardPage })));
const SuperAdminDashboardPage = lazy(() => import('@pages/admin/SuperAdminDashboardPage').then(m => ({ default: m.SuperAdminDashboardPage })));
const AdminManagementPage = lazy(() => import('@pages/admin/AdminManagementPage').then(m => ({ default: m.AdminManagementPage })));
const FeatureFlagsPage = lazy(() => import('@pages/admin/FeatureFlagsPage').then(m => ({ default: m.FeatureFlagsPage })));
const SystemHealthPage = lazy(() => import('@pages/admin/SystemHealthPage').then(m => ({ default: m.SystemHealthPage })));
const AuditLogsPage = lazy(() => import('@pages/admin/AuditLogsPage').then(m => ({ default: m.AuditLogsPage })));
const ApiKeysPage = lazy(() => import('@pages/admin/ApiKeysPage').then(m => ({ default: m.ApiKeysPage })));
const ImpersonateUserPage = lazy(() => import('@pages/admin/ImpersonateUserPage').then(m => ({ default: m.ImpersonateUserPage })));
const AdminSchoolsPage = lazy(() => import('@pages/admin/AdminSchoolsPage').then(m => ({ default: m.AdminSchoolsPage })));
const AdminLMSCoursesPage = lazy(() => import('@pages/admin/AdminLMSCoursesPage').then(m => ({ default: m.AdminLMSCoursesPage })));
const AdminCertificatesPage = lazy(() => import('@pages/admin/AdminCertificatesPage').then(m => ({ default: m.AdminCertificatesPage })));
const AdminStudentsPage = lazy(() => import('@pages/admin/AdminStudentsPage').then(m => ({ default: m.AdminStudentsPage })));
const AdminComplaintsPage = lazy(() => import('@pages/admin/AdminComplaintsPage').then(m => ({ default: m.AdminComplaintsPage })));
const AdminCalendarPage = lazy(() => import('@pages/admin/AdminCalendarPage').then(m => ({ default: m.AdminCalendarPage })));

const S = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<LoadingSpinner size="lg" />}>{children}</Suspense>
);

export const adminRoutes = (
  <>
    <Route path="admin" element={<ProtectedRoute requiredRole="admin"><S><AdminDashboardPage /></S></ProtectedRoute>} />
    <Route path="admin/dashboard" element={<ProtectedRoute requiredRole="admin"><S><AdminDashboardPage /></S></ProtectedRoute>} />
    <Route path="admin/events" element={<ProtectedRoute requiredRole="admin"><S><AdminEventsPage /></S></ProtectedRoute>} />
    <Route path="admin/events/:id" element={<ProtectedRoute requiredRole="admin"><S><AdminEventDetailPage /></S></ProtectedRoute>} />
    <Route path="admin/events/:id/edit" element={<ProtectedRoute requiredRole="admin"><S><AdminEditEventPage /></S></ProtectedRoute>} />
    <Route path="admin/users" element={<ProtectedRoute requiredRole="admin"><S><AdminUsersPage /></S></ProtectedRoute>} />
    <Route path="admin/users/:id/edit" element={<ProtectedRoute requiredRole="admin"><S><AdminUserEditPage /></S></ProtectedRoute>} />
    <Route path="admin/vendors" element={<ProtectedRoute requiredRole="admin"><S><AdminVendorsPage /></S></ProtectedRoute>} />
    <Route path="admin/teachers" element={<ProtectedRoute requiredRole="admin"><S><AdminTeachersPage /></S></ProtectedRoute>} />
    <Route path="admin/teaching-events" element={<ProtectedRoute requiredRole="admin"><S><AdminTeachingEventsPage /></S></ProtectedRoute>} />
    <Route path="admin/teaching-events/:id/edit" element={<ProtectedRoute requiredRole="admin"><S><AdminTeachingEditEventPage /></S></ProtectedRoute>} />
    <Route path="admin/orders" element={<ProtectedRoute requiredRole="admin"><S><AdminOrdersPage /></S></ProtectedRoute>} />
    <Route path="admin/orders/:id" element={<ProtectedRoute requiredRole="admin"><S><AdminOrderDetailPage /></S></ProtectedRoute>} />
    <Route path="admin/payouts" element={<ProtectedRoute requiredRole="admin"><S><AdminPayoutsPage /></S></ProtectedRoute>} />
    <Route path="admin/commissions" element={<ProtectedRoute requiredRole="admin"><S><AdminCommissionsPage /></S></ProtectedRoute>} />
    <Route path="admin/commissions/transactions/:id" element={<ProtectedRoute requiredRole="admin"><S><AdminCommissionTransactionDetailPage /></S></ProtectedRoute>} />
    <Route path="admin/coupons" element={<ProtectedRoute requiredRole="admin"><S><AdminCouponsPage /></S></ProtectedRoute>} />
    <Route path="admin/categories" element={<ProtectedRoute requiredRole="admin"><S><AdminCategoriesPage /></S></ProtectedRoute>} />
    <Route path="admin/collections" element={<ProtectedRoute requiredRole="admin"><S><AdminCollectionsPage /></S></ProtectedRoute>} />
    <Route path="admin/blogs" element={<ProtectedRoute requiredRole="admin"><S><AdminBlogsPage /></S></ProtectedRoute>} />
    <Route path="admin/blogs/new" element={<ProtectedRoute requiredRole="admin"><S><AdminBlogEditPage /></S></ProtectedRoute>} />
    <Route path="admin/blogs/:id/edit" element={<ProtectedRoute requiredRole="admin"><S><AdminBlogEditPage /></S></ProtectedRoute>} />
    <Route path="admin/blog-categories" element={<ProtectedRoute requiredRole="admin"><S><AdminBlogCategoriesPage /></S></ProtectedRoute>} />
    <Route path="admin/settings" element={<ProtectedRoute requiredRole="admin"><S><AdminSettingsPage /></S></ProtectedRoute>} />
    <Route path="admin/media" element={<ProtectedRoute requiredRole="admin"><S><AdminMediaPage /></S></ProtectedRoute>} />
    <Route path="admin/analytics" element={<ProtectedRoute requiredRole="admin"><S><AdminAnalyticsPage /></S></ProtectedRoute>} />
    <Route path="admin/reviews" element={<ProtectedRoute requiredRole="admin"><S><AdminReviewsPage /></S></ProtectedRoute>} />
    <Route path="admin/banners" element={<ProtectedRoute requiredRole="admin"><S><AdminBannersPage /></S></ProtectedRoute>} />
    <Route path="admin/popups" element={<ProtectedRoute requiredRole="admin"><S><AdminPopupsPage /></S></ProtectedRoute>} />
    <Route path="admin/announcements" element={<ProtectedRoute requiredRole="admin"><S><AdminAnnouncementsPage /></S></ProtectedRoute>} />
    <Route path="admin/seo" element={<ProtectedRoute requiredRole="admin"><S><AdminSEOPage /></S></ProtectedRoute>} />
    <Route path="admin/affiliates" element={<ProtectedRoute requiredRole="admin"><S><AdminAffiliateAnalyticsPage /></S></ProtectedRoute>} />
    <Route path="admin/submissions" element={<ProtectedRoute requiredRole="admin"><S><AdminSubmissionsPage /></S></ProtectedRoute>} />
    <Route path="admin/bulk-import" element={<ProtectedRoute requiredRole="admin"><S><BulkImportPage /></S></ProtectedRoute>} />
    <Route path="admin/employees" element={<ProtectedRoute requiredRole="admin"><S><EmployeeManagement /></S></ProtectedRoute>} />
    <Route path="admin/reels" element={<ProtectedRoute requiredRole="admin"><S><ReelsManagementPage /></S></ProtectedRoute>} />
    <Route path="admin/partnerships" element={<ProtectedRoute requiredRole="admin"><S><AdminPartnershipsPage /></S></ProtectedRoute>} />
    <Route path="admin/file-manager" element={<ProtectedRoute requiredRole="admin"><S><FileManager /></S></ProtectedRoute>} />
    <Route path="admin/blog-style-guide" element={<ProtectedRoute requiredRole="admin"><S><BlogStyleGuidePage /></S></ProtectedRoute>} />

    {/* Admin Sub-Role Dashboards */}
    <Route path="admin/moderation" element={<ProtectedRoute requiredRole="moderator"><S><ModeratorDashboardPage /></S></ProtectedRoute>} />
    <Route path="admin/blogs" element={<ProtectedRoute requiredRole="blog_writer"><S><BlogWriterDashboardPage /></S></ProtectedRoute>} />
    <Route path="admin/support" element={<ProtectedRoute requiredRole="support_agent"><S><SupportAgentDashboardPage /></S></ProtectedRoute>} />
    <Route path="admin/media" element={<ProtectedRoute requiredRole="content_manager"><S><ContentManagerDashboardPage /></S></ProtectedRoute>} />
    <Route path="admin/finance" element={<ProtectedRoute requiredRole="finance_manager"><S><FinanceManagerDashboardPage /></S></ProtectedRoute>} />

    {/* Super Admin Routes */}
    <Route path="admin/super-admin" element={<ProtectedRoute requiredRole="super_admin"><S><SuperAdminDashboardPage /></S></ProtectedRoute>} />
    <Route path="admin/admin-roles" element={<ProtectedRoute requiredRole="super_admin"><S><AdminManagementPage /></S></ProtectedRoute>} />
    <Route path="admin/feature-flags" element={<ProtectedRoute requiredRole="super_admin"><S><FeatureFlagsPage /></S></ProtectedRoute>} />
    <Route path="admin/system-health" element={<ProtectedRoute requiredRole="super_admin"><S><SystemHealthPage /></S></ProtectedRoute>} />
    <Route path="admin/audit-logs" element={<ProtectedRoute requiredRole="super_admin"><S><AuditLogsPage /></S></ProtectedRoute>} />
    <Route path="admin/api-keys" element={<ProtectedRoute requiredRole="super_admin"><S><ApiKeysPage /></S></ProtectedRoute>} />
    <Route path="admin/impersonate" element={<ProtectedRoute requiredRole="super_admin"><S><ImpersonateUserPage /></S></ProtectedRoute>} />

    {/* New Admin Pages */}
    <Route path="admin/schools" element={<ProtectedRoute requiredRole="admin"><S><AdminSchoolsPage /></S></ProtectedRoute>} />
    <Route path="admin/lms/courses" element={<ProtectedRoute requiredRole="admin"><S><AdminLMSCoursesPage /></S></ProtectedRoute>} />
    <Route path="admin/certificates" element={<ProtectedRoute requiredRole="admin"><S><AdminCertificatesPage /></S></ProtectedRoute>} />
    <Route path="admin/students" element={<ProtectedRoute requiredRole="admin"><S><AdminStudentsPage /></S></ProtectedRoute>} />
    <Route path="admin/complaints" element={<ProtectedRoute requiredRole="admin"><S><AdminComplaintsPage /></S></ProtectedRoute>} />
    <Route path="admin/calendar" element={<ProtectedRoute requiredRole="admin"><S><AdminCalendarPage /></S></ProtectedRoute>} />
  </>
);
