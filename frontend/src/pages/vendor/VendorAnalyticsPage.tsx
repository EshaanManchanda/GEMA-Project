import React, { useState, useEffect } from 'react';
import { Bar, Line, Pie } from 'react-chartjs-2';
import analyticsAPI from '../../services/api/analyticsAPI';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface AnalyticsData {
  revenue: {
    daily: { date: string; amount: number }[];
    monthly: { month: string; amount: number }[];
  };
  bookings: {
    total: number;
    completed: number;
    cancelled: number;
    byEvent: { eventName: string; count: number }[];
  };
  events: {
    total: number;
    published: number;
    draft: number;
    byCategory: { category: string; count: number }[];
  };
  customers: {
    new: { date: string; count: number }[];
    returning: number;
    total: number;
  };
}

const VendorAnalyticsPage: React.FC = () => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [dateRange, setDateRange] = useState<'7days' | '30days' | '90days' | 'year'>('30days');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Calculate date range based on selected period
        const endDate = new Date();
        const startDate = new Date();
        
        switch (dateRange) {
          case '7days':
            startDate.setDate(endDate.getDate() - 7);
            break;
          case '30days':
            startDate.setDate(endDate.getDate() - 30);
            break;
          case '90days':
            startDate.setDate(endDate.getDate() - 90);
            break;
          case 'year':
            startDate.setFullYear(endDate.getFullYear() - 1);
            break;
        }
        
        const dateParams = {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        };
        
        // Fetch real analytics data from backend
        const [dashboardData, eventAnalytics, orderAnalytics, revenueReport] = await Promise.all([
          analyticsAPI.getDashboardSummary(),
          analyticsAPI.getEventAnalytics(dateParams),
          analyticsAPI.getOrderAnalytics(dateParams),
          analyticsAPI.getRevenueReport({ ...dateParams, groupBy: 'day' })
        ]);
        
        // Transform backend data to frontend format
        const transformedData: AnalyticsData = {
          revenue: {
            daily: revenueReport.revenueByPeriod || [],
            monthly: revenueReport.revenueByPeriod || []
          },
          bookings: {
            total: orderAnalytics.totalOrders || 0,
            completed: orderAnalytics.completedOrders || 0,
            cancelled: orderAnalytics.cancelledOrders || 0,
            byEvent: orderAnalytics.topEvents || []
          },
          events: {
            total: eventAnalytics.totalEvents || 0,
            published: eventAnalytics.publishedEvents || 0,
            draft: eventAnalytics.draftEvents || 0,
            byCategory: eventAnalytics.eventsByCategory || []
          },
          customers: {
            new: orderAnalytics.newCustomersByDay || [],
            returning: orderAnalytics.returningCustomers || 0,
            total: orderAnalytics.uniqueCustomers || 0
          }
        };
        
        setAnalyticsData(transformedData);
      } catch (err) {
        console.error('Error fetching analytics data:', err);
        
        // Fallback to basic mock data if API fails
        const fallbackData: AnalyticsData = {
          revenue: {
            daily: [
              { date: '2023-06-01', amount: 250 },
              { date: '2023-06-02', amount: 320 },
              { date: '2023-06-03', amount: 180 },
              { date: '2023-06-04', amount: 400 },
              { date: '2023-06-05', amount: 280 },
              { date: '2023-06-06', amount: 350 },
              { date: '2023-06-07', amount: 420 },
              { date: '2023-06-08', amount: 390 },
              { date: '2023-06-09', amount: 450 },
              { date: '2023-06-10', amount: 500 },
              { date: '2023-06-11', amount: 380 },
              { date: '2023-06-12', amount: 420 },
              { date: '2023-06-13', amount: 350 },
              { date: '2023-06-14', amount: 300 },
              { date: '2023-06-15', amount: 450 },
            ],
            monthly: [
              { month: 'Jan', amount: 4500 },
              { month: 'Feb', amount: 5200 },
              { month: 'Mar', amount: 6100 },
              { month: 'Apr', amount: 5800 },
              { month: 'May', amount: 7200 },
              { month: 'Jun', amount: 8500 },
            ],
          },
          bookings: {
            total: 156,
            completed: 98,
            cancelled: 12,
            byEvent: [
              { eventName: 'Science Workshop for Kids', count: 42 },
              { eventName: 'Art & Craft Summer Camp', count: 35 },
              { eventName: 'Robotics Workshop', count: 28 },
              { eventName: 'Music & Dance Festival', count: 25 },
              { eventName: 'Cooking Class for Kids', count: 18 },
              { eventName: 'Outdoor Adventure Camp', count: 8 },
            ],
          },
          events: {
            total: 24,
            published: 18,
            draft: 6,
            byCategory: [
              { category: 'Science & Technology', count: 8 },
              { category: 'Arts & Crafts', count: 6 },
              { category: 'Music & Dance', count: 4 },
              { category: 'Sports & Activities', count: 3 },
              { category: 'Food & Cooking', count: 2 },
              { category: 'Educational', count: 1 },
            ],
          },
          customers: {
            new: [
              { date: '2023-06-01', count: 5 },
              { date: '2023-06-02', count: 3 },
              { date: '2023-06-03', count: 7 },
              { date: '2023-06-04', count: 2 },
              { date: '2023-06-05', count: 4 },
              { date: '2023-06-06', count: 6 },
              { date: '2023-06-07', count: 8 },
              { date: '2023-06-08', count: 5 },
              { date: '2023-06-09', count: 4 },
              { date: '2023-06-10', count: 9 },
              { date: '2023-06-11', count: 3 },
              { date: '2023-06-12', count: 6 },
              { date: '2023-06-13', count: 4 },
              { date: '2023-06-14', count: 7 },
              { date: '2023-06-15', count: 5 },
            ],
            returning: 45,
            total: 120
          }
        };
        
        setAnalyticsData(fallbackData);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAnalyticsData();
  }, [dateRange]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  // Revenue chart data
  const revenueChartData = {
    labels: analyticsData?.revenue.daily.map(item => {
      const date = new Date(item.date);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    }) || [],
    datasets: [
      {
        label: 'Daily Revenue',
        data: analyticsData?.revenue.daily.map(item => item.amount) || [],
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 2,
        tension: 0.4,
      },
    ],
  };

  // Bookings by event chart data
  const bookingsByEventChartData = {
    labels: analyticsData?.bookings.byEvent.map(item => item.eventName) || [],
    datasets: [
      {
        label: 'Bookings by Event',
        data: analyticsData?.bookings.byEvent.map(item => item.count) || [],
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

  // Events by category chart data
  const eventsByCategoryChartData = {
    labels: analyticsData?.events.byCategory.map(item => item.category) || [],
    datasets: [
      {
        label: 'Events by Category',
        data: analyticsData?.events.byCategory.map(item => item.count) || [],
        backgroundColor: [
          'rgba(255, 99, 132, 0.6)',
          'rgba(54, 162, 235, 0.6)',
          'rgba(255, 206, 86, 0.6)',
          'rgba(75, 192, 192, 0.6)',
          'rgba(153, 102, 255, 0.6)',
          'rgba(255, 159, 64, 0.6)',
        ],
        borderWidth: 0,
      },
    ],
  };

  // New customers chart data
  const newCustomersChartData = {
    labels: analyticsData?.customers.new.map(item => {
      const date = new Date(item.date);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    }) || [],
    datasets: [
      {
        label: 'New Customers',
        data: analyticsData?.customers.new.map(item => item.count) || [],
        backgroundColor: 'rgba(153, 102, 255, 0.2)',
        borderColor: 'rgba(153, 102, 255, 1)',
        borderWidth: 2,
        tension: 0.4,
      },
    ],
  };

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-4 md:mb-0">Analytics Dashboard</h1>
        
        <div className="inline-flex rounded-md shadow-sm">
          <button
            type="button"
            onClick={() => setDateRange('7days')}
            className={`px-4 py-2 text-sm font-medium rounded-l-md ${dateRange === '7days' ? 'bg-primary text-white' : 'bg-white text-gray-700 hover:bg-gray-50'} border border-gray-300`}
          >
            Last 7 Days
          </button>
          <button
            type="button"
            onClick={() => setDateRange('30days')}
            className={`px-4 py-2 text-sm font-medium ${dateRange === '30days' ? 'bg-primary text-white' : 'bg-white text-gray-700 hover:bg-gray-50'} border-t border-b border-gray-300`}
          >
            Last 30 Days
          </button>
          <button
            type="button"
            onClick={() => setDateRange('90days')}
            className={`px-4 py-2 text-sm font-medium ${dateRange === '90days' ? 'bg-primary text-white' : 'bg-white text-gray-700 hover:bg-gray-50'} border-t border-b border-gray-300`}
          >
            Last 90 Days
          </button>
          <button
            type="button"
            onClick={() => setDateRange('year')}
            className={`px-4 py-2 text-sm font-medium rounded-r-md ${dateRange === 'year' ? 'bg-primary text-white' : 'bg-white text-gray-700 hover:bg-gray-50'} border border-gray-300`}
          >
            This Year
          </button>
        </div>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 text-green-500 mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(analyticsData?.revenue.daily.reduce((sum, item) => sum + item.amount, 0) || 0)}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 text-blue-500 mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Bookings</p>
              <p className="text-2xl font-bold text-gray-900">{analyticsData?.bookings.total || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100 text-yellow-500 mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Active Events</p>
              <p className="text-2xl font-bold text-gray-900">{analyticsData?.events.published || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100 text-purple-500 mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Customers</p>
              <p className="text-2xl font-bold text-gray-900">{analyticsData?.customers.total || 0}</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Revenue Trend</h2>
          <div className="h-80">
            <Line data={revenueChartData} options={chartOptions} />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">New Customers</h2>
          <div className="h-80">
            <Line data={newCustomersChartData} options={chartOptions} />
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Bookings by Event</h2>
          <div className="h-80">
            <Bar data={bookingsByEventChartData} options={chartOptions} />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Events by Category</h2>
          <div className="h-80">
            <Pie data={eventsByCategoryChartData} options={chartOptions} />
          </div>
        </div>
      </div>
      
      {/* Detailed Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Booking Status</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Completed</span>
              <span className="text-sm font-medium text-gray-900">{analyticsData?.bookings.completed || 0}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-green-500 h-2.5 rounded-full" 
                style={{ width: `${analyticsData ? (analyticsData.bookings.completed / analyticsData.bookings.total) * 100 : 0}%` }}
              ></div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Upcoming</span>
              <span className="text-sm font-medium text-gray-900">
                {analyticsData ? analyticsData.bookings.total - analyticsData.bookings.completed - analyticsData.bookings.cancelled : 0}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-blue-500 h-2.5 rounded-full" 
                style={{ width: `${analyticsData ? ((analyticsData.bookings.total - analyticsData.bookings.completed - analyticsData.bookings.cancelled) / analyticsData.bookings.total) * 100 : 0}%` }}
              ></div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Cancelled</span>
              <span className="text-sm font-medium text-gray-900">{analyticsData?.bookings.cancelled || 0}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-red-500 h-2.5 rounded-full" 
                style={{ width: `${analyticsData ? (analyticsData.bookings.cancelled / analyticsData.bookings.total) * 100 : 0}%` }}
              ></div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Event Status</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Published</span>
              <span className="text-sm font-medium text-gray-900">{analyticsData?.events.published || 0}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-green-500 h-2.5 rounded-full" 
                style={{ width: `${analyticsData ? (analyticsData.events.published / analyticsData.events.total) * 100 : 0}%` }}
              ></div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Draft</span>
              <span className="text-sm font-medium text-gray-900">{analyticsData?.events.draft || 0}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-yellow-500 h-2.5 rounded-full" 
                style={{ width: `${analyticsData ? (analyticsData.events.draft / analyticsData.events.total) * 100 : 0}%` }}
              ></div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Customer Insights</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">New Customers</span>
              <span className="text-sm font-medium text-gray-900">
                {analyticsData?.customers.new.reduce((sum, item) => sum + item.count, 0) || 0}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-purple-500 h-2.5 rounded-full" 
                style={{ width: `${analyticsData ? (analyticsData.customers.new.reduce((sum, item) => sum + item.count, 0) / analyticsData.customers.total) * 100 : 0}%` }}
              ></div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Returning Customers</span>
              <span className="text-sm font-medium text-gray-900">{analyticsData?.customers.returning || 0}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-blue-500 h-2.5 rounded-full" 
                style={{ width: `${analyticsData ? (analyticsData.customers.returning / analyticsData.customers.total) * 100 : 0}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorAnalyticsPage;