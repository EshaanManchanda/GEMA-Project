import { useState } from 'react';
import { Search, LogOut, UserX } from 'lucide-react';
import { Card } from '@shared/components/ui/Card';
import { Button } from '@shared/components/ui/Button';
import { Input } from '@shared/components/ui/Input';
import { PageHeader } from '@shared/components/common/PageHeader';
import { FormTextarea } from '@shared/components/forms/FormTextarea';
import { useForceLogoutUser, useBulkSuspendUsers } from '@features/admin/hooks/useSuperAdmin';
import { notification } from '@shared/services/notification.service';

export function ImpersonateUserPage() {
  const [userId, setUserId] = useState('');
  const [bulkUserIds, setBulkUserIds] = useState('');
  const [suspendReason, setSuspendReason] = useState('');
  const forceLogout = useForceLogoutUser();
  const bulkSuspend = useBulkSuspendUsers();

  const handleForceLogout = async () => {
    if (!userId) { notification.error('User ID is required'); return; }
    try {
      await forceLogout.mutateAsync(userId);
      notification.success(`User ${userId} has been logged out`);
    } catch (err: any) {
      notification.error(err.response?.data?.message || 'Failed to logout user');
    }
  };

  const handleBulkSuspend = async () => {
    const ids = bulkUserIds.split(',').map(s => s.trim()).filter(Boolean);
    if (ids.length === 0) { notification.error('At least one user ID is required'); return; }
    if (!suspendReason) { notification.error('Reason is required'); return; }
    try {
      const result = await bulkSuspend.mutateAsync({ userIds: ids, reason: suspendReason });
      notification.success(`${result.suspended} users suspended`);
    } catch (err: any) {
      notification.error(err.response?.data?.message || 'Failed to suspend users');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <PageHeader title="User Management" description="Force logout users and bulk suspend accounts" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Force Logout */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <LogOut className="h-6 w-6 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-900">Force Logout User</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">Immediately terminate a user's active session.</p>
          <div className="space-y-4">
            <Input label="User ID" placeholder="Enter user MongoDB ID" value={userId} onChange={(e) => setUserId(e.target.value)} />
            <Button onClick={handleForceLogout} isLoading={forceLogout.isPending} leftIcon={<LogOut className="h-4 w-4" />} fullWidth>
              Force Logout
            </Button>
          </div>
        </Card>

        {/* Bulk Suspend */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <UserX className="h-6 w-6 text-red-500" />
            <h2 className="text-lg font-semibold text-gray-900">Bulk Suspend Users</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">Suspend multiple users at once (max 1000).</p>
          <div className="space-y-4">
            <Input label="User IDs" placeholder="user1, user2, user3" value={bulkUserIds} onChange={(e) => setBulkUserIds(e.target.value)} helperText="Comma-separated MongoDB IDs" />
            <FormTextarea label="Reason" placeholder="Reason for suspension" value={suspendReason} onChange={(e) => setSuspendReason(e.target.value)} rows={3} />
            <Button variant="danger" onClick={handleBulkSuspend} isLoading={bulkSuspend.isPending} leftIcon={<UserX className="h-4 w-4" />} fullWidth>
              Suspend Users
            </Button>
          </div>
        </Card>
      </div>

      {/* Search User */}
      <Card className="p-6 mt-6">
        <div className="flex items-center gap-3 mb-4">
          <Search className="h-6 w-6 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-900">Quick Search</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">Search for users by email, name, or ID to manage their accounts.</p>
        <Input label="Search" placeholder="Search by email, name, or user ID" />
        <p className="text-xs text-gray-400 mt-2">Connect to the users API for full search functionality.</p>
      </Card>
    </div>
  );
}
