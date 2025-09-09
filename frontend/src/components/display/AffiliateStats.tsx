import React, { useState, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { 
  FaUsers, 
  FaDollarSign, 
  FaTrophy,
  FaChartLine,
  FaEye,
  FaDownload,
  FaCalendarAlt,
  FaFilter,
  FaStar,
  FaArrowUp,
  FaArrowDown,
  FaEquals,
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
import { RootState, AppDispatch } from '../../store';
import { 
  fetchAllAffiliates,
  fetchAffiliateAnalytics,
  fetchTopPerformers,
  fetchCommissions,
  selectAffiliates,
  selectAffiliateAnalytics,
  selectTopPerformers,
  selectCommissions,
  selectAffiliatesLoading
} from '../../store/slices/affiliatesSlice';
import type { Affiliate, AffiliateAnalytics as StatsType, AffiliateCommission as Commission } from '../../services/api/index';
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
  compact = false
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const affiliates = useSelector(selectAffiliates);
  const stats = useSelector(selectAffiliateStats);
  const topPerformers = useSelector(selectTopPerformers);
  const commissionHistory = useSelector(selectCommissionHistory);
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

    dispatch(fetchAffiliateStats(params));
    dispatch(fetchCommissionHistory(params));
    
    if (showTopPerformers) {
      dispatch(fetchTopPerformers({ ...params, limit: 10 }));
    }
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

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) return <FaArrowUp className="text-green-500" />;
    if (current < previous) return <FaArrowDown className="text-red-500" />;
    return <FaEquals className="text-gray-500" />;
  };

  const getTrendColor = (current: number, previous: number) => {
    if (current > previous) return 'text-green-600';
    if (current < previous) return 'text-red-600';
    return 'text-gray-600';
  };

  // Prepare chart data
  const chartData = useMemo(() => {
    return commissionHistory.map(item => ({
      date: format(new Date(item.date), 'MMM dd'),
      commissions: item.totalCommissions,
      sales: item.totalSales,
      clicks: item.totalClicks,
      conversions: item.totalConversions
    }));
  }, [commissionHistory]);

  // Performance distribution data
  const performanceData = useMemo(() => {
    const tierCounts = topPerformers.reduce((acc, performer) => {
      const tier = performer.stats.tier || 'bronze';
      acc[tier] = (acc[tier] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(tierCounts).map(([tier, count]) => ({
      name: tier.charAt(0).toUpperCase() + tier.slice(1),
      value: count,
      color: tier === 'gold' ? '#FFD700' : tier === 'silver' ? '#C0C0C0' : '#CD7F32'
    }));
  }, [topPerformers]);

  const topPerformersColumns = [
    {
      key: 'user.name',
      label: 'Affiliate',
      render: (affiliate: Affiliate) => (
        <div className="flex items-center space-x-3">
          {affiliate.user.profileImage && (
            <img
              src={affiliate.user.profileImage}
              alt={affiliate.user.name}
              className="h-8 w-8 rounded-full"
            />
          )}
          <div>
            <div className="font-medium text-gray-900">{affiliate.user.name}</div>
            <div className="text-sm text-gray-500">{affiliate.user.email}</div>
          </div>
        </div>
      )
    },
    {
      key: 'stats.tier',
      label: 'Tier',
      render: (affiliate: Affiliate) => (
        <div className="flex items-center space-x-2">
          <FaStar className={`
            ${affiliate.stats.tier === 'gold' ? 'text-yellow-500' : 
              affiliate.stats.tier === 'silver' ? 'text-gray-400' : 'text-orange-600'}
          `} />
          <span className="capitalize font-medium">
            {affiliate.stats.tier || 'Bronze'}
          </span>
        </div>
      )
    },
    {
      key: 'stats.totalCommissions',
      label: 'Total Commissions',
      sortable: true,
      render: (affiliate: Affiliate) => (
        <div className="font-medium text-green-600">
          {formatCurrency(affiliate.stats.totalCommissions)}
        </div>
      )
    },
    {
      key: 'stats.totalSales',
      label: 'Sales',
      sortable: true,
      render: (affiliate: Affiliate) => (
        <div className="text-gray-900">
          {formatCurrency(affiliate.stats.totalSales)}
        </div>
      )
    },
    {
      key: 'stats.conversionRate',
      label: 'Conversion Rate',
      sortable: true,
      render: (affiliate: Affiliate) => (
        <div className="flex items-center space-x-1">
          <FaPercentage size={12} className="text-gray-400" />
          <span>{formatPercentage(affiliate.stats.conversionRate || 0)}</span>
        </div>
      )
    },
    {
      key: 'stats.totalClicks',
      label: 'Clicks',
      sortable: true,
      render: (affiliate: Affiliate) => (
        <div className="text-gray-900">
          {affiliate.stats.totalClicks?.toLocaleString() || 0}
        </div>
      )
    }
  ];

  const topPerformersActions = [
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
                {stats.previousPeriod && (
                  <div className={`flex items-center space-x-1 mt-1 text-sm ${
                    getTrendColor(stats.totalAffiliates, stats.previousPeriod.totalAffiliates)
                  }`}>
                    {getTrendIcon(stats.totalAffiliates, stats.previousPeriod.totalAffiliates)}
                    <span>
                      {Math.abs(((stats.totalAffiliates - stats.previousPeriod.totalAffiliates) / stats.previousPeriod.totalAffiliates * 100)).toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
              <FaUsers className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Commissions</p>
                <p className="text-2xl font-semibold text-green-600">
                  {formatCurrency(stats.totalCommissions || 0)}
                </p>
                {stats.previousPeriod && (
                  <div className={`flex items-center space-x-1 mt-1 text-sm ${
                    getTrendColor(stats.totalCommissions, stats.previousPeriod.totalCommissions)
                  }`}>
                    {getTrendIcon(stats.totalCommissions, stats.previousPeriod.totalCommissions)}
                    <span>
                      {Math.abs(((stats.totalCommissions - stats.previousPeriod.totalCommissions) / stats.previousPeriod.totalCommissions * 100)).toFixed(1)}%
                    </span>
                  </div>
                )}
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
                {stats.previousPeriod && (
                  <div className={`flex items-center space-x-1 mt-1 text-sm ${
                    getTrendColor(stats.averageConversionRate, stats.previousPeriod.averageConversionRate)
                  }`}>
                    {getTrendIcon(stats.averageConversionRate, stats.previousPeriod.averageConversionRate)}
                    <span>
                      {Math.abs(((stats.averageConversionRate - stats.previousPeriod.averageConversionRate) / stats.previousPeriod.averageConversionRate * 100)).toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
              <FaPercentage className="h-8 w-8 text-purple-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Top Performers</p>
                <p className="text-2xl font-semibold text-orange-600">
                  {topPerformers.filter(p => p.stats.tier === 'gold').length}
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
              {chartType === 'line' && (
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
              )}
              
              {chartType === 'area' && (
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
              )}
              
              {chartType === 'bar' && (
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
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
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
            isLoading={false}
            emptyMessage="No affiliate data available"
            compact={compact}
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
              {selectedAffiliate.user.profileImage && (
                <img
                  src={selectedAffiliate.user.profileImage}
                  alt={selectedAffiliate.user.name}
                  className="h-16 w-16 rounded-full"
                />
              )}
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  {selectedAffiliate.user.name}
                </h3>
                <p className="text-gray-600">{selectedAffiliate.user.email}</p>
                <div className="flex items-center space-x-2 mt-2">
                  <FaStar className={`
                    ${selectedAffiliate.stats.tier === 'gold' ? 'text-yellow-500' : 
                      selectedAffiliate.stats.tier === 'silver' ? 'text-gray-400' : 'text-orange-600'}
                  `} />
                  <span className="capitalize font-medium text-sm">
                    {selectedAffiliate.stats.tier || 'Bronze'} Tier
                  </span>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-green-600 text-sm font-medium">Total Commissions</div>
                <div className="text-green-900 text-xl font-semibold">
                  {formatCurrency(selectedAffiliate.stats.totalCommissions)}
                </div>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-blue-600 text-sm font-medium">Total Sales</div>
                <div className="text-blue-900 text-xl font-semibold">
                  {formatCurrency(selectedAffiliate.stats.totalSales)}
                </div>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-purple-600 text-sm font-medium">Conversion Rate</div>
                <div className="text-purple-900 text-xl font-semibold">
                  {formatPercentage(selectedAffiliate.stats.conversionRate || 0)}
                </div>
              </div>
              
              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="text-orange-600 text-sm font-medium">Total Clicks</div>
                <div className="text-orange-900 text-xl font-semibold">
                  {selectedAffiliate.stats.totalClicks?.toLocaleString() || 0}
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
                {selectedAffiliate.paymentInfo?.paypalEmail && (
                  <div>
                    <dt className="text-sm text-gray-500">PayPal Email</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {selectedAffiliate.paymentInfo.paypalEmail}
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