import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  getAllActiveLeadPages,
  getLeadPageByEvent,
  submitLead,
  ILeadPage,
} from '../services/api/leadPageAPI';
import { getEventImageFromEvent } from '../utils/imageFallbacks';
import { galleryAPI } from '../services/api/reviewLinkAPI';
import GalleryComponent from '../components/common/GalleryComponent';

// ─────────────────────────────────────────────────────────────────────────
// DESIGN SYSTEM
// KidRove lead pages are, functionally, a "boarding pass" for a kid's next
// experience — so the visual language borrows from tickets: perforated
// dividers, die-cut notches, mono-spaced meta labels, dashed tear-lines.
// Palette: ink navy + warm paper + one coral accent + one teal accent +
// sunshine for price/rating. No purple/pink gradients, no candy pastels.
//
// Add these once to your global stylesheet / index.html instead of the
// runtime @import below if you'd rather not load fonts at render time:
//   Bricolage Grotesque (display) · Inter (body) · IBM Plex Mono (labels)
// ─────────────────────────────────────────────────────────────────────────

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
      className="group relative flex flex-col rounded-[22px] overflow-hidden border transition-all duration-300 hover:-translate-y-1"
      style={{ borderColor: LINE, background: PAPER, boxShadow: '0 1px 0 rgba(22,26,35,0.04)' }}
    >
      {/* Image */}
      <div className="h-48 w-full relative overflow-hidden" style={{ background: '#F1EDE2' }}>
        {imgSrc ? (
          <div
            className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
            style={{ backgroundImage: `url('${imgSrc}')` }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-3xl">🎟️</div>
        )}
        <span className="absolute top-3 left-3 kr-mono text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full" style={{ background: INK, color: PAPER }}>
          {event?.category?.replace(/&amp;/g, '&') || 'Event'}
        </span>
      </div>

      {/* Perforated tear line at the seam between image and stub */}
      <div className="relative">
        <TicketDivider bg={PAPER} />
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

      <span className="absolute bottom-5 right-5 flex items-center gap-1 kr-mono text-[11px] font-semibold uppercase tracking-wide opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: TEAL }}>
        View <ArrowRight />
      </span>
    </Link>
  );
};

// ── Main Component ───────────────────────────────────────────────────────────
const LeadPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const eventId = searchParams.get('eventId');
  const formRef = useRef<HTMLDivElement>(null);

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
        .then((data) => setGlobalPages(data))
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
                    { title: 'Network &amp; connect', desc: 'Meet like-minded participants and build lasting connections' },
                    { title: 'Certificates &amp; awards', desc: 'Earn recognition for participation and achievement' },
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
      <div className="relative overflow-hidden pt-24 pb-24 px-4" style={{ background: INK }}>
        <div className="absolute inset-0 kr-dotfield" />
        <div className="absolute w-2 h-2 rounded-full kr-drift" style={{ top: '20%', left: '12%', background: SUN }} />
        <div className="absolute w-2 h-2 rounded-full kr-drift" style={{ top: '65%', left: '85%', background: CORAL, animationDelay: '1.5s' }} />
        <div className="absolute w-1.5 h-1.5 rounded-full kr-drift" style={{ top: '40%', left: '75%', background: TEAL, animationDelay: '3s' }} />

        <div className="relative max-w-3xl mx-auto text-center">
          <span className="inline-flex items-center gap-2 kr-mono text-[11px] uppercase tracking-widest px-4 py-2 rounded-full mb-7" style={{ background: 'rgba(252,250,244,0.1)', border: '1px solid rgba(252,250,244,0.2)', color: PAPER }}>
            <TicketIcon /> KidRove lead pages
          </span>
          <h1 className="text-5xl sm:text-6xl font-extrabold kr-display mb-6 leading-[1.03]" style={{ color: PAPER }}>
            Discover events<br />your kids will love
          </h1>
          <p className="text-lg max-w-xl mx-auto mb-10" style={{ color: 'rgba(252,250,244,0.65)' }}>
            Hand-picked workshops and competitions designed to help your child grow, learn, and excel.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link to="/search" className="px-7 py-3.5 font-bold rounded-full hover:brightness-105 active:scale-[0.98] transition-all text-[15px]" style={{ background: CORAL, color: PAPER }}>
              Browse all events
            </Link>
            <Link to="/vendor/register" className="px-7 py-3.5 font-bold rounded-full transition text-[15px]" style={{ border: '1px solid rgba(252,250,244,0.3)', color: PAPER }}>
              List your event
            </Link>
          </div>
        </div>
      </div>

      {/* ── Why KidRove ── */}
      <div className="py-16 px-4" style={{ borderBottom: `1px solid ${LINE}` }}>
        <div className="max-w-5xl mx-auto text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold kr-display mb-2" style={{ color: INK }}>Why families choose KidRove</h2>
          <p style={{ color: '#7A7566' }}>The UAE's platform for children's events and educational programs</p>
        </div>
        <div className="max-w-5xl mx-auto grid sm:grid-cols-2 lg:grid-cols-4 gap-px" style={{ background: LINE }}>
          {[
            { stat: '500+', title: 'Verified events', desc: 'Quality-checked for every age group' },
            { stat: '50K+', title: 'Families', desc: 'Trusted across the UAE since 2022' },
            { stat: '4.8', title: 'Average rating', desc: "Top-rated for children's activities" },
            { stat: '100%', title: 'Vetted organizers', desc: 'Background-checked before listing' },
          ].map((item) => (
            <div key={item.title} className="p-6 text-center" style={{ background: PAPER }}>
              <p className="text-3xl font-extrabold kr-display mb-1" style={{ color: CORAL }}>{item.stat}</p>
              <p className="font-bold text-sm mb-1" style={{ color: INK }}>{item.title}</p>
              <p className="text-xs" style={{ color: '#8A8577' }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Active Lead Page Events ── */}
      <div className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <span className="inline-block kr-mono text-[11px] uppercase tracking-widest px-3 py-1.5 rounded-full mb-4" style={{ background: '#EFEADB', color: TEAL }}>
              Featured events
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold kr-display mb-2" style={{ color: INK }}>Promoted this week</h2>
            <p className="max-w-lg mx-auto" style={{ color: '#7A7566' }}>Click through to learn more and register your interest</p>
          </div>

          {globalPages.length === 0 ? (
            <div className="text-center py-16">
              <p className="kr-mono text-xs uppercase tracking-widest mb-3" style={{ color: '#B7B2A2' }}>Nothing promoted right now</p>
              <p className="mb-6" style={{ color: '#7A7566' }}>Check back soon, or explore the full catalogue.</p>
              <Link to="/search" className="inline-flex items-center gap-2 px-6 py-3 font-bold rounded-full text-sm hover:brightness-105 transition" style={{ background: CORAL, color: PAPER }}>
                Browse all events <ArrowRight />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {globalPages.map((lp) => (
                <EventCard key={lp._id} lp={lp} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Global Lead Capture ── */}
      <div className="py-16 px-4 relative overflow-hidden" style={{ background: INK }}>
        <div className="absolute inset-0 kr-dotfield" />
        <div className="relative max-w-md mx-auto">
          <div className="text-center mb-8">
            <p className="kr-mono text-[11px] uppercase tracking-widest mb-3" style={{ color: SUN }}>Stay in the loop</p>
            <h2 className="text-2xl sm:text-3xl font-bold kr-display" style={{ color: PAPER }}>We'll tell you what's next</h2>
          </div>
          <div className="rounded-[24px] p-7" style={{ background: PAPER }}>
            <GlobalLeadForm />
          </div>
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
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div className="text-center py-6 kr-body">
        <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 kr-stamp" style={{ background: TEAL, color: PAPER }}>
          <CheckIcon />
        </div>
        <h3 className="text-lg font-bold kr-display mb-1.5" style={{ color: INK }}>Thanks for reaching out</h3>
        <p className="text-sm" style={{ color: '#7A7566' }}>Our team will follow up with the latest events soon.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 kr-body">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Full name"
        className="w-full px-1 py-2.5 bg-transparent border-0 border-b-2 text-[15px] focus:outline-none transition-colors placeholder-gray-400"
        style={{ borderColor: LINE, color: INK }}
        onFocus={(e) => (e.currentTarget.style.borderColor = TEAL)}
        onBlur={(e) => (e.currentTarget.style.borderColor = LINE)}
      />
      <div>
        <div className="flex gap-3 kr-mono text-[11px] uppercase mb-2">
          <button type="button" onClick={() => setContactType('phone')} style={{ color: contactType === 'phone' ? TEAL : '#B7B2A2', fontWeight: contactType === 'phone' ? 700 : 500 }}>Phone</button>
          <span style={{ color: LINE }}>/</span>
          <button type="button" onClick={() => setContactType('email')} style={{ color: contactType === 'email' ? TEAL : '#B7B2A2', fontWeight: contactType === 'email' ? 700 : 500 }}>Email</button>
        </div>
        <input
          type={contactType === 'email' ? 'email' : 'tel'}
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder={contactType === 'email' ? 'your@email.com' : '+91 98765 43210'}
          className="w-full px-1 py-2.5 bg-transparent border-0 border-b-2 text-[15px] focus:outline-none transition-colors placeholder-gray-400"
          style={{ borderColor: LINE, color: INK }}
          onFocus={(e) => (e.currentTarget.style.borderColor = TEAL)}
          onBlur={(e) => (e.currentTarget.style.borderColor = LINE)}
        />
      </div>
      <button
        onClick={() => { if (name && contact) setSubmitted(true); else toast.error('Please fill in all fields'); }}
        className="w-full py-4 font-bold rounded-full hover:brightness-105 active:scale-[0.98] transition-all text-[15px]"
        style={{ background: CORAL, color: PAPER }}
      >
        Get notified about events
      </button>
    </div>
  );
};

export default LeadPage;
