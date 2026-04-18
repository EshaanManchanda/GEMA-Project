import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, GraduationCap, Award, Calendar } from 'lucide-react';
import api from '@shared/services/api/client';
import { Card } from '@shared/components/ui/Card';
import { Badge } from '@shared/components/ui/Badge';
import { AdminPageHeader } from '@shared/components/admin/AdminPageHeader';
import { AdminStatCard } from '@shared/components/admin/AdminStatCard';
import { AdminEmptyState } from '@shared/components/admin/AdminEmptyState';
import { AdminFilterBar } from '@shared/components/admin/AdminFilterBar';
import { Skeleton } from '@shared/components/ui/Skeleton';

const ENROLLMENT_STATUSES = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'graduated', label: 'Graduated' },
  { value: 'transferred', label: 'Transferred' },
  { value: 'withdrawn', label: 'Withdrawn' },
];

export function AdminStudentsPage() {
  const [filters, setFilters] = useState({ enrollmentStatus: '' });
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'students', filters, page],
    queryFn: () => api.get('/students', { params: { ...filters, page, limit: 20 } }).then(r => r.data),
  });

  const students = data?.students || [];
  const pagination = data?.pagination;

  if (isLoading) return <PageSkeleton />;

  const stats = [
    { icon: <Users className="h-5 w-5" />, label: 'Total Students', value: pagination?.total || 0, color: 'bg-blue-500' },
    { icon: <GraduationCap className="h-5 w-5" />, label: 'Active', value: students.filter((s: any) => s.enrollmentStatus === 'active').length, color: 'bg-green-500' },
    { icon: <Award className="h-5 w-5" />, label: 'Graduated', value: students.filter((s: any) => s.enrollmentStatus === 'graduated').length, color: 'bg-purple-500' },
    { icon: <Calendar className="h-5 w-5" />, label: 'This Month', value: students.filter((s: any) => new Date(s.createdAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length, color: 'bg-orange-500' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <AdminPageHeader title="Students" description="Manage student profiles and enrollments" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((s, i) => <AdminStatCard key={i} {...s} />)}
      </div>

      <AdminFilterBar
        filters={[{ key: 'enrollmentStatus', label: 'Status', options: ENROLLMENT_STATUSES }]}
        onFilterChange={(f) => { setFilters({ enrollmentStatus: f.enrollmentStatus || '' }); setPage(1); }}
      />

      <Card className="overflow-hidden mt-6">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Grade</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Events</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Certificates</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {students.length === 0 ? (
                <tr><td colSpan={6}><AdminEmptyState title="No students found" /></td></tr>
              ) : (
                students.map((student: any) => (
                  <tr key={student._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-900">{student.firstName} {student.lastName}</p>
                      <p className="text-xs text-gray-500">{student.schoolId?.schoolName || '—'}</p>
                    </td>
                    <td className="px-6 py-4 text-sm font-mono text-gray-500">{student.studentId}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{student.grade}{student.section ? ` - ${student.section}` : ''}</td>
                    <td className="px-6 py-4">
                      <Badge variant={student.enrollmentStatus === 'active' ? 'success' : student.enrollmentStatus === 'graduated' ? 'info' : 'warning'}>
                        {student.enrollmentStatus}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{student.stats?.totalEventsAttended || 0}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{student.stats?.totalCertificatesEarned || 0}</td>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-20" />)}</div>
      <Skeleton className="h-16" />
      <Skeleton className="h-96" />
    </div>
  );
}
