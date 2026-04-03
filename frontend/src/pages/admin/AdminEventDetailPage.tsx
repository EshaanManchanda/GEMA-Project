import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Edit, CheckCircle, XCircle, Star, Users, Calendar,
  MapPin, Tag, Download, Search, Filter, Eye, BarChart2,
  List, Clock, DollarSign, Award, Link2, Phone, Globe,
  ChevronDown, ChevronUp, AlertTriangle, Info, Mail
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import adminAPI from '../../services/api/adminAPI';
import analyticsAPI from '../../services/api/analyticsAPI';
import StatsCard from '../../components/admin/StatsCard';
import PrivatePageSEO from '@/components/common/PrivatePageSEO';
import logger from '@/utils/logger';

const STATUS_COLORS: Record<string, string> = {
  submitted: 'bg-blue-100 text-blue-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  withdrawn: 'bg-gray-100 text-gray-800',
};

const DetailRow: React.FC<{ icon: React.ReactNode; label: string; value: React.ReactNode }> = ({ icon, label, value }) => (
  <div className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
    <div className="flex items-center gap-2 w-40 shrink-0 text-gray-500 text-sm">
      {icon}
      <span>{label}</span>
    </div>
    <div className="text-sm text-gray-900 flex-1">{value}</div>
  </div>
);

const AdminEventDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [event, setEvent] = useState<any>(null);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [regStats, setRegStats] = useState<any>(null);
  const [regPagination, setRegPagination] = useState<any>(null);
  const [performance, setPerformance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [regLoading, setRegLoading] = useState(false);
  const [perfLoading, setPerfLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'registrations'>('overview');
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [imgSrc, setImgSrc] = useState<string | null>(null);

  // Registrations tab
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [regPage, setRegPage] = useState(1);
  const [inlineActionId, setInlineActionId] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        setLoading(true);
        const data = await adminAPI.getEventById(id);
        const ev = data?.data?.event || data?.event || data;
        setEvent(ev);

        // Verify image URL returns a real image (not a placeholder SVG)
        const candidateUrl =
          (ev?.imageAssets as any[])?.find((a: any) => a?.url)?.url ||
          ev?.images?.[0];
        if (candidateUrl) {
          try {
            const res = await fetch(candidateUrl, { method: 'HEAD' });
            const ct = res.headers.get('content-type') || '';
            // Only show if it's a real image, not an SVG placeholder from the media endpoint
            if (res.ok && ct.startsWith('image/') && !ct.includes('svg')) {
              setImgSrc(candidateUrl);
            }
          } catch {
            // fetch failed — leave imgSrc null
          }
        }
      } catch (err: any) {
        logger.error('Failed to load event', err);
        toast.error('Failed to load event');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  useEffect(() => {
    if (activeTab !== 'registrations' && activeTab !== 'analytics') return;
    if (!id) return;
    const load = async () => {
      try {
        setRegLoading(true);
        const params: any = { page: regPage, limit: 20 };
        if (statusFilter) params.status = statusFilter;
        if (search) params.search = search;
        const res = await adminAPI.getEventRegistrations(id, params);
        const inner = res?.data?.data || res?.data || res;
        setRegistrations(inner?.registrations || inner?.data || []);
        setRegStats(inner?.stats || null);
        setRegPagination(inner?.pagination || null);
      } catch (err: any) {
        logger.error('Failed to load registrations', err);
      } finally {
        setRegLoading(false);
      }
    };
    load();
  }, [id, activeTab, statusFilter, search, regPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setRegPage(1);
  }, [statusFilter, search]);

  useEffect(() => {
    if (activeTab !== 'analytics') return;
    if (!id || performance) return;
    const load = async () => {
      try {
        setPerfLoading(true);
        const result = await analyticsAPI.getEventPerformance(id);
        setPerformance(result?.data || result);
      } catch (err: any) {
        logger.error('Failed to load performance data', err);
      } finally {
        setPerfLoading(false);
      }
    };
    load();
  }, [id, activeTab]);

  const hasUnlimitedSeats = useMemo(() =>
    event?.dateSchedule?.some((s: any) => s.unlimitedSeats), [event]);

  const totalCapacity = useMemo(() => {
    if (!event?.dateSchedule) return 0;
    return event.dateSchedule.reduce((sum: number, s: any) => {
      if (s.unlimitedSeats) return sum;
      return sum + (s.availableSeats || 0) + (s.soldSeats || 0) + (s.reservedSeats || 0);
    }, 0);
  }, [event]);

  const totalSold = useMemo(() => {
    if (!event?.dateSchedule) return 0;
    return event.dateSchedule.reduce((sum: number, s: any) => sum + (s.soldSeats || 0), 0);
  }, [event]);

  // Safely extract plain text from HTML description (e.g. from rich text editor)
  const descriptionText = useMemo(() => {
    const desc = event?.description;
    if (!desc) return '';
    if (typeof desc === 'string' && desc.trimStart().startsWith('<')) {
      try {
        const doc = new DOMParser().parseFromString(desc, 'text/html');
        return doc.body.innerText || doc.body.textContent || desc;
      } catch {
        return desc;
      }
    }
    return desc;
  }, [event?.description]);

  const handleApprove = async () => {
    if (!id) return;
    try {
      setActionLoading(true);
      await adminAPI.approveEvent(id);
      toast.success('Event approved');
      setEvent((e: any) => ({ ...e, isApproved: true, status: 'active' }));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to approve event');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!id || !rejectReason.trim()) {
      toast.error('Rejection reason required');
      return;
    }
    try {
      setActionLoading(true);
      await adminAPI.rejectEvent(id, rejectReason);
      toast.success('Event rejected');
      setEvent((e: any) => ({ ...e, isApproved: false, status: 'rejected' }));
      setShowRejectModal(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to reject event');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleFeatured = async () => {
    if (!id) return;
    try {
      setActionLoading(true);
      await adminAPI.toggleEventFeatured(id);
      toast.success('Featured status updated');
      setEvent((e: any) => ({ ...e, isFeatured: !e.isFeatured }));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update featured');
    } finally {
      setActionLoading(false);
    }
  };

  const handleInlineReview = async (regId: string, status: 'approved' | 'rejected') => {
    try {
      setInlineActionId(regId);
      await adminAPI.reviewRegistration(regId, { status });
      toast.success(`Registration ${status}`);
      setRegistrations(prev =>
        prev.map(r => r._id === regId ? { ...r, status } : r)
      );
      // Update byStatus counts
      setRegStats((prev: any) => {
        if (!prev?.byStatus) return prev;
        const bs = { ...prev.byStatus };
        const oldStatus = registrations.find(r => r._id === regId)?.status;
        if (oldStatus) bs[oldStatus] = Math.max(0, (bs[oldStatus] || 0) - 1);
        bs[status] = (bs[status] || 0) + 1;
        return { ...prev, byStatus: bs };
      });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Action failed');
    } finally {
      setInlineActionId(null);
    }
  };

  const handleExportCSV = async () => {
    if (!id) return;
    try {
      const res = await adminAPI.getEventRegistrations(id, { limit: 10000 });
      const inner = res?.data?.data || res?.data || res;
      const allRegs: any[] = inner?.registrations || inner?.data || [];

      if (allRegs.length === 0) {
        toast.error('No registrations to export');
        return;
      }

      const fieldLabels = new Set<string>();
      allRegs.forEach((reg: any) => {
        (reg.registrationData || []).forEach((d: any) => {
          if (d.fieldLabel) fieldLabels.add(d.fieldLabel);
        });
      });
      const dynamicFields = Array.from(fieldLabels);

      const headers = ['Name', 'Email', 'Status', 'SubmittedAt', ...dynamicFields];
      const rows = allRegs.map((reg: any) => {
        const user = reg.userId || {};
        const name = `${user.firstName || ''} ${user.lastName || ''}`.trim();
        const email = user.email || '';
        const status = reg.status || '';
        const submitted = reg.submittedAt ? new Date(reg.submittedAt).toISOString() : '';
        const fieldMap: Record<string, string> = {};
        (reg.registrationData || []).forEach((d: any) => {
          if (d.fieldLabel) fieldMap[d.fieldLabel] = String(d.value ?? '');
        });
        return [name, email, status, submitted, ...dynamicFields.map(f => fieldMap[f] || '')];
      });

      const csvContent = [headers, ...rows]
        .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
        .join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `registrations-${id}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('CSV exported');
    } catch (err: any) {
      logger.error('Export failed', err);
      toast.error('Export failed');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="p-6 text-center text-gray-500">
        Event not found.{' '}
        <button onClick={() => navigate('/admin/events')} className="text-indigo-600 hover:underline">
          Back to Events
        </button>
      </div>
    );
  }

  const tabs = [
    { key: 'overview', label: 'Overview', icon: List },
    { key: 'analytics', label: 'Analytics', icon: BarChart2 },
    { key: 'registrations', label: 'Registrations', icon: Users },
  ] as const;

  const vendorName = event.vendor?.businessName || event.vendor?.fullName || null;
  const vendorEmail = event.vendor?.email || null;
  const categoryName = typeof event.category === 'object' ? event.category?.name : event.category;
  const regConfigFields = event.registrationConfig?.fields?.length ?? 0;

  // ageRange can be [min, max] array OR { min, max } object
  const ageMin = Array.isArray(event.ageRange) ? event.ageRange[0] : event.ageRange?.min;
  const ageMax = Array.isArray(event.ageRange) ? event.ageRange[1] : event.ageRange?.max;

  return (
    <>
      <PrivatePageSEO title={`Event: ${event.title}`} />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <button onClick={() => navigate('/admin/events')} className="p-2 hover:bg-gray-100 rounded-lg mt-0.5">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{event.title}</h1>
              <p className="text-xs text-gray-400 mt-0.5 font-mono">ID: {event.id || event._id}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <Link
              to={`/admin/events/${event.id || id}/edit`}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium"
            >
              <Edit className="w-4 h-4" />
              Edit
            </Link>
            {!event.isApproved && (
              <button
                onClick={handleApprove}
                disabled={actionLoading}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4" />
                Approve
              </button>
            )}
            {event.isApproved && (
              <button
                onClick={() => setShowRejectModal(true)}
                disabled={actionLoading}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" />
                Reject
              </button>
            )}
            <button
              onClick={handleToggleFeatured}
              disabled={actionLoading}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 ${
                event.isFeatured
                  ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                  : 'bg-white border border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Star className="w-4 h-4" />
              {event.isFeatured ? 'Unfeature' : 'Feature'}
            </button>
          </div>
        </div>

        {/* Deleted warning */}
        {event.isDeleted && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            This event has been soft-deleted and is not visible to users.
          </div>
        )}

        {/* Status badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`px-2.5 py-1 text-xs rounded-full font-medium ${
            event.isApproved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
          }`}>
            {event.isApproved ? 'Approved' : 'Pending Approval'}
          </span>
          {event.status && (
            <span className="px-2.5 py-1 text-xs rounded-full font-medium bg-gray-100 text-gray-700 capitalize">
              {event.status}
            </span>
          )}
          {event.isActive && (
            <span className="px-2.5 py-1 text-xs rounded-full font-medium bg-blue-100 text-blue-800">Active</span>
          )}
          {event.isFeatured && (
            <span className="px-2.5 py-1 text-xs rounded-full font-medium bg-yellow-100 text-yellow-800">Featured</span>
          )}
          {event.isAffiliateEvent && (
            <span className="px-2.5 py-1 text-xs rounded-full font-medium bg-purple-100 text-purple-800">
              Affiliate · {event.claimStatus || 'unclaimed'}
            </span>
          )}
          {event.isDeleted && (
            <span className="px-2.5 py-1 text-xs rounded-full font-medium bg-red-100 text-red-800">Deleted</span>
          )}
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex gap-6">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* ── Overview Tab ── */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-5">
              {/* Hero image */}
              {imgSrc ? (
                <img
                  src={imgSrc}
                  alt={event.title}
                  className="w-full h-64 object-cover rounded-xl border border-gray-100"
                  onError={() => setImgSrc(null)}
                />
              ) : (
                <div className="w-full h-64 bg-gray-100 rounded-xl border border-gray-100 flex items-center justify-center">
                  <span className="text-sm text-gray-400">No image available</span>
                </div>
              )}

              {/* Core details */}
              <div className="bg-white rounded-xl border border-gray-100 p-6">
                <h2 className="font-semibold text-gray-900 text-base mb-3">Event Details</h2>
                <div className="divide-y divide-gray-50">
                  {categoryName && (
                    <DetailRow
                      icon={<Tag className="w-4 h-4" />}
                      label="Category"
                      value={categoryName}
                    />
                  )}
                  {event.type && (
                    <DetailRow
                      icon={<Award className="w-4 h-4" />}
                      label="Type"
                      value={event.type}
                    />
                  )}
                  {event.venueType && (
                    <DetailRow
                      icon={<MapPin className="w-4 h-4" />}
                      label="Venue Type"
                      value={event.venueType}
                    />
                  )}
                  {(event.location?.address || event.location?.city) && (
                    <DetailRow
                      icon={<MapPin className="w-4 h-4" />}
                      label="Location"
                      value={[event.location?.address, event.location?.city, event.location?.country]
                        .filter(Boolean).join(', ')}
                    />
                  )}
                  {vendorName && (
                    <DetailRow
                      icon={<Users className="w-4 h-4" />}
                      label="Vendor"
                      value={
                        <span>
                          {vendorName}
                          {vendorEmail && (
                            <span className="ml-2 text-gray-400 text-xs flex items-center gap-1 inline-flex">
                              <Mail className="w-3 h-3" />
                              {vendorEmail}
                            </span>
                          )}
                        </span>
                      }
                    />
                  )}
                  {(ageMin != null || ageMax != null) && (
                    <DetailRow
                      icon={<Users className="w-4 h-4" />}
                      label="Age Range"
                      value={`${ageMin ?? 0} – ${ageMax ?? '∞'} yrs`}
                    />
                  )}
                  {(event.price != null) && (
                    <DetailRow
                      icon={<DollarSign className="w-4 h-4" />}
                      label="Base Price"
                      value={event.price === 0 ? 'Free' : `${event.currency || 'AED'} ${event.price}`}
                    />
                  )}
                  {event.meetingLink && (
                    <DetailRow
                      icon={<Link2 className="w-4 h-4" />}
                      label="Meeting Link"
                      value={
                        <a href={event.meetingLink} target="_blank" rel="noopener noreferrer"
                          className="text-indigo-600 hover:underline break-all">
                          {event.meetingLink}
                        </a>
                      }
                    />
                  )}
                  {event.externalBookingLink && (
                    <DetailRow
                      icon={<Globe className="w-4 h-4" />}
                      label="External Booking"
                      value={
                        <a href={event.externalBookingLink} target="_blank" rel="noopener noreferrer"
                          className="text-indigo-600 hover:underline break-all">
                          {event.externalBookingLink}
                        </a>
                      }
                    />
                  )}
                  {event.affiliateCode && (
                    <DetailRow
                      icon={<Info className="w-4 h-4" />}
                      label="Affiliate Code"
                      value={<span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{event.affiliateCode}</span>}
                    />
                  )}
                  {event.requirePhoneVerification && (
                    <DetailRow
                      icon={<Phone className="w-4 h-4" />}
                      label="Phone Required"
                      value="Yes — phone verification required at checkout"
                    />
                  )}
                  {event.createdAt && (
                    <DetailRow
                      icon={<Clock className="w-4 h-4" />}
                      label="Created"
                      value={new Date(event.createdAt).toLocaleString()}
                    />
                  )}
                  {event.updatedAt && (
                    <DetailRow
                      icon={<Clock className="w-4 h-4" />}
                      label="Last Updated"
                      value={new Date(event.updatedAt).toLocaleString()}
                    />
                  )}
                </div>
              </div>

              {/* Description */}
              {descriptionText && (
                <div className="bg-white rounded-xl border border-gray-100 p-6">
                  <h2 className="font-semibold text-gray-900 text-base mb-3">Description</h2>
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{descriptionText}</p>
                </div>
              )}

              {/* Tags */}
              {event.tags && event.tags.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-100 p-6">
                  <h2 className="font-semibold text-gray-900 text-base mb-3">Tags</h2>
                  <div className="flex flex-wrap gap-2">
                    {event.tags.map((tag: string, i: number) => (
                      <span key={i} className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Registration Config */}
              {event.registrationConfig && (
                <div className="bg-white rounded-xl border border-gray-100 p-6">
                  <h2 className="font-semibold text-gray-900 text-base mb-3">Registration Form</h2>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Requires Registration</span>
                      <span className="font-medium">
                        {event.registrationConfig.requiresRegistration ? 'Yes' : 'No'}
                      </span>
                    </div>
                    {event.registrationConfig.requiresApproval !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Requires Approval</span>
                        <span className="font-medium">
                          {event.registrationConfig.requiresApproval ? 'Yes' : 'No'}
                        </span>
                      </div>
                    )}
                    {regConfigFields > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Form Fields</span>
                        <span className="font-medium">{regConfigFields} fields configured</span>
                      </div>
                    )}
                    {event.registrationConfig.maxRegistrations != null && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Max Registrations</span>
                        <span className="font-medium">{event.registrationConfig.maxRegistrations}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* FAQs */}
              {event.faqs && event.faqs.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-100 p-6">
                  <h2 className="font-semibold text-gray-900 text-base mb-3">FAQs ({event.faqs.length})</h2>
                  <div className="space-y-2">
                    {event.faqs.map((faq: any, i: number) => (
                      <div key={i} className="border border-gray-100 rounded-lg overflow-hidden">
                        <button
                          onClick={() => setOpenFaq(openFaq === i ? null : i)}
                          className="w-full flex items-center justify-between px-4 py-3 text-left text-sm font-medium text-gray-800 hover:bg-gray-50"
                        >
                          <span>{faq.question}</span>
                          {openFaq === i
                            ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" />
                            : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
                        </button>
                        {openFaq === i && (
                          <div className="px-4 py-3 bg-gray-50 text-sm text-gray-600 border-t border-gray-100">
                            {faq.answer}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right column — Date Schedules + Ratings */}
            <div className="space-y-5">
              {/* Date schedules */}
              <div className="bg-white rounded-xl border border-gray-100 p-6">
                <h2 className="font-semibold text-gray-900 mb-4">
                  Date Schedules
                  <span className="ml-2 text-xs font-normal text-gray-400">
                    ({(event.dateSchedule || []).length})
                  </span>
                </h2>
                <div className="space-y-3">
                  {(event.dateSchedule || []).map((s: any, i: number) => (
                    <div key={i} className="border border-gray-100 rounded-lg p-3 text-sm">
                      <div className="flex items-center gap-2 text-gray-700 font-medium mb-1">
                        <Calendar className="w-4 h-4 text-indigo-500" />
                        {s.startDate
                          ? new Date(s.startDate).toLocaleDateString(undefined, { dateStyle: 'medium' })
                          : `Schedule ${i + 1}`}
                        {s.endDate && s.endDate !== s.startDate && (
                          <span className="text-gray-400 font-normal text-xs">
                            → {new Date(s.endDate).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                          </span>
                        )}
                      </div>
                      {s.startTime && (
                        <div className="flex items-center gap-1 text-gray-500 text-xs mb-1.5">
                          <Clock className="w-3 h-3" />
                          {s.startTime}{s.endTime ? ` – ${s.endTime}` : ''}
                        </div>
                      )}
                      <div className="flex items-center justify-between text-xs text-gray-500 pt-1.5 border-t border-gray-50">
                        <span>
                          {s.soldSeats ?? 0} sold
                          {s.unlimitedSeats
                            ? ' / ∞'
                            : ` / ${(s.availableSeats ?? 0) + (s.soldSeats ?? 0) + (s.reservedSeats ?? 0)} total`}
                        </span>
                        {s.price != null && (
                          <span className="flex items-center gap-0.5 font-medium text-gray-700">
                            <DollarSign className="w-3 h-3" />
                            {s.price === 0 ? 'Free' : `${s.price} ${event.currency || ''}`}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {(!event.dateSchedule || event.dateSchedule.length === 0) && (
                    <p className="text-sm text-gray-400">No schedules configured</p>
                  )}
                </div>
              </div>

              {/* Ratings summary */}
              {(event.reviewCount > 0 || event.averageRating > 0) && (
                <div className="bg-white rounded-xl border border-gray-100 p-6">
                  <h2 className="font-semibold text-gray-900 mb-4">Ratings</h2>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-3xl font-bold text-gray-900">
                      {Number(event.averageRating).toFixed(1)}
                    </span>
                    <div>
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map(n => (
                          <Star
                            key={n}
                            className={`w-4 h-4 ${n <= Math.round(event.averageRating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{event.reviewCount} review{event.reviewCount !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  {event.ratingDistribution && (
                    <div className="space-y-1.5">
                      {[5, 4, 3, 2, 1].map(star => {
                        const count = event.ratingDistribution[star] || 0;
                        const pct = event.reviewCount > 0 ? (count / event.reviewCount) * 100 : 0;
                        return (
                          <div key={star} className="flex items-center gap-2 text-xs">
                            <span className="w-4 text-right text-gray-500">{star}</span>
                            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400 shrink-0" />
                            <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                              <div className="bg-yellow-400 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="w-4 text-gray-400">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {event.googleRating > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-50 text-xs text-gray-500">
                      Google: {event.googleRating.toFixed(1)} ★ ({event.googleReviewCount} reviews)
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Analytics Tab ── */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {perfLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatsCard
                    title="Total Revenue"
                    value={performance
                      ? `${performance.event?.currency || event.currency || 'AED'} ${(performance.revenue?.total || 0).toLocaleString()}`
                      : '—'}
                    icon={DollarSign}
                    iconColor="text-green-600"
                    gradient="from-green-50 to-green-100"
                  />
                  <StatsCard
                    title="Tickets Sold"
                    value={performance?.revenue?.tickets ?? totalSold}
                    icon={CheckCircle}
                    iconColor="text-blue-600"
                    gradient="from-blue-50 to-blue-100"
                  />
                  <StatsCard
                    title="Event Views"
                    value={performance?.event?.views ?? event.viewsCount ?? 0}
                    icon={Eye}
                    iconColor="text-indigo-600"
                    gradient="from-indigo-50 to-indigo-100"
                  />
                  <StatsCard
                    title="Check-in Rate"
                    value={performance ? `${(performance.tickets?.checkInRate || 0).toFixed(1)}%` : '—'}
                    icon={Users}
                    iconColor="text-purple-600"
                    gradient="from-purple-50 to-purple-100"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatsCard
                    title="Capacity"
                    value={hasUnlimitedSeats ? '∞' : totalCapacity}
                    icon={Users}
                    iconColor="text-gray-600"
                    gradient="from-gray-50 to-gray-100"
                  />
                  <StatsCard
                    title="Conversion Rate"
                    value={performance ? `${(performance.revenue?.conversionRate || 0).toFixed(2)}%` : '—'}
                    icon={BarChart2}
                    iconColor="text-orange-600"
                    gradient="from-orange-50 to-orange-100"
                  />
                  <StatsCard
                    title="Avg Order Value"
                    value={performance
                      ? `${performance.event?.currency || event.currency || 'AED'} ${(performance.revenue?.averageOrderValue || 0).toFixed(2)}`
                      : '—'}
                    icon={DollarSign}
                    iconColor="text-teal-600"
                    gradient="from-teal-50 to-teal-100"
                  />
                  <StatsCard
                    title="Rating"
                    value={performance
                      ? (performance.reviews?.averageRating
                          ? `${performance.reviews.averageRating.toFixed(1)} ★`
                          : 'N/A')
                      : (event.averageRating ? `${Number(event.averageRating).toFixed(1)} ★` : 'N/A')}
                    icon={Star}
                    iconColor="text-yellow-500"
                    gradient="from-yellow-50 to-yellow-100"
                  />
                </div>

                {performance && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white rounded-xl border border-gray-100 p-6">
                      <h2 className="font-semibold text-gray-900 mb-4">Ticket Breakdown</h2>
                      <div className="space-y-3">
                        {[
                          { label: 'Total Tickets', value: performance.tickets?.total ?? 0 },
                          { label: 'Checked In', value: performance.tickets?.checkedIn ?? 0 },
                          { label: 'Transferred', value: performance.tickets?.transferred ?? 0 },
                          { label: 'Total Orders', value: performance.revenue?.orders ?? 0 },
                        ].map(row => (
                          <div key={row.label} className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">{row.label}</span>
                            <span className="font-semibold text-gray-900">{row.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-100 p-6">
                      <h2 className="font-semibold text-gray-900 mb-4">Seat Utilization</h2>
                      {performance.seats?.hasUnlimitedSeats ? (
                        <p className="text-sm text-gray-500">Unlimited seats — no capacity limit</p>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Sold</span>
                            <span className="font-semibold">{performance.seats?.sold ?? 0}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Total Capacity</span>
                            <span className="font-semibold">{performance.seats?.total ?? 0}</span>
                          </div>
                          {performance.seats?.utilizationRate != null && (
                            <>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Utilization</span>
                                <span className={`font-semibold ${
                                  performance.seats.utilizationRate >= 80 ? 'text-green-600' :
                                  performance.seats.utilizationRate >= 50 ? 'text-yellow-600' : 'text-red-600'
                                }`}>
                                  {performance.seats.utilizationRate.toFixed(1)}%
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-indigo-600 h-2 rounded-full transition-all"
                                  style={{ width: `${Math.min(performance.seats.utilizationRate, 100)}%` }}
                                />
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {(performance?.registrations?.byStatus || regStats?.byStatus) && (
                  <div className="bg-white rounded-xl border border-gray-100 p-6">
                    <h2 className="font-semibold text-gray-900 mb-4">
                      Registrations by Status
                      {(performance?.registrations?.total || regStats?.total) != null && (
                        <span className="ml-2 text-sm font-normal text-gray-500">
                          ({performance?.registrations?.total ?? regStats?.total} total)
                        </span>
                      )}
                    </h2>
                    <div className="flex flex-wrap gap-3">
                      {Object.entries(
                        (performance?.registrations?.byStatus || regStats?.byStatus || {}) as Record<string, number>
                      ).map(([status, count]) => (
                        <div key={status} className={`px-4 py-2 rounded-lg text-sm font-medium ${STATUS_COLORS[status] || 'bg-gray-100 text-gray-700'}`}>
                          {status.replace('_', ' ')}: {count}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Registrations Tab ── */}
        {activeTab === 'registrations' && (
          <div className="space-y-4">
            {/* Stats bar */}
            {(regStats?.byStatus || regPagination) && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Total', value: regPagination?.total ?? 0, color: 'bg-gray-50 text-gray-700' },
                  { label: 'Submitted', value: regStats?.byStatus?.submitted ?? 0, color: 'bg-blue-50 text-blue-700' },
                  { label: 'Approved', value: regStats?.byStatus?.approved ?? 0, color: 'bg-green-50 text-green-700' },
                  { label: 'Rejected', value: regStats?.byStatus?.rejected ?? 0, color: 'bg-red-50 text-red-700' },
                ].map(s => (
                  <div key={s.label} className={`rounded-xl px-4 py-3 ${s.color}`}>
                    <div className="text-xs font-medium uppercase tracking-wide opacity-70">{s.label}</div>
                    <div className="text-2xl font-bold mt-0.5">{s.value}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-lg px-3 py-2 flex-1 min-w-[180px]">
                <Search className="w-4 h-4 text-gray-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="text-sm outline-none w-full"
                />
              </div>
              <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-lg px-3 py-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="text-sm outline-none"
                >
                  <option value="">All statuses</option>
                  <option value="submitted">Submitted</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="withdrawn">Withdrawn</option>
                </select>
              </div>
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            </div>

            {regLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
              </div>
            ) : registrations.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-100 py-16 text-center">
                <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No registrations found</p>
                {(search || statusFilter) && (
                  <button
                    onClick={() => { setSearch(''); setStatusFilter(''); }}
                    className="mt-2 text-xs text-indigo-600 hover:underline"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">
                        Form Data
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">
                        Submitted
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {registrations.map((reg: any) => {
                      const user = reg.userId || {};
                      const firstName = user.firstName || '';
                      const lastName = user.lastName || '';
                      const name = `${firstName} ${lastName}`.trim() || 'Unknown';
                      const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || '?';
                      const fieldCount = (reg.registrationData || []).length;
                      const fieldSummary = (reg.registrationData || [])
                        .slice(0, 2)
                        .map((d: any) => `${d.fieldLabel}: ${String(d.value ?? '').slice(0, 30)}`)
                        .join(' · ');
                      const isActing = inlineActionId === reg._id;
                      return (
                        <tr key={reg._id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-semibold shrink-0">
                                {initials}
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900">{name}</div>
                                <div className="text-xs text-gray-500">{user.email || '—'}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 text-xs rounded-full font-medium ${STATUS_COLORS[reg.status] || 'bg-gray-100 text-gray-700'}`}>
                              {reg.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            <div className="text-xs text-gray-500 max-w-xs truncate">
                              {fieldSummary || <span className="text-gray-300">—</span>}
                            </div>
                            {fieldCount > 2 && (
                              <div className="text-xs text-gray-400">+{fieldCount - 2} more fields</div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500 hidden md:table-cell">
                            {reg.submittedAt
                              ? new Date(reg.submittedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
                              : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              {reg.status === 'submitted' && (
                                <>
                                  <button
                                    onClick={() => handleInlineReview(reg._id, 'approved')}
                                    disabled={isActing}
                                    className="flex items-center gap-1 px-2 py-1 text-xs bg-green-50 text-green-700 border border-green-200 rounded-md hover:bg-green-100 disabled:opacity-50"
                                    title="Approve"
                                  >
                                    {isActing ? (
                                      <div className="w-3 h-3 border-b border-green-700 rounded-full animate-spin" />
                                    ) : (
                                      <CheckCircle className="w-3 h-3" />
                                    )}
                                    <span className="hidden sm:inline">Approve</span>
                                  </button>
                                  <button
                                    onClick={() => handleInlineReview(reg._id, 'rejected')}
                                    disabled={isActing}
                                    className="flex items-center gap-1 px-2 py-1 text-xs bg-red-50 text-red-700 border border-red-200 rounded-md hover:bg-red-100 disabled:opacity-50"
                                    title="Reject"
                                  >
                                    {isActing ? (
                                      <div className="w-3 h-3 border-b border-red-700 rounded-full animate-spin" />
                                    ) : (
                                      <XCircle className="w-3 h-3" />
                                    )}
                                    <span className="hidden sm:inline">Reject</span>
                                  </button>
                                </>
                              )}
                              <button
                                onClick={() => navigate(`/admin/registrations/${reg._id}`)}
                                className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-md"
                                title="View details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Pagination */}
                {regPagination && regPagination.totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
                    <span className="text-xs text-gray-500">
                      Page {regPagination.currentPage} of {regPagination.totalPages}
                      {' '}· {regPagination.total} total
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setRegPage(p => Math.max(1, p - 1))}
                        disabled={regPagination.currentPage <= 1}
                        className="px-3 py-1 text-xs border border-gray-300 rounded-md bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setRegPage(p => Math.min(regPagination.totalPages, p + 1))}
                        disabled={regPagination.currentPage >= regPagination.totalPages}
                        className="px-3 py-1 text-xs border border-gray-300 rounded-md bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Reject Event</h2>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Reason for rejection..."
              className="w-full border border-gray-300 rounded-lg p-3 text-sm h-24 resize-none focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                Reject Event
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminEventDetailPage;
