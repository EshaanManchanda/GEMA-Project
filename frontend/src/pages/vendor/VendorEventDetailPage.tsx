import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Edit, Star, MapPin, DollarSign, Users, CheckSquare, BarChart2,
  Calendar, ChevronDown, ChevronUp, Trash2, BookOpen, Video, Globe, Eye,
  Clock, Wifi, Shield, Award, Tag, AlertTriangle, ExternalLink, Copy,
  CheckCircle, XCircle, Info, RotateCcw, Link, Lock, Unlock, TrendingUp,
  Layers, Building2, Zap, Download
} from 'lucide-react';
import { FaWpforms, FaClipboardList, FaStar, FaStarHalfAlt, FaRegStar, FaGoogle } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import vendorAPI from '../../services/api/vendorAPI';
import { useVendorEventQuery, useEventPerformanceQuery } from '@/hooks/queries/useVendorQuery';
import PrivatePageSEO from '@/components/common/PrivatePageSEO';

// ─── Types ────────────────────────────────────────────────────────────────────

const EDUCATIONAL_TYPES = ['Class', 'Bootcamp', 'Masterclass', 'Course', 'Workshop'];
const COMPETITION_TYPES = ['Olympiad', 'Championship', 'Competition'];
const ONLINE_VENUE_TYPES = ['Online'];

// ─── Utility Components ───────────────────────────────────────────────────────

const Badge: React.FC<{ children: React.ReactNode; variant?: string }> = ({
  children,
  variant = 'gray',
}) => {
  const variants: Record<string, string> = {
    green:  'bg-green-100 text-green-800 border-green-200',
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    red:    'bg-red-100 text-red-800 border-red-200',
    blue:   'bg-blue-100 text-blue-800 border-blue-200',
    purple: 'bg-purple-100 text-purple-800 border-purple-200',
    indigo: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    orange: 'bg-orange-100 text-orange-800 border-orange-200',
    gray:   'bg-gray-100 text-gray-700 border-gray-200',
    emerald:'bg-emerald-100 text-emerald-800 border-emerald-200',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${variants[variant] ?? variants.gray}`}>
      {children}
    </span>
  );
};

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 ${className}`}>{children}</div>
);

const CardHeader: React.FC<{ icon: React.ReactNode; title: string; right?: React.ReactNode }> = ({ icon, title, right }) => (
  <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-50">
    <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-800 uppercase tracking-wider">
      <span className="text-emerald-600">{icon}</span>{title}
    </h3>
    {right && <div className="text-xs text-gray-400">{right}</div>}
  </div>
);

const Field: React.FC<{ label: string; value: React.ReactNode; span?: boolean }> = ({ label, value, span }) => (
  <div className={span ? 'col-span-2' : ''}>
    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
    <div className="text-sm text-gray-800">{value || <span className="text-gray-300 italic">—</span>}</div>
  </div>
);

const ProgressBar: React.FC<{ value: number; color?: string; height?: string }> = ({
  value, color = 'bg-emerald-500', height = 'h-2',
}) => (
  <div className={`w-full bg-gray-100 rounded-full ${height} overflow-hidden`}>
    <div
      className={`${color} ${height} rounded-full transition-all duration-500`}
      style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
    />
  </div>
);

const StatCard: React.FC<{
  label: string; value: string | number; sub?: string;
  icon: React.ReactNode; gradient: string; iconBg: string;
}> = ({ label, value, sub, icon, gradient, iconBg }) => (
  <div className={`relative overflow-hidden rounded-2xl p-5 ${gradient} border border-white/20 shadow-sm`}>
    <div className={`inline-flex p-2.5 rounded-xl ${iconBg} mb-3`}>{icon}</div>
    <p className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-1">{label}</p>
    <p className="text-2xl font-bold text-white">{value}</p>
    {sub && <p className="text-xs text-white/60 mt-0.5">{sub}</p>}
  </div>
);

const StarDisplay: React.FC<{ rating: number; size?: number }> = ({ rating, size = 14 }) => {
  const full  = Math.floor(rating);
  const half  = rating % 1 >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  return (
    <span className="inline-flex items-center gap-0.5 text-yellow-400">
      {Array(full).fill(0).map((_, i) => <FaStar key={`f${i}`} size={size} />)}
      {half && <FaStarHalfAlt size={size} />}
      {Array(empty).fill(0).map((_, i) => <FaRegStar key={`e${i}`} size={size} />)}
    </span>
  );
};

const CopyButton: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="ml-2 text-gray-400 hover:text-emerald-600 transition-colors" title="Copy">
      {copied ? <CheckCircle size={13} className="text-emerald-500" /> : <Copy size={13} />}
    </button>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const VendorEventDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [openFaq,      setOpenFaq]      = useState<number | null>(null);
  const [lightbox,     setLightbox]     = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteLoading,setDeleteLoading]= useState(false);
  const [isExporting,  setIsExporting]  = useState(false);

  const { data: eventRaw, isLoading: eventLoading, isError: eventError } = useVendorEventQuery(id ?? '');
  const { data: perfRaw,  isLoading: perfLoading  } = useEventPerformanceQuery(id ?? '');

  const loading = eventLoading || perfLoading;
  const event   = eventRaw?.data?.event ?? eventRaw?.event ?? eventRaw ?? null;
  const performance = perfRaw?.data ?? perfRaw ?? null;

  if (eventError) {
    toast.error('Failed to load event');
    navigate('/vendor/events');
    return null;
  }

  const handleDelete = async (permanent: boolean) => {
    if (!id) return;
    try {
      setDeleteLoading(true);
      await vendorAPI.deleteVendorEvent(id, permanent);
      toast.success(permanent ? 'Event permanently deleted' : 'Event soft-deleted');
      navigate('/vendor/events');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Delete failed');
    } finally {
      setDeleteLoading(false);
      setIsDeleteOpen(false);
    }
  };

  const handleExportParticipants = async () => {
    if (!id) return;
    setIsExporting(true);
    try {
      await vendorAPI.exportEventParticipants(id, 'csv');
      toast.success('Participants exported');
    } catch {
      toast.error('Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative inline-block">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-emerald-200" />
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-emerald-600 absolute top-0 left-0" />
          </div>
          <p className="mt-4 text-lg font-semibold text-gray-500 animate-pulse">Loading event…</p>
        </div>
      </div>
    );
  }
  if (!event) return null;

  // ── Derived values ──
  const perf            = performance ?? {};
  const currency        = event.currency ?? 'SAR';
  const heroImage       = event.imageAssets?.[0]?.url ?? event.images?.[0] ?? null;
  const allImages: string[] = [
    ...(event.imageAssets?.map((a: any) => a.url).filter(Boolean) ?? []),
    ...(event.images ?? []),
  ].filter((v, i, arr) => arr.indexOf(v) === i);

  // analytics
  const revenue       = perf.revenue?.total ?? 0;
  const avgOrder      = perf.revenue?.averageOrderValue ?? 0;
  const conversion    = perf.revenue?.conversionRate ?? 0;
  const revOrders     = perf.revenue?.orders ?? 0;
  const revTickets    = perf.revenue?.tickets ?? 0;
  const totalBookings = perf.revenue?.orders ?? perf.bookings?.total ?? 0;
  const ticketsTotal  = perf.tickets?.total ?? 0;
  const ticketsChecked= perf.tickets?.checkedIn ?? 0;
  const ticketsTrans  = perf.tickets?.transferred ?? 0;
  const checkInRate   = perf.tickets?.checkInRate ?? (ticketsTotal > 0 ? Math.round((ticketsChecked/ticketsTotal)*100) : 0);
  const seatsSold     = perf.seats?.sold ?? 0;
  const seatsTotal    = perf.seats?.total ?? 0;
  const seatsUnlimited= perf.seats?.hasUnlimitedSeats ?? false;
  const seatUtil      = perf.seats?.utilizationRate ?? (seatsTotal > 0 ? Math.round((seatsSold/seatsTotal)*100) : 0);
  const avgRating     = perf.reviews?.averageRating ?? event.averageRating ?? 0;
  const reviewCount   = perf.reviews?.total ?? event.reviewCount ?? 0;
  const ratingDist    = perf.reviews?.distribution ?? event.ratingDistribution ?? {};
  const totalRegistrations = perf.registrations?.total ?? 0;
  const regByStatus   = perf.registrations?.byStatus ?? {};

  const isCancelled   = event.cancellationStatus === 'cancelled';
  const isOnline      = ONLINE_VENUE_TYPES.includes(event.venueType);
  const isEducational = EDUCATIONAL_TYPES.includes(event.type);
  const isCompetition = COMPETITION_TYPES.includes(event.type);
  const isVenue       = event.type === 'Venue';
  const isAffiliate   = event.isAffiliateEvent;

  const statusVariant = event.isDeleted ? 'red'
    : isCancelled     ? 'red'
    : event.isApproved? 'green'
    : 'yellow';
  const statusLabel = event.isDeleted ? 'Deleted'
    : isCancelled     ? 'Cancelled'
    : event.isApproved? 'Approved'
    : 'Pending Approval';

  return (
    <>
      <PrivatePageSEO title={`${event.title} | Vendor Dashboard`} description="Event details" />

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <img src={lightbox} alt="Preview" className="max-h-screen max-w-full object-contain rounded-lg" />
          <button className="absolute top-4 right-4 text-white/70 hover:text-white" onClick={() => setLightbox(null)}>
            <XCircle size={28} />
          </button>
        </div>
      )}

      <div className="min-h-screen bg-gray-50">

        {/* ══ HERO BANNER ══════════════════════════════════════════════════════ */}
        <div className="relative">
          {heroImage ? (
            <div className="h-64 md:h-80 w-full overflow-hidden">
              <img src={heroImage} alt={event.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-gray-900/40 to-transparent" />
            </div>
          ) : (
            <div className="h-48 bg-gradient-to-br from-emerald-600 via-green-600 to-teal-700" />
          )}

          {/* Back button */}
          <button
            onClick={() => navigate('/vendor/events')}
            className="absolute top-4 left-4 flex items-center gap-2 text-white/90 hover:text-white text-sm
                       bg-black/30 hover:bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-lg transition-all"
          >
            <ArrowLeft size={15} /> Back to Events
          </button>

          {/* Cancellation banner */}
          {isCancelled && (
            <div className="absolute top-4 right-4 flex items-center gap-2 bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-lg">
              <AlertTriangle size={13} /> CANCELLED
            </div>
          )}

          {/* Hero title overlay */}
          <div className="absolute bottom-0 left-0 right-0 px-4 pb-5 md:px-8">
            <h1 className="text-2xl md:text-3xl font-bold text-white drop-shadow mb-2 leading-tight">
              {event.title}
            </h1>
            <div className="flex flex-wrap gap-2">
              <Badge variant={statusVariant}>{statusLabel}</Badge>
              {event.isFeatured && <Badge variant="blue"><Star size={9} /> Featured</Badge>}
              <Badge variant="gray">{event.type}</Badge>
              {event.venueType && <Badge variant="indigo">{event.venueType}</Badge>}
              {event.skillLevel && <Badge variant="purple">{event.skillLevel}</Badge>}
              {isAffiliate && <Badge variant="orange">Affiliate Event</Badge>}
              {event.isFreeEvent && <Badge variant="emerald">Free</Badge>}
              {event.status && event.status !== 'published' && <Badge variant="gray">{event.status}</Badge>}
              {!event.isActive && <Badge variant="red">Inactive</Badge>}
            </div>
          </div>
        </div>

        {/* ══ ACTION BAR ═══════════════════════════════════════════════════════ */}
        <div className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-20">
          <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <span className="font-medium text-gray-900">{event.title}</span>
              {event.slug && (
                <span className="text-gray-300">·</span>
              )}
              {event.slug && (
                <span className="font-mono text-xs text-gray-400">{event.slug}</span>
              )}
            </div>
            {!event.isDeleted && (
              <div className="flex flex-wrap gap-2">
                <button onClick={() => navigate(`/vendor/events/${id}/edit`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition-colors shadow-sm">
                  <Edit size={13} /> Edit
                </button>
                <button onClick={() => navigate(`/vendor/events/${id}/registration/builder`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-medium hover:bg-purple-700 transition-colors shadow-sm">
                  <FaWpforms size={12} /> Form Builder
                </button>
                <button onClick={() => navigate(`/vendor/events/${id}/registrations`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition-colors shadow-sm">
                  <FaClipboardList size={12} /> Registrations
                </button>
                <button onClick={handleExportParticipants} disabled={isExporting}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg
                             text-xs font-medium hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50">
                  <Download size={12} />
                  {isExporting ? 'Exporting…' : 'Export Participants'}
                </button>
                <button onClick={() => setIsDeleteOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors">
                  <Trash2 size={13} /> Delete
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ══ BODY ═════════════════════════════════════════════════════════════ */}
        <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">

          {/* ── CANCELLATION ALERT ── */}
          {isCancelled && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl">
              <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-800">Event Cancelled</p>
                {event.cancellationReason && (
                  <p className="text-xs text-red-600 mt-0.5">Reason: {event.cancellationReason}</p>
                )}
                {event.cancelledAt && (
                  <p className="text-xs text-red-400 mt-0.5">On {new Date(event.cancelledAt).toLocaleString()}</p>
                )}
                {event.cancellationNotification && (
                  <p className="text-xs text-red-500 mt-1">
                    Notified {event.cancellationNotification.notifiedCount} / {event.cancellationNotification.totalAttendees} attendees
                    {event.cancellationNotification.failedCount > 0 && ` (${event.cancellationNotification.failedCount} failed)`}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ── ANALYTICS SUMMARY CARDS ── */}
          {performance && (
            <div>
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <TrendingUp size={13} /> Performance Overview
              </h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  label="Total Revenue"
                  value={`${currency} ${Number(revenue).toLocaleString()}`}
                  sub={`${revOrders} orders · ${revTickets} tickets`}
                  icon={<DollarSign size={18} className="text-white" />}
                  gradient="bg-gradient-to-br from-emerald-500 to-green-600"
                  iconBg="bg-white/20"
                />
                <StatCard
                  label="Avg Order Value"
                  value={`${currency} ${Math.round(avgOrder).toLocaleString()}`}
                  sub={`Conversion ${Number(conversion).toFixed(1)}%`}
                  icon={<TrendingUp size={18} className="text-white" />}
                  gradient="bg-gradient-to-br from-blue-500 to-indigo-600"
                  iconBg="bg-white/20"
                />
                <StatCard
                  label="Check-in Rate"
                  value={`${Number(checkInRate).toFixed(0)}%`}
                  sub={`${ticketsChecked} checked / ${ticketsTotal} total`}
                  icon={<CheckSquare size={18} className="text-white" />}
                  gradient="bg-gradient-to-br from-violet-500 to-purple-600"
                  iconBg="bg-white/20"
                />
                <StatCard
                  label="Seat Utilization"
                  value={seatsUnlimited ? 'Unlimited' : `${Number(seatUtil).toFixed(0)}%`}
                  sub={seatsUnlimited ? `${seatsSold} sold` : `${seatsSold} / ${seatsTotal} seats`}
                  icon={<Users size={18} className="text-white" />}
                  gradient="bg-gradient-to-br from-orange-400 to-amber-500"
                  iconBg="bg-white/20"
                />
              </div>
            </div>
          )}

          {/* ── QUICK FACTS STRIP ── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { icon: <Eye size={14} />, label: 'Views', val: (event.viewsCount ?? 0).toLocaleString() },
              { icon: <DollarSign size={14} />, label: 'Base Price', val: event.isFreeEvent ? 'Free' : `${currency} ${event.price}` },
              { icon: <Users size={14} />, label: 'Bookings', val: totalBookings },
              { icon: <Star size={14} className="text-yellow-400" />, label: 'Rating', val: Number(avgRating).toFixed(1) },
              { icon: <Calendar size={14} />, label: 'Schedules', val: event.dateSchedule?.length ?? 0 },
              { icon: <FaClipboardList size={13} />, label: 'Registrations', val: totalRegistrations },
            ].map(({ icon, label, val }) => (
              <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center">
                <div className="flex items-center justify-center text-emerald-500 mb-1">{icon}</div>
                <p className="text-lg font-bold text-gray-900">{val}</p>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</p>
              </div>
            ))}
          </div>

          {/* ── MAIN TWO-COLUMN ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* ─ LEFT COL ─ */}
            <div className="lg:col-span-2 space-y-6">

              {/* Images Gallery */}
              {allImages.length > 0 && (
                <Card>
                  <CardHeader icon={<Layers size={14} />} title="Images Gallery" right={`${allImages.length} image${allImages.length > 1 ? 's' : ''}`} />
                  <div className="p-5">
                    {allImages.length === 1 ? (
                      <img
                        src={allImages[0]} alt="Event"
                        className="w-full h-64 object-cover rounded-xl cursor-zoom-in"
                        onClick={() => setLightbox(allImages[0])}
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {allImages.map((img, i) => (
                          <div
                            key={i}
                            className={`relative overflow-hidden rounded-xl cursor-zoom-in group ${i === 0 ? 'col-span-2 row-span-2 h-64' : 'h-32'}`}
                            onClick={() => setLightbox(img)}
                          >
                            <img
                              src={img} alt={`Event image ${i + 1}`}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              onError={(e) => { e.currentTarget.parentElement!.style.display = 'none'; }}
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {/* Description */}
              <Card>
                <CardHeader icon={<Info size={14} />} title="Description" />
                <div className="p-5">
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{event.description}</p>
                </div>
              </Card>

              {/* Tags */}
              {event.tags?.length > 0 && (
                <Card>
                  <CardHeader icon={<Tag size={14} />} title={`Tags (${event.tags.length})`} />
                  <div className="p-5 flex flex-wrap gap-2">
                    {event.tags.map((tag: string, i: number) => (
                      <span key={i} className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs rounded-full border border-emerald-100 font-medium">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </Card>
              )}

              {/* FAQs */}
              {event.faqs?.length > 0 && (
                <Card>
                  <CardHeader icon={<ChevronDown size={14} />} title={`FAQs (${event.faqs.length})`} />
                  <div className="p-5 space-y-2">
                    {event.faqs.map((faq: any, i: number) => (
                      <div key={i} className="border border-gray-100 rounded-xl overflow-hidden">
                        <button
                          className="w-full flex items-center justify-between px-4 py-3 text-left text-sm font-medium text-gray-800 hover:bg-gray-50 transition-colors"
                          onClick={() => setOpenFaq(openFaq === i ? null : i)}
                        >
                          <span>{faq.question}</span>
                          {openFaq === i ? <ChevronUp size={14} className="shrink-0 text-emerald-500" /> : <ChevronDown size={14} className="shrink-0 text-gray-400" />}
                        </button>
                        {openFaq === i && (
                          <div className="px-4 py-3 text-sm text-gray-600 bg-gray-50 border-t border-gray-100">
                            {faq.answer}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Prerequisites */}
              {event.prerequisites && (
                <Card>
                  <CardHeader icon={<CheckCircle size={14} />} title="Prerequisites" />
                  <div className="p-5">
                    <p className="text-sm text-gray-700 leading-relaxed">{event.prerequisites}</p>
                  </div>
                </Card>
              )}

            </div>

            {/* ─ RIGHT COL ─ */}
            <div className="space-y-6">

              {/* Core Info */}
              <Card>
                <CardHeader icon={<Info size={14} />} title="Event Details" />
                <div className="p-5 grid grid-cols-2 gap-4">
                  <Field label="Category"   value={event.category} />
                  <Field label="Type"       value={event.type} />
                  <Field label="Venue Type" value={event.venueType} />
                  <Field label="Age Range"  value={event.ageRange ? `${event.ageRange[0]}–${event.ageRange[1]} yrs` : null} />
                  <Field label="Base Price" value={event.isFreeEvent ? 'Free Event' : `${currency} ${event.price}`} />
                  <Field label="Currency"   value={currency} />
                  {event.capacity != null && <Field label="Capacity" value={event.capacity.toLocaleString()} />}
                  {event.skillLevel && <Field label="Level" value={event.skillLevel} />}
                  {event.timezone && <Field label="Timezone" value={event.timezone} />}
                  <div className="col-span-2 border-t border-gray-50 pt-3 mt-1">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Status Flags</p>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant={event.isApproved ? 'green' : 'yellow'}>{event.isApproved ? 'Approved' : 'Pending'}</Badge>
                      <Badge variant={event.isActive ? 'green' : 'red'}>{event.isActive ? 'Active' : 'Inactive'}</Badge>
                      {event.isFreeEvent && <Badge variant="emerald">Free</Badge>}
                      {event.requirePhoneVerification && <Badge variant="orange">Phone Verify</Badge>}
                      {event.isAffiliateEvent && <Badge variant="purple">Affiliate</Badge>}
                    </div>
                  </div>
                </div>
              </Card>

              {/* Location */}
              {event.location && (
                <Card>
                  <CardHeader icon={<MapPin size={14} />} title="Location" />
                  <div className="p-5 grid grid-cols-2 gap-4">
                    {event.location.address && <Field label="Address" value={event.location.address} span />}
                    {event.location.city    && <Field label="City"    value={event.location.city} />}
                    {event.location.state   && <Field label="State"   value={event.location.state} />}
                    {event.location.country && <Field label="Country" value={event.location.country} />}
                    {event.location.zipCode && <Field label="ZIP"     value={event.location.zipCode} />}
                    {event.location.coordinates?.lat != null && (
                      <div className="col-span-2">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Coordinates</p>
                        <a
                          href={`https://www.google.com/maps?q=${event.location.coordinates.lat},${event.location.coordinates.lng}`}
                          target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline"
                        >
                          <ExternalLink size={11} />
                          {Number(event.location.coordinates.lat).toFixed(6)}, {Number(event.location.coordinates.lng).toFixed(6)}
                        </a>
                      </div>
                    )}
                    {event.googlePlaceId && (
                      <div className="col-span-2">
                        <Field label="Google Place ID" value={
                          <span className="flex items-center gap-1">
                            <span className="font-mono text-xs">{event.googlePlaceId}</span>
                            <CopyButton text={event.googlePlaceId} />
                          </span>
                        } />
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {/* Date Schedules */}
              {event.dateSchedule?.length > 0 && (
                <Card>
                  <CardHeader icon={<Calendar size={14} />} title="Date Schedules" right={`${event.dateSchedule.length} session${event.dateSchedule.length > 1 ? 's' : ''}`} />
                  <div className="p-5 space-y-3">
                    {event.dateSchedule.map((s: any, i: number) => {
                      const dateStr = s.startDate ? new Date(s.startDate).toLocaleDateString()
                                    : s.date      ? new Date(s.date).toLocaleDateString()
                                    : 'TBD';
                      const endStr  = s.endDate ? new Date(s.endDate).toLocaleDateString() : null;
                      const soldPct = (s.totalSeats && s.soldSeats) ? Math.round((s.soldSeats / s.totalSeats) * 100) : 0;
                      return (
                        <div key={i} className="border border-gray-100 rounded-xl p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                              Session {i + 1}
                            </span>
                            {s.isSpecialDate && <Badge variant="orange">Special Date</Badge>}
                            {s.unlimitedSeats && <Badge variant="blue">Unlimited Seats</Badge>}
                          </div>
                          <div className="text-sm font-semibold text-gray-800 flex items-center gap-1">
                            <Calendar size={12} className="text-emerald-500" />
                            {dateStr}{endStr && endStr !== dateStr ? ` → ${endStr}` : ''}
                          </div>
                          {(s.startTime || s.endTime) && (
                            <div className="text-xs text-gray-500 flex items-center gap-1">
                              <Clock size={11} className="text-gray-400" />
                              {s.startTime ?? ''}{s.endTime ? ` – ${s.endTime}` : ''}
                            </div>
                          )}
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-gray-400">Price: </span>
                              <span className="font-semibold text-gray-700">{currency} {s.price}</span>
                            </div>
                            {!s.unlimitedSeats && s.totalSeats != null && (
                              <div>
                                <span className="text-gray-400">Seats: </span>
                                <span className="font-semibold text-gray-700">{s.availableSeats} avail / {s.totalSeats} total</span>
                              </div>
                            )}
                            {s.soldSeats != null && (
                              <div>
                                <span className="text-gray-400">Sold: </span>
                                <span className="font-semibold text-gray-700">{s.soldSeats}</span>
                              </div>
                            )}
                            {s.reservedSeats != null && s.reservedSeats > 0 && (
                              <div>
                                <span className="text-gray-400">Reserved: </span>
                                <span className="font-semibold text-amber-600">{s.reservedSeats}</span>
                              </div>
                            )}
                          </div>
                          {!s.unlimitedSeats && s.totalSeats > 0 && (
                            <ProgressBar value={soldPct} color={soldPct > 80 ? 'bg-red-400' : soldPct > 50 ? 'bg-amber-400' : 'bg-emerald-400'} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}

              {/* Online Event — Meeting Details */}
              {isOnline && (event.meetingLink || event.meetingPassword) && (
                <Card>
                  <CardHeader icon={<Video size={14} />} title="Meeting Details" />
                  <div className="p-5 space-y-3">
                    {event.meetingLink && (
                      <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Meeting Link</p>
                        <div className="flex items-center gap-2">
                          <a href={event.meetingLink} target="_blank" rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline truncate flex items-center gap-1">
                            <Link size={12} />{event.meetingLink}
                          </a>
                          <CopyButton text={event.meetingLink} />
                        </div>
                      </div>
                    )}
                    {event.meetingPassword && (
                      <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Password</p>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                            {showPassword ? event.meetingPassword : '••••••••'}
                          </span>
                          <button onClick={() => setShowPassword(v => !v)} className="text-gray-400 hover:text-gray-600">
                            {showPassword ? <Lock size={13} /> : <Unlock size={13} />}
                          </button>
                          <CopyButton text={event.meetingPassword} />
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              )}

            </div>
          </div>

          {/* ── ANALYTICS DETAIL (full-width) ── */}
          {performance && (
            <Card>
              <CardHeader icon={<BarChart2 size={14} />} title="Analytics Breakdown" />
              <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">

                {/* Revenue */}
                <div className="space-y-3">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                    <DollarSign size={12} className="text-emerald-500" />Revenue
                  </p>
                  <div className="space-y-2">
                    {[
                      { l: 'Total Revenue',    v: `${currency} ${Number(revenue).toLocaleString()}` },
                      { l: 'From Orders',      v: `${currency} ${Number(revOrders).toLocaleString()}` },
                      { l: 'From Tickets',     v: `${currency} ${Number(revTickets).toLocaleString()}` },
                      { l: 'Avg Order Value',  v: `${currency} ${Math.round(avgOrder).toLocaleString()}` },
                      { l: 'Conversion Rate',  v: `${Number(conversion).toFixed(2)}%` },
                    ].map(({ l, v }) => <AnalyticRow key={l} label={l} value={v} />)}
                  </div>
                </div>

                {/* Bookings & Tickets */}
                <div className="space-y-3">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckSquare size={12} className="text-violet-500" />Tickets
                  </p>
                  <div className="space-y-2">
                    {[
                      { l: 'Total Tickets',   v: ticketsTotal },
                      { l: 'Checked In',      v: ticketsChecked },
                      { l: 'Transferred',     v: ticketsTrans },
                    ].map(({ l, v }) => <AnalyticRow key={l} label={l} value={v} />)}
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>Check-in rate</span>
                      <span className="font-semibold text-violet-600">{Number(checkInRate).toFixed(0)}%</span>
                    </div>
                    <ProgressBar value={checkInRate} color="bg-violet-400" />
                  </div>
                </div>

                {/* Seats */}
                <div className="space-y-3">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Users size={12} className="text-orange-500" />Seats
                  </p>
                  <div className="space-y-2">
                    <AnalyticRow label="Sold" value={seatsSold} />
                    <AnalyticRow label="Total" value={seatsUnlimited ? '∞ Unlimited' : seatsTotal} />
                  </div>
                  {!seatsUnlimited && seatsTotal > 0 && (
                    <div>
                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>Utilization</span>
                        <span className="font-semibold text-orange-500">{Number(seatUtil).toFixed(0)}%</span>
                      </div>
                      <ProgressBar value={seatUtil} color="bg-orange-400" />
                    </div>
                  )}
                </div>

                {/* Reviews */}
                <div className="space-y-3">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Star size={12} className="text-yellow-500" />Reviews
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-gray-900">{Number(avgRating).toFixed(1)}</span>
                    <div>
                      <StarDisplay rating={avgRating} size={12} />
                      <p className="text-xs text-gray-400">{reviewCount} review{reviewCount !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {[5, 4, 3, 2, 1].map(star => {
                      const cnt = ratingDist[star] ?? 0;
                      const pct = reviewCount > 0 ? Math.round((cnt / reviewCount) * 100) : 0;
                      return (
                        <div key={star} className="flex items-center gap-2">
                          <span className="text-xs text-gray-400 w-3">{star}</span>
                          <FaStar size={9} className="text-yellow-400 shrink-0" />
                          <div className="flex-1"><ProgressBar value={pct} color="bg-yellow-400" /></div>
                          <span className="text-xs text-gray-400 w-5 text-right">{cnt}</span>
                        </div>
                      );
                    })}
                  </div>
                  {/* Google ratings */}
                  {(event.googleRating > 0 || event.googleReviewCount > 0) && (
                    <div className="pt-2 border-t border-gray-100">
                      <p className="text-xs text-gray-400 flex items-center gap-1 mb-1">
                        <FaGoogle size={10} className="text-blue-500" />Google Reviews
                      </p>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-bold">{Number(event.googleRating).toFixed(1)}</span>
                        <StarDisplay rating={event.googleRating} size={10} />
                        <span className="text-xs text-gray-400">({event.googleReviewCount})</span>
                      </div>
                    </div>
                  )}
                  {/* Combined */}
                  {event.combinedRating > 0 && (
                    <div className="pt-2 border-t border-gray-100">
                      <p className="text-xs text-gray-400 mb-1">Combined Rating</p>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm">{Number(event.combinedRating).toFixed(1)}</span>
                        <StarDisplay rating={event.combinedRating} size={11} />
                        <span className="text-xs text-gray-400">({event.combinedReviewCount})</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Registrations by Status */}
                <div className="space-y-3">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                    <FaClipboardList size={11} className="text-indigo-500" />Registrations
                  </p>
                  <AnalyticRow label="Total" value={totalRegistrations} />
                  {Object.entries(regByStatus).map(([status, count]) => (
                    <AnalyticRow key={status} label={status} value={count as number} />
                  ))}
                  {event.registrationConfig?.maxRegistrations && (
                    <>
                      <AnalyticRow label="Max Allowed" value={event.registrationConfig.maxRegistrations} />
                      <div>
                        <ProgressBar
                          value={Math.round((totalRegistrations / event.registrationConfig.maxRegistrations) * 100)}
                          color="bg-indigo-400"
                        />
                      </div>
                    </>
                  )}
                </div>

              </div>
            </Card>
          )}

          {/* ── EDUCATIONAL DETAILS ── */}
          {isEducational && (event.subject || event.topic || event.introVideo || event.teacherId || event.syllabus?.length > 0) && (
            <Card>
              <CardHeader icon={<BookOpen size={14} />} title="Educational Details" />
              <div className="p-5 space-y-5">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {event.subject   && <Field label="Subject"  value={event.subject} />}
                  {event.topic     && <Field label="Topic"    value={event.topic} />}
                  {event.skillLevel && <Field label="Level"   value={event.skillLevel} />}
                  {event.teacherId && typeof event.teacherId === 'object' && (
                    <Field label="Teacher" value={`${event.teacherId.firstName} ${event.teacherId.lastName}`} />
                  )}
                  {event.introVideo && (
                    <div className="col-span-2">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Intro Video</p>
                      <a href={event.introVideo} target="_blank" rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline flex items-center gap-1 break-all">
                        <Video size={13} className="shrink-0" />{event.introVideo}
                      </a>
                    </div>
                  )}
                </div>
                {event.syllabus?.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                      Syllabus ({event.syllabus.length} modules)
                    </p>
                    <div className="space-y-2">
                      {event.syllabus.map((item: any, i: number) => (
                        <div key={i} className="flex gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                          <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center shrink-0">
                            {i + 1}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-gray-800">{item.title}</p>
                            {item.description && <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>}
                            {item.duration && (
                              <p className="text-xs text-emerald-600 mt-0.5 flex items-center gap-1">
                                <Clock size={10} />{item.duration}
                              </p>
                            )}
                            {item.lessons != null && (
                              <p className="text-xs text-gray-400 mt-0.5">{item.lessons} lesson{item.lessons !== 1 ? 's' : ''}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* ── COMPETITION DETAILS ── */}
          {isCompetition && (event.competitionFormat || event.teamSize) && (
            <Card>
              <CardHeader icon={<Award size={14} />} title="Competition Details" />
              <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
                {event.competitionFormat && <Field label="Format" value={event.competitionFormat} />}
                {event.teamSize && <Field label="Team Size" value={`${event.teamSize} players`} />}
              </div>
            </Card>
          )}

          {/* ── REGISTRATION CONFIG ── */}
          {event.registrationConfig?.enabled && (
            <Card>
              <CardHeader icon={<FaWpforms size={12} />} title="Registration Configuration" />
              <div className="p-5">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <Field label="Status"   value={<Badge variant="green">Enabled</Badge>} />
                  <Field label="Approval" value={event.registrationConfig.requiresApproval ? 'Manual Approval' : 'Auto-Approved'} />
                  {event.registrationConfig.maxRegistrations && (
                    <Field label="Max Registrations" value={event.registrationConfig.maxRegistrations} />
                  )}
                  {event.registrationConfig.registrationDeadline && (
                    <Field label="Deadline" value={new Date(event.registrationConfig.registrationDeadline).toLocaleDateString()} />
                  )}
                </div>
                {event.registrationConfig.emailNotifications && (
                  <div className="border-t border-gray-50 pt-4">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Email Notifications</p>
                    <div className="flex gap-3">
                      <Badge variant={event.registrationConfig.emailNotifications.toVendor ? 'green' : 'gray'}>
                        {event.registrationConfig.emailNotifications.toVendor ? <CheckCircle size={10} /> : <XCircle size={10} />}
                        To Vendor
                      </Badge>
                      <Badge variant={event.registrationConfig.emailNotifications.toParticipant ? 'green' : 'gray'}>
                        {event.registrationConfig.emailNotifications.toParticipant ? <CheckCircle size={10} /> : <XCircle size={10} />}
                        To Participant
                      </Badge>
                    </div>
                    {event.registrationConfig.emailNotifications.customMessage && (
                      <p className="text-xs text-gray-500 mt-2 italic">"{event.registrationConfig.emailNotifications.customMessage}"</p>
                    )}
                  </div>
                )}
                {event.registrationConfig.fields?.length > 0 && (
                  <div className="border-t border-gray-50 pt-4 mt-4">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                      Form Fields ({event.registrationConfig.fields.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {event.registrationConfig.fields.map((f: any, i: number) => (
                        <Badge key={i} variant={f.required ? 'orange' : 'gray'}>
                          {f.label ?? f.name ?? f.type}{f.required ? ' *' : ''}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* ── VENUE FEATURES ── */}
          {isVenue && (
            <>
              {/* Facilities & Amenities */}
              {(event.facilities?.length > 0 || event.amenities?.length > 0) && (
                <Card>
                  <CardHeader icon={<Building2 size={14} />} title="Facilities & Amenities" />
                  <div className="p-5 space-y-4">
                    {event.facilities?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Facilities</p>
                        <div className="flex flex-wrap gap-2">
                          {event.facilities.map((f: string, i: number) => (
                            <Badge key={i} variant="emerald">{f}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {event.amenities?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Amenities</p>
                        <div className="flex flex-wrap gap-2">
                          {event.amenities.map((a: string, i: number) => (
                            <Badge key={i} variant="blue">{a}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {/* Safety & Certifications */}
              {(event.safetyFeatures?.length > 0 || event.certifications?.length > 0) && (
                <Card>
                  <CardHeader icon={<Shield size={14} />} title="Safety & Certifications" />
                  <div className="p-5 space-y-4">
                    {event.safetyFeatures?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Safety Features</p>
                        <div className="flex flex-wrap gap-2">
                          {event.safetyFeatures.map((s: string, i: number) => <Badge key={i} variant="green">{s}</Badge>)}
                        </div>
                      </div>
                    )}
                    {event.certifications?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Certifications</p>
                        <div className="flex flex-wrap gap-2">
                          {event.certifications.map((c: string, i: number) => <Badge key={i} variant="purple">{c}</Badge>)}
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {/* WiFi */}
              {event.wifiCredentials?.ssid && (
                <Card>
                  <CardHeader icon={<Wifi size={14} />} title="WiFi Credentials" />
                  <div className="p-5 grid grid-cols-2 gap-4">
                    <Field label="Network (SSID)" value={
                      <span className="flex items-center gap-1 font-mono">{event.wifiCredentials.ssid}<CopyButton text={event.wifiCredentials.ssid} /></span>
                    } />
                    {event.wifiCredentials.password && (
                      <Field label="Password" value={
                        <span className="flex items-center gap-1 font-mono">••••••••<CopyButton text={event.wifiCredentials.password} /></span>
                      } />
                    )}
                  </div>
                </Card>
              )}

              {/* Operating Hours */}
              {event.operatingHours?.length > 0 && (
                <Card>
                  <CardHeader icon={<Clock size={14} />} title="Operating Hours" />
                  <div className="p-5">
                    <div className="space-y-2">
                      {event.operatingHours.map((h: any, i: number) => (
                        <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                          <span className="text-sm font-medium text-gray-700 w-28">{h.day}</span>
                          {h.isClosed ? (
                            <Badge variant="red">Closed</Badge>
                          ) : (
                            <span className="text-sm text-gray-600">{h.openTime} – {h.closeTime}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              )}

              {/* Check-in Gates */}
              {event.checkInGates?.length > 0 && (
                <Card>
                  <CardHeader icon={<Zap size={14} />} title={`Check-in Gates (${event.checkInGates.length})`} />
                  <div className="p-5 space-y-3">
                    {event.checkInGates.map((gate: any, i: number) => (
                      <div key={i} className="flex items-start justify-between p-3 bg-gray-50 rounded-xl">
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{gate.gateName}</p>
                          <p className="text-xs text-gray-400 font-mono mt-0.5">{gate.gateCode}</p>
                          {gate.description && <p className="text-xs text-gray-500 mt-1">{gate.description}</p>}
                        </div>
                        <Badge variant={gate.isActive ? 'green' : 'red'}>
                          {gate.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Insurance */}
              {event.insuranceInfo?.provider && (
                <Card>
                  <CardHeader icon={<Shield size={14} />} title="Insurance" />
                  <div className="p-5 grid grid-cols-2 md:grid-cols-3 gap-4">
                    {event.insuranceInfo.provider     && <Field label="Provider"      value={event.insuranceInfo.provider} />}
                    {event.insuranceInfo.policyNumber && <Field label="Policy Number" value={<span className="font-mono">{event.insuranceInfo.policyNumber}</span>} />}
                    {event.insuranceInfo.expiryDate   && <Field label="Expiry"        value={new Date(event.insuranceInfo.expiryDate).toLocaleDateString()} />}
                  </div>
                </Card>
              )}
            </>
          )}

          {/* ── AFFILIATE DETAILS ── */}
          {(isAffiliate || event.affiliateCode || event.claimStatus) && (
            <Card>
              <CardHeader icon={<Link size={14} />} title="Affiliate & Tracking" />
              <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
                {event.affiliateCode && (
                  <Field label="Affiliate Code" value={
                    <span className="flex items-center gap-1 font-mono font-bold text-emerald-700">
                      {event.affiliateCode}<CopyButton text={event.affiliateCode} />
                    </span>
                  } />
                )}
                {event.claimStatus && <Field label="Claim Status" value={<Badge variant={event.claimStatus === 'claimed' ? 'green' : 'gray'}>{event.claimStatus}</Badge>} />}
                {event.claimedAt   && <Field label="Claimed At"   value={new Date(event.claimedAt).toLocaleDateString()} />}
                {event.externalBookingLink && (
                  <div className="col-span-2">
                    <Field label="External Booking Link" value={
                      <a href={event.externalBookingLink} target="_blank" rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1 text-xs break-all">
                        <ExternalLink size={11} />{event.externalBookingLink}
                      </a>
                    } />
                  </div>
                )}
                {event.affiliateClickTracking && (
                  <>
                    <Field label="Total Clicks"  value={event.affiliateClickTracking.totalClicks ?? 0} />
                    <Field label="Unique Clicks" value={event.affiliateClickTracking.uniqueClicks ?? 0} />
                    {event.affiliateClickTracking.lastClickedAt && (
                      <Field label="Last Click" value={new Date(event.affiliateClickTracking.lastClickedAt).toLocaleDateString()} />
                    )}
                  </>
                )}
              </div>
            </Card>
          )}

          {/* ── SEO & META ── */}
          <Card>
            <CardHeader icon={<Globe size={14} />} title="SEO & Meta" />
            <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-4">
                {event.seoMeta?.title && <Field label="SEO Title"       value={event.seoMeta.title} />}
                {event.seoMeta?.description && <Field label="SEO Description" value={event.seoMeta.description} />}
                {event.seoMeta?.keywords?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Keywords</p>
                    <div className="flex flex-wrap gap-1.5">
                      {event.seoMeta.keywords.map((kw: string, i: number) => (
                        <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-md">{kw}</span>
                      ))}
                    </div>
                  </div>
                )}
                {!event.seoMeta?.title && !event.seoMeta?.description && (
                  <p className="text-sm text-gray-300 italic">No SEO meta configured.</p>
                )}
              </div>
              <div className="space-y-3 border-l border-gray-100 pl-6">
                {event.slug && <Field label="URL Slug" value={<span className="font-mono text-xs break-all">{event.slug}</span>} />}
                <Field label="Created"
                  value={event.createdAt ? new Date(event.createdAt).toLocaleString() : '—'} />
                <Field label="Updated"
                  value={event.updatedAt ? new Date(event.updatedAt).toLocaleString() : '—'} />
                {event.isDeleted && event.deletedAt && (
                  <Field label="Deleted At" value={
                    <span className="text-red-500">{new Date(event.deletedAt).toLocaleString()}</span>
                  } />
                )}
                <Field label="Custom CSS" value={event.customCSS ? <Badge variant="purple">Configured</Badge> : <span className="text-gray-300 text-xs">None</span>} />
              </div>
            </div>
          </Card>

        </div>
      </div>

      {/* ── DELETE MODAL ── */}
      {isDeleteOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-xl bg-red-100">
                <Trash2 size={18} className="text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Delete Event</h3>
            </div>
            <p className="text-sm text-gray-500 mb-6">
              <strong className="text-gray-700">Soft delete</strong> hides the event and allows recovery.
              <br />
              <strong className="text-red-600">Permanent delete</strong> removes all data and cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsDeleteOpen(false)}
                className="px-4 py-2 text-gray-600 border border-gray-200 rounded-xl text-sm hover:bg-gray-50 transition-colors"
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(false)}
                className="px-4 py-2 bg-yellow-500 text-white rounded-xl text-sm hover:bg-yellow-600 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                disabled={deleteLoading}
              >
                <RotateCcw size={13} /> Soft Delete
              </button>
              <button
                onClick={() => handleDelete(true)}
                className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                disabled={deleteLoading}
              >
                <Trash2 size={13} /> Permanent Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// ─── Helper Sub-components ────────────────────────────────────────────────────

const AnalyticRow: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <div className="flex items-baseline justify-between gap-2">
    <span className="text-xs text-gray-400 leading-tight">{label}</span>
    <span className="text-sm font-semibold text-gray-800 shrink-0">{value}</span>
  </div>
);

export default VendorEventDetailPage;
