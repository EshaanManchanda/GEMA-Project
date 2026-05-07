import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  FaArrowLeft,
  FaBookOpen,
  FaCalendarAlt,
  FaChalkboardTeacher,
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
  FaAward,
} from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import teacherAPI from '@/services/api/teacherAPI';
import reviewsAPI from '@/services/api/reviewsAPI';
import { API_BASE_URL } from '@/config/api';
import { TeacherSEO } from '@/components/common/SEO';
import type { ITeacher, ITeachingEvent } from '@/types/teacher';
import { getEventImageFromEvent } from '@/utils/imageFallbacks';
import { useAuthContext } from '@/hooks/useAuthContext';

/* ─── Types ──────────────────────────────── */
interface PublicTeacherResponse {
  user: {
    _id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    email?: string;
    createdAt?: string;
  };
  teacher: ITeacher;
  teachingEvents: ITeachingEvent[];
  stats: {
    totalTeachingEvents?: number;
    totalBookings?: number;
    activeEvents?: number;
    averageRating?: number;
    totalStudents?: number;
  };
}

interface TeacherReviewItem {
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

const getTeacherVideoEmbedUrl = (url?: string) => {
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

const getTeacherSubtitle = (teacher: ITeacher) => {
  if (teacher.specialization) return teacher.specialization;
  if (teacher.subjects?.length) return `${teacher.subjects.slice(0, 2).join(' & ')} Mentor`;
  return 'Educator';
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
const DEFAULT_PHILOSOPHY = [
  {
    title: 'Concept First',
    desc: 'I never rush to formulas — students understand why before they learn how.',
  },
  {
    title: 'Personalized Pace',
    desc: 'Every student learns differently; I adapt my approach to match each individual.',
  },
  {
    title: 'Real-World Application',
    desc: 'Every lesson connects to practical examples that make abstract ideas click.',
  },
];

/* ─── Default "What You'll Gain" outcomes ── */
const DEFAULT_OUTCOMES = [
  'Solve problems from first principles',
  'Build exam confidence',
  'Get personalized feedback',
  'Understand concepts, not just memorize',
  'Improve speed and accuracy',
  'Prepare for competitive exams',
];

/* ─── Default FAQ items ── */
const DEFAULT_FAQS = [
  { q: 'Do you teach beginners?', a: 'Absolutely! I welcome learners at all levels and tailor each session to your starting point.' },
  { q: 'Are sessions online or in-person?', a: 'Sessions are available both online and in-person depending on your location and preference.' },
  { q: 'What subjects do you cover?', a: 'Please check my classes section above for the full list of subjects I currently teach.' },
  { q: 'What is your cancellation policy?', a: 'Cancellations made 24 hours before a session are fully refunded. Please reach out if you need to reschedule.' },
  { q: 'How do I prepare for the first session?', a: "No special preparation needed — just show up with curiosity! I'll assess your level and tailor the plan from there." },
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
const FAQItem: React.FC<{ q: string; a: string; defaultOpen?: boolean; index: number }> = ({ q, a, defaultOpen, index }) => {
  const [open, setOpen] = useState(!!defaultOpen);
  const [contentHeight, setContentHeight] = useState<number | undefined>(defaultOpen ? undefined : 0);
  const contentRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!contentRef.current) return;
    if (open) {
      setContentHeight(contentRef.current.scrollHeight);
      const timer = setTimeout(() => setContentHeight(undefined), 350);
      return () => clearTimeout(timer);
    } else {
      setContentHeight(contentRef.current.scrollHeight);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setContentHeight(0));
      });
    }
  }, [open]);

  const colors = [
    { accent: 'indigo', bg: 'hover:bg-indigo-50/60', border: 'border-indigo-100', num: 'bg-indigo-100 text-indigo-600' },
    { accent: 'violet', bg: 'hover:bg-violet-50/60', border: 'border-violet-100', num: 'bg-violet-100 text-violet-600' },
    { accent: 'blue', bg: 'hover:bg-blue-50/60', border: 'border-blue-100', num: 'bg-blue-100 text-blue-600' },
    { accent: 'purple', bg: 'hover:bg-purple-50/60', border: 'border-purple-100', num: 'bg-purple-100 text-purple-600' },
    { accent: 'sky', bg: 'hover:bg-sky-50/60', border: 'border-sky-100', num: 'bg-sky-100 text-sky-600' },
  ];
  const color = colors[index % colors.length];

  return (
    <div
      className={`rounded-2xl border ${color.border} bg-white/80 mb-3 overflow-hidden transition-all duration-200 ${color.bg} ${open ? 'shadow-md' : 'shadow-sm'}`}
    >
      <button
        className="w-full flex items-center gap-4 px-6 py-4 text-left group"
        onClick={() => setOpen((v) => !v)}
      >
        <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-black ${color.num} transition-transform duration-200 ${open ? 'scale-110' : ''}`}>
          {index + 1}
        </div>
        <span className="flex-1 text-[15px] font-semibold text-slate-800 leading-snug">{q}</span>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${open ? 'bg-indigo-500 text-white rotate-0' : 'bg-slate-100 text-slate-400'}`}>
          <FaChevronDown className={`text-[10px] transition-transform duration-300 ${open ? 'rotate-180' : 'rotate-0'}`} />
        </div>
      </button>

      <div
        ref={contentRef}
        style={{
          height: contentHeight === undefined ? 'auto' : contentHeight,
          overflow: 'hidden',
          transition: 'height 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <div className="px-6 pb-5 pt-0">
          <div className={`h-px bg-${color.accent}-100 mb-4`} />
          <p className="text-[14px] text-slate-500 leading-relaxed pl-11">{a}</p>
        </div>
      </div>
    </div>
  );
};

/* ─── TeacherReviewWidget ─────────────────────────────── */
const TeacherReviewWidget: React.FC<{
  teacherUserId: string;
  onSubmitSuccess: () => void;
}> = ({ teacherUserId, onSubmitSuccess }) => {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const queryClient = useQueryClient();

  const { data: status, isLoading: statusLoading } = useQuery({
    queryKey: ['teacher-review-status', teacherUserId],
    queryFn: () => reviewsAPI.checkTeacherReviewStatus(teacherUserId),
    enabled: !!user && !!teacherUserId,
    staleTime: 60 * 1000,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating) { toast.error('Please select a rating'); return; }
    if (!comment.trim() || comment.trim().length < 10) { toast.error('Please write at least 10 characters'); return; }
    setSubmitting(true);
    try {
      await reviewsAPI.createReview({
        type: 'teacher',
        targetId: teacherUserId,
        rating,
        comment: comment.trim(),
      });
      toast.success('Review submitted successfully!');
      setSubmitted(true);
      setRating(0);
      setComment('');
      queryClient.invalidateQueries({ queryKey: ['teacher-review-status', teacherUserId] });
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
        <label htmlFor="teacher-review-comment" className="block text-sm font-semibold text-gray-700 mb-2">Your Review <span className="text-red-500">*</span></label>
        <textarea
          id="teacher-review-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          maxLength={2000}
          required
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition"
          placeholder="Share your experience with this teacher — what you learned, teaching style, communication…"
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
const TeacherPublicProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<PublicTeacherResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const teachingEvents = data?.teachingEvents ?? [];
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        setIsLoading(true);
        const result = await teacherAPI.getPublicProfile(id);
        const pd = result as PublicTeacherResponse;
        setData(pd);
      } catch {
        setError('Teacher profile not found or unavailable.');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [id]);

  const { data: allReviews = [], refetch: refetchReviews, isLoading: reviewsLoading } = useQuery({
    queryKey: ['teacher-reviews', id],
    queryFn: async () => {
      if (!id) return [];
      let teacherReviews: TeacherReviewItem[] = [];
      try {
        const resp = await reviewsAPI.getTeacherReviews(id, { page: 1, limit: 20 });
        teacherReviews = Array.isArray(resp?.reviews) ? resp.reviews : [];
      } catch (_e) { }

      const eventIds = (data?.teachingEvents || []).map((ev: any) => ev._id).filter(Boolean).slice(0, 8);
      const eventResponses = eventIds.length > 0
        ? await Promise.allSettled(eventIds.map((eid: string) => reviewsAPI.getEventReviews(eid, { page: 1, limit: 6 })))
        : [];
      const eventReviews = eventResponses.flatMap((entry) => {
        if (entry.status !== 'fulfilled') return [];
        const list = (entry as any).value?.reviews || [];
        return Array.isArray(list) ? list : [];
      }) as TeacherReviewItem[];

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
    queryClient.invalidateQueries({ queryKey: ['teacher-reviews', id] });
    setTimeout(() => refetchReviews(), 300);
  };

  const pageData = useMemo(() => {
    if (!data) return null;
    const { user, teacher, stats } = data;
    const teacherName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || teacher.fullName || 'Teacher';
    const avatar = normalizeImageUrl(user.avatar || (teacher as any).profileImage);
    const cover = normalizeImageUrl(teacher.coverImage);
    const social = { ...(teacher as any).socialMedia, ...(teacher.socialLinks || {}) } as Record<string, string | undefined>;
    const isVerified = teacher.verificationStatus === 'verified';
    const totalStudents = Number((teacher as any).totalStudents) || Number(teacher.stats?.totalStudents) || Number(stats.totalStudents) || Number(stats.totalBookings) || 0;
    const totalClasses = Number((teacher as any).totalClasses) || Number(teacher.stats?.totalClasses) || Number(stats.totalTeachingEvents) || teachingEvents.length || 0;
    const availHours = (teacher.availabilityHours || (teacher as any).availability || {}) as Record<string, { isAvailable: boolean; startTime?: string; endTime?: string }>;
    return { user, teacher, teacherName, avatar, cover, social, isVerified, totalStudents, totalClasses, availHours, subtitle: getTeacherSubtitle(teacher) };
  }, [data, teachingEvents]);

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
            <FaChalkboardTeacher />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Profile Not Found</h2>
          <p className="text-gray-500 mb-5">{error || 'This teacher profile is unavailable.'}</p>
          <Link to="/teachers" className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors">
            <FaArrowLeft /> Back to Teachers
          </Link>
        </div>
      </div>
    );
  }

  if (!pageData) return null;

  const {
    user, teacher, teacherName, avatar, cover, social, isVerified,
    totalStudents, totalClasses, availHours, subtitle,
  } = pageData;
  const rating = liveRating.avg;
  const totalReviews = liveRating.count;

  const teacherVideoUrl = teacher.profileVideoUrl || (teacher as any).demoVideoUrl;
  const videoEmbedUrl = getTeacherVideoEmbedUrl(teacherVideoUrl);
  const classCards = teachingEvents.slice(0, 3);
  const visibleReviews = allReviews.filter((r) => (r.comment || '').trim().length > 0).slice(0, 8);
  const activeSocialLinks = SOCIAL_ITEMS.filter((s) => !!social[s.key]);

  const certifications: Array<{ name: string; issuer?: string; year?: string | number }> =
    (teacher as any).certifications || [];
  const hasCertifications = certifications.length > 0;

  const faqItems: Array<{ q: string; a: string }> =
    (teacher as any).faq?.length ? (teacher as any).faq : DEFAULT_FAQS;

  const philosophyPrinciples: Array<{ title: string; desc: string }> =
    (teacher as any).teachingPhilosophy?.length ? (teacher as any).teachingPhilosophy : DEFAULT_PHILOSOPHY;

  const outcomes: string[] =
    (teacher as any).learningOutcomes?.length ? (teacher as any).learningOutcomes : DEFAULT_OUTCOMES;

  return (
    <div className="min-h-screen bg-[#f4f5f9] font-sans">
      <TeacherSEO
        teacher={{ ...teacher, firstName: user.firstName, lastName: user.lastName, avatar }}
        breadcrumbs={[
          { name: 'Home', url: '/' },
          { name: 'Teachers', url: '/teachers' },
          { name: teacherName, url: `/teachers/${id}` },
        ]}
      />

      {/* ══════ SECTION 1: HERO ══════ */}
      <section className="relative h-[420px] bg-[#0d1b2e] overflow-hidden pt-10 pb-20">
        {cover
          ? <img src={cover} alt={teacherName} className="absolute inset-0 w-full h-full object-cover object-center" />
          : <div className="absolute inset-0 bg-gradient-to-br from-[#0d1b2e] via-[#152640] to-[#0d2137]" />
        }
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/50 to-black/30" />

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 pt-6 pb-12">
          <Link
            to="/teachers"
            className="inline-flex items-center gap-2 text-white/60 hover:text-white text-sm font-medium mb-8 transition-colors"
          >
            <FaArrowLeft className="text-[10px]" /> Back to Teachers
          </Link>

          <div className="flex flex-wrap items-center gap-8 sm:gap-10 pb-4">
            <div className="relative flex-shrink-0">
              {avatar
                ? <img src={avatar} alt={teacherName} className="w-36 h-36 sm:w-44 sm:h-44 border-4 border-white/20 shadow-[0_10px_40px_rgba(0,0,0,0.6)] rounded-full object-cover" />
                : (
                  <div className="w-36 h-36 sm:w-44 sm:h-44 border-4 border-white/20 shadow-[0_10px_40px_rgba(0,0,0,0.6)] rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-white text-5xl font-extrabold">
                    {teacherName[0] || 'T'}
                  </div>
                )
              }
              <span className="absolute bottom-5 right-3 w-5 h-5 bg-emerald-400 rounded-full border-4 border-[#0d1b2e] shadow-lg" />
            </div>

            <div className="flex-1 min-w-0 pb-1">
              <div className="flex flex-wrap items-center gap-2.5 mb-1">
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">{teacherName}</h1>
                {isVerified ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white backdrop-blur-md">
                    <FaCheckCircle className="text-emerald-400 text-[10px]" />
                    Verified Educator
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white/80 backdrop-blur-md">
                    <FaCheckCircle className="text-white/40 text-[10px]" />
                    Educator
                  </span>
                )}
              </div>

              <p className="text-sm text-white/60 mb-3">{subtitle}</p>

              <div className="flex flex-wrap items-center mt-2 text-sm text-white/85 mb-4">
                <span className="flex items-center gap-1.5">
                  <FaStar className="text-amber-400 text-xs" />
                  <strong className="text-white">{rating.toFixed(1)}</strong>
                  <span className="text-white/50 text-xs">({totalReviews} reviews)</span>
                </span>
                <span className="text-white/25 mx-2">|</span>
                <span className="flex items-center gap-1.5 text-xs text-white/60">
                  <FaUsers className="text-white/40" /> {compactNumber(totalStudents)} Students
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
              value: `${teacher.yearsOfExperience || 0} Years`,
              sub: 'Teaching',
              pill: <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-violet-600"><span className="w-1.5 h-1.5 rounded-full bg-violet-500" />Since {new Date().getFullYear() - (teacher.yearsOfExperience || 0)}</span>,
            },
            {
              icon: <FaUsers />,
              iconBg: 'bg-emerald-50 text-emerald-500',
              label: 'Students',
              value: compactNumber(totalStudents),
              sub: 'Happy Students',
              pill: <span className="inline-flex px-2.5 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded">{totalStudents === 0 ? 'Be the first to learn!' : 'Growing community'}</span>,
            },
            {
              icon: <FaBookOpen />,
              iconBg: 'bg-amber-100 text-amber-500',
              label: 'Classes Conducted',
              value: totalClasses > 1 ? `${totalClasses}+` : `${totalClasses}`,
              sub: 'Classes Completed',
              pill: <span className="inline-flex px-2.5 py-1 bg-amber-50 text-amber-600 text-[10px] font-bold rounded">Growing every day!</span>,
            },
            {
              icon: <FaBullseye />,
              iconBg: 'bg-pink-100 text-pink-500',
              label: 'Specialization',
              value: teacher.specialization || 'Math & Science',
              sub: 'Focus Area',
              pill: <span className="inline-flex px-2.5 py-1 bg-pink-50 text-pink-600 text-[10px] font-bold rounded">Concept Clarity Expert</span>,
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

          {/* ══════ SECTION 3: ABOUT ME ══════ */}
          <div
            className="rounded-3xl shadow-sm overflow-hidden border-l-4 border-indigo-500"
            style={{ background: '#fafaf9' }}
          >
            <div className="px-8 pt-7 pb-2">
              <p className="text-[10px] uppercase tracking-widest font-bold text-indigo-500 mb-1">About Me</p>
              <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
                <FaChalkboardTeacher className="text-indigo-500" /> {teacherName}
              </h2>
            </div>

            <div className="px-8 pb-6">
              {/* Bio */}
              <div className="relative mt-4 mb-6">
                <FaQuoteLeft className="absolute -top-1 -left-1 text-indigo-200 text-4xl pointer-events-none" />
                <p className="text-[17px] font-medium text-slate-700 leading-relaxed pl-10">
                  {teacher.bio
                    ? teacher.bio.split(' ').map((word, i) => {
                      const isKeyword = word.length > 7 && /^[A-Z]/.test(word);
                      return isKeyword
                        ? <strong key={i} className="text-indigo-700 font-bold">{word} </strong>
                        : <span key={i}>{word} </span>;
                    })
                    : 'No profile summary has been added yet.'}
                </p>
              </div>

              {/* 4-column detail grid — wider now */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                {[
                  { icon: <FaCalendarAlt />, iconCls: 'bg-indigo-50 text-indigo-600', label: 'Joined', value: formatMemberSince(user.createdAt) },
                  { icon: <FaLanguage />, iconCls: 'bg-cyan-50 text-cyan-600', label: 'Languages', value: teacher.languagesSpoken?.length ? teacher.languagesSpoken.join(', ') : 'Not specified' },
                  { icon: <FaStar />, iconCls: 'bg-amber-50 text-amber-500', label: 'Teaching Style', value: (teacher as any).teachingDescription || 'Interactive, Student-Centered' },
                  { icon: <FaMapMarkerAlt />, iconCls: 'bg-rose-50 text-rose-500', label: 'Location', value: (teacher as any).location || teacher.city || 'Online / Flexible' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3 bg-white border border-slate-100 rounded-2xl px-4 py-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm flex-shrink-0 mt-0.5 ${item.iconCls}`}>{item.icon}</div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-0.5">{item.label}</p>
                      <p className="text-[15px] font-bold text-slate-700">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Subject chips */}
              {teacher.subjects && teacher.subjects.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {teacher.subjects.map((sub, i) => (
                    <span key={i} className="inline-flex items-center px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold">
                      {sub}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ══════ SECTION 4: EDUCATION & QUALIFICATIONS (moved here, below About) ══════ */}
          {(teacher.education || []).length > 0 && (
            <div className="rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-8 py-5 border-b border-slate-100 flex items-center gap-3" style={{ background: 'linear-gradient(90deg, #f5f3ff, #faf9ff)' }}>
                <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center">
                  <FaGraduationCap className="text-violet-600 text-base" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest font-bold text-violet-500 mb-0.5">Credentials</p>
                  <h2 className="text-base font-bold text-slate-900">Education & Qualifications</h2>
                  <p className="text-xs text-slate-400">{(teacher.education || []).length} credential{(teacher.education || []).length !== 1 ? 's' : ''} on file</p>
                </div>
              </div>

              <div className="p-8 bg-white">
                <div className="relative">
                  <div className="absolute left-5 top-4 bottom-4 w-px bg-gradient-to-b from-violet-300 via-indigo-200 to-transparent" />
                  <div className="space-y-6">
                    {(teacher.education || []).map((edu, i) => (
                      <div key={i} className="relative flex gap-6 group">
                        <div className="relative z-10 flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-md shadow-violet-200 group-hover:scale-110 transition-transform">
                          <FaGraduationCap className="text-white text-xs" />
                        </div>
                        <div className="flex-1 bg-slate-50 hover:bg-violet-50/50 border border-slate-100 hover:border-violet-100 rounded-2xl p-5 transition-all duration-200">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <p className="text-base font-bold text-slate-900">{edu.degree}</p>
                              <p className="text-sm text-violet-600 font-semibold mt-0.5">{edu.institution}</p>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {edu.year && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-violet-100 text-violet-700">
                                  <FaCalendarAlt className="text-[9px]" /> {edu.year}
                                </span>
                              )}
                              {/* Location badge removed as requested */}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════ SECTION 5: INTRODUCTION VIDEO ══════ */}
          <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
            <div className="px-8 py-5 border-b border-slate-100 flex items-center gap-3" style={{ background: 'linear-gradient(90deg, #eff6ff, #f8faff)' }}>
              <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
                <FaPlay className="text-blue-600 text-xs" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest font-bold text-blue-500 mb-0.5">Video</p>
                <h2 className="text-base font-bold text-slate-900">Introduction Video</h2>
              </div>
            </div>
            <div className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                <div className="relative rounded-2xl overflow-hidden bg-slate-900 aspect-video shadow-xl">
                  {teacherVideoUrl ? (
                    videoEmbedUrl ? (
                      <iframe src={videoEmbedUrl} title="intro" className="w-full h-full border-0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                    ) : isDirectVideoUrl(teacherVideoUrl) ? (
                      <video src={teacherVideoUrl} controls className="w-full h-full" />
                    ) : (
                      <a href={teacherVideoUrl} target="_blank" rel="noreferrer" className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-blue-400 hover:text-blue-300 transition-colors">
                        <div className="w-16 h-16 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-2xl"><FaPlay /></div>
                        <span className="text-sm font-medium">Open Video</span>
                      </a>
                    )
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                      <div className="w-14 h-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white text-xl"><FaPlay /></div>
                      <span className="text-sm text-white/40">No introduction video yet</span>
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">Get to know me better!</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    {(teacher as any).videoDescription
                      ? (teacher as any).videoDescription
                      : teacher.bio
                        ? teacher.bio.split('\n')[0] || teacher.bio.slice(0, 300)
                        : 'Watch my introduction video to learn more about my teaching style, approach, and what you can expect from my classes.'}
                  </p>
                  {teacherVideoUrl && (
                    <span className="inline-flex items-center gap-2 mt-5 bg-blue-50 border border-blue-100 rounded-full px-4 py-2 text-xs font-semibold text-blue-600">
                      <FaClock className="text-blue-400" /> Introduction video
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ══════ SECTION 6: TEACHING PHILOSOPHY ══════ */}
          <div
            className="rounded-3xl shadow-sm overflow-hidden border-l-4 border-amber-400"
            style={{ background: 'rgba(254,243,199,0.3)' }}
          >
            <div className="px-8 pt-7 pb-2">
              <p className="text-[10px] uppercase tracking-widest font-bold text-amber-500 mb-1">My Teaching Philosophy</p>
              <h2 className="text-xl font-bold text-slate-900">How I Teach</h2>
            </div>
            <div className="px-8 pb-7">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mt-5">
                {philosophyPrinciples.map((p, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-amber-100 p-6 shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center text-white font-extrabold text-sm mb-4">
                      {i + 1}
                    </div>
                    <p className="text-[16px] font-bold text-slate-800 mb-2">{p.title}</p>
                    <p className="text-[14px] text-slate-500 leading-relaxed">{p.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ══════ SECTION 7: CLASSES ══════ */}
          {classCards.length > 0 && (
            <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
              <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between" style={{ background: 'linear-gradient(90deg, #fefce8, #fffdf0)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
                    <FaBookOpen className="text-amber-600 text-base" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest font-bold text-amber-500 mb-0.5">Classes</p>
                    <h2 className="text-base font-bold text-slate-900">Taught by this Educator</h2>
                  </div>
                </div>
                <Link to="/events" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors">View all →</Link>
              </div>
              <div className="p-8">
                {/* Full-width 3-column grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {classCards.map((event) => {
                    const thumb = getEventImageFromEvent(event, 400, 300);
                    const hasUnlimited = (event.dateSchedule || []).some((s: any) => s.unlimitedSeats);
                    const totalSeats = hasUnlimited
                      ? 0
                      : (event.dateSchedule || []).reduce((sum: number, s: any) => sum + (s.totalSeats ?? s.availableSeats ?? 0), 0);
                    const soldSeats = (event.dateSchedule || []).reduce((sum: number, s: any) => sum + (s.soldSeats ?? 0), 0);
                    const firstDate = event.dateSchedule?.[0]?.date || event.dateSchedule?.[0]?.startDate;
                    const dateLabel = firstDate
                      ? new Date(firstDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : null;
                    const isOnline = event.eventType === 'Online' || event.venueType === 'Online' || (event as any).teachingMode === 'online';
                    const typeLabel = event.type || 'Class';
                    const eventRating = event.averageRating || 0;
                    const eventReviewCount = event.reviewCount || 0;
                    return (
                      <Link
                        to={`/events/${event._id}`}
                        key={event._id}
                        className="group flex flex-col rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-200"
                      >
                        <div className="relative overflow-hidden bg-slate-100 aspect-[16/10] flex-shrink-0">
                          {thumb
                            ? <img src={thumb} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                            : (
                              <div className="w-full h-full bg-gradient-to-br from-violet-100 via-blue-50 to-indigo-100 flex items-center justify-center">
                                <FaBookOpen className="text-violet-300 text-4xl" />
                              </div>
                            )
                          }
                          {isOnline && (
                            <span className="absolute top-3 right-3 bg-violet-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Online</span>
                          )}
                        </div>
                        <div className="flex flex-col flex-1 px-5 pt-4 pb-5 gap-2">
                          <span className="text-[10px] font-extrabold tracking-widest uppercase text-violet-500">{typeLabel}</span>
                          <h3 className="text-[16px] font-bold text-slate-900 leading-snug line-clamp-2 group-hover:text-violet-700 transition-colors">{event.title}</h3>
                          {eventRating > 0 && (
                            <div className="flex items-center gap-1.5">
                              <StarRow rating={eventRating} />
                              <span className="text-[10px] text-slate-400">({eventReviewCount})</span>
                            </div>
                          )}
                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                            {dateLabel && <span className="flex items-center gap-1.5"><FaCalendarAlt className="text-slate-400" />{dateLabel}</span>}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-400">
                            <FaUsers className="flex-shrink-0" />
                            <span>{soldSeats}/{hasUnlimited ? '∞' : (totalSeats || '∞')} booked</span>
                          </div>
                          <div className="mt-auto pt-3 border-t border-slate-100">
                            <span className="text-xl font-extrabold text-violet-600">{event.currency || 'AED'} {event.price || 0}</span>
                            <span className="text-xs text-slate-400 ml-1">/ session</span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ══════ SECTION 8: CERTIFICATIONS ══════ */}
          {hasCertifications && (
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-8 py-5 border-b border-slate-100 flex items-center gap-3" style={{ background: 'linear-gradient(90deg, #f0fdf4, #f8fffb)' }}>
                <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <FaAward className="text-emerald-600 text-base" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest font-bold text-emerald-600 mb-0.5">Certifications</p>
                  <h2 className="text-base font-bold text-slate-900">Certificates & Credentials</h2>
                </div>
              </div>
              <div className="p-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {certifications.map((cert, i) => (
                    <div key={i} className="flex items-center gap-4 bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-extrabold text-base flex-shrink-0">
                        {cert.name?.[0] || '🏅'}
                      </div>
                      <div>
                        <p className="text-[14px] font-bold text-slate-800 leading-tight">{cert.name}</p>
                        {(cert.issuer || cert.year) && (
                          <p className="text-[12px] text-slate-400 mt-0.5">
                            {cert.issuer}{cert.issuer && cert.year ? ' · ' : ''}{cert.year}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ══════ SECTION 9: OUTCOMES + AVAILABILITY — side by side ══════ */}
          <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">

              {/* LEFT: What You'll Gain */}
              <div className="flex flex-col">
                <div className="px-8 py-5 border-b border-slate-100 flex items-center gap-3" style={{ background: 'linear-gradient(90deg, #f5f3ff, #eef2ff)' }}>
                  <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center">
                    <FaCheck className="text-violet-600 text-sm" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest font-bold text-violet-500 mb-0.5">Outcomes</p>
                    <h2 className="text-base font-bold text-slate-900">What You'll Gain</h2>
                  </div>
                </div>
                <div className="p-6 flex-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {outcomes.map((outcome, i) => (
                      <div key={i} className="flex items-center gap-3 bg-violet-50/60 border border-violet-100 rounded-xl px-4 py-3">
                        <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0">
                          <FaCheck className="text-white text-[9px]" />
                        </div>
                        <p className="text-[13px] font-semibold text-slate-700 leading-snug">{outcome}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* RIGHT: Availability */}
              <div className="flex flex-col">
                <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between" style={{ background: 'linear-gradient(90deg, #f0fdf4, #f8fffb)' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
                      <FaCalendarAlt className="text-emerald-600 text-base" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest font-bold text-emerald-600 mb-0.5">Schedule</p>
                      <h2 className="text-base font-bold text-slate-900">Availability</h2>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-full font-medium">
                    GMT +4
                  </span>
                </div>
                <div className="p-6 flex-1">
                  <div className="flex flex-col gap-2">
                    {DAYS_OF_WEEK.map((day) => {
                      const dayData = availHours[day] || { isAvailable: false };
                      const isOpen = dayData.isAvailable;
                      return (
                        <div
                          key={day}
                          className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all ${isOpen
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                              : 'bg-slate-50 border-slate-200 text-slate-400'
                            }`}
                        >
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isOpen ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                          <span className="capitalize w-24">{day}</span>
                          {isOpen ? (
                            <span className="text-emerald-600 font-bold text-xs ml-auto">
                              {dayData.startTime || '09:00'} – {dayData.endTime || '17:00'}
                            </span>
                          ) : (
                            <span className="text-slate-300 text-xs ml-auto">Unavailable</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-4 flex items-center gap-1.5">
                    <FaClock className="opacity-50" /> All times in Asia/Dubai (GMT +4)
                  </p>
                </div>
              </div>

            </div>
          </div>

          {/* ══════ SECTION 10: FAQ ══════ */}
          {faqItems.length > 0 && (
            <div className="rounded-3xl shadow-sm overflow-hidden" style={{ background: 'linear-gradient(135deg, #fafafa 0%, #f4f3ff 100%)' }}>
              <div className="px-8 py-6 border-b border-slate-100/80">
                <p className="text-[10px] uppercase tracking-widest font-bold text-indigo-500 mb-1">Got Questions?</p>
                <h2 className="text-xl font-bold text-slate-900">Frequently Asked Questions</h2>
                <p className="text-sm text-slate-400 mt-1">Click any question to reveal the answer</p>
              </div>
              <div className="p-6 lg:p-8">
                <div className="max-w-none">
                  {faqItems.map((item, i) => (
                    <FAQItem key={i} q={item.q} a={item.a} defaultOpen={i === 0} index={i} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ══════ SECTION 11: REVIEWS ══════ */}
          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6 lg:p-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-8">What Students Are Saying</h2>

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
                      const name = `${review.user?.firstName || ''} ${review.user?.lastName || ''}`.trim() || 'Verified Student';
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
                    <TeacherReviewWidget
                      teacherUserId={id}
                      onSubmitSuccess={handleReviewSubmitSuccess}
                    />
                  ) : (
                    <p className="text-sm text-slate-400 text-center py-4">This teacher has no published events yet — check back soon to leave a review!</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ══════ SECTION 12: CTA STRIP ══════ */}
          <div className="relative bg-gradient-to-r from-indigo-600 via-violet-600 to-pink-500 rounded-3xl px-8 py-10 flex flex-col sm:flex-row items-center justify-between gap-6 overflow-hidden mb-8">
            <div className="absolute -top-10 -right-10 w-52 h-52 bg-white/10 rounded-full pointer-events-none" />
            <div className="absolute -bottom-16 left-[12%] w-64 h-64 bg-white/5 rounded-full pointer-events-none" />
            <div className="flex items-center gap-5 relative z-10">
              <span className="text-5xl leading-none flex-shrink-0">📅</span>
              <div>
                <h3 className="text-2xl font-extrabold text-white">Start learning with {teacherName}</h3>
                <p className="text-sm text-white/80 mt-1">Fun, structured sessions designed for real understanding</p>
              </div>
            </div>
            <button className="relative z-10 flex-shrink-0 inline-flex items-center gap-2 bg-white text-indigo-600 font-bold text-sm px-8 py-4 rounded-full shadow-xl hover:scale-105 hover:shadow-2xl transition-all duration-200 whitespace-nowrap">
              <FaCalendarAlt /> Book a Session
            </button>
          </div>

        </div>
      </div>

      {/* ══════ Mobile sticky bottom CTA ══════ */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 shadow-[0_-4px_24px_rgba(0,0,0,0.10)] px-4 py-3 flex gap-3">
        <button className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm py-3 rounded-xl transition-all">
          <FaCalendarAlt /> Book a Session
        </button>
        <button className="px-5 py-3 bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-sm rounded-xl transition-all hover:bg-slate-100">
          Message
        </button>
      </div>

    </div>
  );
};

export default TeacherPublicProfilePage;
