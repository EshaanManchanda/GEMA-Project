import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, XCircle, Ban, RotateCcw } from 'lucide-react';
import api from '@shared/services/api/client';
import { Card } from '@shared/components/ui/Card';
import { AdminPageHeader } from '@shared/components/admin/AdminPageHeader';
import { AdminStatusBadge } from '@shared/components/admin/AdminStatusBadge';
import { AdminEmptyState } from '@shared/components/admin/AdminEmptyState';
import { AdminFilterBar } from '@shared/components/admin/AdminFilterBar';
import { Skeleton } from '@shared/components/ui/Skeleton';
import { notification } from '@shared/services/notification.service';

const SCHOOL_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'public', label: 'Public' },
  { value: 'private', label: 'Private' },
  { value: 'international', label: 'International' },
  { value: 'charter', label: 'Charter' },
  { value: 'training_center', label: 'Training Center' },
];

const VERIFICATION_STATUSES = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'verified', label: 'Verified' },
  { value: 'rejected', label: 'Rejected' },
];

export function AdminSchoolsPage() {
  const [filters, setFilters] = useState({ schoolType: '', verificationStatus: '' });
  const [page, setPage] = useState(1);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'schools', filters, page],
    queryFn: () => api.get('/schools', { params: { ...filters, page, limit: 20 } }).then(r => r.data),
  });

  const moderateSchool = useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) =>
      api.post(`/schools/${id}/moderate`, { action }).then(r => r.data),
    onSuccess: () => {
      notification.success('School updated');
      qc.invalidateQueries({ queryKey: ['admin', 'schools'] });
    },
  });

  const schools = data?.schools || [];
  const pagination = data?.pagination;

  const handleModerate = async (id: string, action: string) => {
    try {
      await moderateSchool.mutateAsync({ id, action });
    } catch (err: any) {
      notification.error(err.response?.data?.message || 'Failed to update school');
    }
  };

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <AdminPageHeader
        title="Schools"
        description="Manage educational institutions and their verification status"
      />

      <AdminFilterBar
        filters={[
          { key: 'schoolType', label: 'School Type', options: SCHOOL_TYPES },
          { key: 'verificationStatus', label: 'Status', options: VERIFICATION_STATUSES },
        ]}
        onFilterChange={(f) => {
          setFilters({ schoolType: f.schoolType || '', verificationStatus: f.verificationStatus || '' });
          setPage(1);
        }}
      />

      <Card className="overflow-hidden mt-6">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">School</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Teachers</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Students</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {schools.length === 0 ? (
                <tr><td colSpan={6}><AdminEmptyState title="No schools found" description="Try adjusting your filters." /></td></tr>
              ) : (
                schools.map((school: any) => (
                  <tr key={school._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-900">{school.schoolName}</p>
                      <p className="text-xs text-gray-500">{school.address?.city}, {school.address?.country}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-500 capitalize">{school.schoolType?.replace('_', ' ')}</span>
                    </td>
                    <td className="px-6 py-4">
                      <AdminStatusBadge
                        status={school.verificationStatus}
                        variant={school.verificationStatus === 'verified' ? 'success' : school.verificationStatus === 'rejected' ? 'danger' : 'warning'}
                      />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{school.stats?.totalTeachers || 0}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{school.stats?.totalStudents || 0}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {school.verificationStatus === 'pending' && (
                          <>
                            <button onClick={() => handleModerate(school._id, 'approve')} className="p-1 text-green-600 hover:bg-green-50 rounded" title="Approve"><CheckCircle className="h-4 w-4" /></button>
                            <button onClick={() => handleModerate(school._id, 'reject')} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Reject"><XCircle className="h-4 w-4" /></button>
                          </>
                        )}
                        {school.isSuspended ? (
                          <button onClick={() => handleModerate(school._id, 'unsuspend')} className="p-1 text-green-600 hover:bg-green-50 rounded" title="Reinstate"><RotateCcw className="h-4 w-4" /></button>
                        ) : (
                          <button onClick={() => handleModerate(school._id, 'suspend')} className="p-1 text-yellow-600 hover:bg-yellow-50 rounded" title="Suspend"><Ban className="h-4 w-4" /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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
      <Skeleton className="h-16" />
      <Skeleton className="h-96" />
    </div>
  );
}
