import { ToggleLeft, ToggleRight } from 'lucide-react';
import { Card } from '@shared/components/ui/Card';
import { Button } from '@shared/components/ui/Button';
import { Badge } from '@shared/components/ui/Badge';
import { PageHeader } from '@shared/components/common/PageHeader';
import { Skeleton } from '@shared/components/ui/Skeleton';
import { useFeatureFlags, useUpdateFeatureFlag } from '@features/admin/hooks/useSuperAdmin';
import { notification } from '@shared/services/notification.service';

export function FeatureFlagsPage() {
  const { data, isLoading } = useFeatureFlags();
  const updateFlag = useUpdateFeatureFlag();

  const flags = data?.flags || [];

  const handleToggle = async (key: string, currentValue: boolean) => {
    try {
      await updateFlag.mutateAsync({ key, value: !currentValue });
      notification.success(`Feature flag "${key}" updated`);
    } catch (err: any) {
      notification.error(err.response?.data?.message || 'Failed to update flag');
    }
  };

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <PageHeader title="Feature Flags" description="Toggle platform features on and off" />

      <Card className="overflow-hidden">
        <div className="divide-y divide-gray-200">
          {flags.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No feature flags configured. Toggle any feature to create one.</div>
          ) : (
            flags.map((flag: any) => (
              <div key={flag.key} className="flex items-center justify-between p-4 hover:bg-gray-50">
                <div>
                  <p className="font-medium text-gray-900">{flag.key}</p>
                  <p className="text-sm text-gray-500">{flag.description}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={flag.value ? 'success' : 'default'}>{flag.value ? 'Enabled' : 'Disabled'}</Badge>
                  <button onClick={() => handleToggle(flag.key, flag.value)} className="p-1 hover:bg-gray-100 rounded transition-colors">
                    {flag.value ? <ToggleRight className="h-6 w-6 text-green-500" /> : <ToggleLeft className="h-6 w-6 text-gray-400" />}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Quick Toggle Buttons */}
      <Card className="p-6 mt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Toggles</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { key: 'maintenance_mode', label: 'Maintenance Mode', desc: 'Show maintenance page to all users' },
            { key: 'disable_registrations', label: 'Disable Registrations', desc: 'Prevent new user signups' },
            { key: 'disable_payments', label: 'Disable Payments', desc: 'Pause all payment processing' },
            { key: 'enable_lms', label: 'Enable LMS', desc: 'Show LMS features to users' },
            { key: 'enable_exams', label: 'Enable Exams', desc: 'Show exam features to users' },
            { key: 'enable_erp', label: 'Enable ERP', desc: 'Show ERP features to schools' },
          ].map((item) => {
            const flag = flags.find((f: any) => f.key === item.key);
            const value = flag?.value || false;
            return (
              <Card key={item.key} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{item.label}</p>
                    <p className="text-xs text-gray-500">{item.desc}</p>
                  </div>
                  <Button variant={value ? 'primary' : 'ghost'} size="sm" onClick={() => handleToggle(item.key, value)}>
                    {value ? 'ON' : 'OFF'}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-96" />
    </div>
  );
}
