import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import PrivatePageSEO from '@/components/common/PrivatePageSEO';
import logger from '@/utils/logger';
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
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2';
import { FaSearch, FaGlobe, FaMouse, FaEye } from 'react-icons/fa';
import adminAPI from '../../services/api/adminAPI';
import analyticsAPI from '../../services/api/analyticsAPI';
import type {
  DashboardSummary,
  EventAnalytics,
  OrderAnalytics,
  UserAnalytics,
  TicketAnalytics,
  VenueAnalytics,
} from '@/types/analytics';
import {
  FaUsers,
  FaCalendarAlt,
  FaShoppingCart,
  FaDollarSign,
  FaArrowUp,
  FaArrowDown,
  FaSyncAlt,
  FaDownload,
  FaTrophy,
  FaChartLine,
  FaTicketAlt,
  FaMapMarkerAlt,
  FaExchangeAlt,
  FaPercentage,
  FaExternalLinkAlt,
} from 'react-icons/fa';

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
  Legend
);

type TimeRange = '7days' | '30days' | '90days' | '1year';
type Granularity = 'daily' | 'monthly';

const CHART_COLORS = [
  'rgba(59, 130, 246, 0.7)',
  'rgba(16, 185, 129, 0.7)',
  'rgba(245, 158, 11, 0.7)',
  'rgba(239, 68, 68, 0.7)',
  'rgba(139, 92, 246, 0.7)',
  'rgba(236, 72, 153, 0.7)',
  'rgba(20, 184, 166, 0.7)',
  'rgba(249, 115, 22, 0.7)',
];

const CHART_BORDERS = CHART_COLORS.map(c => c.replace('0.7', '1'));

const getDateRange = (range: TimeRange) => {
  const end = new Date();
  const start = new Date();
  switch (range) {
    case '7days': start.setDate(start.getDate() - 7); break;
    case '30days': start.setDate(start.getDate() - 30); break;
    case '90days': start.setDate(start.getDate() - 90); break;
    case '1year': start.setFullYear(start.getFullYear() - 1); break;
  }
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
  };
};

const formatMonth = (monthStr: string) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const parts = monthStr.split('-');
  if (parts.length < 2) return monthStr;
  const year = parts[0].slice(-2);
  const monthIdx = parseInt(parts[1]) - 1;
  const monthName = months[monthIdx] || monthStr;
  return `${monthName} '${year}`;
};

const formatDay = (dayStr: string) => {
  const parts = dayStr.split('-');
  if (parts.length < 3) return dayStr;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthIdx = parseInt(parts[1]) - 1;
  return `${months[monthIdx]} ${parseInt(parts[2])}`;
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-AE', {
    style: 'currency',
    currency: 'AED',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

const formatNumber = (n: number) => n.toLocaleString();

const formatHour = (hour: number) => {
  if (hour === 0) return '12 AM';
  if (hour === 12) return '12 PM';
  return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
};

function convertToCSV(data: Record<string, any>[], filename: string) {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','),
    ...data.map(row =>
      headers.map(h => {
        const val = row[h];
        const str = val === null || val === undefined ? '' : String(val);
        return str.includes(',') || str.includes('"') || str.includes('\n')
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      }).join(',')
    ),
  ];
  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const AdminAnalyticsPage: React.FC = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>('30days');
  const [granularity, setGranularity] = useState<Granularity>('monthly');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('csv');

  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [eventData, setEventData] = useState<EventAnalytics | null>(null);
  const [orderData, setOrderData] = useState<OrderAnalytics | null>(null);
  const [userData, setUserData] = useState<UserAnalytics | null>(null);
  const [ticketData, setTicketData] = useState<TicketAnalytics | null>(null);
  const [venueData, setVenueData] = useState<VenueAnalytics | null>(null);
  // Per-section error flags — one failed section shows an error chip, not a blank zero
  const [sectionErrors, setSectionErrors] = useState<Record<string, boolean>>({});
  // Financial metrics from admin dashboard stats
  const [financialMetrics, setFinancialMetrics] = useState<{
    netRevenue?: number; platformCommission?: number; vendorPayouts?: number; refundAmount?: number;
  }>({});

  // Google Search Console state
  const [gscSites, setGscSites] = useState<string[]>([]);
  const [gscSite, setGscSite] = useState('sc-domain:kidrove.com');
  const [gscConfigured, setGscConfigured] = useState(true);
  const [gscLoading, setGscLoading] = useState(false);
  const [gscSummary, setGscSummary] = useState<{
    summary: { clicks: number; impressions: number; ctr: number; position: number };
    trend: { keys: string[]; clicks: number; impressions: number; ctr: number; position: number }[];
  } | null>(null);
  const [gscQueries, setGscQueries] = useState<{ keys: string[]; clicks: number; impressions: number; ctr: number; position: number }[]>([]);
  const [gscPages, setGscPages] = useState<{ keys: string[]; clicks: number; impressions: number; ctr: number; position: number }[]>([]);
  const [gscFetchedAt, setGscFetchedAt] = useState<string | null>(null);
  const [gscSyncing, setGscSyncing] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setSectionErrors({});
    try {
      const dateRange = getDateRange(timeRange);
      const params = {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      };

      const [dashRes, eventRes, orderRes, userRes, ticketRes, venueRes] = await Promise.allSettled([
        adminAPI.getDashboardStats(),
        adminAPI.getEventAnalytics(params),
        analyticsAPI.getOrderAnalytics(params),
        adminAPI.getUserAnalytics(params),
        adminAPI.getTicketAnalytics(params),
        adminAPI.getVenueAnalytics(),
      ]);

      const errors: Record<string, boolean> = {};

      if (dashRes.status === 'fulfilled') {
        const d = dashRes.value?.data || dashRes.value;
        setDashboard(d);
        // Surface financial metrics already computed in dashboard-optimized service
        if (d?.financialMetrics) {
          setFinancialMetrics({
            netRevenue: d.financialMetrics.netRevenue,
            platformCommission: d.financialMetrics.platformCommission,
            vendorPayouts: d.financialMetrics.vendorPayouts,
            refundAmount: d.financialMetrics.refundAmount,
          });
        }
      } else { errors.dashboard = true; }

      if (eventRes.status === 'fulfilled') {
        const d = eventRes.value?.data || eventRes.value;
        setEventData(d);
      } else { errors.events = true; }

      if (orderRes.status === 'fulfilled') {
        const d = orderRes.value?.data || orderRes.value;
        setOrderData(d);
      } else { errors.orders = true; }

      if (userRes.status === 'fulfilled') {
        const d = userRes.value?.data || userRes.value;
        setUserData(d);
      } else { errors.users = true; }

      if (ticketRes.status === 'fulfilled') {
        const d = ticketRes.value?.data || ticketRes.value;
        setTicketData(d);
      } else { errors.tickets = true; }

      if (venueRes.status === 'fulfilled') {
        const d = venueRes.value?.data || venueRes.value;
        setVenueData(d);
      } else { errors.venues = true; }

      if (Object.keys(errors).length) setSectionErrors(errors);
    } catch (err: any) {
      logger.error('Analytics fetch error:', err);
      setError(err?.message || 'Failed to load analytics data');
    } finally {
      setIsLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fetch available GSC sites once on mount
  useEffect(() => {
    adminAPI.getSearchConsoleSites().then((r: any) => {
      if (r?.sites?.length) {
        setGscSites(r.sites);
        setGscSite(r.sites[0]);
      }
      if (r?.configured === false) setGscConfigured(false);
    }).catch(() => {});
  }, []);

  const fetchGSC = useCallback(async () => {
    setGscLoading(true);
    try {
      const days = timeRange === '7days' ? 7 : timeRange === '30days' ? 28 : 90;
      const [sumRes, qRes, pRes] = await Promise.all([
        adminAPI.getSearchConsoleSummary(days, gscSite),
        adminAPI.getSearchConsoleQueries(days, gscSite),
        adminAPI.getSearchConsolePages(days, gscSite),
      ]);
      if (sumRes?.configured === false) { setGscConfigured(false); return; }
      setGscConfigured(true);
      setGscSummary(sumRes?.data || null);
      setGscQueries(Array.isArray(qRes?.data) ? qRes.data : []);
      setGscPages(pRes?.data?.pages || []);
      setGscFetchedAt(sumRes?.fetchedAt || null);
    } catch (e) {
      logger.error('GSC fetch error', e);
    } finally {
      setGscLoading(false);
    }
  }, [gscSite, timeRange]);

  useEffect(() => {
    fetchGSC();
  }, [fetchGSC]);

  const handleGscSync = async () => {
    setGscSyncing(true);
    try {
      const res = await adminAPI.syncSearchConsole(gscSite);
      if (res?.success === false) {
        toast.error(res?.message || 'Search Console sync failed');
      } else {
        toast.success(res?.message || 'Search Console synced');
      }
      await fetchGSC();
    } catch (e: any) {
      logger.error('GSC sync error', e);
      toast.error(e?.response?.data?.message || 'Search Console sync failed');
    } finally {
      setGscSyncing(false);
    }
  };

  const handleExport = async (type: string = 'orders') => {
    try {
      const dateRange = getDateRange(timeRange);

      if (exportFormat === 'csv') {
        let csvData: Record<string, any>[] = [];
        let filename = `${type}-analytics-${dateRange.startDate}-${dateRange.endDate}`;

        switch (type) {
          case 'orders':
            csvData = (orderData?.ordersByMonth || []).map(m => ({
              Month: m.month,
              Orders: m.count,
              Revenue: m.revenue,
            }));
            break;
          case 'events':
            csvData = (eventData?.eventsByMonth || []).map(m => ({
              Month: m.month,
              Events: m.count,
            }));
            break;
          case 'tickets':
            csvData = (ticketData?.ticketsByType || []).map(t => ({
              Type: t.type,
              Count: t.count,
            }));
            break;
          case 'users':
            csvData = (userData?.usersByMonth || []).map(m => ({
              Month: m.month,
              Users: m.count,
            }));
            break;
          case 'all': {
            const months = orderData?.ordersByMonth || [];
            csvData = months.map(m => {
              const eventMonth = eventData?.eventsByMonth?.find(e => e.month === m.month);
              const userMonth = userData?.usersByMonth?.find(u => u.month === m.month);
              return {
                Month: m.month,
                Orders: m.count,
                Revenue: m.revenue,
                Events: eventMonth?.count || 0,
                NewUsers: userMonth?.count || 0,
              };
            });
            filename = `platform-analytics-${dateRange.startDate}-${dateRange.endDate}`;
            break;
          }
        }

        if (csvData.length) {
          convertToCSV(csvData, filename);
        }
        return;
      }

      const data = await adminAPI.exportAnalytics({
        type,
        ...dateRange,
        format: 'json',
      });
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${dateRange.startDate}-${dateRange.endDate}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      logger.error('Export failed:', err);
    }
  };

  const baseChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(0,0,0,0.8)',
        padding: 12,
        cornerRadius: 8,
        titleFont: { size: 13 },
        bodyFont: { size: 12 },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 11 }, maxRotation: 45, minRotation: 0 },
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(0,0,0,0.05)' },
        ticks: { font: { size: 11 } },
      },
    },
  };

  const revenueChartOptions = {
    ...baseChartOptions,
    plugins: {
      ...baseChartOptions.plugins,
      tooltip: {
        ...baseChartOptions.plugins.tooltip,
        callbacks: {
          label: (ctx: any) => `Revenue: ${formatCurrency(ctx.parsed.y)}`,
        },
      },
    },
  };

  const countChartOptions = {
    ...baseChartOptions,
    plugins: {
      ...baseChartOptions.plugins,
      tooltip: {
        ...baseChartOptions.plugins.tooltip,
        callbacks: {
          label: (ctx: any) => `${ctx.dataset.label}: ${formatNumber(ctx.parsed.y)}`,
        },
      },
    },
    scales: {
      ...baseChartOptions.scales,
      y: {
        ...baseChartOptions.scales.y,
        ticks: {
          ...baseChartOptions.scales.y.ticks,
          stepSize: 1,
          callback: (val: any) => Number.isInteger(val) ? val : '',
        },
      },
    },
  };

  const barChartOptions = {
    ...baseChartOptions,
    plugins: {
      ...baseChartOptions.plugins,
      tooltip: {
        ...baseChartOptions.plugins.tooltip,
        callbacks: {
          label: (ctx: any) => `Count: ${formatNumber(ctx.parsed.y)}`,
        },
      },
    },
    scales: {
      ...baseChartOptions.scales,
      y: {
        ...baseChartOptions.scales.y,
        ticks: {
          ...baseChartOptions.scales.y.ticks,
          stepSize: 1,
          callback: (val: any) => Number.isInteger(val) ? val : '',
        },
      },
    },
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 16,
          font: { size: 12 },
          usePointStyle: true,
          pointStyle: 'circle',
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0,0,0,0.8)',
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (ctx: any) => {
            const total = ctx.dataset.data.reduce(
              (sum: number, val: number) => sum + val, 0
            );
            const pct = total > 0
              ? ((ctx.parsed / total) * 100).toFixed(1)
              : '0';
            return `${ctx.label}: ${formatNumber(ctx.parsed)} (${pct}%)`;
          },
        },
      },
    },
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-500">Loading analytics...</p>
        </div>
      </div>
    );
  }

  // Prepare time-series data based on granularity
  const revenueTimeSeries = granularity === 'daily' && orderData?.ordersByDay
    ? orderData.ordersByDay
    : orderData?.ordersByMonth || [];

  const timeLabels = revenueTimeSeries.map(m =>
    granularity === 'daily' ? formatDay((m as any).day || (m as any).month) : formatMonth((m as any).month || (m as any).day)
  );

  const eventsByMonth = eventData?.eventsByMonth || [];
  const usersByMonth = userData?.usersByMonth || [];

  const revenueChartData = {
    labels: timeLabels,
    datasets: [{
      label: 'Revenue (AED)',
      data: revenueTimeSeries.map(m => m.revenue),
      borderColor: 'rgb(16, 185, 129)',
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      tension: 0.4,
      fill: true,
      pointBackgroundColor: 'rgb(16, 185, 129)',
      pointRadius: granularity === 'daily' ? 2 : 4,
    }],
  };

  const ordersChartData = {
    labels: timeLabels,
    datasets: [{
      label: 'Orders',
      data: revenueTimeSeries.map(m => m.count),
      borderColor: 'rgb(139, 92, 246)',
      backgroundColor: 'rgba(139, 92, 246, 0.1)',
      tension: 0.4,
      fill: true,
      pointBackgroundColor: 'rgb(139, 92, 246)',
      pointRadius: granularity === 'daily' ? 2 : 4,
    }],
  };

  const eventsChartData = {
    labels: eventsByMonth.map(m => formatMonth(m.month)),
    datasets: [{
      label: 'Events',
      data: eventsByMonth.map(m => m.count),
      backgroundColor: 'rgba(59, 130, 246, 0.7)',
      borderColor: 'rgb(59, 130, 246)',
      borderWidth: 1,
      borderRadius: 6,
    }],
  };

  const usersChartData = {
    labels: usersByMonth.map(m => formatMonth(m.month)),
    datasets: [{
      label: 'New Users',
      data: usersByMonth.map(m => m.count),
      borderColor: 'rgb(59, 130, 246)',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      tension: 0.4,
      fill: true,
      pointBackgroundColor: 'rgb(59, 130, 246)',
      pointRadius: 4,
    }],
  };

  const capitalize = (s: string) =>
    s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : 'Unknown';

  const categoryChartData = {
    labels: (eventData?.topCategories || []).map(c => capitalize(c.category)),
    datasets: [{
      data: (eventData?.topCategories || []).map(c => c.count),
      backgroundColor: CHART_COLORS,
      borderColor: CHART_BORDERS,
      borderWidth: 1,
    }],
  };

  const orderStatusData = {
    labels: (orderData?.ordersByStatus || []).map(s => capitalize(s.status)),
    datasets: [{
      data: (orderData?.ordersByStatus || []).map(s => s.count),
      backgroundColor: CHART_COLORS,
      borderColor: CHART_BORDERS,
      borderWidth: 1,
    }],
  };

  const userRoleData = {
    labels: (userData?.usersByRole || []).map(r => capitalize(r.role)),
    datasets: [{
      data: (userData?.usersByRole || []).map(r => r.count),
      backgroundColor: CHART_COLORS,
      borderColor: CHART_BORDERS,
      borderWidth: 1,
    }],
  };

  const locationData = {
    labels: (eventData?.topLocations || []).slice(0, 6).map(l => l.city || 'Unknown'),
    datasets: [{
      label: 'Events',
      data: (eventData?.topLocations || []).slice(0, 6).map(l => l.count),
      backgroundColor: 'rgba(59, 130, 246, 0.7)',
      borderColor: 'rgb(59, 130, 246)',
      borderWidth: 1,
      borderRadius: 6,
    }],
  };

  // Ticket type chart
  const ticketTypeData = {
    labels: (ticketData?.ticketsByType || []).map(t => capitalize(t.type || 'Standard')),
    datasets: [{
      data: (ticketData?.ticketsByType || []).map(t => t.count),
      backgroundColor: CHART_COLORS,
      borderColor: CHART_BORDERS,
      borderWidth: 1,
    }],
  };

  // Hourly scans chart
  const scansByHour = ticketData?.scansByHour || [];
  const peakHours = scansByHour.filter(s => s.scans > 0);
  const scansChartData = {
    labels: peakHours.length > 0
      ? scansByHour.map(s => formatHour(s.hour))
      : [],
    datasets: [{
      label: 'Check-ins',
      data: peakHours.length > 0 ? scansByHour.map(s => s.scans) : [],
      backgroundColor: 'rgba(16, 185, 129, 0.7)',
      borderColor: 'rgb(16, 185, 129)',
      borderWidth: 1,
      borderRadius: 4,
    }],
  };

  // Venue by city chart
  const venueCityData = {
    labels: (venueData?.venuesByCity || []).slice(0, 6).map(v => v.city || 'Unknown'),
    datasets: [{
      label: 'Venues',
      data: (venueData?.venuesByCity || []).slice(0, 6).map(v => v.count),
      backgroundColor: 'rgba(249, 115, 22, 0.7)',
      borderColor: 'rgb(249, 115, 22)',
      borderWidth: 1,
      borderRadius: 6,
    }],
  };

  // Booking funnel data
  const totalViews = eventData?.totalViews || 0;
  const totalOrders = orderData?.totalOrders || 0;
  const totalTickets = ticketData?.totalTickets || 0;
  const checkedIn = ticketData?.checkedInTickets || 0;
  const funnelSteps = [
    { label: 'Event Views', value: totalViews, color: 'bg-blue-500' },
    { label: 'Orders', value: totalOrders, color: 'bg-purple-500' },
    { label: 'Tickets Issued', value: totalTickets, color: 'bg-amber-500' },
    { label: 'Checked In', value: checkedIn, color: 'bg-green-500' },
  ];
  const funnelMax = Math.max(...funnelSteps.map(s => s.value), 1);

  return (
    <>
      <PrivatePageSEO
        title="Admin - Analytics | Kidrove"
        description="View analytics and insights"
      />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-screen-xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Analytics Dashboard
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Real-time insights across your platform
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <select
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm
                  bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as TimeRange)}
              >
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
                <option value="90days">Last 90 Days</option>
                <option value="1year">Last 12 Months</option>
              </select>
              <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                <button
                  onClick={() => setGranularity('daily')}
                  className={`px-3 py-2 text-sm font-medium transition-colors ${
                    granularity === 'daily'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Daily
                </button>
                <button
                  onClick={() => setGranularity('monthly')}
                  className={`px-3 py-2 text-sm font-medium transition-colors ${
                    granularity === 'monthly'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Monthly
                </button>
              </div>
              <button
                onClick={fetchData}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600
                  text-white rounded-lg text-sm font-medium hover:bg-blue-700
                  transition-colors"
              >
                <FaSyncAlt className="w-3.5 h-3.5" />
                Refresh
              </button>
              <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                <select
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value as 'json' | 'csv')}
                  className="px-2 py-2 text-sm bg-white border-r border-gray-300
                    focus:ring-0 focus:outline-none"
                >
                  <option value="csv">CSV</option>
                  <option value="json">JSON</option>
                </select>
                <button
                  onClick={() => handleExport('all')}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm
                    font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                >
                  <FaDownload className="w-3.5 h-3.5" />
                  Export
                </button>
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* KPI Cards — Row 1 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <KPICard
              icon={<FaUsers className="w-5 h-5 text-blue-600" />}
              iconBg="bg-blue-50"
              value={formatNumber(dashboard?.totalUsers || userData?.totalUsers || 0)}
              label="Total Users"
              growth={dashboard?.userGrowth}
              sub={userData ? `${formatNumber(userData.activeUsers)} active · ${(userData.verificationRate ?? 0).toFixed(0)}% verified` : undefined}
            />
            <KPICard
              icon={<FaCalendarAlt className="w-5 h-5 text-orange-600" />}
              iconBg="bg-orange-50"
              value={formatNumber(dashboard?.totalEvents || eventData?.totalEvents || 0)}
              label="Total Events"
              growth={dashboard?.eventGrowth}
              sub={eventData ? `${formatNumber(eventData.activeEvents)} active · ${formatNumber(eventData.pendingApproval)} pending` : undefined}
            />
            <KPICard
              icon={<FaShoppingCart className="w-5 h-5 text-purple-600" />}
              iconBg="bg-purple-50"
              value={formatNumber(orderData?.totalOrders || 0)}
              label="Total Orders"
              sub={orderData && (orderData.averageOrderValue ?? 0) > 0
                ? `Avg: ${formatCurrency(orderData.averageOrderValue)}${(orderData.refundRate ?? 0) > 0 ? ` · ${(orderData.refundRate ?? 0).toFixed(1)}% refunds` : ''}`
                : undefined}
            />
            <KPICard
              icon={<FaDollarSign className="w-5 h-5 text-green-600" />}
              iconBg="bg-green-50"
              value={formatCurrency(orderData?.totalRevenue || dashboard?.totalRevenue || 0)}
              label="Total Revenue"
              growth={dashboard?.revenueGrowth}
              sub={dashboard ? `${formatNumber(dashboard.totalTicketsSold)} tickets sold` : undefined}
            />
          </div>

          {/* KPI Cards — Row 2: Tickets, Conversion, Venues, Check-in */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <KPICard
              icon={<FaTicketAlt className="w-5 h-5 text-indigo-600" />}
              iconBg="bg-indigo-50"
              value={formatNumber(ticketData?.totalTickets || 0)}
              label="Total Tickets"
              sub={ticketData ? `${formatNumber(ticketData.checkedInTickets)} checked in · ${formatNumber(ticketData.cancelledTickets)} cancelled` : undefined}
            />
            <KPICard
              icon={<FaPercentage className="w-5 h-5 text-teal-600" />}
              iconBg="bg-teal-50"
              value={`${(orderData?.viewToOrderRate ?? orderData?.conversionRate ?? 0).toFixed(2)}%`}
              label="View → Order Rate"
              sub="Event views that converted to a paid order"
            />
            <KPICard
              icon={<FaMapMarkerAlt className="w-5 h-5 text-rose-600" />}
              iconBg="bg-rose-50"
              value={formatNumber(venueData?.totalVenues || 0)}
              label="Physical Venues"
              sub={venueData ? `${formatNumber(venueData.activeVenues)} active · ${venueData.utilizationRate.toFixed(0)}% utilized` : undefined}
            />
            <KPICard
              icon={<FaExchangeAlt className="w-5 h-5 text-cyan-600" />}
              iconBg="bg-cyan-50"
              value={`${(ticketData?.checkInRate ?? 0).toFixed(1)}%`}
              label="Check-in Rate"
              sub={ticketData ? `${(ticketData.transferRate ?? 0).toFixed(1)}% transfer rate` : undefined}
            />
          </div>

          {/* Per-section error chips */}
          {Object.keys(sectionErrors).length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {Object.keys(sectionErrors).map(section => (
                <span key={section} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full
                  bg-red-50 border border-red-200 text-red-600 text-xs font-medium">
                  ⚠ {section} data unavailable
                </span>
              ))}
            </div>
          )}

          {/* KPI Cards — Row 3: Financial breakdown (already computed in dashboard-optimized) */}
          {(financialMetrics.netRevenue != null || financialMetrics.platformCommission != null) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <KPICard
                icon={<FaDollarSign className="w-5 h-5 text-emerald-600" />}
                iconBg="bg-emerald-50"
                value={formatCurrency(financialMetrics.netRevenue ?? 0)}
                label="Net Revenue"
                sub={financialMetrics.refundAmount != null ? `After ${formatCurrency(financialMetrics.refundAmount)} refunds` : undefined}
              />
              <KPICard
                icon={<FaChartLine className="w-5 h-5 text-violet-600" />}
                iconBg="bg-violet-50"
                value={formatCurrency(financialMetrics.platformCommission ?? 0)}
                label="Platform Commission"
                sub="From paymentRouting"
              />
              <KPICard
                icon={<FaExchangeAlt className="w-5 h-5 text-sky-600" />}
                iconBg="bg-sky-50"
                value={formatCurrency(financialMetrics.vendorPayouts ?? 0)}
                label="Vendor Payouts"
                sub="From paymentRouting"
              />
              <KPICard
                icon={<FaArrowDown className="w-5 h-5 text-red-500" />}
                iconBg="bg-red-50"
                value={formatCurrency(financialMetrics.refundAmount ?? 0)}
                label="Total Refunds"
                sub={orderData?.refundRate != null ? `${orderData.refundRate.toFixed(1)}% refund rate` : undefined}
              />
            </div>
          )}

          {/* Booking Funnel */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">Booking Funnel</h3>
            <div className="space-y-3">
              {funnelSteps.map((step, idx) => {
                const pct = funnelMax > 0 ? (step.value / funnelMax) * 100 : 0;
                const prevValue = idx > 0 ? funnelSteps[idx - 1].value : null;
                const dropOff = prevValue && prevValue > 0
                  ? ((1 - step.value / prevValue) * 100).toFixed(1)
                  : null;
                return (
                  <div key={step.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">{step.label}</span>
                      <div className="flex items-center gap-3">
                        {dropOff !== null && (
                          <span className="text-xs text-red-500">-{dropOff}% drop</span>
                        )}
                        <span className="text-sm font-semibold text-gray-900">
                          {formatNumber(step.value)}
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3">
                      <div
                        className={`${step.color} h-3 rounded-full transition-all duration-500`}
                        style={{ width: `${Math.max(pct, 1)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Line Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Revenue Trend</h3>
                <FaChartLine className="w-4 h-4 text-green-500" />
              </div>
              <div className="h-72">
                {revenueTimeSeries.length > 0 ? (
                  <Line data={revenueChartData} options={revenueChartOptions} />
                ) : (
                  <EmptyChart label="No revenue data for this period" />
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Orders Trend</h3>
                <FaShoppingCart className="w-4 h-4 text-purple-500" />
              </div>
              <div className="h-72">
                {revenueTimeSeries.length > 0 ? (
                  <Line data={ordersChartData} options={countChartOptions} />
                ) : (
                  <EmptyChart label="No order data for this period" />
                )}
              </div>
            </div>
          </div>

          {/* Bar + Line Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Events Created</h3>
                <FaCalendarAlt className="w-4 h-4 text-blue-500" />
              </div>
              <div className="h-72">
                {eventsByMonth.length > 0 ? (
                  <Bar data={eventsChartData} options={barChartOptions} />
                ) : (
                  <EmptyChart label="No event data for this period" />
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">User Growth</h3>
                <FaUsers className="w-4 h-4 text-blue-500" />
              </div>
              <div className="h-72">
                {usersByMonth.length > 0 ? (
                  <Line data={usersChartData} options={countChartOptions} />
                ) : (
                  <EmptyChart label="No user data for this period" />
                )}
              </div>
            </div>
          </div>

          {/* Ticket Analytics Section */}
          {ticketData && (ticketData.totalTickets > 0 || peakHours.length > 0) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Tickets by Type</h3>
                  <FaTicketAlt className="w-4 h-4 text-indigo-500" />
                </div>
                <div className="h-64">
                  {(ticketData.ticketsByType || []).length > 0 ? (
                    <Doughnut data={ticketTypeData} options={pieOptions} />
                  ) : (
                    <EmptyChart label="No ticket type data" />
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Check-ins by Hour</h3>
                  <FaExchangeAlt className="w-4 h-4 text-green-500" />
                </div>
                <div className="h-64">
                  {peakHours.length > 0 ? (
                    <Bar data={scansChartData} options={barChartOptions} />
                  ) : (
                    <EmptyChart label="No check-in scan data" />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Distribution Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Events by Category</h3>
              <div className="h-64">
                {(eventData?.topCategories || []).length > 0 ? (
                  <Pie data={categoryChartData} options={pieOptions} />
                ) : (
                  <EmptyChart label="No category data" />
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Orders by Status</h3>
              <div className="h-64">
                {(orderData?.ordersByStatus || []).length > 0 ? (
                  <Doughnut data={orderStatusData} options={pieOptions} />
                ) : (
                  <EmptyChart label="No order status data" />
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Users by Role</h3>
              <div className="h-64">
                {(userData?.usersByRole || []).length > 0 ? (
                  <Doughnut data={userRoleData} options={pieOptions} />
                ) : (
                  <EmptyChart label="No user role data" />
                )}
              </div>
            </div>
          </div>

          {/* Events by Location + Venues by City */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {(eventData?.topLocations || []).length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <h3 className="font-semibold text-gray-900 mb-4">Events by Location</h3>
                <div className="h-64">
                  <Bar data={locationData} options={barChartOptions} />
                </div>
              </div>
            )}

            {(venueData?.venuesByCity || []).length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Venues by City</h3>
                  <FaMapMarkerAlt className="w-4 h-4 text-orange-500" />
                </div>
                <div className="h-64">
                  <Bar data={venueCityData} options={barChartOptions} />
                </div>
              </div>
            )}
          </div>

          {/* Venue Stats */}
          {venueData && venueData.totalVenues > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
              <h3 className="font-semibold text-gray-900 mb-4">Venue Overview</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatBox label="Total Venues" value={formatNumber(venueData.totalVenues)} color="orange" />
                <StatBox label="Active Venues" value={formatNumber(venueData.activeVenues)} color="green" />
                <StatBox label="Avg Capacity" value={formatNumber(venueData.averageCapacity)} color="blue" />
                <StatBox
                  label="Seat Utilization"
                  value={`${venueData.utilizationRate.toFixed(1)}%`}
                  color={venueData.utilizationRate >= 70 ? 'green' : venueData.utilizationRate >= 40 ? 'yellow' : 'red'}
                />
              </div>
              {(venueData.venuesByType || []).length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs font-medium text-gray-500 uppercase mb-2">By Type</p>
                  <div className="flex flex-wrap gap-2">
                    {venueData.venuesByType.map(v => (
                      <span key={v.type} className="px-2.5 py-1 bg-gray-100 rounded-full text-xs text-gray-700 font-medium">
                        {capitalize(v.type || 'Other')} ({v.count})
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── Google Search Console ─────────────────────────────────── */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <FaSearch className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Google Search Console</h3>
                  <p className="text-xs text-gray-500">Organic search performance</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {gscConfigured && gscFetchedAt && (
                  <span className="text-xs text-gray-400 hidden sm:inline">
                    Last synced {new Date(gscFetchedAt).toLocaleString()}
                  </span>
                )}

                {/* Domain selector */}
                {gscConfigured && gscSites.length > 1 && (
                  <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
                    {gscSites.map(site => {
                      const label = site.replace('sc-domain:', '');
                      return (
                        <button
                          key={site}
                          onClick={() => setGscSite(site)}
                          className={`px-3 py-1.5 font-medium transition-colors ${
                            gscSite === site
                              ? 'bg-blue-600 text-white'
                              : 'bg-white text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                )}

                {gscConfigured && (
                  <button
                    onClick={handleGscSync}
                    disabled={gscSyncing || gscLoading}
                    className="px-3 py-1.5 text-sm font-medium rounded-lg border border-blue-200 text-blue-600 bg-blue-50 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                  >
                    {gscSyncing ? 'Syncing…' : 'Sync Now'}
                  </button>
                )}

                <Link
                  to="/admin/traffic"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 text-gray-600 bg-white hover:bg-gray-50 transition-colors whitespace-nowrap"
                >
                  Full Traffic Report
                  <FaExternalLinkAlt className="w-3 h-3" />
                </Link>
              </div>
            </div>

            {!gscConfigured ? (
              <div className="text-center py-10 text-gray-400">
                <FaGlobe className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Search Console not configured.</p>
                <p className="text-xs mt-1">Set GOOGLE_SERVICE_ACCOUNT_JSON and SEARCH_CONSOLE_SITE_URLS in backend .env</p>
              </div>
            ) : gscLoading ? (
              <div className="flex items-center justify-center py-10">
                <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600" />
              </div>
            ) : (
              <>
                {/* KPI row */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <FaMouse className="w-3.5 h-3.5 text-blue-500" />
                      <span className="text-xs text-gray-500 font-medium">Total Clicks</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-700">
                      {formatNumber(gscSummary?.summary?.clicks ?? 0)}
                    </p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <FaEye className="w-3.5 h-3.5 text-purple-500" />
                      <span className="text-xs text-gray-500 font-medium">Impressions</span>
                    </div>
                    <p className="text-2xl font-bold text-purple-700">
                      {formatNumber(gscSummary?.summary?.impressions ?? 0)}
                    </p>
                  </div>
                  <div className="bg-emerald-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <FaPercentage className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-xs text-gray-500 font-medium">Avg CTR</span>
                    </div>
                    <p className="text-2xl font-bold text-emerald-700">
                      {((gscSummary?.summary?.ctr ?? 0) * 100).toFixed(2)}%
                    </p>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <FaTrophy className="w-3.5 h-3.5 text-amber-500" />
                      <span className="text-xs text-gray-500 font-medium">Avg Position</span>
                    </div>
                    <p className="text-2xl font-bold text-amber-700">
                      {(gscSummary?.summary?.position ?? 0).toFixed(1)}
                    </p>
                  </div>
                </div>

                {/* Trend chart */}
                {(gscSummary?.trend?.length ?? 0) > 0 && (
                  <div className="mb-5">
                    <p className="text-xs font-medium text-gray-500 uppercase mb-2">Performance Trend</p>
                    <div className="h-52">
                      <Line
                        data={{
                          labels: (gscSummary?.trend ?? []).map(r => r.keys?.[0] ?? ''),
                          datasets: [
                            {
                              label: 'Clicks',
                              data: (gscSummary?.trend ?? []).map(r => r.clicks),
                              borderColor: 'rgb(59, 130, 246)',
                              backgroundColor: 'rgba(59, 130, 246, 0.08)',
                              tension: 0.4,
                              fill: true,
                              pointRadius: 2,
                              yAxisID: 'yClicks',
                            },
                            {
                              label: 'Impressions',
                              data: (gscSummary?.trend ?? []).map(r => r.impressions),
                              borderColor: 'rgb(139, 92, 246)',
                              backgroundColor: 'rgba(139, 92, 246, 0.08)',
                              tension: 0.4,
                              fill: true,
                              pointRadius: 2,
                              yAxisID: 'yImpressions',
                            },
                          ],
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          interaction: { mode: 'index' as const, intersect: false },
                          plugins: {
                            legend: {
                              display: true,
                              position: 'top' as const,
                              labels: { usePointStyle: true, pointStyle: 'circle', font: { size: 11 } },
                            },
                            tooltip: { backgroundColor: 'rgba(0,0,0,0.8)', padding: 10, cornerRadius: 8 },
                          },
                          scales: {
                            x: { grid: { display: false }, ticks: { font: { size: 10 }, maxTicksLimit: 12 } },
                            yClicks: {
                              type: 'linear' as const,
                              position: 'left' as const,
                              beginAtZero: true,
                              grid: { color: 'rgba(0,0,0,0.04)' },
                              ticks: { font: { size: 10 } },
                              title: { display: true, text: 'Clicks', font: { size: 10 } },
                            },
                            yImpressions: {
                              type: 'linear' as const,
                              position: 'right' as const,
                              beginAtZero: true,
                              grid: { display: false },
                              ticks: { font: { size: 10 } },
                              title: { display: true, text: 'Impressions', font: { size: 10 } },
                            },
                          },
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Tables row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {/* Top Queries */}
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase mb-2">Top Queries</p>
                    {gscQueries.length === 0 ? (
                      <p className="text-sm text-gray-400 py-4 text-center">No query data yet</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-xs text-gray-500 border-b border-gray-100">
                              <th className="text-left pb-2 font-medium">Query</th>
                              <th className="text-right pb-2 font-medium">Clicks</th>
                              <th className="text-right pb-2 font-medium">Impr.</th>
                              <th className="text-right pb-2 font-medium">CTR</th>
                              <th className="text-right pb-2 font-medium">Pos.</th>
                            </tr>
                          </thead>
                          <tbody>
                            {gscQueries.slice(0, 10).map((row, i) => (
                              <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                                <td className="py-1.5 pr-2 text-gray-800 max-w-[160px] truncate font-medium">
                                  {row.keys?.[0] ?? '—'}
                                </td>
                                <td className="py-1.5 text-right text-blue-600 font-medium">{row.clicks}</td>
                                <td className="py-1.5 text-right text-gray-500">{formatNumber(row.impressions)}</td>
                                <td className="py-1.5 text-right text-emerald-600">{((row.ctr ?? 0) * 100).toFixed(1)}%</td>
                                <td className="py-1.5 text-right text-amber-600">{(row.position ?? 0).toFixed(1)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Top Pages */}
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase mb-2">Top Pages</p>
                    {gscPages.length === 0 ? (
                      <p className="text-sm text-gray-400 py-4 text-center">No page data yet</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-xs text-gray-500 border-b border-gray-100">
                              <th className="text-left pb-2 font-medium">Page</th>
                              <th className="text-right pb-2 font-medium">Clicks</th>
                              <th className="text-right pb-2 font-medium">Impr.</th>
                              <th className="text-right pb-2 font-medium">CTR</th>
                              <th className="text-right pb-2 font-medium">Pos.</th>
                            </tr>
                          </thead>
                          <tbody>
                            {gscPages.slice(0, 10).map((row, i) => {
                              const url = row.keys?.[0] ?? '';
                              const path = url.replace(/^https?:\/\/[^/]+/, '') || '/';
                              return (
                                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                                  <td className="py-1.5 pr-2 text-gray-800 max-w-[160px] truncate font-medium" title={url}>
                                    {path}
                                  </td>
                                  <td className="py-1.5 text-right text-blue-600 font-medium">{row.clicks}</td>
                                  <td className="py-1.5 text-right text-gray-500">{formatNumber(row.impressions)}</td>
                                  <td className="py-1.5 text-right text-emerald-600">{((row.ctr ?? 0) * 100).toFixed(1)}%</td>
                                  <td className="py-1.5 text-right text-amber-600">{(row.position ?? 0).toFixed(1)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Top Performers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-4">
                <FaTrophy className="w-4 h-4 text-yellow-500" />
                <h3 className="font-semibold text-gray-900">Top Events</h3>
              </div>
              {(dashboard?.topPerformingEvents || []).length > 0 ? (
                <div className="space-y-3">
                  {dashboard!.topPerformingEvents.map((event, idx) => (
                    <div
                      key={event.eventId}
                      className="flex items-center gap-3 p-3 rounded-lg bg-gray-50"
                    >
                      <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-100
                        text-blue-700 text-xs font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {event.title}
                        </p>
                        <p className="text-xs text-gray-500">
                          {event.tickets} tickets
                          {event.rating > 0 && <> · {event.rating.toFixed(1)} rating</>}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-gray-900 flex-shrink-0">
                        {formatCurrency(event.revenue)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-8">
                  No event performance data yet
                </p>
              )}
            </div>

            {/* Quick Stats */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Quick Stats</h3>
              <div className="grid grid-cols-2 gap-4">
                <StatBox label="Total Views" value={formatNumber(eventData?.totalViews || 0)} color="blue" />
                <StatBox label="Avg Rating" value={(eventData?.averageRating || 0).toFixed(1)} color="yellow" />
                <StatBox label="Active Events" value={formatNumber(eventData?.activeEvents || 0)} color="green" />
                <StatBox label="Pending Approval" value={formatNumber(eventData?.pendingApproval || 0)} color="orange" />
                <StatBox label="Active Users" value={formatNumber(userData?.activeUsers || 0)} color="purple" />
                <StatBox label="Verification Rate" value={`${(userData?.verificationRate ?? 0).toFixed(0)}%`} color="teal" />
              </div>

              {(userData?.topCountries || []).length > 0 && (
                <div className="mt-5 pt-4 border-t border-gray-100">
                  <p className="text-xs font-medium text-gray-500 uppercase mb-2">
                    Top Countries
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {userData!.topCountries.slice(0, 5).map((c) => (
                      <span
                        key={c.country}
                        className="px-2.5 py-1 bg-gray-100 rounded-full text-xs
                          text-gray-700 font-medium"
                      >
                        {c.country} ({c.count})
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// --- Sub-components ---

const EmptyChart: React.FC<{ label: string }> = ({ label }) => (
  <div className="h-full flex items-center justify-center">
    <p className="text-sm text-gray-400">{label}</p>
  </div>
);

const KPICard: React.FC<{
  icon: React.ReactNode;
  iconBg: string;
  value: string;
  label: string;
  growth?: number;
  sub?: string;
}> = ({ icon, iconBg, value, label, growth, sub }) => {
  const rounded = growth !== undefined ? Math.round(growth * 10) / 10 : null;
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2.5 rounded-lg ${iconBg}`}>{icon}</div>
        {rounded !== null && (
          rounded > 0 ? (
            <span className="inline-flex items-center gap-1 text-sm font-medium text-green-600">
              <FaArrowUp className="w-3 h-3" /> {rounded}%
            </span>
          ) : rounded < 0 ? (
            <span className="inline-flex items-center gap-1 text-sm font-medium text-red-600">
              <FaArrowDown className="w-3 h-3" /> {Math.abs(rounded)}%
            </span>
          ) : (
            <span className="text-sm text-gray-500">0%</span>
          )
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500 mt-1">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
};

const StatBox: React.FC<{
  label: string;
  value: string;
  color: string;
}> = ({ label, value, color }) => {
  const bgMap: Record<string, string> = {
    blue: 'bg-blue-50', green: 'bg-green-50', orange: 'bg-orange-50',
    purple: 'bg-purple-50', yellow: 'bg-yellow-50', teal: 'bg-teal-50',
    red: 'bg-red-50', indigo: 'bg-indigo-50', cyan: 'bg-cyan-50',
  };
  const textMap: Record<string, string> = {
    blue: 'text-blue-700', green: 'text-green-700', orange: 'text-orange-700',
    purple: 'text-purple-700', yellow: 'text-yellow-700', teal: 'text-teal-700',
    red: 'text-red-700', indigo: 'text-indigo-700', cyan: 'text-cyan-700',
  };

  return (
    <div className={`rounded-lg p-3 ${bgMap[color] || 'bg-gray-50'}`}>
      <p className={`text-lg font-bold ${textMap[color] || 'text-gray-700'}`}>
        {value}
      </p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
};

export default AdminAnalyticsPage;
