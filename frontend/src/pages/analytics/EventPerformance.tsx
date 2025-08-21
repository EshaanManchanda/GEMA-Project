import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import LoadingSpinner from '@/components/common/LoadingSpinner';

interface EventPerformance {
  event: {
    id: string;
    title: string;
    views: number;
    dateSchedule: string;
    location: string;
    basePrice: number;
    currency: string;
  };
  revenue: {
    total: number;
    orders: number;
    tickets: number;
    averageOrderValue: number;
  };
  tickets: {
    total: number;
    checkedIn: number;
    transferred: number;
    checkInRate: number;
  };
  reviews: {
    total: number;
    averageRating: number;
    distribution: { [key: string]: number };
  };
}

const EventPerformance: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const [performance, setPerformance] = useState<EventPerformance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (eventId) {
      fetchEventPerformance();
    }
  }, [eventId]);

  const fetchEventPerformance = async () => {
    try {
      setLoading(true);
      
      // Mock data for demonstration
      setPerformance({
        event: {
          id: eventId || '1',
          title: 'Summer Music Festival',
          views: 1250,
          dateSchedule: new Date().toISOString(),
          location: 'Central Park',
          basePrice: 50,
          currency: 'USD'
        },
        revenue: {
          total: 5000,
          orders: 75,
          tickets: 100,
          averageOrderValue: 66.67
        },
        tickets: {
          total: 100,
          checkedIn: 85,
          transferred: 5,
          checkInRate: 85
        },
        reviews: {
          total: 25,
          averageRating: 4.2,
          distribution: { '5': 10, '4': 8, '3': 5, '2': 1, '1': 1 }
        }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <LoadingSpinner size="large" text="Loading event performance..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <p className="text-red-600 mb-4">{error}</p>
        <button 
          onClick={fetchEventPerformance}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!performance) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-600">Event performance data not found.</p>
        <Link 
          to="/admin/analytics" 
          className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 inline-block"
        >
          Back to Analytics
        </Link>
      </div>
    );
  }

  const { event, revenue, tickets, reviews } = performance;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link 
          to="/admin/analytics"
          className="bg-gray-100 text-gray-700 px-3 py-1 rounded-lg hover:bg-gray-200 text-sm flex items-center gap-2"
        >
          ← Back
        </Link>
        <div>
          <h1 className="text-3xl font-bold">{event.title}</h1>
          <p className="text-gray-600">
            {new Date(event.dateSchedule).toLocaleDateString()} • {event.location}
          </p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">
                {event.currency} {revenue.total.toLocaleString()}
              </p>
            </div>
            <div className="text-green-600 text-2xl">💰</div>
          </div>
          <p className="text-xs text-gray-500 mt-1">From {revenue.orders} orders</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Tickets Sold</p>
              <p className="text-2xl font-bold text-gray-900">{revenue.tickets}</p>
            </div>
            <div className="text-blue-600 text-2xl">🎫</div>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Avg. order: {event.currency} {revenue.averageOrderValue.toFixed(2)}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Event Views</p>
              <p className="text-2xl font-bold text-gray-900">{event.views.toLocaleString()}</p>
            </div>
            <div className="text-purple-600 text-2xl">👁️</div>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Conversion: {event.views > 0 ? ((revenue.tickets / event.views) * 100).toFixed(2) : 0}%
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Check-in Rate</p>
              <p className="text-2xl font-bold text-gray-900">{tickets.checkInRate.toFixed(1)}%</p>
            </div>
            <div className="text-indigo-600 text-2xl">✅</div>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {tickets.checkedIn} of {tickets.total} tickets
          </p>
        </div>
      </div>

      {/* Detailed Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ticket Analytics */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h3 className="text-lg font-medium flex items-center gap-2">
              🎫 Ticket Analytics
            </h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Tickets</span>
              <span className="bg-gray-100 px-3 py-1 rounded-full text-sm">{tickets.total}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Checked In</span>
              <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">{tickets.checkedIn}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Transferred</span>
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">{tickets.transferred}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Check-in Rate</span>
              <span className={`px-3 py-1 rounded-full text-sm ${
                tickets.checkInRate >= 70 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {tickets.checkInRate.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Review Analytics */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h3 className="text-lg font-medium flex items-center gap-2">
              ⭐ Reviews & Ratings
            </h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Reviews</span>
              <span className="bg-gray-100 px-3 py-1 rounded-full text-sm">{reviews.total}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Average Rating</span>
              <div className="flex items-center gap-1">
                <span className="text-yellow-500">⭐</span>
                <span className="font-semibold">{reviews.averageRating.toFixed(1)}</span>
              </div>
            </div>
            
            {/* Rating Distribution */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Rating Distribution</p>
              {[5, 4, 3, 2, 1].map((rating) => (
                <div key={rating} className="flex items-center gap-2">
                  <span className="text-sm w-8">{rating}⭐</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-yellow-400 h-2 rounded-full"
                      style={{
                        width: reviews.total > 0 
                          ? `${((reviews.distribution[rating] || 0) / reviews.total) * 100}%`
                          : '0%'
                      }}
                    />
                  </div>
                  <span className="text-sm text-gray-600 w-8">
                    {reviews.distribution[rating] || 0}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Breakdown */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h3 className="text-lg font-medium flex items-center gap-2">
            📈 Revenue Breakdown
          </h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 border rounded-lg">
              <p className="text-sm text-gray-600 mb-2">Total Revenue</p>
              <p className="text-2xl font-bold text-green-600">
                {event.currency} {revenue.total.toLocaleString()}
              </p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <p className="text-sm text-gray-600 mb-2">Average Order Value</p>
              <p className="text-2xl font-bold text-blue-600">
                {event.currency} {revenue.averageOrderValue.toFixed(2)}
              </p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <p className="text-sm text-gray-600 mb-2">Revenue per Ticket</p>
              <p className="text-2xl font-bold text-purple-600">
                {event.currency} {revenue.tickets > 0 ? (revenue.total / revenue.tickets).toFixed(2) : '0.00'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventPerformance;