import { useQuery } from '@tanstack/react-query';
import { Calendar, Clock, Users, MapPin } from 'lucide-react';
import api from '@shared/services/api/client';
import { Card } from '@shared/components/ui/Card';
import { Badge } from '@shared/components/ui/Badge';
import { AdminPageHeader } from '@shared/components/admin/AdminPageHeader';
import { AdminStatCard } from '@shared/components/admin/AdminStatCard';
import { AdminEmptyState } from '@shared/components/admin/AdminEmptyState';
import { Skeleton } from '@shared/components/ui/Skeleton';

export function AdminCalendarPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'calendar'],
    queryFn: () => api.get('/calendar/events', { params: { startDate: new Date().toISOString(), endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() } }).then(r => r.data),
  });

  const events = data?.events || [];

  if (isLoading) return <PageSkeleton />;

  const upcoming = events.filter((e: any) => new Date(e.startDate) > new Date());
  const today = events.filter((e: any) => {
    const d = new Date(e.startDate);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  });

  const stats = [
    { icon: <Calendar className="h-5 w-5" />, label: 'Total Events', value: events.length, color: 'bg-blue-500' },
    { icon: <Clock className="h-5 w-5" />, label: 'Today', value: today.length, color: 'bg-green-500' },
    { icon: <Calendar className="h-5 w-5" />, label: 'Upcoming', value: upcoming.length, color: 'bg-purple-500' },
    { icon: <Users className="h-5 w-5" />, label: 'Expected Attendees', value: events.reduce((sum: number, e: any) => sum + (e.attendeeCount || 0), 0), color: 'bg-orange-500' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <AdminPageHeader title="Calendar" description="Academic calendar and event scheduling overview" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((s, i) => <AdminStatCard key={i} {...s} />)}
      </div>

      <Card className="overflow-hidden">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Events (Next 30 Days)</h2>
          {events.length === 0 ? (
            <AdminEmptyState title="No upcoming events" description="Events scheduled in the next 30 days will appear here." />
          ) : (
            <div className="space-y-4">
              {events.slice(0, 20).map((event: any) => (
                <div key={event._id} className="flex items-start gap-4 p-4 rounded-lg border border-gray-200 hover:bg-gray-50">
                  <div className="w-16 text-center flex-shrink-0">
                    <p className="text-2xl font-bold text-gray-900">{new Date(event.startDate).getDate()}</p>
                    <p className="text-xs text-gray-500 uppercase">{new Date(event.startDate).toLocaleString('default', { month: 'short' })}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{event.title}</p>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(event.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {event.location?.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{event.location.city}</span>}
                      {event.attendeeCount && <span className="flex items-center gap-1"><Users className="h-3 w-3" />{event.attendeeCount}</span>}
                    </div>
                  </div>
                  <Badge variant={event.status === 'published' ? 'success' : event.status === 'draft' ? 'default' : 'warning'}>{event.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <Skeleton className="h-10 w-48" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-20" />)}</div>
      <Skeleton className="h-96" />
    </div>
  );
}
