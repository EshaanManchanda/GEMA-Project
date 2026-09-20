import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  FaArrowLeft,
  FaBookOpen,
  FaCalendarAlt,
  FaStore,
  FaClock,
  FaFacebook,
  FaGlobe,
  FaGraduationCap,
  FaInstagram,
  FaLanguage,
  FaLinkedin,
  FaPlay,
  FaStar,
  FaUsers,
  FaYoutube,
  FaCheckCircle,
  FaBullseye,
  FaMapMarkerAlt,
  FaCheck,
  FaQuoteLeft,
  FaChevronDown,
  FaHeart,
  FaAward,
} from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import vendorAPI from '@/services/api/vendorAPI';
// types
import reviewsAPI from '@/services/api/reviewsAPI';
import { API_BASE_URL } from '@/config/api';
import { VendorSEO } from '@/components/common/SEO';
import { useAuthContext } from '@/hooks/useAuthContext';

/* ─── Types ──────────────────────────────── */
interface PublicVendorResponse {
  user: {
    _id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    email?: string;
    createdAt?: string;
  };
  vendor: any;
  events: any[];
  stats: {
    totalTeachingEvents?: number;
    totalBookings?: number;
    activeEvents?: number;
    averageRating?: number;
    totalAttendees?: number;
  };
}

interface VendorReviewItem {
  _id: string;
  rating: number;
  comment?: string;
  createdAt?: string;
  user?: { firstName?: string; lastName?: string; avatar?: string };
}

/* ─── Helpers ─────────────────────────────── */
const API_ORIGIN = (() => {
  try { return new URL(API_BASE_URL).origin; } catch { return ''; }
})();

const normalizeImageUrl = (url?: string) => {
  if (!url) return '';
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  if (API_ORIGIN && url.startsWith('/')) return `${API_ORIGIN}${url}`;
  return url;
};

const normalizeSocialUrl = (url?: string) => {
  if (!url) return '';
  const t = url.trim();
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
};

const getVendorVideoEmbedUrl = (url?: string) => {
  if (!url) return '';
  const t = url.trim();
  const yt = t.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([^&?/]+)/i);
  if (yt?.[1]) return `https://www.youtube.com/embed/${yt[1]}`;
  const vimeo = t.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  if (vimeo?.[1]) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return '';
};

const isDirectVideoUrl = (url?: string) => !!url && /\.(mp4|webm|ogg)(\?.*)?$/i.test(url);

const formatMemberSince = (createdAt?: string) => {
  if (!createdAt) return 'Recently';
  const dt = new Date(createdAt);
  if (Number.isNaN(dt.getTime())) return 'Recently';
  return dt.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};

const compactNumber = (value?: number) => {
  if (!value || value <= 0) return '0';
  if (value >= 1000) return `${Math.round(value / 100) / 10}k+`;
  return `${value}+`;
};

const getVendorSubtitle = (vendor: any) => {
  if (vendor.specialization) return vendor.specialization;
  if (vendor.subjects?.length) return `${vendor.subjects.slice(0, 2).join(' & ')} Mentor`;
  return 'Event Organizer';
};

/* ─── Social items ──────────────────────── */
const SOCIAL_ITEMS = [
  { key: 'instagram', icon: <FaInstagram />, label: 'Instagram', bg: 'bg-gradient-to-br from-orange-400 via-pink-500 to-purple-600', hoverRing: 'hover:ring-pink-400' },
  { key: 'youtube', icon: <FaYoutube />, label: 'YouTube', bg: 'bg-red-600', hoverRing: 'hover:ring-red-400' },
  { key: 'linkedin', icon: <FaLinkedin />, label: 'LinkedIn', bg: 'bg-blue-700', hoverRing: 'hover:ring-blue-500' },
  { key: 'website', icon: <FaGlobe />, label: 'Website', bg: 'bg-slate-600', hoverRing: 'hover:ring-slate-400' },
  { key: 'facebook', icon: <FaFacebook />, label: 'Facebook', bg: 'bg-blue-600', hoverRing: 'hover:ring-blue-400' },
];

const DAYS_OF_WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

/* ─── Avatar gradient palette for reviewers ── */
const REVIEWER_GRADIENTS = [
  'from-violet-500 to-indigo-500',
  'from-emerald-500 to-teal-500',
  'from-rose-500 to-pink-500',
  'from-amber-500 to-orange-500',
];

/* ─── Default teaching philosophy principles ── */
const DEFAULT_VALUES = [
  {
    title: 'Exceptional Quality',
    desc: 'We prioritize delivering the highest standard of service to ensure every event is memorable.',
  },
  {
    title: 'Customer Focus',
    desc: 'Your satisfaction is our top priority; we tailor our services to meet your specific needs.',
  },
  {
    title: 'Seamless Execution',
    desc: 'From planning to completion, we guarantee a smooth and flawlessly executed experience.',
  },
];

/* ─── Default "What to Expect" outcomes ── */
const DEFAULT_OUTCOMES = [
  'Memorable Experiences',
  'Professional Event Management',
  'Dedicated Support',
  'Seamless Ticketing & Entry',
  'Top-tier Services',
  'Secure Booking',
];

/* ─── Default FAQ items ── */
const DEFAULT_FAQS = [
  { q: 'How do I book an event?', a: 'Simply find an event you love, select your tickets, and proceed to checkout securely.' },
  { q: 'Are events online or in-person?', a: 'We offer both virtual online events and physical in-person experiences depending on the event type.' },
  { q: 'What types of events do you organize?', a: 'Please check our events section above for the full list of experiences we currently offer.' },
  { q: 'What is your cancellation/refund policy?', a: 'Refund policies vary by event. Please check the specific event details or contact us for more information.' },
  { q: 'How do I get my tickets after booking?', a: "No special preparation needed — just show up with curiosity! I'll assess your level and tailor the plan from there." },
];

/* ─── StarRow ─────────────────────────────── */
const StarRow: React.FC<{ rating: number; interactive?: boolean; onRate?: (n: number) => void }> = ({
  rating, interactive, onRate,
}) => {
  const [hover, setHover] = useState(0);
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <FaStar
          key={n}
          className={`${interactive ? 'cursor-pointer text-base transition-transform hover:scale-110' : 'text-xs'} ${n <= (hover || Math.round(rating)) ? 'text-amber-400' : 'text-gray-300'}`}
          onMouseEnter={() => interactive && setHover(n)}
          onMouseLeave={() => interactive && setHover(0)}
          onClick={() => interactive && onRate?.(n)}
        />
      ))}
      {!interactive && <span className="ml-1 text-xs text-gray-700 font-semibold">{rating.toFixed(1)}</span>}
    </span>
  );
};

/* ─── FAQItem with smooth animation ─────────────────────────────── */
const FAQItem: React.FC<{ q: string; a: string; defaultOpen?: boolean; index: number }> = ({ q, a, defaultOpen }) => {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div
      className={`group rounded-3xl border transition-all duration-300 overflow-hidden bg-white mb-4 ${open
          ? 'border-indigo-150 bg-indigo-50/10 shadow-[0_4px_20px_-4px_rgba(79,70,229,0.1)]'
          : 'border-slate-100 hover:border-slate-200/50 hover:shadow-sm'
        }`}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full text-left p-6 flex items-center justify-between gap-4 focus:outline-none"
      >
        <h3 className={`font-extrabold text-lg pr-4 transition-colors duration-250 ${open ? 'text-indigo-950' : 'text-slate-850 group-hover:text-indigo-650'}`}>
          {q}
        </h3>
        <FaChevronDown
          className={`flex-shrink-0 text-slate-400 transition-all duration-300 ${open ? 'rotate-180 text-indigo-600' : 'group-hover:text-indigo-500'}`}
        />
      </button>

      <div
        className={`overflow-hidden transition-all duration-300 ${open ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <p className="text-slate-500 text-base leading-relaxed px-6 pb-6 pr-10">
          {a}
        </p>
      </div>
    </div>
  );
};

/* ─── VendorReviewWidget ─────────────────────────────── */
const VendorReviewWidget: React.FC<{
  vendorUserId: string;
  onSubmitSuccess: () => void;
}> = ({ vendorUserId, onSubmitSuccess }) => {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const queryClient = useQueryClient();

  const { data: status, isLoading: statusLoading } = useQuery({
    queryKey: ['vendor-review-status', vendorUserId],
    queryFn: () => Promise.resolve({ hasBooked: false, hasReviewed: false }),
    enabled: !!user && !!vendorUserId,
    staleTime: 60 * 1000,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating) { toast.error('Please select a rating'); return; }
    if (!comment.trim() || comment.trim().length < 10) { toast.error('Please write at least 10 characters'); return; }
    setSubmitting(true);
    try {
      await reviewsAPI.createReview({
        type: 'vendor',
        targetId: vendorUserId,
        rating,
        comment: comment.trim(),
      });
      toast.success('Review submitted successfully!');
      setSubmitted(true);
      setRating(0);
      setComment('');
      queryClient.invalidateQueries({ queryKey: ['vendor-review-status', vendorUserId] });
      onSubmitSuccess();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
        <p className="text-gray-700 mb-4">Please login to leave a review</p>
        <button onClick={() => navigate('/login')} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium">Login to Review</button>
      </div>
    );
  }

  if (statusLoading) {
    return <div className="flex justify-center py-6"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (submitted || status?.hasReviewed) {
    return (
      <div className="text-center py-10">
        <div className="mb-3 flex justify-center">
          <svg className="w-14 h-14 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-1">Thank you for your review!</h3>
        <p className="text-gray-500 text-sm">Your feedback helps other learners discover great teachers.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <h3 className="text-lg font-bold text-gray-900">Share your experience</h3>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">Your Rating <span className="text-red-500">*</span></label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button key={star} type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              className="focus:outline-none transition-transform hover:scale-110"
            >
              <FaStar className={`w-9 h-9 ${star <= (hoverRating || rating) ? 'text-amber-400' : 'text-gray-300'}`} />
            </button>
          ))}
          {rating > 0 && <span className="ml-2 self-center text-gray-600 font-medium text-sm">{rating} star{rating > 1 ? 's' : ''}</span>}
        </div>
        <p className="text-xs text-gray-500 mt-1">1 = Poor, 5 = Excellent</p>
      </div>
      <div>
        <label htmlFor="vendor-review-comment" className="block text-sm font-semibold text-gray-700 mb-2">Your Review <span className="text-red-500">*</span></label>
        <textarea
          id="vendor-review-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          maxLength={2000}
          required
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition"
          placeholder="Share your experience with this vendor — what you learned, teaching style, communication…"
        />
        <div className="flex justify-between mt-1 text-xs text-gray-500">
          <span>Minimum 10 characters</span>
          <span>{comment.length}/2000</span>
        </div>
      </div>
      <button type="submit"
        disabled={submitting || rating === 0 || comment.trim().length < 10}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all font-semibold"
      >
        {submitting ? (
          <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Submitting…</>
        ) : (
          <><FaStar className="w-4 h-4" /> Submit Review</>
        )}
      </button>
    </form>
  );
};

/* ─── Main ────────────────────────────────── */
const VendorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<PublicVendorResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const events = data?.events ?? [];
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        setIsLoading(true);
        const result = await vendorAPI.getPublicVendorProfile(id);
        const pd = result as PublicVendorResponse;
        setData(pd);
      } catch {
        setError('Vendor profile not found or unavailable.');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [id]);

  const { data: allReviews = [], refetch: refetchReviews, isLoading: reviewsLoading } = useQuery({
    queryKey: ['vendor-reviews', id],
    queryFn: async () => {
      if (!id) return [];
      let teacherReviews: VendorReviewItem[] = [];
      try {
        const resp = await reviewsAPI.getVendorReviews(id, { page: 1, limit: 20 });
        teacherReviews = Array.isArray(resp?.reviews) ? resp.reviews : [];
      } catch (_e) { }

      const eventIds = (data?.events || []).map((ev: any) => ev._id).filter(Boolean).slice(0, 8);
      const eventResponses = eventIds.length > 0
        ? await Promise.allSettled(eventIds.map((eid: string) => reviewsAPI.getEventReviews(eid, { page: 1, limit: 6 })))
        : [];
      const eventReviews = eventResponses.flatMap((entry) => {
        if (entry.status !== 'fulfilled') return [];
        const list = (entry as any).value?.reviews || [];
        return Array.isArray(list) ? list : [];
      }) as VendorReviewItem[];

      const merged = [...teacherReviews, ...eventReviews];
      return Array.from(new Map(merged.map((r) => [r._id, r])).values())
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    },
    enabled: !!id,
    staleTime: 0,
    gcTime: 30 * 1000,
    refetchOnWindowFocus: false,
  });

  const handleReviewSubmitSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['vendor-reviews', id] });
    setTimeout(() => refetchReviews(), 300);
  };

  const pageData = useMemo(() => {
    if (!data) return null;
    const { user, vendor, stats } = data;
    const vendorName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || vendor.businessName || 'Vendor';
    const avatar = normalizeImageUrl(user.avatar || (vendor as any).profileImage);
    const cover = normalizeImageUrl(vendor.coverImage);
    const social = { ...(vendor as any).socialMedia, ...(vendor.socialLinks || {}) } as Record<string, string | undefined>;
    const isVerified = vendor.verificationStatus === 'verified';
    const totalAttendees = Number((vendor as any).totalAttendees) || Number(vendor.stats?.totalAttendees) || Number(stats.totalAttendees) || Number(stats.totalBookings) || 0;
    const totalEvents = Number((vendor as any).totalEvents) || Number(vendor.stats?.totalEvents) || Number(stats.totalTeachingEvents) || events.length || 0;
    const availHours = (vendor.availabilityHours || (vendor as any).availability || {}) as Record<string, { isAvailable: boolean; startTime?: string; endTime?: string }>;
    return { user, vendor, vendorName, avatar, cover, social, isVerified, totalAttendees, totalEvents, availHours, subtitle: getVendorSubtitle(vendor) };
  }, [data, events]);

  const liveRating = useMemo(() => {
    if (!allReviews.length) return { avg: 0, count: 0 };
    const sum = allReviews.reduce((acc, r) => acc + (r.rating || 0), 0);
    return { avg: parseFloat((sum / allReviews.length).toFixed(1)), count: allReviews.length };
  }, [allReviews]);

  /* ── Loading ── */
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f4f5f9] animate-pulse">
        <div className="h-60 bg-gradient-to-r from-slate-800 to-slate-900" />
        <div className="max-w-5xl mx-auto px-4 py-8 space-y-4">
          {[90, 220, 280, 180, 220].map((h, i) => (
            <div key={i} className="rounded-3xl bg-slate-200" style={{ height: h }} />
          ))}
        </div>
      </div>
    );
  }

  /* ── Error ── */
  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#f4f5f9] flex items-center justify-center">
        <div className="text-center px-6 py-12">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500 text-2xl">
            <FaStore />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Profile Not Found</h2>
          <p className="text-gray-500 mb-5">{error || 'This vendor profile is unavailable.'}</p>
          <Link to="/vendors" className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors">
            <FaArrowLeft /> Back to Vendors
          </Link>
        </div>
      </div>
    );
  }

  if (!pageData) return null;

  const {
    user, vendor, vendorName, avatar, cover, social, isVerified,
    totalAttendees, totalEvents, availHours, subtitle,
  } = pageData;
  const rating = liveRating.avg;
  const totalReviews = liveRating.count;

  const teacherVideoUrl = vendor.profileVideoUrl || vendor.videoUrl || (vendor as any).demoVideoUrl;
  const videoEmbedUrl = getVendorVideoEmbedUrl(teacherVideoUrl);
  const classCards = events.slice(0, 3);
  const visibleReviews = allReviews.filter((r) => (r.comment || '').trim().length > 0).slice(0, 8);
  const activeSocialLinks = SOCIAL_ITEMS.filter((s) => !!social[s.key]);

  const certifications: Array<{ name: string; issuer?: string; year?: string | number }> =
    (vendor as any).certifications || [];
  const hasCertifications = certifications.length > 0;

  const faqItems: Array<{ q: string; a: string }> =
    (vendor as any).faq?.length ? (vendor as any).faq : DEFAULT_FAQS;

  const coreValues: Array<{ title: string; desc: string }> =
    (vendor as any).coreValues?.length ? (vendor as any).coreValues : DEFAULT_VALUES;

  const outcomes: string[] =
    (vendor as any).learningOutcomes?.length ? (vendor as any).learningOutcomes : DEFAULT_OUTCOMES;

  return (
    <div className="min-h-screen bg-[#f4f5f9] font-sans overflow-x-hidden">
      <VendorSEO
        vendor={{ ...vendor, firstName: user.firstName, lastName: user.lastName, avatar }}
        breadcrumbs={[
          { name: 'Home', url: '/' },
          { name: 'Vendors', url: '/vendors' },
          { name: vendorName, url: `/vendors/${id}` },
        ]}
      />

      {/* ══════ SECTION 1: HERO ══════ */}
      <section className="relative h-[420px] overflow-hidden pt-10 pb-20">
        <img 
          src={cover || "/assets/defbanner.png"} 
          alt={vendorName} 
          className="absolute inset-0 w-full h-full object-cover object-center" 
        />
        {!cover && <div className="absolute inset-0 bg-gray-600/30" />}
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/50 to-black/30" />

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 pt-6 pb-12">
          <Link
            to="/vendors"
            className="inline-flex items-center gap-2 text-white/60 hover:text-white text-sm font-medium mb-8 transition-colors"
          >
            <FaArrowLeft className="text-[10px]" /> Back to Vendors
          </Link>

          <div className="flex flex-wrap items-center gap-8 sm:gap-10 pb-4">
            <div className="relative flex-shrink-0">
              {avatar
                ? <img src={avatar} alt={vendorName} className="w-36 h-36 sm:w-44 sm:h-44 border-4 border-white/20 shadow-[0_10px_40px_rgba(0,0,0,0.6)] rounded-full object-cover" />
                : (
                  <div className="w-36 h-36 sm:w-44 sm:h-44 border-4 border-white/20 shadow-[0_10px_40px_rgba(0,0,0,0.6)] rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-white text-5xl font-extrabold">
                    {vendorName[0] || 'T'}
                  </div>
                )
              }
              <span className="absolute bottom-5 right-3 w-5 h-5 bg-emerald-400 rounded-full border-4 border-[#0d1b2e] shadow-lg" />
            </div>

            <div className="flex-1 min-w-0 pb-1">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white leading-tight drop-shadow-md">{vendorName}</h1>
                {isVerified ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-50 backdrop-blur-md shadow-[0_0_15px_rgba(16,185,129,0.3)] mt-2 sm:mt-0">
                    <FaCheckCircle className="text-emerald-400 text-[12px]" />
                    Verified Organizer
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-50 backdrop-blur-md shadow-[0_0_15px_rgba(16,185,129,0.3)] mt-2 sm:mt-0">
                    <FaStore className="text-emerald-400 text-[12px]" />
                    Event Organizer
                  </span>
                )}
              </div>

              <p className="text-lg sm:text-xl text-white/95 font-medium mb-4 drop-shadow-sm">{subtitle}</p>

              <div className="flex flex-wrap items-center mt-2 text-sm text-white/90 mb-4">
                <span className="flex items-center gap-1.5">
                  <FaStar className="text-amber-400 text-sm" />
                  <strong className="text-white text-base">{rating.toFixed(1)}</strong>
                  <span className="text-white/70 text-sm">({totalReviews} reviews)</span>
                </span>
                <span className="text-white/30 mx-3">|</span>
                <span className="flex items-center gap-1.5 text-sm text-white/80">
                  <FaUsers className="text-white/60 text-base" /> {compactNumber(totalAttendees)} Attendees
                </span>
              </div>

              {activeSocialLinks.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 mt-10">
                  {activeSocialLinks.map((item) => {
                    const href = social[item.key];
                    if (!href) return null;
                    return (
                      <a
                        key={item.key}
                        href={normalizeSocialUrl(href)}
                        target="_blank"
                        rel="noreferrer"
                        title={item.label}
                        className={`w-12 h-12 ${item.bg} rounded-full flex items-center justify-center text-white text-base ring-2 ring-white/20 ${item.hoverRing} hover:scale-110 hover:ring-white/60 transition-all duration-150 shadow-lg`}
                      >
                        {item.icon}
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ══════ SECTION 2: STATS BAR ══════ */}
      <div className="max-w-6xl mx-auto px-6 -mt-16 relative z-20">
        <div className="p-4 grid grid-cols-4 bg-white rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.12)] overflow-hidden border border-slate-200">
          {[
            {
              icon: <FaGraduationCap />,
              iconBg: 'bg-violet-100 text-violet-600',
              label: 'Experience',
              value: `${vendor.yearsOfExperience || 0} Years`,
              sub: 'Organizing',
              pill: <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-violet-600"><span className="w-1.5 h-1.5 rounded-full bg-violet-500" />Since {new Date().getFullYear() - (vendor.yearsOfExperience || 0)}</span>,
            },
            {
              icon: <FaUsers />,
              iconBg: 'bg-emerald-50 text-emerald-500',
              label: 'Attendees',
              value: compactNumber(totalAttendees),
              sub: 'Happy Customers',
              pill: <span className="inline-flex px-2.5 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded">{totalAttendees === 0 ? 'Be the first to learn!' : 'Growing community'}</span>,
            },
            {
              icon: <FaBookOpen />,
              iconBg: 'bg-amber-100 text-amber-500',
              label: 'Events Organized',
              value: totalEvents > 1 ? `${totalEvents}+` : `${totalEvents}`,
              sub: 'Events Hosted',
              pill: <span className="inline-flex px-2.5 py-1 bg-amber-50 text-amber-600 text-[10px] font-bold rounded">Growing every day!</span>,
            },
            {
              icon: <FaBullseye />,
              iconBg: 'bg-pink-100 text-pink-500',
              label: 'Specialization',
              value: vendor.specialization || 'Events & Entertainment',
              sub: 'Focus Area',
              pill: <span className="inline-flex px-2.5 py-1 bg-pink-50 text-pink-600 text-[10px] font-bold rounded">Premier Organizer</span>,
            },
          ].map((stat, i) => (
            <div key={i} className="flex flex-col justify-between px-8 py-6 border-r last:border-r-0 hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-4 mb-5">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 ${stat.iconBg}`}>
                  {stat.icon}
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900 leading-tight">{stat.value}</p>
                  <p className="text-xs text-gray-500 font-medium">{stat.sub}</p>
                </div>
              </div>
              <div className="flex items-center justify-center">{stat.pill}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ══════ BODY — Full width, no sidebar ══════ */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex flex-col gap-8">

          {/* ══════ ROW 1: ABOUT & VIDEO ══════ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* ABOUT */}
            <div className={`bg-white rounded-3xl p-8 border border-slate-100 shadow-sm flex flex-col ${!teacherVideoUrl ? 'md:col-span-2' : ''}`}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                  <FaStore className="text-indigo-600 text-lg" />
                </div>
                <h2 className="text-xl font-extrabold text-slate-900">About Event Vendor</h2>
              </div>
              <p className="text-slate-500 leading-relaxed mb-6 flex-grow">
                {vendor.bio
                  ? vendor.bio
                  : 'We create engaging and memorable experiences for kids through well-organized events, workshops, and activities. Our focus is on learning, creativity, and fun, ensuring every child has a great time.'}
              </p>
              
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-auto">
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex flex-col justify-center items-center text-center">
                  <div className="flex items-center gap-2 mb-1">
                    <FaCalendarAlt className="text-indigo-400" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Joined</span>
                  </div>
                  <p className="text-sm font-bold text-slate-700">{formatMemberSince(user.createdAt)}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex flex-col justify-center items-center text-center">
                  <div className="flex items-center gap-2 mb-1">
                    <FaLanguage className="text-cyan-500" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Languages</span>
                  </div>
                  <p className="text-sm font-bold text-slate-700">{vendor.languagesSpoken?.length ? vendor.languagesSpoken.join(', ') : 'Not specified'}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex flex-col justify-center items-center text-center">
                  <div className="flex items-center gap-2 mb-1">
                    <FaStar className="text-amber-400" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Event Style</span>
                  </div>
                  <p className="text-sm font-bold text-slate-700 truncate">Professional, Engaging</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex flex-col justify-center items-center text-center">
                  <div className="flex items-center gap-2 mb-1">
                    <FaMapMarkerAlt className="text-rose-400" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Location</span>
                  </div>
                  <p className="text-sm font-bold text-slate-700 truncate">{(vendor as any).location || vendor.city || 'Online / Flexible'}</p>
                </div>
              </div>
            </div>

            {/* VIDEO */}
            {teacherVideoUrl && (
              <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm flex flex-col">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                    <FaPlay className="text-purple-600 text-sm" />
                  </div>
                  <h2 className="text-xl font-extrabold text-slate-900">Introduction Video</h2>
                </div>
                <div className="relative rounded-2xl overflow-hidden bg-slate-900 flex-grow shadow-inner min-h-[200px]">
                  {videoEmbedUrl ? (
                    <iframe src={videoEmbedUrl} title="intro" className="w-full h-full border-0 absolute inset-0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                  ) : isDirectVideoUrl(teacherVideoUrl) ? (
                    <video src={teacherVideoUrl} controls className="w-full h-full object-cover absolute inset-0" />
                  ) : (
                    <a href={teacherVideoUrl} target="_blank" rel="noreferrer" className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white hover:text-purple-300 transition-colors bg-slate-800">
                      <div className="w-16 h-16 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-2xl backdrop-blur-sm"><FaPlay /></div>
                      <span className="text-sm font-bold">Watch Introduction Video</span>
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ══════ ROW 2: OUR CORE VALUES ══════ */}
          <div className="bg-[#fefce8] rounded-3xl p-8 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#fca5a5] flex items-center justify-center shadow-sm">
                  <FaHeart className="text-white text-xl" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-[#1e293b]">Our Core Values</h2>
                  <p className="text-[#64748b] font-medium mt-1">The principles that guide everything we do.</p>
                </div>
              </div>
              <div className="hidden md:block text-right transform -rotate-6">
                <p className="text-[#1e3a8a] font-black leading-tight text-lg" style={{ fontFamily: 'var(--font-handwriting, cursive)' }}>
                  More<br/>Smiles<br/>Brighter<br/>Futures 💙
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-orange-50 flex flex-col">
                <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-500 flex items-center justify-center text-xl mb-4">
                  <FaUsers />
                </div>
                <h3 className="font-extrabold text-[#1e293b] text-[15px] mb-3 leading-tight">Child-Centric<br/>Approach</h3>
                <p className="text-[#64748b] text-xs leading-relaxed flex-grow">We design every event with children's happiness, safety, and growth in mind.</p>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-blue-50 flex flex-col">
                <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-500 flex items-center justify-center text-xl mb-4">
                  <FaCheckCircle />
                </div>
                <h3 className="font-extrabold text-[#1e293b] text-[15px] mb-3 leading-tight">Safety &<br/>Trust</h3>
                <p className="text-[#64748b] text-xs leading-relaxed flex-grow">A safe, inclusive, and supportive environment for every child and family.</p>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-emerald-50 flex flex-col">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-500 flex items-center justify-center text-xl mb-4">
                  <FaBookOpen />
                </div>
                <h3 className="font-extrabold text-[#1e293b] text-[15px] mb-3 leading-tight">Creativity &<br/>Fun</h3>
                <p className="text-[#64748b] text-xs leading-relaxed flex-grow">We bring learning to life through engaging and innovative experiences.</p>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-purple-50 flex flex-col">
                <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-500 flex items-center justify-center text-xl mb-4">
                  <FaStar />
                </div>
                <h3 className="font-extrabold text-[#1e293b] text-[15px] mb-3 leading-tight">Excellence</h3>
                <p className="text-[#64748b] text-xs leading-relaxed flex-grow">We strive for the highest standards in planning, execution, and customer satisfaction.</p>
              </div>
            </div>
          </div>

          {/* ══════ ROW 3: EXPECT & AVAILABILITY ══════ */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            <div className="lg:col-span-3 bg-[#f5f3ff] rounded-3xl p-8 flex flex-col border border-indigo-50/50">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm">
                  <FaStar className="text-indigo-600 text-xl" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-[#1e293b]">What to Expect</h2>
                  <p className="text-[#64748b] font-medium mt-1 text-sm">A seamless and delightful experience for you and your child.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-grow">
                {[
                  { icon: <FaCheckCircle/>, text: 'Memorable Experiences' },
                  { icon: <FaStar/>, text: 'Professional Event Management' },
                  { icon: <FaUsers/>, text: 'Dedicated Support' },
                  { icon: <FaBookOpen/>, text: 'Seamless Ticketing & Entry' },
                  { icon: <FaBullseye/>, text: 'Top-tier Services' },
                  { icon: <FaCheckCircle/>, text: 'Secure Booking' },
                ].map((item, i) => (
                  <div key={i} className="bg-white rounded-2xl p-4 flex items-center gap-4 shadow-sm border border-white/50 transition-transform hover:-translate-y-1">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-indigo-50 text-indigo-600">
                      {item.icon}
                    </div>
                    <span className="font-extrabold text-[#1e293b] text-[13px] leading-snug">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-2 bg-[#ecfdf5] rounded-3xl p-8 flex flex-col border border-emerald-50/50">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm">
                  <FaCalendarAlt className="text-emerald-500 text-xl" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-[#1e293b]">Availability</h2>
                  <p className="text-[#64748b] font-medium mt-1 text-sm">Check when this vendor is available for events.</p>
                </div>
              </div>
              <div className="bg-white rounded-3xl p-2 shadow-sm border border-white/50 flex-grow">
                {DAYS_OF_WEEK.map((day, i) => {
                  const isAvail = availHours?.[day]?.isAvailable;
                  return (
                    <div key={day} className={`flex items-center justify-between p-3.5 px-5 ${i !== DAYS_OF_WEEK.length - 1 ? 'border-b border-slate-50' : ''}`}>
                      <div className="flex items-center gap-3">
                        <FaPlay className="text-[7px] text-slate-400" />
                        <span className="font-bold text-[#334155] capitalize text-[13px]">{day}</span>
                      </div>
                      <span className={`text-[10px] font-extrabold tracking-wide px-3 py-1 rounded-full ${isAvail ? 'bg-[#dcfce7] text-emerald-700' : 'bg-[#f1f5f9] text-slate-400'}`}>
                        {isAvail ? 'Available' : 'Unavailable'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ══════ EVENTS, FAQ, REVIEWS WITH SPOTLIGHTS ══════ */}
          <div className="relative py-12 mt-8">
            {/* Spotlights */}
            <div className="absolute top-[5%] left-[-10%] w-[50%] h-[30%] rounded-full bg-blue-500/15 blur-[150px] pointer-events-none" />
            <div className="absolute top-[45%] right-[-10%] w-[50%] h-[30%] rounded-full bg-[#F6B83F]/15 blur-[150px] pointer-events-none" />

            <div className="relative z-10 flex flex-col gap-16">
              
              {/* ══════ SECTION 7: CLASSES ══════ */}
              {classCards.length > 0 && (
                <div className="relative z-10">
                  <div className="relative flex flex-col items-center mb-12">
                    <div className="text-center">
                      <span className="inline-block text-xs font-bold tracking-widest uppercase text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-300 shadow-sm">
                        Events
                      </span>
                      <h2 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight mt-4 mb-3">
                        EVENTS & CLASSES
                      </h2>
                      <p className="text-slate-500 text-lg max-w-xl mx-auto">
                        Discover events by this vendor.
                      </p>
                    </div>
                    <div className="mt-6 sm:mt-0 sm:absolute sm:right-0 sm:bottom-0">
                      <Link to={`/search?organizer=${data?.vendor?._id || id}`} className="inline-flex items-center px-6 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-full transition-colors text-center shadow-sm border border-indigo-100">
                        View all events →
                      </Link>
                    </div>
                  </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {classCards.map((event) => {
                  const thumb = normalizeImageUrl(
                    (typeof event.imageAssets?.[0] === 'object' ? (event.imageAssets[0].url || event.imageAssets[0].secureUrl) : event.imageAssets?.[0]) ||
                    event.images?.[0]?.url || event.images?.[0] || event.coverImage || event.image
                  );
                  const typeLabel = event.type || 'Event';
                  const duration = event.duration || 'Flexible';
                  
                  return (
                    <Link
                      key={event._id}
                      to={`/events/${event._id}`}
                      className="group relative bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-md border border-slate-100 cursor-pointer transform hover:-translate-y-1 transition-all duration-300 flex flex-col h-[380px]"
                    >
                      {/* Card Image Area */}
                      <div className="h-48 w-full relative overflow-hidden bg-slate-100">
                        {thumb ? (
                          <div
                            className="absolute inset-0 bg-cover bg-no-repeat bg-center transition-transform duration-500 group-hover:scale-105"
                            style={{ backgroundImage: `url('${thumb}')` }}
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-violet-100 via-blue-50 to-indigo-100">
                            <FaBookOpen className="text-violet-300 text-4xl" />
                          </div>
                        )}
                      </div>

                      {/* Card Info Area */}
                      <div className="p-6 flex-grow flex flex-col justify-between">
                        <div>
                          {/* Category Pill Tag */}
                          <span className="text-[10px] font-extrabold tracking-wider uppercase px-2.5 py-1 rounded border border-purple-100 bg-purple-50 text-purple-600">
                            {typeLabel}
                          </span>

                          {/* Title */}
                          <h3 className="font-extrabold text-slate-800 text-lg mt-3 group-hover:text-indigo-650 transition-colors leading-snug line-clamp-2">
                            {event.title}
                          </h3>
                        </div>

                        {/* Card Meta Row */}
                        <div className="flex items-center justify-between border-t border-slate-50 pt-4 mt-2">
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium bg-slate-100 px-2.5 py-1 rounded-full">
                            <span>{event.currency || 'AED'} {event.price || 0}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                            <span>View details →</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
              )}

              {/* ══════ SECTION 10: FAQ ══════ */}
              {faqItems.length > 0 && (
                <div className="relative z-10 py-4">
                  <div className="max-w-4xl mx-auto relative z-10">
                    <div className="text-center mb-12">
                      <span className="inline-block text-xs font-bold tracking-widest uppercase text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-300 shadow-sm">
                        FAQ
                      </span>
                      <h2 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight mt-4 mb-3">
                        FREQUENTLY ASKED QUESTIONS
                      </h2>
                      <p className="text-slate-500 text-lg max-w-xl mx-auto">
                        Everything you need to know about events with {vendorName}.
                      </p>
                    </div>

                <div className="space-y-4">
                  {faqItems.map((item, i) => (
                    <FAQItem key={i} q={item.q} a={item.a} defaultOpen={i === 0} index={i} />
                  ))}
                </div>
              </div>
            </div>
          )}

              {/* ══════ SECTION 11: REVIEWS ══════ */}
              <div className="relative z-10 py-4">
                <div className="text-center mb-12">
                  <span className="inline-block text-xs font-bold tracking-widest uppercase text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-300 shadow-sm">
                    Testimonials
                  </span>
                  <h2 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight mt-4 mb-3">
                    WHAT CUSTOMERS SAY
                  </h2>
                  <p className="text-slate-500 text-lg max-w-xl mx-auto">
                    Read real feedback from our attendees.
                  </p>
                </div>

                <div className="flex flex-col lg:flex-row gap-10">
                  {/* Left — Rating Summary */}
                  <div className="w-full lg:w-1/4 flex flex-col">
                    <div className="rounded-2xl p-6 mb-5" style={{ background: 'linear-gradient(135deg, #fef3c7, #fffbeb)' }}>
                      <div className="flex items-center gap-3 mb-1">
                        <FaStar className="w-9 h-9 text-amber-400" />
                        <span className="text-5xl font-bold text-gray-900">
                          {reviewsLoading ? '…' : liveRating.avg.toFixed(1)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {reviewsLoading ? (
                          <span className="text-gray-400">Loading…</span>
                        ) : (
                          <>{liveRating.count.toLocaleString()} {liveRating.count === 1 ? 'review' : 'reviews'}</>
                        )}
                      </p>
                    </div>

                    <div className="space-y-2.5">
                      {[5, 4, 3, 2, 1].map((star) => {
                        const total = allReviews.length;
                        const count = total ? allReviews.filter((r) => Math.round(r.rating || 0) === star).length : 0;
                        const pct = total ? (count / total) * 100 : 0;
                        return (
                          <div key={star} className="flex items-center gap-3 text-sm">
                            <span className="w-14 text-gray-800 font-semibold">{star} star{star > 1 && 's'}</span>
                            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-amber-400 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="w-12 text-right text-gray-500 text-[11px]">{pct.toFixed(0)}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right — Review Cards */}
                  <div className="w-full lg:w-3/4 flex flex-col gap-5">
                    {visibleReviews.length === 0 ? (
                      <div className="p-8 text-center border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50 flex flex-col items-center gap-3">
                        <FaStar className="text-gray-300 text-3xl" />
                        <p className="text-sm text-gray-500">No reviews yet. Be the first to share your experience!</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {visibleReviews.map((review, idx) => {
                          const name = `${review.user?.firstName || ''} ${review.user?.lastName || ''}`.trim() || 'Verified Customer';
                          const initial = name.charAt(0).toUpperCase();
                          const avatarUrl = normalizeImageUrl(review.user?.avatar);
                          const date = new Date(review.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                          const gradientClass = REVIEWER_GRADIENTS[idx % REVIEWER_GRADIENTS.length];
                          return (
                            <div key={review._id || `r-${idx}`} className="p-5 rounded-2xl border border-gray-200 bg-white flex flex-col gap-3">
                              <div className="flex items-center gap-3">
                                {avatarUrl ? (
                                  <img src={avatarUrl} alt={name} className="w-11 h-11 rounded-full object-cover flex-shrink-0" />
                                ) : (
                                  <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${gradientClass} flex items-center justify-center text-white text-lg font-bold flex-shrink-0`}>
                                    {initial}
                                  </div>
                                )}
                                <div>
                                  <strong className="text-sm font-semibold text-gray-900 line-clamp-1">{name}</strong>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <div className="flex gap-0.5">
                                      {[1, 2, 3, 4, 5].map(n => (
                                        <FaStar key={n} className={`text-xs ${n <= Math.round(review.rating || 0) ? 'text-amber-400' : 'text-gray-200'}`} />
                                      ))}
                                    </div>
                                    <span className="text-gray-400 text-xs">{date}</span>
                                  </div>
                                </div>
                              </div>
                              {review.comment && (
                                <p className="text-[14px] text-gray-700 leading-relaxed">{review.comment}</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Review submission form */}
                    <div className="mt-4 pt-6 border-t border-gray-100">
                      {id ? (
                        <VendorReviewWidget
                          vendorUserId={id}
                          onSubmitSuccess={handleReviewSubmitSuccess}
                        />
                      ) : (
                        <p className="text-sm text-slate-400 text-center py-4">This vendor has no published events yet — check back soon to leave a review!</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>

      {/* ══════ Mobile sticky bottom CTA ══════ */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 shadow-[0_-4px_24px_rgba(0,0,0,0.10)] px-4 py-3 flex gap-3">
        <button className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm py-3 rounded-xl transition-all">
          <FaCalendarAlt /> View Events
        </button>
        <button className="px-5 py-3 bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-sm rounded-xl transition-all hover:bg-slate-100">
          Message
        </button>
      </div>

    </div>
  );
};

export default VendorPage;
