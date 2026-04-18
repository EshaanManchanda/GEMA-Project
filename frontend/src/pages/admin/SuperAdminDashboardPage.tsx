import { Link } from 'react-router-dom';
import { Users, Calendar, Activity, Shield, Flag, Key, Database, UserCog, Settings } from 'lucide-react';
import { Card } from '@shared/components/ui/Card';
import { Skeleton } from '@shared/components/ui/Skeleton';
import { useSystemHealth, useDatabaseStats, useAdminRoles, useAuditLogs } from '@features/admin/hooks/useSuperAdmin';
import { useCurrentUser } from '@features/auth/hooks/useAuth';

const QUICK_ACTIONS = [
  { icon: <UserCog className="h-5 w-5" />, label: 'Manage Admins', link: '/admin/admin-roles', color: 'bg-blue-500' },
  { icon: <Flag className="h-5 w-5" />, label: 'Feature Flags', link: '/admin/feature-flags', color: 'bg-purple-500' },
  { icon: <Database className="h-5 w-5" />, label: 'System Health', link: '/admin/system-health', color: 'bg-green-500' },
  { icon: <Key className="h-5 w-5" />, label: 'API Keys', link: '/admin/api-keys', color: 'bg-orange-500' },
  { icon: <Shield className="h-5 w-5" />, label: 'Audit Logs', link: '/admin/audit-logs', color: 'bg-red-500' },
  { icon: <Settings className="h-5 w-5" />, label: 'Settings', link: '/admin/settings', color: 'bg-gray-600' },
];

export function SuperAdminDashboardPage() {
  const { data: user } = useCurrentUser();
  const { data: healthData, isLoading: healthLoading } = useSystemHealth();
  const { data: dbData } = useDatabaseStats();
  const { data: adminsData } = useAdminRoles({ limit: 5 });
  const { data: auditData } = useAuditLogs({ limit: 5 });

  const health = healthData?.health;
  const admins = adminsData?.adminRoles || [];
  const audits = auditData?.logs || [];

  if (healthLoading) return <DashboardSkeleton />;

  const stats = [
    { icon: <Users className="h-5 w-5" />, label: 'Total Admins', value: adminsData?.pagination?.total || 0, color: 'bg-blue-500' },
    { icon: <Activity className="h-5 w-5" />, label: 'System Status', value: health?.status || 'unknown', color: health?.status === 'healthy' ? 'bg-green-500' : health?.status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500' },
    { icon: <Database className="h-5 w-5" />, label: 'Collections', value: dbData?.stats?.collections || 0, color: 'bg-purple-500' },
    { icon: <Calendar className="h-5 w-5" />, label: 'Uptime', value: health ? `${Math.floor(health.uptime / 3600)}h` : '—', color: 'bg-orange-500' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Super Admin Dashboard</h1>
        <p className="text-gray-500 mt-1">Welcome back, {user?.firstName}! Platform overview and system controls.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s, i) => (
          <Card key={i} className="p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${s.color} text-white flex items-center justify-center`}>{s.icon}</div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                <p className="text-sm text-gray-500">{s.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card className="p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {QUICK_ACTIONS.map((action) => (
            <Link key={action.label} to={action.link} className="flex flex-col items-center p-4 rounded-lg hover:bg-gray-50 transition-colors">
              <div className={`w-12 h-12 rounded-lg ${action.color} text-white flex items-center justify-center mb-2`}>{action.icon}</div>
              <span className="text-sm font-medium text-gray-700 text-center">{action.label}</span>
            </Link>
          ))}
        </div>
      </Card>

      {/* Recent Activity + Admin List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
          {audits.length === 0 ? (
            <p className="text-gray-500 text-sm">No recent activity</p>
          ) : (
            <div className="space-y-3">
              {audits.map((log: any) => (
                <div key={log._id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{log.action}</p>
                    <p className="text-xs text-gray-500">{log.resource}</p>
                  </div>
                  <span className="text-xs text-gray-400">{new Date(log.timestamp).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Admins</h2>
          {admins.length === 0 ? (
            <p className="text-gray-500 text-sm">No admin roles found</p>
          ) : (
            <div className="space-y-3">
              {admins.map((admin: any) => (
                <div key={admin._id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{admin.userId?.firstName} {admin.userId?.lastName}</p>
                    <p className="text-xs text-gray-500">{admin.role}</p>
                  </div>
                  <span className={`px-2 py-0.5 text-xs rounded-full ${admin.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {admin.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* System Info */}
      <Card className="p-6 mt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">System Information</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div><span className="text-gray-500">Platform:</span> <span className="ml-2 font-medium">{health?.platform}</span></div>
          <div><span className="text-gray-500">Node:</span> <span className="ml-2 font-medium">{health?.nodeVersion}</span></div>
          <div><span className="text-gray-500">CPU Cores:</span> <span className="ml-2 font-medium">{health?.cpu?.cores}</span></div>
          <div><span className="text-gray-500">Memory Used:</span> <span className="ml-2 font-medium">{health ? `${(health.memory.used / 1024 / 1024).toFixed(0)}MB` : '—'}</span></div>
        </div>
      </Card>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <Skeleton className="h-10 w-64" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-20" />)}</div>
      <Skeleton className="h-40" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">{[1,2].map(i => <Skeleton key={i} className="h-64" />)}</div>
    </div>
  );
}
