import { Link } from 'react-router-dom';
import { Calendar, Award, BookOpen, Clock, GraduationCap } from 'lucide-react';
import { Card } from '@shared/components/ui/Card';

import { Skeleton } from '@shared/components/ui/Skeleton';
import { useCurrentUser } from '@features/auth/hooks/useAuth';

export function StudentDashboardPage() {
  const { data: user, isLoading } = useCurrentUser();

  if (isLoading) return <StudentDashboardSkeleton />;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {user?.firstName}! 👋
        </h1>
        <p className="text-gray-500 mt-1">Here's what's happening with your learning journey.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={<BookOpen className="h-5 w-5" />} label="Active Courses" value="3" color="bg-blue-50 text-blue-600" />
        <StatCard icon={<Calendar className="h-5 w-5" />} label="Upcoming Events" value="5" color="bg-green-50 text-green-600" />
        <StatCard icon={<Award className="h-5 w-5" />} label="Certificates" value="2" color="bg-purple-50 text-purple-600" />
        <StatCard icon={<Clock className="h-5 w-5" />} label="Hours Learned" value="24" color="bg-orange-50 text-orange-600" />
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <QuickLinkCard
          title="My Enrollments"
          description="View your active courses and events"
          icon={<BookOpen className="h-6 w-6" />}
          link="/student/enrollments"
          color="bg-blue-500"
        />
        <QuickLinkCard
          title="My Certificates"
          description="Download your earned certificates"
          icon={<GraduationCap className="h-6 w-6" />}
          link="/student/certificates"
          color="bg-purple-500"
        />
        <QuickLinkCard
          title="Attendance"
          description="View your attendance history"
          icon={<Calendar className="h-6 w-6" />}
          link="/student/attendance"
          color="bg-green-500"
        />
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${color}`}>{icon}</div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-500">{label}</p>
        </div>
      </div>
    </Card>
  );
}

function QuickLinkCard({ title, description, icon, link, color }: { title: string; description: string; icon: React.ReactNode; link: string; color: string }) {
  return (
    <Link to={link}>
      <Card className="p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 cursor-pointer h-full">
        <div className={`w-12 h-12 rounded-lg ${color} text-white flex items-center justify-center mb-4`}>
          {icon}
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
        <p className="text-sm text-gray-500">{description}</p>
      </Card>
    </Link>
  );
}

export function StudentDashboardSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-4 w-96" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20" />)}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}
      </div>
    </div>
  );
}
