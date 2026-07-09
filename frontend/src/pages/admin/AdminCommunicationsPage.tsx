import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageCircle, Send, RefreshCw, CheckCircle2, XCircle, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import communicationAPI from '@/services/api/communicationAPI';
import Button from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Badge from '@/components/ui/Badge';
import PrivatePageSEO from '@/components/common/PrivatePageSEO';

type TabType = 'overview' | 'send-test' | 'logs';

const STATUS_BADGE: Record<string, 'success' | 'warning' | 'error' | 'secondary'> = {
  sent: 'success',
  delivered: 'success',
  read: 'success',
  queued: 'warning',
  failed: 'error',
  bounced: 'error',
  expired: 'error',
  unsubscribed: 'secondary',
};

const AdminCommunicationsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const queryClient = useQueryClient();

  // ---- Overview: connection status ----
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['communication-settings'],
    queryFn: () => communicationAPI.getSettings(),
    staleTime: 60 * 1000,
  });

  const { data: summary } = useQuery({
    queryKey: ['communication-logs-summary'],
    queryFn: () => communicationAPI.getLogsSummary(7),
    staleTime: 60 * 1000,
  });

  const testConnectionMutation = useMutation({
    mutationFn: () => communicationAPI.testWhatsAppConnection(),
    onSuccess: (result) => {
      if (result.connected) {
        toast.success(`Connected to ${result.provider}`);
      } else {
        toast.error(`Could not reach ${result.provider}. Check the API key/number in your environment settings.`);
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Connection check failed');
    },
  });

  // ---- Send test message ----
  const [testForm, setTestForm] = useState({
    to: '',
    templateKey: 'phone_verification_otp',
    varsJson: '{\n  "otp_code": "123456",\n  "expiry_minutes": 10\n}',
  });
  const [previewResult, setPreviewResult] = useState<string | null>(null);

  const parseVars = (): Record<string, string | number> | null => {
    try {
      return JSON.parse(testForm.varsJson || '{}');
    } catch {
      toast.error('Template variables must be valid JSON, e.g. {"otp_code": "123456"}');
      return null;
    }
  };

  const previewMutation = useMutation({
    mutationFn: async () => {
      const vars = parseVars();
      if (!vars) throw new Error('Invalid JSON');
      return communicationAPI.previewWhatsAppTemplate({
        templateKey: testForm.templateKey,
        vars,
      });
    },
    onSuccess: (result) => {
      setPreviewResult(result.rendered);
      if (!result.isEnabled) {
        toast('This template is currently disabled — enable it before sending for real.', { icon: '⚠️' });
      }
    },
    onError: (error: any) => {
      setPreviewResult(null);
      toast.error(error.message || 'Could not preview this template. Check the template key and variables.');
    },
  });

  const testSendMutation = useMutation({
    mutationFn: async () => {
      const vars = parseVars();
      if (!vars) throw new Error('Invalid JSON');
      return communicationAPI.testWhatsAppSend({
        to: testForm.to,
        templateKey: testForm.templateKey,
        vars,
      });
    },
    onSuccess: (log) => {
      toast.success(`Message queued (status: ${log.status})`);
      queryClient.invalidateQueries({ queryKey: ['communication-logs'] });
      queryClient.invalidateQueries({ queryKey: ['communication-logs-summary'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to send test message');
    },
  });

  // ---- Logs ----
  const [logFilters, setLogFilters] = useState({ channel: '', status: '', page: 1 });
  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ['communication-logs', logFilters],
    queryFn: () =>
      communicationAPI.getLogs({
        channel: logFilters.channel || undefined,
        status: logFilters.status || undefined,
        page: logFilters.page,
        limit: 20,
      }),
    enabled: activeTab === 'logs',
    staleTime: 30 * 1000,
  });

  const retryMutation = useMutation({
    mutationFn: (id: string) => communicationAPI.retryLog(id),
    onSuccess: () => {
      toast.success('Message re-queued for delivery');
      queryClient.invalidateQueries({ queryKey: ['communication-logs'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'This message cannot be retried');
    },
  });

  const tabs: { id: TabType; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'send-test', label: 'Send Test Message' },
    { id: 'logs', label: 'Message History' },
  ];

  return (
    <>
      <PrivatePageSEO title="Admin - WhatsApp & Notifications | Kidrove" description="Manage WhatsApp messaging" />

      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <MessageCircle className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">WhatsApp & Notifications</h1>
            <p className="text-sm text-gray-500">
              Manage WhatsApp messages sent to customers — order updates, verification codes, and reminders.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-green-600 text-green-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Connection Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {settingsLoading ? (
                  <p className="text-sm text-gray-500">Checking...</p>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Provider</span>
                      <Badge variant="secondary">{settings?.whatsapp.provider || 'dev'}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">API key configured</span>
                      {settings?.whatsapp.configured ? (
                        <span className="flex items-center gap-1 text-green-700 text-sm">
                          <CheckCircle2 className="w-4 h-4" /> Yes
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-600 text-sm">
                          <XCircle className="w-4 h-4" /> No — messages log locally only
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Test mode</span>
                      <Badge variant={settings?.communication.testMode ? 'warning' : 'success'}>
                        {settings?.communication.testMode ? 'ON — no real messages sent' : 'OFF — sending real messages'}
                      </Badge>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => testConnectionMutation.mutate()}
                      loading={testConnectionMutation.isPending}
                    >
                      Test Connection
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Last 7 Days</CardTitle>
              </CardHeader>
              <CardContent>
                {!summary || Object.keys(summary.byChannelAndStatus).length === 0 ? (
                  <p className="text-sm text-gray-500">No messages sent yet.</p>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(summary.byChannelAndStatus).map(([channel, statuses]) => (
                      <div key={channel}>
                        <p className="text-xs font-semibold uppercase text-gray-400 mb-1">{channel}</p>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(statuses).map(([status, count]) => (
                            <Badge key={status} variant={STATUS_BADGE[status] || 'secondary'}>
                              {status}: {count}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'send-test' && (
          <Card>
            <CardHeader>
              <CardTitle>Send a Test WhatsApp Message</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-500">
                Use this to confirm a message template looks right before it goes out to real customers.
              </p>
              <Input
                label="Phone number (with country code)"
                placeholder="+971501234567"
                value={testForm.to}
                onChange={(e) => setTestForm({ ...testForm, to: e.target.value })}
              />
              <Input
                label="Template key"
                value={testForm.templateKey}
                onChange={(e) => setTestForm({ ...testForm, templateKey: e.target.value })}
              />
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 block">
                  Template variables (JSON)
                </label>
                <textarea
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-400"
                  rows={5}
                  value={testForm.varsJson}
                  onChange={(e) => setTestForm({ ...testForm, varsJson: e.target.value })}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  leftIcon={<Eye className="w-4 h-4" />}
                  onClick={() => previewMutation.mutate()}
                  loading={previewMutation.isPending}
                >
                  Preview
                </Button>
                <Button
                  leftIcon={<Send className="w-4 h-4" />}
                  onClick={() => testSendMutation.mutate()}
                  loading={testSendMutation.isPending}
                  disabled={!testForm.to}
                >
                  Send Test Message
                </Button>
              </div>

              {previewResult && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-xs font-semibold uppercase text-gray-400 mb-2">Preview</p>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{previewResult}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'logs' && (
          <Card>
            <CardHeader>
              <CardTitle>Message History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3 mb-4">
                <Select
                  label="Channel"
                  value={logFilters.channel}
                  onChange={(e) => setLogFilters({ ...logFilters, channel: e.target.value, page: 1 })}
                  options={[
                    { value: '', label: 'All channels' },
                    { value: 'whatsapp', label: 'WhatsApp' },
                    { value: 'sms', label: 'SMS' },
                    { value: 'email', label: 'Email' },
                    { value: 'email_marketing', label: 'Email Marketing' },
                  ]}
                />
                <Select
                  label="Status"
                  value={logFilters.status}
                  onChange={(e) => setLogFilters({ ...logFilters, status: e.target.value, page: 1 })}
                  options={[
                    { value: '', label: 'All statuses' },
                    { value: 'queued', label: 'Queued' },
                    { value: 'sent', label: 'Sent' },
                    { value: 'delivered', label: 'Delivered' },
                    { value: 'read', label: 'Read' },
                    { value: 'failed', label: 'Failed' },
                  ]}
                />
              </div>

              {logsLoading ? (
                <p className="text-sm text-gray-500">Loading...</p>
              ) : !logsData || logsData.logs.length === 0 ? (
                <p className="text-sm text-gray-500">No messages found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase text-gray-400 border-b">
                        <th className="py-2 pr-4">Recipient</th>
                        <th className="py-2 pr-4">Channel</th>
                        <th className="py-2 pr-4">Template</th>
                        <th className="py-2 pr-4">Status</th>
                        <th className="py-2 pr-4">Sent</th>
                        <th className="py-2 pr-4" />
                      </tr>
                    </thead>
                    <tbody>
                      {logsData.logs.map((log) => (
                        <tr key={log._id} className="border-b last:border-0">
                          <td className="py-2 pr-4">{log.recipientPhone || log.recipientEmail || '—'}</td>
                          <td className="py-2 pr-4">{log.channel}</td>
                          <td className="py-2 pr-4">{log.templateKey || '—'}</td>
                          <td className="py-2 pr-4">
                            <Badge variant={STATUS_BADGE[log.status] || 'secondary'}>{log.status}</Badge>
                            {log.errorMessage && (
                              <p className="text-xs text-red-500 mt-1">{log.errorMessage}</p>
                            )}
                          </td>
                          <td className="py-2 pr-4 text-gray-500">
                            {log.sentAt ? new Date(log.sentAt).toLocaleString() : '—'}
                          </td>
                          <td className="py-2 pr-4">
                            {log.status === 'failed' && (
                              <Button
                                size="sm"
                                variant="outline"
                                leftIcon={<RefreshCw className="w-3 h-3" />}
                                onClick={() => retryMutation.mutate(log._id)}
                                loading={retryMutation.isPending}
                              >
                                Retry
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
                    <span>
                      Page {logsData.pagination.page} of {logsData.pagination.pages} ({logsData.pagination.total} total)
                    </span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={logFilters.page <= 1}
                        onClick={() => setLogFilters({ ...logFilters, page: logFilters.page - 1 })}
                      >
                        Previous
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={logFilters.page >= logsData.pagination.pages}
                        onClick={() => setLogFilters({ ...logFilters, page: logFilters.page + 1 })}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
};

export default AdminCommunicationsPage;
