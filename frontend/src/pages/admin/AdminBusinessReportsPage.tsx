import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Loader2 } from 'lucide-react';
import PrivatePageSEO from '@/components/common/PrivatePageSEO';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { Card, CardContent } from '@/components/ui/Card';
import { Button, Badge, TrendBadge } from '@/components/ui';
import { useBusinessReportOverviewQuery } from '@/hooks/queries/useBusinessReportQuery';
import { useBulkGenerateMutation } from '@/hooks/mutations/useBusinessReportMutations';
import type { OverviewFilters, OverviewRow } from '@/types/businessReport';

const currentPeriod = () => {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
};

const FILTERS: Array<{ value: OverviewFilters['filter']; label: string }> = [
  { value: undefined, label: 'All vendors' },
  { value: 'top_performer', label: 'Top performers' },
  { value: 'growing', label: 'Growing' },
  { value: 'declining', label: 'Declining' },
  { value: 'new', label: 'New' },
  { value: 'low_performers', label: 'Low performers (<50%)' },
  { value: 'inactive', label: 'No report yet' },
];

const LIFECYCLE_BADGE: Record<string, { label: string; variant: 'success' | 'warning' | 'error' | 'secondary' | 'outline' }> = {
  top_performer: { label: 'Top performer', variant: 'success' },
  growing: { label: 'Growing', variant: 'success' },
  declining: { label: 'Declining', variant: 'error' },
  new: { label: 'New', variant: 'secondary' },
  inactive: { label: 'Inactive', variant: 'outline' },
  steady: { label: 'Steady', variant: 'outline' },
};

const scoreColor = (score: number | null) => {
  if (score === null) return 'text-gray-400';
  if (score >= 80) return 'text-green-600';
  if (score >= 50) return 'text-amber-600';
  return 'text-red-600';
};

const AdminBusinessReportsPage: React.FC = () => {
  const navigate = useNavigate();
  const [period] = useState(currentPeriod());
  const [filter, setFilter] = useState<OverviewFilters['filter']>(undefined);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);

  const filters: OverviewFilters = useMemo(
    () => ({ period, filter, page, limit: 20, sortBy: 'overall' }),
    [period, filter, page]
  );

  const { data, isLoading, isFetching, refetch } = useBusinessReportOverviewQuery(filters);
  const bulkGenerate = useBulkGenerateMutation();

  const rows = data?.rows ?? [];
  const pagination = data?.pagination;

  const toggleSelected = (vendorId: string) => {
    setSelected((prev) =>
      prev.includes(vendorId) ? prev.filter((id) => id !== vendorId) : [...prev, vendorId]
    );
  };

  const toggleSelectAll = () => {
    setSelected((prev) => (prev.length === rows.length ? [] : rows.map((r) => r.vendorId)));
  };

  const handleBulkGenerate = () => {
    if (selected.length === 0) return;
    bulkGenerate.mutate(
      { vendorIds: selected, period },
      { onSuccess: () => setSelected([]) }
    );
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PrivatePageSEO title="Admin - Business Reports | Kidrove" description="Vendor business health leaderboard" />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Business Reports</h1>
          <p className="text-sm text-gray-500">
            Vendor business health for {period} — scores below reflect only the dimensions with real data.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            leftIcon={<RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </Button>
          <Button
            size="sm"
            disabled={selected.length === 0 || bulkGenerate.isPending}
            onClick={handleBulkGenerate}
            leftIcon={bulkGenerate.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : undefined}
          >
            Generate for {selected.length || ''} selected
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.label}
            onClick={() => {
              setFilter(f.value);
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              filter === f.value
                ? 'bg-primary-600 text-white border-primary-600'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <Card variant="elevated">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <LoadingSpinner />
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              No vendors match this filter for {period}.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={selected.length === rows.length && rows.length > 0}
                        onChange={toggleSelectAll}
                        aria-label="Select all vendors"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Overall</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Confidence</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trend</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {rows.map((row: OverviewRow) => (
                    <tr key={row.vendorId} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selected.includes(row.vendorId)}
                          onChange={() => toggleSelected(row.vendorId)}
                          aria-label={`Select ${row.businessName}`}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {row.logo ? (
                            <img src={row.logo} alt="" className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-medium text-xs">
                              {row.businessName?.charAt(0)?.toUpperCase() ?? '?'}
                            </div>
                          )}
                          <div>
                            <button
                              className="font-medium text-gray-900 hover:text-primary-600 text-left block"
                              onClick={() => navigate(`/admin/business-reports/vendors/${row.vendorId}`)}
                            >
                              {row.businessName}
                            </button>
                            {row.segments && LIFECYCLE_BADGE[row.segments.lifecycle] && (
                              <Badge variant={LIFECYCLE_BADGE[row.segments.lifecycle].variant} size="sm">
                                {LIFECYCLE_BADGE[row.segments.lifecycle].label}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {row.scores?.overall !== null && row.scores?.overall !== undefined ? (
                          <span className={`font-semibold ${scoreColor(row.scores.overall)}`}>
                            {row.scores.overall}%
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">Not tracked</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {row.confidence ? (
                          <Badge
                            variant={
                              row.confidence.level === 'high'
                                ? 'success'
                                : row.confidence.level === 'medium'
                                ? 'warning'
                                : 'secondary'
                            }
                            size="sm"
                          >
                            {row.confidence.level} ({row.confidence.dimensionsScored}/{row.confidence.dimensionsTotal})
                          </Badge>
                        ) : (
                          <span className="text-gray-400 text-sm">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {row.overallDelta !== null ? (
                          <TrendBadge
                            direction={row.overallDelta > 0 ? 'up' : row.overallDelta < 0 ? 'down' : 'flat'}
                            changePercent={row.overallDelta}
                          />
                        ) : (
                          <span className="text-gray-400 text-sm">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {row.hasSnapshot ? (
                          <Badge
                            variant={row.snapshotStatus === 'locked' ? 'secondary' : 'outline'}
                            size="sm"
                          >
                            {row.snapshotStatus}
                          </Badge>
                        ) : (
                          <span className="text-gray-400 text-sm">No report</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/admin/business-reports/vendors/${row.vendorId}`)}
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {pagination && pagination.total > pagination.limit && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {(pagination.page - 1) * pagination.limit + 1}-
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page * pagination.limit >= pagination.total}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBusinessReportsPage;
