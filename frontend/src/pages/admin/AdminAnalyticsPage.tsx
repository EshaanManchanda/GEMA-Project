import React, { useState, useEffect, useCallback } from 'react';
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
import adminAPI from '../../services/api/adminAPI';
import { ApiService } from '../../services/api';
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

interface DashboardSummary {
  totalRevenue: number;
  totalEvents: number;
  totalTicketsSold: number;
  totalUsers: number;
  revenueGrowth: number;
  eventGrowth: number;
  userGrowth: number;
  topPerformingEvents: Array<{
    eventId: string;
    title: string;
    revenue: number;
    tickets: number;
    rating: number;
  }>;
}

interface EventAnalytics {
  totalEvents: number;
  activeEvents: number;
  pendingApproval: number;
  totalViews: number;
  averageRating: number;
  topCategories: Array<{ category: string; count: number }>;
  topLocations: Array<{ city: string; count: number }>;
  eventsByMonth: Array<{ month: string; count: number }>;
}

interface OrderAnalytics {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  ordersByStatus: Array<{ status: string; count: number; revenue: number }>;
  ordersByMonth: Array<{ month: string; count: number; revenue: number }>;
  topCurrencies: Array<{ currency: string; count: number; revenue: number }>;
  refundRate: number;
}

interface UserAnalytics {
  totalUsers: number;
  activeUsers: number;
  usersByRole: Array<{ role: string; count: number }>;
  usersByMonth: Array<{ month: string; count: number }>;
  topCountries: Array<{ country: string; count: number }>;
  verificationRate: number;
}

const CHART_COLORS = [
  'rgba(59, 130, 246, 0.7)',   // blue
  'rgba(16, 185, 129, 0.7)',   // green
  'rgba(245, 158, 11, 0.7)',   // amber
  'rgba(239, 68, 68, 0.7)',    // red
  'rgba(139, 92, 246, 0.7)',   // violet
  'rgba(236, 72, 153, 0.7)',   // pink
  'rgba(20, 184, 166, 0.7)',   // teal
  'rgba(249, 115, 22, 0.7)',   // orange
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

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-AE', {
    style: 'currency',
    currency: 'AED',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

const formatNumber = (n: number) => n.toLocaleString();

const AdminAnalyticsPage: React.FC = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>('30days');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [eventData, setEventData] = useState<EventAnalytics | null>(null);
  const [orderData, setOrderData] = useState<OrderAnalytics | null>(null);
  const [userData, setUserData] = useState<UserAnalytics | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const dateRange = getDateRange(timeRange);
      const params = {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      };

      const [dashRes, eventRes, orderRes, userRes] = await Promise.allSettled([
        adminAPI.getDashboardStats(),
        adminAPI.getEventAnalytics(params),
        ApiService.get('/analytics/orders', { params }),
        adminAPI.getUserAnalytics(params),
      ]);

      // Dashboard summary
      // getDashboardStats returns full API response { success, data }
      if (dashRes.status === 'fulfilled') {
        const d = dashRes.value?.data || dashRes.value;
        setDashboard(d);
      }

      // Event analytics
      // getEventAnalytics returns response.data (EventAnalytics directly)
      if (eventRes.status === 'fulfilled') {
        const d = eventRes.value?.data || eventRes.value;
        setEventData(d);
      }

      // Order analytics from /analytics/orders
      // ApiService.get returns { success, data: OrderAnalytics }
      if (orderRes.status === 'fulfilled') {
        const d = orderRes.value?.data || orderRes.value;
        setOrderData(d);
      }

      // User analytics
      // getUserAnalytics returns response.data (UserAnalytics directly)
      if (userRes.status === 'fulfilled') {
        const d = userRes.value?.data || userRes.value;
        setUserData(d);
      }
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

  const handleExport = async () => {
    try {
      const dateRange = getDateRange(timeRange);
      const data = await adminAPI.exportAnalytics({
        type: 'orders',
        ...dateRange,
        format: 'json',
      });
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
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

  // --- Growth indicator ---
  const GrowthBadge: React.FC<{ value: number }> = ({ value }) => {
    const rounded = Math.round(value * 10) / 10;
    if (rounded > 0) return (
      <span className="inline-flex items-center gap-1 text-sm font-medium text-green-600">
        <FaArrowUp className="w-3 h-3" /> {rounded}%
      </span>
    );
    if (rounded < 0) return (
      <span className="inline-flex items-center gap-1 text-sm font-medium text-red-600">
        <FaArrowDown className="w-3 h-3" /> {Math.abs(rounded)}%
      </span>
    );
    return <span className="text-sm text-gray-500">0%</span>;
  };

  // --- Chart options ---
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

  const ordersChartOptions = {
    ...baseChartOptions,
    plugins: {
      ...baseChartOptions.plugins,
      tooltip: {
        ...baseChartOptions.plugins.tooltip,
        callbacks: {
          label: (ctx: any) => `Orders: ${formatNumber(ctx.parsed.y)}`,
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
          callback: (val: any) =>
            Number.isInteger(val) ? val : '',
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
          callback: (val: any) =>
            Number.isInteger(val) ? val : '',
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

  // Prepare chart data
  const revenueByMonth = orderData?.ordersByMonth || [];
  const eventsByMonth = eventData?.eventsByMonth || [];
  const usersByMonth = userData?.usersByMonth || [];

  const revenueChartData = {
    labels: revenueByMonth.map(m => formatMonth(m.month)),
    datasets: [{
      label: 'Revenue (AED)',
      data: revenueByMonth.map(m => m.revenue),
      borderColor: 'rgb(16, 185, 129)',
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      tension: 0.4,
      fill: true,
      pointBackgroundColor: 'rgb(16, 185, 129)',
      pointRadius: 4,
    }],
  };

  const ordersChartData = {
    labels: revenueByMonth.map(m => formatMonth(m.month)),
    datasets: [{
      label: 'Orders',
      data: revenueByMonth.map(m => m.count),
      borderColor: 'rgb(139, 92, 246)',
      backgroundColor: 'rgba(139, 92, 246, 0.1)',
      tension: 0.4,
      fill: true,
      pointBackgroundColor: 'rgb(139, 92, 246)',
      pointRadius: 4,
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
              <button
                onClick={fetchData}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600
                  text-white rounded-lg text-sm font-medium hover:bg-blue-700
                  transition-colors"
              >
                <FaSyncAlt className="w-3.5 h-3.5" />
                Refresh
              </button>
              <button
                onClick={handleExport}
                className="inline-flex items-center gap-2 px-4 py-2 border
                  border-gray-300 rounded-lg text-sm font-medium text-gray-700
                  bg-white hover:bg-gray-50 transition-colors"
              >
                <FaDownload className="w-3.5 h-3.5" />
                Export
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* Users */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 rounded-lg bg-blue-50">
                  <FaUsers className="w-5 h-5 text-blue-600" />
                </div>
                {dashboard && <GrowthBadge value={dashboard.userGrowth} />}
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {formatNumber(dashboard?.totalUsers || userData?.totalUsers || 0)}
              </p>
              <p className="text-sm text-gray-500 mt-1">Total Users</p>
              {userData && (
                <p className="text-xs text-gray-400 mt-1">
                  {formatNumber(userData.activeUsers)} active
                  &middot; {(userData.verificationRate ?? 0).toFixed(0)}% verified
                </p>
              )}
            </div>

            {/* Events */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 rounded-lg bg-orange-50">
                  <FaCalendarAlt className="w-5 h-5 text-orange-600" />
                </div>
                {dashboard && <GrowthBadge value={dashboard.eventGrowth} />}
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {formatNumber(dashboard?.totalEvents || eventData?.totalEvents || 0)}
              </p>
              <p className="text-sm text-gray-500 mt-1">Total Events</p>
              {eventData && (
                <p className="text-xs text-gray-400 mt-1">
                  {formatNumber(eventData.activeEvents)} active
                  &middot; {formatNumber(eventData.pendingApproval)} pending
                </p>
              )}
            </div>

            {/* Orders */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 rounded-lg bg-purple-50">
                  <FaShoppingCart className="w-5 h-5 text-purple-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {formatNumber(orderData?.totalOrders || 0)}
              </p>
              <p className="text-sm text-gray-500 mt-1">Total Orders</p>
              {orderData && (orderData.averageOrderValue ?? 0) > 0 && (
                <p className="text-xs text-gray-400 mt-1">
                  Avg: {formatCurrency(orderData.averageOrderValue)}
                  {(orderData.refundRate ?? 0) > 0 && (
                    <> &middot; {(orderData.refundRate ?? 0).toFixed(1)}% refund rate</>
                  )}
                </p>
              )}
            </div>

            {/* Revenue */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 rounded-lg bg-green-50">
                  <FaDollarSign className="w-5 h-5 text-green-600" />
                </div>
                {dashboard && <GrowthBadge value={dashboard.revenueGrowth} />}
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(orderData?.totalRevenue || dashboard?.totalRevenue || 0)}
              </p>
              <p className="text-sm text-gray-500 mt-1">Total Revenue</p>
              {dashboard && (
                <p className="text-xs text-gray-400 mt-1">
                  {formatNumber(dashboard.totalTicketsSold)} tickets sold
                </p>
              )}
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
                {revenueByMonth.length > 0 ? (
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
                {revenueByMonth.length > 0 ? (
                  <Line data={ordersChartData} options={ordersChartOptions} />
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
                  <Line data={usersChartData} options={ordersChartOptions} />
                ) : (
                  <EmptyChart label="No user data for this period" />
                )}
              </div>
            </div>
          </div>

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

          {/* Events by Location */}
          {(eventData?.topLocations || []).length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
              <h3 className="font-semibold text-gray-900 mb-4">Events by Location</h3>
              <div className="h-64">
                <Bar data={locationData} options={barChartOptions} />
              </div>
            </div>
          )}

          {/* Top Performers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Top Events */}
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
                          {event.rating > 0 && <> &middot; {event.rating.toFixed(1)} rating</>}
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
                <StatBox
                  label="Total Views"
                  value={formatNumber(eventData?.totalViews || 0)}
                  color="blue"
                />
                <StatBox
                  label="Avg Rating"
                  value={(eventData?.averageRating || 0).toFixed(1)}
                  color="yellow"
                />
                <StatBox
                  label="Active Events"
                  value={formatNumber(eventData?.activeEvents || 0)}
                  color="green"
                />
                <StatBox
                  label="Pending Approval"
                  value={formatNumber(eventData?.pendingApproval || 0)}
                  color="orange"
                />
                <StatBox
                  label="Active Users"
                  value={formatNumber(userData?.activeUsers || 0)}
                  color="purple"
                />
                <StatBox
                  label="Verification Rate"
                  value={`${(userData?.verificationRate ?? 0).toFixed(0)}%`}
                  color="teal"
                />
              </div>

              {/* Top Countries */}
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

const StatBox: React.FC<{
  label: string;
  value: string;
  color: string;
}> = ({ label, value, color }) => {
  const bgMap: Record<string, string> = {
    blue: 'bg-blue-50',
    green: 'bg-green-50',
    orange: 'bg-orange-50',
    purple: 'bg-purple-50',
    yellow: 'bg-yellow-50',
    teal: 'bg-teal-50',
    red: 'bg-red-50',
  };
  const textMap: Record<string, string> = {
    blue: 'text-blue-700',
    green: 'text-green-700',
    orange: 'text-orange-700',
    purple: 'text-purple-700',
    yellow: 'text-yellow-700',
    teal: 'text-teal-700',
    red: 'text-red-700',
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
