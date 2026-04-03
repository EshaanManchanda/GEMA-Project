import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import analyticsAPI from '@/services/api/analyticsAPI';

interface PerformanceData {
  event: {
    id: string;
    title: string;
    views: number;
    dateSchedule: any[];
    location: any;
    basePrice: number;
    currency: string;
    hasRegistration: boolean;
  };
  revenue: {
    total: number;
    orders: number;
    tickets: number;
    averageOrderValue: number;
    conversionRate: number;
  };
  tickets: {
    total: number;
    checkedIn: number;
    transferred: number;
    checkInRate: number;
  };
  seats: {
    sold: number;
    total: number;
    utilizationRate: number | null;
    hasUnlimitedSeats: boolean;
  };
  reviews: {
    total: number;
    averageRating: number;
    distribution: Record<number, number>;
  };
  registrations: {
    total: number;
    byStatus: Record<string, number>;
  };
}

const STATUS_COLORS: Record<string, string> = {
  submitted: 'bg-blue-100 text-blue-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  withdrawn: 'bg-gray-100 text-gray-800',
  under_review: 'bg-yellow-100 text-yellow-800',
};

const EventPerformance: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const [performance, setPerformance] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (eventId) fetchEventPerformance();
  }, [eventId]);

  const fetchEventPerformance = async () => {
    if (!eventId) return;
    try {
      setLoading(true);
      setError(null);
      const result = await analyticsAPI.getEventPerformance(eventId);
      // API returns { success, data: { event, revenue, tickets, seats, reviews, registrations } }
      setPerformance(result?.data || result);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load performance data');
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
        <p className="text-gray-600">No performance data found.</p>
        <Link
          to="/admin/analytics"
          className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 inline-block"
        >
          Back to Analytics
        </Link>
      </div>
    );
  }

  const { event, revenue, tickets, seats, reviews, registrations } = performance;
  const currency = event.currency || 'AED';
  const locationLabel = typeof event.location === 'object'
    ? event.location?.city || event.location?.address || ''
    : event.location || '';

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to="/admin/analytics"
          className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 text-sm"
        >
          ← Back
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{event.title}</h1>
          {locationLabel && <p className="text-gray-500 text-sm">{locationLabel}</p>}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <p className="text-sm font-medium text-gray-500 mb-1">Total Revenue</p>
          <p className="text-2xl font-bold text-gray-900">
            {currency} {revenue.total.toLocaleString()}
          </p>
          <p className="text-xs text-gray-400 mt-1">From {revenue.orders} orders</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <p className="text-sm font-medium text-gray-500 mb-1">Tickets Sold</p>
          <p className="text-2xl font-bold text-gray-900">{revenue.tickets}</p>
          <p className="text-xs text-gray-400 mt-1">
            Avg order: {currency} {revenue.averageOrderValue.toFixed(2)}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <p className="text-sm font-medium text-gray-500 mb-1">Event Views</p>
          <p className="text-2xl font-bold text-gray-900">{event.views.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-1">
            Conversion: {revenue.conversionRate.toFixed(2)}%
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <p className="text-sm font-medium text-gray-500 mb-1">Check-in Rate</p>
          <p className="text-2xl font-bold text-gray-900">{tickets.checkInRate.toFixed(1)}%</p>
          <p className="text-xs text-gray-400 mt-1">
            {tickets.checkedIn} of {tickets.total} tickets
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ticket Analytics */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="p-5 border-b">
            <h3 className="font-semibold text-gray-900">Ticket Analytics</h3>
          </div>
          <div className="p-5 space-y-3">
            {[
              { label: 'Total Tickets', value: tickets.total, color: 'bg-gray-100 text-gray-700' },
              { label: 'Checked In', value: tickets.checkedIn, color: 'bg-green-100 text-green-800' },
              { label: 'Transferred', value: tickets.transferred, color: 'bg-blue-100 text-blue-800' },
              { label: 'Check-in Rate', value: `${tickets.checkInRate.toFixed(1)}%`, color: tickets.checkInRate >= 70 ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800' },
            ].map(row => (
              <div key={row.label} className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{row.label}</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${row.color}`}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Seat Utilization */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="p-5 border-b">
            <h3 className="font-semibold text-gray-900">Seat Utilization</h3>
          </div>
          <div className="p-5 space-y-3">
            {seats.hasUnlimitedSeats ? (
              <p className="text-sm text-gray-500">Unlimited seats — no capacity limit</p>
            ) : (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Seats Sold</span>
                  <span className="font-semibold text-gray-900">{seats.sold}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Capacity</span>
                  <span className="font-semibold text-gray-900">{seats.total}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Utilization</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    (seats.utilizationRate || 0) >= 80
                      ? 'bg-green-100 text-green-800'
                      : (seats.utilizationRate || 0) >= 50
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {seats.utilizationRate?.toFixed(1) ?? 0}%
                  </span>
                </div>
                {seats.total > 0 && (
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-indigo-600 h-2 rounded-full transition-all"
                        style={{ width: `${Math.min(seats.utilizationRate || 0, 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Reviews */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="p-5 border-b">
            <h3 className="font-semibold text-gray-900">Reviews & Ratings</h3>
          </div>
          <div className="p-5 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Reviews</span>
              <span className="font-semibold text-gray-900">{reviews.total}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Average Rating</span>
              <span className="font-semibold text-yellow-600">★ {reviews.averageRating.toFixed(1)}</span>
            </div>
            <div className="space-y-2 mt-2">
              {[5, 4, 3, 2, 1].map(star => {
                const count = reviews.distribution[star] || 0;
                const pct = reviews.total > 0 ? (count / reviews.total) * 100 : 0;
                return (
                  <div key={star} className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 w-5">{star}★</span>
                    <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                      <div className="bg-yellow-400 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-gray-500 w-5 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Registrations */}
        {event.hasRegistration && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="p-5 border-b">
              <h3 className="font-semibold text-gray-900">Registrations</h3>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total</span>
                <span className="font-semibold text-gray-900">{registrations.total}</span>
              </div>
              {Object.entries(registrations.byStatus).map(([status, count]) => (
                <div key={status} className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 capitalize">{status.replace('_', ' ')}</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[status] || 'bg-gray-100 text-gray-700'}`}>
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Revenue Breakdown */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="p-5 border-b">
          <h3 className="font-semibold text-gray-900">Revenue Breakdown</h3>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Revenue', value: `${currency} ${revenue.total.toLocaleString()}`, color: 'text-green-600' },
              { label: 'Avg Order Value', value: `${currency} ${revenue.averageOrderValue.toFixed(2)}`, color: 'text-blue-600' },
              { label: 'Revenue / Ticket', value: `${currency} ${revenue.tickets > 0 ? (revenue.total / revenue.tickets).toFixed(2) : '0.00'}`, color: 'text-purple-600' },
              { label: 'Conversion Rate', value: `${revenue.conversionRate.toFixed(2)}%`, color: 'text-indigo-600' },
            ].map(card => (
              <div key={card.label} className="text-center p-4 border border-gray-100 rounded-lg">
                <p className="text-xs text-gray-500 mb-2">{card.label}</p>
                <p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventPerformance;
