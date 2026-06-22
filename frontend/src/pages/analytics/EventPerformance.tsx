import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Filler,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import analyticsAPI from '@/services/api/analyticsAPI';
import {
  FaDownload,
  FaChartLine,
  FaCalendarAlt,
  FaTicketAlt,
} from 'react-icons/fa';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, BarElement,
  ArcElement, Filler, Title, Tooltip, Legend
);

interface SalesByDay {
  date: string;
  orders: number;
  revenue: number;
  tickets: number;
}

interface ScheduleBreakdown {
  index: number;
  date: string;
  startTime: string;
  endTime: string;
  soldSeats: number;
  availableSeats: number;
  totalCapacity: number | null;
  unlimitedSeats: boolean;
  utilizationRate: number | null;
}

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
  salesByDay: SalesByDay[];
  scheduleBreakdown: ScheduleBreakdown[];
}

const STATUS_COLORS: Record<string, string> = {
  submitted: 'bg-blue-100 text-blue-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  withdrawn: 'bg-gray-100 text-gray-800',
  under_review: 'bg-yellow-100 text-yellow-800',
};

const formatDay = (dayStr: string) => {
  const parts = dayStr.split('-');
  if (parts.length < 3) return dayStr;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthIdx = parseInt(parts[1]) - 1;
  return `${months[monthIdx]} ${parseInt(parts[2])}`;
};

const formatScheduleDate = (dateStr: string) => {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-AE', { weekday: 'short', month: 'short', day: 'numeric' });
};

function convertToCSV(data: Record<string, any>[], filename: string) {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','),
    ...data.map(row =>
      headers.map(h => {
        const val = row[h];
        const str = val === null || val === undefined ? '' : String(val);
        return str.includes(',') || str.includes('"') || str.includes('\n')
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      }).join(',')
    ),
  ];
  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

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
      setPerformance(result?.data || result);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load performance data');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!performance) return;
    const { event, salesByDay } = performance;
    if (salesByDay?.length) {
      convertToCSV(
        salesByDay.map(d => ({
          Date: d.date,
          Orders: d.orders,
          Revenue: d.revenue,
          Tickets: d.tickets,
        })),
        `${event.title.replace(/[^a-zA-Z0-9]/g, '-')}-sales`
      );
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

  const { event, revenue, tickets, seats, reviews, registrations, salesByDay, scheduleBreakdown } = performance;
  const currency = event.currency || 'AED';
  const locationLabel = typeof event.location === 'object'
    ? event.location?.city || event.location?.address || ''
    : event.location || '';

  // Booking funnel
  const funnelSteps = [
    { label: 'Event Views', value: event.views, color: 'bg-blue-500' },
    { label: 'Orders Placed', value: revenue.orders, color: 'bg-purple-500' },
    { label: 'Tickets Issued', value: tickets.total, color: 'bg-amber-500' },
    { label: 'Checked In', value: tickets.checkedIn, color: 'bg-green-500' },
  ];
  const funnelMax = Math.max(...funnelSteps.map(s => s.value), 1);

  // Sales chart data
  const salesDays = salesByDay || [];
  const revenueChartData = {
    labels: salesDays.map(d => formatDay(d.date)),
    datasets: [
      {
        label: `Revenue (${currency})`,
        data: salesDays.map(d => d.revenue),
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: 'rgb(16, 185, 129)',
        pointRadius: 3,
        yAxisID: 'y',
      },
      {
        label: 'Orders',
        data: salesDays.map(d => d.orders),
        borderColor: 'rgb(139, 92, 246)',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        tension: 0.4,
        fill: false,
        pointBackgroundColor: 'rgb(139, 92, 246)',
        pointRadius: 3,
        yAxisID: 'y1',
      },
    ],
  };

  const salesChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: { display: true, position: 'top' as const },
      tooltip: {
        backgroundColor: 'rgba(0,0,0,0.8)',
        padding: 12,
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 11 }, maxRotation: 45 },
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        beginAtZero: true,
        grid: { color: 'rgba(0,0,0,0.05)' },
        title: { display: true, text: `Revenue (${currency})`, font: { size: 11 } },
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        beginAtZero: true,
        grid: { drawOnChartArea: false },
        title: { display: true, text: 'Orders', font: { size: 11 } },
        ticks: { stepSize: 1, callback: (val: any) => Number.isInteger(val) ? val : '' },
      },
    },
  };

  // Schedule breakdown chart
  const schedules = (scheduleBreakdown || []).filter(s => !s.unlimitedSeats && s.totalCapacity);
  const scheduleChartData = {
    labels: schedules.map(s => formatScheduleDate(s.date)),
    datasets: [
      {
        label: 'Sold',
        data: schedules.map(s => s.soldSeats),
        backgroundColor: 'rgba(16, 185, 129, 0.7)',
        borderColor: 'rgb(16, 185, 129)',
        borderWidth: 1,
        borderRadius: 4,
      },
      {
        label: 'Available',
        data: schedules.map(s => s.availableSeats),
        backgroundColor: 'rgba(209, 213, 219, 0.7)',
        borderColor: 'rgb(156, 163, 175)',
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  const scheduleChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'top' as const },
      tooltip: {
        backgroundColor: 'rgba(0,0,0,0.8)',
        padding: 12,
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        stacked: true,
        grid: { display: false },
        ticks: { font: { size: 11 }, maxRotation: 45 },
      },
      y: {
        stacked: true,
        beginAtZero: true,
        grid: { color: 'rgba(0,0,0,0.05)' },
        ticks: { stepSize: 1, callback: (val: any) => Number.isInteger(val) ? val : '' },
      },
    },
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
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
        {salesDays.length > 0 && (
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300
              rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <FaDownload className="w-3.5 h-3.5" />
            Export CSV
          </button>
        )}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Total Revenue" value={`${currency} ${revenue.total.toLocaleString()}`} sub={`From ${revenue.orders} orders`} />
        <MetricCard label="Tickets Sold" value={String(revenue.tickets)} sub={`Avg order: ${currency} ${revenue.averageOrderValue.toFixed(2)}`} />
        <MetricCard label="Event Views" value={event.views.toLocaleString()} sub={`Conversion: ${revenue.conversionRate.toFixed(2)}%`} />
        <MetricCard label="Check-in Rate" value={`${tickets.checkInRate.toFixed(1)}%`} sub={`${tickets.checkedIn} of ${tickets.total} tickets`} />
      </div>

      {/* Booking Funnel */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Booking Funnel</h3>
        <div className="space-y-3">
          {funnelSteps.map((step, idx) => {
            const pct = funnelMax > 0 ? (step.value / funnelMax) * 100 : 0;
            const prevValue = idx > 0 ? funnelSteps[idx - 1].value : null;
            const dropOff = prevValue && prevValue > 0
              ? ((1 - step.value / prevValue) * 100).toFixed(1)
              : null;
            return (
              <div key={step.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">{step.label}</span>
                  <div className="flex items-center gap-3">
                    {dropOff !== null && (
                      <span className="text-xs text-red-500">-{dropOff}% drop</span>
                    )}
                    <span className="text-sm font-semibold text-gray-900">
                      {step.value.toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3">
                  <div
                    className={`${step.color} h-3 rounded-full transition-all duration-500`}
                    style={{ width: `${Math.max(pct, 1)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sales Over Time Chart */}
      {salesDays.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Sales Over Time</h3>
            <FaChartLine className="w-4 h-4 text-green-500" />
          </div>
          <div className="h-80">
            <Line data={revenueChartData} options={salesChartOptions} />
          </div>
        </div>
      )}

      {/* Schedule Breakdown */}
      {schedules.length > 1 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Seats by Schedule Date</h3>
            <FaCalendarAlt className="w-4 h-4 text-blue-500" />
          </div>
          <div className="h-72">
            <Bar data={scheduleChartData} options={scheduleChartOptions} />
          </div>
        </div>
      )}

      {/* Schedule Table (always show if multiple schedules) */}
      {(scheduleBreakdown || []).length > 1 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b">
            <div className="flex items-center gap-2">
              <FaCalendarAlt className="w-4 h-4 text-blue-500" />
              <h3 className="font-semibold text-gray-900">Per-Schedule Breakdown</h3>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase">Time</th>
                  <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase text-right">Sold</th>
                  <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase text-right">Available</th>
                  <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase text-right">Utilization</th>
                </tr>
              </thead>
              <tbody>
                {(scheduleBreakdown || []).map((s, idx) => (
                  <tr key={idx} className="border-t border-gray-100">
                    <td className="px-5 py-3 text-gray-900 font-medium">{formatScheduleDate(s.date)}</td>
                    <td className="px-5 py-3 text-gray-600">
                      {s.startTime || '–'}{s.endTime ? ` – ${s.endTime}` : ''}
                    </td>
                    <td className="px-5 py-3 text-right text-gray-900">{s.soldSeats}</td>
                    <td className="px-5 py-3 text-right text-gray-600">
                      {s.unlimitedSeats ? '∞' : s.availableSeats}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {s.utilizationRate !== null ? (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          s.utilizationRate >= 80 ? 'bg-green-100 text-green-800'
                          : s.utilizationRate >= 50 ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                        }`}>
                          {s.utilizationRate.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">N/A</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ticket Analytics */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="p-5 border-b">
            <div className="flex items-center gap-2">
              <FaTicketAlt className="w-4 h-4 text-indigo-500" />
              <h3 className="font-semibold text-gray-900">Ticket Analytics</h3>
            </div>
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

const MetricCard: React.FC<{
  label: string;
  value: string;
  sub: string;
}> = ({ label, value, sub }) => (
  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
    <p className="text-sm font-medium text-gray-500 mb-1">{label}</p>
    <p className="text-2xl font-bold text-gray-900">{value}</p>
    <p className="text-xs text-gray-400 mt-1">{sub}</p>
  </div>
);

export default EventPerformance;
