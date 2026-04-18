import { Activity, Database, Cpu, HardDrive, Clock, Server } from 'lucide-react';
import { Card } from '@shared/components/ui/Card';
import { Badge } from '@shared/components/ui/Badge';
import { PageHeader } from '@shared/components/common/PageHeader';
import { Skeleton } from '@shared/components/ui/Skeleton';
import { useSystemHealth, useDatabaseStats } from '@features/admin/hooks/useSuperAdmin';

export function SystemHealthPage() {
  const { data: healthData, isLoading: healthLoading } = useSystemHealth();
  const { data: dbData, isLoading: dbLoading } = useDatabaseStats();

  const health = healthData?.health;
  const db = dbData?.stats;

  if (healthLoading || dbLoading) return <PageSkeleton />;

  const statusColor = health?.status === 'healthy' ? 'success' : health?.status === 'degraded' ? 'warning' : 'danger';
  const uptimeHours = Math.floor((health?.uptime || 0) / 3600);
  const uptimeDays = Math.floor(uptimeHours / 24);
  const memUsedMB = ((health?.memory?.used || 0) / 1024 / 1024).toFixed(0);
  const memTotalMB = ((health?.memory?.total || 0) / 1024 / 1024).toFixed(0);
  const memPercent = health?.memory?.total ? ((health.memory.used / health.memory.total) * 100).toFixed(1) : '0';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <PageHeader title="System Health" description="Monitor server health, database stats, and system resources" />

      {/* Status Overview */}
      <Card className="p-6 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Activity className={`h-8 w-8 ${health?.status === 'healthy' ? 'text-green-500' : health?.status === 'degraded' ? 'text-yellow-500' : 'text-red-500'}`} />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">System Status</h2>
              <p className="text-sm text-gray-500">Last checked: {new Date().toLocaleTimeString()}</p>
            </div>
          </div>
          <Badge variant={statusColor as any} className="text-lg px-4 py-2">{health?.status?.toUpperCase()}</Badge>
        </div>
      </Card>

      {/* Resource Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <ResourceCard icon={<Cpu className="h-5 w-5" />} title="CPU" value={`${health?.cpu?.cores || 0} Cores`} detail={`Load: ${(health?.cpu?.loadAvg?.[0] || 0).toFixed(2)}`} />
        <ResourceCard icon={<HardDrive className="h-5 w-5" />} title="Memory" value={`${memUsedMB}MB / ${memTotalMB}MB`} detail={`${memPercent}% used`} />
        <ResourceCard icon={<Database className="h-5 w-5" />} title="Database" value={`${db?.collections || 0} Collections`} detail={`${db?.numObjects || 0} connections`} />
        <ResourceCard icon={<Clock className="h-5 w-5" />} title="Uptime" value={`${uptimeDays}d ${uptimeHours % 24}h`} detail={`Node ${health?.nodeVersion}`} />
      </div>

      {/* Detailed Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><Server className="h-5 w-5" /> Server Information</h2>
          <div className="space-y-3 text-sm">
            <InfoRow label="Platform" value={health?.platform || '—'} />
            <InfoRow label="Node Version" value={health?.nodeVersion || '—'} />
            <InfoRow label="CPU Cores" value={String(health?.cpu?.cores || 0)} />
            <InfoRow label="Load Average (1m)" value={(health?.cpu?.loadAvg?.[0] || 0).toFixed(2)} />
            <InfoRow label="Load Average (5m)" value={(health?.cpu?.loadAvg?.[1] || 0).toFixed(2)} />
            <InfoRow label="Load Average (15m)" value={(health?.cpu?.loadAvg?.[2] || 0).toFixed(2)} />
            <InfoRow label="Memory Used" value={`${memUsedMB}MB`} />
            <InfoRow label="Memory Total" value={`${memTotalMB}MB`} />
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><Database className="h-5 w-5" /> Database Information</h2>
          <div className="space-y-3 text-sm">
            <InfoRow label="Collections" value={String(db?.collections || 0)} />
            <InfoRow label="Active Connections" value={String(db?.numObjects || 0)} />
            <InfoRow label="Data Size" value={formatBytes(db?.dataSize || 0)} />
            <InfoRow label="Index Size" value={formatBytes(db?.indexSize || 0)} />
          </div>
        </Card>
      </div>
    </div>
  );
}

function ResourceCard({ icon, title, value, detail }: { icon: React.ReactNode; title: string; value: string; detail: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-blue-500 text-white flex items-center justify-center">{icon}</div>
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-lg font-bold text-gray-900">{value}</p>
          <p className="text-xs text-gray-400">{detail}</p>
        </div>
      </div>
    </Card>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function PageSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-20" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-20" />)}</div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">{[1,2].map(i => <Skeleton key={i} className="h-64" />)}</div>
    </div>
  );
}
