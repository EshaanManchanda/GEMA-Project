import React, { useState, useMemo } from 'react';
import {
  FaDollarSign,
  FaChartLine,
  FaArrowUp,
  FaDownload,
  FaFileExport,
  FaCreditCard,
  FaReceipt,
  FaUsers,
  FaCalendarCheck,
  FaArrowDown,
  FaEquals
} from 'react-icons/fa';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { format, startOfMonth, endOfMonth, subMonths, subDays } from 'date-fns';
import LoadingSpinner from '../common/LoadingSpinner';
import Modal from '../interactive/Modal';

interface RevenueReportsProps {
  className?: string;
  compact?: boolean;
}

interface DateRange {
  startDate: string;
  endDate: string;
  label: string;
}

interface RevenueData {
  date: string;
  totalRevenue: number;
  ticketSales: number;
  vendorFees: number;
  subscriptions: number;
  refunds: number;
  netRevenue: number;
  transactionCount: number;
}

interface RevenueMetrics {
  totalRevenue: number;
  previousRevenue: number;
  growthRate: number;
  totalTransactions: number;
  averageOrderValue: number;
  refundRate: number;
  topRevenueSource: string;
  conversionRate: number;
}

const RevenueReports: React.FC<RevenueReportsProps> = ({
  className = ''
}) => {
  const [selectedDateRange, setSelectedDateRange] = useState<string>('month');
  const [chartType, setChartType] = useState<'line' | 'area' | 'bar'>('area');
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'pdf' | 'excel'>('csv');
  const [isExporting, setIsExporting] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);

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

  // Mock revenue data - In real implementation, fetch from API
  const revenueData: RevenueData[] = useMemo(() => {
    const data: RevenueData[] = [];
    const range = dateRanges[selectedDateRange];
    const startDate = new Date(range.startDate);
    const endDate = new Date(range.endDate);
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    for (let i = 0; i <= daysDiff; i += Math.max(1, Math.floor(daysDiff / 20))) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      
      const ticketSales = Math.floor(Math.random() * 8000) + 2000;
      const vendorFees = Math.floor(Math.random() * 2000) + 500;
      const subscriptions = Math.floor(Math.random() * 1000) + 200;
      const refunds = Math.floor(Math.random() * 500) + 100;
      
      data.push({
        date: format(currentDate, 'MMM dd'),
        totalRevenue: ticketSales + vendorFees + subscriptions,
        ticketSales,
        vendorFees,
        subscriptions,
        refunds,
        netRevenue: ticketSales + vendorFees + subscriptions - refunds,
        transactionCount: Math.floor(Math.random() * 150) + 50
      });
    }
    
    return data;
  }, [selectedDateRange, dateRanges]);

  // Calculate metrics
  const metrics: RevenueMetrics = useMemo(() => {
    const totalRevenue = revenueData.reduce((sum, item) => sum + item.totalRevenue, 0);
    const totalRefunds = revenueData.reduce((sum, item) => sum + item.refunds, 0);
    const totalTransactions = revenueData.reduce((sum, item) => sum + item.transactionCount, 0);
    
    // Mock previous period data
    const previousRevenue = totalRevenue * 0.85;
    const growthRate = ((totalRevenue - previousRevenue) / previousRevenue) * 100;
    
    return {
      totalRevenue,
      previousRevenue,
      growthRate,
      totalTransactions,
      averageOrderValue: totalRevenue / Math.max(totalTransactions, 1),
      refundRate: (totalRefunds / totalRevenue) * 100,
      topRevenueSource: 'Ticket Sales',
      conversionRate: 3.24
    };
  }, [revenueData]);

  // Revenue breakdown for pie chart
  const revenueBreakdown = useMemo(() => {
    const totalTicketSales = revenueData.reduce((sum, item) => sum + item.ticketSales, 0);
    const totalVendorFees = revenueData.reduce((sum, item) => sum + item.vendorFees, 0);
    const totalSubscriptions = revenueData.reduce((sum, item) => sum + item.subscriptions, 0);
    
    return [
      { name: 'Ticket Sales', value: totalTicketSales, color: '#3B82F6', percentage: (totalTicketSales / metrics.totalRevenue) * 100 },
      { name: 'Vendor Fees', value: totalVendorFees, color: '#10B981', percentage: (totalVendorFees / metrics.totalRevenue) * 100 },
      { name: 'Subscriptions', value: totalSubscriptions, color: '#8B5CF6', percentage: (totalSubscriptions / metrics.totalRevenue) * 100 }
    ];
  }, [revenueData, metrics.totalRevenue]);

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
      const dataStr = JSON.stringify(revenueData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `revenue_report_${format(new Date(), 'yyyy-MM-dd')}.${exportFormat}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setIsExporting(false);
      setShowExportModal(false);
    }, 2000);
  };

  const handleMetricClick = (metricName: string) => {
    setSelectedMetric(metricName);
    setShowDetailModal(true);
  };

  // const COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B'];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div className="flex items-center space-x-3">
          <FaDollarSign className="text-gray-600" size={24} />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Revenue Reports</h1>
            <p className="text-sm text-gray-600">
              Comprehensive financial analytics and revenue insights
            </p>
          </div>
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
          
          <div className="flex border border-gray-300 rounded-md">
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
          
          <button
            onClick={() => setShowExportModal(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
          >
            <FaFileExport size={14} className="mr-2" />
            Export Report
          </button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div 
          className="bg-white p-6 rounded-lg shadow-sm border cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => handleMetricClick('Total Revenue')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(metrics.totalRevenue)}
              </p>
              <div className={`flex items-center space-x-1 mt-2 text-sm ${getTrendColor(metrics.growthRate)}`}>
                {getTrendIcon(metrics.growthRate)}
                <span>{Math.abs(metrics.growthRate).toFixed(1)}%</span>
                <span className="text-gray-500">vs last period</span>
              </div>
            </div>
            <FaDollarSign className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div 
          className="bg-white p-6 rounded-lg shadow-sm border cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => handleMetricClick('Total Transactions')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Transactions</p>
              <p className="text-2xl font-semibold text-gray-900">
                {metrics.totalTransactions.toLocaleString()}
              </p>
              <div className="flex items-center space-x-1 mt-2 text-sm text-gray-600">
                <FaCalendarCheck size={12} />
                <span>{dateRanges[selectedDateRange].label}</span>
              </div>
            </div>
            <FaCreditCard className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div 
          className="bg-white p-6 rounded-lg shadow-sm border cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => handleMetricClick('Average Order Value')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg. Order Value</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(metrics.averageOrderValue)}
              </p>
              <div className="flex items-center space-x-1 mt-2 text-sm text-purple-600">
                <FaArrowUp size={12} />
                <span>Above target</span>
              </div>
            </div>
            <FaReceipt className="h-8 w-8 text-purple-500" />
          </div>
        </div>

        <div 
          className="bg-white p-6 rounded-lg shadow-sm border cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => handleMetricClick('Conversion Rate')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
              <p className="text-2xl font-semibold text-gray-900">
                {metrics.conversionRate.toFixed(2)}%
              </p>
              <div className="flex items-center space-x-1 mt-2 text-sm text-orange-600">
                <FaUsers size={12} />
                <span>Industry standard</span>
              </div>
            </div>
            <FaChartLine className="h-8 w-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Main Revenue Chart */}
        <div className="bg-white p-6 rounded-lg shadow-sm border lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900">Revenue Trend</h3>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Total Revenue</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Net Revenue</span>
              </div>
            </div>
          </div>
          
          <ResponsiveContainer width="100%" height={400}>
            {chartType === 'area' && (
              <AreaChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="date" 
                  className="text-xs"
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  className="text-xs"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  formatter={(value, name) => [formatCurrency(Number(value)), name]}
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                
                <Area 
                  type="monotone" 
                  dataKey="totalRevenue" 
                  stackId="1"
                  stroke="#3B82F6" 
                  fill="#3B82F6"
                  fillOpacity={0.3}
                  name="Total Revenue"
                />
                <Area 
                  type="monotone" 
                  dataKey="netRevenue" 
                  stackId="2"
                  stroke="#10B981" 
                  fill="#10B981"
                  fillOpacity={0.3}
                  name="Net Revenue"
                />
              </AreaChart>
            )}
            
            {chartType === 'line' && (
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="date" 
                  className="text-xs"
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  className="text-xs"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  formatter={(value, name) => [formatCurrency(Number(value)), name]}
                />
                <Legend />
                
                <Line 
                  type="monotone" 
                  dataKey="totalRevenue" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  name="Total Revenue"
                />
                <Line 
                  type="monotone" 
                  dataKey="netRevenue" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  name="Net Revenue"
                />
              </LineChart>
            )}
            
            {chartType === 'bar' && (
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="date" 
                  className="text-xs"
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  className="text-xs"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  formatter={(value, name) => [formatCurrency(Number(value)), name]}
                />
                <Legend />
                
                <Bar 
                  dataKey="totalRevenue" 
                  fill="#3B82F6"
                  name="Total Revenue"
                />
                <Bar 
                  dataKey="netRevenue" 
                  fill="#10B981"
                  name="Net Revenue"
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Revenue Breakdown Pie Chart */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-medium text-gray-900 mb-6">Revenue Sources</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={revenueBreakdown}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="value"
                label={({ name, percentage }) => `${name} ${percentage.toFixed(1)}%`}
                labelLine={false}
              >
                {revenueBreakdown.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
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
                <div className="text-right">
                  <div className="font-medium">{formatCurrency(item.value)}</div>
                  <div className="text-gray-500">{item.percentage.toFixed(1)}%</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue Breakdown by Category */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-medium text-gray-900 mb-6">Revenue Breakdown</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={revenueData.slice(-7)} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis 
                dataKey="date" 
                type="category" 
                tick={{ fontSize: 12 }}
                width={60}
              />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Legend />
              
              <Bar dataKey="ticketSales" stackId="a" fill="#3B82F6" name="Ticket Sales" />
              <Bar dataKey="vendorFees" stackId="a" fill="#10B981" name="Vendor Fees" />
              <Bar dataKey="subscriptions" stackId="a" fill="#8B5CF6" name="Subscriptions" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Summary Table */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Revenue Summary</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ticket Sales
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vendor Fees
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Refunds
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Net Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Transactions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {revenueData.slice(-10).map((item, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.date}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(item.totalRevenue)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(item.ticketSales)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(item.vendorFees)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                    -{formatCurrency(item.refunds)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                    {formatCurrency(item.netRevenue)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.transactionCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Export Modal */}
      <Modal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Export Revenue Report"
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
                  Export Report
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Metric Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title={`${selectedMetric} Details`}
        size="lg"
      >
        <div className="p-6">
          <div className="text-center text-gray-600 mb-6">
            Detailed analysis for {selectedMetric} will be implemented with advanced analytics and drill-down capabilities.
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Current Period</h4>
              <p className="text-2xl font-semibold text-blue-600">
                {selectedMetric === 'Total Revenue' ? formatCurrency(metrics.totalRevenue) :
                 selectedMetric === 'Total Transactions' ? metrics.totalTransactions.toLocaleString() :
                 selectedMetric === 'Average Order Value' ? formatCurrency(metrics.averageOrderValue) :
                 `${metrics.conversionRate.toFixed(2)}%`}
              </p>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Previous Period</h4>
              <p className="text-2xl font-semibold text-gray-600">
                {selectedMetric === 'Total Revenue' ? formatCurrency(metrics.previousRevenue) :
                 selectedMetric === 'Total Transactions' ? Math.floor(metrics.totalTransactions * 0.85).toLocaleString() :
                 selectedMetric === 'Average Order Value' ? formatCurrency(metrics.averageOrderValue * 0.92) :
                 '3.12%'}
              </p>
            </div>
          </div>
          
          <div className="flex justify-end mt-6">
            <button
              onClick={() => setShowDetailModal(false)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default RevenueReports;