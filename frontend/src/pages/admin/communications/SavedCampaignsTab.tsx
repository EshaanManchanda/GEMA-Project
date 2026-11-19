import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Send,
  Pencil,
  Trash2,
  Clock,
  Users,
  Plus,
  Compass,
} from 'lucide-react';
import toast from 'react-hot-toast';
import communicationAPI, {
  EmailDigestSettingsData,
} from '@/services/api/communicationAPI';
import Button from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';

interface SavedCampaignsTabProps {
  onEditCampaign: (campaign: EmailDigestSettingsData) => void;
  onCreateNew: () => void;
}

const CAMPAIGN_PURPOSE_LABELS: Record<string, { label: string; color: string }> = {
  blog_digest: { label: '📚 Blog Digest', color: 'bg-emerald-100 text-emerald-800' },
  event_spotlight: { label: '⛺ Event / Camp Spotlight', color: 'bg-blue-100 text-blue-800' },
  competition_announcement: { label: '🏆 Competitions', color: 'bg-purple-100 text-purple-800' },
  custom_broadcast: { label: '📢 Announcement', color: 'bg-amber-100 text-amber-800' },
};

const AUDIENCE_LABELS: Record<string, string> = {
  newsletter_all: 'Newsletter Subscribers',
  customers_parents: 'Parents & Customers',
  teachers: 'Teachers & Educators',
  vendors: 'Vendors & Partners',
  all_consented: 'All Consented Users',
};

export const SavedCampaignsTab: React.FC<SavedCampaignsTabProps> = ({
  onEditCampaign,
  onCreateNew,
}) => {
  const queryClient = useQueryClient();

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['saved-email-campaigns'],
    queryFn: communicationAPI.listEmailCampaigns,
  });

  // Status Change Mutation
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'active' | 'draft' | 'inactive' }) =>
      communicationAPI.updateCampaignRecord(id, { status }),
    onSuccess: () => {
      toast.success('Campaign status updated');
      queryClient.invalidateQueries({ queryKey: ['saved-email-campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['email-digest-settings'] });
    },
    onError: (err: any) => toast.error(err.message || 'Failed to update status'),
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => communicationAPI.deleteCampaignRecord(id),
    onSuccess: () => {
      toast.success('Campaign deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['saved-email-campaigns'] });
    },
    onError: (err: any) => toast.error(err.message || 'Failed to delete campaign'),
  });

  // Blast Mutation
  const blastMutation = useMutation({
    mutationFn: (camp: EmailDigestSettingsData) =>
      communicationAPI.dispatchEmailDigest({
        overrideSettings: camp,
        campaignRecordId: camp._id,
      }),
    onSuccess: (res) => {
      toast.success(res.message);
      queryClient.invalidateQueries({ queryKey: ['saved-email-campaigns'] });
    },
    onError: (err: any) => toast.error(err.message || 'Dispatch failed'),
  });

  const campaignList = Array.isArray(campaigns) ? campaigns : [];

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Saved Campaigns & Broadcasts</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage your saved campaign drafts, active scheduled digests, and dispatched broadcasts.
          </p>
        </div>
        <Button
          size="sm"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={onCreateNew}
        >
          Create New Campaign
        </Button>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-xs text-gray-500 bg-white rounded-xl border border-gray-100">
          Loading campaigns...
        </div>
      ) : campaignList.length === 0 ? (
        <Card className="border-dashed border-2 border-gray-200 bg-gray-50/50">
          <CardContent className="p-12 text-center space-y-3">
            <Compass className="w-10 h-10 text-gray-400 mx-auto" />
            <h4 className="text-sm font-semibold text-gray-800">No campaigns saved yet</h4>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              Configure your blogs, events, or announcements in the <strong>Digest & Automation</strong> tab and click <strong>"Save Configuration"</strong> to see them here!
            </p>
            <Button size="sm" onClick={onCreateNew}>
              Create First Campaign
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3.5">
          {campaignList.map((c: any) => {
            const purposeMeta =
              CAMPAIGN_PURPOSE_LABELS[c.campaignType] || {
                label: c.campaignType || 'Campaign',
                color: 'bg-gray-100 text-gray-800',
              };
            const audienceText = AUDIENCE_LABELS[c.targetAudience] || c.targetAudience;

            return (
              <Card key={c._id} className="hover:border-blue-200 transition-all shadow-sm">
                <CardContent className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${purposeMeta.color}`}>
                        {purposeMeta.label}
                      </span>
                      <h4 className="text-sm font-bold text-gray-900">{c.title || c.subject}</h4>
                      <Badge
                        variant={
                          c.status === 'active'
                            ? 'success'
                            : c.status === 'draft'
                            ? 'secondary'
                            : 'danger'
                        }
                      >
                        {c.status?.toUpperCase()}
                      </Badge>
                      {c.autoSend && (
                        <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Auto-Send: {c.scheduleDay} {c.scheduleTime}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-gray-600 truncate max-w-xl">
                      <strong>Subject:</strong> {c.subject}
                    </p>

                    <div className="flex items-center gap-4 text-[11px] text-gray-400 pt-1 flex-wrap">
                      <span className="flex items-center gap-1 text-gray-500 font-medium">
                        <Users className="w-3.5 h-3.5 text-indigo-500" /> {audienceText}
                      </span>
                      {c.status === 'active' && c.lastSentAt && c.lastSentStatus === 'success' && (
                        <span className="text-emerald-600 font-medium">
                          ✓ Sent {new Date(c.lastSentAt).toLocaleDateString()} ({c.lastSentRecipientCount || 0} recipients)
                        </span>
                      )}
                      <span>Created: {new Date(c.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Right Actions & Status Controls */}
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    {/* Status Toggle Dropdown */}
                    <select
                      value={c.status || 'draft'}
                      onChange={(e) =>
                        statusMutation.mutate({
                          id: c._id,
                          status: e.target.value as any,
                        })
                      }
                      className={`text-xs font-semibold rounded-lg px-2.5 py-1.5 border transition-all ${
                        c.status === 'active'
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                          : c.status === 'draft'
                          ? 'border-gray-200 bg-gray-50 text-gray-700'
                          : 'border-red-200 bg-red-50 text-red-700'
                      }`}
                    >
                      <option value="active">Active (Ready)</option>
                      <option value="draft">Draft</option>
                      <option value="inactive">Inactive (Paused)</option>
                    </select>

                    {/* Edit Button */}
                    <button
                      type="button"
                      title="Edit Campaign in Builder"
                      onClick={() => onEditCampaign(c)}
                      className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-indigo-600 transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>

                    {/* Blast Now Button */}
                    <Button
                      size="sm"
                      variant="outline"
                      leftIcon={<Send className="w-3.5 h-3.5 text-blue-600" />}
                      onClick={() => {
                        if (
                          window.confirm(
                            `Are you sure you want to blast "${c.title}" to ${audienceText} via Sender.net now?`
                          )
                        ) {
                          blastMutation.mutate(c);
                        }
                      }}
                      loading={blastMutation.isPending}
                    >
                      Blast Now
                    </Button>

                    {/* Delete Button */}
                    <button
                      type="button"
                      title="Delete Campaign"
                      onClick={() => {
                        if (window.confirm(`Delete campaign "${c.title}"?`)) {
                          deleteMutation.mutate(c._id);
                        }
                      }}
                      className="p-2 rounded-lg border border-gray-200 text-gray-400 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SavedCampaignsTab;
