import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Flag, CheckCircle, AlertTriangle } from 'lucide-react';
import api from '@shared/services/api/client';
import { Card } from '@shared/components/ui/Card';
import { Badge } from '@shared/components/ui/Badge';
import { AdminPageHeader } from '@shared/components/admin/AdminPageHeader';
import { AdminStatCard } from '@shared/components/admin/AdminStatCard';
import { AdminEmptyState } from '@shared/components/admin/AdminEmptyState';
import { AdminFilterBar } from '@shared/components/admin/AdminFilterBar';
import { Skeleton } from '@shared/components/ui/Skeleton';

const COMPLAINT_STATUSES = [
  { value: '', label: 'All Statuses' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

export function AdminComplaintsPage() {
  const [filters, setFilters] = useState({ status: '' });
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'complaints', filters, page],
    queryFn: () => api.get('/complaints', { params: { ...filters, page, limit: 20 } }).then(r => r.data),
  });

  const complaints = data?.complaints || [];
  const pagination = data?.pagination;

  if (isLoading) return <PageSkeleton />;

  const stats = [
    { icon: <Flag className="h-5 w-5" />, label: 'Total Complaints', value: pagination?.total || 0, color: 'bg-blue-500' },
    { icon: <AlertTriangle className="h-5 w-5" />, label: 'Open', value: complaints.filter((c: any) => c.status === 'open').length, color: 'bg-red-500' },
    { icon: <Flag className="h-5 w-5" />, label: 'In Progress', value: complaints.filter((c: any) => c.status === 'in_progress').length, color: 'bg-yellow-500' },
    { icon: <CheckCircle className="h-5 w-5" />, label: 'Resolved', value: complaints.filter((c: any) => c.status === 'resolved').length, color: 'bg-green-500' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <AdminPageHeader title="Complaints" description="Manage and resolve user complaints" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((s, i) => <AdminStatCard key={i} {...s} />)}
      </div>

      <AdminFilterBar
        filters={[{ key: 'status', label: 'Status', options: COMPLAINT_STATUSES }]}
        onFilterChange={(f) => { setFilters({ status: f.status || '' }); setPage(1); }}
      />

      <Card className="overflow-hidden mt-6">
        <div className="divide-y divide-gray-200">
          {complaints.length === 0 ? (
            <AdminEmptyState title="No complaints found" />
          ) : (
            complaints.map((complaint: any) => (
              <div key={complaint._id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{complaint.subject || complaint.type}</p>
                    <p className="text-sm text-gray-500 mt-1">{complaint.description?.substring(0, 100)}...</p>
                    <p className="text-xs text-gray-400 mt-2">By {complaint.userId?.email || 'Anonymous'} · {new Date(complaint.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={complaint.status === 'open' ? 'danger' : complaint.status === 'in_progress' ? 'warning' : complaint.status === 'resolved' ? 'success' : 'default'}>
                      {complaint.status?.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {pagination && pagination.totalPages > 1 && (
          <div className="px-6 py-3 flex items-center justify-between border-t border-gray-200">
            <p className="text-sm text-gray-500">Page {pagination.currentPage} of {pagination.totalPages}</p>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 text-sm border rounded disabled:opacity-50">Previous</button>
              <button disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 text-sm border rounded disabled:opacity-50">Next</button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <Skeleton className="h-10 w-48" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-20" />)}</div>
      <Skeleton className="h-16" />
      <Skeleton className="h-96" />
    </div>
  );
}
