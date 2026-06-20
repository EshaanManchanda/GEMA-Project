import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FaChevronDown,
  FaTrophy,
  FaGraduationCap,
  FaFire,
  FaGlobeAmericas,
  FaCheckCircle,
  FaMicrophone,
  FaHome,
  FaHeart,
  FaStar,
  FaTimes
} from 'react-icons/fa';
import { toast } from 'react-hot-toast';

interface Benefit {
  icon: React.ReactNode;
  title: string;
  description: string;
}

interface FAQItem {
  question: string;
  answer: string;
}

const BENEFITS: Benefit[] = [
  {
    icon: <FaTrophy className="text-2xl text-amber-500" />,
    title: 'Certificates & Awards',
    description: 'Recognition for your achievements',
  },
  {
    icon: <FaGraduationCap className="text-2xl text-blue-500" />,
    title: 'Exposure to Top Universities',
    description: 'Connect with leading institutions',
  },
  {
    icon: <FaFire className="text-2xl text-red-500" />,
    title: 'Real Skills (not just theory)',
    description: 'Practical, industry-relevant experience',
  },
  {
    icon: <FaGlobeAmericas className="text-2xl text-green-500" />,
    title: 'Compete Globally',
    description: 'Challenge students across the Middle East',
  },
  {
    icon: <FaCheckCircle className="text-2xl text-emerald-500" />,
    title: 'Build Your Portfolio',
    description: 'Showcase your projects and achievements',
  },
  {
    icon: <FaMicrophone className="text-2xl text-purple-500" />,
    title: 'Confidence & Presentation Skills',
    description: 'Master the art of public speaking',
  },
];

const FAQS: FAQItem[] = [
  {
    question: 'Who can participate?',
    answer: 'Students from Grades 6–12 from any school or background. No prior experience needed!',
  },
  {
    question: 'Is it online or offline?',
    answer: 'It starts online—you compete from anywhere. Top performers get invited to exclusive campus finals where you present in person.',
  },
  {
    question: 'Do I need prior experience?',
    answer: 'No! Beginners are welcome. We provide workshops and mentorship to help you grow.',
  },
  {
    question: 'Will I get a certificate?',
    answer: 'Yes! All participants receive certificates. Top performers get awards and special recognition.',
  },
  {
    question: 'How much does it cost?',
    answer: 'Registration is completely FREE. All resources and workshops are provided at no cost.',
  },
  {
    question: 'Can my school participate?',
    answer: 'Absolutely! Schools can register multiple students. We provide support and resources to help your school excel.',
  },
];

// Reused Benefits Section
const BenefitsSection: React.FC = () => (
  <section className="py-20 bg-gradient-to-br from-blue-50 to-purple-50">
    <div className="max-w-6xl mx-auto px-4 sm:px-6">
      <div className="text-center mb-16">
        <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
          What You Gain
        </h2>
        <p className="text-lg text-gray-600">Real benefits that matter for your future</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {BENEFITS.map((benefit, i) => (
          <div key={i} className="p-8 bg-white rounded-2xl border border-gray-200 hover:shadow-xl hover:-translate-y-1 transition-all text-center">
            <div className="flex justify-center mb-4">{benefit.icon}</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">{benefit.title}</h3>
            <p className="text-gray-600">{benefit.description}</p>
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
    <section className="py-20 bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-gray-600">Everything you need to know</p>
        </div>

        <div className="space-y-4">
          {FAQS.map((faq, i) => (
            <button
              key={i}
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
              className="w-full text-left p-6 bg-white rounded-2xl border border-gray-200 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <h3 className="font-bold text-gray-900 text-lg pr-4">{faq.question}</h3>
                <FaChevronDown
                  className={`flex-shrink-0 text-purple-600 transition-transform ${openIndex === i ? 'rotate-180' : ''}`}
                />
              </div>

              {openIndex === i && (
                <p className="text-gray-600 mt-4 text-base leading-relaxed">
                  {faq.answer}
                </p>
              )}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};

// Custom Hero Section
const HeroSection: React.FC = () => (
  <section className="pt-32 pb-20 bg-[#F4F6FB] min-h-[90vh] flex items-center relative overflow-hidden">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        {/* Left Content */}
        <div>
          {/* Breadcrumbs removed */}

          <div className="inline-block px-3 py-1 bg-pink-100 text-pink-600 text-xs font-bold rounded-full mb-6 tracking-widest uppercase shadow-sm">
            Workshops
          </div>

          <h1 className="text-5xl sm:text-6xl font-extrabold text-gray-900 mb-8 leading-[1.1] tracking-tight">
            Online summer camps for kids & teens
          </h1>

          <ul className="space-y-4 mb-8">
            <li className="flex items-center gap-3 text-lg text-gray-700">
              <span className="text-2xl">🤩</span>
              <span className="font-medium">Fun summer learning adventures</span>
            </li>
            <li className="flex items-center gap-3 text-lg text-gray-700">
              <span className="text-2xl">🗓️</span>
              <span className="font-medium">Short camps, <span className="font-bold">lasting impact</span></span>
            </li>
            <li className="flex items-center gap-3 text-lg text-gray-700">
              <span className="text-2xl">🎓</span>
              <span className="font-medium"><span className="font-bold">Vetted educators</span> in every field</span>
            </li>
          </ul>

          {/* Ratings removed */}

          <button className="px-8 py-4 bg-[#4A148C] text-white font-bold text-lg rounded-full hover:bg-[#6A1B9A] transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-1 duration-200">
            Get Started
          </button>
        </div>

        {/* Right Graphic */}
        <div className="relative h-[500px] w-full flex justify-center items-center">
          {/* Abstract background shapes */}
          <div className="absolute top-0 right-10 w-[90%] h-[90%] bg-white rounded-[3rem] border-[4px] border-[#0A192F] rotate-3 shadow-2xl z-0" />
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-yellow-400 rounded-full blur-xl opacity-50 z-0" />
          <div className="absolute -bottom-10 left-10 w-40 h-40 bg-purple-500 rounded-full blur-2xl opacity-30 z-0" />

          {/* Main Image */}
          <div className="relative z-10 w-[85%] h-[85%] rounded-3xl overflow-hidden shadow-2xl border-4 border-white">
            <img 
              src="https://images.unsplash.com/photo-1503676260728-1c00da094a0b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80" 
              alt="Kid learning outdoors" 
              className="w-full h-full object-cover"
            />
          </div>

          {/* Floating Heart Icon */}
          <div className="absolute -bottom-4 left-1/4 z-20 w-20 h-20 bg-[#FF6B6B] rounded-full flex items-center justify-center shadow-xl border-4 border-white animate-bounce-gentle">
            <FaHeart className="text-white text-3xl" />
          </div>
          
          {/* Decorative squiggles */}
          <svg className="absolute -top-10 left-10 w-24 h-24 text-yellow-400 z-0" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round">
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
const ComingJulySection: React.FC = () => (
  <section className="py-20 bg-white">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-16">
        <h2 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight">
          COMING JULY '26
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* Card 1: Algebra */}
        <div className="group relative h-64 rounded-xl overflow-hidden shadow-lg cursor-pointer transform hover:-translate-y-2 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-blue-400">
            {/* Comic burst background effect */}
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at center, transparent 20%, #000 120%)' }} />
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+CiAgPHBhdGggZD0iTTIwIDIwTDAgMEg0MEwyMCAyMHpNMjAgMjBMMCA0MEg0MEwyMCAyMHoiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSIvPgo8L3N2Zz4=')]">
            <span className="px-4 py-1 bg-yellow-400 text-blue-900 font-black italic transform -skew-x-12 text-xl mb-2 shadow-sm border-2 border-blue-900">ALGEBRA 1</span>
            <h3 className="text-4xl font-black text-white italic transform -skew-x-12 uppercase drop-shadow-md border-b-4 border-yellow-400 leading-tight">
              SUMMER<br/>MATH CAMP!
            </h3>
            <p className="mt-4 text-white font-bold tracking-widest text-sm drop-shadow-md">LEARN • PRACTICE • SUCCEED!</p>
          </div>
        </div>

        {/* Card 2: Chemistry */}
        <div className="group relative h-64 rounded-xl overflow-hidden shadow-lg cursor-pointer transform hover:-translate-y-2 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-[#FFF5E1] to-[#FFE0B2]">
            {/* Cloud/bubbles effect */}
            <div className="absolute bottom-0 left-0 w-full h-1/2 bg-blue-100 rounded-t-[100%] opacity-50" />
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
            <h3 className="text-3xl font-black text-[#0A4B75] uppercase drop-shadow-sm mb-1 leading-none tracking-tighter" style={{ fontFamily: 'Comic Sans MS, cursive, sans-serif' }}>
              CHEMISTRY
            </h3>
            <h4 className="text-3xl font-black text-[#FF8C00] uppercase drop-shadow-sm leading-none tracking-tighter" style={{ fontFamily: 'Comic Sans MS, cursive, sans-serif' }}>
              SUMMER CAMP!
            </h4>
            <div className="mt-4 px-4 py-1 bg-white rounded-full border-2 border-[#0A4B75] text-[#0A4B75] font-bold text-xs uppercase tracking-widest shadow-sm">
              EXPLORE. EXPERIMENT. DISCOVER!
            </div>
            <div className="absolute bottom-4 left-4 text-4xl">🧪</div>
            <div className="absolute bottom-4 right-4 text-4xl">🔬</div>
            <div className="absolute top-4 left-4 text-4xl">⚛️</div>
          </div>
        </div>

        {/* Card 3: Sketching */}
        <div className="group relative h-64 rounded-xl overflow-hidden shadow-lg cursor-pointer transform hover:-translate-y-2 transition-all duration-300 border-4 border-purple-500">
          <div className="absolute inset-0 bg-[#F5F2EB] bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')]" />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
            <h3 className="text-5xl text-gray-800 leading-none mb-2" style={{ fontFamily: "'Brush Script MT', 'Dancing Script', cursive" }}>
              Sketching
            </h3>
            <span className="text-xl font-serif text-gray-500 italic mb-2">&</span>
            <h3 className="text-5xl text-gray-800 leading-none mb-6" style={{ fontFamily: "'Brush Script MT', 'Dancing Script', cursive" }}>
              Shading
            </h3>
            <p className="text-gray-500 font-serif text-sm tracking-[0.2em] uppercase border-t border-gray-300 pt-2">
              Sketch • Shade • Create
            </p>
            <div className="absolute bottom-4 right-6 opacity-30 text-6xl transform rotate-45">✏️</div>
          </div>
        </div>

        {/* Card 4: Art Weekly */}
        <div className="group relative h-64 rounded-xl overflow-hidden shadow-lg cursor-pointer transform hover:-translate-y-2 transition-all duration-300">
          <div className="absolute inset-0 bg-white" />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 border-[6px] border-dotted border-pink-400 m-2 rounded-xl">
            <div className="absolute top-4 left-4 bg-yellow-300 rounded-full p-2 w-16 h-16 flex items-center justify-center text-xs font-black rotate-12 shadow-md">
              LEARN!<br/>CREATE!<br/>HAVE FUN!
            </div>
            <div className="absolute top-4 right-4 bg-blue-500 text-white rounded-full p-2 w-16 h-16 flex flex-col items-center justify-center font-black -rotate-12 shadow-md">
              <span className="text-xs">Ages</span>
              <span className="text-xl">7-12</span>
            </div>
            <h3 className="text-5xl font-black text-pink-500 mb-1 tracking-tighter" style={{ fontFamily: 'Impact, sans-serif' }}>
              ART
            </h3>
            <p className="text-sm font-bold text-gray-600 tracking-widest uppercase mb-1">
              Weekly Beginner
            </p>
            <div className="bg-purple-600 text-white px-3 py-1 font-bold text-lg uppercase mb-2 shadow-sm transform -rotate-2">
              Creative Drawing
            </div>
            <div className="bg-blue-400 text-white px-6 py-1 font-bold text-xl uppercase rounded-full shadow-sm">
              Class!
            </div>
          </div>
        </div>

        {/* Card 5: Cursive */}
        <div className="group relative h-64 rounded-xl overflow-hidden shadow-lg cursor-pointer transform hover:-translate-y-2 transition-all duration-300">
          <div className="absolute inset-0 bg-[#FFFDF0] bg-[url('https://www.transparenttextures.com/patterns/notebook-dark.png')]" />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
             <div className="absolute top-6 right-6 bg-yellow-400 text-blue-900 rounded-full p-2 w-16 h-16 flex flex-col items-center justify-center font-black rotate-12 shadow-md">
              <span className="text-[10px]">Ages</span>
              <span className="text-lg">8-12</span>
            </div>
            <p className="text-blue-500 font-serif italic text-lg mb-0">Write with</p>
            <h3 className="text-6xl text-[#1E3A8A] leading-tight mb-0 drop-shadow-sm" style={{ fontFamily: "'Dancing Script', cursive" }}>
              Cursive
            </h3>
            <p className="text-gray-500 font-serif italic text-sm mt-0 mb-2">Write with</p>
            <h3 className="text-4xl text-pink-500 leading-tight mb-4 drop-shadow-sm transform -rotate-2" style={{ fontFamily: "'Dancing Script', cursive" }}>
              Confidence!
            </h3>
            <p className="text-xs text-blue-900 font-bold bg-blue-100 px-4 py-2 rounded-full">
              Join us and turn your <span className="text-pink-500">handwriting</span> into your <span className="text-pink-500 uppercase">superpower!</span>
            </p>
          </div>
        </div>

        {/* Card 6: Biology */}
        <div className="group relative h-64 rounded-xl overflow-hidden shadow-lg cursor-pointer transform hover:-translate-y-2 transition-all duration-300">
          <div className="absolute inset-0 bg-[#F4F9F1]" />
          {/* Decorative leaf shapes */}
          <div className="absolute right-0 bottom-0 w-40 h-40 bg-[#D4E8D4] rounded-tl-full opacity-60" />
          <div className="absolute left-0 top-0 w-24 h-24 bg-[#E1EEDD] rounded-br-full opacity-60" />
          
          <div className="absolute inset-0 flex flex-col items-start justify-center text-left p-10">
            <p className="text-sm font-bold text-gray-500 tracking-[0.2em] uppercase mb-1 flex items-center gap-2">
              High School 🌿
            </p>
            <h3 className="text-5xl font-black text-[#2D5A27] mb-2 tracking-tight">
              BIOLOGY
            </h3>
            <div className="bg-[#82B366] text-white px-3 py-1 font-bold text-sm uppercase rounded shadow-sm inline-block transform -rotate-1">
              SUMMER CAMP!
            </div>
            <div className="absolute right-6 top-1/2 -translate-y-1/2 text-6xl opacity-80">
              🔬
            </div>
          </div>
        </div>

      </div>
    </div>
  </section>
);

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
      <section className="py-24 relative overflow-hidden bg-slate-50/50">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_100%,#000_70%,transparent_100%)]" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[350px] h-[350px] md:w-[600px] md:h-[600px] bg-indigo-400/5 rounded-full blur-[80px] md:blur-[120px] pointer-events-none" />

        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900 mb-6">
            Ready to Start Your Journey?
          </h2>
          <p className="text-lg md:text-xl text-slate-650 max-w-2xl mx-auto mb-10 leading-relaxed">
            Join ambitious students across the region and unlock opportunities that shape your future.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={() => openStudentModal()}
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 hover:scale-[1.03] transition-all duration-200"
            >
              Register Now
            </button>
            <button
              onClick={() => setActiveModal('talk')}
              className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-950 font-bold rounded-xl border border-slate-200 hover:border-indigo-200 transition-all duration-200 flex items-center justify-center gap-2 shadow-sm"
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
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
          />

          <div className="relative w-full max-w-xl bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-2xl z-10 max-h-[90vh] flex flex-col text-slate-800">
            
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                {activeModal === 'student' && <span>🚀 Student Registration</span>}
                {activeModal === 'talk' && <span>💬 Inquiry Form</span>}
              </h3>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <FaTimes />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              
              {activeModal === 'student' && (
                <form onSubmit={handleStudentSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Student Full Name *</label>
                    <input
                      type="text"
                      required
                      value={studentForm.name}
                      onChange={e => setStudentForm({ ...studentForm, name: e.target.value })}
                      placeholder="e.g. Liam Smith"
                      className="w-full px-4 py-3 border border-slate-200 bg-white rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email Address *</label>
                      <input
                        type="email"
                        required
                        value={studentForm.email}
                        onChange={e => setStudentForm({ ...studentForm, email: e.target.value })}
                        placeholder="you@example.com"
                        className="w-full px-4 py-3 border border-slate-200 bg-white rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Parent Email Address *</label>
                      <input
                        type="email"
                        required
                        value={studentForm.parentEmail}
                        onChange={e => setStudentForm({ ...studentForm, parentEmail: e.target.value })}
                        placeholder="parent@example.com"
                        className="w-full px-4 py-3 border border-slate-200 bg-white rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Grade / Year Group *</label>
                      <select
                        required
                        value={studentForm.grade}
                        onChange={e => setStudentForm({ ...studentForm, grade: e.target.value })}
                        className="w-full px-4 py-3 border border-slate-200 bg-white rounded-xl text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                      >
                        <option value="">Select Grade</option>
                        {['Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'].map((g, idx) => (
                          <option key={idx} value={g}>{g}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Interested Program *</label>
                      <select
                        required
                        value={studentForm.program}
                        onChange={e => setStudentForm({ ...studentForm, program: e.target.value })}
                        className="w-full px-4 py-3 border border-slate-200 bg-white rounded-xl text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                      >
                        <option value="">General Opportunities</option>
                        {['Future Innovators Challenge', 'Global Communication Contest', 'Startup Challenge', 'Sustainability Innovation Challenge', 'Future Leaders Program', 'University Readiness Workshop'].map((opp, idx) => (
                          <option key={idx} value={opp}>{opp}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Interests / Focus Areas</label>
                    <div className="flex flex-wrap gap-2">
                      {['AI & Tech', 'Public Speaking', 'Entrepreneurship', 'Sustainability', 'Creative Arts'].map((interest, idx) => {
                        const isSelected = studentForm.interests.includes(interest);
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => toggleInterest(interest)}
                            className={`px-3 py-1.5 rounded-full border text-xs font-semibold transition ${isSelected ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-slate-200 text-slate-650 hover:border-slate-300'}`}
                          >
                            {interest}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Tell us about your goals</label>
                    <textarea
                      rows={3}
                      value={studentForm.message}
                      onChange={e => setStudentForm({ ...studentForm, message: e.target.value })}
                      placeholder="What do you hope to achieve with KidRove?"
                      className="w-full px-4 py-3 border border-slate-200 bg-white rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold rounded-xl shadow-lg disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {submitting ? 'Submitting...' : 'Submit Student Registration'}
                  </button>
                </form>
              )}

              {activeModal === 'talk' && (
                <form onSubmit={handleTalkSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Your Name *</label>
                    <input
                      type="text"
                      required
                      value={talkForm.name}
                      onChange={e => setTalkForm({ ...talkForm, name: e.target.value })}
                      placeholder="e.g. Jessica Miller"
                      className="w-full px-4 py-3 border border-slate-200 bg-white rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Your Role *</label>
                      <select
                        value={talkForm.role}
                        onChange={e => setTalkForm({ ...talkForm, role: e.target.value })}
                        className="w-full px-4 py-3 border border-slate-200 bg-white rounded-xl text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                      >
                        {['Parent', 'Student', 'Educator', 'Mentor', 'Other'].map((role, idx) => (
                          <option key={idx} value={role}>{role}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email Address *</label>
                      <input
                        type="email"
                        required
                        value={talkForm.email}
                        onChange={e => setTalkForm({ ...talkForm, email: e.target.value })}
                        placeholder="you@example.com"
                        className="w-full px-4 py-3 border border-slate-250 bg-white rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Your Message *</label>
                    <textarea
                      required
                      rows={4}
                      value={talkForm.message}
                      onChange={e => setTalkForm({ ...talkForm, message: e.target.value })}
                      placeholder="How can we support you today?"
                      className="w-full px-4 py-3 border border-slate-200 bg-white rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold rounded-xl shadow-lg disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
