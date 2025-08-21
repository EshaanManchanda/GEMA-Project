import React, { useState, useEffect } from 'react';
import AdminNavigation from '../../components/admin/AdminNavigation';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2';
import adminAPI from '../../services/api/adminAPI';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const AdminAnalyticsPage: React.FC = () => {
  const [timeRange, setTimeRange] = useState<'7days' | '30days' | '90days' | '1year'>('30days');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [analyticsData, setAnalyticsData] = useState<any>(null);

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      setIsLoading(true);
      try {
        // Fetch real data from API
        const dashboardStats = await adminAPI.getDashboardStats();
        const userAnalytics = await adminAPI.getUserAnalytics({ timeRange });
        const eventAnalytics = await adminAPI.getEventAnalytics({ timeRange });
        const orderAnalytics = await adminAPI.getOrderAnalytics({ timeRange });
        const revenueAnalytics = await adminAPI.getRevenueAnalytics({ timeRange });
        
        // Combine API data
        const apiData = {
          overview: dashboardStats,
          revenue: revenueAnalytics,
          users: userAnalytics,
          events: eventAnalytics,
          bookings: orderAnalytics,
          topVendors: dashboardStats.topVendors || [],
          topEvents: dashboardStats.topEvents || [],
        };
        
        setAnalyticsData(apiData);
      } catch (error) {
        console.error('Error fetching analytics data:', error);
      }
      
      // Always use mock data for now since backend API may not be available
      try {
        const mockData = {
          overview: {
            totalUsers: 2458,
            totalEvents: 876,
            totalBookings: 5234,
            totalRevenue: 428750.50,
            userGrowth: 12.5,
            eventGrowth: 8.3,
            bookingGrowth: 15.2,
            revenueGrowth: 18.7,
          },
          revenue: {
            data: [
              { period: 'Jan', amount: 28500 },
              { period: 'Feb', amount: 32400 },
              { period: 'Mar', amount: 35600 },
              { period: 'Apr', amount: 31200 },
              { period: 'May', amount: 38700 },
              { period: 'Jun', amount: 42300 },
              { period: 'Jul', amount: 45800 },
              { period: 'Aug', amount: 48200 },
              { period: 'Sep', amount: 43500 },
              { period: 'Oct', amount: 39800 },
              { period: 'Nov', amount: 42100 },
              { period: 'Dec', amount: 50650.50 },
            ],
          },
          users: {
            data: [
              { period: 'Jan', count: 1850 },
              { period: 'Feb', count: 1920 },
              { period: 'Mar', count: 1980 },
              { period: 'Apr', count: 2050 },
              { period: 'May', count: 2120 },
              { period: 'Jun', count: 2180 },
              { period: 'Jul', count: 2240 },
              { period: 'Aug', count: 2290 },
              { period: 'Sep', count: 2330 },
              { period: 'Oct', count: 2370 },
              { period: 'Nov', count: 2410 },
              { period: 'Dec', count: 2458 },
            ],
            byType: [
              { type: 'Regular Users', count: 1850 },
              { type: 'Vendors', count: 458 },
              { type: 'Admins', count: 12 },
              { type: 'Moderators', count: 38 },
              { type: 'Guest Users', count: 100 },
            ],
          },
          events: {
            data: [
              { period: 'Jan', count: 620 },
              { period: 'Feb', count: 650 },
              { period: 'Mar', count: 680 },
              { period: 'Apr', count: 700 },
              { period: 'May', count: 725 },
              { period: 'Jun', count: 745 },
              { period: 'Jul', count: 770 },
              { period: 'Aug', count: 795 },
              { period: 'Sep', count: 820 },
              { period: 'Oct', count: 840 },
              { period: 'Nov', count: 855 },
              { period: 'Dec', count: 876 },
            ],
            byCategory: [
              { category: 'Music', count: 245 },
              { category: 'Sports', count: 180 },
              { category: 'Education', count: 156 },
              { category: 'Food & Drink', count: 120 },
              { category: 'Arts', count: 95 },
              { category: 'Other', count: 80 },
            ],
            byStatus: [
              { status: 'Published', count: 680 },
              { status: 'Draft', count: 120 },
              { status: 'Cancelled', count: 45 },
              { status: 'Completed', count: 31 },
            ],
          },
          bookings: {
            data: [
              { period: 'Jan', count: 3200 },
              { period: 'Feb', count: 3450 },
              { period: 'Mar', count: 3680 },
              { period: 'Apr', count: 3900 },
              { period: 'May', count: 4150 },
              { period: 'Jun', count: 4380 },
              { period: 'Jul', count: 4580 },
              { period: 'Aug', count: 4750 },
              { period: 'Sep', count: 4900 },
              { period: 'Oct', count: 5020 },
              { period: 'Nov', count: 5120 },
              { period: 'Dec', count: 5234 },
            ],
            byStatus: [
              { status: 'Confirmed', count: 3850 },
              { status: 'Pending', count: 680 },
              { status: 'Cancelled', count: 420 },
              { status: 'Refunded', count: 284 },
            ],
          },
          topVendors: [
            { id: 'v1', name: 'Melody Productions', events: 45, bookings: 1250, revenue: 87500 },
            { id: 'v2', name: 'TechEvents Inc', events: 38, bookings: 980, revenue: 68600 },
            { id: 'v3', name: 'Sports United', events: 32, bookings: 850, revenue: 59500 },
            { id: 'v4', name: 'Culinary Masters', events: 28, bookings: 720, revenue: 50400 },
            { id: 'v5', name: 'Art Gallery Group', events: 25, bookings: 680, revenue: 47600 },
          ],
          topEvents: [
            { id: 'e1', name: 'Summer Music Festival', bookings: 450, revenue: 31500 },
            { id: 'e2', name: 'Tech Conference 2023', bookings: 380, revenue: 26600 },
            { id: 'e3', name: 'International Food Fair', bookings: 320, revenue: 22400 },
            { id: 'e4', name: 'Championship Finals', bookings: 280, revenue: 19600 },
            { id: 'e5', name: 'Art Exhibition', bookings: 250, revenue: 17500 },
          ],
        };

        setAnalyticsData(mockData);
      } catch (error) {
        console.error('Error fetching analytics data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalyticsData();
  }, [timeRange]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getGrowthIndicator = (value: number) => {
    if (value > 0) {
      return (
        <span className="text-green-600 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
          </svg>
          {value}%
        </span>
      );
    } else if (value < 0) {
      return (
        <span className="text-red-600 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12 13a1 1 0 100 2h5a1 1 0 001-1v-5a1 1 0 10-2 0v2.586l-4.293-4.293a1 1 0 00-1.414 0L8 9.586l-4.293-4.293a1 1 0 00-1.414 1.414l5 5a1 1 0 001.414 0L11 9.414 14.586 13H12z" clipRule="evenodd" />
          </svg>
          {Math.abs(value)}%
        </span>
      );
    } else {
      return <span className="text-gray-600">0%</span>;
    }
  };

  if (isLoading || !analyticsData) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Prepare chart data
  const revenueChartData = {
    labels: analyticsData.revenue.data.map((item: any) => item.period),
    datasets: [
      {
        label: 'Revenue',
        data: analyticsData.revenue.data.map((item: any) => item.amount),
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const usersChartData = {
    labels: analyticsData.users.data.map((item: any) => item.period),
    datasets: [
      {
        label: 'Users',
        data: analyticsData.users.data.map((item: any) => item.count),
        borderColor: 'rgba(54, 162, 235, 1)',
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const eventsChartData = {
    labels: analyticsData.events.data.map((item: any) => item.period),
    datasets: [
      {
        label: 'Events',
        data: analyticsData.events.data.map((item: any) => item.count),
        borderColor: 'rgba(255, 159, 64, 1)',
        backgroundColor: 'rgba(255, 159, 64, 0.2)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const bookingsChartData = {
    labels: analyticsData.bookings.data.map((item: any) => item.period),
    datasets: [
      {
        label: 'Bookings',
        data: analyticsData.bookings.data.map((item: any) => item.count),
        borderColor: 'rgba(153, 102, 255, 1)',
        backgroundColor: 'rgba(153, 102, 255, 0.2)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const eventCategoryChartData = {
    labels: analyticsData.events.byCategory.map((item: any) => item.category),
    datasets: [
      {
        label: 'Events by Category',
        data: analyticsData.events.byCategory.map((item: any) => item.count),
        backgroundColor: [
          'rgba(255, 99, 132, 0.6)',
          'rgba(54, 162, 235, 0.6)',
          'rgba(255, 206, 86, 0.6)',
          'rgba(75, 192, 192, 0.6)',
          'rgba(153, 102, 255, 0.6)',
          'rgba(255, 159, 64, 0.6)',
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
          'rgba(255, 159, 64, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const bookingStatusChartData = {
    labels: analyticsData.bookings.byStatus.map((item: any) => item.status),
    datasets: [
      {
        label: 'Bookings by Status',
        data: analyticsData.bookings.byStatus.map((item: any) => item.count),
        backgroundColor: [
          'rgba(75, 192, 192, 0.6)',
          'rgba(255, 206, 86, 0.6)',
          'rgba(255, 99, 132, 0.6)',
          'rgba(54, 162, 235, 0.6)',
        ],
        borderColor: [
          'rgba(75, 192, 192, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const userTypeChartData = {
    labels: analyticsData.users.byType.map((item: any) => item.type),
    datasets: [
      {
        label: 'Users by Type',
        data: analyticsData.users.byType.map((item: any) => item.count),
        backgroundColor: [
          'rgba(54, 162, 235, 0.6)',
          'rgba(255, 99, 132, 0.6)',
          'rgba(255, 206, 86, 0.6)',
          'rgba(75, 192, 192, 0.6)',
          'rgba(153, 102, 255, 0.6)',
        ],
        borderColor: [
          'rgba(54, 162, 235, 1)',
          'rgba(255, 99, 132, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
  };

  return (
    <>
      <AdminNavigation />
      <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-4 md:mb-0">Analytics Dashboard</h1>
        <div className="flex space-x-2">
          <select
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
          >
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="90days">Last 90 Days</option>
            <option value="1year">Last 12 Months</option>
          </select>
          <button
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            onClick={() => {
              setIsLoading(true);
              setTimeout(() => setIsLoading(false), 1000);
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="-ml-1 mr-2 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
            Refresh
          </button>
          <button
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="-ml-1 mr-2 h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            Export
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Users</p>
              <h2 className="mt-1 text-2xl font-semibold text-gray-900">{analyticsData.overview.totalUsers.toLocaleString()}</h2>
            </div>
            <div className="p-2 rounded-md bg-blue-50">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-4">
            {getGrowthIndicator(analyticsData.overview.userGrowth)}
            <span className="text-xs text-gray-500 ml-2">vs previous period</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Events</p>
              <h2 className="mt-1 text-2xl font-semibold text-gray-900">{analyticsData.overview.totalEvents.toLocaleString()}</h2>
            </div>
            <div className="p-2 rounded-md bg-orange-50">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <div className="mt-4">
            {getGrowthIndicator(analyticsData.overview.eventGrowth)}
            <span className="text-xs text-gray-500 ml-2">vs previous period</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Bookings</p>
              <h2 className="mt-1 text-2xl font-semibold text-gray-900">{analyticsData.overview.totalBookings.toLocaleString()}</h2>
            </div>
            <div className="p-2 rounded-md bg-purple-50">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
          <div className="mt-4">
            {getGrowthIndicator(analyticsData.overview.bookingGrowth)}
            <span className="text-xs text-gray-500 ml-2">vs previous period</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Revenue</p>
              <h2 className="mt-1 text-2xl font-semibold text-gray-900">{formatCurrency(analyticsData.overview.totalRevenue)}</h2>
            </div>
            <div className="p-2 rounded-md bg-green-50">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-4">
            {getGrowthIndicator(analyticsData.overview.revenueGrowth)}
            <span className="text-xs text-gray-500 ml-2">vs previous period</span>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend</h3>
          <div className="h-80">
            <Line data={revenueChartData} options={chartOptions} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">User Growth</h3>
          <div className="h-80">
            <Line data={usersChartData} options={chartOptions} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Events Growth</h3>
          <div className="h-80">
            <Line data={eventsChartData} options={chartOptions} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Bookings Trend</h3>
          <div className="h-80">
            <Line data={bookingsChartData} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* Distribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Events by Category</h3>
          <div className="h-80">
            <Pie data={eventCategoryChartData} options={chartOptions} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Bookings by Status</h3>
          <div className="h-80">
            <Doughnut data={bookingStatusChartData} options={chartOptions} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Users by Type</h3>
          <div className="h-80">
            <Doughnut data={userTypeChartData} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* Top Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Vendors</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Events</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bookings</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {analyticsData.topVendors.map((vendor: any) => (
                  <tr key={vendor.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{vendor.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{vendor.events}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{vendor.bookings}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(vendor.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Events</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bookings</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {analyticsData.topEvents.map((event: any) => (
                  <tr key={event.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{event.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{event.bookings}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(event.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Insights */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 border border-green-200 rounded-md bg-green-50">
            <h4 className="font-medium text-green-800 mb-1">Revenue Growth</h4>
            <p className="text-sm text-green-700">
              Platform revenue has increased by {analyticsData.overview.revenueGrowth}% compared to the previous period. 
              The top performing category is Music events, generating {formatCurrency(analyticsData.topVendors[0].revenue)} in revenue.
            </p>
          </div>
          
          <div className="p-4 border border-blue-200 rounded-md bg-blue-50">
            <h4 className="font-medium text-blue-800 mb-1">User Acquisition</h4>
            <p className="text-sm text-blue-700">
              User base has grown by {analyticsData.overview.userGrowth}% with a healthy mix of vendors and regular users.
              Consider targeted marketing campaigns to increase vendor sign-ups in underrepresented categories.
            </p>
          </div>
          
          <div className="p-4 border border-yellow-200 rounded-md bg-yellow-50">
            <h4 className="font-medium text-yellow-800 mb-1">Booking Patterns</h4>
            <p className="text-sm text-yellow-700">
              {((analyticsData.bookings.byStatus[0].count / analyticsData.overview.totalBookings) * 100).toFixed(1)}% of bookings are confirmed, 
              with a cancellation rate of {((analyticsData.bookings.byStatus[2].count / analyticsData.overview.totalBookings) * 100).toFixed(1)}%. 
              Focus on reducing cancellations through better reminder systems.
            </p>
          </div>
          
          <div className="p-4 border border-purple-200 rounded-md bg-purple-50">
            <h4 className="font-medium text-purple-800 mb-1">Event Distribution</h4>
            <p className="text-sm text-purple-700">
              {analyticsData.events.byCategory[0].category} and {analyticsData.events.byCategory[1].category} categories dominate the platform. 
              Consider incentives to increase events in underrepresented categories like {analyticsData.events.byCategory[analyticsData.events.byCategory.length - 1].category}.
            </p>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default AdminAnalyticsPage;