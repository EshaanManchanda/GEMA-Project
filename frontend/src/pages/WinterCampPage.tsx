import React, { useState, useEffect } from 'react';
import {
  FaSnowflake,
  FaAward,
  FaChevronDown,
  FaGraduationCap,
  FaCheck,
  FaExternalLinkAlt,
  FaShieldAlt
} from 'react-icons/fa';
import { Users, Rocket, GraduationCap, ShieldCheck, ArrowRight } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { WINTER_CAMP_EVENTS, WINTER_CAMP_FAQS } from '../data/winterCamp';
import winterCampAPI from '../services/api/winterCampAPI';
import collectionsAPI from '../services/api/collectionsAPI';
import SEO from '../components/common/SEO';

interface FetchedEventCard {
  _id: string;
  title: string;
  slug?: string;
  category?: string;
  image: string;
  grades: string;
  duration: string;
  url: string;
  bgColor: string;
}

const WinterCampPage: React.FC = () => {
  const [submitting, setSubmitting] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [events, setEvents] = useState<FetchedEventCard[]>([]);
  const [loadingEvents, setLoadingEvents] = useState<boolean>(true);

  // Category badge color cyclical map
  const getBadgeStyle = (idx: number) => {
    const styles = [
      'bg-sky-50 text-sky-800 border-sky-200',
      'bg-indigo-50 text-indigo-800 border-indigo-200',
      'bg-emerald-50 text-emerald-800 border-emerald-200',
      'bg-purple-50 text-purple-800 border-purple-200',
      'bg-rose-50 text-rose-800 border-rose-200',
      'bg-blue-50 text-blue-800 border-blue-200',
      'bg-cyan-50 text-cyan-800 border-cyan-200'
    ];
    return styles[idx % styles.length];
  };

  // Helper to determine display grades from raw event
  const formatGrades = (ev: any): string => {
    if (Array.isArray(ev.grades) && ev.grades.length > 0) {
      if (ev.grades.length === 1) return ev.grades[0];
      return `${ev.grades[0]} – ${ev.grades[ev.grades.length - 1]}`;
    }
    if (Array.isArray(ev.ageRange) && ev.ageRange.length === 2 && ev.ageRange[0]) {
      return `Ages ${ev.ageRange[0]}–${ev.ageRange[1]}`;
    }
    if (ev.ageGroup) return ev.ageGroup;
    return 'Grades K–12';
  };

  // Helper to determine duration
  const formatDuration = (ev: any): string => {
    if (ev.duration) return String(ev.duration);
    if (Array.isArray(ev.syllabus) && ev.syllabus.length > 0) {
      return `${ev.syllabus.length} Modules`;
    }
    if (ev.dateSchedule && ev.dateSchedule.length > 0) {
      const sch = ev.dateSchedule[0];
      if (sch.startTime && sch.endTime) return `${sch.startTime} - ${sch.endTime}`;
    }
    return '4 Weeks';
  };

  useEffect(() => {
    const fetchWinterCampCollection = async () => {
      try {
        setLoadingEvents(true);
        const res = await collectionsAPI.getCollectionById('winter-camps');
        const collection = res?.collection;
        const fetchedEvents = (collection?.events || []) as any[];

        if (fetchedEvents.length > 0) {
          const mappedCards: FetchedEventCard[] = fetchedEvents.map((ev, index) => {
            const img = Array.isArray(ev.images) && ev.images[0]
              ? ev.images[0]
              : ev.featuredImage || 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=800&q=80';

            const eventSlug = ev.slug || ev._id;
            const fullUrl = `/events/${eventSlug}`;

            return {
              _id: ev._id || `ev-${index}`,
              title: ev.title || 'Winter Workshop',
              slug: ev.slug,
              category: ev.category || 'Winter Workshop',
              image: img,
              grades: formatGrades(ev),
              duration: formatDuration(ev),
              url: fullUrl,
              bgColor: getBadgeStyle(index)
            };
          });

          setEvents(mappedCards);
        } else {
          // If the collection exists but has no events attached yet, fallback to curated events
          setEvents(
            WINTER_CAMP_EVENTS.map((item, idx) => ({
              _id: `fallback-${idx}`,
              title: item.title,
              category: item.category,
              image: item.image,
              grades: item.grades,
              duration: item.duration,
              url: item.url,
              bgColor: item.bgColor
            }))
          );
        }
      } catch (err) {
        console.warn('Could not fetch /collections/winter-camps, falling back to winter workshop list:', err);
        setEvents(
          WINTER_CAMP_EVENTS.map((item, idx) => ({
            _id: `fallback-${idx}`,
            title: item.title,
            category: item.category,
            image: item.image,
            grades: item.grades,
            duration: item.duration,
            url: item.url,
            bgColor: item.bgColor
          }))
        );
      } finally {
        setLoadingEvents(false);
      }
    };

    fetchWinterCampCollection();
  }, []);

  const [form, setForm] = useState({
    studentName: '',
    email: '',
    phone: '',
    grade: '',
    city: '',
    selectedPrograms: [] as string[],
    message: ''
  });

  const handleProgramToggle = (title: string) => {
    setForm(prev => ({
      ...prev,
      selectedPrograms: prev.selectedPrograms.includes(title)
        ? prev.selectedPrograms.filter(t => t !== title)
        : [...prev.selectedPrograms, title]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.studentName || !form.email || !form.grade) {
      toast.error('Please complete all required fields (*)');
      return;
    }

    try {
      setSubmitting(true);
      const res = await winterCampAPI.register({
        studentName: form.studentName,
        email: form.email,
        studentEmail: form.email,
        parentEmail: form.email,
        phone: form.phone,
        parentPhone: form.phone,
        grade: form.grade,
        city: form.city,
        selectedPrograms: form.selectedPrograms,
        message: form.message
      });
      if (res?.data?.success || res?.success) {
        toast.success('❄️ Winter Camp registration submitted successfully! Check your inbox soon.', {
          duration: 5000,
          icon: '🎉'
        });
        setForm({
          studentName: '',
          email: '',
          phone: '',
          grade: '',
          city: '',
          selectedPrograms: [],
          message: ''
        });
      } else {
        toast.error(res?.data?.message || 'Could not submit registration. Please try again.');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to submit registration. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-sky-500 selection:text-white font-sans">
      <SEO
        title="Winter Camp 2026 | KidRove Online Workshops"
        description="Join hands-on winter camp workshops for kids & teens. AI, Coding, Art, Debate, and Cognitive Labs with official Certificate of Participation."
      />

      {/* ── 1. HERO SECTION ── */}
      <section className="relative pt-28 pb-44 sm:pb-52 overflow-hidden text-white flex items-center min-h-[92vh] sm:min-h-[98vh]">
        {/* Background Winter Landscape Artwork */}
        <div
          className="absolute inset-0 bg-cover bg-bottom bg-no-repeat z-0"
          style={{ backgroundImage: "url('/assets/winter.png')" }}
        />

        {/* Dark Grayish-Black Ambient Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/85 via-slate-900/60 to-black/25 z-0 pointer-events-none" />
        <div className="absolute inset-0 bg-radial-gradient from-transparent via-black/20 to-black/60 z-0 pointer-events-none" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          {/* Top Pill Badge */}
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#0a2353]/70 border border-sky-400/35 text-sky-300 text-xs sm:text-sm font-semibold tracking-wider uppercase backdrop-blur-md shadow-[0_0_24px_rgba(56,189,248,0.2)] mb-6">
            <FaSnowflake className="text-sky-300 text-xs" />
            <span>WINTER CAMP 2026 • LEARN • BUILD • DISCOVER</span>
          </div>

          {/* Hero Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.15] text-white max-w-4xl mx-auto drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)]">
            Ignite Your Potential with <br className="hidden sm:inline" />
            <span className="text-cyan-400 drop-shadow-[0_0_25px_rgba(34,211,238,0.45)]">
              Winter Adventure Labs
            </span>
          </h1>

          {/* Subtitle description */}
          <p className="mt-5 text-sm sm:text-base md:text-lg text-slate-200/90 max-w-2xl mx-auto leading-relaxed font-normal drop-shadow-md">
            Immerse in a winter camp that blends fun, learning, and innovation. Explore emerging tech, creative skills, and real-world projects in a collaborative environment designed for curious minds.
          </p>

          {/* 4 Feature Glass Cards */}
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 max-w-4xl mx-auto text-left">
            {/* Card 1: 11+ Age Groups */}
            <div className="bg-[#0b245a]/50 hover:bg-[#0b245a]/65 border border-sky-400/25 backdrop-blur-md rounded-2xl p-3.5 sm:p-4 flex items-center gap-3 transition-all">
              <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-cyan-300 flex-shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-white font-extrabold text-base sm:text-lg leading-tight">11+</div>
                <div className="text-sky-200/80 text-[11px] sm:text-xs font-medium leading-tight truncate">Age Groups</div>
              </div>
            </div>

            {/* Card 2: 100% Hands-on Learning */}
            <div className="bg-[#0b245a]/50 hover:bg-[#0b245a]/65 border border-sky-400/25 backdrop-blur-md rounded-2xl p-3.5 sm:p-4 flex items-center gap-3 transition-all">
              <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-cyan-300 flex-shrink-0">
                <Rocket className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-white font-extrabold text-base sm:text-lg leading-tight">100%</div>
                <div className="text-sky-200/80 text-[11px] sm:text-xs font-medium leading-tight truncate">Hands-on Learning</div>
              </div>
            </div>

            {/* Card 3: Grades K-12 */}
            <div className="bg-[#0b245a]/50 hover:bg-[#0b245a]/65 border border-sky-400/25 backdrop-blur-md rounded-2xl p-3.5 sm:p-4 flex items-center gap-3 transition-all">
              <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-cyan-300 flex-shrink-0">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-white font-extrabold text-base sm:text-lg leading-tight">Grades K–12</div>
                <div className="text-sky-200/80 text-[11px] sm:text-xs font-medium leading-tight truncate">All Learning Levels</div>
              </div>
            </div>

            {/* Card 4: Verified Certificate Included */}
            <div className="bg-[#0b245a]/50 hover:bg-[#0b245a]/65 border border-sky-400/25 backdrop-blur-md rounded-2xl p-3.5 sm:p-4 flex items-center gap-3 transition-all">
              <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-cyan-300 flex-shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-white font-extrabold text-base sm:text-lg leading-tight">Verified</div>
                <div className="text-sky-200/80 text-[11px] sm:text-xs font-medium leading-tight truncate">Certificate Included</div>
              </div>
            </div>
          </div>

          {/* Action CTA Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => document.getElementById('register-form-section')?.scrollIntoView({ behavior: 'smooth' })}
              className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-cyan-400 via-sky-400 to-cyan-400 text-[#041a38] font-extrabold text-sm sm:text-base rounded-2xl shadow-[0_0_25px_rgba(34,211,238,0.55)] hover:shadow-[0_0_35px_rgba(34,211,238,0.8)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2"
            >
              <span>Register Now</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => document.getElementById('featured-events-section')?.scrollIntoView({ behavior: 'smooth' })}
              className="w-full sm:w-auto px-8 py-3.5 bg-[#0e275c]/60 hover:bg-[#0e275c]/80 text-white font-bold text-sm sm:text-base rounded-2xl border border-sky-400/30 backdrop-blur-md shadow-md hover:border-sky-300 transition-all duration-200"
            >
              Explore Winter Workshops
            </button>
          </div>
        </div>
      </section>


      {/* ── 2. STUDENT REGISTRATION FORM ── */}
      <section id="register-form-section" className="py-20 bg-slate-50 relative overflow-hidden">
        {/* Subtle ice background glow */}
        <div className="absolute -top-20 right-10 w-96 h-96 bg-sky-200/40 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-96 h-96 bg-cyan-100/50 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-10">
            <span className="text-xs font-bold tracking-widest uppercase text-sky-700 bg-sky-100/80 px-3.5 py-1.5 rounded-full border border-sky-200 shadow-sm">
              Early Access Enrollment
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight mt-4 mb-3">
              Register Interest for Winter Camp
            </h2>
            <p className="text-slate-600 text-base sm:text-lg max-w-xl mx-auto">
              Fill in your details below to reserve your cohort spot.
            </p>
          </div>

          <div className="bg-white border-2 border-sky-100 rounded-[2.5rem] shadow-xl p-6 sm:p-10 relative">
            <div className="absolute -top-3 right-8 bg-gradient-to-r from-sky-500 to-cyan-500 text-white font-black text-[11px] uppercase tracking-wider px-3.5 py-1 rounded-full shadow-md">
              Winter 2026 Batch
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Student Name */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Student Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.studentName}
                  onChange={e => setForm({ ...form, studentName: e.target.value })}
                  placeholder="e.g. Liam Smith"
                  className="w-full px-4 py-3.5 border border-slate-200 bg-white rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all font-medium"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="name@example.com"
                  className="w-full px-4 py-3.5 border border-slate-200 bg-white rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all font-medium"
                />
              </div>

              {/* Contact Number & Grade */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    Contact Number (Optional)
                  </label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    placeholder="+971 50 123 4567"
                    className="w-full px-4 py-3.5 border border-slate-200 bg-white rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    Grade / Year Group <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={form.grade}
                    onChange={e => setForm({ ...form, grade: e.target.value })}
                    className="w-full px-4 py-3.5 border border-slate-200 bg-white rounded-xl text-slate-800 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all font-medium"
                  >
                    <option value="">Select Grade</option>
                    {['Kindergarten', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'].map((g, i) => (
                      <option key={i} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Select Programs from the Featured Workshops */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Select course(s) of your Interest
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto p-2 bg-slate-50/80 rounded-xl border border-slate-200">
                  {(events.length > 0 ? events : WINTER_CAMP_EVENTS).map((ev, i) => {
                    const isSelected = form.selectedPrograms.includes(ev.title);
                    return (
                      <button
                        type="button"
                        key={i}
                        onClick={() => handleProgramToggle(ev.title)}
                        className={`p-3 rounded-lg text-left text-xs font-bold border transition-all flex items-start gap-2 ${isSelected
                          ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-sky-300'
                          }`}
                      >
                        <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-white text-sky-600 border-white' : 'border-slate-300'
                          }`}>
                          {isSelected && <FaCheck className="text-[10px]" />}
                        </div>
                        <span className="leading-snug">{ev.title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* City (Optional) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  City (Optional)
                </label>
                <input
                  type="text"
                  value={form.city}
                  onChange={e => setForm({ ...form, city: e.target.value })}
                  placeholder="e.g. Dubai, Abu Dhabi, Sharjah..."
                  className="w-full px-4 py-3.5 border border-slate-200 bg-white rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all font-medium"
                />
              </div>

              {/* Message / Goals */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Any Questions? (Optional)
                </label>
                <textarea
                  rows={2}
                  value={form.message}
                  onChange={e => setForm({ ...form, message: e.target.value })}
                  placeholder="Tell us what you or your child would like to achieve during this winter camp..."
                  className="w-full px-4 py-3 border border-slate-200 bg-white rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all resize-none text-sm font-medium"
                />
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 bg-gradient-to-r from-slate-950 via-slate-900 to-sky-900 hover:from-slate-900 hover:to-sky-800 text-white font-extrabold text-base rounded-xl shadow-lg shadow-sky-900/20 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all transform active:scale-[0.99]"
              >
                {submitting ? (
                  <span>Submitting Registration...</span>
                ) : (
                  <>
                    <span>Submit Winter Camp Registration</span>
                    <FaSnowflake className="text-sky-300" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </section>


      {/* ── 3. FEATURED EVENTS SECTION (EXACT SAME DESIGN AS COMING JULY '26) ── */}
      <section id="featured-events-section" className="py-24 bg-white relative overflow-hidden">
        {/* Glow ambient */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-sky-100 rounded-full filter blur-[120px] opacity-40 pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-cyan-50 rounded-full filter blur-[120px] opacity-40 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <span className="text-xs font-bold tracking-widest uppercase text-sky-700 bg-sky-50 px-3.5 py-1.5 rounded-full border border-sky-100 shadow-sm">
              Featured Winter Events
            </span>
            <h2 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight mt-4 mb-3">
              WINTER CAMP 2026 WORKSHOPS
            </h2>
            <p className="text-slate-500 text-lg max-w-2xl mx-auto">
              Explore 11 world-class interactive masterclasses designed for kids and teens. Click any workshop to view event details or register above!
            </p>
          </div>

          {/* Grid of Cards (Exact Match to Coming July '26) */}
          {loadingEvents ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="bg-slate-50 rounded-3xl h-[390px] border border-slate-100 animate-pulse p-6 flex flex-col justify-between">
                  <div className="bg-slate-200 rounded-2xl h-48 w-full" />
                  <div className="space-y-3">
                    <div className="bg-slate-200 rounded-md h-4 w-24" />
                    <div className="bg-slate-200 rounded-md h-6 w-3/4" />
                    <div className="border-t border-slate-200 pt-4 flex items-center">
                      <div className="bg-slate-200 rounded-md h-3 w-28" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {events.map((card, i) => (
                <div
                  key={card._id || i}
                  onClick={() => {
                    if (card.url.startsWith('http')) {
                      window.open(card.url, '_blank');
                    } else {
                      window.location.href = card.url;
                    }
                  }}
                  className="group relative bg-white rounded-3xl overflow-hidden shadow-soft hover:shadow-medium border border-slate-100/80 cursor-pointer transform hover:-translate-y-1.5 transition-all duration-300 flex flex-col h-[390px]"
                >
                  {/* Card Image Area */}
                  <div className="h-56 w-full relative overflow-hidden bg-slate-900 flex items-center justify-center p-4">
                    <div
                      className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                      style={{ backgroundImage: `url('${card.image}')` }}
                    />

                    {/* Visual cover gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-6">
                      <div className="px-4 py-2 rounded-xl bg-sky-500/80 backdrop-blur-md text-white text-xs font-bold border border-white/25 shadow-sm transform translate-y-2 group-hover:translate-y-0 transition-all duration-350 flex items-center gap-1.5">
                        <span>View Event Page</span>
                        <FaExternalLinkAlt className="text-[10px]" />
                      </div>
                    </div>
                  </div>

                  {/* Card Info Area */}
                  <div className="p-6 flex-grow flex flex-col justify-between">
                    <div>
                      {/* Category Pill Tag */}
                      <span className={`text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-md border ${card.bgColor}`}>
                        {card.category}
                      </span>

                      {/* Title */}
                      <h3 className="font-extrabold text-slate-800 text-lg mt-3 group-hover:text-sky-600 transition-colors leading-snug line-clamp-2">
                        {card.title}
                      </h3>
                    </div>

                    {/* Card Meta Row */}
                    <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-2">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
                        <span>1st Dec to 31st Jan</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>


      {/* ── 4. CERTIFICATE OF PARTICIPATION SHOWCASE ── */}
      <section className="py-24 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white relative overflow-hidden">
        {/* Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-sky-500/10 rounded-full blur-[150px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div>
              <span className="text-xs font-bold tracking-widest uppercase text-sky-300 bg-sky-950/80 border border-sky-400/40 px-3.5 py-1.5 rounded-full">
                Accreditation & Recognition
              </span>

              <h2 className="text-3xl sm:text-5xl font-black tracking-tight mt-6 mb-6 leading-tight">
                Official <span className="bg-gradient-to-r from-sky-300 to-cyan-400 bg-clip-text text-transparent">Certificate of Participation</span> Included
              </h2>

              <p className="text-slate-300 text-base sm:text-lg leading-relaxed mb-8">
                Every registered student who attends their Winter Camp sessions and completes project work earns an official KidRove Certificate of Participation.
              </p>

              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-400 flex-shrink-0 mt-1">
                    <FaAward className="text-xl" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-base">Verifiable Digital Credential</h4>
                    <p className="text-slate-400 text-sm mt-0.5">
                      Features a scannable QR verification link to confirm student completion and skills acquired.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-400 flex-shrink-0 mt-1">
                    <FaGraduationCap className="text-xl" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-base">Academic Portfolio Builder</h4>
                    <p className="text-slate-400 text-sm mt-0.5">
                      Showcase achievements on high school applications, university admissions, and student CVs.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400 flex-shrink-0 mt-1">
                    <FaShieldAlt className="text-xl" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-base">Mentor & Institution Signed</h4>
                    <p className="text-slate-400 text-sm mt-0.5">
                      Authenticated and signed by certified lead workshop educators and KidRove leadership.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Mock Certificate Display */}
            <div className="relative">
              <div className="relative bg-white text-slate-900 rounded-3xl p-8 sm:p-10 shadow-2xl border-4 border-sky-200/40 transform lg:rotate-1 hover:rotate-0 transition-transform duration-500">
                {/* Border ornament */}
                <div className="border-2 border-dashed border-sky-400/60 p-6 sm:p-8 rounded-2xl text-center relative">
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-2">
                      <FaSnowflake className="text-sky-500 text-2xl" />
                      <span className="font-black text-xs tracking-widest uppercase text-sky-800">KidRove Winter Camp</span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 tracking-wider">CERTIFICATE NO: WTR-2026-8942</span>
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-serif uppercase">
                    Certificate of Participation
                  </h3>
                  <p className="text-xs text-slate-500 tracking-wider uppercase mt-1">This certificate is proudly awarded to</p>

                  <div className="my-6">
                    <span className="text-2xl sm:text-3xl font-extrabold text-sky-950 border-b-2 border-sky-300 pb-1 px-4 inline-block">
                      Liam Smith
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-650 max-w-md mx-auto leading-relaxed">
                    for actively participating and successfully completing the intensive curriculum of the
                    <strong> KidRove Winter Learning Program 2026</strong>.
                  </p>

                  <div className="mt-8 pt-6 border-t border-slate-200 flex items-center justify-between text-left">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Date Issued</p>
                      <p className="text-xs font-bold text-slate-800">Winter 2026</p>
                    </div>
                    <div className="w-12 h-12 rounded-lg bg-sky-100 border border-sky-300 flex items-center justify-center">
                      <FaAward className="text-sky-600 text-2xl" />
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Verified</p>
                      <p className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                        <FaCheck className="text-[10px]" /> Authenticated
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* ── 5. FAQ SECTION ── */}
      <section className="py-24 bg-slate-50 relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="text-center mb-16">
            <span className="text-xs font-bold tracking-widest uppercase text-sky-700 bg-sky-100/80 px-3.5 py-1.5 rounded-full border border-sky-200 shadow-sm">
              Got Questions?
            </span>
            <h2 className="text-4xl sm:text-5xl font-black text-slate-900 mt-4 mb-4 tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-slate-600 text-lg max-w-xl mx-auto">
              Everything you need to know about our Winter Camp cohorts and registration.
            </p>
          </div>

          <div className="space-y-4">
            {WINTER_CAMP_FAQS.map((faq, i) => {
              const isOpen = openFaqIndex === i;
              return (
                <div
                  key={i}
                  className={`rounded-2xl border transition-all duration-300 overflow-hidden bg-white ${isOpen
                    ? 'border-sky-300 bg-sky-50/20 shadow-md'
                    : 'border-slate-200 hover:border-sky-200 hover:shadow-sm'
                    }`}
                >
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : i)}
                    className="w-full text-left p-6 flex items-center justify-between gap-4 focus:outline-none"
                  >
                    <h3 className={`font-extrabold text-base sm:text-lg pr-4 transition-colors ${isOpen ? 'text-sky-950' : 'text-slate-800 hover:text-sky-700'
                      }`}>
                      {faq.question}
                    </h3>
                    <FaChevronDown
                      className={`text-sm text-slate-400 transition-transform duration-300 flex-shrink-0 ${isOpen ? 'rotate-180 text-sky-600' : ''
                        }`}
                    />
                  </button>

                  <div
                    className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-52 opacity-100' : 'max-h-0 opacity-0'
                      }`}
                  >
                    <p className="text-slate-600 text-sm sm:text-base leading-relaxed px-6 pb-6 pr-10">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
};

export default WinterCampPage;

