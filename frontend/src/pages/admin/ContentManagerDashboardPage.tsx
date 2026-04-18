import { Link } from 'react-router-dom';
import { Image, Layout, Megaphone, Film } from 'lucide-react';
import { Card } from '@shared/components/ui/Card';
import { Skeleton } from '@shared/components/ui/Skeleton';
import { useCurrentUser } from '@features/auth/hooks/useAuth';

export function ContentManagerDashboardPage() {
  const { data: user, isLoading } = useCurrentUser();
  if (isLoading) return <ContentManagerDashboardSkeleton />;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Content Management</h1>
        <p className="text-gray-500 mt-1">Welcome back, {user?.firstName}! Manage banners, popups, and media.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={<Image className="h-5 w-5" />} label="Active Banners" value="6" color="bg-blue-500" />
        <StatCard icon={<Layout className="h-5 w-5" />} label="Active Popups" value="2" color="bg-green-500" />
        <StatCard icon={<Megaphone className="h-5 w-5" />} label="Announcements" value="3" color="bg-purple-500" />
        <StatCard icon={<Film className="h-5 w-5" />} label="Reels" value="12" color="bg-red-500" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <QuickLinkCard title="Manage Banners" description="Homepage and event banners" link="/admin/banners" color="bg-blue-500" />
        <QuickLinkCard title="Manage Popups" description="Promotional popups" link="/admin/popups" color="bg-green-500" />
        <QuickLinkCard title="Announcements" description="Platform-wide announcements" link="/admin/announcements" color="bg-purple-500" />
        <QuickLinkCard title="Media Library" description="Upload and manage media" link="/admin/media" color="bg-orange-500" />
      </div>
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

function QuickLinkCard({ title, description, link, color }: { title: string; description: string; link: string; color: string }) {
  return (
    <Link to={link}>
      <Card className="p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 cursor-pointer h-full">
        <div className={`w-12 h-12 rounded-lg ${color} text-white flex items-center justify-center mb-4`}>
          <Image className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
        <p className="text-sm text-gray-500">{description}</p>
      </Card>
    </Link>
  );
}

function ContentManagerDashboardSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <Skeleton className="h-10 w-48" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-20" />)}</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">{[1,2,3,4].map(i => <Skeleton key={i} className="h-32" />)}</div>
    </div>
  );
}
