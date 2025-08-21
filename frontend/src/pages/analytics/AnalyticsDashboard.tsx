import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import LoadingSpinner from '@/components/common/LoadingSpinner';

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
      
      // Mock data for demonstration
      setSummary({
        totalRevenue: 50000,
        totalOrders: 150,
        totalEvents: 25,
        totalUsers: 500,
        recentOrders: [
          { id: '001', customerName: 'John Doe', total: 150, createdAt: new Date().toISOString() },
          { id: '002', customerName: 'Jane Smith', total: 200, createdAt: new Date().toISOString() }
        ],
        topEvents: [
          { title: 'Summer Festival', ticketsSold: 100, revenue: 5000, views: 1200 },
          { title: 'Art Exhibition', ticketsSold: 75, revenue: 3750, views: 800 }
        ],
        revenueGrowth: 15.5,
        ordersGrowth: 8.2
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const exportData = async (type: string) => {
    try {
      alert(`Exporting ${type} data...`);
      // Export functionality would go here
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export data');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <LoadingSpinner size="large" text="Loading analytics..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <p className="text-red-600 mb-4">{error}</p>
        <button 
          onClick={fetchDashboardSummary}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-gray-600">
            {user?.role === 'vendor' ? 'Your business insights' : 'Platform overview'}
          </p>
        </div>
        
        <div className="flex gap-2">
          <input 
            type="date" 
            className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button 
            onClick={() => exportData('orders')} 
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 flex items-center gap-2"
          >
            📥 Export
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">${summary?.totalRevenue?.toLocaleString() || 0}</p>
            </div>
            <div className="text-green-600 text-2xl">💰</div>
          </div>
          <p className="text-xs text-green-600 mt-1">
            {summary?.revenueGrowth !== undefined && (
              <>+{summary.revenueGrowth.toFixed(1)}% from last period</>
            )}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900">{summary?.totalOrders?.toLocaleString() || 0}</p>
            </div>
            <div className="text-blue-600 text-2xl">📊</div>
          </div>
          <p className="text-xs text-blue-600 mt-1">
            {summary?.ordersGrowth !== undefined && (
              <>+{summary.ordersGrowth.toFixed(1)}% from last period</>
            )}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Events</p>
              <p className="text-2xl font-bold text-gray-900">{summary?.totalEvents?.toLocaleString() || 0}</p>
            </div>
            <div className="text-purple-600 text-2xl">🎪</div>
          </div>
          <p className="text-xs text-gray-500 mt-1">Active events</p>
        </div>

        {user?.role === 'admin' && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{summary?.totalUsers?.toLocaleString() || 0}</p>
              </div>
              <div className="text-indigo-600 text-2xl">👥</div>
            </div>
            <p className="text-xs text-gray-500 mt-1">Registered users</p>
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h3 className="text-lg font-medium">Recent Orders</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {summary?.recentOrders?.slice(0, 5).map((order, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Order #{order.id}</p>
                    <p className="text-sm text-gray-600">{order.customerName}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">${order.total}</p>
                    <p className="text-sm text-gray-600">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              )) || <p className="text-gray-600">No recent orders</p>}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h3 className="text-lg font-medium">Top Events</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {summary?.topEvents?.slice(0, 5).map((event, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{event.title}</p>
                    <p className="text-sm text-gray-600">{event.ticketsSold} tickets sold</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">${event.revenue}</p>
                    <p className="text-sm text-gray-600">{event.views} views</p>
                  </div>
                </div>
              )) || <p className="text-gray-600">No events data</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Charts Placeholder */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium mb-4">Revenue Over Time</h3>
        <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
          <div className="text-center text-gray-500">
            <div className="text-4xl mb-2">📈</div>
            <p>Chart visualization would appear here</p>
            <p className="text-sm">Showing revenue trends over the selected period</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;