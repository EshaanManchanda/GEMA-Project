import { useState } from 'react';
import { Plus, Trash2, Ban, RotateCcw } from 'lucide-react';
import { Card } from '@shared/components/ui/Card';
import { Button } from '@shared/components/ui/Button';
import { Badge } from '@shared/components/ui/Badge';
import { Modal } from '@shared/components/ui/Modal';
import { Input } from '@shared/components/ui/Input';
import { FormSelect } from '@shared/components/forms/FormSelect';
import { PageHeader } from '@shared/components/common/PageHeader';
import { Skeleton } from '@shared/components/ui/Skeleton';
import {
  useAdminRoles,
  useCreateAdminRole,
  useDeleteAdminRole,
  useSuspendAdmin,
  useReinstateAdmin,
} from '@features/admin/hooks/useSuperAdmin';
import { notification } from '@shared/services/notification.service';

const ADMIN_ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'moderator', label: 'Moderator' },
  { value: 'blog_writer', label: 'Blog Writer' },
  { value: 'support_agent', label: 'Support Agent' },
  { value: 'content_manager', label: 'Content Manager' },
  { value: 'finance_manager', label: 'Finance Manager' },
];

export function AdminManagementPage() {
  const { data, isLoading } = useAdminRoles();
  const createAdmin = useCreateAdminRole();
  const deleteAdmin = useDeleteAdminRole();
  const suspendAdmin = useSuspendAdmin();
  const reinstateAdmin = useReinstateAdmin();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({ userId: '', role: 'admin', notes: '' });

  const admins = data?.adminRoles || [];
  const pagination = data?.pagination;

  const handleCreate = async () => {
    if (!formData.userId) { notification.error('User ID is required'); return; }
    try {
      await createAdmin.mutateAsync(formData);
      notification.success('Admin role created');
      setShowCreateModal(false);
      setFormData({ userId: '', role: 'admin', notes: '' });
    } catch (err: any) {
      notification.error(err.response?.data?.message || 'Failed to create admin role');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this admin role?')) return;
    try {
      await deleteAdmin.mutateAsync(id);
      notification.success('Admin role deleted');
    } catch (err: any) {
      notification.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  const handleSuspend = async (id: string) => {
    try {
      await suspendAdmin.mutateAsync({ id, reason: 'Suspended by Super Admin' });
      notification.success('Admin suspended');
    } catch (err: any) {
      notification.error(err.response?.data?.message || 'Failed to suspend');
    }
  };

  const handleReinstate = async (id: string) => {
    try {
      await reinstateAdmin.mutateAsync(id);
      notification.success('Admin reinstated');
    } catch (err: any) {
      notification.error(err.response?.data?.message || 'Failed to reinstate');
    }
  };

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <PageHeader
        title="Admin Management"
        description="Manage platform administrators and their permissions"
        actions={<Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setShowCreateModal(true)}>Create Admin</Button>}
      />

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned By</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned At</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {admins.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">No admin roles found</td></tr>
              ) : (
                admins.map((admin: any) => (
                  <tr key={admin._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-900">{admin.userId?.firstName} {admin.userId?.lastName}</p>
                      <p className="text-xs text-gray-500">{admin.userId?.email}</p>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="primary">{admin.role}</Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={admin.isActive ? 'success' : 'danger'}>{admin.isActive ? 'Active' : 'Inactive'}</Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{admin.assignedBy?.firstName} {admin.assignedBy?.lastName}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{new Date(admin.assignedAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {admin.isActive ? (
                          <button onClick={() => handleSuspend(admin._id)} className="p-1 text-yellow-600 hover:bg-yellow-50 rounded" title="Suspend"><Ban className="h-4 w-4" /></button>
                        ) : (
                          <button onClick={() => handleReinstate(admin._id)} className="p-1 text-green-600 hover:bg-green-50 rounded" title="Reinstate"><RotateCcw className="h-4 w-4" /></button>
                        )}
                        <button onClick={() => handleDelete(admin._id)} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Delete"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination && pagination.totalPages > 1 && (
          <div className="px-6 py-3 flex items-center justify-between border-t border-gray-200">
            <p className="text-sm text-gray-500">Showing {pagination.total} admin roles</p>
          </div>
        )}
      </Card>

      {/* Create Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create Admin Role" size="md">
        <div className="space-y-4">
          <Input label="User ID" placeholder="Enter user MongoDB ID" value={formData.userId} onChange={(e) => setFormData(f => ({ ...f, userId: e.target.value }))} />
          <FormSelect label="Role" options={ADMIN_ROLES} value={formData.role} onChange={(e) => setFormData(f => ({ ...f, role: e.target.value }))} />
          <Input label="Notes" placeholder="Optional notes" value={formData.notes} onChange={(e) => setFormData(f => ({ ...f, notes: e.target.value }))} />
          <div className="flex gap-2 justify-end pt-4">
            <Button variant="ghost" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button onClick={handleCreate} isLoading={createAdmin.isPending}>Create</Button>
          </div>
        </div>
      </Modal>
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
