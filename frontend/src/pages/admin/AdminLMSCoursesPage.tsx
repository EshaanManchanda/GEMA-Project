import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, Users, Award, TrendingUp } from 'lucide-react';
import api from '@shared/services/api/client';
import { Card } from '@shared/components/ui/Card';
import { Badge } from '@shared/components/ui/Badge';
import { AdminPageHeader } from '@shared/components/admin/AdminPageHeader';
import { AdminStatCard } from '@shared/components/admin/AdminStatCard';
import { AdminEmptyState } from '@shared/components/admin/AdminEmptyState';
import { AdminFilterBar } from '@shared/components/admin/AdminFilterBar';
import { Skeleton } from '@shared/components/ui/Skeleton';
import { Link } from 'react-router-dom';

const COURSE_STATUSES = [
  { value: '', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
];

export function AdminLMSCoursesPage() {
  const [filters, setFilters] = useState({ status: '' });
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'lms', 'courses', filters, page],
    queryFn: () => api.get('/lms/courses', { params: { ...filters, page, limit: 20 } }).then(r => r.data),
  });

  const courses = data?.courses || [];
  const pagination = data?.pagination;

  if (isLoading) return <PageSkeleton />;

  const stats = [
    { icon: <BookOpen className="h-5 w-5" />, label: 'Total Courses', value: pagination?.total || 0, color: 'bg-blue-500' },
    { icon: <Users className="h-5 w-5" />, label: 'Total Students', value: courses.reduce((sum: number, c: any) => sum + (c.stats?.totalStudents || 0), 0), color: 'bg-green-500' },
    { icon: <Award className="h-5 w-5" />, label: 'Completion Rate', value: courses.length ? `${(courses.reduce((sum: number, c: any) => sum + (c.stats?.completionRate || 0), 0) / courses.length).toFixed(0)}%` : '—', color: 'bg-purple-500' },
    { icon: <TrendingUp className="h-5 w-5" />, label: 'Avg Grade', value: courses.length ? `${(courses.reduce((sum: number, c: any) => sum + (c.stats?.averageGrade || 0), 0) / courses.length).toFixed(0)}%` : '—', color: 'bg-orange-500' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <AdminPageHeader title="LMS Courses" description="Manage courses, lessons, and student enrollments" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((s, i) => <AdminStatCard key={i} {...s} />)}
      </div>

      <AdminFilterBar
        filters={[{ key: 'status', label: 'Status', options: COURSE_STATUSES }]}
        onFilterChange={(f) => { setFilters({ status: f.status || '' }); setPage(1); }}
      />

      <Card className="overflow-hidden mt-6">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Course</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Students</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Completion</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Grade</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {courses.length === 0 ? (
                <tr><td colSpan={6}><AdminEmptyState title="No courses found" /></td></tr>
              ) : (
                courses.map((course: any) => (
                  <tr key={course._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-900">{course.title}</p>
                      <p className="text-xs text-gray-500">{course.category} · {course.gradeLevel}</p>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={course.status === 'published' ? 'success' : course.status === 'archived' ? 'default' : 'warning'}>{course.status}</Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{course.stats?.totalStudents || 0}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{course.stats?.completionRate || 0}%</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{course.stats?.averageGrade || 0}%</td>
                    <td className="px-6 py-4 text-right">
                      <Link to={`/admin/lms/courses/${course._id}`} className="text-primary hover:underline text-sm">View</Link>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-20" />)}</div>
      <Skeleton className="h-16" />
      <Skeleton className="h-96" />
    </div>
  );
}
