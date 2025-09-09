import React, { useState, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { 
  FaChartBar,
  FaUsers,
  FaCalendarCheck,
  FaDollarSign,
  FaTrophy,
  FaArrowUp,
  FaArrowDown,
  FaEquals,
  FaDownload,
  FaFilter,
  FaCalendarAlt,
  FaEye,
  FaBell
} from 'react-icons/fa';
import { format, startOfMonth, endOfMonth, subMonths, subDays } from 'date-fns';
import { 
  ComposedChart,
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
  Cell,
  ReferenceLine
} from 'recharts';
import { RootState, AppDispatch } from '../../store';
import { 
  fetchPaymentAnalytics,
  selectPaymentAnalytics
} from '../../store/slices/paymentsSlice';
import { 
  fetchMyAffiliate,
  selectAffiliates
} from '../../store/slices/affiliatesSlice';
import { 
  fetchNotifications,
  selectNotifications
} from '../../store/slices/notificationsSlice';
import LoadingSpinner from '../common/LoadingSpinner';
import Modal from '../interactive/Modal';

interface AdminAnalyticsProps {
  className?: string;
  compactMode?: boolean;
}

interface DateRange {
  startDate: string;
  endDate: string;
  label: string;
}

interface AnalyticsData {
  date: string;
  revenue: number;
  bookings: number;
  users: number;
  commissions: number;
  notifications: number;
}

const AdminAnalytics: React.FC<AdminAnalyticsProps> = ({
  className = '',
  compactMode = false
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const paymentStats = useSelector(selectPaymentAnalytics);
  const affiliateStats = useSelector(selectAffiliates);
  const notifications = useSelector(selectNotifications);

  const [selectedDateRange, setSelectedDateRange] = useState<string>('month');
  const [activeMetric, setActiveMetric] = useState<'revenue' | 'bookings' | 'users' | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'pdf' | 'excel'>('csv');
  const [showExportModal, setShowExportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const dateRanges: Record<string, DateRange> = {
    week: {
      startDate: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
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

  // Fetch data when date range changes
  useEffect(() => {
    const range = dateRanges[selectedDateRange];
    const params = {
      startDate: range.startDate,
      endDate: range.endDate
    };

    dispatch(fetchPaymentAnalytics(params));
    dispatch(fetchMyAffiliate());
    dispatch(fetchNotifications());
  }, [dispatch, selectedDateRange]);

  // Generate mock analytics data for demonstration
  const analyticsData: AnalyticsData[] = useMemo(() => {
    const data: AnalyticsData[] = [];
    const range = dateRanges[selectedDateRange];
    const startDate = new Date(range.startDate);
    const endDate = new Date(range.endDate);
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    for (let i = 0; i <= daysDiff; i += Math.max(1, Math.floor(daysDiff / 20))) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      
      data.push({
        date: format(currentDate, 'MMM dd'),
        revenue: Math.floor(Math.random() * 5000) + 1000,
        bookings: Math.floor(Math.random() * 50) + 10,
        users: Math.floor(Math.random() * 20) + 5,
        commissions: Math.floor(Math.random() * 500) + 100,
        notifications: Math.floor(Math.random() * 100) + 20
      });
    }
    
    return data;
  }, [selectedDateRange, dateRanges]);

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    const totalRevenue = paymentStats?.totalAmount || 45320;
    const totalBookings = paymentStats?.successfulPayments || 234;
    const totalUsers = affiliateStats?.totalAffiliates || 1456;
    const totalCommissions = affiliateStats?.totalCommissions || 3420;

    // Mock previous period data for comparison
    const previousRevenue = totalRevenue * 0.87;
    const previousBookings = totalBookings * 0.92;
    const previousUsers = totalUsers * 0.95;
    const previousCommissions = totalCommissions * 0.83;

    return {
      revenue: {
        current: totalRevenue,
        previous: previousRevenue,
        change: ((totalRevenue - previousRevenue) / previousRevenue) * 100
      },
      bookings: {
        current: totalBookings,
        previous: previousBookings,
        change: ((totalBookings - previousBookings) / previousBookings) * 100
      },
      users: {
        current: totalUsers,
        previous: previousUsers,
        change: ((totalUsers - previousUsers) / previousUsers) * 100
      },
      commissions: {
        current: totalCommissions,
        previous: previousCommissions,
        change: ((totalCommissions - previousCommissions) / previousCommissions) * 100
      }
    };
  }, [paymentStats, affiliateStats]);

  // Revenue breakdown data
  const revenueBreakdown = [
    { name: 'Event Tickets', value: 35, amount: 15890, color: '#3B82F6' },
    { name: 'Vendor Fees', value: 25, amount: 11330, color: '#10B981' },
    { name: 'Premium Features', value: 20, amount: 9064, color: '#8B5CF6' },
    { name: 'Affiliate Commissions', value: 15, amount: 6798, color: '#F59E0B' },
    { name: 'Other', value: 5, amount: 2268, color: '#6B7280' }
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getTrendIcon = (change: number) => {
    if (change > 0) return <FaArrowUp className="text-green-500" size={14} />;
    if (change < 0) return <FaArrowDown className="text-red-500" size={14} />;
    return <FaEquals className="text-gray-500" size={14} />;
  };

  const getTrendColor = (change: number) => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const handleExport = async () => {
    setIsExporting(true);
    
    // Simulate export process
    setTimeout(() => {
      const dataStr = JSON.stringify(analyticsData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `analytics_${format(new Date(), 'yyyy-MM-dd')}.${exportFormat}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setIsExporting(false);
      setShowExportModal(false);
    }, 2000);
  };

  const COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#6B7280'];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div className="flex items-center space-x-3">
          <FaChartBar className="text-gray-600" size={24} />
          <h1 className="text-2xl font-bold text-gray-900">
            Admin Analytics Dashboard
          </h1>
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
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-md transition-colors ${
              showFilters ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <FaFilter size={16} />
          </button>
          
          <button
            onClick={() => setShowExportModal(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
          >
            <FaDownload size={14} className="mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700">Focus Metric:</label>
            <div className="flex space-x-2">
              {['all', 'revenue', 'bookings', 'users'].map((metric) => (
                <button
                  key={metric}
                  onClick={() => setActiveMetric(metric as typeof activeMetric)}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    activeMetric === metric
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {metric.charAt(0).toUpperCase() + metric.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(summaryMetrics.revenue.current)}
              </p>
              <div className={`flex items-center space-x-1 mt-2 text-sm ${getTrendColor(summaryMetrics.revenue.change)}`}>
                {getTrendIcon(summaryMetrics.revenue.change)}
                <span>{Math.abs(summaryMetrics.revenue.change).toFixed(1)}%</span>
                <span className="text-gray-500">vs last period</span>
              </div>
            </div>
            <FaDollarSign className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Bookings</p>
              <p className="text-2xl font-semibold text-gray-900">
                {summaryMetrics.bookings.current.toLocaleString()}
              </p>
              <div className={`flex items-center space-x-1 mt-2 text-sm ${getTrendColor(summaryMetrics.bookings.change)}`}>
                {getTrendIcon(summaryMetrics.bookings.change)}
                <span>{Math.abs(summaryMetrics.bookings.change).toFixed(1)}%</span>
                <span className="text-gray-500">vs last period</span>
              </div>
            </div>
            <FaCalendarCheck className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Users</p>
              <p className="text-2xl font-semibold text-gray-900">
                {summaryMetrics.users.current.toLocaleString()}
              </p>
              <div className={`flex items-center space-x-1 mt-2 text-sm ${getTrendColor(summaryMetrics.users.change)}`}>
                {getTrendIcon(summaryMetrics.users.change)}
                <span>{Math.abs(summaryMetrics.users.change).toFixed(1)}%</span>
                <span className="text-gray-500">vs last period</span>
              </div>
            </div>
            <FaUsers className="h-8 w-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Commissions Paid</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(summaryMetrics.commissions.current)}
              </p>
              <div className={`flex items-center space-x-1 mt-2 text-sm ${getTrendColor(summaryMetrics.commissions.change)}`}>
                {getTrendIcon(summaryMetrics.commissions.change)}
                <span>{Math.abs(summaryMetrics.commissions.change).toFixed(1)}%</span>
                <span className="text-gray-500">vs last period</span>
              </div>
            </div>
            <FaTrophy className="h-8 w-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Main Analytics Chart */}
        <div className="bg-white p-6 rounded-lg shadow-sm border lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900">
              Performance Overview
            </h3>
            <div className="flex space-x-2">
              {['revenue', 'bookings', 'users', 'commissions'].map((metric) => (
                <button
                  key={metric}
                  onClick={() => setActiveMetric(metric as typeof activeMetric)}
                  className={`px-3 py-1 text-xs rounded-md transition-colors ${
                    activeMetric === metric || activeMetric === 'all'
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {metric.charAt(0).toUpperCase() + metric.slice(1)}
                </button>
              ))}
            </div>
          </div>
          
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={analyticsData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="date" 
                className="text-xs"
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                yAxisId="left"
                className="text-xs"
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                yAxisId="right" 
                orientation="right"
                className="text-xs"
                tick={{ fontSize: 12 }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              
              {(activeMetric === 'all' || activeMetric === 'revenue') && (
                <Bar 
                  yAxisId="left"
                  dataKey="revenue" 
                  fill="#10B981"
                  fillOpacity={0.8}
                  name="Revenue ($)"
                />
              )}
              
              {(activeMetric === 'all' || activeMetric === 'bookings') && (
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="bookings" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  name="Bookings"
                />
              )}
              
              {(activeMetric === 'all' || activeMetric === 'users') && (
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="users" 
                  stroke="#8B5CF6" 
                  strokeWidth={2}
                  name="New Users"
                />
              )}
              
              {(activeMetric === 'all' || activeMetric === 'commissions') && (
                <Area 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="commissions" 
                  stroke="#F59E0B" 
                  fill="#F59E0B"
                  fillOpacity={0.2}
                  name="Commissions ($)"
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue Breakdown */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-medium text-gray-900 mb-6">
            Revenue Breakdown
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={revenueBreakdown}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {revenueBreakdown.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value, name, props) => [
                formatCurrency(props.payload.amount),
                props.payload.name
              ]} />
            </PieChart>
          </ResponsiveContainer>
          
          <div className="mt-4 space-y-2">
            {revenueBreakdown.map((item, index) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span>{item.name}</span>
                </div>
                <span className="font-medium">{formatCurrency(item.amount)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Activity Timeline */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-medium text-gray-900 mb-6">
            Notification Activity
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={analyticsData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="date" 
                className="text-xs"
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                className="text-xs"
                tick={{ fontSize: 12 }}
              />
              <Tooltip />
              <Area 
                type="monotone" 
                dataKey="notifications" 
                stroke="#6366F1" 
                fill="#6366F1"
                fillOpacity={0.3}
                name="Notifications Sent"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 rounded-lg text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Avg Order Value</p>
              <p className="text-2xl font-bold">$193.45</p>
              <p className="text-blue-200 text-sm mt-1">+8.2% this month</p>
            </div>
            <FaDollarSign className="h-8 w-8 text-blue-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 rounded-lg text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Conversion Rate</p>
              <p className="text-2xl font-bold">3.24%</p>
              <p className="text-green-200 text-sm mt-1">+0.3% this month</p>
            </div>
            <FaTrophy className="h-8 w-8 text-green-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-6 rounded-lg text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Customer Satisfaction</p>
              <p className="text-2xl font-bold">4.8/5</p>
              <p className="text-purple-200 text-sm mt-1">Based on 1,234 reviews</p>
            </div>
            <FaUsers className="h-8 w-8 text-purple-200" />
          </div>
        </div>
      </div>

      {/* Export Modal */}
      <Modal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Export Analytics Data"
        size="sm"
      >
        <div className="p-6">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Export Format
            </label>
            <div className="space-y-2">
              {[
                { value: 'csv', label: 'CSV (Comma Separated Values)' },
                { value: 'excel', label: 'Excel Spreadsheet' },
                { value: 'pdf', label: 'PDF Report' }
              ].map((format) => (
                <label key={format.value} className="flex items-center">
                  <input
                    type="radio"
                    name="exportFormat"
                    value={format.value}
                    checked={exportFormat === format.value}
                    onChange={(e) => setExportFormat(e.target.value as typeof exportFormat)}
                    className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  {format.label}
                </label>
              ))}
            </div>
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setShowExportModal(false)}
              disabled={isExporting}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isExporting ? (
                <>
                  <LoadingSpinner size="small" className="mr-2" />
                  Exporting...
                </>
              ) : (
                <>
                  <FaDownload size={14} className="mr-2" />
                  Export Data
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminAnalytics;