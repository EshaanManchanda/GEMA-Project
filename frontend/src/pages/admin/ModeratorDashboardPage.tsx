import { Link } from 'react-router-dom';
import { Shield, CheckCircle, XCircle, Eye } from 'lucide-react';
import { Card } from '@shared/components/ui/Card';
import { Badge } from '@shared/components/ui/Badge';
import { Skeleton } from '@shared/components/ui/Skeleton';
import { useCurrentUser } from '@features/auth/hooks/useAuth';

export function ModeratorDashboardPage() {
  const { isLoading } = useCurrentUser();
  if (isLoading) return <ModeratorDashboardSkeleton />;

  const pendingItems = [
    { type: 'Event', title: 'Summer Camp 2026', status: 'pending', date: '2 hours ago' },
    { type: 'School', title: 'Dubai International Academy', status: 'pending', date: '5 hours ago' },
    { type: 'Vendor', title: 'Adventure Sports Co', status: 'pending', date: '1 day ago' },
    { type: 'Review', title: 'Review #1234', status: 'flagged', date: '2 days ago' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Moderation Dashboard</h1>
        <p className="text-gray-500 mt-1">Review and approve content across the platform.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={<Shield className="h-5 w-5" />} label="Pending Events" value="12" color="bg-yellow-500" />
        <StatCard icon={<Shield className="h-5 w-5" />} label="Pending Schools" value="3" color="bg-blue-500" />
        <StatCard icon={<Shield className="h-5 w-5" />} label="Pending Vendors" value="5" color="bg-green-500" />
        <StatCard icon={<Shield className="h-5 w-5" />} label="Flagged Reviews" value="8" color="bg-red-500" />
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Pending Items</h2>
        <div className="space-y-4">
          {pendingItems.map((item, i) => (
            <div key={i} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
              <div className="flex items-center gap-3">
                <Badge variant={item.status === 'flagged' ? 'danger' : 'warning'}>{item.status}</Badge>
                <div>
                  <p className="font-medium text-gray-900">{item.title}</p>
                  <p className="text-sm text-gray-500">{item.type} · {item.date}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Link to={`/admin/moderation/${item.type.toLowerCase()}/${i}`} className="p-2 text-gray-400 hover:text-gray-600"><Eye className="h-4 w-4" /></Link>
                <button className="p-2 text-green-600 hover:bg-green-50 rounded"><CheckCircle className="h-4 w-4" /></button>
                <button className="p-2 text-red-600 hover:bg-red-50 rounded"><XCircle className="h-4 w-4" /></button>
              </div>
            </div>
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

function ModeratorDashboardSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <Skeleton className="h-10 w-48" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-20" />)}</div>
      <Skeleton className="h-64" />
    </div>
  );
}
