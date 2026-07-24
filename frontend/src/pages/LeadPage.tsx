import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  getAllActiveLeadPages,
  getLeadPageByEvent,
  submitLead,
  submitGlobalLead,
  ILeadPage,
} from '../services/api/leadPageAPI';
import { getEventImageFromEvent } from '../utils/imageFallbacks';
import { galleryAPI } from '../services/api/reviewLinkAPI';
import GalleryComponent from '../components/common/GalleryComponent';
import { motion } from 'framer-motion';
import { useVendorsQuery } from '@/hooks/queries/useVendorQuery';
import VendorCard, { Vendor } from '@/components/vendor/VendorCard';
import { useHomepageQuery } from '@/hooks/queries/useHomepageQuery';
import HowItWorks from '@/components/sections/HowItWorks';
import WhyChooseUs from '@/components/sections/WhyChooseUs';
import HomepageFAQs from '@/components/sections/HomepageFAQs';
import FeaturedBlogsSection from '@/components/sections/FeaturedBlogsSection';
import { ScrollReveal } from '@/components/animations';


const INK = '#161A23';
const PAPER = '#FCFAF4';
const CORAL = '#FF5A3C';
const TEAL = '#0E7C7B';
const SUN = '#FFC53D';
const LINE = '#DCD5C4';

const GlobalStyles: React.FC = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600;700;800&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap');
    .kr-display { font-family: 'Bricolage Grotesque', ui-sans-serif, system-ui, sans-serif; letter-spacing: -0.01em; }
    .kr-body { font-family: 'Inter', ui-sans-serif, system-ui, sans-serif; }
    .kr-mono { font-family: 'IBM Plex Mono', ui-monospace, SFMono-Regular, monospace; letter-spacing: 0.04em; }
    .kr-dotfield {
      background-image: radial-gradient(rgba(252,250,244,0.14) 1.5px, transparent 1.5px);
      background-size: 22px 22px;
    }
    @keyframes krDrift { 0%,100% { transform: translateY(0); opacity: .18; } 50% { transform: translateY(-14px); opacity: .4; } }
    .kr-drift { animation: krDrift 6s ease-in-out infinite; }
    @keyframes krStamp { 0% { transform: scale(1.25) rotate(-6deg); opacity: 0; } 100% { transform: scale(1) rotate(-4deg); opacity: 1; } }
    .kr-stamp { animation: krStamp .45s cubic-bezier(.2,.8,.2,1); }
  `}</style>
);

// A perforated tear-line with die-cut notches at each end. `bg` must match
// whatever sits directly behind the card so the notches read as cut-outs.
const TicketDivider: React.FC<{ bg?: string }> = ({ bg = PAPER }) => (
  <div className="relative">
    <div className="border-t-2 border-dashed" style={{ borderColor: LINE }} />
    <span className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full" style={{ background: bg }} />
    <span className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full" style={{ background: bg }} />
  </div>
);

// ── Icons (inline SVG to avoid extra deps) ──────────────────────────────────
const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-5 h-5">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const StarIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);
const LocationIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-4 h-4">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);
const ClockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-4 h-4">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
);
const UsersIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-4 h-4">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
  </svg>
);
const ChevronDown = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);
const ArrowRight = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
  </svg>
);
const TicketIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-4 h-4">
    <path d="M3 9a2 2 0 100 6v2a1 1 0 001 1h16a1 1 0 001-1v-2a2 2 0 100-6V7a1 1 0 00-1-1H4a1 1 0 00-1 1v2z" />
    <path d="M13 6v3M13 15v3" strokeDasharray="2 2" />
  </svg>
);
const ImageIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className={className}>
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);
const XIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// ── Helper ──────────────────────────────────────────────────────────────────
const formatDate = (d?: string) => {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

// ── Lead Form ────────────────────────────────────────────────────────────────
interface LeadFormProps { eventId: string; eventTitle?: string; }
const LeadForm: React.FC<LeadFormProps> = ({ eventId, eventTitle }) => {
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [contactType, setContactType] = useState<'email' | 'phone'>('phone');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !contact.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }
    setLoading(true);
    try {
      await submitLead(eventId, {
        name: name.trim(),
        email: contactType === 'email' ? contact.trim() : undefined,
        phone: contactType === 'phone' ? contact.trim() : undefined,
        message: message.trim() || undefined,
      });
      setSubmitted(true);
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="text-center py-12 px-6 kr-body">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 kr-stamp" style={{ background: TEAL, color: PAPER }}>
          <CheckIcon />
        </div>
        <p className="kr-mono text-[11px] uppercase tracking-widest mb-2" style={{ color: TEAL }}>Confirmed</p>
        <h3 className="text-2xl font-bold kr-display mb-2" style={{ color: INK }}>You're on the list</h3>
        <p className="text-sm max-w-xs mx-auto" style={{ color: '#6B7280' }}>
          We've logged your interest in <span className="font-semibold" style={{ color: INK }}>{eventTitle}</span>. Our team will reach out shortly.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 kr-body">
      <div>
        <label className="block kr-mono text-[11px] uppercase tracking-widest mb-2" style={{ color: '#8A8577' }}>
          Full name <span style={{ color: CORAL }}>*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your child's parent / guardian"
          required
          className="w-full px-1 py-2.5 bg-transparent border-0 border-b-2 text-[15px] focus:outline-none transition-colors placeholder-gray-400"
          style={{ borderColor: LINE, color: INK }}
          onFocus={(e) => (e.currentTarget.style.borderColor = TEAL)}
          onBlur={(e) => (e.currentTarget.style.borderColor = LINE)}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block kr-mono text-[11px] uppercase tracking-widest" style={{ color: '#8A8577' }}>
            Contact <span style={{ color: CORAL }}>*</span>
          </label>
          <div className="flex gap-3 kr-mono text-[11px] uppercase">
            <button type="button" onClick={() => setContactType('phone')}
              className="transition-colors" style={{ color: contactType === 'phone' ? TEAL : '#B7B2A2', fontWeight: contactType === 'phone' ? 700 : 500 }}>
              Phone
            </button>
            <span style={{ color: LINE }}>/</span>
            <button type="button" onClick={() => setContactType('email')}
              className="transition-colors" style={{ color: contactType === 'email' ? TEAL : '#B7B2A2', fontWeight: contactType === 'email' ? 700 : 500 }}>
              Email
            </button>
          </div>
        </div>
        <input
          type={contactType === 'email' ? 'email' : 'tel'}
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder={contactType === 'email' ? 'you@example.com' : '+971 50 123 4567'}
          required
          className="w-full px-1 py-2.5 bg-transparent border-0 border-b-2 text-[15px] focus:outline-none transition-colors placeholder-gray-400"
          style={{ borderColor: LINE, color: INK }}
          onFocus={(e) => (e.currentTarget.style.borderColor = TEAL)}
          onBlur={(e) => (e.currentTarget.style.borderColor = LINE)}
        />
      </div>

      <div>
        <label className="block kr-mono text-[11px] uppercase tracking-widest mb-2" style={{ color: '#8A8577' }}>
          Notes <span className="normal-case" style={{ color: '#B7B2A2' }}>(optional)</span>
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={2}
          placeholder="Anything specific you'd like to ask?"
          className="w-full px-1 py-2.5 bg-transparent border-0 border-b-2 text-[15px] focus:outline-none transition-colors placeholder-gray-400 resize-none"
          style={{ borderColor: LINE, color: INK }}
          onFocus={(e) => (e.currentTarget.style.borderColor = TEAL)}
          onBlur={(e) => (e.currentTarget.style.borderColor = LINE)}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-4 font-bold text-[15px] rounded-full hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2 kr-body"
        style={{ background: CORAL, color: PAPER }}
      >
        {loading ? (
          <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Registering…</>
        ) : (
          <>Register my interest <ArrowRight /></>
        )}
      </button>
      <p className="kr-mono text-[10px] text-center uppercase tracking-widest" style={{ color: '#B7B2A2' }}>
        Private &amp; never shared with third parties
      </p>
    </form>
  );
};

// ── FAQ Accordion ────────────────────────────────────────────────────────────
const FAQItem: React.FC<{ question: string; answer: string; index: number }> = ({ question, answer, index }) => {
  const [open, setOpen] = useState(index === 0);
  return (
    <div>
      <button
        className="w-full flex items-center justify-between py-4 text-left"
        onClick={() => setOpen(!open)}
      >
        <span className="flex items-baseline gap-3 pr-4">
          <span className="kr-mono text-[11px]" style={{ color: open ? TEAL : '#B7B2A2' }}>{String(index + 1).padStart(2, '0')}</span>
          <span className="font-semibold text-[15px] kr-body" style={{ color: INK }}>{question}</span>
        </span>
        <span className="flex-shrink-0 transition-transform duration-200" style={{ color: open ? TEAL : '#B7B2A2', transform: open ? 'rotate(180deg)' : 'none' }}>
          <ChevronDown />
        </span>
      </button>
      <div className={`transition-all duration-200 ${open ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}>
        <p className="pb-4 pl-8 text-sm leading-relaxed kr-body" style={{ color: '#5B5647' }}>{answer}</p>
      </div>
      <div className="border-t" style={{ borderColor: LINE }} />
    </div>
  );
};

// ── Event Card (for global mode) ─────────────────────────────────────────────
const EventCard: React.FC<{ lp: ILeadPage }> = ({ lp }) => {
  const event = lp.event as any;
  const imgSrc = getEventImageFromEvent(event, 400, 300);

  const firstDate = event?.dateSchedule?.[0];
  const dateStr = firstDate?.startDate || firstDate?.date;
  const formattedDate = dateStr ? formatDate(dateStr) : 'TBA';
  const locationText = event?.location?.city || event?.location?.address || 'Location TBD';

  return (
    <Link
      to={`/lead-page?eventId=${lp.event?._id}`}
      className="group relative flex flex-col rounded-[22px] overflow-hidden border transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(255,90,60,0.12)] bg-white"
      style={{ borderColor: LINE, boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}
    >
      {/* Image */}
      <div className="h-48 w-full relative overflow-hidden" style={{ background: '#F1EDE2' }}>
        {imgSrc ? (
          <div
            className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
            style={{ backgroundImage: `url('${imgSrc}')` }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-3xl">🎟️</div>
        )}
        <span className="absolute top-3 left-3 kr-mono text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full shadow-md bg-gradient-to-r from-orange-500 to-pink-500 text-white">
          {event?.category?.replace(/&amp;/g, '&') || 'Event'}
        </span>
      </div>

      {/* Perforated tear line at the seam between image and stub */}
      <div className="relative">
        <TicketDivider bg="#FFFFFF" />
      </div>

      {/* Info */}
      <div className="p-5 flex-grow flex flex-col justify-between gap-4">
        <h3 className="font-bold text-[16px] leading-snug kr-display group-hover:opacity-80 transition-opacity" style={{ color: INK }}>
          {event?.title}
        </h3>

        <div className="flex items-center justify-between kr-mono text-[11px] uppercase tracking-wide" style={{ color: '#8A8577' }}>
          <span className="truncate max-w-[45%]">{formattedDate}</span>
          <span className="truncate max-w-[45%] text-right">{locationText}</span>
        </div>
      </div>

    </Link>
  );
};

// ── Main Component ───────────────────────────────────────────────────────────
const LeadPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const eventId = searchParams.get('eventId');
  const formRef = useRef<HTMLDivElement>(null);

  const { data: vendorData } = useVendorsQuery({ limit: 12, sortBy: 'rating', sortOrder: 'desc' });
  const fetchedVendors = (vendorData?.vendors || vendorData?.data?.vendors || []) as Vendor[];

  const { data: homepageData } = useHomepageQuery();
  const stats = homepageData?.stats || {
    totalEvents: 2500,
    totalVendors: 750,
    totalVenues: 500,
    totalClasses: 1000,
  };

  const [globalPages, setGlobalPages] = useState<ILeadPage[]>([]);
  const [eventPage, setEventPage] = useState<ILeadPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [galleryData, setGalleryData] = useState<any>(null);
  const [showAllEventGallery, setShowAllEventGallery] = useState(false);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    if (eventId) {
      Promise.all([
        getLeadPageByEvent(eventId),
        galleryAPI.getByEvent(eventId).catch(() => null)
      ])
        .then(([data, galleryRes]) => {
          setEventPage(data);
          if (galleryRes?.data?.data?.gallery) {
            setGalleryData(galleryRes.data.data.gallery);
          }
        })
        .catch(() => setNotFound(true))
        .finally(() => setLoading(false));
    } else {
      getAllActiveLeadPages()
        .then((data) => setGlobalPages(data.filter(lp => !lp.isGlobal)))
        .catch(() => { })
        .finally(() => setLoading(false));
    }
  }, [eventId]);

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: INK }}>
        <GlobalStyles />
        <div className="text-center">
          <div className="w-10 h-10 border-2 rounded-full animate-spin mx-auto mb-4" style={{ borderColor: 'rgba(252,250,244,0.2)', borderTopColor: PAPER }} />
          <p className="kr-mono text-xs uppercase tracking-widest" style={{ color: 'rgba(252,250,244,0.6)' }}>Loading lead page…</p>
        </div>
      </div>
    );
  }

  // ── 404 ──────────────────────────────────────────────────────────────────
  if (eventId && notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: INK }}>
        <GlobalStyles />
        <div className="text-center kr-body">
          <p className="kr-mono text-xs uppercase tracking-widest mb-4" style={{ color: CORAL }}>404 · Not found</p>
          <h2 className="text-2xl font-bold kr-display mb-2" style={{ color: PAPER }}>This lead page doesn't exist</h2>
          <p className="mb-8 text-sm" style={{ color: 'rgba(252,250,244,0.6)' }}>The event you're looking for isn't accepting registrations right now.</p>
          <Link to="/lead-page" className="inline-flex items-center gap-2 px-6 py-3 font-bold rounded-full text-sm hover:brightness-105 transition"
            style={{ background: PAPER, color: INK }}>
            View all events <ArrowRight />
          </Link>
        </div>
      </div>
    );
  }

  // ── Event-Focused Mode ───────────────────────────────────────────────────
  if (eventId && eventPage) {
    const ev = eventPage.event;
    const heroImg = getEventImageFromEvent(ev as any, 1920, 1080);
    const firstDate = ev?.dateSchedule?.[0];
    const dateStr = firstDate?.startDate || firstDate?.date;
    const endDateStr = firstDate?.endDate;

    return (
      <div className="min-h-screen kr-body" style={{ background: PAPER }}>
        <GlobalStyles />

        {/* ── Hero ── */}
        <div className="relative h-[72vh] min-h-[600px] overflow-hidden" style={{ background: INK }}>
          <div className="absolute inset-0">
            {heroImg ? (
              <img src={heroImg} alt={ev?.title} className="w-full h-full object-cover object-center transform hover:scale-105 transition-transform duration-[20s]" />
            ) : (
              <div className="absolute inset-0 kr-dotfield" style={{ background: INK }} />
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent" />
          </div>

          <div className="absolute inset-0 flex flex-col justify-center">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full z-10">
              {/* Category + meta badges */}
              <div className="flex flex-wrap items-center gap-3 mb-6">
                {ev?.category && (
                  <span className="bg-orange-500 text-white px-4 py-1 rounded-full text-sm font-bold shadow-lg shadow-orange-500/30 uppercase tracking-wide">
                    {ev.category}
                  </span>
                )}
              </div>

              <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-4 max-w-4xl leading-tight tracking-tight drop-shadow-sm kr-display">
                {ev?.title}
              </h1>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-white/80 text-base mb-10">
                {ev?.location?.city && (
                  <span className="flex items-center gap-1.5"><LocationIcon />{ev.location.address}, {ev.location.city}</span>
                )}
                {dateStr && (
                  <span className="flex items-center gap-1.5"><ClockIcon />{formatDate(dateStr)}{endDateStr && ` – ${formatDate(endDateStr)}`}</span>
                )}
                {ev?.ageRange && (
                  <span className="flex items-center gap-1.5"><UsersIcon />Ages {ev.ageRange[0]}–{ev.ageRange[1]}</span>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-5">
                <button
                  onClick={scrollToForm}
                  className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-10 py-4 rounded-full font-bold text-lg shadow-xl shadow-orange-500/20 hover:shadow-2xl hover:scale-105 transition-all duration-300"
                >
                  Register my interest
                </button>
                {ev?.price !== undefined && (
                  <div className="flex items-center text-white/90 bg-black/30 backdrop-blur-md px-8 py-4 rounded-full border border-white/10 hover:bg-black/40 transition-colors font-semibold">
                    From {ev.currency || 'AED'} {ev.price}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Short Description (Introduction style like InstructorDetailPage) ── */}
        {ev?.description && (
          <section className="py-20 md:py-28 max-w-4xl mx-auto px-4 text-center relative">
            <div className="absolute top-10 left-10 text-9xl text-gray-100 font-serif opacity-50 -z-10 rotate-12">"</div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8 tracking-tight kr-display">
              About This Event:&nbsp;
              <span className="text-gray-500 font-light italic">
                {ev.title}
              </span>
            </h2>
            <p className="text-xl md:text-2xl text-gray-600 leading-relaxed font-light">
              {/* Show stripped short version of description */}
              {ev.description.replace(/<[^>]*>/g, '').slice(0, 280)}{ev.description.replace(/<[^>]*>/g, '').length > 280 ? '…' : ''}
            </p>
          </section>
        )}

        {/* ── Main Body: Why Attend + Ready to Start (left) + Form Sidebar (right) ── */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 mb-10 gap-16">

            {/* LEFT COLUMN */}
            <div className="lg:col-span-2 space-y-16">

              {/* Why Attend */}
              <section>
                <div className="flex items-center mb-10">
                  <div className="p-4 rounded-2xl bg-orange-100 text-orange-600 mr-5 shadow-sm">
                    <StarIcon className="w-8 h-8" />
                  </div>
                  <h2 className="text-4xl font-bold text-gray-900 tracking-tight kr-display">Why attend?</h2>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  {[
                    { title: 'Expert-led sessions', desc: 'Learn from industry professionals and certified instructors' },
                    { title: 'Network & connect', desc: 'Meet like-minded participants and build lasting connections' },
                    { title: 'Certificates & awards', desc: 'Earn recognition for participation and achievement' },
                    { title: 'Hands-on learning', desc: 'Practical, activity-based learning for real-world skills' },
                  ].map((benefit, idx) => (
                    <div key={idx} className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex gap-6 group">
                      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center font-bold text-lg group-hover:bg-orange-500 group-hover:text-white transition-colors duration-300">
                        {idx + 1}
                      </div>
                      <div>
                        <h3 className="font-bold text-xl text-gray-900 mb-3">{benefit.title}</h3>
                        <p className="text-gray-600 text-lg leading-relaxed">{benefit.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Ready to Start — below Why Attend in left column */}
              <section className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
                <div className="bg-gray-900 px-10 py-8 text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <StarIcon className="w-24 h-24" />
                  </div>
                  <h3 className="text-2xl font-bold relative z-10">Ready to Start?</h3>
                  <p className="text-gray-400 text-sm mt-1 relative z-10">
                    {ev?.ageRange ? `For ages ${ev.ageRange[0]}–${ev.ageRange[1]}` : 'Open to all ages'}
                  </p>
                </div>
                <div className="p-8">
                  <div className="grid sm:grid-cols-2 gap-6">

                    {/* Location */}
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center flex-shrink-0">
                        <LocationIcon />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Location</div>
                        <div className="text-sm text-gray-800 font-bold leading-tight">
                          {ev?.location?.address ? `${ev.location.address}, ${ev.location.city}` : ev?.location?.city || 'Online'}
                        </div>
                      </div>
                    </div>

                    {/* Ages */}
                    {ev?.ageRange && (
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center flex-shrink-0">
                          <UsersIcon />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Who is this for?</div>
                          <div className="text-sm text-gray-700">Children aged {ev.ageRange[0]}–{ev.ageRange[1]} years</div>
                        </div>
                      </div>
                    )}

                    {/* Topics */}
                    {ev?.tags && ev.tags.length > 0 && (
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center flex-shrink-0">
                          <CheckIcon />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Topics covered</div>
                          <div className="text-sm text-gray-700">{ev.tags.slice(0, 4).join(', ')}</div>
                        </div>
                      </div>
                    )}

                    {/* Requirements */}
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center flex-shrink-0">
                        <CheckIcon />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Requirements</div>
                        <div className="text-sm text-gray-700">No prior experience needed — open to all</div>
                      </div>
                    </div>

                  </div>

                  {/* Price + CTA */}
                  <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-between gap-6 flex-wrap">
                    {ev?.price !== undefined ? (
                      <div>
                        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Pricing</div>
                        <div className="text-3xl font-extrabold text-gray-900 tracking-tight">{ev.currency || 'AED'} {ev.price}</div>
                      </div>
                    ) : <div />}
                    <Link
                      to={`/events/${ev?._id}`}
                      className="bg-black text-white font-bold px-8 py-4 rounded-xl shadow-lg hover:bg-gray-800 hover:-translate-y-0.5 transition-all flex items-center gap-2 text-base"
                    >
                      View Event Page →
                    </Link>
                  </div>
                </div>
              </section>

            </div>

            {/* RIGHT COLUMN: Sticky Form Only */}
            <div className="lg:col-span-1">
              <div className="lg:sticky lg:top-8">
                <div ref={formRef} className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
                  <div className="px-7 pt-7 pb-6" style={{ background: INK }}>
                    <p className="kr-mono text-[10px] uppercase tracking-widest mb-1.5" style={{ color: SUN }}>Limited spots</p>
                    <h3 className="text-xl font-bold kr-display" style={{ color: PAPER }}>Register your interest</h3>
                    <p className="text-[13px] mt-1" style={{ color: 'rgba(252,250,244,0.6)' }}>Be first to know about dates &amp; pricing</p>
                  </div>
                  <TicketDivider bg="#FFFFFF" />
                  <div className="px-7 pb-7 pt-4">
                    <LeadForm eventId={eventId} eventTitle={ev?.title} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Event Gallery ── */}
        {(() => {
          if (!galleryData || !galleryData.images || galleryData.images.length === 0) return null;

          const layoutType = galleryData.type || 'grid';
          const maxVisible = layoutType === 'messy' ? 5 : 6;
          const totalGalleryImages = galleryData.images.length;
          const shouldCollapseGallery = totalGalleryImages > maxVisible;
          const visibleGalleryImages = shouldCollapseGallery && !showAllEventGallery
            ? galleryData.images.slice(0, maxVisible)
            : galleryData.images;

          return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
              <div className="flex flex-col mb-10">
                <div className="flex items-center mb-2">
                  <div className="p-4 rounded-2xl bg-orange-100 text-orange-600 mr-5 shadow-sm">
                    <StarIcon className="w-8 h-8" />
                  </div>
                  <h2 className="text-4xl font-bold text-gray-900 tracking-tight kr-display">See It in Action</h2>
                </div>
                <p className="text-gray-500 text-lg leading-relaxed mt-1 sm:ml-[5.5rem]">
                  Get a sneak peek into the activities, vibrant atmosphere, and unforgettable experiences that make this event truly special.
                </p>
              </div>
              <GalleryComponent layout={layoutType} images={visibleGalleryImages} />

              {shouldCollapseGallery && !showAllEventGallery && (
                <div className="mt-8 flex flex-col items-center">
                  <button
                    type="button"
                    onClick={() => setShowAllEventGallery(true)}
                    className="inline-flex items-center gap-3 rounded-2xl bg-[#0b1630] px-8 py-3.5 text-white font-bold text-base hover:bg-[#0f1d3f] transition-colors shadow-lg hover:shadow-xl"
                  >
                    <ImageIcon className="w-6 h-6 text-green-400" />
                    <span>View all {totalGalleryImages} photos</span>
                  </button>

                </div>
              )}

              {showAllEventGallery && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-300 p-4">
                  <div className="relative w-full max-w-5xl flex flex-col bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh]">
                    <button
                      onClick={() => setShowAllEventGallery(false)}
                      className="absolute top-6 right-6 text-gray-600 hover:text-gray-900 transition-colors z-[160] hover:bg-gray-100 p-2 rounded-full"
                    >
                      <XIcon className="w-7 h-7" />
                    </button>
                    <div className="px-8 md:px-12 pt-8 pb-2">
                      <h3 className="text-3xl md:text-4xl font-bold text-gray-900">
                        See It in Action
                      </h3>
                      <p className="text-gray-500 text-lg mt-1">
                        {totalGalleryImages} Photos Captured
                      </p>
                    </div>
                    <div className="p-8 md:p-12 overflow-y-auto">
                      <GalleryComponent layout="grid" images={galleryData.images} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* ── Meet the Organizer ── */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
          <section className="bg-white rounded-[2rem] overflow-hidden shadow-2xl shadow-gray-200/50 border border-gray-100">
            <div className="md:flex h-full">
              <div className="md:w-5/12 bg-gray-100 relative min-h-[400px] md:min-h-full group">
                {ev?.vendorId?.logo ? (
                  <img
                    src={ev.vendorId.logo}
                    alt={ev.vendorId.businessName || ev.vendorId.fullName || 'Organizer'}
                    className="w-full h-full object-cover object-top absolute inset-0 transition-transform duration-700 group-hover:scale-105"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100">
                    <div className="w-32 h-32 rounded-full bg-orange-500 text-white flex items-center justify-center font-extrabold text-6xl">
                      {(ev?.vendorId?.businessName || ev?.vendorId?.fullName || ev?.teacherId?.fullName || 'K')[0]}
                    </div>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
              </div>
              <div className="md:w-7/12 p-10 md:p-16 flex flex-col justify-center">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 font-serif">
                  Meet Your Organizer: {ev?.vendorId?.businessName || ev?.vendorId?.fullName || ev?.teacherId?.fullName || 'KidRove Partner'}
                </h2>
                {ev?.vendorId?.about ? (
                  <p className="text-gray-600 text-lg leading-relaxed mb-10 whitespace-pre-wrap">
                    {ev.vendorId.about}
                  </p>
                ) : (
                  <>
                    <blockquote className="text-xl md:text-2xl italic text-gray-500 mb-8 border-l-4 border-orange-400 pl-6 py-2 leading-relaxed font-light">
                      "Dedicated to delivering exceptional experiences for children and families."
                    </blockquote>
                    <p className="text-gray-600 text-lg leading-relaxed mb-10">
                      A verified organizer on KidRove, committed to quality, safety, and creating memorable moments for kids of all ages.
                    </p>
                  </>
                )}
                <div className="flex flex-wrap gap-2 mb-8">
                  <span className="bg-orange-50 text-orange-800 text-xs font-bold px-4 py-2 rounded-full border border-orange-100 uppercase tracking-wide">Verified Organizer</span>
                  <span className="bg-orange-50 text-orange-800 text-xs font-bold px-4 py-2 rounded-full border border-orange-100 uppercase tracking-wide">KidRove Partner</span>
                  {ev?.location?.city && <span className="bg-orange-50 text-orange-800 text-xs font-bold px-4 py-2 rounded-full border border-orange-100 uppercase tracking-wide">{ev.location.city}</span>}
                </div>
                {ev?.vendorId?._id && (
                  <div>
                    <Link
                      to={`/vendors/${ev.vendorId._id}`}
                      className="inline-flex items-center gap-2 bg-gray-900 text-white font-bold px-8 py-3 rounded-xl shadow-lg hover:bg-gray-800 hover:-translate-y-0.5 transition-all text-base"
                    >
                      View Profile →
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>

        {/* ── Stories from the Studio (Reviews) ── */}
        {(() => {
          const evReviews = (ev as any)?.reviews;
          const hasEventReviews = evReviews && evReviews.length > 0;
          const staticReviews = [
            { quote: "5 stars for the venue itself...my 6 year just loves it and the variety here is commendable.", student_name: "Meghan Nicole", age: null },
            { quote: "One of the iconic locations. You can explore future technologies and Dubai vision. Absolutely incredible experience!", student_name: "Niyas Pulpadan", age: null },
            { quote: "Absolutely amazing experience and a true heaven for children. My family had a wonderful time exploring the parks.", student_name: "moeen iqbal", age: null },
            { quote: "SUPER INCREDIBLE EXPERIENCE. The turbo ride is simply the best feeling. It was beautiful.", student_name: "Essence Pickett", age: null },
          ];
          const displayReviews = hasEventReviews
            ? evReviews.map((r: any) => ({ quote: r.comment || r.text || '', student_name: r.author || r.userName || 'Guest', age: null }))
            : staticReviews;

          return (
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4 kr-display">Stories from the Studio</h2>
                <div className="w-24 h-1 bg-orange-400 mx-auto rounded-full" />
              </div>
              <div className="grid md:grid-cols-2 gap-8">
                {displayReviews.map((t: any, idx: number) => (
                  <div key={idx} className="bg-white rounded-3xl p-10 relative shadow-xl shadow-gray-100 border border-gray-50 flex flex-col justify-between hover:scale-[1.01] transition-transform duration-300">
                    <div className="absolute -top-4 -left-2 text-8xl text-orange-100 font-serif leading-none z-0">"</div>
                    <div className="relative z-10">
                      <div className="flex gap-1 mb-6">
                        {[1, 2, 3, 4, 5].map(s => <StarIcon key={s} className="w-5 h-5 text-yellow-400 fill-yellow-400" />)}
                      </div>
                      <p className="text-xl text-gray-700 font-light italic leading-relaxed mb-8">{t.quote}</p>
                    </div>
                    <div className="flex items-center relative z-10 border-t border-gray-100 pt-6">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 text-gray-600 flex items-center justify-center font-bold mr-4 shadow-inner text-xl">
                        {t.student_name[0]}
                      </div>
                      <div>
                        <div className="font-bold text-gray-900 text-lg">{t.student_name}</div>
                        <div className="text-xs text-gray-400 font-medium uppercase tracking-wider">{t.age ? `${t.age} years old` : 'Parent'}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })()}

        {/* ── FAQ — event-specific or homepage defaults ── */}
        {(() => {
          const evFaqs = ev?.faqs;
          const hasEventFaqs = evFaqs && evFaqs.length > 0;
          const defaultFaqs = [
            { question: 'What is Kidrove?', answer: "Kidrove is UAE's premier platform connecting families with over 2,500 curated kids activities and events. Since 2017, we've helped 50,000+ families discover safe, educational, and entertaining experiences for children of all ages." },
            { question: 'How do you ensure activity quality and safety?', answer: 'Every activity on Kidrove goes through a rigorous 5-step verification process: vendor background check, facility inspection, safety protocol review, insurance verification, and customer review monitoring.' },
            { question: 'What types of activities can I find?', answer: 'We offer 20+ categories including birthday parties, summer camps, after-school programs, sports activities, art & crafts, STEM workshops, swimming lessons, language classes, dance, and educational programs for ages 0-16.' },
            { question: 'What is your cancellation policy?', answer: 'Cancellation policies vary by vendor and activity. Most allow free cancellation up to 24-48 hours before the event. Eligible cancellations receive full refunds within 5-7 business days.' },
          ];
          const displayFaqs = hasEventFaqs ? evFaqs : defaultFaqs;

          return (
            <section className="bg-gray-50 border-t border-gray-100 py-24">
              <div className="max-w-4xl mx-auto px-4">
                <div className="text-center mb-16">
                  <span className="text-orange-500 font-bold tracking-widest uppercase text-sm mb-2 block">Got Questions?</span>
                  <h2 className="text-4xl font-bold text-gray-900 kr-display">Common Questions</h2>
                </div>
                <div className="space-y-4">
                  {displayFaqs.map((faq: any, i: number) => (
                    <div key={i} className="bg-white border text-left border-gray-200 rounded-2xl p-8 hover:shadow-lg transition-all duration-300">
                      <h3 className="font-bold text-xl text-gray-900 mb-4 flex items-start">
                        <div className="bg-orange-100 p-2 rounded-lg mr-4 mt-1 flex-shrink-0">
                          <CheckIcon />
                        </div>
                        <span className="mt-1">{faq.question}</span>
                      </h3>
                      <p className="text-gray-600 pl-[4.5rem] leading-relaxed text-lg">{faq.answer}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          );
        })()}

        {/* ── KidRove Promo Banner ── */}
        <div className="py-16 px-4 relative overflow-hidden" style={{ background: INK }}>
          <div className="absolute inset-0 kr-dotfield" />
          <div className="relative max-w-3xl mx-auto text-center">
            <p className="kr-mono text-[11px] uppercase tracking-widest mb-3" style={{ color: SUN }}>Powered by</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold kr-display mb-4" style={{ color: PAPER }}>
              KidRove — where kids thrive
            </h2>
            <p className="max-w-xl mx-auto mb-8 text-[15px]" style={{ color: 'rgba(252,250,244,0.65)' }}>
              Hundreds of events, workshops and programs designed to unleash every child's potential.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link to="/search" className="px-7 py-3.5 font-bold rounded-full hover:brightness-105 transition text-[15px]" style={{ background: PAPER, color: INK }}>
                Explore events
              </Link>
              <Link to="/lead-page" className="px-7 py-3.5 font-bold rounded-full transition text-[15px]" style={{ border: '1px solid rgba(252,250,244,0.3)', color: PAPER }}>
                All lead pages
              </Link>
            </div>
          </div>
        </div>

        {/* ── Bottom CTA strip ── */}
        <div className="py-4 px-4 sticky bottom-0 z-10 flex items-center justify-between" style={{ background: '#FFFFFF', borderTop: `2px dashed ${LINE}` }}>
          <div>
            <p className="font-bold text-sm kr-display" style={{ color: INK }}>{ev?.title}</p>
            <p className="kr-mono text-[11px] uppercase tracking-wide" style={{ color: '#8A8577' }}>{ev?.price ? `From ${ev.currency || 'AED'} ${ev.price}` : 'Free'}</p>
          </div>
          <button
            onClick={scrollToForm}
            className="px-6 py-2.5 font-bold rounded-full text-sm hover:brightness-105 active:scale-[0.98] transition-all"
            style={{ background: CORAL, color: PAPER }}
          >
            Register interest →
          </button>
        </div>
      </div>
    );
  }


  // ── Global Mode ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen kr-body" style={{ background: PAPER }}>
      <GlobalStyles />

      {/* ── Hero ── */}
      <div className="relative overflow-hidden pt-28 pb-32 px-4 flex items-center justify-center min-h-[70vh]">
        {/* Dynamic Animated Mesh-like Background */}
        <div className="absolute inset-0 bg-gray-900 overflow-hidden">
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3],
              rotate: [0, 90, 0]
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] rounded-full bg-orange-600/20 blur-[100px]"
          />
          <motion.div
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.2, 0.4, 0.2],
              rotate: [0, -90, 0]
            }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            className="absolute bottom-[0%] -right-[10%] w-[70%] h-[70%] rounded-full bg-teal-600/20 blur-[120px]"
          />
          <div className="absolute inset-0 kr-dotfield opacity-40" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative max-w-4xl mx-auto text-center z-10 p-10 md:p-14 rounded-3xl backdrop-blur-md bg-white/5 border border-white/10 shadow-2xl"
        >
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="inline-flex items-center gap-2 kr-mono text-[11px] uppercase tracking-widest px-5 py-2.5 rounded-full mb-8 shadow-inner"
            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: PAPER }}
          >
            <TicketIcon /> KidRove Lead Pages
          </motion.span>
          <h1 className="text-5xl md:text-7xl font-extrabold kr-display mb-6 leading-[1.1] tracking-tight text-white drop-shadow-md">
            Discover events<br />your kids will <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-pink-500">love</span>
          </h1>
          <p className="text-lg md:text-xl max-w-2xl mx-auto mb-10 text-gray-300 font-light leading-relaxed">
            Hand-picked workshops and competitions designed to help your child grow, learn, and excel.
          </p>
          <div className="flex flex-wrap gap-4 justify-center items-center">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
              <Link to="/search" className="px-8 h-14 font-bold rounded-full transition-all text-base shadow-lg hover:shadow-[0_0_20px_rgba(255,90,60,0.4)] inline-flex items-center justify-center gap-2" style={{ background: CORAL, color: PAPER }}>
                Browse all events <ArrowRight />
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
              <Link to="/vendor/register" className="px-8 h-14 font-bold rounded-full transition-all text-base hover:bg-white/10 inline-flex items-center justify-center gap-2" style={{ border: '1px solid rgba(255,255,255,0.3)', color: PAPER }}>
                List your event
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* ── Why KidRove ── */}
      <div className="relative z-20 -mt-16 px-4 mb-24">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
          className="max-w-6xl mx-auto bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.08)] border border-gray-100 overflow-hidden"
        >
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
            {[
              { stat: `${stats.totalVendors}+`, title: 'Partners since 2017', desc: 'Trusted by over' },
              { stat: `${stats.totalEvents}+`, title: 'Experiences', desc: 'Countless memories' },
              { stat: `${stats.totalVenues}+`, title: 'Venue & Events', desc: 'Across the UAE' },
              { stat: `${stats.totalClasses || stats.totalEvents || 1000}+`, title: 'Classes', desc: 'For every age group' },
            ].map((item, idx) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 + 0.3, duration: 0.5 }}
                className="p-10 text-center transition-colors hover:bg-gray-50/50 group"
              >
                <p className="text-4xl md:text-5xl font-extrabold kr-display mb-3 text-transparent bg-clip-text bg-gradient-to-br from-orange-500 to-pink-500 group-hover:scale-110 transition-transform duration-300">
                  {item.stat}
                </p>
                <p className="font-bold text-lg mb-2 text-gray-900">{item.title}</p>
                <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── Trusted Partners Marquee ── */}
      <div className="py-12 bg-gray-50 overflow-hidden flex flex-col items-center border-y border-gray-100">
        <p className="kr-mono text-[11px] uppercase tracking-widest text-black mb-8 font-bold">Trusted by top organizers across the UAE</p>
        <div className="flex w-[200%] md:w-[150%] lg:w-[100%] max-w-full overflow-hidden relative">
          <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-gray-50 to-transparent z-10" />
          <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-gray-50 to-transparent z-10" />

          <motion.div
            animate={{ x: ["0%", "-50%"] }}
            transition={{ duration: fetchedVendors.length > 0 ? fetchedVendors.length * 3 : 25, repeat: Infinity, ease: "linear" }}
            className="flex items-center justify-around w-[200%] min-w-max"
          >
            {fetchedVendors.length > 0 ? (
              [...Array(2)].map((_, i) => (
                <React.Fragment key={i}>
                  {fetchedVendors.map((v) => (
                    <div key={v.id} className="text-xl font-bold text-black/60 mx-8 kr-display">{v.name}</div>
                  ))}
                </React.Fragment>
              ))
            ) : (
              [...Array(2)].map((_, i) => (
                <React.Fragment key={i}>
                  <div className="text-xl font-bold text-gray-300 mx-8 kr-display">Loading...</div>
                  <div className="text-xl font-bold text-gray-300 mx-8 kr-display">Loading...</div>
                  <div className="text-xl font-bold text-gray-300 mx-8 kr-display">Loading...</div>
                </React.Fragment>
              ))
            )}
          </motion.div>
        </div>
      </div>

      {/* ── How KidRove Works ── */}
      <div className="bg-gray-50 border-b border-gray-100">
        <HowItWorks />
      </div>

      {/* ── Active Lead Page Events (Promoted this week) ── */}
      <div className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="inline-block kr-mono text-[12px] font-bold uppercase tracking-widest px-4 py-2 rounded-full mb-5 bg-teal-50 text-teal-700">
              Featured events
            </span>
            <h2 className="text-3xl md:text-4xl font-bold kr-display mb-4 text-gray-900">Promoted this week</h2>
            <p className="max-w-lg mx-auto text-gray-500 text-lg">Click through to learn more and register your interest</p>
          </motion.div>

          {globalPages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="text-center py-24 rounded-[32px] border-2 border-dashed bg-gray-50/50"
              style={{ borderColor: LINE }}
            >
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 bg-white shadow-sm text-teal-600">
                <TicketIcon />
              </div>
              <p className="kr-mono text-sm font-bold uppercase tracking-widest mb-4 text-gray-400">Nothing promoted right now</p>
              <p className="mb-8 text-gray-600 text-lg">Check back soon, or explore the full catalogue.</p>
              <Link to="/search" className="inline-flex items-center gap-2 px-8 py-4 font-bold rounded-full text-base hover:shadow-lg hover:-translate-y-1 transition-all" style={{ background: CORAL, color: PAPER }}>
                Browse all events <ArrowRight />
              </Link>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {globalPages.map((lp, idx) => (
                <motion.div
                  key={lp._id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ delay: idx * 0.1, duration: 0.5 }}
                >
                  <EventCard lp={lp} />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>



      {/* ── Featured Organizers (Vendors) ── */}
      <div className="py-20 px-4 bg-gray-50 border-t border-gray-100">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
            <div className="max-w-2xl">
              <span className="inline-block kr-mono text-[12px] font-bold uppercase tracking-widest px-4 py-2 rounded-full mb-5 bg-blue-50 text-blue-700">
                Top Organizers
              </span>
              <h2 className="text-3xl md:text-4xl font-bold kr-display mb-4 text-gray-900">Featured Vendors</h2>
              <p className="text-gray-500 text-lg">Discover top-rated organizers creating memorable experiences.</p>
            </div>
            <Link to="/vendors" className="inline-flex items-center gap-2 font-bold text-blue-600 hover:text-blue-700 hover:underline">
              View all vendors <ArrowRight />
            </Link>
          </div>

          {fetchedVendors.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {fetchedVendors.slice(0, 4).map((vendor, idx) => (
                <VendorCard key={vendor.id} vendor={vendor} idx={idx} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">Loading vendors...</div>
          )}
        </div>
      </div>


      {/* ── Wall of Love (Testimonials) ── */}
      <div className="py-24 px-4 bg-white border-t border-gray-100">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block kr-mono text-[12px] font-bold uppercase tracking-widest px-4 py-2 rounded-full mb-5 bg-orange-100 text-orange-600">
              Wall of Love
            </span>
            <h2 className="text-3xl md:text-4xl font-bold kr-display mb-4 text-gray-900">Loved by parents & organizers</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                quote: "KidRove made planning our weekends so easy! The robotics workshop my son attended was incredible. He can't wait for the next one.",
                author: "Sarah M.",
                role: "Parent of 2",
                rating: 5
              },
              {
                quote: "We sold out our art camp in just 3 days after listing it here. The quality of leads and the support team is unmatched in the UAE.",
                author: "Dubai Art Studio",
                role: "Event Organizer",
                rating: 5
              },
              {
                quote: "Finally, a platform that actually verifies the quality of children's events. I feel so safe booking through KidRove.",
                author: "Ahmed R.",
                role: "Parent",
                rating: 5
              }
            ].map((review, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.2 }}
                className="bg-white rounded-3xl p-8 shadow-[0_10px_30px_rgba(0,0,0,0.04)] border border-gray-100 flex flex-col justify-between hover:-translate-y-1 transition-transform"
              >
                <div>
                  <div className="flex gap-1 mb-6 text-orange-400 text-lg">
                    {[...Array(review.rating)].map((_, i) => <span key={i}>★</span>)}
                  </div>
                  <p className="text-gray-600 text-lg leading-relaxed mb-8 italic">"{review.quote}"</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-200 to-pink-200 flex items-center justify-center text-orange-700 font-bold kr-display">
                    {review.author.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{review.author}</p>
                    <p className="text-xs text-gray-500">{review.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Featured Blogs ── */}
      {homepageData?.featuredBlogs && homepageData.featuredBlogs.length > 0 && (
        <div className="bg-white border-t border-gray-100">
          <ScrollReveal>
            <FeaturedBlogsSection blogs={homepageData.featuredBlogs} />
          </ScrollReveal>
        </div>
      )}

      {/* ── General FAQs ── */}
      <div className="bg-gray-50 border-t border-gray-100">
        <ScrollReveal>
          <HomepageFAQs faqItems={homepageData?.seoContent?.faqItems} />
        </ScrollReveal>
      </div>

      {/* ── Global Lead Capture ── */}
      <div className="py-24 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="bg-white rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-gray-100 overflow-hidden flex flex-col lg:flex-row"
          >
            {/* Left side: Image/Graphic */}
            <div className="lg:w-1/2 relative bg-gray-900 p-12 flex flex-col justify-center min-h-[400px] overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-600 to-pink-700 opacity-90 mix-blend-multiply z-10" />
              <div className="absolute inset-0 kr-dotfield opacity-30 z-10" />

              <div className="relative z-20 text-white">
                <p className="kr-mono text-[11px] uppercase tracking-widest mb-4 text-orange-200">Kidrove lead collection</p>
                <h2 className="text-4xl md:text-5xl font-bold kr-display mb-6 leading-tight">We'll tell you what's next.</h2>
                <p className="text-lg text-white/80 max-w-md font-light leading-relaxed">
                  Tell us what your kids are into and our expert curation team will reach out with personalized, premium event recommendations.
                </p>
              </div>
            </div>

            {/* Right side: Form */}
            <div className="lg:w-1/2 p-10 md:p-14">
              <GlobalLeadForm />
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

// ── Global Lead Form ─────────────────────────────────────────────────────────
const GlobalLeadForm: React.FC = () => {
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [contactType, setContactType] = useState<'email' | 'phone'>('phone');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !contact.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }
    setLoading(true);
    try {
      await submitGlobalLead({
        name: name.trim(),
        email: contactType === 'email' ? contact.trim() : undefined,
        phone: contactType === 'phone' ? contact.trim() : undefined,
        message: message.trim() || undefined,
      });
      setSubmitted(true);
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-12 kr-body h-full flex flex-col justify-center"
      >
        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 bg-green-50 text-green-500 shadow-sm">
          <CheckIcon />
        </div>
        <h3 className="text-2xl font-bold kr-display mb-3 text-gray-900">Thanks for reaching out!</h3>
        <p className="text-lg text-gray-500 max-w-sm mx-auto">Our curation team will follow up with the latest events soon.</p>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 kr-body flex flex-col justify-center h-full">
      <h3 className="text-2xl font-bold kr-display text-gray-900 mb-2">Get personalized recommendations</h3>

      <div className="relative">
        <input
          type="text"
          id="global-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder=" "
          required
          className="peer w-full px-4 pt-6 pb-2 bg-gray-50 border-2 border-transparent rounded-xl text-[16px] focus:outline-none focus:bg-white focus:border-orange-500 focus:shadow-[0_0_0_4px_rgba(249,115,22,0.1)] transition-all text-gray-900"
        />
        <label htmlFor="global-name" className="absolute left-4 top-2 text-[11px] font-bold kr-mono uppercase tracking-widest text-gray-400 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:top-4 peer-placeholder-shown:normal-case peer-placeholder-shown:font-normal peer-placeholder-shown:tracking-normal peer-focus:top-2 peer-focus:text-[11px] peer-focus:font-bold peer-focus:uppercase peer-focus:tracking-widest peer-focus:text-orange-500">
          Full Name
        </label>
      </div>

      <div>
        <div className="flex gap-4 kr-mono text-[11px] uppercase mb-3 ml-1">
          <button type="button" onClick={() => setContactType('phone')} className={`transition-colors ${contactType === 'phone' ? 'text-orange-500 font-bold' : 'text-gray-400 font-medium hover:text-gray-600'}`}>Phone</button>
          <span className="text-gray-300">/</span>
          <button type="button" onClick={() => setContactType('email')} className={`transition-colors ${contactType === 'email' ? 'text-orange-500 font-bold' : 'text-gray-400 font-medium hover:text-gray-600'}`}>Email</button>
        </div>
        <div className="relative">
          <input
            type={contactType === 'email' ? 'email' : 'tel'}
            id="global-contact"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder=" "
            required
            className="peer w-full px-4 pt-6 pb-2 bg-gray-50 border-2 border-transparent rounded-xl text-[16px] focus:outline-none focus:bg-white focus:border-orange-500 focus:shadow-[0_0_0_4px_rgba(249,115,22,0.1)] transition-all text-gray-900"
          />
          <label htmlFor="global-contact" className="absolute left-4 top-2 text-[11px] font-bold kr-mono uppercase tracking-widest text-gray-400 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:top-4 peer-placeholder-shown:normal-case peer-placeholder-shown:font-normal peer-placeholder-shown:tracking-normal peer-focus:top-2 peer-focus:text-[11px] peer-focus:font-bold peer-focus:uppercase peer-focus:tracking-widest peer-focus:text-orange-500">
            {contactType === 'email' ? 'Email Address' : 'Phone Number'}
          </label>
        </div>
      </div>

      <div className="relative">
        <textarea
          id="global-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          placeholder=" "
          className="peer w-full px-4 pt-6 pb-2 bg-gray-50 border-2 border-transparent rounded-xl text-[16px] focus:outline-none focus:bg-white focus:border-orange-500 focus:shadow-[0_0_0_4px_rgba(249,115,22,0.1)] transition-all resize-none text-gray-900"
        />
        <label htmlFor="global-message" className="absolute left-4 top-2 text-[11px] font-bold kr-mono uppercase tracking-widest text-gray-400 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:top-4 peer-placeholder-shown:normal-case peer-placeholder-shown:font-normal peer-placeholder-shown:tracking-normal peer-focus:top-2 peer-focus:text-[11px] peer-focus:font-bold peer-focus:uppercase peer-focus:tracking-widest peer-focus:text-orange-500">
          Interests (optional)
        </label>
      </div>

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        type="submit"
        disabled={loading}
        className="w-full py-4 mt-2 font-bold rounded-xl shadow-[0_10px_20px_rgba(249,115,22,0.2)] hover:shadow-[0_15px_30px_rgba(249,115,22,0.3)] disabled:opacity-60 flex items-center justify-center gap-2 text-[16px] bg-gradient-to-r from-orange-500 to-pink-600 text-white"
      >
        {loading ? (
          <><span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />Sending…</>
        ) : (
          'Get Notified'
        )}
      </motion.button>
    </form>
  );
};

export default LeadPage;
