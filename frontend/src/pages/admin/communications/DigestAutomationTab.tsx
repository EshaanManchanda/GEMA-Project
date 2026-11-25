import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Sparkles,
  Calendar,
  Send,
  Eye,
  CheckCircle2,
  BookOpen,
  RefreshCw,
  Search,
  Check,
  X,
  Users,
  Compass,
  Monitor,
  Smartphone,
  Maximize2,
  FileText,
} from 'lucide-react';
import toast from 'react-hot-toast';
import communicationAPI, {
  EmailDigestSettingsData,
} from '@/services/api/communicationAPI';
import blogAPI from '@/services/api/blogAPI';
import eventsAPI from '@/services/api/eventsAPI';
import Button from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import { COMPETITIONS_DATA } from '@/pages/competitions/CompetitionsListingPage';

const DAYS_OF_WEEK = [
  { value: 'monday', label: 'Every Monday' },
  { value: 'tuesday', label: 'Every Tuesday' },
  { value: 'wednesday', label: 'Every Wednesday' },
  { value: 'thursday', label: 'Every Thursday' },
  { value: 'friday', label: 'Every Friday' },
  { value: 'saturday', label: 'Every Saturday' },
  { value: 'sunday', label: 'Every Sunday' },
];

const CAMPAIGN_TYPES = [
  {
    id: 'blog_digest',
    label: '📚 Blog Digest',
    desc: 'Send fresh 6–8 curated blog articles with thumbnails and excerpts.',
    badge: 'Editorial',
    badgeColor: 'bg-emerald-100 text-emerald-800',
  },
  {
    id: 'event_spotlight',
    label: '⛺ Event / Camp Spotlight',
    desc: 'Feature an upcoming event (e.g. Winter Camp 2026) with dates, pricing & booking CTA.',
    badge: 'High Conversion',
    badgeColor: 'bg-blue-100 text-blue-800',
  },
  {
    id: 'competition_announcement',
    label: '🏆 Competition Announcement',
    desc: 'Promote official student competitions with submission links & deadlines.',
    badge: 'Competitions',
    badgeColor: 'bg-purple-100 text-purple-800',
  },
  {
    id: 'custom_broadcast',
    label: '📢 Custom Announcement',
    desc: 'Free-form announcement with custom heading, body text, and button link.',
    badge: 'Broadcast',
    badgeColor: 'bg-amber-100 text-amber-800',
  },
] as const;

// Audience segments are not implemented: every send goes to the whole marketing list
// (the Sender group / Mailchimp audience set under Email Marketing settings).
const RECIPIENTS_LABEL = 'all subscribers on your email-marketing list';

interface DigestAutomationTabProps {
  onSaved?: () => void;
  editingCampaign?: EmailDigestSettingsData | null;
  onCancelEdit?: () => void;
}

const DEFAULT_SETTINGS: Partial<EmailDigestSettingsData> = {
  status: 'draft',
  campaignType: 'blog_digest',
  targetAudience: 'newsletter_all',
  autoSend: false,
  scheduleDay: 'friday',
  scheduleTime: '10:00',
  subject: '✨ Kidrove Weekly: Latest Stories & Activities',
  preheader: 'Discover fresh stories and updates on Kidrove',
  blogMode: 'auto',
  autoBlogCount: 6,
  selectedBlogIds: [],
  featuredEventId: undefined,
  secondaryEventIds: [],
  eventCustomMessage: '',
  selectedCompetitionSlugs: ['national-day-art-competition', 'ai-art-competition'],
  competitionCustomMessage: '',
  customBroadcast: {
    heroTitle: 'Exciting News from Kidrove!',
    heroSubtitle: 'Updates and opportunities for our community',
    bodyHtml: '<p>Dear Kidrove families,<br/><br/>We are delighted to share our latest opportunities with you...</p>',
    ctaText: 'Visit Kidrove',
    ctaUrl: 'https://kidrove.com',
  },
};

export const DigestAutomationTab: React.FC<DigestAutomationTabProps> = ({
  onSaved,
  editingCampaign,
  onCancelEdit,
}) => {
  const queryClient = useQueryClient();

  // Settings State
  const [settings, setSettings] = useState<Partial<EmailDigestSettingsData>>(DEFAULT_SETTINGS);

  const [testEmail, setTestEmail] = useState('');

  // Modals
  const [isBlogModalOpen, setIsBlogModalOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');

  // Modal Filters
  const [blogSearch, setBlogSearch] = useState('');
  const [blogCategoryFilter, setBlogCategoryFilter] = useState('all');
  const [eventSearch, setEventSearch] = useState('');
  const [eventCategoryFilter, setEventCategoryFilter] = useState('all');

  // 1. Fetch current settings / apply editingCampaign
  const { isLoading: loadingSettings } = useQuery({
    queryKey: ['email-digest-settings'],
    queryFn: communicationAPI.getEmailDigestSettings,
  });

  useEffect(() => {
    if (editingCampaign) {
      setSettings({
        ...editingCampaign,
        campaignRecordId: editingCampaign._id,
      });
    } else {
      // When not editing a specific campaign record, use fresh default settings
      setSettings(DEFAULT_SETTINGS);
    }
  }, [editingCampaign]);

  const handleResetForm = () => {
    setSettings(DEFAULT_SETTINGS);
    if (onCancelEdit) onCancelEdit();
  };

  // 2. Fetch blogs
  const { data: blogsData, isLoading: loadingBlogs } = useQuery({
    queryKey: ['admin-digest-blogs'],
    queryFn: () => blogAPI.getAllBlogs({ page: 1, limit: 100, status: 'published' } as any),
  });

  // 3. Fetch events
  const { data: eventsData, isLoading: loadingEvents } = useQuery({
    queryKey: ['admin-digest-events'],
    queryFn: () => eventsAPI.getEvents({ page: 1, limit: 100 } as any),
  });

  // 4. Live Preview Mutation
  const previewMutation = useMutation({
    mutationFn: (data: Partial<EmailDigestSettingsData>) =>
      communicationAPI.previewEmailDigest(data),
  });

  // Refresh preview on configuration changes
  useEffect(() => {
    if (!loadingSettings) {
      previewMutation.mutate(settings);
    }
  }, [
    settings.campaignType,
    settings.blogMode,
    settings.autoBlogCount,
    settings.selectedBlogIds?.length,
    settings.featuredEventId,
    settings.secondaryEventIds?.length,
    settings.selectedCompetitionSlugs?.length,
    settings.customBroadcast?.heroTitle,
  ]);

  // 5. Save Configuration Mutation
  const saveMutation = useMutation({
    mutationFn: communicationAPI.updateEmailDigestSettings,
    onSuccess: () => {
      toast.success(
        editingCampaign
          ? 'Campaign updated successfully!'
          : 'Campaign configuration saved successfully!'
      );
      queryClient.invalidateQueries({ queryKey: ['email-digest-settings'] });
      queryClient.invalidateQueries({ queryKey: ['email-campaigns-list'] });
      handleResetForm();
      if (onSaved) {
        onSaved();
      }
    },
    onError: (err: any) => toast.error(err.message || 'Failed to save settings'),
  });

  // 6. Dispatch Mutation
  const dispatchMutation = useMutation({
    mutationFn: communicationAPI.dispatchEmailDigest,
    onSuccess: (res) => {
      toast.success(res.message);
      queryClient.invalidateQueries({ queryKey: ['email-digest-settings'] });
    },
    onError: (err: any) => toast.error(err.message || 'Dispatch failed'),
  });

  const blogsList: any[] = (blogsData as any)?.blogs || (blogsData as any)?.data || [];
  const eventsList: any[] = (eventsData as any)?.events || (eventsData as any)?.data || [];

  // Filtered Blogs for Modal
  const filteredBlogs = useMemo(() => {
    return blogsList.filter((b: any) => {
      const matchSearch =
        (b.title || '').toLowerCase().includes(blogSearch.toLowerCase()) ||
        (b.slug || '').toLowerCase().includes(blogSearch.toLowerCase());
      const matchCat =
        blogCategoryFilter === 'all' ||
        b.category?.name === blogCategoryFilter ||
        b.category === blogCategoryFilter;
      return matchSearch && matchCat;
    });
  }, [blogsList, blogSearch, blogCategoryFilter]);

  const blogCategories = useMemo(() => {
    const set = new Set<string>();
    blogsList.forEach((b: any) => {
      const name = b.category?.name || b.category;
      if (name) set.add(name);
    });
    return Array.from(set);
  }, [blogsList]);

  // Filtered Events for Modal
  const filteredEvents = useMemo(() => {
    return eventsList.filter((e: any) => {
      const matchSearch =
        (e.title || '').toLowerCase().includes(eventSearch.toLowerCase()) ||
        (e.slug || '').toLowerCase().includes(eventSearch.toLowerCase());
      const matchCat =
        eventCategoryFilter === 'all' ||
        (e.category || '').toLowerCase() === eventCategoryFilter.toLowerCase();
      return matchSearch && matchCat;
    });
  }, [eventsList, eventSearch, eventCategoryFilter]);

  const eventCategories = useMemo(() => {
    const set = new Set<string>();
    eventsList.forEach((e: any) => {
      if (e.category) set.add(e.category);
    });
    return Array.from(set);
  }, [eventsList]);

  // Toggle Handlers
  const toggleBlogSelection = (blogId: string) => {
    const current = settings.selectedBlogIds || [];
    if (current.includes(blogId)) {
      setSettings({ ...settings, selectedBlogIds: current.filter((id) => id !== blogId) });
    } else {
      if (current.length >= 8) {
        toast.error('You can select a maximum of 8 blogs');
        return;
      }
      setSettings({ ...settings, selectedBlogIds: [...current, blogId] });
    }
  };

  const toggleSecondaryEvent = (eventId: string) => {
    const current = settings.secondaryEventIds || [];
    if (current.includes(eventId)) {
      setSettings({ ...settings, secondaryEventIds: current.filter((id) => id !== eventId) });
    } else {
      if (current.length >= 2) {
        toast.error('Maximum 2 secondary activities');
        return;
      }
      setSettings({ ...settings, secondaryEventIds: [...current, eventId] });
    }
  };

  const toggleCompetitionSelection = (slug: string) => {
    const current = settings.selectedCompetitionSlugs || [];
    if (current.includes(slug)) {
      setSettings({
        ...settings,
        selectedCompetitionSlugs: current.filter((s) => s !== slug),
      });
    } else {
      setSettings({
        ...settings,
        selectedCompetitionSlugs: [...current, slug],
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Status and Live Info */}
      <Card className="border-blue-100 bg-gradient-to-r from-blue-50/60 via-white to-indigo-50/40">
        <CardContent className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-gray-900">
                  {editingCampaign ? 'Editing Saved Campaign' : 'Kidrove Campaign Hub & Automation'}
                </h3>
                <Badge
                  variant={
                    settings.status === 'active'
                      ? 'success'
                      : settings.status === 'draft'
                      ? 'secondary'
                      : 'danger'
                  }
                >
                  {settings.status?.toUpperCase()}
                </Badge>
                {editingCampaign && editingCampaign._id && (
                  <Badge variant="outline" className="text-purple-600 border-purple-300">
                    ID: {editingCampaign._id.slice(-6)}
                  </Badge>
                )}
                {settings.autoSend && (
                  <Badge variant="outline" className="text-blue-600 border-blue-300">
                    Auto-Send ON ({settings.scheduleDay} {settings.scheduleTime} UTC)
                  </Badge>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {editingCampaign
                  ? 'Editing existing campaign record. Click Save to persist changes or Reset to start fresh.'
                  : 'Choose a single clear purpose and dispatch clean, high-converting emails to your whole list via your configured provider.'}
              </p>
              {settings.lastSentAt && (
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Last dispatched: {new Date(settings.lastSentAt).toLocaleString()} • Type:{' '}
                  <strong>{settings.lastSentCampaignType || 'campaign'}</strong> • Recipients:{' '}
                  {settings.lastSentRecipientCount || 0}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {editingCampaign && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetForm}
                className="text-gray-600"
              >
                Cancel / Reset
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Maximize2 className="w-4 h-4 text-blue-600" />}
              onClick={() => {
                previewMutation.mutate(settings);
                setIsPreviewModalOpen(true);
              }}
            >
              Full-Screen Preview
            </Button>
            <Button
              size="sm"
              leftIcon={<CheckCircle2 className="w-4 h-4" />}
              onClick={() => saveMutation.mutate(settings)}
              loading={saveMutation.isPending}
            >
              {editingCampaign ? 'Update & View Campaigns' : 'Save Configuration'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* STEP 1: CAMPAIGN PURPOSE SELECTOR */}
      <Card>
        <CardHeader className="pb-3 border-b border-gray-100">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-gray-800">
            <Compass className="w-4 h-4 text-blue-600" />
            Step 1: Choose Campaign Type (Single Purpose = Clean Email)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {CAMPAIGN_TYPES.map((type) => {
              const isSelected = settings.campaignType === type.id;
              return (
                <div
                  key={type.id}
                  onClick={() => {
                    let defaultSubject = settings.subject;
                    if (type.id === 'blog_digest') defaultSubject = '✨ Kidrove Weekly: Latest Stories & Parenting Guides';
                    if (type.id === 'event_spotlight') defaultSubject = '❄️ Special Announcement: Winter Camp 2026 is Live!';
                    if (type.id === 'competition_announcement') defaultSubject = '🏆 Prestigious Youth Competitions Now Open for Entries';
                    if (type.id === 'custom_broadcast') defaultSubject = '📢 Important Announcement from Kidrove';

                    setSettings({
                      ...settings,
                      campaignType: type.id as any,
                      subject: defaultSubject,
                    });
                  }}
                  className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-600 shadow-sm'
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${type.badgeColor}`}>
                        {type.badge}
                      </span>
                      <input
                        type="radio"
                        checked={isSelected}
                        onChange={() => {}}
                        className="text-blue-600"
                      />
                    </div>
                    <h4 className="text-xs font-bold text-gray-900">{type.label}</h4>
                    <p className="text-[11px] text-gray-500 mt-1 line-clamp-2">{type.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* STEP 2: RECIPIENTS (segments not available yet) */}
      <Card>
        <CardHeader className="pb-3 border-b border-gray-100">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-gray-800">
            <Users className="w-4 h-4 text-indigo-600" />
            Step 2: Recipients
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <p className="text-xs text-gray-700">
            This campaign goes to <strong>{RECIPIENTS_LABEL}</strong> (the Sender group or Mailchimp
            audience configured in Email Marketing settings). Sending to a smaller group is not available yet.
          </p>
        </CardContent>
      </Card>

      {/* STEP 3: CONTENT BUILDER (DYNAMIC BY TYPE) */}
      <Card>
        <CardHeader className="pb-3 border-b border-gray-100 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-gray-800">
            <FileText className="w-4 h-4 text-emerald-600" />
            Step 3: Content Builder ({CAMPAIGN_TYPES.find((c) => c.id === settings.campaignType)?.label})
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {settings.campaignType === 'blog_digest' && `${settings.autoBlogCount || 6} Blogs Selected`}
            {settings.campaignType === 'event_spotlight' && 'Single Event Spotlight'}
            {settings.campaignType === 'competition_announcement' && `${settings.selectedCompetitionSlugs?.length || 0} Competitions`}
            {settings.campaignType === 'custom_broadcast' && 'Free-form Message'}
          </Badge>
        </CardHeader>

        <CardContent className="p-4 space-y-4">
          {/* Email Subject Line */}
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">
              Email Subject Line
            </label>
            <Input
              value={settings.subject || ''}
              onChange={(e) => setSettings({ ...settings, subject: e.target.value })}
              placeholder="Catchy subject line seen in recipient inbox..."
            />
          </div>

          {/* DYNAMIC CASE 1: BLOG DIGEST */}
          {settings.campaignType === 'blog_digest' && (
            <div className="space-y-4 pt-2 border-t border-gray-100">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, blogMode: 'auto' })}
                  className={`p-3 text-left rounded-xl border transition-all ${
                    settings.blogMode === 'auto'
                      ? 'border-emerald-600 bg-emerald-50/50 ring-1 ring-emerald-600'
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}
                >
                  <p className="text-xs font-semibold text-gray-900">⚡ Auto-Fetch Recent Blogs</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Automatically pulls the latest published articles from Kidrove.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, blogMode: 'manual' })}
                  className={`p-3 text-left rounded-xl border transition-all ${
                    settings.blogMode === 'manual'
                      ? 'border-emerald-600 bg-emerald-50/50 ring-1 ring-emerald-600'
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}
                >
                  <p className="text-xs font-semibold text-gray-900">🎯 Manually Pick Blogs</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Choose specific curated articles from a filterable popup.
                  </p>
                </button>
              </div>

              {settings.blogMode === 'auto' ? (
                <div className="p-4 bg-emerald-50/30 rounded-xl border border-emerald-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-emerald-950">Number of recent blogs to include</p>
                    <p className="text-[11px] text-emerald-700">Recommended 6 to 8 blogs for optimal newsletter format.</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {[4, 6, 8].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setSettings({ ...settings, autoBlogCount: num })}
                        className={`w-9 h-8 rounded-lg text-xs font-semibold border transition-all ${
                          settings.autoBlogCount === num
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-700">
                      Selected Blogs ({settings.selectedBlogIds?.length || 0} / 8)
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      leftIcon={<Search className="w-3.5 h-3.5" />}
                      onClick={() => setIsBlogModalOpen(true)}
                    >
                      Browse & Select Blogs
                    </Button>
                  </div>

                  {settings.selectedBlogIds && settings.selectedBlogIds.length > 0 ? (
                    <div className="divide-y border border-gray-200 rounded-xl bg-white max-h-48 overflow-y-auto">
                      {settings.selectedBlogIds.map((id) => {
                        const blog = blogsList.find((b: any) => b._id === id);
                        return (
                          <div key={id} className="p-2.5 flex items-center justify-between text-xs hover:bg-gray-50">
                            <span className="font-medium text-gray-800 truncate pr-2">
                              {blog?.title || id}
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleBlogSelection(id)}
                              className="text-red-500 hover:text-red-700 p-1"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div
                      onClick={() => setIsBlogModalOpen(true)}
                      className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/20 transition-colors"
                    >
                      <BookOpen className="w-8 h-8 text-gray-400 mx-auto mb-1" />
                      <p className="text-xs font-medium text-gray-700">No blogs selected yet</p>
                      <p className="text-[11px] text-gray-500">Click to search and choose 6 to 8 blogs</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* DYNAMIC CASE 2: EVENT / CAMP SPOTLIGHT */}
          {settings.campaignType === 'event_spotlight' && (
            <div className="space-y-4 pt-2 border-t border-gray-100">
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">
                  Primary Featured Event / Camp
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={settings.featuredEventId || ''}
                    onChange={(e) => setSettings({ ...settings, featuredEventId: e.target.value as any })}
                    className="flex-1 text-xs rounded-lg border border-gray-300 bg-white px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Auto-Pick Latest Active Event / Camp --</option>
                    {eventsList.map((e: any) => (
                      <option key={e._id} value={e._id}>
                        {e.title} {e.price ? `(AED ${e.price})` : ''} - [{e.category || 'Event'}]
                      </option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsEventModalOpen(true)}
                    leftIcon={<Search className="w-3.5 h-3.5" />}
                  >
                    Search
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">
                  Custom Announcement / Welcome Note (Optional)
                </label>
                <textarea
                  placeholder="e.g. Dear Parents, we are thrilled to open registrations for our premier Winter Camp 2026..."
                  rows={2}
                  value={settings.eventCustomMessage || ''}
                  onChange={(e) => setSettings({ ...settings, eventCustomMessage: e.target.value })}
                  className="w-full text-xs rounded-lg border border-gray-200 p-2.5 focus:ring-2 focus:ring-blue-400"
                />
              </div>

              {/* Secondary Supporting Events */}
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">
                  Secondary Supporting Activities ({settings.secondaryEventIds?.length || 0} / 2)
                </label>
                <p className="text-[11px] text-gray-500 mb-2">Show up to 2 other activities at the bottom of the email.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto">
                  {eventsList.slice(0, 10).map((e: any) => {
                    const isSelected = (settings.secondaryEventIds || []).includes(e._id);
                    return (
                      <div
                        key={e._id}
                        onClick={() => toggleSecondaryEvent(e._id)}
                        className={`p-2 rounded-lg border text-left cursor-pointer transition-all flex items-center justify-between ${
                          isSelected ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-white hover:bg-gray-50'
                        }`}
                      >
                        <span className="text-xs font-medium text-gray-800 truncate pr-2">{e.title}</span>
                        <span className="text-[10px] text-blue-600 whitespace-nowrap">
                          {isSelected ? 'Included' : '+ Add'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* DYNAMIC CASE 3: COMPETITION ANNOUNCEMENT */}
          {settings.campaignType === 'competition_announcement' && (
            <div className="space-y-4 pt-2 border-t border-gray-100">
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">
                  Custom Headline Message (Optional)
                </label>
                <textarea
                  placeholder="e.g. Inspire your children to showcase their talents in our regional student challenges..."
                  rows={2}
                  value={settings.competitionCustomMessage || ''}
                  onChange={(e) => setSettings({ ...settings, competitionCustomMessage: e.target.value })}
                  className="w-full text-xs rounded-lg border border-gray-200 p-2.5 focus:ring-2 focus:ring-purple-400"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 block mb-2">
                  Select Competitions to Include
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {COMPETITIONS_DATA.map((c) => {
                    const isSelected = (settings.selectedCompetitionSlugs || []).includes(c.slug);
                    return (
                      <div
                        key={c.slug}
                        onClick={() => toggleCompetitionSelection(c.slug)}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex items-start gap-2.5 ${
                          isSelected
                            ? 'border-purple-600 bg-purple-50/60 ring-1 ring-purple-600'
                            : 'border-gray-200 bg-white hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleCompetitionSelection(c.slug)}
                          className="mt-1 rounded text-purple-600"
                        />
                        <div className="overflow-hidden">
                          <span className="text-[10px] font-semibold text-purple-700 bg-purple-100/60 px-1.5 py-0.5 rounded">
                            {c.badge}
                          </span>
                          <p className="text-xs font-semibold text-gray-900 mt-1 truncate">{c.title}</p>
                          <p className="text-[11px] text-gray-500 line-clamp-2 mt-0.5">{c.description}</p>
                          <span className="text-[10px] font-semibold text-rose-600 mt-1 inline-block">
                            {c.duration}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* DYNAMIC CASE 4: CUSTOM BROADCAST */}
          {settings.campaignType === 'custom_broadcast' && (
            <div className="space-y-4 pt-2 border-t border-gray-100">
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">
                  Headline Title
                </label>
                <Input
                  value={settings.customBroadcast?.heroTitle || ''}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      customBroadcast: {
                        heroTitle: e.target.value,
                        heroSubtitle: settings.customBroadcast?.heroSubtitle || '',
                        bodyHtml: settings.customBroadcast?.bodyHtml || '',
                        ctaText: settings.customBroadcast?.ctaText || '',
                        ctaUrl: settings.customBroadcast?.ctaUrl || '',
                      },
                    })
                  }
                  placeholder="e.g. Exciting Platform Update for 2026"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">
                  Subtitle (Optional)
                </label>
                <Input
                  value={settings.customBroadcast?.heroSubtitle || ''}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      customBroadcast: {
                        heroTitle: settings.customBroadcast?.heroTitle || '',
                        heroSubtitle: e.target.value,
                        bodyHtml: settings.customBroadcast?.bodyHtml || '',
                        ctaText: settings.customBroadcast?.ctaText || '',
                        ctaUrl: settings.customBroadcast?.ctaUrl || '',
                      },
                    })
                  }
                  placeholder="e.g. Here is what's new on Kidrove this month"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">
                  Message Body (HTML or Plain Text)
                </label>
                <textarea
                  rows={5}
                  value={settings.customBroadcast?.bodyHtml || ''}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      customBroadcast: {
                        heroTitle: settings.customBroadcast?.heroTitle || '',
                        heroSubtitle: settings.customBroadcast?.heroSubtitle || '',
                        bodyHtml: e.target.value,
                        ctaText: settings.customBroadcast?.ctaText || '',
                        ctaUrl: settings.customBroadcast?.ctaUrl || '',
                      },
                    })
                  }
                  className="w-full text-xs rounded-lg border border-gray-200 p-2.5 focus:ring-2 focus:ring-blue-400 font-mono"
                  placeholder="<p>Dear Parents,</p><p>We are excited to share...</p>"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1">
                    Button CTA Text
                  </label>
                  <Input
                    value={settings.customBroadcast?.ctaText || ''}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        customBroadcast: {
                          heroTitle: settings.customBroadcast?.heroTitle || '',
                          heroSubtitle: settings.customBroadcast?.heroSubtitle || '',
                          bodyHtml: settings.customBroadcast?.bodyHtml || '',
                          ctaText: e.target.value,
                          ctaUrl: settings.customBroadcast?.ctaUrl || '',
                        },
                      })
                    }
                    placeholder="e.g. Explore Opportunities"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1">
                    Button URL
                  </label>
                  <Input
                    value={settings.customBroadcast?.ctaUrl || ''}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        customBroadcast: {
                          heroTitle: settings.customBroadcast?.heroTitle || '',
                          heroSubtitle: settings.customBroadcast?.heroSubtitle || '',
                          bodyHtml: settings.customBroadcast?.bodyHtml || '',
                          ctaText: settings.customBroadcast?.ctaText || '',
                          ctaUrl: e.target.value,
                        },
                      })
                    }
                    placeholder="e.g. https://kidrove.com"
                  />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* STEP 4: DISPATCH & SCHEDULE */}
      <Card>
        <CardHeader className="pb-3 border-b border-gray-100">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-gray-800">
            <Calendar className="w-4 h-4 text-blue-600" />
            Step 4: Scheduling & Dispatch Control
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div
              onClick={() => setSettings({ ...settings, autoSend: false })}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                settings.autoSend === false
                  ? 'border-blue-600 bg-blue-50/60 ring-1 ring-blue-600'
                  : 'border-gray-200 bg-white hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={settings.autoSend === false}
                  onChange={() => setSettings({ ...settings, autoSend: false })}
                  className="text-blue-600"
                />
                <span className="text-xs font-bold text-gray-900">Manual Dispatch Only</span>
              </div>
              <p className="text-[11px] text-gray-500 mt-1 pl-5">
                Campaign will only be sent when an admin hits "Blast to Audience" below.
              </p>
            </div>

            <div
              onClick={() => setSettings({ ...settings, autoSend: true })}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                settings.autoSend === true
                  ? 'border-blue-600 bg-blue-50/60 ring-1 ring-blue-600'
                  : 'border-gray-200 bg-white hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={settings.autoSend === true}
                  onChange={() => setSettings({ ...settings, autoSend: true })}
                  className="text-blue-600"
                />
                <span className="text-xs font-bold text-gray-900">Recurring Automated Schedule (Cron)</span>
              </div>
              <p className="text-[11px] text-gray-500 mt-1 pl-5">
                Automatically curates and sends fresh content on the day & time chosen.
              </p>
            </div>
          </div>

          {settings.autoSend && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">
                  Schedule Day
                </label>
                <select
                  className="w-full text-xs rounded-lg border border-gray-300 bg-white px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  value={settings.scheduleDay}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      scheduleDay: e.target.value as any,
                    })
                  }
                >
                  {DAYS_OF_WEEK.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">
                  Send Time (UTC)
                </label>
                <input
                  type="time"
                  className="w-full text-xs rounded-lg border border-gray-300 bg-white px-3 py-1.5 focus:ring-2 focus:ring-blue-500"
                  value={settings.scheduleTime}
                  onChange={(e) =>
                    setSettings({ ...settings, scheduleTime: e.target.value })
                  }
                />
              </div>
            </div>
          )}

          {/* Action Row */}
          <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Input
                placeholder="Send test to email..."
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="text-xs py-1.5 w-60"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  dispatchMutation.mutate({
                    testEmail: testEmail || undefined,
                    testMode: !testEmail,
                    overrideSettings: settings,
                  })
                }
                loading={dispatchMutation.isPending}
              >
                Send Test
              </Button>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Eye className="w-4 h-4 text-blue-600" />}
                onClick={() => {
                  previewMutation.mutate(settings);
                  setIsPreviewModalOpen(true);
                }}
              >
                Preview Email
              </Button>
              <Button
                size="sm"
                leftIcon={<Send className="w-4 h-4" />}
                onClick={() => {
                  if (
                    window.confirm(
                      `Are you sure you want to blast this [${settings.campaignType?.toUpperCase()}] campaign to ${RECIPIENTS_LABEL} now?`
                    )
                  ) {
                    dispatchMutation.mutate({
                      overrideSettings: settings,
                    });
                  }
                }}
                loading={dispatchMutation.isPending}
              >
                Blast to Audience Now
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FULL-SCREEN LIVE PREVIEW MODAL */}
      {isPreviewModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
          <div className="bg-white rounded-2xl max-w-4xl w-full h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-gray-900">Live Email Preview</span>
                <span className="text-xs text-gray-500">
                  To: <strong>{RECIPIENTS_LABEL}</strong>
                </span>
              </div>

              {/* Desktop vs Mobile Toggle */}
              <div className="flex items-center gap-2">
                <div className="bg-white border border-gray-200 rounded-lg p-0.5 flex">
                  <button
                    type="button"
                    onClick={() => setPreviewDevice('desktop')}
                    className={`px-3 py-1 text-xs font-semibold rounded flex items-center gap-1.5 transition-colors ${
                      previewDevice === 'desktop' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Monitor className="w-3.5 h-3.5" /> Desktop
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewDevice('mobile')}
                    className={`px-3 py-1 text-xs font-semibold rounded flex items-center gap-1.5 transition-colors ${
                      previewDevice === 'mobile' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" /> Mobile
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setIsPreviewModalOpen(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-slate-200 p-4 overflow-y-auto flex items-center justify-center">
              {previewMutation.isPending ? (
                <div className="flex flex-col items-center gap-2 text-gray-500 text-xs">
                  <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
                  Generating responsive preview...
                </div>
              ) : previewMutation.data?.html ? (
                <div
                  className={`bg-white rounded-xl shadow-lg overflow-hidden transition-all duration-300 h-full ${
                    previewDevice === 'mobile' ? 'w-[375px]' : 'w-full max-w-[640px]'
                  }`}
                >
                  <iframe
                    srcDoc={previewMutation.data.html}
                    title="Newsletter Full Preview"
                    sandbox=""
                    className="w-full h-full border-0"
                  />
                </div>
              ) : (
                <div className="text-gray-400 text-xs">Unable to load preview.</div>
              )}
            </div>

            <div className="p-3 border-t border-gray-100 bg-white flex items-center justify-between">
              <span className="text-xs text-gray-500 truncate max-w-md">
                Subject: <strong>{settings.subject}</strong>
              </span>
              <Button size="sm" onClick={() => setIsPreviewModalOpen(false)}>
                Done Previewing
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: Blog Selection Popup */}
      {isBlogModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Select Blogs for Digest</h3>
                <p className="text-xs text-gray-500">Pick up to 8 articles to feature in the newsletter</p>
              </div>
              <button
                type="button"
                onClick={() => setIsBlogModalOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-gray-50 border-b border-gray-100 flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search blogs by title or slug..."
                  value={blogSearch}
                  onChange={(e) => setBlogSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="w-44">
                <select
                  value={blogCategoryFilter}
                  onChange={(e) => setBlogCategoryFilter(e.target.value)}
                  className="w-full py-1.5 px-2.5 text-xs rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">All Categories</option>
                  {blogCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-4 overflow-y-auto flex-1 divide-y divide-gray-100">
              {loadingBlogs ? (
                <div className="p-8 text-center text-xs text-gray-500">Loading blogs...</div>
              ) : filteredBlogs.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-500">No matching blogs found.</div>
              ) : (
                filteredBlogs.map((b: any) => {
                  const isSelected = settings.selectedBlogIds?.includes(b._id);
                  return (
                    <div
                      key={b._id}
                      onClick={() => toggleBlogSelection(b._id)}
                      className={`py-3 px-2 flex items-center justify-between cursor-pointer rounded-lg hover:bg-gray-50 transition-colors ${
                        isSelected ? 'bg-emerald-50/60' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3 overflow-hidden pr-3">
                        <div
                          className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 ${
                            isSelected
                              ? 'bg-emerald-600 border-emerald-600 text-white'
                              : 'border-gray-300'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-semibold text-gray-900 truncate">{b.title}</p>
                          <p className="text-[11px] text-gray-400">
                            {b.category?.name || 'General'} • {b.publishedAt ? new Date(b.publishedAt).toLocaleDateString() : 'Published'}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-emerald-600">
                        {isSelected ? 'Selected' : '+ Select'}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-gray-50 rounded-b-2xl">
              <span className="text-xs text-gray-600 font-medium">
                {settings.selectedBlogIds?.length || 0} / 8 blogs selected
              </span>
              <Button size="sm" onClick={() => setIsBlogModalOpen(false)}>
                Done Selection
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Event Selection Popup */}
      {isEventModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Select Event / Camp to Feature</h3>
                <p className="text-xs text-gray-500">Pick an event from Kidrove's catalog</p>
              </div>
              <button
                type="button"
                onClick={() => setIsEventModalOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-gray-50 border-b border-gray-100 flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search events by title or slug..."
                  value={eventSearch}
                  onChange={(e) => setEventSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="w-44">
                <select
                  value={eventCategoryFilter}
                  onChange={(e) => setEventCategoryFilter(e.target.value)}
                  className="w-full py-1.5 px-2.5 text-xs rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Categories</option>
                  {eventCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-4 overflow-y-auto flex-1 divide-y divide-gray-100">
              {loadingEvents ? (
                <div className="p-8 text-center text-xs text-gray-500">Loading events...</div>
              ) : filteredEvents.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-500">No matching events found.</div>
              ) : (
                filteredEvents.map((e: any) => {
                  const isFeatured = settings.featuredEventId === e._id;
                  return (
                    <div
                      key={e._id}
                      onClick={() => {
                        setSettings({ ...settings, featuredEventId: e._id });
                        setIsEventModalOpen(false);
                      }}
                      className={`py-3 px-2 flex items-center justify-between cursor-pointer rounded-lg hover:bg-gray-50 transition-colors ${
                        isFeatured ? 'bg-blue-50/70' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3 overflow-hidden pr-3">
                        <div
                          className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 ${
                            isFeatured
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : 'border-gray-300'
                          }`}
                        >
                          {isFeatured && <Check className="w-3.5 h-3.5" />}
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-semibold text-gray-900 truncate">{e.title}</p>
                          <p className="text-[11px] text-gray-400">
                            {e.category || 'Event'} • {e.price ? `AED ${e.price}` : 'Free'} • {e.location?.city || 'Dubai'}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-blue-600">
                        {isFeatured ? 'Featured' : 'Select'}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-4 border-t border-gray-100 flex items-center justify-end bg-gray-50 rounded-b-2xl">
              <Button size="sm" onClick={() => setIsEventModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DigestAutomationTab;
