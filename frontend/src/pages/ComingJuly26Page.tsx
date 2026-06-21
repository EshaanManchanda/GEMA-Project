import React, { useState } from 'react';
import { FaChevronDown, FaHeart, FaTimes } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import { BENEFITS, FAQS, WORKSHOPS_DATA } from '../data/comingJuly';


// Reused Benefits Section
const BenefitsSection: React.FC = () => (
  <section className="py-24 bg-gradient-to-br from-indigo-50/40 via-white to-pink-50/30 relative overflow-hidden">
    <div className="absolute top-1/2 left-0 w-80 h-80 bg-pink-100 rounded-full filter blur-[100px] opacity-25 pointer-events-none" />
    <div className="absolute top-1/4 right-0 w-80 h-80 bg-indigo-100 rounded-full filter blur-[100px] opacity-25 pointer-events-none" />

    <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
      <div className="text-center mb-20">
        <span className="text-xs font-bold tracking-widest uppercase text-indigo-650 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
          Why Kidrove
        </span>
        <h2 className="text-4xl sm:text-5xl font-black text-slate-900 mt-4 mb-4 tracking-tight">
          What You Gain
        </h2>
        <p className="text-slate-550 text-lg max-w-xl mx-auto">
          Real benefits designed to prepare you for the next steps in your academic and professional journey.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {BENEFITS.map((benefit, i) => (
          <div
            key={i}
            className={`group p-8 bg-white/80 backdrop-blur-md rounded-3xl border border-slate-100 hover:border-slate-200/50 hover:shadow-medium transition-all duration-300 flex flex-col items-start text-left transform hover:-translate-y-1 ${benefit.glowClass}`}
          >
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-105 shadow-sm ${benefit.iconBgClass}`}>
              {benefit.icon}
            </div>
            <h3 className="text-lg font-extrabold text-slate-800 mb-3 group-hover:text-indigo-650 transition-colors leading-snug">
              {benefit.title}
            </h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              {benefit.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

// Reused FAQs Section
const FAQsSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="py-24 bg-slate-50/50 relative overflow-hidden">
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-purple-100 rounded-full filter blur-[100px] opacity-20 pointer-events-none" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="text-center mb-16">
          <span className="text-xs font-bold tracking-widest uppercase text-indigo-650 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
            FAQ
          </span>
          <h2 className="text-4xl sm:text-5xl font-black text-slate-900 mt-4 mb-4 tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-slate-500 text-lg max-w-xl mx-auto">
            Everything you need to know about our upcoming summer workshops.
          </p>
        </div>

        <div className="space-y-4">
          {FAQS.map((faq, i) => {
            const isOpen = openIndex === i;
            return (
              <div
                key={i}
                className={`group rounded-3xl border transition-all duration-300 overflow-hidden bg-white ${isOpen
                    ? 'border-indigo-150 bg-indigo-50/10 shadow-soft'
                    : 'border-slate-100 hover:border-slate-200/50 hover:shadow-soft'
                  }`}
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="w-full text-left p-6 flex items-center justify-between gap-4 focus:outline-none"
                >
                  <h3 className={`font-extrabold text-lg pr-4 transition-colors duration-250 ${isOpen ? 'text-indigo-950' : 'text-slate-850 group-hover:text-indigo-650'
                    }`}>
                    {faq.question}
                  </h3>
                  <FaChevronDown
                    className={`flex-shrink-0 text-slate-400 transition-all duration-300 ${isOpen ? 'rotate-180 text-indigo-600' : 'group-hover:text-indigo-500'
                      }`}
                  />
                </button>

                <div
                  className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
                    }`}
                >
                  <p className="text-slate-500 text-base leading-relaxed px-6 pb-6 pr-10">
                    {faq.answer}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

// Custom Hero Section
const HeroSection: React.FC = () => (
  <section className="pt-32 pb-20 bg-gradient-to-br from-indigo-50/80 via-purple-50/50 to-pink-50/30 min-h-[90vh] flex items-center relative overflow-hidden">
    {/* Pulsing decorative background blobs */}
    <div className="absolute top-1/4 left-[5%] w-72 h-72 bg-indigo-300 rounded-full filter blur-[80px] opacity-35 mix-blend-multiply animate-pulse-soft pointer-events-none" />
    <div className="absolute top-1/3 right-[10%] w-80 h-80 bg-pink-300 rounded-full filter blur-[100px] opacity-30 mix-blend-multiply animate-pulse-soft pointer-events-none" style={{ animationDelay: '1s' }} />
    <div className="absolute bottom-10 left-[25%] w-64 h-64 bg-amber-200 rounded-full filter blur-[80px] opacity-30 mix-blend-multiply animate-pulse-soft pointer-events-none" style={{ animationDelay: '2s' }} />

    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        {/* Left Content */}
        <div className="text-left">
          {/* Breadcrumbs removed */}

          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/70 backdrop-blur-md border border-indigo-100/85 text-indigo-600 text-xs font-bold rounded-full mb-6 tracking-wider uppercase shadow-soft">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            Workshops - July '26 Cohort
          </div>

          <h1 className="text-5xl sm:text-6xl font-extrabold text-slate-900 mb-8 leading-[1.1] tracking-tight">
            Online Workshops for <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">Kids & Teens</span>
          </h1>

          <ul className="space-y-4 mb-8">
            <li className="flex items-center gap-4 text-lg text-slate-700">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-pink-100/80 flex items-center justify-center shadow-soft">
                <span className="text-lg">🤩</span>
              </div>
              <span className="font-medium">Fun summer learning adventures</span>
            </li>
            <li className="flex items-center gap-4 text-lg text-slate-700">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-indigo-100/80 flex items-center justify-center shadow-soft">
                <span className="text-lg">🗓️</span>
              </div>
              <span className="font-medium">Short classes, <span className="font-bold text-indigo-950">lasting impact</span></span>
            </li>
            <li className="flex items-center gap-4 text-lg text-slate-700">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-purple-100/80 flex items-center justify-center shadow-soft">
                <span className="text-lg">🎓</span>
              </div>
              <span className="font-medium"><span className="font-bold text-purple-950">Vetted educators</span> in every field</span>
            </li>
          </ul>

          {/* Ratings removed */}

          <button
            onClick={() => document.getElementById('coming-july-section')?.scrollIntoView({ behavior: 'smooth' })}
            className="group px-8 py-4 bg-indigo-600 text-white font-bold text-lg rounded-full hover:bg-indigo-700 hover:shadow-indigo-500/25 transition-all shadow-lg transform hover:-translate-y-0.5 active:translate-y-0 duration-150 flex items-center gap-2"
          >
            <span>Get Started</span>
            <FaChevronDown className="text-sm transition-transform duration-200 group-hover:translate-y-0.5" />
          </button>
        </div>

        {/* Right Graphic */}
        <div className="relative h-[500px] w-full flex justify-center items-center">
          {/* Decorative rings and soft spheres */}
          <div className="absolute w-[420px] h-[420px] rounded-full border border-indigo-200/40 pointer-events-none" style={{ animation: 'spin 35s linear infinite' }} />
          <div className="absolute w-[360px] h-[360px] rounded-full border border-purple-200/30 pointer-events-none" style={{ animation: 'spin 25s linear infinite', animationDirection: 'reverse' }} />

          {/* Abstract blobs */}
          <div className="absolute -top-4 -right-4 w-28 h-28 bg-yellow-300 rounded-full blur-2xl opacity-40 animate-pulse-soft z-0" />
          <div className="absolute -bottom-8 -left-4 w-32 h-32 bg-purple-400 rounded-full blur-2xl opacity-30 animate-pulse-soft z-0" />

          {/* Main Image Container */}
          <div className="relative z-10 w-[80%] h-[80%] rounded-[2.5rem] overflow-hidden shadow-large border-[6px] border-white bg-slate-50 transform rotate-1 hover:rotate-0 transition-transform duration-500">
            <img
              src="/assets/images/comingjuly26/a.jpeg"
              alt="Workshops for kids and teens"
              className="w-full h-full object-cover select-none"
            />
            {/* Soft inner glow gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/20 via-transparent to-transparent pointer-events-none" />
          </div>

          {/* Floating Card 1: Live Interactive (Top Left) */}
          <div className="absolute top-10 left-4 z-20 bg-white/80 backdrop-blur-md border border-white/60 px-4 py-3 rounded-2xl shadow-medium flex items-center gap-3 animate-float pointer-events-none">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <div className="text-left">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 leading-none">Status</p>
              <p className="text-xs font-bold text-slate-800 mt-1">Live Workshops</p>
            </div>
          </div>

          {/* Floating Card 2: Audience (Bottom Right) */}
          <div className="absolute bottom-6 right-6 z-20 bg-white/80 backdrop-blur-md border border-white/60 px-4 py-3 rounded-2xl shadow-medium flex items-center gap-3 animate-float pointer-events-none" style={{ animationDelay: '1.5s' }}>
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-650 font-bold text-sm">
              6+
            </div>
            <div className="text-left">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 leading-none">Audience</p>
              <p className="text-xs font-bold text-slate-800 mt-1">Grades 6 to 12</p>
            </div>
          </div>

          {/* Floating Heart Icon */}
          <div className="absolute -bottom-4 left-16 z-20 w-16 h-16 bg-pink-500 rounded-2xl flex items-center justify-center shadow-large border-[4px] border-white animate-bounce-gentle hover:rotate-12 transition-transform">
            <FaHeart className="text-white text-2xl" />
          </div>

          {/* Decorative squiggles */}
          <svg className="absolute -top-10 left-10 w-24 h-24 text-yellow-450/80 z-0 animate-pulse-soft animate-bounce-gentle" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round">
            <path d="M 20 80 Q 40 20 60 80 T 100 50" />
          </svg>
        </div>
      </div>
    </div>

    {/* Bottom wave separator */}
    <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-[0]">
      <svg className="relative block w-[calc(100%+1.3px)] h-[60px]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
        <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V120H0V95.8C59.71,118,152.41,115.1,219.65,92.83,256.58,80.5,289.47,68.4,321.39,56.44Z" className="fill-white"></path>
      </svg>
    </div>
  </section>
);



// Coming July Grid Section
const ComingJulySection: React.FC = () => {
  const handleCardClick = (title: string) => {
    toast.success(`${title} registration opens July 2026!`, {
      icon: '🚀',
      style: {
        marginTop: '70px',
        fontSize: '1.1rem',
        padding: '16px 24px',
        borderRadius: '16px',
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(79, 70, 229, 0.15)',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)',
      }
    });
  };

  return (
    <section id="coming-july-section" className="py-24 bg-slate-50/40 relative overflow-hidden">
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-100 rounded-full filter blur-[120px] opacity-20 pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-indigo-100 rounded-full filter blur-[120px] opacity-20 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <span className="text-xs font-bold tracking-widest uppercase text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
            Coming Soon
          </span>
          <h2 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight mt-4 mb-3">
            COMING JULY '26
          </h2>
          <p className="text-slate-500 text-lg max-w-xl mx-auto">
            Discover a preview of our premium cohorts starting soon. Click any course to register your interest!
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {WORKSHOPS_DATA.map((card, i) => (
            <div
              key={i}
              onClick={() => handleCardClick(card.title)}
              className="group relative bg-white rounded-3xl overflow-hidden shadow-soft hover:shadow-medium border border-slate-100/80 cursor-pointer transform hover:-translate-y-1.5 transition-all duration-300 flex flex-col h-[380px]"
            >
              {/* Card Image Area */}
              <div className="h-56 w-full relative overflow-hidden bg-slate-50 flex items-center justify-center p-4">
                {/* Background image styled and scaled */}
                <div
                  className="absolute inset-0 bg-contain bg-no-repeat bg-center transition-transform duration-500 group-hover:scale-105"
                  style={{ backgroundImage: `url('${card.image}')` }}
                />

                {/* Visual cover gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-6">
                  <div className="px-4 py-2 rounded-xl bg-white/20 backdrop-blur-md text-white text-xs font-bold border border-white/25 shadow-sm transform translate-y-2 group-hover:translate-y-0 transition-all duration-350">
                    Get Waitlisted
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
                  <h3 className="font-extrabold text-slate-800 text-lg mt-3 group-hover:text-indigo-650 transition-colors leading-snug">
                    {card.title}
                  </h3>
                </div>

                {/* Card Meta Row */}
                <div className="flex items-center justify-between border-t border-slate-50 pt-4 mt-2">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                    <span>{card.grades}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium bg-slate-150 px-2.5 py-1 rounded-full">
                    <span>{card.duration}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const ComingJuly26Page: React.FC = () => {
  const [activeModal, setActiveModal] = useState<'student' | 'school' | 'talk' | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [studentForm, setStudentForm] = useState({
    name: '',
    email: '',
    parentEmail: '',
    grade: '',
    interests: [] as string[],
    program: '',
    message: ''
  });

  const [talkForm, setTalkForm] = useState({
    name: '',
    role: 'Parent',
    email: '',
    message: ''
  });

  const handleStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      toast.success('🚀 Registration submitted successfully! Check your inbox for program details.');
      setStudentForm({ name: '', email: '', parentEmail: '', grade: '', interests: [], program: '', message: '' });
      setActiveModal(null);
      setSubmitting(false);
    }, 1200);
  };

  const handleTalkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      toast.success('💬 Message received! We will contact you shortly.');
      setTalkForm({ name: '', role: 'Parent', email: '', message: '' });
      setActiveModal(null);
      setSubmitting(false);
    }, 1200);
  };

  const toggleInterest = (interest: string) => {
    setStudentForm(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  };

  const openStudentModal = (programName?: string) => {
    setStudentForm(prev => ({ ...prev, program: programName || '' }));
    setActiveModal('student');
  };

  return (
    <div className="min-h-screen bg-white">
      <HeroSection />
      <ComingJulySection />
      <BenefitsSection />
      <FAQsSection />

      {/* ── FINAL CTA ── */}
      <section id="cta-section" className="py-24 relative overflow-hidden bg-gradient-to-br from-indigo-50/80 via-purple-50/50 to-pink-50/30 rounded-[2.5rem] mx-4 sm:mx-8 md:mx-12 my-12 border border-indigo-100/50 shadow-soft">
        {/* Pulsing decorative background blobs */}
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-indigo-200/50 rounded-full filter blur-[80px] opacity-35 mix-blend-multiply animate-pulse-soft pointer-events-none" />
        <div className="absolute bottom-10 right-1/4 w-64 h-64 bg-pink-200/55 rounded-full filter blur-[80px] opacity-30 mix-blend-multiply animate-pulse-soft pointer-events-none" style={{ animationDelay: '1.5s' }} />

        <div className="relative max-w-4xl mx-auto px-6 text-center z-10">
          <span className="text-xs font-bold tracking-widest uppercase text-indigo-650 bg-indigo-100/60 px-4 py-1.5 rounded-full border border-indigo-200/60 shadow-sm">
            July 2026 Cohorts
          </span>

          <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900 mt-6 mb-6 leading-tight">
            Ready to Start Your Summer Adventure?
          </h2>
          <p className="text-lg md:text-xl text-slate-650 max-w-2xl mx-auto mb-10 leading-relaxed font-semibold">
            Join ambitious kids and teens from across the region. Lock in early registration and unlock your potential.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={() => openStudentModal()}
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-bold rounded-2xl shadow-lg shadow-indigo-500/20 hover:scale-[1.03] active:scale-[0.98] transition-all duration-200"
            >
              Register Interest Now
            </button>
            <button
              onClick={() => setActiveModal('talk')}
              className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-950 font-bold rounded-2xl border border-slate-200 hover:border-indigo-200 transition-all duration-200 flex items-center justify-center gap-2 shadow-sm"
            >
              Talk to Us
            </button>
          </div>
        </div>
      </section>

      {/* ── INTERACTIVE FORMS MODAL ── */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setActiveModal(null)}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-all duration-300"
          />

          <div className="relative w-full max-w-xl bg-white border border-slate-150 rounded-[2rem] overflow-hidden shadow-large z-10 max-h-[90vh] flex flex-col text-slate-800 transform scale-100 transition-all duration-300 animate-fade-in-up">

            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 backdrop-blur-md">
              <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                {activeModal === 'student' && <span>🚀 Student Registration</span>}
                {activeModal === 'talk' && <span>💬 Inquiry Form</span>}
              </h3>
              <button
                onClick={() => setActiveModal(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition duration-150"
              >
                <FaTimes />
              </button>
            </div>

            <div className="p-8 overflow-y-auto space-y-6 flex-1">

              {activeModal === 'student' && (
                <form onSubmit={handleStudentSubmit} className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Student Full Name *</label>
                    <input
                      type="text"
                      required
                      value={studentForm.name}
                      onChange={e => setStudentForm({ ...studentForm, name: e.target.value })}
                      placeholder="e.g. Liam Smith"
                      className="w-full px-4 py-3.5 border border-slate-200/80 bg-white rounded-xl text-slate-900 placeholder-slate-405 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Email Address *</label>
                      <input
                        type="email"
                        required
                        value={studentForm.email}
                        onChange={e => setStudentForm({ ...studentForm, email: e.target.value })}
                        placeholder="you@example.com"
                        className="w-full px-4 py-3.5 border border-slate-200/80 bg-white rounded-xl text-slate-900 placeholder-slate-405 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Parent Email Address *</label>
                      <input
                        type="email"
                        required
                        value={studentForm.parentEmail}
                        onChange={e => setStudentForm({ ...studentForm, parentEmail: e.target.value })}
                        placeholder="parent@example.com"
                        className="w-full px-4 py-3.5 border border-slate-200/80 bg-white rounded-xl text-slate-900 placeholder-slate-405 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Grade / Year Group *</label>
                      <select
                        required
                        value={studentForm.grade}
                        onChange={e => setStudentForm({ ...studentForm, grade: e.target.value })}
                        className="w-full px-4 py-3.5 border border-slate-200/80 bg-white rounded-xl text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                      >
                        <option value="">Select Grade</option>
                        {['Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'].map((g, idx) => (
                          <option key={idx} value={g}>{g}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Interested Program *</label>
                      <select
                        required
                        value={studentForm.program}
                        onChange={e => setStudentForm({ ...studentForm, program: e.target.value })}
                        className="w-full px-4 py-3.5 border border-slate-200/80 bg-white rounded-xl text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                      >
                        <option value="">General Opportunities</option>
                        {['Future Innovators Challenge', 'Global Communication Contest', 'Startup Challenge', 'Sustainability Innovation Challenge', 'Future Leaders Program', 'University Readiness Workshop'].map((opp, idx) => (
                          <option key={idx} value={opp}>{opp}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">Interests / Focus Areas</label>
                    <div className="flex flex-wrap gap-2">
                      {['AI & Tech', 'Public Speaking', 'Entrepreneurship', 'Sustainability', 'Creative Arts'].map((interest, idx) => {
                        const isSelected = studentForm.interests.includes(interest);
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => toggleInterest(interest)}
                            className={`px-4 py-2 rounded-full border text-xs font-bold transition-all duration-150 ${isSelected
                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-soft shadow-indigo-500/20'
                                : 'border-slate-200 bg-white text-slate-650 hover:border-indigo-200 hover:bg-indigo-50/10'
                              }`}
                          >
                            {interest}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Tell us about your goals</label>
                    <textarea
                      rows={3}
                      value={studentForm.message}
                      onChange={e => setStudentForm({ ...studentForm, message: e.target.value })}
                      placeholder="What do you hope to achieve with KidRove?"
                      className="w-full px-4 py-3.5 border border-slate-200/80 bg-white rounded-xl text-slate-900 placeholder-slate-405 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-4 bg-gradient-to-r from-indigo-650 to-violet-600 hover:from-indigo-600 hover:to-violet-500 text-white font-bold rounded-xl shadow-lg disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 transform active:scale-[0.99] transition-all"
                  >
                    {submitting ? 'Submitting...' : 'Submit Student Registration'}
                  </button>
                </form>
              )}

              {activeModal === 'talk' && (
                <form onSubmit={handleTalkSubmit} className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Your Name *</label>
                    <input
                      type="text"
                      required
                      value={talkForm.name}
                      onChange={e => setTalkForm({ ...talkForm, name: e.target.value })}
                      placeholder="e.g. Jessica Miller"
                      className="w-full px-4 py-3.5 border border-slate-200/80 bg-white rounded-xl text-slate-900 placeholder-slate-405 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Your Role *</label>
                      <select
                        value={talkForm.role}
                        onChange={e => setTalkForm({ ...talkForm, role: e.target.value })}
                        className="w-full px-4 py-3.5 border border-slate-200/80 bg-white rounded-xl text-slate-750 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                      >
                        {['Parent', 'Student', 'Educator', 'Mentor', 'Other'].map((role, idx) => (
                          <option key={idx} value={role}>{role}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Email Address *</label>
                      <input
                        type="email"
                        required
                        value={talkForm.email}
                        onChange={e => setTalkForm({ ...talkForm, email: e.target.value })}
                        placeholder="you@example.com"
                        className="w-full px-4 py-3.5 border border-slate-200/80 bg-white rounded-xl text-slate-900 placeholder-slate-405 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Your Message *</label>
                    <textarea
                      required
                      rows={4}
                      value={talkForm.message}
                      onChange={e => setTalkForm({ ...talkForm, message: e.target.value })}
                      placeholder="How can we support you today?"
                      className="w-full px-4 py-3.5 border border-slate-200/80 bg-white rounded-xl text-slate-900 placeholder-slate-450 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-4 bg-gradient-to-r from-indigo-650 to-violet-600 hover:from-indigo-600 hover:to-violet-500 text-white font-bold rounded-xl shadow-lg disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 transform active:scale-[0.99] transition-all"
                  >
                    {submitting ? 'Submitting...' : 'Send Message'}
                  </button>
                </form>
              )}

            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ComingJuly26Page;
