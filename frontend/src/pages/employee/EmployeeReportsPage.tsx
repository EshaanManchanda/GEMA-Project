import React, { useState, useEffect } from 'react';
import { ApiService } from '@/services/api';
import { format } from 'date-fns';



interface ReportSummary {
  totalShifts: number;
  totalCheckins: number;
  todayCheckins: number;
  avgCheckinsPerShift: number;
}

interface RecentCheckin {
  _id: string;
  ticketId?: string;
  eventTitle?: string;
  customerName?: string;
  checkedInAt: string;
  status: 'checked_in' | 'invalid' | 'pending';
}

const EmployeeReportsPage: React.FC = () => {
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [recentCheckins, setRecentCheckins] = useState<RecentCheckin[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'7d' | '30d' | 'all'>('7d');

  useEffect(() => {
    fetchReports();
  }, [period]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const params = period !== 'all' ? { period } : {};
      const response = await ApiService.get('/employees/my-reports', { params });
      const data = response.data?.data || response.data || {};

      setSummary(data.summary || {
        totalShifts: 0,
        totalCheckins: 0,
        todayCheckins: 0,
        avgCheckinsPerShift: 0,
      });
      setRecentCheckins(data.recentCheckins || []);
    } catch {
      // Fallback: try checkin logs endpoint
      try {
        const response = await ApiService.get('/checkin/my-logs');
        const logs: RecentCheckin[] = response.data?.data || response.data || [];
        setRecentCheckins(logs);
        setSummary({
          totalShifts: 0,
          totalCheckins: logs.length,
          todayCheckins: logs.filter((l) =>
            new Date(l.checkedInAt).toDateString() === new Date().toDateString()
          ).length,
          avgCheckinsPerShift: 0,
        });
      } catch {
        setSummary({ totalShifts: 0, totalCheckins: 0, todayCheckins: 0, avgCheckinsPerShift: 0 });
      }
    } finally {
      setLoading(false);
    }
  };

  const formatCheckinTime = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'MMM d, h:mm a');
    } catch {
      return dateStr;
    }
  };

  const statusColor: Record<string, string> = {
    checked_in: 'bg-green-100 text-green-700',
    invalid: 'bg-red-100 text-red-700',
    pending: 'bg-yellow-100 text-yellow-700',
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Reports</h1>
        <div className="flex gap-2">
          {(['7d', '30d', 'all'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                period === p
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {p === '7d' ? 'Last 7 days' : p === '30d' ? 'Last 30 days' : 'All time'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                { label: 'Total Check-ins', value: summary.totalCheckins, icon: '✓' },
                { label: "Today's Check-ins", value: summary.todayCheckins, icon: '📅' },
                { label: 'Total Shifts', value: summary.totalShifts, icon: '🕐' },
                {
                  label: 'Avg / Shift',
                  value: summary.avgCheckinsPerShift > 0
                    ? summary.avgCheckinsPerShift.toFixed(1)
                    : '—',
                  icon: '📊',
                },
              ].map(({ label, value, icon }) => (
                <div key={label} className="bg-white rounded-lg border border-gray-200 p-4 text-center">
                  <div className="text-2xl mb-1">{icon}</div>
                  <div className="text-2xl font-bold text-gray-900">{value}</div>
                  <div className="text-xs text-gray-500 mt-1">{label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Recent Check-ins */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Recent Check-ins</h2>
            </div>
            {recentCheckins.length === 0 ? (
              <div className="py-10 text-center text-gray-500 text-sm">
                No check-in records found for this period.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {recentCheckins.slice(0, 50).map((checkin) => (
                  <div key={checkin._id} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {checkin.customerName || 'Guest'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {checkin.eventTitle || 'Unknown event'} • {formatCheckinTime(checkin.checkedInAt)}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                        statusColor[checkin.status] || 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {checkin.status.replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default EmployeeReportsPage;
