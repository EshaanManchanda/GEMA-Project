import { useState } from 'react';
import { Key, Trash2, Copy, Plus } from 'lucide-react';
import { Card } from '@shared/components/ui/Card';
import { Button } from '@shared/components/ui/Button';
import { Badge } from '@shared/components/ui/Badge';
import { Modal } from '@shared/components/ui/Modal';
import { Input } from '@shared/components/ui/Input';
import { PageHeader } from '@shared/components/common/PageHeader';
import { Skeleton } from '@shared/components/ui/Skeleton';
import { useApiKeys, useGenerateApiKey, useRevokeApiKey } from '@features/admin/hooks/useSuperAdmin';
import { notification } from '@shared/services/notification.service';

export function ApiKeysPage() {
  const { data, isLoading } = useApiKeys();
  const generateKey = useGenerateApiKey();
  const revokeKey = useRevokeApiKey();

  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', scopes: 'read:all' });
  const [generatedKey, setGeneratedKey] = useState('');

  const apiKeys = data?.apiKeys || [];

  const handleGenerate = async () => {
    if (!formData.name) { notification.error('Key name is required'); return; }
    try {
      const result = await generateKey.mutateAsync({ name: formData.name, scopes: formData.scopes.split(',').map(s => s.trim()) });
      setGeneratedKey(result.apiKey?.key || '');
      notification.success('API key generated — copy it now, it won\'t be shown again!');
    } catch (err: any) {
      notification.error(err.response?.data?.message || 'Failed to generate key');
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this API key?')) return;
    try {
      await revokeKey.mutateAsync(id);
      notification.success('API key revoked');
    } catch (err: any) {
      notification.error(err.response?.data?.message || 'Failed to revoke');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    notification.success('Copied to clipboard');
  };

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <PageHeader title="API Keys" description="Manage API keys for platform integrations" actions={<Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => { setShowModal(true); setGeneratedKey(''); }}>Generate Key</Button>} />

      {generatedKey && (
        <Card className="p-4 mb-6 bg-yellow-50 border-yellow-200">
          <p className="text-sm font-medium text-yellow-800 mb-2">⚠️ Copy this key now — it won't be shown again!</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-white px-3 py-2 rounded text-sm font-mono">{generatedKey}</code>
            <Button variant="ghost" size="sm" onClick={() => copyToClipboard(generatedKey)}><Copy className="h-4 w-4" /></Button>
          </div>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="divide-y divide-gray-200">
          {apiKeys.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No API keys generated yet</div>
          ) : (
            apiKeys.map((key: any) => (
              <div key={key._id} className="flex items-center justify-between p-4 hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <Key className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">{key.name}</p>
                    <p className="text-xs text-gray-500 font-mono">{key.key.substring(0, 20)}...</p>
                    <p className="text-xs text-gray-400">Scopes: {key.scopes?.join(', ')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={key.isActive ? 'success' : 'default'}>{key.isActive ? 'Active' : 'Revoked'}</Badge>
                  {key.isActive && (
                    <button onClick={() => handleRevoke(key._id)} className="p-1 text-red-600 hover:bg-red-50 rounded"><Trash2 className="h-4 w-4" /></button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Generate API Key" size="md">
        <div className="space-y-4">
          <Input label="Key Name" placeholder="e.g., Production API" value={formData.name} onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))} />
          <Input label="Scopes" placeholder="read:all, write:events" value={formData.scopes} onChange={(e) => setFormData(f => ({ ...f, scopes: e.target.value }))} helperText="Comma-separated scopes" />
          <div className="flex gap-2 justify-end pt-4">
            <Button variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleGenerate} isLoading={generateKey.isPending}>Generate</Button>
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
