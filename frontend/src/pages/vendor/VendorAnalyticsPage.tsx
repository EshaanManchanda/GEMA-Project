import React, { useState } from 'react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  TrendingUp, TrendingDown, DollarSign, ShoppingCart, Ticket,
  CalendarDays, CheckCircle2, BarChart2, Download, RefreshCw,
  MapPin, Tag, Clock, Eye, Star, ArrowUpRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import analyticsAPI from '../../services/api/analyticsAPI';
import {
  useVendorDashboardSummaryQuery,
  useVendorEventAnalyticsQuery,
  useVendorOrderAnalyticsQuery,
  useVendorRevenueReportQuery,
  useVendorTicketAnalyticsQuery,
  useVendorVenueAnalyticsQuery,
} from '@/hooks/queries/useVendorQuery';
import { vendorKeys } from '@/hooks/queries/queryKeys';
import PrivatePageSEO from '@/components/common/PrivatePageSEO';
import { toast } from 'react-hot-toast';

ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Title, Tooltip, Legend, Filler,
);

// ─── Constants ────────────────────────────────────────────────────────────────

const RANGES = [
  { label: '7D',   value: '7days'  as const },
  { label: '30D',  value: '30days' as const },
  { label: '90D',  value: '90days' as const },
  { label: '1Y',   value: 'year'   as const },
] as const;
type Range = typeof RANGES[number]['value'];

const PALETTE = {
  emerald: { solid: '#10b981', light: 'rgba(16,185,129,0.15)', mid: 'rgba(16,185,129,0.6)' },
  blue:    { solid: '#3b82f6', light: 'rgba(59,130,246,0.15)',  mid: 'rgba(59,130,246,0.6)'  },
  violet:  { solid: '#8b5cf6', light: 'rgba(139,92,246,0.15)', mid: 'rgba(139,92,246,0.6)'  },
  amber:   { solid: '#f59e0b', light: 'rgba(245,158,11,0.15)', mid: 'rgba(245,158,11,0.6)'  },
  rose:    { solid: '#f43f5e', light: 'rgba(244,63,94,0.15)',  mid: 'rgba(244,63,94,0.6)'   },
  cyan:    { solid: '#06b6d4', light: 'rgba(6,182,212,0.15)',  mid: 'rgba(6,182,212,0.6)'   },
  orange:  { solid: '#f97316', light: 'rgba(249,115,22,0.15)', mid: 'rgba(249,115,22,0.6)'  },
  indigo:  { solid: '#6366f1', light: 'rgba(99,102,241,0.15)', mid: 'rgba(99,102,241,0.6)'  },
};

const PIE_COLORS = [
  PALETTE.emerald.mid, PALETTE.blue.mid, PALETTE.violet.mid,
  PALETTE.amber.mid,   PALETTE.rose.mid, PALETTE.cyan.mid,
  PALETTE.orange.mid,  PALETTE.indigo.mid,
];

const CHART_BASE = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#1e293b',
      titleColor: '#94a3b8',
      bodyColor: '#f1f5f9',
      padding: 12,
      cornerRadius: 8,
    },
  },
};

const AXIS_STYLE = {
  grid: { color: 'rgba(0,0,0,0.04)', drawBorder: false },
  ticks: { color: '#94a3b8', font: { size: 11 } },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number, currency = 'SAR') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);

const pct = (n: number) => `${Number(n).toFixed(1)}%`;

const fmtMonth = (str: string) => {
  if (!str) return '';
  const d = new Date(str + (str.length === 7 ? '-01' : ''));
  return isNaN(d.getTime()) ? str : d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
};

const dateRange = (range: Range) => {
  const end = new Date();
  const start = new Date();
  if (range === '7days')  start.setDate(end.getDate() - 7);
  if (range === '30days') start.setDate(end.getDate() - 30);
  if (range === '90days') start.setDate(end.getDate() - 90);
  if (range === 'year')   start.setFullYear(end.getFullYear() - 1);
  return {
    startDate: start.toISOString().split('T')[0],
    endDate:   end.toISOString().split('T')[0],
  };
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse bg-gray-100 rounded-xl ${className}`} />
);

const KpiCard: React.FC<{
  label: string; value: string; sub?: string; growth?: number;
  icon: React.ReactNode; gradient: string;
}> = ({ label, value, sub, growth, icon, gradient }) => (
  <div className={`relative overflow-hidden rounded-2xl p-5 text-white ${gradient} shadow-sm`}>
    <div className="flex items-start justify-between mb-3">
      <div className="p-2.5 rounded-xl bg-white/20">{icon}</div>
      {growth !== undefined && (
        <span className={`flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full
          ${growth >= 0 ? 'bg-white/20 text-white' : 'bg-black/20 text-white/80'}`}>
          {growth >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
          {Math.abs(growth).toFixed(1)}%
        </span>
      )}
    </div>
    <p className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-1">{label}</p>
    <p className="text-2xl font-bold leading-none">{value}</p>
    {sub && <p className="text-xs text-white/50 mt-1">{sub}</p>}
  </div>
);

const ChartCard: React.FC<{
  title: string; icon: React.ReactNode; children: React.ReactNode;
  right?: React.ReactNode; className?: string;
}> = ({ title, icon, children, right, className = '' }) => (
  <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-5 ${className}`}>
    <div className="flex items-center justify-between mb-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700">
        <span className="text-emerald-500">{icon}</span>{title}
      </h3>
      {right}
    </div>
    {children}
  </div>
);

const StatRow: React.FC<{ label: string; value: string | number; color: string; max: number; current: number }> = ({
  label, value, color, max, current,
}) => {
  const pctWidth = max > 0 ? Math.min(100, Math.round((current / max) * 100)) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-500">{label}</span>
        <span className="font-semibold text-gray-800">{value}</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pctWidth}%` }} />
      </div>
    </div>
  );
};

const TableRow: React.FC<{ rank: number; name: string; revenue: number; tickets: number; currency: string; id?: string; onClick?: () => void }> = ({
  rank, name, revenue, tickets, currency, onClick,
}) => (
  <tr
    className={`border-b border-gray-50 last:border-0 transition-colors ${onClick ? 'cursor-pointer hover:bg-emerald-50/50' : ''}`}
    onClick={onClick}
  >
    <td className="py-3 pl-1 pr-3">
      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold
        ${rank === 1 ? 'bg-amber-100 text-amber-700' : rank === 2 ? 'bg-gray-100 text-gray-600' : rank === 3 ? 'bg-orange-100 text-orange-600' : 'bg-gray-50 text-gray-400'}`}>
        {rank}
      </span>
    </td>
    <td className="py-3 text-sm text-gray-800 font-medium max-w-0 w-full truncate pr-4">{name}</td>
    <td className="py-3 text-sm font-semibold text-emerald-600 whitespace-nowrap">{fmt(revenue, currency)}</td>
    <td className="py-3 text-sm text-gray-500 whitespace-nowrap text-right">{tickets} tickets</td>
    {onClick && (
      <td className="py-3 pl-2">
        <ArrowUpRight size={14} className="text-gray-300 group-hover:text-emerald-400" />
      </td>
    )}
  </tr>
);

// ─── Main Page ────────────────────────────────────────────────────────────────

const VendorAnalyticsPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [range, setRange]     = useState<Range>('30days');
  const [exporting, setExporting] = useState(false);

  const dp = dateRange(range);

  const { data: dashRaw,    isLoading: l0, isFetching: f0 } = useVendorDashboardSummaryQuery();
  const { data: eventsRaw,  isLoading: l1, isFetching: f1 } = useVendorEventAnalyticsQuery(dp);
  const { data: ordersRaw,  isLoading: l2, isFetching: f2 } = useVendorOrderAnalyticsQuery(dp);
  const { data: revenueRaw, isLoading: l3, isFetching: f3 } = useVendorRevenueReportQuery({ ...dp, groupBy: 'month' });
  const { data: ticketsRaw, isLoading: l4, isFetching: f4 } = useVendorTicketAnalyticsQuery(dp);
  const { data: venuesRaw,  isLoading: l5, isFetching: f5 } = useVendorVenueAnalyticsQuery();

  const loading    = l0 || l1 || l2 || l3 || l4 || l5;
  const refreshing = !loading && (f0 || f1 || f2 || f3 || f4 || f5);

  const unwrap = (raw: any) => raw?.data ?? raw ?? null;
  const dash    = unwrap(dashRaw);
  const events  = unwrap(eventsRaw);
  const orders  = unwrap(ordersRaw);
  const revenue = unwrap(revenueRaw);
  const tickets = unwrap(ticketsRaw);
  const venues  = unwrap(venuesRaw);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: vendorKeys.analytics.all() });
  };

  const handleExport = async (type: string) => {
    try {
      setExporting(true);
      const dp = dateRange(range);
      await analyticsAPI.exportAnalytics({ type, ...dp, format: 'json' });
      toast.success(`${type} export ready`);
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  // ── Derived ──────────────────────────────────────────────────────────────

  const currency = revenue?.currencyBreakdown?.[0]?.currency ?? 'SAR';

  // KPI values
  const totalRevenue    = revenue?.totalRevenue    ?? orders?.totalRevenue    ?? 0;
  const totalOrders     = orders?.totalOrders      ?? 0;
  const avgOrder        = orders?.averageOrderValue ?? revenue?.averageOrderValue ?? 0;
  const totalTickets    = tickets?.totalTickets    ?? 0;
  const checkedIn       = tickets?.checkedInTickets ?? 0;
  const checkInRate     = tickets?.checkInRate     ?? 0;
  const activeEvents    = events?.activeEvents     ?? 0;
  const totalViews      = events?.totalViews       ?? 0;
  const avgRating       = events?.averageRating    ?? 0;
  const conversionRate  = orders?.conversionRate   ?? 0;
  const refundRate      = orders?.refundRate       ?? 0;

  // Revenue chart
  const revPeriods: any[] = revenue?.revenueByPeriod ?? [];
  const revenueChartData = {
    labels: revPeriods.map(p => fmtMonth(p.month ?? p.date ?? '')),
    datasets: [{
      label: 'Revenue',
      data: revPeriods.map(p => p.revenue ?? p.amount ?? 0),
      borderColor: PALETTE.emerald.solid,
      backgroundColor: PALETTE.emerald.light,
      borderWidth: 2,
      tension: 0.4,
      fill: true,
      pointRadius: 3,
      pointBackgroundColor: PALETTE.emerald.solid,
    }],
  };

  // Orders by month chart
  const ordersByMonth: any[] = orders?.ordersByMonth ?? [];
  const ordersChartData = {
    labels: ordersByMonth.map(m => fmtMonth(m.month ?? '')),
    datasets: [{
      label: 'Orders',
      data: ordersByMonth.map(m => m.count ?? 0),
      backgroundColor: PALETTE.blue.mid,
      borderRadius: 6,
      borderSkipped: false,
    }],
  };

  // Orders by status doughnut
  const orderStatuses: any[] = orders?.ordersByStatus ?? [];
  const statusChart = {
    labels: orderStatuses.map(s => s.status),
    datasets: [{
      data: orderStatuses.map(s => s.count),
      backgroundColor: PIE_COLORS,
      borderWidth: 0,
      hoverOffset: 4,
    }],
  };

  // Events by month
  const evByMonth: any[] = events?.eventsByMonth ?? [];
  const eventsMonthChart = {
    labels: evByMonth.map(m => fmtMonth(m.month ?? '')),
    datasets: [{
      label: 'Events Created',
      data: evByMonth.map(m => m.count ?? 0),
      backgroundColor: PALETTE.violet.mid,
      borderRadius: 6,
      borderSkipped: false,
    }],
  };

  // Categories doughnut
  const topCategories: any[] = events?.topCategories ?? [];
  const catChart = {
    labels: topCategories.map(c => c.category),
    datasets: [{
      data: topCategories.map(c => c.count),
      backgroundColor: PIE_COLORS,
      borderWidth: 0,
      hoverOffset: 4,
    }],
  };

  // Scans by hour
  const scansByHour: any[] = tickets?.scansByHour ?? [];
  const scansChart = {
    labels: scansByHour.map(s => `${String(s.hour ?? 0).padStart(2, '0')}:00`),
    datasets: [{
      label: 'Scans',
      data: scansByHour.map(s => s.scans ?? 0),
      backgroundColor: (ctx: any) => {
        const val = ctx.raw ?? 0;
        const max = Math.max(...scansByHour.map(s => s.scans ?? 0), 1);
        const alpha = 0.3 + (val / max) * 0.7;
        return `rgba(16,185,129,${alpha})`;
      },
      borderRadius: 4,
      borderSkipped: false,
    }],
  };

  // Currency breakdown
  const currencyBreakdown: any[] = revenue?.currencyBreakdown ?? orders?.topCurrencies ?? [];

  // Top events
  const topEvents: any[] = [
    ...(events?.revenueByEvent ?? []),
    ...(dash?.topPerformingEvents ?? []),
  ].reduce((acc: any[], e: any) => {
    const id = e.eventId ?? e._id;
    if (!acc.find(x => (x.eventId ?? x._id) === id)) acc.push(e);
    return acc;
  }, []).slice(0, 8);

  // Top locations
  const topLocations: any[] = events?.topLocations ?? [];

  // Venue stats
  const venuesByType: any[] = venues?.venuesByType ?? [];

  // Ticket types
  const ticketTypes: any[] = tickets?.ticketsByType ?? [];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-72 w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-64" /><Skeleton className="h-64" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="h-56" /><Skeleton className="h-56" /><Skeleton className="h-56" />
        </div>
      </div>
    );
  }

  return (
    <>
      <PrivatePageSEO title="Analytics | Vendor Dashboard" description="Your event performance analytics" />
      <div className="min-h-screen bg-gray-50">

        {/* ── HEADER ── */}
        <div className="bg-gradient-to-br from-emerald-700 via-green-700 to-teal-800 px-6 pt-8 pb-16">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-white">Analytics Dashboard</h1>
                <p className="text-emerald-200 text-sm mt-0.5">Your event performance at a glance</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {/* Date Range */}
                <div className="flex bg-white/10 rounded-xl p-1 gap-0.5">
                  {RANGES.map(r => (
                    <button
                      key={r.value}
                      onClick={() => setRange(r.value)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                        range === r.value
                          ? 'bg-white text-emerald-700 shadow-sm'
                          : 'text-white/70 hover:text-white'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>

                {/* Refresh */}
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="p-2 rounded-xl bg-white/10 text-white/80 hover:bg-white/20 transition-colors"
                  title="Refresh"
                >
                  <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
                </button>

                {/* Export dropdown */}
                <div className="relative group">
                  <button
                    disabled={exporting}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors"
                  >
                    <Download size={13} />{exporting ? 'Exporting…' : 'Export'}
                  </button>
                  <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-xl shadow-lg border border-gray-100 py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                    {['events', 'orders', 'tickets'].map(t => (
                      <button
                        key={t}
                        onClick={() => handleExport(t)}
                        className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 capitalize"
                      >
                        Export {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── BODY (pulled up to overlap header) ── */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 -mt-10 pb-10 space-y-5">

          {/* ── KPI CARDS ── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
            <KpiCard
              label="Total Revenue"
              value={fmt(totalRevenue, currency)}
              sub={`${totalOrders} orders`}
              growth={dash?.revenueGrowth}
              icon={<DollarSign size={17} className="text-white" />}
              gradient="bg-gradient-to-br from-emerald-500 to-green-600"
            />
            <KpiCard
              label="Avg Order Value"
              value={fmt(avgOrder, currency)}
              sub={`Conv. ${pct(conversionRate)}`}
              icon={<TrendingUp size={17} className="text-white" />}
              gradient="bg-gradient-to-br from-blue-500 to-indigo-600"
            />
            <KpiCard
              label="Total Tickets"
              value={totalTickets.toLocaleString()}
              sub={`${checkedIn} checked in`}
              icon={<Ticket size={17} className="text-white" />}
              gradient="bg-gradient-to-br from-violet-500 to-purple-600"
            />
            <KpiCard
              label="Check-in Rate"
              value={pct(checkInRate)}
              sub={`${tickets?.transferredTickets ?? 0} transferred`}
              icon={<CheckCircle2 size={17} className="text-white" />}
              gradient="bg-gradient-to-br from-teal-500 to-cyan-600"
            />
            <KpiCard
              label="Active Events"
              value={String(activeEvents)}
              sub={`${events?.totalEvents ?? 0} total`}
              growth={dash?.eventGrowth}
              icon={<CalendarDays size={17} className="text-white" />}
              gradient="bg-gradient-to-br from-amber-500 to-orange-500"
            />
            <KpiCard
              label="Total Views"
              value={totalViews.toLocaleString()}
              sub={avgRating > 0 ? `⭐ ${Number(avgRating).toFixed(1)} avg rating` : 'No ratings yet'}
              icon={<Eye size={17} className="text-white" />}
              gradient="bg-gradient-to-br from-rose-500 to-pink-600"
            />
          </div>

          {/* ── REVENUE TREND (full width) ── */}
          <ChartCard title="Revenue Trend" icon={<DollarSign size={14} />}
            right={
              <span className="text-xs text-gray-400">
                {revPeriods.length > 0 ? `${revPeriods.length} periods` : 'No data'}
              </span>
            }
          >
            {revPeriods.length > 0 ? (
              <div className="h-64">
                <Line data={revenueChartData} options={{
                  ...CHART_BASE,
                  plugins: { ...CHART_BASE.plugins, legend: { display: false } },
                  scales: {
                    x: AXIS_STYLE,
                    y: {
                      ...AXIS_STYLE,
                      ticks: {
                        ...AXIS_STYLE.ticks,
                        callback: (v: any) => fmt(v, currency),
                      },
                    },
                  },
                }} />
              </div>
            ) : <EmptyState label="No revenue data for this period" />}
          </ChartCard>

          {/* ── ROW: Orders chart + Tickets doughnut ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

            {/* Orders by Month */}
            <div className="lg:col-span-2">
              <ChartCard title="Orders by Month" icon={<ShoppingCart size={14} />}>
                {ordersByMonth.length > 0 ? (
                  <div className="h-52">
                    <Bar data={ordersChartData} options={{
                      ...CHART_BASE,
                      scales: { x: AXIS_STYLE, y: { ...AXIS_STYLE, beginAtZero: true } },
                    }} />
                  </div>
                ) : <EmptyState label="No order data for this period" />}
              </ChartCard>
            </div>

            {/* Order Status */}
            <ChartCard title="Order Status" icon={<BarChart2 size={14} />}>
              {orderStatuses.length > 0 ? (
                <div className="space-y-4">
                  <div className="h-36 flex items-center justify-center">
                    <Doughnut data={statusChart} options={{
                      ...CHART_BASE,
                      cutout: '72%',
                      plugins: {
                        ...CHART_BASE.plugins,
                        legend: { display: true, position: 'bottom' as const, labels: { boxWidth: 10, font: { size: 10 }, color: '#94a3b8' } },
                      },
                    }} />
                  </div>
                  <div className="space-y-2 pt-1">
                    {orderStatuses.map((s: any, i: number) => (
                      <StatRow
                        key={s.status}
                        label={s.status}
                        value={`${s.count} · ${fmt(s.revenue ?? 0, currency)}`}
                        color={i === 0 ? 'bg-emerald-400' : i === 1 ? 'bg-blue-400' : i === 2 ? 'bg-rose-400' : 'bg-gray-300'}
                        max={totalOrders}
                        current={s.count}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-3 mt-2">
                  <StatRow label="Conversion Rate" value={pct(conversionRate)} color="bg-emerald-400" max={100} current={conversionRate} />
                  <StatRow label="Refund Rate"     value={pct(refundRate)}     color="bg-rose-400"    max={100} current={refundRate}     />
                  <EmptyState label="No status breakdown available" />
                </div>
              )}
            </ChartCard>
          </div>

          {/* ── ROW: Events by month + Categories ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <ChartCard title="Events Created by Month" icon={<CalendarDays size={14} />}>
              {evByMonth.length > 0 ? (
                <div className="h-52">
                  <Bar data={eventsMonthChart} options={{
                    ...CHART_BASE,
                    scales: { x: AXIS_STYLE, y: { ...AXIS_STYLE, beginAtZero: true } },
                  }} />
                </div>
              ) : <EmptyState label="No event creation data for this period" />}
            </ChartCard>

            <ChartCard title="Events by Category" icon={<Tag size={14} />}>
              {topCategories.length > 0 ? (
                <div className="flex gap-4 items-start">
                  <div className="w-40 h-40 shrink-0">
                    <Doughnut data={catChart} options={{
                      ...CHART_BASE,
                      cutout: '65%',
                      plugins: { ...CHART_BASE.plugins, legend: { display: false } },
                    }} />
                  </div>
                  <div className="flex-1 space-y-2 pt-1">
                    {topCategories.slice(0, 6).map((c: any, i: number) => (
                      <div key={c.category} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i] }} />
                          <span className="text-xs text-gray-600 truncate">{c.category}</span>
                        </div>
                        <span className="text-xs font-semibold text-gray-800 shrink-0">{c.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : <EmptyState label="No category data available" />}
            </ChartCard>
          </div>

          {/* ── TOP PERFORMING EVENTS TABLE ── */}
          {topEvents.length > 0 && (
            <ChartCard title="Top Performing Events" icon={<Star size={14} />}
              right={<span className="text-xs text-gray-400">{topEvents.length} events</span>}
            >
              <div className="overflow-x-auto -mx-1">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="pb-2 pl-1 text-xs font-semibold text-gray-400 w-8">#</th>
                      <th className="pb-2 text-xs font-semibold text-gray-400">Event</th>
                      <th className="pb-2 text-xs font-semibold text-gray-400">Revenue</th>
                      <th className="pb-2 text-xs font-semibold text-gray-400 text-right">Tickets</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topEvents.map((e: any, i: number) => (
                      <TableRow
                        key={e.eventId ?? e._id ?? i}
                        rank={i + 1}
                        name={e.title ?? 'Untitled'}
                        revenue={e.revenue ?? 0}
                        tickets={e.tickets ?? 0}
                        currency={currency}
                        id={e.eventId ?? e._id}
                        onClick={e.eventId ?? e._id
                          ? () => navigate(`/vendor/events/${e.eventId ?? e._id}`)
                          : undefined}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </ChartCard>
          )}

          {/* ── ROW: Tickets + Scans by Hour ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* Ticket Breakdown */}
            <ChartCard title="Ticket Breakdown" icon={<Ticket size={14} />}>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Total',       val: tickets?.totalTickets      ?? 0, color: 'text-gray-900' },
                    { label: 'Checked In',  val: tickets?.checkedInTickets  ?? 0, color: 'text-emerald-600' },
                    { label: 'Transferred', val: tickets?.transferredTickets ?? 0, color: 'text-blue-600'   },
                    { label: 'Cancelled',   val: tickets?.cancelledTickets   ?? 0, color: 'text-rose-500'   },
                  ].map(({ label, val, color }) => (
                    <div key={label} className="bg-gray-50 rounded-xl p-3 text-center">
                      <p className={`text-xl font-bold ${color}`}>{val.toLocaleString()}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>
                <StatRow label="Check-in Rate"  value={pct(checkInRate)}                  color="bg-emerald-400" max={100} current={checkInRate} />
                <StatRow label="Transfer Rate"  value={pct(tickets?.transferRate ?? 0)}   color="bg-blue-400"   max={100} current={tickets?.transferRate ?? 0} />
                {ticketTypes.length > 0 && (
                  <div className="pt-2 border-t border-gray-50">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">By Type</p>
                    <div className="space-y-1.5">
                      {ticketTypes.map((t: any) => (
                        <StatRow key={t.type} label={t.type} value={t.count} color="bg-violet-400" max={totalTickets} current={t.count} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ChartCard>

            {/* Scans by Hour */}
            <ChartCard title="Check-in Scans by Hour" icon={<Clock size={14} />}
              right={<span className="text-xs text-gray-400">All time</span>}
            >
              {scansByHour.length > 0 && scansByHour.some((s: any) => s.scans > 0) ? (
                <div className="h-52">
                  <Bar data={scansChart} options={{
                    ...CHART_BASE,
                    scales: {
                      x: { ...AXIS_STYLE, ticks: { ...AXIS_STYLE.ticks, maxTicksLimit: 8 } },
                      y: { ...AXIS_STYLE, beginAtZero: true },
                    },
                  }} />
                </div>
              ) : <EmptyState label="No check-in scans recorded yet" />}
            </ChartCard>
          </div>

          {/* ── ROW: Locations + Venues + Currency ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

            {/* Top Locations */}
            <ChartCard title="Top Locations" icon={<MapPin size={14} />}>
              {topLocations.length > 0 ? (
                <div className="space-y-2">
                  {topLocations.slice(0, 6).map((loc: any) => (
                    <StatRow
                      key={loc.city}
                      label={loc.city}
                      value={loc.count}
                      color="bg-cyan-400"
                      max={topLocations[0]?.count ?? 1}
                      current={loc.count}
                    />
                  ))}
                </div>
              ) : <EmptyState label="No location data available" />}
            </ChartCard>

            {/* Venue Analytics */}
            <ChartCard title="Venue Insights" icon={<BarChart2 size={14} />}>
              {venues ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                      <p className="text-xl font-bold text-gray-900">{venues.totalVenues ?? 0}</p>
                      <p className="text-xs text-gray-400">Total Venues</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                      <p className="text-xl font-bold text-emerald-600">{venues.activeVenues ?? 0}</p>
                      <p className="text-xs text-gray-400">Active</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                      <p className="text-xl font-bold text-blue-600">{Math.round(venues.averageCapacity ?? 0)}</p>
                      <p className="text-xs text-gray-400">Avg Capacity</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                      <p className="text-xl font-bold text-violet-600">{Number(venues.utilizationRate ?? 0).toFixed(1)}%</p>
                      <p className="text-xs text-gray-400">Utilization</p>
                    </div>
                  </div>
                  {venuesByType.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">By Type</p>
                      {venuesByType.map((v: any) => (
                        <StatRow key={v.type} label={v.type} value={v.count} color="bg-indigo-400" max={venues.totalVenues ?? 1} current={v.count} />
                      ))}
                    </div>
                  )}
                </div>
              ) : <EmptyState label="No venue data available" />}
            </ChartCard>

            {/* Currency Breakdown */}
            <ChartCard title="Revenue by Currency" icon={<DollarSign size={14} />}>
              {currencyBreakdown.length > 0 ? (
                <div className="space-y-3">
                  {currencyBreakdown.map((c: any, i: number) => (
                    <div key={c.currency} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i] }} />
                        <span className="text-xs font-bold text-gray-700">{c.currency}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-gray-800">{fmt(c.revenue ?? 0, c.currency)}</p>
                        <p className="text-xs text-gray-400">{c.count} orders</p>
                      </div>
                    </div>
                  ))}
                  <div className="pt-3 border-t border-gray-100 space-y-2">
                    <StatRow label="Conversion Rate" value={pct(conversionRate)} color="bg-emerald-400" max={100} current={conversionRate} />
                    <StatRow label="Refund Rate"     value={pct(refundRate)}     color="bg-rose-400"   max={100} current={refundRate}     />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <StatRow label="Conversion Rate" value={pct(conversionRate)} color="bg-emerald-400" max={100} current={conversionRate} />
                  <StatRow label="Refund Rate"     value={pct(refundRate)}     color="bg-rose-400"   max={100} current={refundRate}     />
                  <EmptyState label="No currency breakdown available" />
                </div>
              )}
            </ChartCard>
          </div>

          {/* ── EVENT STATUS SUMMARY STRIP ── */}
          {events && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Total Events',      val: events.totalEvents    ?? 0, icon: <CalendarDays size={16} />, color: 'text-gray-600',   bg: 'bg-gray-50'     },
                { label: 'Active / Published', val: events.activeEvents  ?? 0, icon: <CheckCircle2 size={16} />, color: 'text-emerald-600', bg: 'bg-emerald-50'  },
                { label: 'Pending Approval',   val: events.pendingApproval ?? 0,icon: <Clock size={16} />,       color: 'text-amber-600',   bg: 'bg-amber-50'    },
                { label: 'Avg Rating',         val: avgRating > 0 ? `⭐ ${Number(avgRating).toFixed(2)}` : '—', icon: <Star size={16} />, color: 'text-blue-600', bg: 'bg-blue-50' },
              ].map(({ label, val, icon, color, bg }) => (
                <div key={label} className={`${bg} rounded-2xl p-4 flex items-center gap-3 border border-white shadow-sm`}>
                  <span className={color}>{icon}</span>
                  <div>
                    <p className="text-lg font-bold text-gray-900">{val}</p>
                    <p className="text-xs text-gray-400">{label}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </>
  );
};

const EmptyState: React.FC<{ label: string }> = ({ label }) => (
  <div className="flex flex-col items-center justify-center py-8 text-gray-300">
    <BarChart2 size={28} className="mb-2" />
    <p className="text-xs">{label}</p>
  </div>
);

export default VendorAnalyticsPage;
