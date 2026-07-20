import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, X, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import notificationTemplateAPI, {
  NotificationTemplate,
  NotificationTemplateCreate,
  NotificationTemplateUpdate,
} from '@/services/api/notificationTemplateAPI';
import Button from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Badge from '@/components/ui/Badge';

const CHANNEL_OPTIONS = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'sms', label: 'SMS' },
  { value: 'email', label: 'Email' },
  { value: 'email_marketing', label: 'Email Marketing' },
];

const PURPOSE_OPTIONS = [
  { value: 'otp', label: 'OTP' },
  { value: 'transactional', label: 'Transactional' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'admin_alert', label: 'Admin Alert' },
];

interface EditState {
  providerTemplateName: string;
  bodyText: string;
  requiredVariablesCsv: string;
  isEnabled: boolean;
  isApprovedOnProvider: boolean;
}

const toEditState = (t: NotificationTemplate): EditState => ({
  providerTemplateName: t.providerTemplateName,
  bodyText: t.bodyText || '',
  requiredVariablesCsv: t.requiredVariables.join(', '),
  isEnabled: t.isEnabled,
  isApprovedOnProvider: t.isApprovedOnProvider,
});

const emptyCreateForm = {
  key: '',
  channel: 'whatsapp',
  provider: 'cunnekt',
  purpose: 'transactional',
  providerTemplateName: '',
  bodyText: '',
  requiredVariablesCsv: '',
};

const NotificationTemplatesTab: React.FC = () => {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreateForm);

  const { data: templates, isLoading } = useQuery({
    queryKey: ['notification-templates'],
    queryFn: () => notificationTemplateAPI.list(),
    staleTime: 30 * 1000,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: NotificationTemplateUpdate }) =>
      notificationTemplateAPI.update(id, payload),
    onSuccess: () => {
      toast.success('Template updated');
      queryClient.invalidateQueries({ queryKey: ['notification-templates'] });
      setEditingId(null);
      setEditState(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update template');
    },
  });

  const createMutation = useMutation({
    mutationFn: (payload: NotificationTemplateCreate) => notificationTemplateAPI.create(payload),
    onSuccess: () => {
      toast.success('Template created');
      queryClient.invalidateQueries({ queryKey: ['notification-templates'] });
      setShowCreate(false);
      setCreateForm(emptyCreateForm);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create template');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => notificationTemplateAPI.remove(id),
    onSuccess: () => {
      toast.success('Template deleted');
      queryClient.invalidateQueries({ queryKey: ['notification-templates'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete template');
    },
  });

  const startEdit = (t: NotificationTemplate) => {
    setEditingId(t._id);
    setEditState(toEditState(t));
  };

  const saveEdit = (id: string) => {
    if (!editState) return;
    updateMutation.mutate({
      id,
      payload: {
        providerTemplateName: editState.providerTemplateName,
        bodyText: editState.bodyText,
        requiredVariables: editState.requiredVariablesCsv
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean),
        isEnabled: editState.isEnabled,
        isApprovedOnProvider: editState.isApprovedOnProvider,
      },
    });
  };

  const submitCreate = () => {
    if (!createForm.key || !createForm.providerTemplateName) {
      toast.error('Key and Cunnekt Template ID are required');
      return;
    }
    createMutation.mutate({
      key: createForm.key.trim(),
      channel: createForm.channel as NotificationTemplateCreate['channel'],
      provider: createForm.provider.trim(),
      purpose: createForm.purpose as NotificationTemplateCreate['purpose'],
      providerTemplateName: createForm.providerTemplateName.trim(),
      bodyText: createForm.bodyText,
      requiredVariables: createForm.requiredVariablesCsv
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean),
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Notification Templates</CardTitle>
        <Button
          size="sm"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setShowCreate((v) => !v)}
        >
          New Template
        </Button>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-500 mb-4">
          Each row is a <code>NotificationTemplate</code> document. <strong>Cunnekt Template ID</strong> is the
          value actually sent to Cunnekt's API (their <code>templateid</code>) — fill it in once the matching
          template is created and approved on Cunnekt's dashboard. <strong>Body copy</strong> is local-only, used
          for the admin preview/test-send — it's never sent to Cunnekt.
        </p>

        {showCreate && (
          <div className="mb-6 rounded-lg border border-gray-200 p-4 space-y-3">
            <div className="grid md:grid-cols-2 gap-3">
              <Input
                label="Template Key"
                placeholder="e.g. custom_new_flow"
                value={createForm.key}
                onChange={(e) => setCreateForm({ ...createForm, key: e.target.value })}
              />
              <Input
                label="Cunnekt Template ID"
                placeholder="templateid from Cunnekt dashboard"
                value={createForm.providerTemplateName}
                onChange={(e) => setCreateForm({ ...createForm, providerTemplateName: e.target.value })}
              />
              <Select
                label="Channel"
                value={createForm.channel}
                onChange={(e) => setCreateForm({ ...createForm, channel: e.target.value })}
                options={CHANNEL_OPTIONS}
              />
              <Select
                label="Purpose"
                value={createForm.purpose}
                onChange={(e) => setCreateForm({ ...createForm, purpose: e.target.value })}
                options={PURPOSE_OPTIONS}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 block">Body copy (local preview only)</label>
              <textarea
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-400"
                rows={3}
                placeholder="Hi {{customer_name}}, ..."
                value={createForm.bodyText}
                onChange={(e) => setCreateForm({ ...createForm, bodyText: e.target.value })}
              />
            </div>
            <Input
              label="Required variables (comma-separated)"
              placeholder="customer_name, order_id"
              value={createForm.requiredVariablesCsv}
              onChange={(e) => setCreateForm({ ...createForm, requiredVariablesCsv: e.target.value })}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                leftIcon={<Save className="w-4 h-4" />}
                onClick={submitCreate}
                loading={createMutation.isPending}
              >
                Create
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {isLoading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : !templates || templates.length === 0 ? (
          <p className="text-sm text-gray-500">No templates found.</p>
        ) : (
          <div className="space-y-3">
            {templates.map((t) => (
              <div key={t._id} className="rounded-lg border border-gray-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs text-gray-500">{t.key}</p>
                    <p className="font-semibold text-gray-900">
                      {t.providerTemplateName || <span className="text-red-500">no template ID set</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="secondary">{t.channel}</Badge>
                    <Badge variant="secondary">{t.purpose}</Badge>
                    <Badge variant={t.isEnabled ? 'success' : 'error'}>
                      {t.isEnabled ? 'enabled' : 'disabled'}
                    </Badge>
                    <Badge variant={t.isApprovedOnProvider ? 'success' : 'warning'}>
                      {t.isApprovedOnProvider ? 'approved' : 'not approved'}
                    </Badge>
                    {editingId === t._id ? (
                      <Button size="sm" variant="outline" onClick={() => { setEditingId(null); setEditState(null); }}>
                        <X className="w-3 h-3" />
                      </Button>
                    ) : (
                      <>
                        <Button size="sm" variant="outline" onClick={() => startEdit(t)}>
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (confirm(`Delete template "${t.key}"?`)) deleteMutation.mutate(t._id);
                          }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {editingId === t._id && editState ? (
                  <div className="mt-3 space-y-3 border-t border-gray-100 pt-3">
                    <Input
                      label="Cunnekt Template ID"
                      value={editState.providerTemplateName}
                      onChange={(e) => setEditState({ ...editState, providerTemplateName: e.target.value })}
                    />
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700 block">Body copy (local preview only)</label>
                      <textarea
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-400"
                        rows={3}
                        value={editState.bodyText}
                        onChange={(e) => setEditState({ ...editState, bodyText: e.target.value })}
                      />
                    </div>
                    <Input
                      label="Required variables (comma-separated)"
                      value={editState.requiredVariablesCsv}
                      onChange={(e) => setEditState({ ...editState, requiredVariablesCsv: e.target.value })}
                    />
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={editState.isEnabled}
                          onChange={(e) => setEditState({ ...editState, isEnabled: e.target.checked })}
                        />
                        Enabled
                      </label>
                      <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={editState.isApprovedOnProvider}
                          onChange={(e) =>
                            setEditState({ ...editState, isApprovedOnProvider: e.target.checked })
                          }
                        />
                        Approved on Cunnekt
                      </label>
                    </div>
                    <Button
                      size="sm"
                      leftIcon={<Save className="w-4 h-4" />}
                      onClick={() => saveEdit(t._id)}
                      loading={updateMutation.isPending}
                    >
                      Save
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">
                    {t.bodyText || <span className="text-gray-400 italic">no local body copy set</span>}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default NotificationTemplatesTab;
