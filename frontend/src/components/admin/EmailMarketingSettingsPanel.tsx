import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import communicationAPI, {
  EmailMarketingSecretField,
  EmailMarketingSettingsPatch,
} from '@/services/api/communicationAPI';

type Provider = 'dev' | 'sender' | 'mailchimp';

const SECRET_FIELDS: Record<Provider, { field: EmailMarketingSecretField; label: string }[]> = {
  dev: [],
  sender: [
    { field: 'senderApiKey', label: 'Sender API key' },
    { field: 'senderWebhookSecret', label: 'Webhook secret' },
  ],
  mailchimp: [
    { field: 'mailchimpApiKey', label: 'Mailchimp API key' },
    { field: 'mailchimpWebhookSecret', label: 'Webhook secret' },
  ],
};

const SOURCE_LABEL = { database: 'saved here', environment: 'from server environment', none: 'not set' };

const inputCls =
  'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary';

const EmailMarketingSettingsPanel: React.FC = () => {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['email-marketing-settings'],
    queryFn: communicationAPI.getEmailMarketingSettings,
  });

  const [provider, setProvider] = useState<Provider>('dev');
  const [plain, setPlain] = useState({ senderListId: '', mailchimpServerPrefix: '', mailchimpAudienceId: '' });
  // Secret inputs start empty: blank = keep the stored value.
  const [secrets, setSecrets] = useState<Partial<Record<EmailMarketingSecretField, string>>>({});
  const [cleared, setCleared] = useState<Set<EmailMarketingSecretField>>(new Set());

  useEffect(() => {
    if (!data) return;
    setProvider(data.provider);
    setPlain(data.plain);
    setSecrets({});
    setCleared(new Set());
  }, [data]);

  const save = useMutation({
    mutationFn: () => {
      const patch: EmailMarketingSettingsPatch = { provider, ...plain };
      for (const { field } of SECRET_FIELDS[provider]) {
        if (cleared.has(field)) patch[field] = null;
        else if (secrets[field]?.trim()) patch[field] = secrets[field];
      }
      return communicationAPI.updateEmailMarketingSettings(patch);
    },
    onSuccess: () => {
      toast.success('Email marketing settings saved');
      queryClient.invalidateQueries({ queryKey: ['email-marketing-settings'] });
      queryClient.invalidateQueries({ queryKey: ['communication-settings'] });
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to save settings'),
  });

  const test = useMutation({
    mutationFn: communicationAPI.testEmailMarketingConnection,
    onSuccess: (r) => {
      if (r.simulated) toast('Development provider selected — nothing is sent to a real service.');
      else if (r.connected) toast.success(`Connected to ${r.provider}`);
      else toast.error(`Could not connect to ${r.provider}. Check the saved credentials.`);
    },
    onError: (e: any) => toast.error(e?.message || 'Connection test failed'),
  });

  if (isLoading || !data) return <p className="text-sm text-gray-500">Loading...</p>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Email marketing provider</h2>
        <p className="text-sm text-gray-500">
          Connect Sender or Mailchimp. Kidrove keeps your contacts and tags in sync; design campaigns and
          automations in the provider. Values saved here override the server environment variables.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
        <select className={inputCls} value={provider} onChange={(e) => setProvider(e.target.value as Provider)}>
          <option value="dev">Development (log only, nothing is sent)</option>
          <option value="sender">Sender.net</option>
          <option value="mailchimp">Mailchimp</option>
        </select>
        <p className="text-xs text-gray-400 mt-1">Active value is {SOURCE_LABEL[data.providerSource === 'default' ? 'none' : data.providerSource]}.</p>
      </div>

      {provider === 'sender' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Default list / group ID</label>
          <input className={inputCls} value={plain.senderListId} onChange={(e) => setPlain({ ...plain, senderListId: e.target.value })} />
        </div>
      )}

      {provider === 'mailchimp' && (
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Server prefix</label>
            <input
              className={inputCls}
              placeholder="us21"
              value={plain.mailchimpServerPrefix}
              onChange={(e) => setPlain({ ...plain, mailchimpServerPrefix: e.target.value })}
            />
            <p className="text-xs text-gray-400 mt-1">The part after the dash in your API key. Optional.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Audience ID</label>
            <input className={inputCls} value={plain.mailchimpAudienceId} onChange={(e) => setPlain({ ...plain, mailchimpAudienceId: e.target.value })} />
          </div>
        </div>
      )}

      {SECRET_FIELDS[provider].map(({ field, label }) => {
        const s = data.secrets[field];
        const willClear = cleared.has(field);
        return (
          <div key={field}>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <div className="flex gap-2">
              <input
                type="password"
                autoComplete="new-password"
                className={inputCls}
                disabled={willClear}
                placeholder={s.isSet ? `•••••••• (${SOURCE_LABEL[s.source]}) — leave blank to keep` : 'Not set'}
                value={secrets[field] ?? ''}
                onChange={(e) => setSecrets({ ...secrets, [field]: e.target.value })}
              />
              {s.source === 'database' && (
                <button
                  type="button"
                  className="px-3 py-2 text-sm border rounded-md text-gray-600 hover:bg-gray-50 whitespace-nowrap"
                  onClick={() => {
                    const next = new Set(cleared);
                    willClear ? next.delete(field) : next.add(field);
                    setCleared(next);
                  }}
                >
                  {willClear ? 'Undo' : 'Remove'}
                </button>
              )}
            </div>
            {willClear && <p className="text-xs text-amber-600 mt-1">Will be removed on save (falls back to the environment variable, if any).</p>}
          </div>
        );
      })}

      {provider !== 'dev' && (
        <div className="rounded-md bg-gray-50 border p-3 text-xs text-gray-600 space-y-1">
          <p className="font-medium text-gray-700">Unsubscribe webhook</p>
          <p>
            In {provider === 'sender' ? 'Sender' : 'Mailchimp'}, add a webhook for unsubscribes and bounces pointing to
            (your public API address, so use a tunnel such as ngrok while developing):
          </p>
          <code className="block break-all">
            https://&lt;your-api-domain&gt;/api/webhooks/email-marketing/{provider}/&lt;webhook secret&gt;
          </code>
          <p>Opt-outs made there are then mirrored back to Kidrove, so nobody is resubscribed by a later sync.</p>
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          className="px-4 py-2 bg-primary text-white rounded-md disabled:opacity-50"
          onClick={() => save.mutate()}
          disabled={save.isPending}
        >
          {save.isPending ? 'Saving...' : 'Save'}
        </button>
        <button
          type="button"
          className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          onClick={() => test.mutate()}
          disabled={test.isPending}
        >
          {test.isPending ? 'Testing...' : 'Test saved connection'}
        </button>
      </div>
    </div>
  );
};

export default EmailMarketingSettingsPanel;
