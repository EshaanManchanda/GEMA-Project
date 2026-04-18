import { useState } from 'react';
import { Shield, User, Globe, Clock, FileText } from 'lucide-react';
import { Card } from '@shared/components/ui/Card';
import { Badge } from '@shared/components/ui/Badge';
import { Input } from '@shared/components/ui/Input';
import { PageHeader } from '@shared/components/common/PageHeader';
import { Skeleton } from '@shared/components/ui/Skeleton';
import { useAuditLogs } from '@features/admin/hooks/useSuperAdmin';

export function AuditLogsPage() {
  const [filters, setFilters] = useState({ action: '', actorId: '', startDate: '', endDate: '' });
  const { data, isLoading } = useAuditLogs(filters);

  const logs = data?.logs || [];
  const pagination = data?.pagination;

  const handleFilterChange = (key: string, value: string) => {
    setFilters(f => ({ ...f, [key]: value }));
  };

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <PageHeader title="Audit Logs" description="Platform-wide activity trail for all admin actions" />

      {/* Filters */}
      <Card className="p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Input label="Action" placeholder="Filter by action" value={filters.action} onChange={(e) => handleFilterChange('action', e.target.value)} />
          <Input label="Actor ID" placeholder="Filter by user ID" value={filters.actorId} onChange={(e) => handleFilterChange('actorId', e.target.value)} />
          <Input label="Start Date" type="date" value={filters.startDate} onChange={(e) => handleFilterChange('startDate', e.target.value)} />
          <Input label="End Date" type="date" value={filters.endDate} onChange={(e) => handleFilterChange('endDate', e.target.value)} />
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Resource</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP Address</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {logs.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No audit logs found</td></tr>
              ) : (
                logs.map((log: any) => (
                  <tr key={log._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <ActionIcon action={log.action} />
                        <Badge variant="default" className="text-xs">{log.action}</Badge>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{log.actorId?.firstName} {log.actorId?.lastName}</p>
                          <p className="text-xs text-gray-500">{log.actorRole}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900">{log.resource}</p>
                      <p className="text-xs text-gray-500">{log.method}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 flex items-center gap-1"><Globe className="h-3 w-3" />{log.ipAddress}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(log.timestamp).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination && (
          <div className="px-6 py-3 flex items-center justify-between border-t border-gray-200">
            <p className="text-sm text-gray-500">Showing {logs.length} of {pagination.total} logs</p>
          </div>
        )}
      </Card>
    </div>
  );
}

function ActionIcon({ action }: { action: string }) {
  const iconClass = "h-4 w-4";
  switch (action) {
    case 'create': return <FileText className={`${iconClass} text-green-500`} />;
    case 'update': return <FileText className={`${iconClass} text-blue-500`} />;
    case 'delete': return <FileText className={`${iconClass} text-red-500`} />;
    case 'suspend': return <Shield className={`${iconClass} text-yellow-500`} />;
    case 'login': return <User className={`${iconClass} text-purple-500`} />;
    default: return <FileText className={`${iconClass} text-gray-400`} />;
  }
}

function PageSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-20" />
      <Skeleton className="h-96" />
    </div>
  );
}
