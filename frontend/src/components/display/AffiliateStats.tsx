import React, { useState, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  FaUsers,
  FaDollarSign,
  FaTrophy,
  FaChartLine,
  FaEye,
  FaStar,
  FaPercentage
} from 'react-icons/fa';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { AppDispatch } from '../../store';
import {
  fetchAllAffiliates,
  fetchAffiliateAnalytics,
  fetchTopPerformers,
  fetchDashboardStats,
  selectAffiliates,
  selectAffiliateAnalytics,
  selectTopPerformers,
  selectDashboardStats,
  selectAffiliatesLoading
} from '../../store/slices/affiliatesSlice';
import type { Affiliate } from '../../services/api/index';
import LoadingSpinner from '../common/LoadingSpinner';
import Modal from '../interactive/Modal';
import DataTable from '../interactive/DataTable';

interface AffiliateStatsProps {
  affiliateId?: string;
  className?: string;
  showCharts?: boolean;
  showTopPerformers?: boolean;
  compact?: boolean;
}

interface DateRange {
  startDate: string;
  endDate: string;
  label: string;
}

const AffiliateStats: React.FC<AffiliateStatsProps> = ({
  affiliateId,
  className = '',
  showCharts = true,
  showTopPerformers = true,
  compact: _compact = false
}) => {
  const dispatch = useDispatch<AppDispatch>();
  useSelector(selectAffiliates);
  const stats = useSelector(selectAffiliateAnalytics);
  const dashboardStats = useSelector(selectDashboardStats);
  const topPerformers = useSelector(selectTopPerformers);
  const isLoading = useSelector(selectAffiliatesLoading);

  const [selectedDateRange, setSelectedDateRange] = useState<string>('month');
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [selectedAffiliate, setSelectedAffiliate] = useState<Affiliate | null>(null);
  const [chartType, setChartType] = useState<'line' | 'area' | 'bar'>('line');

  const dateRanges: Record<string, DateRange> = {
    week: {
      startDate: format(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
      endDate: format(new Date(), 'yyyy-MM-dd'),
      label: 'Last 7 Days'
    },
    month: {
      startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
      endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
      label: 'This Month'
    },
    quarter: {
      startDate: format(subMonths(new Date(), 3), 'yyyy-MM-dd'),
      endDate: format(new Date(), 'yyyy-MM-dd'),
      label: 'Last 3 Months'
    },
    year: {
      startDate: format(new Date(new Date().getFullYear(), 0, 1), 'yyyy-MM-dd'),
      endDate: format(new Date(), 'yyyy-MM-dd'),
      label: 'This Year'
    }
  };

  useEffect(() => {
    const range = dateRanges[selectedDateRange];
    const params = {
      startDate: range.startDate,
      endDate: range.endDate,
      ...(affiliateId && { affiliateId })
    };

    dispatch(fetchAffiliateAnalytics(params));
    dispatch(fetchDashboardStats());

    if (showTopPerformers) {
      dispatch(fetchTopPerformers({ limit: 10 }));
    }

    dispatch(fetchAllAffiliates({}));
  }, [dispatch, selectedDateRange, affiliateId, showTopPerformers]);

  const handleViewAffiliateDetails = (affiliate: Affiliate) => {
    setSelectedAffiliate(affiliate);
    setShowStatsModal(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  // Prepare chart data from dashboardStats.dailyBreakdown
  const chartData = useMemo(() => {
    if (!dashboardStats?.dailyBreakdown) return [];
    return dashboardStats.dailyBreakdown.map(item => ({
      date: format(new Date(item.date), 'MMM dd'),
      commissions: item.earnings,
      sales: item.revenue,
      clicks: item.clicks,
      conversions: item.conversions
    }));
  }, [dashboardStats]);

  // Performance distribution data (based on total clicks as proxy for tier)
  const performanceData = useMemo(() => {
    const goldCount = topPerformers.filter(p => p.totalClicks > 500).length;
    const silverCount = topPerformers.filter(p => p.totalClicks > 100 && p.totalClicks <= 500).length;
    const bronzeCount = topPerformers.length - goldCount - silverCount;

    return [
      { name: 'Gold', value: goldCount, color: '#FFD700' },
      { name: 'Silver', value: silverCount, color: '#C0C0C0' },
      { name: 'Bronze', value: bronzeCount, color: '#CD7F32' },
    ].filter(d => d.value > 0);
  }, [topPerformers]);

  const getAffiliateName = (affiliate: Affiliate) =>
    affiliate.businessName || `Affiliate ${affiliate.affiliateCode}`;

  const getConversionRate = (affiliate: Affiliate) =>
    affiliate.totalClicks > 0 ? affiliate.totalConversions / affiliate.totalClicks : 0;

  const topPerformersColumns: any[] = [
    {
      key: 'businessName',
      label: 'Affiliate',
      render: (affiliate: Affiliate) => (
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm">
            {getAffiliateName(affiliate).charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-medium text-gray-900">{getAffiliateName(affiliate)}</div>
            <div className="text-sm text-gray-500">{affiliate.affiliateCode}</div>
          </div>
        </div>
      )
    },
    {
      key: 'totalClicks',
      label: 'Tier',
      render: (affiliate: Affiliate) => {
        const tier = affiliate.totalClicks > 500 ? 'gold' : affiliate.totalClicks > 100 ? 'silver' : 'bronze';
        return (
          <div className="flex items-center space-x-2">
            <FaStar className={`
              ${tier === 'gold' ? 'text-yellow-500' :
                tier === 'silver' ? 'text-gray-400' : 'text-orange-600'}
            `} />
            <span className="capitalize font-medium">{tier}</span>
          </div>
        );
      }
    },
    {
      key: 'totalCommissionEarned',
      label: 'Total Commissions',
      sortable: true,
      render: (affiliate: Affiliate) => (
        <div className="font-medium text-green-600">
          {formatCurrency(affiliate.totalCommissionEarned)}
        </div>
      )
    },
    {
      key: 'totalRevenue',
      label: 'Sales',
      sortable: true,
      render: (affiliate: Affiliate) => (
        <div className="text-gray-900">
          {formatCurrency(affiliate.totalRevenue)}
        </div>
      )
    },
    {
      key: 'conversionRate',
      label: 'Conversion Rate',
      sortable: true,
      render: (affiliate: Affiliate) => (
        <div className="flex items-center space-x-1">
          <FaPercentage size={12} className="text-gray-400" />
          <span>{formatPercentage(getConversionRate(affiliate))}</span>
        </div>
      )
    },
    {
      key: 'totalClicks',
      label: 'Clicks',
      sortable: true,
      render: (affiliate: Affiliate) => (
        <div className="text-gray-900">
          {affiliate.totalClicks?.toLocaleString() || 0}
        </div>
      )
    }
  ];

  const topPerformersActions: any[] = [
    {
      label: 'View Details',
      icon: <FaEye size={14} />,
      onClick: handleViewAffiliateDetails,
      className: 'text-blue-600 hover:text-blue-800'
    }
  ];

  if (isLoading && !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <FaChartLine className="text-gray-600" size={24} />
          <h2 className="text-xl font-semibold text-gray-900">
            Affiliate Performance
          </h2>
        </div>

        <div className="flex items-center space-x-4">
          <select
            value={selectedDateRange}
            onChange={(e) => setSelectedDateRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {Object.entries(dateRanges).map(([key, range]) => (
              <option key={key} value={key}>
                {range.label}
              </option>
            ))}
          </select>

          {showCharts && (
            <div className="flex border border-gray-300 rounded-md">
              <button
                onClick={() => setChartType('line')}
                className={`px-3 py-2 text-sm ${
                  chartType === 'line'
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                Line
              </button>
              <button
                onClick={() => setChartType('area')}
                className={`px-3 py-2 text-sm ${
                  chartType === 'area'
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                Area
              </button>
              <button
                onClick={() => setChartType('bar')}
                className={`px-3 py-2 text-sm ${
                  chartType === 'bar'
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                Bar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Key Metrics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Affiliates</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {stats.totalAffiliates?.toLocaleString() || 0}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {stats.activeAffiliates || 0} active
                </p>
              </div>
              <FaUsers className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Commissions</p>
                <p className="text-2xl font-semibold text-green-600">
                  {formatCurrency(stats.totalCommissionEarned || 0)}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {formatCurrency(stats.totalCommissionPaid || 0)} paid
                </p>
              </div>
              <FaDollarSign className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg. Conversion Rate</p>
                <p className="text-2xl font-semibold text-purple-600">
                  {formatPercentage(stats.averageConversionRate || 0)}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {stats.totalConversions?.toLocaleString() || 0} conversions
                </p>
              </div>
              <FaPercentage className="h-8 w-8 text-purple-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Top Performers</p>
                <p className="text-2xl font-semibold text-orange-600">
                  {topPerformers.filter(p => p.totalClicks > 500).length}
                </p>
                <p className="text-sm text-gray-500 mt-1">Gold Tier</p>
              </div>
              <FaTrophy className="h-8 w-8 text-orange-500" />
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      {showCharts && chartData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Performance Chart */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Performance Trend
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              {chartType === 'line' ? (
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="commissions"
                    stroke="#10B981"
                    strokeWidth={2}
                    name="Commissions ($)"
                  />
                  <Line
                    type="monotone"
                    dataKey="sales"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    name="Sales ($)"
                  />
                </LineChart>
              ) : chartType === 'area' ? (
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="commissions"
                    stackId="1"
                    stroke="#10B981"
                    fill="#10B981"
                    fillOpacity={0.3}
                    name="Commissions ($)"
                  />
                </AreaChart>
              ) : (
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar
                    dataKey="commissions"
                    fill="#10B981"
                    name="Commissions ($)"
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>

          {/* Tier Distribution */}
          {performanceData.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Affiliate Tier Distribution
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={performanceData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  >
                    {performanceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Top Performers Table */}
      {showTopPerformers && topPerformers.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Top Performers
            </h3>
          </div>
          <DataTable
            data={topPerformers}
            columns={topPerformersColumns}
            actions={topPerformersActions}
            loading={false}
            emptyText="No affiliate data available"
          />
        </div>
      )}

      {/* Affiliate Details Modal */}
      <Modal
        isOpen={showStatsModal}
        onClose={() => setShowStatsModal(false)}
        title="Affiliate Details"
        size="lg"
      >
        {selectedAffiliate && (
          <div className="p-6 space-y-6">
            {/* Profile */}
            <div className="flex items-center space-x-4">
              <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xl">
                {getAffiliateName(selectedAffiliate).charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  {getAffiliateName(selectedAffiliate)}
                </h3>
                <p className="text-gray-600">{selectedAffiliate.affiliateCode}</p>
                <div className="flex items-center space-x-2 mt-2">
                  <FaStar className={`
                    ${selectedAffiliate.totalClicks > 500 ? 'text-yellow-500' :
                      selectedAffiliate.totalClicks > 100 ? 'text-gray-400' : 'text-orange-600'}
                  `} />
                  <span className="capitalize font-medium text-sm">
                    {selectedAffiliate.totalClicks > 500 ? 'Gold' : selectedAffiliate.totalClicks > 100 ? 'Silver' : 'Bronze'} Tier
                  </span>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-green-600 text-sm font-medium">Total Commissions</div>
                <div className="text-green-900 text-xl font-semibold">
                  {formatCurrency(selectedAffiliate.totalCommissionEarned)}
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-blue-600 text-sm font-medium">Total Sales</div>
                <div className="text-blue-900 text-xl font-semibold">
                  {formatCurrency(selectedAffiliate.totalRevenue)}
                </div>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-purple-600 text-sm font-medium">Conversion Rate</div>
                <div className="text-purple-900 text-xl font-semibold">
                  {formatPercentage(getConversionRate(selectedAffiliate))}
                </div>
              </div>

              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="text-orange-600 text-sm font-medium">Total Clicks</div>
                <div className="text-orange-900 text-xl font-semibold">
                  {selectedAffiliate.totalClicks?.toLocaleString() || 0}
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Contact Information</h4>
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm text-gray-500">Join Date</dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {format(new Date(selectedAffiliate.createdAt), 'MMM dd, yyyy')}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Status</dt>
                  <dd className="text-sm font-medium text-gray-900">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      selectedAffiliate.status === 'active'
                        ? 'text-green-700 bg-green-100'
                        : selectedAffiliate.status === 'pending'
                        ? 'text-yellow-700 bg-yellow-100'
                        : 'text-red-700 bg-red-100'
                    }`}>
                      {selectedAffiliate.status.charAt(0).toUpperCase() + selectedAffiliate.status.slice(1)}
                    </span>
                  </dd>
                </div>
                {selectedAffiliate.paymentDetails?.paypalEmail && (
                  <div>
                    <dt className="text-sm text-gray-500">PayPal Email</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {selectedAffiliate.paymentDetails.paypalEmail}
                    </dd>
                  </div>
                )}
                {selectedAffiliate.website && (
                  <div>
                    <dt className="text-sm text-gray-500">Website</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      <a href={selectedAffiliate.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {selectedAffiliate.website}
                      </a>
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AffiliateStats;
