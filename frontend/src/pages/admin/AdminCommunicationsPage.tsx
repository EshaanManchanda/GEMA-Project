import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageCircle, Send, RefreshCw, CheckCircle2, XCircle, Eye, BookOpen, AlertTriangle, Copy, LayoutTemplate } from 'lucide-react';
import toast from 'react-hot-toast';
import communicationAPI from '@/services/api/communicationAPI';
import Button from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Badge from '@/components/ui/Badge';
import PrivatePageSEO from '@/components/common/PrivatePageSEO';
import NotificationTemplatesTab from './communications/NotificationTemplatesTab';
import { SAMPLE_WHATSAPP_TEMPLATES } from './communications/sampleWhatsappTemplates';

type TabType = 'overview' | 'send-test' | 'logs' | 'templates' | 'guide';

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
    { id: 'templates', label: 'Templates' },
    { id: 'guide', label: 'Setup Guide' },
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

        {activeTab === 'templates' && <NotificationTemplatesTab />}

        {activeTab === 'guide' && (
          <div className="space-y-6">
            <Card className="border-blue-300 bg-blue-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-900">
                  <BookOpen className="w-5 h-5" /> Quick Start — 6 Steps to Go Live
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-blue-900">
                <p className="mb-3">
                  Follow these in order. Steps marked <Badge variant="secondary">Ask a developer</Badge> need
                  someone with access to the server's settings file — you can't do those from this page.
                </p>
                <ol className="list-decimal list-inside space-y-2.5 pl-1">
                  <li>
                    <strong>Set up Cunnekt.</strong> Create a Cunnekt account and get your WhatsApp Business number
                    approved with them. (Do this on Cunnekt's own website.)
                  </li>
                  <li>
                    <strong>Get an API key.</strong> In the Cunnekt dashboard's left sidebar, click{' '}
                    <strong>API Setup</strong>. Your <strong>Base URL</strong> and <strong>API-KEY</strong> are shown
                    there directly (click <strong>Regenerate Key</strong> if none exists yet).{' '}
                    <Badge variant="secondary">Ask a developer</Badge> to save the API key as{' '}
                    <code>CUNNEKT_API_KEY</code> and the Base URL exactly as shown as{' '}
                    <code>CUNNEKT_BASE_URL</code> (it already includes a version segment, e.g. ends in{' '}
                    <code>/v1</code> — don't add anything extra to it).
                  </li>
                  <li>
                    <strong>Create your message templates in Cunnekt.</strong> See the{' '}
                    <strong>How to Create a Template</strong> card below for exactly which fields to fill in. Use the
                    copy-paste text on the <strong>Sample Template Copy</strong> card as a starting point for the
                    Body field, then submit each one for WhatsApp approval. This can take Cunnekt/Meta a day or two.
                  </li>
                  <li>
                    <strong>Copy the approved template IDs into this app.</strong> Once Cunnekt approves a template,
                    go to the <strong>Templates</strong> tab here, paste in the ID Cunnekt gave you, and mark it{' '}
                    <strong>Approved on Cunnekt</strong>.
                  </li>
                  <li>
                    <strong>Connect the technical pieces.</strong> <Badge variant="secondary">Ask a developer</Badge>{' '}
                    to follow the "Setup Steps" card below — it covers the webhook URL and a couple of settings that
                    need to match exactly what Cunnekt's dashboard shows.
                  </li>
                  <li>
                    <strong>Test, then flip the switch.</strong> Use <strong>Overview → Test Connection</strong>,
                    then <strong>Send Test Message</strong> to send yourself a real one. Once that works, ask a
                    developer to turn off test mode so real customers start receiving messages.
                  </li>
                </ol>
              </CardContent>
            </Card>

            <Card className="border-amber-300 bg-amber-50">
              <CardContent className="flex gap-3 pt-6">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-sm text-amber-900">
                  <p className="font-semibold">Send request is confirmed — one thing still isn't</p>
                  <p className="mt-1">
                    <strong>Confirmed against Cunnekt's own "Template Sending API" docs:</strong> the endpoint
                    (<code>POST {'{CUNNEKT_BASE_URL}'}/sendnotification</code>), headers, and full request body
                    (including how template variables and media headers are passed) all match exactly what{' '}
                    <code>CunnektWhatsAppProvider</code> sends. This is no longer a guess — there's only one
                    supported request shape now (an earlier, never-confirmed second "rest-v1" generation was removed
                    since nothing in Cunnekt's real docs supported it existing).
                  </p>
                  <p className="mt-1">
                    <strong>What's still unconfirmed:</strong> the shape of a <em>successful</em> response — Cunnekt's
                    docs don't show one. <code>CommunicationLog.status</code> still moves to <code>sent</code> on any
                    HTTP 2xx; only the delivery webhook is authoritative for <code>delivered</code>/<code>read</code>/
                    <code>failed</code>. Watch server logs on the first live send —{' '}
                    <code>sendTemplate()</code> logs a warning if no known message-id field is found in the response.
                  </p>
                  <details className="mt-2">
                    <summary className="cursor-pointer font-medium text-amber-800">Technical details (for developers)</summary>
                    <div className="mt-2 space-y-2">
                      <p>
                        Confirmed request body: <code>{'{ mobile, templateid }'}</code> for a template with no
                        variables, or <code>{'{ mobile, templateid, template: { components } }'}</code> when it has
                        body variables and/or a media header — <code>components</code> is an array of{' '}
                        <code>{'{ type: "body" | "header", parameters: [...] }'}</code> blocks, matching Meta's Cloud
                        API component shape. <code>CunnektWhatsAppProvider.buildRequest()</code> builds this exactly;
                        media-header support isn't wired up yet since no current template uses one.
                      </p>
                      <p>
                        <code>CUNNEKT_API_VERSION</code> is deprecated/ignored — leave it unset or{' '}
                        <code>legacy</code>. Any other value just logs a one-time startup warning and has no effect
                        on the request.
                      </p>
                      <p>
                        Also unconfirmed: any webhook signature scheme (none documented — this backend uses a
                        path-embedded secret instead, see Technical Reference below).
                      </p>
                    </div>
                  </details>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LayoutTemplate className="w-5 h-5 text-green-600" /> How to Create a Template in Cunnekt
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-gray-700 space-y-3">
                <p>
                  In the Cunnekt dashboard's left sidebar, click <strong>Templates</strong>, then{' '}
                  <strong>Create Template</strong> (top right). Fill in the form like this:
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase text-gray-400 border-b">
                        <th className="py-2 pr-4">Field</th>
                        <th className="py-2 pr-4">What to put</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      <tr>
                        <td className="py-2 pr-4 font-medium">Select Account</td>
                        <td className="py-2 pr-4">Your approved WhatsApp Business number (already selected if you only have one).</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-4 font-medium">Template Name</td>
                        <td className="py-2 pr-4">
                          Lowercase letters and underscores only (Cunnekt enforces this) — use the same value as{' '}
                          <code>providerTemplateName</code> on the matching row of the <strong>Sample Template
                          Copy</strong> card below, e.g. <code>kidrove_booking_confirmed</code>.
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-4 font-medium">Category</td>
                        <td className="py-2 pr-4">
                          <strong>Utility</strong> for transactional updates (booking, payment, reminders,
                          certificates), <strong>Authentication</strong> for OTP codes. Avoid <strong>Marketing</strong>{' '}
                          for anything this app sends automatically — Marketing-category templates need explicit
                          recipient consent and cost more.
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-4 font-medium">Language</td>
                        <td className="py-2 pr-4">English (or match whatever language the template copy is written in).</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-4 font-medium">Single Message vs Carousel</td>
                        <td className="py-2 pr-4">Use <strong>Single Message</strong> — Carousel is for multi-card catalogs, not used here.</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-4 font-medium">Header</td>
                        <td className="py-2 pr-4">Leave as <strong>None</strong> unless the template needs an image/document attached.</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-4 font-medium">Body</td>
                        <td className="py-2 pr-4">
                          <p>
                            Paste the matching template's body text from the <strong>Sample Template Copy</strong>{' '}
                            card below (max 1024 characters). For each <code>{'{{1}}'}</code>, <code>{'{{2}}'}</code>…
                            in the text, click <strong>+ Add Variable</strong> in the same order they appear — that
                            order is what this app fills in when it sends a real message.
                          </p>
                          <p className="mt-1.5 text-amber-700">
                            <strong>WhatsApp rule:</strong> a variable can't be the first or last thing in the body —
                            Cunnekt rejects it with <em>"Leading or trailing params not allowed"</em>. There must be
                            real words before the first variable and after the last one; a bare period right after
                            the last variable isn't enough. The sample copy below already follows this rule.
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-4 font-medium">Footer</td>
                        <td className="py-2 pr-4">Optional, max 60 characters. Leave blank unless you want a fixed line under every message.</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-4 font-medium">Buttons</td>
                        <td className="py-2 pr-4">
                          Leave off for most templates. Authentication-category templates require a "Copy Code"
                          button — Cunnekt adds this automatically once you pick that category.
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p>
                  Click <strong>Create Template</strong>, then repeat for every row on the{' '}
                  <strong>Sample Template Copy</strong> card below. Each one goes to WhatsApp for approval — this can
                  take Cunnekt/Meta anywhere from a few minutes to a day or two, and can be rejected if the wording
                  looks promotional for a Utility-category template.
                </p>
                <p>
                  Once a template shows <strong>Approved</strong> in Cunnekt's Templates list, copy its exact{' '}
                  <strong>Template Name</strong> into the matching template's <strong>Cunnekt Template ID</strong>{' '}
                  field on the <strong>Templates</strong> tab in this app, and mark it{' '}
                  <strong>Approved on Cunnekt</strong> there too.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-green-600" /> How a Message Actually Gets Sent
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-gray-700">
                <p>
                  When something happens in the app that should notify someone (a booking confirms, a payment goes
                  through, a certificate is ready...), the backend picks the matching message template and fills in
                  the details — it never sends free-typed text.
                </p>
                <ol className="list-decimal list-inside space-y-1 pl-1">
                  <li>The message is logged and queued (you can see this in the <strong>Logs</strong> tab as status "queued").</li>
                  <li>A background worker picks it up and hands it to Cunnekt.</li>
                  <li>If <strong>Test Mode</strong> is on, nothing real is sent — it's just written to the server log so developers can check it safely. Only when Test Mode is off does a real WhatsApp message go out.</li>
                  <li>Once Cunnekt accepts it, the log moves to "sent." Cunnekt then tells this app (via a webhook) when it's actually delivered, read, or failed — that's when you'll see "delivered" / "read" / "failed" in the Logs tab.</li>
                  <li>OTP (verification code) messages try WhatsApp first and automatically fall back to SMS if WhatsApp fails.</li>
                  <li>Every template — bookings, payments, refunds, cancellations, certificates, vendor approvals, partner-form alerts — is already wired up to trigger automatically. You don't need to send anything manually except test messages.</li>
                </ol>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Settings Reference</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-gray-700">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase text-gray-400 border-b">
                        <th className="py-2 pr-4">Setting</th>
                        <th className="py-2 pr-4">Who sets it</th>
                        <th className="py-2 pr-4">What it does</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      <tr><td className="py-2 pr-4 font-mono text-xs">WHATSAPP_PROVIDER</td><td className="py-2 pr-4"><Badge variant="secondary">Developer</Badge></td><td className="py-2 pr-4">Turns real sending on. <code>dev</code> = safe/log-only (default), <code>cunnekt</code> = real messages go out</td></tr>
                      <tr><td className="py-2 pr-4 font-mono text-xs">COMMUNICATION_TEST_MODE</td><td className="py-2 pr-4"><Badge variant="secondary">Developer</Badge></td><td className="py-2 pr-4">Master safety switch — while <code>true</code>, no real message can ever go out, no matter what else is set</td></tr>
                      <tr><td className="py-2 pr-4 font-mono text-xs">CUNNEKT_API_KEY</td><td className="py-2 pr-4"><Badge variant="secondary">Developer</Badge></td><td className="py-2 pr-4">The key you generated in Cunnekt's dashboard (Step 2 above)</td></tr>
                      <tr><td className="py-2 pr-4 font-mono text-xs">CUNNEKT_API_VERSION</td><td className="py-2 pr-4"><Badge variant="secondary">Developer</Badge></td><td className="py-2 pr-4">Which Cunnekt format your account uses — must match the dashboard's "API Payload" (see the amber notice above)</td></tr>
                      <tr><td className="py-2 pr-4 font-mono text-xs">CUNNEKT_BASE_URL</td><td className="py-2 pr-4"><Badge variant="secondary">Developer</Badge></td><td className="py-2 pr-4">Copy the <strong>Base URL</strong> field exactly as shown on Cunnekt's <strong>API Setup</strong> page (e.g. <code>https://app2.cunnekt.com/v1</code>) — it already includes the version segment, don't add anything to it</td></tr>
                      <tr><td className="py-2 pr-4 font-mono text-xs">CUNNEKT_WEBHOOK_SECRET</td><td className="py-2 pr-4"><Badge variant="secondary">Developer</Badge></td><td className="py-2 pr-4">A password that goes in the webhook URL you register with Cunnekt, so delivery/read status updates can be trusted as really coming from Cunnekt</td></tr>
                      <tr><td className="py-2 pr-4 font-mono text-xs">ADMIN_ALERT_WHATSAPP_PHONE</td><td className="py-2 pr-4"><Badge variant="secondary">You or a developer</Badge></td><td className="py-2 pr-4">The phone number that should get a WhatsApp alert when someone submits the partnership/contact form. Leave blank to turn these alerts off</td></tr>
                      <tr><td className="py-2 pr-4 font-mono text-xs">COMMUNICATION_QUEUE_ENABLED</td><td className="py-2 pr-4"><Badge variant="secondary">Developer</Badge></td><td className="py-2 pr-4">Leave on (default) — turning it off is for debugging only</td></tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Setup Steps — For the Developer Connecting Cunnekt</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-gray-700">
                <ol className="list-decimal list-inside space-y-2 pl-1">
                  <li>Create a Cunnekt account and get the WhatsApp Business number (WABA) approved.</li>
                  <li>
                    In the left sidebar, click <strong>API Setup</strong>. Copy the <strong>Base URL</strong> shown
                    there into <code>CUNNEKT_BASE_URL</code> exactly as displayed (it already includes a version
                    segment, e.g. <code>/v1</code> — don't append anything to it), and copy the{' '}
                    <strong>API-KEY</strong> into <code>CUNNEKT_API_KEY</code>.
                  </li>
                  <li>
                    Create each message template: left sidebar → <strong>Templates</strong> →{' '}
                    <strong>Create Template</strong>. See the <strong>How to Create a Template in Cunnekt</strong>{' '}
                    card above for the exact field values, matching the copy on the{' '}
                    <strong>Sample Template Copy</strong> card, and submit each for WhatsApp approval. Use a
                    Utility-category template for transactional updates and an Authentication-category template for
                    OTP.
                  </li>
                  <li>
                    Nothing to choose here — the send API is confirmed as{' '}
                    <code>POST {'{CUNNEKT_BASE_URL}'}/sendnotification</code> (see the amber notice above).{' '}
                    <code>CUNNEKT_API_VERSION</code> is deprecated/ignored; leave it unset or <code>legacy</code>.
                  </li>
                  <li>
                    Once approved, copy each template's ID/name from Cunnekt into the matching template's{' '}
                    <strong>Cunnekt Template ID</strong> field on the <strong>Templates</strong> tab, and mark it{' '}
                    <strong>Approved on Cunnekt</strong>.
                  </li>
                  <li>
                    Pick a random secret string for <code>CUNNEKT_WEBHOOK_SECRET</code>, then register{' '}
                    <code>{'https://<your-domain>/api/webhooks/cunnekt/<that secret>'}</code> as the Webhook URL on
                    Cunnekt's API Setting page — Cunnekt has no request-signing scheme, so the secret must live in the
                    URL path itself (see Technical Reference below for the log-redaction tradeoff this implies).
                  </li>
                  <li>Optionally set <code>ADMIN_ALERT_WHATSAPP_PHONE</code> to alert a WhatsApp number on new partner-form submissions.</li>
                  <li>In <code>.env</code>, set <code>WHATSAPP_PROVIDER=cunnekt</code> and turn off <code>COMMUNICATION_TEST_MODE</code>.</li>
                  <li>
                    Use the <strong>Overview</strong> tab's Test Connection button, then <strong>Send Test Message</strong>{' '}
                    tab to confirm a real send works before relying on it in production.
                  </li>
                </ol>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sample Template Copy — Paste into Cunnekt</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-gray-700">
                <p className="mb-4">
                  Draft starting copy for each template (same copy now stored as <code>bodyText</code> on each{' '}
                  <code>NotificationTemplate</code> — editable on the <strong>Templates</strong> tab). These are{' '}
                  <strong>not</strong> approved templates yet. Each card below shows exactly what to put in every
                  field of Cunnekt's <strong>Create Template</strong> form — Template Name, Category, Language,
                  Header, Body, Footer, and Buttons — matching the field order on that page. Pick the matching
                  category, then submit for WhatsApp approval. <code>{'{{1}}'}</code>, <code>{'{{2}}'}</code>… in the
                  Body map positionally to the variables listed below it, in order — that's the order{' '}
                  <code>CunnektWhatsAppProvider</code> sends them in (via{' '}
                  <code>template.components[].parameters[]</code>).
                </p>
                <div className="space-y-4">
                  {SAMPLE_WHATSAPP_TEMPLATES.map((tpl) => (
                    <div key={tpl.key} className="rounded-lg border border-gray-200 p-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <p className="font-mono text-xs text-gray-500">{tpl.key}</p>
                        <Button
                          size="sm"
                          variant="outline"
                          leftIcon={<Copy className="w-3 h-3" />}
                          onClick={() => {
                            navigator.clipboard.writeText(tpl.body);
                            toast.success('Template copy copied to clipboard');
                          }}
                        >
                          Copy Body
                        </Button>
                      </div>
                      <div className="space-y-2">
                        <div className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-1.5 text-xs">
                          <span className="text-gray-400 uppercase tracking-wide pt-0.5">Template Name</span>
                          <span className="font-mono font-semibold text-gray-900">{tpl.providerTemplateName}</span>
                          <span className="text-gray-400 uppercase tracking-wide pt-0.5">Category</span>
                          <span>
                            <Badge variant={tpl.category === 'Authentication' ? 'warning' : 'secondary'}>
                              {tpl.category}
                            </Badge>
                          </span>
                          <span className="text-gray-400 uppercase tracking-wide pt-0.5">Language</span>
                          <span className="text-gray-700">English</span>
                          <span className="text-gray-400 uppercase tracking-wide pt-0.5">Header</span>
                          <span className="text-gray-500 italic">None — no media file on this message</span>
                        </div>
                        <div className="grid grid-cols-[110px_1fr] gap-x-3 text-xs items-start">
                          <span className="text-gray-400 uppercase tracking-wide pt-2">Body</span>
                          <p className="bg-gray-50 rounded-md p-3 font-mono text-xs whitespace-pre-wrap">{tpl.body}</p>
                        </div>
                        <div className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-1.5 text-xs">
                          <span className="text-gray-400 uppercase tracking-wide pt-0.5">Footer</span>
                          <span className="text-gray-500 italic">Optional — left blank (max 60 chars appended after Body if used)</span>
                          <span className="text-gray-400 uppercase tracking-wide pt-0.5">Buttons</span>
                          <span className="text-gray-500 italic">
                            {tpl.category === 'Authentication'
                              ? 'Cunnekt adds the required "Copy Code" button automatically for Authentication category'
                              : 'Optional — none needed for this template'}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {tpl.variables.map((v, i) => (
                          <Badge key={v} variant="secondary">
                            {`{{${i + 1}}}`} = {v}
                          </Badge>
                        ))}
                      </div>
                      {tpl.category === 'Authentication' && (
                        <p className="text-xs text-amber-700 mt-2">
                          WhatsApp Authentication-category templates have fixed wording rules — Cunnekt's template
                          creator usually generates the boilerplate Body/Button text for you once you pick this
                          category; the body above is a guide, not exact required wording.
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Reliability & Security</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-gray-700 space-y-2">
                <p>
                  <strong>Response schema is unconfirmed.</strong> Cunnekt's docs don't publish a stable success
                  response for either API generation. Treat any HTTP 2xx as "accepted by Cunnekt," not "delivered to
                  WhatsApp" — <code>CommunicationLog.status</code> moves to <code>sent</code> on a 2xx, and only the{' '}
                  <strong>delivery webhook</strong> is authoritative for <code>delivered</code>/<code>read</code>/
                  <code>failed</code>. Don't trust a guessed <code>providerMessageId</code> field for anything beyond
                  a best-effort webhook correlation key.
                </p>
                <p>
                  <strong>Retry policy</strong> (from <code>NON_RETRYABLE_ERROR_CODES</code> +{' '}
                  <code>isRetryable</code> in the provider adapter): network errors and HTTP 429/5xx are retried via
                  BullMQ's backoff; invalid phone, missing/disabled template, and consent-denied are not — retrying
                  those would just fail again.
                </p>
                <p>
                  <strong>Idempotency:</strong> <code>dispatch()</code> derives a key from{' '}
                  <code>templateKey:bookingId|orderId|userId:to</code> (or an explicit <code>idempotencyKey</code>) so
                  a duplicate dispatch call for the same event is a no-op rather than a second WhatsApp send.
                </p>
                <p>
                  <strong>Consent:</strong> <code>CommunicationCategory.MARKETING</code> templates are blocked unless{' '}
                  <code>consent: true</code> is passed to <code>dispatch()</code> — otp/transactional/admin_alert
                  bypass this by design. Don't repurpose a transactional template key for promotional content.
                </p>
                <p>
                  <strong>Webhook secret exposure:</strong> since Cunnekt supports no signing header, the shared
                  secret lives in the webhook URL path (<code>/api/webhooks/cunnekt/:secret</code>). App-level access
                  logs (morgan) redact this path automatically; if a reverse proxy (nginx, etc.) sits in front,
                  configure its access log to redact this path too, and rotate <code>CUNNEKT_WEBHOOK_SECRET</code> if
                  that hasn't been done yet.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Troubleshooting</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-gray-700 space-y-2">
                <p><strong>"API key configured: No"</strong> on Overview — <code>CUNNEKT_API_KEY</code> missing; provider falls back to dev (log-only) mode automatically.</p>
                <p><strong>Test Connection fails</strong> — Cunnekt has no documented health-check endpoint, so this only confirms an API key is configured, not that it's valid — check the Send Test Message tab for a real check.</p>
                <p><strong>Real send fails with a template/not-found error</strong> — the template's <strong>Cunnekt Template ID</strong> on the Templates tab is still the placeholder slug (e.g. <code>kidrove_booking_confirmed</code>), not Cunnekt's real numeric <code>templateid</code>. Fill it in once the template is created and approved on Cunnekt.</p>
                <p><strong>Message stuck at "queued"</strong> — check the worker process is running and <code>COMMUNICATION_QUEUE_ENABLED</code> isn't blocking it; check Redis/BullMQ connectivity.</p>
                <p><strong>Message "sent" but never "delivered"</strong> — the webhook URL (<code>/api/webhooks/cunnekt/&lt;secret&gt;</code>) likely isn't registered on Cunnekt's API Setting page, or the secret in the URL doesn't match <code>CUNNEKT_WEBHOOK_SECRET</code>.</p>
                <p><strong>Preview shows "no local copy on file"</strong> — set <strong>Body copy</strong> on the Templates tab for that key; it's used for the admin preview only, never sent to Cunnekt.</p>
                <p><strong>Preview shows disabled template</strong> — toggle <strong>Enabled</strong> on the Templates tab for that key.</p>
                <p><strong>Partner-form alerts never arrive</strong> — <code>ADMIN_ALERT_WHATSAPP_PHONE</code> is unset; alerts are silently skipped (not failed) when it's blank.</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </>
  );
};

export default AdminCommunicationsPage;
