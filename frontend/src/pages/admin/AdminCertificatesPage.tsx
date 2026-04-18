import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Award, Users, CheckCircle, Download } from 'lucide-react';
import api from '@shared/services/api/client';
import { Card } from '@shared/components/ui/Card';
import { Badge } from '@shared/components/ui/Badge';
import { Button } from '@shared/components/ui/Button';
import { AdminPageHeader } from '@shared/components/admin/AdminPageHeader';
import { AdminStatCard } from '@shared/components/admin/AdminStatCard';
import { AdminEmptyState } from '@shared/components/admin/AdminEmptyState';
import { AdminFilterBar } from '@shared/components/admin/AdminFilterBar';
import { Skeleton } from '@shared/components/ui/Skeleton';

const CERT_STATUSES = [
  { value: '', label: 'All Statuses' },
  { value: 'generated', label: 'Generated' },
  { value: 'sent', label: 'Sent' },
  { value: 'downloaded', label: 'Downloaded' },
  { value: 'pending', label: 'Pending' },
];

export function AdminCertificatesPage() {
  const [filters, setFilters] = useState({ status: '' });
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'certificates', filters, page],
    queryFn: () => api.get('/certificates/records', { params: { ...filters, page, limit: 20 } }).then(r => r.data),
  });

  const certificates = data?.certificates || [];
  const pagination = data?.pagination;

  if (isLoading) return <PageSkeleton />;

  const stats = [
    { icon: <Award className="h-5 w-5" />, label: 'Total Certificates', value: pagination?.total || 0, color: 'bg-blue-500' },
    { icon: <CheckCircle className="h-5 w-5" />, label: 'Generated', value: certificates.filter((c: any) => c.status === 'generated').length, color: 'bg-green-500' },
    { icon: <Download className="h-5 w-5" />, label: 'Downloaded', value: certificates.filter((c: any) => c.status === 'downloaded').length, color: 'bg-purple-500' },
    { icon: <Users className="h-5 w-5" />, label: 'Pending', value: certificates.filter((c: any) => c.status === 'pending').length, color: 'bg-orange-500' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <AdminPageHeader title="Certificates" description="Manage certificate generation and distribution" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((s, i) => <AdminStatCard key={i} {...s} />)}
      </div>

      <AdminFilterBar
        filters={[{ key: 'status', label: 'Status', options: CERT_STATUSES }]}
        onFilterChange={(f) => { setFilters({ status: f.status || '' }); setPage(1); }}
      />

      <Card className="overflow-hidden mt-6">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Certificate #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Issued</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {certificates.length === 0 ? (
                <tr><td colSpan={6}><AdminEmptyState title="No certificates found" /></td></tr>
              ) : (
                certificates.map((cert: any) => (
                  <tr key={cert._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <p className="text-sm font-mono text-gray-900">{cert.certificateNumber}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900">{cert.studentId?.firstName} {cert.studentId?.lastName}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-500 capitalize">{cert.templateId?.type || '—'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={cert.status === 'generated' ? 'success' : cert.status === 'sent' ? 'info' : cert.status === 'downloaded' ? 'default' : 'warning'}>
                        {cert.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{new Date(cert.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="ghost" size="sm" onClick={() => window.open(`/certificates/verify/${cert.verificationCode}`, '_blank')}>Verify</Button>
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
