import { Link } from 'react-router-dom';
import { DollarSign, TrendingUp, Wallet, BarChart3 } from 'lucide-react';
import { Card } from '@shared/components/ui/Card';
import { Skeleton } from '@shared/components/ui/Skeleton';
import { useCurrentUser } from '@features/auth/hooks/useAuth';

export function FinanceManagerDashboardPage() {
  const { data: user, isLoading } = useCurrentUser();
  if (isLoading) return <FinanceManagerDashboardSkeleton />;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Finance Dashboard</h1>
        <p className="text-gray-500 mt-1">Welcome back, {user?.firstName}! Monitor revenue and payouts.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={<DollarSign className="h-5 w-5" />} label="Total Revenue" value="AED 245K" color="bg-green-500" change={{ value: 12, isPositive: true }} />
        <StatCard icon={<TrendingUp className="h-5 w-5" />} label="Monthly Revenue" value="AED 45K" color="bg-blue-500" change={{ value: 8, isPositive: true }} />
        <StatCard icon={<Wallet className="h-5 w-5" />} label="Pending Payouts" value="AED 12K" color="bg-yellow-500" />
        <StatCard icon={<BarChart3 className="h-5 w-5" />} label="Commission Rate" value="15%" color="bg-purple-500" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <QuickLinkCard title="Revenue Reports" description="View detailed revenue analytics" link="/admin/finance/revenue" color="bg-green-500" />
        <QuickLinkCard title="Manage Payouts" description="Process vendor and teacher payouts" link="/admin/payouts" color="bg-blue-500" />
        <QuickLinkCard title="Commission Settings" description="Configure commission rates" link="/admin/commissions" color="bg-purple-500" />
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color, change }: { icon: React.ReactNode; label: string; value: string; color: string; change?: { value: number; isPositive: boolean } }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg ${color} text-white flex items-center justify-center`}>{icon}</div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-500">{label}</p>
          {change && <p className={`text-xs mt-1 ${change.isPositive ? 'text-green-600' : 'text-red-600'}`}>{change.isPositive ? '↑' : '↓'} {change.value}%</p>}
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
          <DollarSign className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
        <p className="text-sm text-gray-500">{description}</p>
      </Card>
    </Link>
  );
}

function FinanceManagerDashboardSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <Skeleton className="h-10 w-48" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-20" />)}</div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">{[1,2,3].map(i => <Skeleton key={i} className="h-32" />)}</div>
    </div>
  );
}
