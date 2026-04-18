import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, BookOpen, Calendar, Settings, Plus } from 'lucide-react';
import { Card } from '@shared/components/ui/Card';

import { Button } from '@shared/components/ui/Button';
import { Skeleton } from '@shared/components/ui/Skeleton';
import { useCurrentUser } from '@features/auth/hooks/useAuth';

export function ParentDashboardPage() {
  const { data: user, isLoading } = useCurrentUser();
  const [selectedChild, setSelectedChild] = useState(0);

  // Mock children data — will be replaced with API call
  const children = [
    { id: '1', name: 'Ahmed', grade: 'Grade 5', school: 'Dubai International Academy', events: 3, courses: 2, certificates: 1 },
    { id: '2', name: 'Sara', grade: 'Grade 3', school: 'Dubai International Academy', events: 2, courses: 1, certificates: 0 },
  ];

  if (isLoading) return <ParentDashboardSkeleton />;

  const child = children[selectedChild];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Parent Dashboard</h1>
          <p className="text-gray-500 mt-1">Welcome back, {user?.firstName}!</p>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" />}>Add Child</Button>
      </div>

      {/* Child Selector */}
      <div className="flex gap-3 mb-8 overflow-x-auto pb-2">
        {children.map((c, i) => (
          <button
            key={c.id}
            onClick={() => setSelectedChild(i)}
            className={`flex-shrink-0 px-4 py-3 rounded-lg border-2 transition-all ${
              i === selectedChild ? 'border-primary bg-primary-lighter text-primary' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
                i === 0 ? 'bg-blue-500' : 'bg-pink-500'
              }`}>
                {c.name[0]}
              </div>
              <div className="text-left">
                <p className="font-medium">{c.name}</p>
                <p className="text-xs text-gray-500">{c.grade}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Child Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={<Calendar className="h-5 w-5" />} label="Events" value={child.events.toString()} />
        <StatCard icon={<BookOpen className="h-5 w-5" />} label="Courses" value={child.courses.toString()} />
        <StatCard icon={<Users className="h-5 w-5" />} label="School" value={child.school.split(' ')[0]} />
        <StatCard icon={<Calendar className="h-5 w-5" />} label="Certificates" value={child.certificates.toString()} />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <QuickLinkCard title="Book Event" description="Find and book events for your child" link="/events" color="bg-blue-500" />
        <QuickLinkCard title="View Certificates" description="Download your child's certificates" link={`/parent/children/${child.id}/certificates`} color="bg-purple-500" />
        <QuickLinkCard title="Manage Profile" description="Update your child's information" link="/parent/children" color="bg-green-500" />
      </div>
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

function ParentDashboardSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <Skeleton className="h-10 w-48" />
      <div className="flex gap-3">
        {[1, 2].map((i) => <Skeleton key={i} className="h-16 w-48" />)}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20" />)}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}
      </div>
    </div>
  );
}
