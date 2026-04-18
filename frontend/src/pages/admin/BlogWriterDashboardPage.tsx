import { Link } from 'react-router-dom';
import { FileText, Plus, Eye, Edit } from 'lucide-react';
import { Card } from '@shared/components/ui/Card';
import { Badge } from '@shared/components/ui/Badge';
import { Button } from '@shared/components/ui/Button';
import { Skeleton } from '@shared/components/ui/Skeleton';
import { useCurrentUser } from '@features/auth/hooks/useAuth';

export function BlogWriterDashboardPage() {
  const { data: user, isLoading } = useCurrentUser();
  if (isLoading) return <BlogWriterDashboardSkeleton />;

  const recentPosts = [
    { title: 'Top 10 Summer Activities for Kids', status: 'published', date: '2 days ago', views: 1234 },
    { title: 'Best Educational Events in Dubai', status: 'draft', date: '5 days ago', views: 0 },
    { title: 'How to Plan the Perfect Birthday Party', status: 'published', date: '1 week ago', views: 856 },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Blog Dashboard</h1>
          <p className="text-gray-500 mt-1">Welcome back, {user?.firstName}!</p>
        </div>
        <Link to="/admin/blogs/new"><Button leftIcon={<Plus className="h-4 w-4" />}>New Post</Button></Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard icon={<FileText className="h-5 w-5" />} label="Published" value="24" color="bg-green-500" />
        <StatCard icon={<FileText className="h-5 w-5" />} label="Drafts" value="5" color="bg-yellow-500" />
        <StatCard icon={<Eye className="h-5 w-5" />} label="Total Views" value="12.5K" color="bg-blue-500" />
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Posts</h2>
        <div className="space-y-4">
          {recentPosts.map((post, i) => (
            <div key={i} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
              <div>
                <p className="font-medium text-gray-900">{post.title}</p>
                <p className="text-sm text-gray-500">{post.date} · {post.views} views</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={post.status === 'published' ? 'success' : 'warning'}>{post.status}</Badge>
                <Link to={`/admin/blogs/${i}/edit`} className="p-2 text-gray-400 hover:text-gray-600"><Edit className="h-4 w-4" /></Link>
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

function BlogWriterDashboardSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <Skeleton className="h-10 w-48" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">{[1,2,3].map(i => <Skeleton key={i} className="h-20" />)}</div>
      <Skeleton className="h-64" />
    </div>
  );
}
