import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Download,
  Lock,
  Unlock,
  Archive,
  Loader2,
  RefreshCw,
  Globe,
  Plus,
  Trash2,
  BadgeCheck,
} from 'lucide-react';
import PrivatePageSEO from '@/components/common/PrivatePageSEO';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { Card, CardContent } from '@/components/ui/Card';
import { Button, Badge, StatCard, ProgressBar, Textarea, TrendBadge } from '@/components/ui';
import ChartSkeleton from '@/components/charts/ChartSkeleton';
import vendorAPI from '@/services/api/vendorAPI';
import {
  useVendorHealthQuery,
  useVendorHealthHistoryQuery,
  useSnapshotQuery,
  usePromotionInputQuery,
} from '@/hooks/queries/useBusinessReportQuery';
import {
  useGenerateSnapshotMutation,
  useUpdateSnapshotStatusMutation,
  useUpdateSnapshotNotesMutation,
  useToggleTaskMutation,
  useSavePromotionInputMutation,
} from '@/hooks/mutations/useBusinessReportMutations';
import businessReportAPI from '@/services/api/businessReportAPI';
import type {
  DimensionKey,
  RecommendationSeverity,
  BusinessReportFormat,
  BusinessReportType,
  BannerPlacement,
  FeaturedListing,
  TopPost,
  OfflineCampaign,
  OfflineCampaignType,
} from '@/types/businessReport';

const BusinessScoreHistoryChart = React.lazy(
  () => import(/* webpackChunkName: "admin" */ '@/components/charts/BusinessScoreHistoryChart')
);

const currentPeriod = () => {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
};

const lastNPeriods = (n: number): string[] => {
  const periods: string[] = [];
  const now = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    periods.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
  }
  return periods;
};

const DIMENSION_LABELS: Record<DimensionKey, string> = {
  listing: 'Listing',
  sales: 'Sales',
  marketing: 'Marketing',
  customer: 'Customer',
  operations: 'Operations',
};

/** Mirrors backend/src/constants/businessHealth.rules.ts DIMENSION_WEIGHTS — keep in sync. */
const DIMENSION_WEIGHTS: Record<DimensionKey, number> = {
  listing: 0.2,
  sales: 0.25,
  marketing: 0.2,
  customer: 0.2,
  operations: 0.15,
};

const SEVERITY_VARIANT: Record<RecommendationSeverity, 'danger' | 'error' | 'warning' | 'secondary'> = {
  critical: 'danger',
  high: 'error',
  medium: 'warning',
  low: 'secondary',
};

const OFFLINE_CAMPAIGN_TYPES: OfflineCampaignType[] = [
  'billboard',
  'magazine',
  'tv',
  'radio',
  'influencer',
  'school_visit',
  'exhibition',
  'workshop',
  'other',
];

const TOP_POST_PLATFORMS: TopPost['platform'][] = ['instagram', 'facebook', 'tiktok', 'youtube', 'other'];

const AUDIT_ACTION_LABELS: Record<string, string> = {
  created: 'Created',
  regenerated: 'Regenerated',
  edited: 'Edited',
  locked: 'Locked',
  reopened: 'Reopened',
  archived: 'Archived',
  downloaded: 'Downloaded',
};

interface AdminVendorDetail {
  businessName: string;
  logo?: string;
  coverImage?: string;
  description?: string;
  website?: string;
  verificationStatus?: string;
  socialMedia?: Record<string, string | undefined>;
  createdAt?: string;
  stats?: {
    totalEvents: number;
    totalBookings: number;
    totalRevenue: number;
    averageRating: number;
    totalReviews: number;
  };
}

/** Only http(s) URLs are safe to drop into a `src`/`href` — rejects `javascript:`/`data:`/etc. rather than escaping them. */
function getSafeHttpUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? url : undefined;
  } catch {
    return undefined;
  }
}


/** Generic add/remove-row list editor, shared by the four promotion-input arrays below. */
function Repeater<T extends object>({
  title,
  hint,
  rows,
  onChange,
  newRow,
  renderRow,
}: {
  title: string;
  hint?: string;
  rows: T[];
  onChange: (rows: T[]) => void;
  newRow: () => T;
  renderRow: (row: T, update: (patch: Partial<T>) => void) => React.ReactNode;
}) {
  return (
    <div className="space-y-2 border-t border-gray-100 pt-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
          {hint && <p className="text-xs text-gray-400">{hint}</p>}
        </div>
        <Button variant="outline" size="sm" onClick={() => onChange([...rows, newRow()])} leftIcon={<Plus className="w-3.5 h-3.5" />}>
          Add
        </Button>
      </div>
      {rows.length === 0 && <p className="text-xs text-gray-400">None added for this period.</p>}
      {rows.map((row, i) => (
        <div key={i} className="flex flex-wrap items-end gap-2 bg-gray-50 rounded-lg p-2">
          {renderRow(row, (patch) => {
            const next = rows.slice();
            next[i] = { ...next[i], ...patch };
            onChange(next);
          })}
          <button
            type="button"
            onClick={() => onChange(rows.filter((_, idx) => idx !== i))}
            className="text-gray-400 hover:text-red-600 p-1.5"
            aria-label="Remove row"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

const fieldClass = 'border border-gray-200 rounded-lg px-2 py-1.5 text-sm';

interface PromoDraft {
  instagram?: number;
  facebook?: number;
  tiktok?: number;
  youtube?: number;
  impressions?: number;
  homepagePromotion: string;
  bannerPlacements: BannerPlacement[];
  featuredListings: FeaturedListing[];
  topPosts: TopPost[];
  offlineCampaigns: OfflineCampaign[];
}

const EMPTY_PROMO_DRAFT: PromoDraft = {
  homepagePromotion: '',
  bannerPlacements: [],
  featuredListings: [],
  topPosts: [],
  offlineCampaigns: [],
};

const AdminVendorBusinessReportPage: React.FC = () => {
  const { vendorId } = useParams<{ vendorId: string }>();
  const navigate = useNavigate();
  const [period, setPeriod] = useState(currentPeriod());
  const [reportType, setReportType] = useState<BusinessReportType>('health');
  const [downloading, setDownloading] = useState<BusinessReportFormat | null>(null);
  const [promoDraft, setPromoDraft] = useState<PromoDraft>(EMPTY_PROMO_DRAFT);

  const vendor = useQuery({
    queryKey: ['admin', 'vendor', vendorId],
    queryFn: () => vendorAPI.getAdminVendorById(vendorId as string),
    enabled: !!vendorId,
    staleTime: 5 * 60 * 1000,
  });

  const health = useVendorHealthQuery(vendorId!, period);
  const history = useVendorHealthHistoryQuery(vendorId!);
  const snapshot = useSnapshotQuery(vendorId!, period);
  const promotionInput = usePromotionInputQuery(vendorId!, period);

  const generateMutation = useGenerateSnapshotMutation();
  const statusMutation = useUpdateSnapshotStatusMutation();
  const notesMutation = useUpdateSnapshotNotesMutation();
  const toggleTaskMutation = useToggleTaskMutation();
  const savePromotionMutation = useSavePromotionInputMutation();

  const [vendorNotesDraft, setVendorNotesDraft] = useState<string | undefined>(undefined);
  const [internalNotesDraft, setInternalNotesDraft] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!promotionInput.data) return;
    setPromoDraft({
      instagram: promotionInput.data.socialReach?.instagram,
      facebook: promotionInput.data.socialReach?.facebook,
      tiktok: promotionInput.data.socialReach?.tiktok,
      youtube: promotionInput.data.socialReach?.youtube,
      impressions: promotionInput.data.impressions,
      homepagePromotion: promotionInput.data.homepagePromotion ?? '',
      bannerPlacements: promotionInput.data.bannerPlacements ?? [],
      featuredListings: promotionInput.data.featuredListings ?? [],
      topPosts: promotionInput.data.topPosts ?? [],
      offlineCampaigns: promotionInput.data.offlineCampaigns ?? [],
    });
  }, [promotionInput.data, period]);

  const chartData = useMemo(() => {
    return (history.data ?? []).map((h) => ({
      period: h.period,
      overall: h.scores.overall,
      listing: h.scores.listing,
      sales: h.scores.sales,
      marketing: h.scores.marketing,
      customer: h.scores.customer,
      operations: h.scores.operations,
    }));
  }, [history.data]);

  if (!vendorId) return null;

  const h = health.data;
  const snap = snapshot.data;
  const v = vendor.data as AdminVendorDetail | undefined;
  const safeLogo = v?.logo ? (v.logo.startsWith('/') || v.logo.startsWith('data:image/') ? v.logo : getSafeHttpUrl(v.logo)) : undefined;
  const safeWebsite = getSafeHttpUrl(v?.website);
  const vendorVisibleNotes = vendorNotesDraft ?? snap?.notes?.vendorVisible ?? '';
  const internalNotes = internalNotesDraft ?? snap?.notes?.internal ?? '';
  const recentAudit = (snap?.auditTrail ?? []).slice(-5).reverse();

  const handleDownload = async (format: BusinessReportFormat) => {
    setDownloading(format);
    try {
      await businessReportAPI.downloadReport(vendorId, period, reportType, format);
    } finally {
      setDownloading(null);
    }
  };

  const handleSaveNotes = () => {
    if (!snap?._id) return;
    notesMutation.mutate({
      snapshotId: snap._id,
      vendorId,
      notes: { vendorVisible: vendorVisibleNotes, internal: internalNotes },
    });
  };

  const handleSavePromotion = () => {
    savePromotionMutation.mutate({
      vendorId,
      period,
      input: {
        socialReach: {
          instagram: promoDraft.instagram,
          facebook: promoDraft.facebook,
          tiktok: promoDraft.tiktok,
          youtube: promoDraft.youtube,
        },
        impressions: promoDraft.impressions,
        homepagePromotion: promoDraft.homepagePromotion,
        bannerPlacements: promoDraft.bannerPlacements,
        featuredListings: promoDraft.featuredListings,
        topPosts: promoDraft.topPosts,
        offlineCampaigns: promoDraft.offlineCampaigns,
      },
    });
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      <PrivatePageSEO title="Admin - Vendor Business Report | Kidrove" description="Vendor business health detail" />

      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin/business-reports')}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
        >
          {lastNPeriods(12).map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        {snap?.status && (
          <Badge variant={snap.status === 'locked' ? 'secondary' : snap.status === 'archived' ? 'outline' : 'success'}>
            {snap.status}
          </Badge>
        )}
      </div>

      {/* Vendor identity header */}
      {v && (
        <Card variant="elevated">
          <CardContent className="p-5 flex flex-col sm:flex-row sm:items-start gap-4">
            {safeLogo ? (
              <img src={safeLogo} alt={v.businessName} className="w-16 h-16 rounded-lg object-cover border border-gray-100" />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 text-xl font-semibold">
                {v.businessName?.charAt(0)?.toUpperCase() ?? '?'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-semibold text-gray-900">{v.businessName}</h1>
                {v.verificationStatus && (
                  <Badge
                    variant={v.verificationStatus === 'verified' ? 'success' : 'secondary'}
                    icon={v.verificationStatus === 'verified' ? <BadgeCheck className="w-3 h-3" /> : undefined}
                    size="sm"
                  >
                    {v.verificationStatus}
                  </Badge>
                )}
              </div>
              {v.description && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{v.description}</p>}
              {safeWebsite && (
                <a
                  href={safeWebsite}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary-600 hover:underline mt-2"
                >
                  <Globe className="w-3 h-3" /> {v.website}
                </a>
              )}
              {(v.stats || v.createdAt) && (
                <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-xs text-gray-500">
                  {v.createdAt && (
                    <span>
                      Vendor since{' '}
                      <strong className="text-gray-800">
                        {new Date(v.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                      </strong>
                    </span>
                  )}
                  {v.stats && (
                    <>
                      <span>
                        All-time events <strong className="text-gray-800">{v.stats.totalEvents}</strong>
                      </span>
                      <span>
                        All-time bookings <strong className="text-gray-800">{v.stats.totalBookings}</strong>
                      </span>
                      <span>
                        All-time revenue{' '}
                        <strong className="text-gray-800">AED {v.stats.totalRevenue.toLocaleString()}</strong>
                      </span>
                      <span>
                        Rating{' '}
                        <strong className="text-gray-800">
                          {v.stats.totalReviews > 0 ? `${v.stats.averageRating.toFixed(1)} / 5` : '—'}
                        </strong>{' '}
                        ({v.stats.totalReviews} reviews)
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
            {snap && (
              <div className="text-xs text-gray-400 sm:text-right space-y-0.5 shrink-0">
                <div>Report v{snap.reportVersion} &middot; Ruleset v{snap.rulesetVersion}</div>
                <div>Generated {new Date(snap.generatedAt).toLocaleString()} ({snap.generatedBy})</div>
                {recentAudit.length > 0 && (
                  <div>
                    Last action: {AUDIT_ACTION_LABELS[recentAudit[0].action] ?? recentAudit[0].action} on{' '}
                    {new Date(recentAudit[0].at).toLocaleDateString()}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          {h && (
            <>
              <div className="text-3xl font-bold text-gray-900">
                {h.scores.overall !== null ? `${h.scores.overall}%` : 'Not tracked'}
              </div>
              <div className="text-sm text-gray-500">
                Business Health &middot; Confidence: {h.confidence.level} (
                {h.confidence.dimensionsScored}/{h.confidence.dimensionsTotal} dimensions)
              </div>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => health.refetch()}
            leftIcon={<RefreshCw className={`w-4 h-4 ${health.isFetching ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </Button>
          <Button
            size="sm"
            disabled={generateMutation.isPending || snap?.status === 'locked'}
            onClick={() => generateMutation.mutate({ vendorId, period })}
            leftIcon={generateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : undefined}
          >
            {snap ? 'Regenerate' : 'Generate'} Snapshot
          </Button>
          {snap && snap.status === 'draft' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => statusMutation.mutate({ snapshotId: snap._id, status: 'locked', vendorId })}
              leftIcon={<Lock className="w-4 h-4" />}
            >
              Lock
            </Button>
          )}
          {snap && snap.status === 'locked' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => statusMutation.mutate({ snapshotId: snap._id, status: 'reopened', vendorId })}
              leftIcon={<Unlock className="w-4 h-4" />}
            >
              Reopen
            </Button>
          )}
          {snap && snap.status !== 'archived' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => statusMutation.mutate({ snapshotId: snap._id, status: 'archived', vendorId })}
              leftIcon={<Archive className="w-4 h-4" />}
            >
              Archive
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={reportType}
          onChange={(e) => setReportType(e.target.value as BusinessReportType)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
        >
          <option value="health">Business Health Report</option>
          <option value="promotion">Promotion Snapshot</option>
        </select>
        <Button
          variant="outline"
          size="sm"
          disabled={downloading !== null}
          onClick={() => handleDownload('pdf')}
          leftIcon={downloading === 'pdf' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        >
          Download PDF
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={downloading !== null}
          onClick={() => handleDownload('csv')}
          leftIcon={downloading === 'csv' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        >
          Download CSV
        </Button>
      </div>

      {health.isLoading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner />
        </div>
      ) : h ? (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {h.metrics.slice(0, 8).map((m) => (
              <StatCard
                key={m.key}
                title={m.label}
                value={m.value === null ? 'Not tracked' : `${m.value}${m.unit ?? ''}`}
                subtitle={m.source === 'manual' ? 'Manually entered' : undefined}
                trend={
                  m.direction && m.changePercent !== undefined
                    ? { value: m.changePercent, label: 'vs last month', isPositive: m.direction === 'up' }
                    : undefined
                }
              />
            ))}
          </div>

          {/* Dimension scores */}
          <Card variant="elevated">
            <CardContent className="p-5 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Business Health</h2>
              <ProgressBar
                value={h.scores.overall}
                label="Overall"
                trailing={<TrendBadge direction={snap?.scoreTrends?.overall?.direction} changePercent={snap?.scoreTrends?.overall?.changePercent} label="vs last period" />}
              />
              {(Object.keys(DIMENSION_LABELS) as DimensionKey[]).map((dim) => (
                <ProgressBar
                  key={dim}
                  value={h.scores[dim]}
                  label={`${DIMENSION_LABELS[dim]} (${Math.round(DIMENSION_WEIGHTS[dim] * 100)}% weight)`}
                  trailing={<TrendBadge direction={snap?.scoreTrends?.[dim]?.direction} changePercent={snap?.scoreTrends?.[dim]?.changePercent} label="vs last period" />}
                />
              ))}
              {!snap && (
                <p className="text-xs text-gray-400">
                  Generate a snapshot to see period-over-period trend arrows here.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Score history chart */}
          {chartData.length > 0 && (
            <Card variant="elevated">
              <CardContent className="p-5">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Score History</h2>
                <Suspense fallback={<ChartSkeleton height={280} />}>
                  <BusinessScoreHistoryChart data={chartData} height={280} />
                </Suspense>
              </CardContent>
            </Card>
          )}

          {/* Top events */}
          {h.topEvents.length > 0 && (
            <Card variant="elevated">
              <CardContent className="p-5 space-y-3">
                <h2 className="text-lg font-semibold text-gray-900">Top Performing Events — This Period</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                        <th className="py-1.5 pr-3">Event</th>
                        <th className="py-1.5 pr-3">Revenue</th>
                        <th className="py-1.5 pr-3">Orders</th>
                        <th className="py-1.5 pr-3">Tickets</th>
                        <th className="py-1.5 pr-3">Views (all-time)</th>
                        <th className="py-1.5 pr-3">Rating</th>
                      </tr>
                    </thead>
                    <tbody>
                      {h.topEvents.map((ev, i) => (
                        <tr key={ev.eventId} className="border-b border-gray-50">
                          <td className="py-1.5 pr-3 text-gray-700">
                            <span className="inline-flex items-center gap-2">
                              {ev.coverImage ? (
                                <img src={ev.coverImage} alt="" className="w-6 h-6 rounded object-cover" />
                              ) : (
                                <span className="w-5 h-5 rounded-full bg-primary-100 text-primary-700 text-[10px] font-semibold flex items-center justify-center">
                                  {i + 1}
                                </span>
                              )}
                              {ev.title}
                            </span>
                          </td>
                          <td className="py-1.5 pr-3 font-medium text-gray-900">AED {ev.revenue.toLocaleString()}</td>
                          <td className="py-1.5 pr-3 text-gray-700">{ev.orders}</td>
                          <td className="py-1.5 pr-3 text-gray-700">{ev.tickets}</td>
                          <td className="py-1.5 pr-3 text-gray-700">{ev.viewsAllTime.toLocaleString()}</td>
                          <td className="py-1.5 pr-3 text-gray-700">
                            {ev.averageRating ? `${ev.averageRating.toFixed(1)} / 5` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Profile completion */}
          <Card variant="elevated">
            <CardContent className="p-5 space-y-3">
              <h2 className="text-lg font-semibold text-gray-900">
                Business Profile Completion — {h.profileCompletion.percent}%
              </h2>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                {h.profileCompletion.items.map((item) => (
                  <span
                    key={item.key}
                    className={`text-sm ${item.done ? 'text-green-600' : 'text-gray-400'}`}
                  >
                    {item.done ? '✓' : '✗'} {item.label}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* All metrics */}
          <Card variant="elevated">
            <CardContent className="p-5 space-y-3">
              <h2 className="text-lg font-semibold text-gray-900">All Metrics</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                      <th className="py-1.5 pr-3">Metric</th>
                      <th className="py-1.5 pr-3">Value</th>
                      <th className="py-1.5 pr-3">Trend</th>
                      <th className="py-1.5 pr-3">Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {h.metrics.map((m) => (
                      <tr key={m.key} className="border-b border-gray-50">
                        <td className="py-1.5 pr-3 text-gray-700">{m.label}</td>
                        <td className="py-1.5 pr-3 font-medium text-gray-900">
                          {m.value === null ? 'Not tracked' : `${m.value}${m.unit ?? ''}`}
                        </td>
                        <td className="py-1.5 pr-3">
                          {m.direction && m.changePercent !== undefined ? (
                            <span
                              className={
                                m.direction === 'up'
                                  ? 'text-green-600'
                                  : m.direction === 'down'
                                    ? 'text-red-600'
                                    : 'text-gray-400'
                              }
                            >
                              {m.direction === 'up' ? '▲' : m.direction === 'down' ? '▼' : '—'}{' '}
                              {m.changePercent > 0 ? '+' : ''}
                              {m.changePercent}%
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="py-1.5 pr-3 text-xs text-gray-400 capitalize">{m.source}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Recommendations */}
          <Card variant="elevated">
            <CardContent className="p-5 space-y-3">
              <h2 className="text-lg font-semibold text-gray-900">Recommendations</h2>
              {h.recommendations.length === 0 ? (
                <p className="text-sm text-gray-500">No recommendations — every scored dimension is at target.</p>
              ) : (
                <div className="space-y-3">
                  {h.recommendations.map((rec) => (
                    <div key={rec.code} className="border border-gray-100 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={SEVERITY_VARIANT[rec.severity]} size="sm">
                          {rec.severity}
                        </Badge>
                        <span className="font-medium text-gray-900">{rec.title}</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">{rec.reason}</p>
                      <p className="text-xs text-gray-500">
                        Current: <span className="font-medium">{rec.currentValue}</span> &rarr; Target:{' '}
                        <span className="font-medium">{rec.targetValue}</span>
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tasks */}
          <Card variant="elevated">
            <CardContent className="p-5 space-y-2">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Action Items</h2>
              {h.tasks.length === 0 ? (
                <p className="text-sm text-gray-500">No open action items.</p>
              ) : (
                h.tasks.map((task) => {
                  const isDone = snap?.tasks?.find(t => t.code === task.code)?.done ?? false;
                  return (
                    <label key={task.code} className={`flex items-center gap-2 text-sm ${!snap || snap.status === 'locked' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                      <input
                        type="checkbox"
                        checked={isDone}
                        disabled={!snap || snap.status === 'locked'}
                        onChange={(e) =>
                          toggleTaskMutation.mutate({
                            vendorId,
                            taskCode: task.code,
                            done: e.target.checked,
                            period,
                          })
                        }
                      />
                      <span className={isDone ? 'line-through text-gray-400' : 'text-gray-700'}>{task.label}</span>
                    </label>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Promotion input */}
          <Card variant="elevated">
            <CardContent className="p-5 space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Promotion Input ({period})</h2>
                <p className="text-xs text-gray-500">
                  Data Kidrove can't compute automatically — everything entered here appears in the Promotion
                  Snapshot PDF for this period.
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {(['instagram', 'facebook', 'tiktok', 'youtube'] as const).map((platform) => (
                  <div key={platform}>
                    <label className="text-xs text-gray-500 capitalize">{platform} reach</label>
                    <input
                      type="number"
                      min={0}
                      value={promoDraft[platform] ?? ''}
                      onChange={(e) =>
                        setPromoDraft((prev) => ({
                          ...prev,
                          [platform]: e.target.value ? Number(e.target.value) : undefined,
                        }))
                      }
                      className={`w-full ${fieldClass} mt-1`}
                    />
                  </div>
                ))}
              </div>
              <div>
                <label className="text-xs text-gray-500">Impressions</label>
                <input
                  type="number"
                  min={0}
                  value={promoDraft.impressions ?? ''}
                  onChange={(e) =>
                    setPromoDraft((prev) => ({
                      ...prev,
                      impressions: e.target.value ? Number(e.target.value) : undefined,
                    }))
                  }
                  className={`w-full md:w-1/4 ${fieldClass} mt-1`}
                />
              </div>
              <Textarea
                label="Homepage promotion notes"
                value={promoDraft.homepagePromotion}
                onChange={(e) => setPromoDraft((prev) => ({ ...prev, homepagePromotion: e.target.value }))}
                rows={2}
              />

              <Repeater<BannerPlacement>
                title="Banner Placements"
                hint="Homepage / category banners run for this vendor this period."
                rows={promoDraft.bannerPlacements}
                onChange={(rows) => setPromoDraft((prev) => ({ ...prev, bannerPlacements: rows }))}
                newRow={() => ({ label: '' })}
                renderRow={(row, update) => (
                  <>
                    <input
                      placeholder="Label"
                      value={row.label}
                      onChange={(e) => update({ label: e.target.value })}
                      className={`${fieldClass} flex-1 min-w-[120px]`}
                    />
                    <input
                      placeholder="Placement"
                      value={row.placement ?? ''}
                      onChange={(e) => update({ placement: e.target.value })}
                      className={`${fieldClass} w-32`}
                    />
                    <input
                      type="number"
                      min={0}
                      placeholder="Impressions"
                      value={row.impressions ?? ''}
                      onChange={(e) => update({ impressions: e.target.value ? Number(e.target.value) : undefined })}
                      className={`${fieldClass} w-28`}
                    />
                    <input
                      type="number"
                      min={0}
                      placeholder="Clicks"
                      value={row.clicks ?? ''}
                      onChange={(e) => update({ clicks: e.target.value ? Number(e.target.value) : undefined })}
                      className={`${fieldClass} w-24`}
                    />
                  </>
                )}
              />

              <Repeater<FeaturedListing>
                title="Featured Listings"
                hint="Events given homepage / search featuring this period."
                rows={promoDraft.featuredListings}
                onChange={(rows) => setPromoDraft((prev) => ({ ...prev, featuredListings: rows }))}
                newRow={() => ({ eventTitle: '' })}
                renderRow={(row, update) => (
                  <>
                    <input
                      placeholder="Event title"
                      value={row.eventTitle}
                      onChange={(e) => update({ eventTitle: e.target.value })}
                      className={`${fieldClass} flex-1 min-w-[160px]`}
                    />
                    <input
                      placeholder="Placement"
                      value={row.placement ?? ''}
                      onChange={(e) => update({ placement: e.target.value })}
                      className={`${fieldClass} w-32`}
                    />
                  </>
                )}
              />

              <Repeater<TopPost>
                title="Top Social Posts"
                hint="Best-performing posts promoting this vendor this period."
                rows={promoDraft.topPosts}
                onChange={(rows) => setPromoDraft((prev) => ({ ...prev, topPosts: rows }))}
                newRow={() => ({ platform: 'instagram' })}
                renderRow={(row, update) => (
                  <>
                    <select
                      value={row.platform}
                      onChange={(e) => update({ platform: e.target.value as TopPost['platform'] })}
                      className={`${fieldClass} w-28 capitalize`}
                    >
                      {TOP_POST_PLATFORMS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                    <input
                      placeholder="Caption"
                      value={row.caption ?? ''}
                      onChange={(e) => update({ caption: e.target.value })}
                      className={`${fieldClass} flex-1 min-w-[140px]`}
                    />
                    <input
                      type="number"
                      min={0}
                      placeholder="Reach"
                      value={row.reach ?? ''}
                      onChange={(e) => update({ reach: e.target.value ? Number(e.target.value) : undefined })}
                      className={`${fieldClass} w-24`}
                    />
                    <input
                      type="number"
                      min={0}
                      placeholder="Engagement"
                      value={row.engagement ?? ''}
                      onChange={(e) => update({ engagement: e.target.value ? Number(e.target.value) : undefined })}
                      className={`${fieldClass} w-28`}
                    />
                  </>
                )}
              />

              <Repeater<OfflineCampaign>
                title="Offline Campaigns"
                hint="Billboards, school visits, exhibitions, and other offline promotion."
                rows={promoDraft.offlineCampaigns}
                onChange={(rows) => setPromoDraft((prev) => ({ ...prev, offlineCampaigns: rows }))}
                newRow={() => ({ type: 'other', label: '' })}
                renderRow={(row, update) => (
                  <>
                    <select
                      value={row.type}
                      onChange={(e) => update({ type: e.target.value as OfflineCampaignType })}
                      className={`${fieldClass} w-32 capitalize`}
                    >
                      {OFFLINE_CAMPAIGN_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t.replace('_', ' ')}
                        </option>
                      ))}
                    </select>
                    <input
                      placeholder="Campaign label"
                      value={row.label}
                      onChange={(e) => update({ label: e.target.value })}
                      className={`${fieldClass} flex-1 min-w-[140px]`}
                    />
                    <input
                      placeholder="Details"
                      value={row.details ?? ''}
                      onChange={(e) => update({ details: e.target.value })}
                      className={`${fieldClass} flex-1 min-w-[140px]`}
                    />
                    <input
                      type="number"
                      min={0}
                      placeholder="Cost"
                      value={row.cost ?? ''}
                      onChange={(e) => update({ cost: e.target.value ? Number(e.target.value) : undefined })}
                      className={`${fieldClass} w-24`}
                    />
                  </>
                )}
              />

              <Button
                size="sm"
                disabled={savePromotionMutation.isPending}
                onClick={handleSavePromotion}
                leftIcon={savePromotionMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : undefined}
              >
                Save Promotion Input
              </Button>

              {(savePromotionMutation.data?.warnings?.length ?? 0) > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-1">
                  <p className="text-xs font-semibold text-amber-800">
                    Saved, but {savePromotionMutation.data!.warnings.length} value
                    {savePromotionMutation.data!.warnings.length === 1 ? ' looks' : 's look'} unusual — double-check
                    before this appears in a report:
                  </p>
                  <ul className="text-xs text-amber-700 list-disc list-inside space-y-0.5">
                    {savePromotionMutation.data!.warnings.map((w, i) => (
                      <li key={i}>{w.message}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          <Card variant="elevated">
            <CardContent className="p-5 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Notes</h2>
              <Textarea
                label="Vendor-visible notes (appears in the PDF report)"
                value={vendorVisibleNotes}
                onChange={(e) => setVendorNotesDraft(e.target.value)}
                rows={3}
                placeholder="Observations and recommendations for this vendor..."
              />
              <div>
                <Textarea
                  label="Internal notes"
                  value={internalNotes}
                  onChange={(e) => setInternalNotesDraft(e.target.value)}
                  rows={3}
                  placeholder="Admin-only commercial context — never shown to the vendor or included in any export."
                  className="bg-amber-50 border-amber-200"
                />
                <p className="text-xs text-amber-700 mt-1">
                  Internal only — never rendered in the PDF or CSV export.
                </p>
              </div>
              <Button
                size="sm"
                disabled={!snap?._id || notesMutation.isPending}
                onClick={handleSaveNotes}
                leftIcon={notesMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : undefined}
              >
                Save Notes
              </Button>
              {!snap?._id && (
                <p className="text-xs text-gray-500">Generate a snapshot for this period before adding notes.</p>
              )}
            </CardContent>
          </Card>

          {/* Audit trail */}
          {recentAudit.length > 0 && (
            <Card variant="elevated">
              <CardContent className="p-5 space-y-2">
                <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
                <ul className="text-xs text-gray-500 space-y-1">
                  {recentAudit.map((entry, i) => (
                    <li key={i}>
                      {AUDIT_ACTION_LABELS[entry.action] ?? entry.action} &middot;{' '}
                      {new Date(entry.at).toLocaleString()}
                      {entry.detail ? ` — ${entry.detail}` : ''}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <div className="text-center py-16 text-gray-500">Unable to load business health for this vendor.</div>
      )}
    </div>
  );
};

export default AdminVendorBusinessReportPage;
