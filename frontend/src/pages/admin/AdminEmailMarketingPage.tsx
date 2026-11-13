import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Mail, Send, Users, UserCheck, UserX, RefreshCw, PlugZap, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import newsletterAPI from '@/services/api/newsletterAPI';
import communicationAPI from '@/services/api/communicationAPI';
import Button from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Badge from '@/components/ui/Badge';
import PrivatePageSEO from '@/components/common/PrivatePageSEO';

type TabType = 'overview' | 'subscribers' | 'compose' | 'automations';

const PROVIDER_LABEL = { dev: 'Development (Mailpit)', sender: 'Sender', mailchimp: 'Mailchimp' } as const;
const PROVIDER_DASHBOARD = { sender: 'https://app.sender.net', mailchimp: 'https://admin.mailchimp.com' } as const;

// Tags/fields Kidrove keeps up to date on each contact, and the provider workflow each one powers.
const AUTOMATIONS = [
  { name: 'Welcome series', trigger: 'Contact added to group/tag', value: 'newsletter', note: 'Send 2–3 emails over the first week to new subscribers.' },
  { name: 'Post-booking thank you + review request', trigger: 'Tag added', value: 'customer', note: 'Fires when someone completes their first paid booking.' },
  { name: 'Category follow-ups', trigger: 'Tag added', value: 'booked:<category>', note: 'e.g. booked:robotics → announce new robotics events.' },
  { name: 'Re-engagement', trigger: 'Segment: LAST_BOOKING older than 60 days', value: 'LAST_BOOKING', note: 'A merge field (YYYY-MM-DD) updated after every paid booking.' },
  { name: 'Age-based offers', trigger: 'Segment on CHILD_AGE', value: 'CHILD_AGE', note: 'Collected from the newsletter sign-up form.' },
  { name: 'Role-specific news', trigger: 'Tag', value: 'role:parent / role:teacher / role:vendor', note: 'Different content for parents, teachers and vendors.' },
];

interface Subscriber {
  _id: string;
  email: string;
  name: string;
  city?: string;
  isActive: boolean;
  source: string;
  subscriptionDate: string;
}

interface SubscriberStats {
  totalSubscribers: number;
  activeSubscribers: number;
  inactiveSubscribers: number;
}

const AdminEmailMarketingPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const queryClient = useQueryClient();

  const { data: statsData } = useQuery({
    queryKey: ['newsletter-stats'],
    queryFn: () => newsletterAPI.admin.getStats() as Promise<SubscriberStats>,
    staleTime: 60 * 1000,
  });

  // ---- Provider (Sender / Mailchimp / dev) ----
  const { data: commSettings } = useQuery({
    queryKey: ['communication-settings'],
    queryFn: communicationAPI.getSettings,
    staleTime: 60 * 1000,
  });
  const { data: logSummary } = useQuery({
    queryKey: ['communication-logs-summary', 7],
    queryFn: () => communicationAPI.getLogsSummary(7),
    staleTime: 60 * 1000,
  });
  const providerKey = (commSettings?.emailMarketing.provider ?? 'dev') as keyof typeof PROVIDER_LABEL;
  const isRealProvider = providerKey !== 'dev';
  const syncCounts = logSummary?.byChannelAndStatus?.email_marketing ?? {};

  const testConnection = useMutation({
    mutationFn: communicationAPI.testEmailMarketingConnection,
    onSuccess: (r) => {
      if (r.simulated) toast('Development provider — nothing is sent to a real service.');
      else if (r.connected) toast.success(`Connected to ${r.provider}`);
      else toast.error(`Could not connect to ${r.provider}. Check Settings → Email Marketing.`);
    },
    onError: (e: any) => toast.error(e?.message || 'Connection test failed'),
  });
  const backfill = useMutation({
    mutationFn: communicationAPI.backfillEmailMarketing,
    onSuccess: (r) => {
      toast.success(r.message);
      queryClient.invalidateQueries({ queryKey: ['communication-logs-summary'] });
    },
    onError: (e: any) => toast.error(e?.message || 'Could not start sync'),
  });

  // ---- Subscribers ----
  const [subFilters, setSubFilters] = useState({ search: '', isActive: '', page: 1 });
  const { data: subsData, isLoading: subsLoading } = useQuery({
    queryKey: ['newsletter-subscribers', subFilters],
    queryFn: () =>
      newsletterAPI.admin.getSubscribers({
        search: subFilters.search || undefined,
        isActive: subFilters.isActive || undefined,
        page: subFilters.page,
        limit: 20,
      }) as Promise<{
        subscribers: Subscriber[];
        pagination: { currentPage: number; totalPages: number; totalCount: number };
      }>,
    enabled: activeTab === 'subscribers',
    staleTime: 30 * 1000,
  });

  // ---- Compose ----
  const [campaign, setCampaign] = useState({ subject: '', content: '', testMode: true });

  const sendMutation = useMutation({
    mutationFn: () => newsletterAPI.admin.sendNewsletter(campaign),
    onSuccess: (result: any) => {
      toast.success(
        campaign.testMode
          ? 'Test email sent to your own inbox'
          : `Newsletter sent to ${result?.recipientCount ?? 'all'} subscribers`
      );
      queryClient.invalidateQueries({ queryKey: ['newsletter-stats'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to send newsletter');
    },
  });

  const tabs: { id: TabType; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'subscribers', label: 'Subscribers' },
    { id: 'compose', label: isRealProvider ? 'Campaigns' : 'Compose & Send' },
    { id: 'automations', label: 'Automations' },
  ];

  return (
    <>
      <PrivatePageSEO title="Admin - Email Marketing | Kidrove" description="Manage email marketing" />

      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Mail className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Email Marketing</h1>
            <p className="text-sm text-gray-500">
              Manage your newsletter subscriber list and send email campaigns.
            </p>
          </div>
        </div>

        <div className="border-b border-gray-200 flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <Card>
            <CardContent className="p-6 flex flex-col md:flex-row md:items-center gap-4 justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-50 rounded-lg">
                  <PlugZap className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">
                    {PROVIDER_LABEL[providerKey]}{' '}
                    <Badge variant={!isRealProvider || commSettings?.emailMarketing.configured ? 'success' : 'secondary'}>
                      {!isRealProvider ? 'Local testing' : commSettings?.emailMarketing.configured ? 'Configured' : 'Not configured'}
                    </Badge>
                  </p>
                  <p className="text-sm text-gray-500">
                    {isRealProvider
                      ? `Last 7 days of contact sync: ${syncCounts.sent ?? 0} synced, ${syncCounts.failed ?? 0} failed, ${syncCounts.queued ?? 0} waiting.`
                      : 'Campaign emails go to Mailpit (http://localhost:8025) and contacts are only logged. Pick Sender or Mailchimp to go live.'}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => testConnection.mutate()} loading={testConnection.isPending}>
                  Test connection
                </Button>
                {isRealProvider && (
                  <Button
                    size="sm"
                    variant="outline"
                    leftIcon={<RefreshCw className="w-4 h-4" />}
                    onClick={() => backfill.mutate()}
                    loading={backfill.isPending}
                  >
                    Sync all contacts
                  </Button>
                )}
                <Link to="/admin/settings" className="inline-flex items-center px-3 py-1.5 text-sm border rounded-md text-gray-700 hover:bg-gray-50">
                  Provider settings
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'overview' && (
          <div className="grid sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{statsData?.totalSubscribers ?? '—'}</p>
                  <p className="text-sm text-gray-500">Total Subscribers</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 bg-green-50 rounded-lg">
                  <UserCheck className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{statsData?.activeSubscribers ?? '—'}</p>
                  <p className="text-sm text-gray-500">Active (can receive emails)</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 bg-gray-100 rounded-lg">
                  <UserX className="w-6 h-6 text-gray-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{statsData?.inactiveSubscribers ?? '—'}</p>
                  <p className="text-sm text-gray-500">Unsubscribed</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'subscribers' && (
          <Card>
            <CardHeader>
              <CardTitle>Subscribers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3 mb-4">
                <Input
                  placeholder="Search by email, name, or city"
                  value={subFilters.search}
                  onChange={(e) => setSubFilters({ ...subFilters, search: e.target.value, page: 1 })}
                />
                <Select
                  value={subFilters.isActive}
                  onChange={(e) => setSubFilters({ ...subFilters, isActive: e.target.value, page: 1 })}
                  options={[
                    { value: '', label: 'All' },
                    { value: 'true', label: 'Active only' },
                    { value: 'false', label: 'Unsubscribed only' },
                  ]}
                />
              </div>

              {subsLoading ? (
                <p className="text-sm text-gray-500">Loading...</p>
              ) : !subsData || subsData.subscribers.length === 0 ? (
                <p className="text-sm text-gray-500">No subscribers found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase text-gray-400 border-b">
                        <th className="py-2 pr-4">Email</th>
                        <th className="py-2 pr-4">Name</th>
                        <th className="py-2 pr-4">Source</th>
                        <th className="py-2 pr-4">Status</th>
                        <th className="py-2 pr-4">Subscribed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subsData.subscribers.map((sub) => (
                        <tr key={sub._id} className="border-b last:border-0">
                          <td className="py-2 pr-4">{sub.email}</td>
                          <td className="py-2 pr-4">{sub.name || '—'}</td>
                          <td className="py-2 pr-4">{sub.source}</td>
                          <td className="py-2 pr-4">
                            <Badge variant={sub.isActive ? 'success' : 'secondary'}>
                              {sub.isActive ? 'Active' : 'Unsubscribed'}
                            </Badge>
                          </td>
                          <td className="py-2 pr-4 text-gray-500">
                            {new Date(sub.subscriptionDate).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
                    <span>
                      Page {subsData.pagination.currentPage} of {subsData.pagination.totalPages} (
                      {subsData.pagination.totalCount} total)
                    </span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={subFilters.page <= 1}
                        onClick={() => setSubFilters({ ...subFilters, page: subFilters.page - 1 })}
                      >
                        Previous
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={subFilters.page >= subsData.pagination.totalPages}
                        onClick={() => setSubFilters({ ...subFilters, page: subFilters.page + 1 })}
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

        {activeTab === 'compose' && isRealProvider && (
          <Card>
            <CardHeader>
              <CardTitle>Design and send campaigns in {PROVIDER_LABEL[providerKey]}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-gray-600">
              <p>
                {PROVIDER_LABEL[providerKey]} has the drag-and-drop email designer, scheduling, A/B tests and
                open/click reports. Kidrove keeps your audience in sync automatically, so you only need to pick a
                segment there:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li><code>newsletter</code> — everyone who subscribed through the site</li>
                <li><code>customer</code> and <code>booked:&lt;category&gt;</code> — people who have booked (and what)</li>
                <li><code>role:parent</code>, <code>role:teacher</code>, <code>role:vendor</code> — by account type</li>
              </ul>
              <p className="text-xs text-gray-500">
                Registered users appear only after they explicitly opt in. Unsubscribes made inside{' '}
                {PROVIDER_LABEL[providerKey]} are mirrored back to Kidrove through the webhook.
              </p>
              <a
                href={PROVIDER_DASHBOARD[providerKey as 'sender' | 'mailchimp']}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Open {PROVIDER_LABEL[providerKey]} <ExternalLink className="w-4 h-4" />
              </a>
            </CardContent>
          </Card>
        )}

        {activeTab === 'compose' && !isRealProvider && (
          <Card>
            <CardHeader>
              <CardTitle>Compose a Campaign</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Subject line"
                value={campaign.subject}
                onChange={(e) => setCampaign({ ...campaign, subject: e.target.value })}
                placeholder="This month's events for your kids"
              />
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 block">Email content (HTML)</label>
                <textarea
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-400"
                  rows={10}
                  value={campaign.content}
                  onChange={(e) => setCampaign({ ...campaign, content: e.target.value })}
                  placeholder="<p>Hi there! Here's what's happening this month...</p>"
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={campaign.testMode}
                  onChange={(e) => setCampaign({ ...campaign, testMode: e.target.checked })}
                />
                Test mode — only send to my own email address first
              </label>
              {window.location.hostname === 'localhost' && (
                <p className="text-xs text-gray-500">
                  Local development: every email lands in Mailpit at{' '}
                  <a className="underline" href="http://localhost:8025" target="_blank" rel="noopener noreferrer">
                    http://localhost:8025
                  </a>
                  .
                </p>
              )}

              <Button
                leftIcon={<Send className="w-4 h-4" />}
                onClick={() => sendMutation.mutate()}
                loading={sendMutation.isPending}
                disabled={!campaign.subject || !campaign.content}
              >
                {campaign.testMode ? 'Send Test Email' : 'Send to All Subscribers'}
              </Button>

              {!campaign.testMode && (
                <p className="text-xs text-amber-600">
                  This will send to every active subscriber ({statsData?.activeSubscribers ?? 0}). Send a test first to check formatting.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'automations' && (
          <Card>
            <CardHeader>
              <CardTitle>Automation recipes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-500">
                {isRealProvider
                  ? `Create these workflows in ${PROVIDER_LABEL[providerKey]}. Kidrove keeps the tags and fields below current, so each workflow can trigger on them.`
                  : 'Pick Sender or Mailchimp in Settings → Email Marketing to use these. They work by tags and fields Kidrove sends with each contact.'}
              </p>
              <div className="divide-y">
                {AUTOMATIONS.map((a) => (
                  <div key={a.name} className="py-3 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1">
                    <div>
                      <p className="font-medium text-gray-900">{a.name}</p>
                      <p className="text-sm text-gray-500">{a.note}</p>
                    </div>
                    <div className="text-sm sm:text-right">
                      <p className="text-gray-500">{a.trigger}</p>
                      <code className="text-xs bg-gray-100 rounded px-1.5 py-0.5">{a.value}</code>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
};

export default AdminEmailMarketingPage;
