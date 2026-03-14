import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import analyticsAPI from '@/services/api/analyticsAPI';

interface DashboardSummary {
  totalRevenue: number;
  totalOrders: number;
  totalEvents: number;
  totalUsers: number;
  recentOrders: any[];
  topEvents: any[];
  revenueGrowth: number;
  ordersGrowth: number;
}

const AnalyticsDashboard: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardSummary();
  }, []);

  const fetchDashboardSummary = async () => {
    try {
      setLoading(true);
      const response = await analyticsAPI.getDashboardSummary();
      const data = response?.data || response || {};
      setSummary({
        totalRevenue: data.totalRevenue || 0,
        totalOrders: data.totalOrders || 0,
        totalEvents: data.totalEvents || 0,
        totalUsers: data.totalUsers || 0,
        recentOrders: [],
        topEvents: (data.topPerformingEvents || []).map((e: any) => ({
          title: e.title,
          ticketsSold: e.tickets || 0,
          revenue: e.revenue || 0,
          views: 0,
        })),
        revenueGrowth: data.revenueGrowth || 0,
        ordersGrowth: 0,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-[50vh]">
          <div className="text-center">
            <div className="relative inline-block">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200"></div>
              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-600 absolute top-0 left-0"></div>
            </div>
            <p className="mt-4 text-xl font-semibold text-gray-700 animate-pulse">Loading Analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center p-8">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchDashboardSummary}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-1">
            {user?.role === 'vendor' ? 'Your business insights' : 'Platform overview'}
          </p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl shadow-xl shadow-green-200/50 p-6 border border-green-100 hover:shadow-2xl transition-all duration-300 transform hover:scale-105 group">
          <div className="flex items-center">
            <div className="p-4 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white mr-4 shadow-lg group-hover:scale-110 transition-all duration-300">
              <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700">Total Revenue</p>
              <p className="text-3xl font-bold text-gray-900">${summary?.totalRevenue?.toLocaleString() || 0}</p>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm text-gray-600">
              {summary?.revenueGrowth !== undefined && (
                <span className="text-green-600 font-bold px-2 py-1 rounded-full bg-green-100">+{summary.revenueGrowth.toFixed(1)}%</span>
              )}
              <span className="ml-2">from last period</span>
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl shadow-xl shadow-blue-200/50 p-6 border border-blue-100 hover:shadow-2xl transition-all duration-300 transform hover:scale-105 group">
          <div className="flex items-center">
            <div className="p-4 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white mr-4 shadow-lg group-hover:scale-110 transition-all duration-300">
              <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700">Total Orders</p>
              <p className="text-3xl font-bold text-gray-900">{summary?.totalOrders?.toLocaleString() || 0}</p>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm text-gray-600">
              {summary?.ordersGrowth !== undefined && (
                <span className="text-blue-600 font-bold px-2 py-1 rounded-full bg-blue-100">+{summary.ordersGrowth.toFixed(1)}%</span>
              )}
              <span className="ml-2">from last period</span>
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl shadow-xl shadow-purple-200/50 p-6 border border-purple-100 hover:shadow-2xl transition-all duration-300 transform hover:scale-105 group">
          <div className="flex items-center">
            <div className="p-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 text-white mr-4 shadow-lg group-hover:scale-110 transition-all duration-300">
              <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700">Total Events</p>
              <p className="text-3xl font-bold text-gray-900">{summary?.totalEvents?.toLocaleString() || 0}</p>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm text-gray-600">Active events</p>
          </div>
        </div>

        {user?.role === 'admin' && (
          <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-2xl shadow-xl shadow-orange-200/50 p-6 border border-orange-100 hover:shadow-2xl transition-all duration-300 transform hover:scale-105 group">
            <div className="flex items-center">
              <div className="p-4 rounded-xl bg-gradient-to-r from-orange-500 to-yellow-600 text-white mr-4 shadow-lg group-hover:scale-110 transition-all duration-300">
                <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700">Total Users</p>
                <p className="text-3xl font-bold text-gray-900">{summary?.totalUsers?.toLocaleString() || 0}</p>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm text-gray-600">Registered users</p>
            </div>
          </div>
        )}
      </div>

      {/* Top Events */}
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-xl shadow-gray-200/50 overflow-hidden border border-white/20">
        <div className="px-8 py-6 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-pink-50">
          <h2 className="text-xl font-bold text-gray-900 flex items-center">
            <div className="w-1 h-6 bg-gradient-to-b from-purple-500 to-pink-600 rounded-full mr-3"></div>
            Top Events
          </h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {summary?.topEvents?.length ? summary.topEvents.slice(0, 5).map((event, index) => (
              <div key={index} className="border rounded-lg p-4 hover:shadow-sm transition-shadow duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{event.title}</p>
                    <p className="text-sm text-gray-600">{event.ticketsSold} tickets sold</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">${event.revenue}</p>
                  </div>
                </div>
              </div>
            )) : <p className="text-gray-600 text-center py-8">No events data</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
