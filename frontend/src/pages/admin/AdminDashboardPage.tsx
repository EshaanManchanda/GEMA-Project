import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import adminAPI from '../../services/api/adminAPI';
import PayoutSummaryCard from '../../components/admin/PayoutSummaryCard';
import CommissionOverview from '../../components/admin/CommissionOverview';

interface DashboardStat {
  title: string;
  value: string | number;
  change: number;
  icon: React.ReactNode;
}

interface RecentActivity {
  id: string;
  type: 'user_registered' | 'event_created' | 'booking_made' | 'review_posted' | 'category_added';
  title: string;
  description: string;
  timestamp: string;
  user?: {
    id: string;
    name: string;
    avatar: string;
  };
}

const AdminDashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStat[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch real data from API
        const response = await adminAPI.getDashboardStats();

        if (response.success) {
          const data = response.data;
          console.log("Dashboard data:", data);

          // Transform API data to match component interface
          const transformedStats: DashboardStat[] = [
            {
              title: 'Total Users',
              value: data.totalUsers || 0,
              change: data.userGrowth || 0,
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ),
            },
            {
              title: 'Total Events',
              value: data.totalEvents || 0,
              change: data.eventGrowth || 0,
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              ),
            },
            {
              title: 'Total Bookings',
              value: data.totalTicketsSold || 0,
              change: 0, // Backend doesn't provide booking growth yet
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              ),
            },
            {
              title: 'Total Revenue',
              value: `$${data.totalRevenue?.toLocaleString() || '0'}`,
              change: data.revenueGrowth || 0,
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ),
            },
          ];

          setStats(transformedStats);

          // Use recent activity from centralized endpoint or generate from events
          let recentActivities: RecentActivity[] = [];

          if (data.recentActivity && data.recentActivity.length > 0) {
            recentActivities = data.recentActivity;
          } else if (data.topPerformingEvents && data.topPerformingEvents.length > 0) {
            data.topPerformingEvents.slice(0, 5).forEach((event: any, index: number) => {
              recentActivities.push({
                id: `event-${event.eventId}`,
                type: 'event_created',
                title: 'High Performing Event',
                description: `${event.title} generated ${event.tickets} ticket sales`,
                timestamp: new Date(Date.now() - index * 3600000).toISOString(),
              });
            });
          } else {
            recentActivities.push({
              id: '1',
              type: 'user_registered',
              title: 'Dashboard Updated',
              description: 'All dashboard data successfully loaded',
              timestamp: new Date().toISOString(),
            });
          }

          setRecentActivity(recentActivities);
        } else {
          throw new Error('API response indicated failure');
        }
      } catch (error: any) {
        console.error('Error fetching dashboard data:', error);

        const errorMessage = error?.response?.data?.message || error?.message || 'Failed to load dashboard data';
        setError(errorMessage);

        // Show error state instead of mock data
        setStats([]);
        setRecentActivity([{
          id: 'error-1',
          type: 'user_registered',
          title: 'Data Loading Error',
          description: errorMessage,
          timestamp: new Date().toISOString(),
        }]);
      } finally {
        setIsLoading(false);
      }
    };
    
    // Initial fetch
    fetchDashboardData();
    
    // Set up intelligent refresh with exponential backoff on errors
    let refreshDelay = 5 * 60 * 1000; // Start with 5 minutes
    let consecutiveErrors = 0;

    const scheduleNextRefresh = () => {
      if (refreshInterval) clearTimeout(refreshInterval);

      const nextInterval = setTimeout(() => {
        if (!isLoading && document.visibilityState === 'visible') {
          fetchDashboardData()
            .then(() => {
              consecutiveErrors = 0;
              refreshDelay = 5 * 60 * 1000; // Reset to 5 minutes on success
            })
            .catch(() => {
              consecutiveErrors++;
              // Exponential backoff: double the delay up to max 30 minutes
              refreshDelay = Math.min(refreshDelay * 2, 30 * 60 * 1000);
            })
            .finally(() => {
              scheduleNextRefresh(); // Schedule the next refresh
            });
        } else {
          scheduleNextRefresh(); // Reschedule if loading or page not visible
        }
      }, error ? refreshDelay * 2 : refreshDelay); // Double delay if there's an error

      setRefreshInterval(nextInterval);
    };

    // Start the intelligent refresh cycle
    scheduleNextRefresh();

    // Cleanup interval on component unmount
    return () => {
      if (refreshInterval) clearInterval(refreshInterval);
    };
  }, []);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
    });
  };

  const getActivityIcon = (type: RecentActivity['type']) => {
    switch (type) {
      case 'user_registered':
        return (
          <div className="p-2 rounded-full bg-blue-100 text-blue-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
            </svg>
          </div>
        );
      case 'event_created':
        return (
          <div className="p-2 rounded-full bg-green-100 text-green-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
            </svg>
          </div>
        );
      case 'booking_made':
        return (
          <div className="p-2 rounded-full bg-purple-100 text-purple-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
              <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
            </svg>
          </div>
        );
      case 'review_posted':
        return (
          <div className="p-2 rounded-full bg-yellow-100 text-yellow-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </div>
        );
      case 'category_added':
        return (
          <div className="p-2 rounded-full bg-red-100 text-red-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="p-2 rounded-full bg-gray-100 text-gray-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-[50vh]">
          <div className="text-center">
            <div className="relative inline-block">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200"></div>
              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-600 absolute top-0 left-0"></div>
            </div>
            <p className="mt-4 text-xl font-semibold text-gray-700 animate-pulse">Loading Dashboard...</p>
            <div className="mt-6 space-y-3">
              <div className="h-4 bg-gradient-to-r from-blue-200 to-transparent rounded w-64 mx-auto animate-pulse"></div>
              <div className="h-4 bg-gradient-to-r from-indigo-200 to-transparent rounded w-48 mx-auto animate-pulse"></div>
              <div className="h-4 bg-gradient-to-r from-blue-200 to-transparent rounded w-56 mx-auto animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4 md:mb-0">Admin Dashboard</h1>
        <div className="flex space-x-4">
          <Link
            to="/admin/events/create"
            className="inline-flex items-center px-6 py-3 rounded-xl shadow-lg text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:shadow-xl hover:shadow-blue-500/25 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="-ml-1 mr-3 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Add Event
          </Link>
          <Link
            to="/admin/users/create"
            className="inline-flex items-center px-6 py-3 rounded-xl shadow-lg text-sm font-semibold text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:shadow-xl hover:shadow-green-500/25 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="-ml-1 mr-3 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
            </svg>
            Add User
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.length === 0 && !isLoading ? (
          // Error State
          <div className="col-span-full">
            <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 text-red-600 rounded-full mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-red-800 mb-2">Dashboard Data Unavailable</h3>
              <p className="text-red-600 mb-4">{error || 'Unable to load dashboard statistics. Please check your connection and try again.'}</p>
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => window.location.reload()}
                  className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Refresh Page
                </button>
                <button
                  onClick={() => {
                    setStats([]);
                    setError(null);
                    setIsLoading(true);
                    // Trigger a re-render by updating a dependency
                    window.location.reload();
                  }}
                  className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        ) : (
          stats.map((stat, index) => {
            const gradients = [
              'from-blue-500 to-indigo-600',
              'from-green-500 to-emerald-600',
              'from-purple-500 to-pink-600',
              'from-orange-500 to-red-600'
            ];
            const bgGradients = [
              'from-blue-50 to-indigo-50',
              'from-green-50 to-emerald-50',
              'from-purple-50 to-pink-50',
              'from-orange-50 to-red-50'
            ];
            return (
              <div key={index} className={`bg-gradient-to-br ${bgGradients[index]} rounded-2xl shadow-xl shadow-gray-200/50 p-6 border border-white/20 backdrop-blur-sm hover:shadow-2xl hover:shadow-gray-300/30 transition-all duration-300 transform hover:scale-105 group`}>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-700 group-hover:text-gray-800 transition-colors duration-300">{stat.title}</h3>
                  <div className={`p-3 rounded-xl bg-gradient-to-r ${gradients[index]} text-white shadow-lg transition-all duration-300 group-hover:scale-110`}>
                    {stat.icon}
                  </div>
                </div>
                <div className="flex items-baseline justify-between">
                  <p className="text-3xl font-bold text-gray-900 group-hover:text-gray-800 transition-colors duration-300">{stat.value}</p>
                  <div className="flex flex-col items-end">
                    <p className={`text-sm font-bold px-2 py-1 rounded-full ${stat.change >= 0 ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-100'} transition-all duration-300 group-hover:scale-105`}>
                      {stat.change >= 0 ? '↗ +' : '↘ '}{Math.abs(stat.change).toFixed(1)}%
                    </p>
                    <span className="text-xs text-gray-500 mt-1">vs last period</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Quick Links */}
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-xl shadow-gray-200/50 p-8 mb-8 border border-white/20 backdrop-blur-sm">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <div className="w-1 h-8 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-full mr-3"></div>
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-7 gap-4">
          <Link to="/admin/users" className="group flex flex-col items-center p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl hover:shadow-lg hover:shadow-blue-500/20 transition-all duration-300 transform hover:scale-105 border border-blue-100">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl text-white mb-3 group-hover:scale-110 transition-transform duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-gray-700 group-hover:text-blue-700 transition-colors duration-300 text-center">Manage Users</span>
          </Link>
          <Link to="/admin/events" className="group flex flex-col items-center p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl hover:shadow-lg hover:shadow-green-500/20 transition-all duration-300 transform hover:scale-105 border border-green-100">
            <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl text-white mb-3 group-hover:scale-110 transition-transform duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-gray-700 group-hover:text-green-700 transition-colors duration-300 text-center">Manage Events</span>
          </Link>
          <Link to="/admin/venues" className="group flex flex-col items-center p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl hover:shadow-lg hover:shadow-purple-500/20 transition-all duration-300 transform hover:scale-105 border border-purple-100">
            <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl text-white mb-3 group-hover:scale-110 transition-transform duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-gray-700 group-hover:text-purple-700 transition-colors duration-300 text-center">Manage Venues</span>
          </Link>
          <Link to="/admin/categories" className="group flex flex-col items-center p-6 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl hover:shadow-lg hover:shadow-yellow-500/20 transition-all duration-300 transform hover:scale-105 border border-yellow-100">
            <div className="p-3 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-xl text-white mb-3 group-hover:scale-110 transition-transform duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-gray-700 group-hover:text-orange-700 transition-colors duration-300 text-center">Manage Categories</span>
          </Link>
          <Link to="/admin/orders" className="group flex flex-col items-center p-6 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl hover:shadow-lg hover:shadow-indigo-500/20 transition-all duration-300 transform hover:scale-105 border border-indigo-100">
            <div className="p-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl text-white mb-3 group-hover:scale-110 transition-transform duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-gray-700 group-hover:text-indigo-700 transition-colors duration-300 text-center">Manage Orders</span>
          </Link>
          <Link to="/admin/payouts" className="group flex flex-col items-center p-6 bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl hover:shadow-lg hover:shadow-emerald-500/20 transition-all duration-300 transform hover:scale-105 border border-emerald-100">
            <div className="p-3 bg-gradient-to-r from-emerald-500 to-green-600 rounded-xl text-white mb-3 group-hover:scale-110 transition-transform duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-gray-700 group-hover:text-emerald-700 transition-colors duration-300 text-center">Manage Payouts</span>
          </Link>
          <Link to="/admin/commissions" className="group flex flex-col items-center p-6 bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl hover:shadow-lg hover:shadow-amber-500/20 transition-all duration-300 transform hover:scale-105 border border-amber-100">
            <div className="p-3 bg-gradient-to-r from-amber-500 to-yellow-600 rounded-xl text-white mb-3 group-hover:scale-110 transition-transform duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-gray-700 group-hover:text-amber-700 transition-colors duration-300 text-center">Manage Commissions</span>
          </Link>
        </div>
      </div>

      {/* Financial Overview Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <PayoutSummaryCard className="col-span-1" />
        <CommissionOverview className="col-span-1" />
      </div>

      {/* Recent Activity */}
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-xl shadow-gray-200/50 p-8 border border-white/20 backdrop-blur-sm">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <div className="w-1 h-8 bg-gradient-to-b from-green-500 to-emerald-600 rounded-full mr-3"></div>
          Recent Activity
        </h2>
        <div className="space-y-4">
          {recentActivity.map((activity) => (
            <div key={activity.id} className="flex items-start">
              {getActivityIcon(activity.type)}
              <div className="ml-4 flex-1">
                <div className="flex justify-between">
                  <h4 className="text-sm font-medium text-gray-900">{activity.title}</h4>
                  <span className="text-xs text-gray-500">{formatTimestamp(activity.timestamp)}</span>
                </div>
                <p className="text-sm text-gray-600">{activity.description}</p>
                {activity.user && (
                  <div className="mt-2 flex items-center">
                    <img src={activity.user.avatar} alt={activity.user.name} className="h-6 w-6 rounded-full" />
                    <span className="ml-2 text-xs text-gray-500">{activity.user.name}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-8 text-center">
          <button className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-300 transform hover:scale-105">
            View All Activity
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;