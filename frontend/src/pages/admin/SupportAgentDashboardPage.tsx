import { Link } from 'react-router-dom';
import { Headphones, MessageSquare, Clock, CheckCircle } from 'lucide-react';
import { Card } from '@shared/components/ui/Card';
import { Badge } from '@shared/components/ui/Badge';
import { Skeleton } from '@shared/components/ui/Skeleton';
import { useCurrentUser } from '@features/auth/hooks/useAuth';

export function SupportAgentDashboardPage() {
  const { data: user, isLoading } = useCurrentUser();
  if (isLoading) return <SupportAgentDashboardSkeleton />;

  const tickets = [
    { id: 'TK-001', subject: 'Booking refund request', status: 'open', priority: 'high', time: '30 min ago' },
    { id: 'TK-002', subject: 'Event cancellation inquiry', status: 'in_progress', priority: 'medium', time: '2 hours ago' },
    { id: 'TK-003', subject: 'Payment issue', status: 'open', priority: 'high', time: '3 hours ago' },
    { id: 'TK-004', subject: 'Account verification', status: 'resolved', priority: 'low', time: '1 day ago' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Support Dashboard</h1>
        <p className="text-gray-500 mt-1">Welcome back, {user?.firstName}!</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={<Headphones className="h-5 w-5" />} label="Open Tickets" value="12" color="bg-red-500" />
        <StatCard icon={<Clock className="h-5 w-5" />} label="In Progress" value="5" color="bg-yellow-500" />
        <StatCard icon={<CheckCircle className="h-5 w-5" />} label="Resolved Today" value="8" color="bg-green-500" />
        <StatCard icon={<MessageSquare className="h-5 w-5" />} label="Avg Response" value="15m" color="bg-blue-500" />
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Tickets</h2>
        <div className="space-y-4">
          {tickets.map((t) => (
            <Link key={t.id} to={`/admin/support/tickets/${t.id}`} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 -mx-6 px-6 transition-colors">
              <div>
                <p className="font-medium text-gray-900">{t.subject}</p>
                <p className="text-sm text-gray-500">{t.id} · {t.time}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={t.priority === 'high' ? 'danger' : t.priority === 'medium' ? 'warning' : 'default'}>{t.priority}</Badge>
                <Badge variant={t.status === 'open' ? 'danger' : t.status === 'in_progress' ? 'warning' : 'success'}>{t.status}</Badge>
              </div>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg ${color} text-white flex items-center justify-center`}>{icon}</div>
        <div><p className="text-2xl font-bold text-gray-900">{value}</p><p className="text-sm text-gray-500">{label}</p></div>
      </div>
    </Card>
  );
}

function SupportAgentDashboardSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <Skeleton className="h-10 w-48" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-20" />)}</div>
      <Skeleton className="h-64" />
    </div>
  );
}
