import React, { useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Filler,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  useTrafficOverviewQuery,
  useTrafficReferrersQuery,
  useSearchConsoleSummaryQuery,
  useSearchConsoleQueriesQuery,
  useSearchConsolePagesQuery,
} from '@/hooks/queries/useAdminQuery';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Filler,
  Title,
  Tooltip,
  Legend,
);

type DayRange = 7 | 28 | 90;

// ─── KPI Card ────────────────────────────────────────────────
interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  loading?: boolean;
  color?: string;
}

const KpiCard: React.FC<KpiCardProps> = ({ title, value, subtitle, loading, color = 'blue' }) => {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-200',
    green: 'bg-green-50 border-green-200',
    purple: 'bg-purple-50 border-purple-200',
    orange: 'bg-orange-50 border-orange-200',
  };

  return (
    <div className={`rounded-xl border p-5 ${colors[color] || colors.blue}`}>
      <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
      {loading ? (
        <div className="h-8 bg-gray-200 rounded animate-pulse w-24 mb-1" />
      ) : (
        <p className="text-2xl font-bold text-gray-800">{value}</p>
      )}
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
    </div>
  );
};

// ─── Section Header ───────────────────────────────────────────
const SectionHeader: React.FC<{ title: string; subtitle?: string }> = ({ title, subtitle }) => (
  <div className="mb-4">
    <h2 className="text-base font-semibold text-gray-800">{title}</h2>
    {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
  </div>
);

// ─── GSC Not Configured Banner ────────────────────────────────
const GscNotConfigured: React.FC = () => (
  <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-5 text-sm text-yellow-800">
    <p className="font-semibold mb-1">Google Search Console not connected</p>
    <p>
      Set <code className="bg-yellow-100 px-1 rounded">GOOGLE_SERVICE_ACCOUNT_JSON</code> and{' '}
      <code className="bg-yellow-100 px-1 rounded">SEARCH_CONSOLE_SITE_URL</code> in your{' '}
      <code className="bg-yellow-100 px-1 rounded">.env</code> file to see search data.
    </p>
  </div>
);

// ─── Skeleton ─────────────────────────────────────────────────
const ChartSkeleton: React.FC<{ height?: string }> = ({ height = 'h-48' }) => (
  <div className={`${height} bg-gray-100 rounded-xl animate-pulse`} />
);

const TableSkeleton: React.FC = () => (
  <div className="space-y-2">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
    ))}
  </div>
);

// ─── Format helpers ────────────────────────────────────────────
const fmtNumber = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
  : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K`
  : String(n);

const fmtPct = (n: number) => `${(n * 100).toFixed(1)}%`;
const fmtPos = (n: number) => n.toFixed(1);

// ─── Chart defaults ────────────────────────────────────────────
const baseOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: { mode: 'index' as const, intersect: false },
  },
  scales: {
    x: { grid: { display: false }, ticks: { font: { size: 11 } } },
    y: { grid: { color: '#f3f4f6' }, ticks: { font: { size: 11 } } },
  },
};

// ─── Main Page ────────────────────────────────────────────────
const AdminTrafficPage: React.FC = () => {
  const [days, setDays] = useState<DayRange>(28);

  const trafficQ = useTrafficOverviewQuery(days);
  const referrersQ = useTrafficReferrersQuery(days);
  const gscSummaryQ = useSearchConsoleSummaryQuery(days);
  const gscQueriesQ = useSearchConsoleQueriesQuery(days);
  const gscPagesQ = useSearchConsolePagesQuery(days);

  const traffic = trafficQ.data?.data;
  const gscSummary = gscSummaryQ.data;
  const gscQueries = gscQueriesQ.data?.data ?? [];
  const gscPages = gscPagesQ.data?.data;
  const referrers = referrersQ.data?.data ?? [];

  const isGscConfigured = gscSummaryQ.data?.configured !== false;

  // ── Traffic trend chart ────────────────────────────────────
  const trafficTrendData = {
    labels: (traffic?.byDay ?? []).map((d: any) => d.date?.slice(5) ?? d._id?.slice(5)),
    datasets: [
      {
        label: 'Page Views',
        data: (traffic?.byDay ?? []).map((d: any) => d.views),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59,130,246,0.08)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 2,
      },
    ],
  };

  // ── GSC trend chart ────────────────────────────────────────
  const gscTrend = gscSummary?.data?.trend ?? [];
  const gscTrendData = {
    labels: gscTrend.map((r: any) => r.keys?.[0]?.slice(5) ?? ''),
    datasets: [
      {
        label: 'Clicks',
        data: gscTrend.map((r: any) => r.clicks ?? 0),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16,185,129,0.08)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 2,
        yAxisID: 'y',
      },
      {
        label: 'Impressions',
        data: gscTrend.map((r: any) => r.impressions ?? 0),
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245,158,11,0.08)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 2,
        yAxisID: 'y1',
      },
    ],
  };

  const gscTrendOptions = {
    ...baseOptions,
    plugins: { ...baseOptions.plugins, legend: { display: true, position: 'top' as const } },
    scales: {
      ...baseOptions.scales,
      y: { ...baseOptions.scales.y, position: 'left' as const, title: { display: true, text: 'Clicks' } },
      y1: {
        grid: { display: false },
        position: 'right' as const,
        title: { display: true, text: 'Impressions' },
      },
    },
  };

  // ── Device doughnut ────────────────────────────────────────
  const deviceMap: Record<string, { color: string; label: string }> = {
    desktop: { color: '#3b82f6', label: 'Desktop' },
    mobile:  { color: '#10b981', label: 'Mobile' },
    tablet:  { color: '#f59e0b', label: 'Tablet' },
    unknown: { color: '#9ca3af', label: 'Unknown' },
  };
  const byDevice: any[] = traffic?.byDevice ?? [];
  const deviceData = {
    labels: byDevice.map((d) => deviceMap[d.device]?.label ?? d.device),
    datasets: [{
      data: byDevice.map((d) => d.count),
      backgroundColor: byDevice.map((d) => deviceMap[d.device]?.color ?? '#9ca3af'),
      borderWidth: 1,
    }],
  };

  // ── Referrers bar chart ────────────────────────────────────
  const referrerData = {
    labels: referrers.map((r: any) => {
      try {
        const url = new URL(r.referrer);
        return url.hostname.replace('www.', '');
      } catch {
        return r.referrer?.slice(0, 30) ?? 'direct';
      }
    }),
    datasets: [{
      label: 'Visits',
      data: referrers.map((r: any) => r.count),
      backgroundColor: 'rgba(99,102,241,0.7)',
      borderRadius: 4,
    }],
  };

  const referrerOptions = {
    ...baseOptions,
    indexAxis: 'y' as const,
    scales: {
      x: { ...baseOptions.scales.x, grid: { color: '#f3f4f6' } },
      y: { ...baseOptions.scales.y, grid: { display: false } },
    },
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Traffic & Search Analytics</h1>
          <p className="text-sm text-gray-500 mt-0.5">Site traffic and Google Search Console performance</p>
        </div>
        <div className="flex gap-2">
          {([7, 28, 90] as DayRange[]).map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                days === d
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {d === 7 ? '7d' : d === 28 ? '28d' : '90d'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          title="Total Page Views"
          value={trafficQ.isLoading ? '—' : fmtNumber(traffic?.totalViews ?? 0)}
          subtitle={`Last ${days} days`}
          loading={trafficQ.isLoading}
          color="blue"
        />
        <KpiCard
          title="Unique Visitors"
          value={trafficQ.isLoading ? '—' : fmtNumber(traffic?.uniqueVisitors ?? 0)}
          subtitle="By session ID"
          loading={trafficQ.isLoading}
          color="green"
        />
        <KpiCard
          title="Google Impressions"
          value={
            !isGscConfigured ? 'N/A'
            : gscSummaryQ.isLoading ? '—'
            : fmtNumber(gscSummary?.data?.summary?.impressions ?? 0)
          }
          subtitle={isGscConfigured ? `Last ${days} days` : 'Not configured'}
          loading={gscSummaryQ.isLoading && isGscConfigured}
          color="purple"
        />
        <KpiCard
          title="Google Clicks"
          value={
            !isGscConfigured ? 'N/A'
            : gscSummaryQ.isLoading ? '—'
            : fmtNumber(gscSummary?.data?.summary?.clicks ?? 0)
          }
          subtitle={
            isGscConfigured && !gscSummaryQ.isLoading
              ? `CTR: ${fmtPct(gscSummary?.data?.summary?.ctr ?? 0)} · Pos: ${fmtPos(gscSummary?.data?.summary?.position ?? 0)}`
              : undefined
          }
          loading={gscSummaryQ.isLoading && isGscConfigured}
          color="orange"
        />
      </div>

      {/* Traffic Trend */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
        <SectionHeader title="Traffic Trend" subtitle={`Page views per day — last ${days} days`} />
        {trafficQ.isLoading ? (
          <ChartSkeleton height="h-56" />
        ) : (
          <div className="h-56">
            <Line data={trafficTrendData} options={baseOptions} />
          </div>
        )}
      </div>

      {/* GSC Trend */}
      {isGscConfigured && (
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <SectionHeader title="Search Performance Trend" subtitle="Google clicks & impressions over time" />
          {gscSummaryQ.isLoading ? (
            <ChartSkeleton height="h-56" />
          ) : (
            <div className="h-56">
              <Line data={gscTrendData} options={gscTrendOptions} />
            </div>
          )}
        </div>
      )}

      {!isGscConfigured && <GscNotConfigured />}

      {/* Top Pages + Device Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top pages from PageView */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <SectionHeader title="Top Pages (Traffic)" subtitle="Most visited pages" />
          {trafficQ.isLoading ? (
            <TableSkeleton />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 border-b border-gray-50">
                    <th className="pb-2 font-medium">Page</th>
                    <th className="pb-2 font-medium text-right">Views</th>
                  </tr>
                </thead>
                <tbody>
                  {(traffic?.topPages ?? []).map((p: any, i: number) => (
                    <tr key={i} className="border-b border-gray-50 last:border-0">
                      <td className="py-2 text-gray-700 truncate max-w-[200px]" title={p.path}>
                        {p.path}
                      </td>
                      <td className="py-2 text-right font-medium text-gray-800">
                        {fmtNumber(p.views)}
                      </td>
                    </tr>
                  ))}
                  {(traffic?.topPages ?? []).length === 0 && (
                    <tr><td colSpan={2} className="py-6 text-center text-gray-400 text-xs">No data yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Device breakdown */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <SectionHeader title="Device Breakdown" subtitle="Traffic by device type" />
          {trafficQ.isLoading ? (
            <ChartSkeleton />
          ) : byDevice.length > 0 ? (
            <div className="h-48 flex items-center justify-center">
              <Doughnut
                data={deviceData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: true, position: 'right' } },
                  cutout: '65%',
                }}
              />
            </div>
          ) : (
            <p className="text-center text-gray-400 text-xs py-12">No device data yet</p>
          )}
        </div>
      </div>

      {/* GSC sections */}
      {isGscConfigured && (
        <>
          {/* Top Search Queries */}
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <SectionHeader title="Top Search Queries" subtitle="Keywords driving traffic from Google" />
            {gscQueriesQ.isLoading ? (
              <TableSkeleton />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-400 border-b border-gray-50">
                      <th className="pb-2 font-medium">Query</th>
                      <th className="pb-2 font-medium text-right">Clicks</th>
                      <th className="pb-2 font-medium text-right">Impressions</th>
                      <th className="pb-2 font-medium text-right">CTR</th>
                      <th className="pb-2 font-medium text-right">Avg Position</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gscQueries.map((row: any, i: number) => (
                      <tr key={i} className="border-b border-gray-50 last:border-0">
                        <td className="py-2 text-gray-700 max-w-[240px] truncate" title={row.keys?.[0]}>
                          {row.keys?.[0] ?? '—'}
                        </td>
                        <td className="py-2 text-right font-medium text-gray-800">{fmtNumber(row.clicks ?? 0)}</td>
                        <td className="py-2 text-right text-gray-600">{fmtNumber(row.impressions ?? 0)}</td>
                        <td className="py-2 text-right text-gray-600">{fmtPct(row.ctr ?? 0)}</td>
                        <td className="py-2 text-right text-gray-600">{fmtPos(row.position ?? 0)}</td>
                      </tr>
                    ))}
                    {gscQueries.length === 0 && (
                      <tr><td colSpan={5} className="py-6 text-center text-gray-400 text-xs">No query data available</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Top Landing Pages (GSC) + Countries */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <SectionHeader title="Top Landing Pages (Google)" subtitle="Pages with the most clicks from search" />
              {gscPagesQ.isLoading ? (
                <TableSkeleton />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-400 border-b border-gray-50">
                        <th className="pb-2 font-medium">Page</th>
                        <th className="pb-2 font-medium text-right">Clicks</th>
                        <th className="pb-2 font-medium text-right">CTR</th>
                        <th className="pb-2 font-medium text-right">Pos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(gscPages?.pages ?? []).map((row: any, i: number) => {
                        const page = row.keys?.[0] ?? '';
                        let displayPage = page;
                        try { displayPage = new URL(page).pathname; } catch {}
                        return (
                          <tr key={i} className="border-b border-gray-50 last:border-0">
                            <td className="py-2 text-gray-700 max-w-[200px] truncate" title={page}>
                              {displayPage}
                            </td>
                            <td className="py-2 text-right font-medium text-gray-800">{fmtNumber(row.clicks ?? 0)}</td>
                            <td className="py-2 text-right text-gray-600">{fmtPct(row.ctr ?? 0)}</td>
                            <td className="py-2 text-right text-gray-600">{fmtPos(row.position ?? 0)}</td>
                          </tr>
                        );
                      })}
                      {(gscPages?.pages ?? []).length === 0 && (
                        <tr><td colSpan={4} className="py-6 text-center text-gray-400 text-xs">No page data available</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <SectionHeader title="Search by Country" subtitle="Where your Google traffic comes from" />
              {gscPagesQ.isLoading ? (
                <TableSkeleton />
              ) : (
                <div className="overflow-y-auto max-h-64">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-400 border-b border-gray-50">
                        <th className="pb-2 font-medium">Country</th>
                        <th className="pb-2 font-medium text-right">Clicks</th>
                        <th className="pb-2 font-medium text-right">Impressions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(gscPages?.countries ?? []).map((row: any, i: number) => (
                        <tr key={i} className="border-b border-gray-50 last:border-0">
                          <td className="py-2 text-gray-700 uppercase">{row.keys?.[0] ?? '—'}</td>
                          <td className="py-2 text-right font-medium text-gray-800">{fmtNumber(row.clicks ?? 0)}</td>
                          <td className="py-2 text-right text-gray-600">{fmtNumber(row.impressions ?? 0)}</td>
                        </tr>
                      ))}
                      {(gscPages?.countries ?? []).length === 0 && (
                        <tr><td colSpan={3} className="py-6 text-center text-gray-400 text-xs">No country data available</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Top Referrers */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
        <SectionHeader title="Top Referrers" subtitle="Sites sending traffic to you" />
        {referrersQ.isLoading ? (
          <ChartSkeleton height="h-48" />
        ) : referrers.length > 0 ? (
          <div className="h-48">
            <Bar data={referrerData} options={referrerOptions} />
          </div>
        ) : (
          <p className="text-center text-gray-400 text-xs py-8">No referrer data yet. Referrer data appears once users arrive from external sources.</p>
        )}
      </div>
    </div>
  );
};

export default AdminTrafficPage;
