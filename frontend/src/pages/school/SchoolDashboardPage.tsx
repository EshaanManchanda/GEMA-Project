import { Link } from 'react-router-dom';
import { Users, BookOpen, Calendar, Settings, TrendingUp } from 'lucide-react';
import { Card } from '@shared/components/ui/Card';

import { Button } from '@shared/components/ui/Button';
import { Skeleton } from '@shared/components/ui/Skeleton';
import { useCurrentUser } from '@features/auth/hooks/useAuth';

export function SchoolDashboardPage() {
  const { data: user, isLoading } = useCurrentUser();

  if (isLoading) return <SchoolDashboardSkeleton />;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">School Dashboard</h1>
          <p className="text-gray-500 mt-1">Welcome back, {user?.firstName}!</p>
        </div>
        <div className="flex gap-2 mt-4 sm:mt-0">
          <Button variant="ghost" leftIcon={<Settings className="h-4 w-4" />}>Settings</Button>
          <Button leftIcon={<Users className="h-4 w-4" />}>Invite Teacher</Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <StatCard icon={<Users className="h-5 w-5" />} label="Teachers" value="24" />
        <StatCard icon={<Users className="h-5 w-5" />} label="Students" value="486" />
        <StatCard icon={<BookOpen className="h-5 w-5" />} label="Courses" value="12" />
        <StatCard icon={<Calendar className="h-5 w-5" />} label="Events" value="8" />
        <StatCard icon={<TrendingUp className="h-5 w-5" />} label="Revenue" value="AED 45K" />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <QuickLinkCard title="Manage Teachers" description="View and manage your teaching staff" link="/school/teachers" color="bg-blue-500" />
        <QuickLinkCard title="Manage Students" description="View student profiles and enrollment" link="/school/students" color="bg-green-500" />
        <QuickLinkCard title="Create Course" description="Set up a new course for your school" link="/school/courses/create" color="bg-purple-500" />
        <QuickLinkCard title="View Reports" description="Analytics and performance reports" link="/school/reports" color="bg-orange-500" />
      </div>

      {/* Recent Activity */}
      <Card className="mt-8 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
        <div className="space-y-4">
          {[
            { action: 'New student enrolled', detail: 'Ahmed joined Grade 5', time: '2 hours ago' },
            { action: 'Course completed', detail: 'Mathematics 101 - 15 students', time: '1 day ago' },
            { action: 'Event created', detail: 'Science Fair 2026', time: '2 days ago' },
            { action: 'Certificate issued', detail: '15 certificates for Mathematics 101', time: '3 days ago' },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
              <div>
                <p className="font-medium text-gray-900">{item.action}</p>
                <p className="text-sm text-gray-500">{item.detail}</p>
              </div>
              <span className="text-sm text-gray-400">{item.time}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-gray-100 text-gray-600">{icon}</div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-500">{label}</p>
        </div>
      </div>
    </Card>
  );
}

function QuickLinkCard({ title, description, link, color }: { title: string; description: string; link: string; color: string }) {
  return (
    <Link to={link}>
      <Card className="p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 cursor-pointer h-full">
        <div className={`w-12 h-12 rounded-lg ${color} text-white flex items-center justify-center mb-4`}>
          <Settings className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
        <p className="text-sm text-gray-500">{description}</p>
      </Card>
    </Link>
  );
}

function SchoolDashboardSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <Skeleton className="h-10 w-48" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-20" />)}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32" />)}
      </div>
    </div>
  );
}
