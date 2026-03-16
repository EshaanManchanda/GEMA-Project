import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ApiService } from '@/services/api';

interface AssignedEvent {
  _id: string;
  title: string;
  dateSchedule: Array<{ startDate?: string; date?: string }>;
  location?: { address?: string; city?: string };
  status: string;
  checkedInCount?: number;
  ticketsCount?: number;
}

const EmployeeTasksPage: React.FC = () => {
  const [events, setEvents] = useState<AssignedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'today'>('all');

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await ApiService.get('/employees/assigned-events');
      setEvents(response.data?.data || response.data || []);
    } catch {
      // Fallback to employee check-in events endpoint
      try {
        const response = await ApiService.get('/checkin/events');
        setEvents(response.data?.data?.events || response.data?.events || []);
      } catch {
        setEvents([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const getEventDate = (event: AssignedEvent) => {
    const schedule = event.dateSchedule?.[0];
    const dateStr = schedule?.startDate || schedule?.date;
    if (!dateStr) return 'Date TBD';
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    });
  };

  const isToday = (event: AssignedEvent) => {
    const schedule = event.dateSchedule?.[0];
    const dateStr = schedule?.startDate || schedule?.date;
    if (!dateStr) return false;
    const eventDate = new Date(dateStr);
    const today = new Date();
    return eventDate.toDateString() === today.toDateString();
  };

  const isUpcoming = (event: AssignedEvent) => {
    const schedule = event.dateSchedule?.[0];
    const dateStr = schedule?.startDate || schedule?.date;
    if (!dateStr) return false;
    return new Date(dateStr) > new Date();
  };

  const filteredEvents = events.filter((event) => {
    if (filter === 'today') return isToday(event);
    if (filter === 'upcoming') return isUpcoming(event);
    return true;
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Tasks</h1>
        <Link
          to="/employee/scanner"
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors text-sm font-medium"
        >
          Open Scanner
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {(['all', 'today', 'upcoming'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`pb-2 px-3 text-sm font-medium capitalize border-b-2 transition-colors ${
              filter === f
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {f === 'all' ? 'All Events' : f === 'today' ? "Today's Events" : 'Upcoming'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p>No tasks found for this filter.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredEvents.map((event) => (
            <div key={event._id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {isToday(event) && (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                        Today
                      </span>
                    )}
                    <h3 className="font-semibold text-gray-900">{event.title}</h3>
                  </div>
                  <p className="text-sm text-gray-500 mb-2">{getEventDate(event)}</p>
                  {(event.location?.address || event.location?.city) && (
                    <p className="text-sm text-gray-500">
                      {event.location.address || event.location.city}
                    </p>
                  )}
                </div>
                <div className="text-right ml-4">
                  {event.ticketsCount !== undefined && (
                    <div className="text-sm">
                      <span className="font-semibold text-gray-700">
                        {event.checkedInCount || 0}/{event.ticketsCount}
                      </span>
                      <p className="text-gray-400 text-xs">checked in</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-4 flex gap-3">
                <Link
                  to="/employee/scanner"
                  state={{ eventId: event._id }}
                  className="text-sm text-primary hover:underline font-medium"
                >
                  Scan Tickets
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EmployeeTasksPage;
