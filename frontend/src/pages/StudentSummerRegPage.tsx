import React, { useState } from 'react';
import {
  FaCheckCircle,
  FaRocket,
  FaMedal,
  FaTimes,
  FaGraduationCap,
  FaLightbulb,
  FaGlobe,
  FaLaptopCode,
  FaVolumeUp,
  FaUniversity,
  FaQuoteLeft,
  FaQuestionCircle,
  FaHeart
} from 'react-icons/fa';
import { toast } from 'react-hot-toast';

const StudentSummerRegPage: React.FC = () => {
  // Modal states
  const [activeModal, setActiveModal] = useState<'student' | 'school' | 'talk' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  // Form states
  const [studentForm, setStudentForm] = useState({
    name: '',
    email: '',
    parentEmail: '',
    grade: '',
    interests: [] as string[],
    program: '',
    message: ''
  });

  const [schoolForm, setSchoolForm] = useState({
    schoolName: '',
    city: '',
    contactName: '',
    designation: '',
    email: '',
    phone: '',
    expectedStudents: ''
  });

  const [talkForm, setTalkForm] = useState({
    name: '',
    role: 'Parent', // Student, Parent, Educator, Other
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

  const handleSchoolSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      toast.success('🏫 Partnership request received! A school relations manager will reach out within 24 hours.');
      setSchoolForm({ schoolName: '', city: '', contactName: '', designation: '', email: '', phone: '', expectedStudents: '' });
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

  // Paths definition matching the 2nd screenshot layout
  const paths = [
    {
      id: 'innovator',
      image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=400&h=280',
      iconBg: 'bg-indigo-500',
      badgeColor: 'bg-indigo-500',
      icon: <FaLaptopCode className="text-white text-xl" />,
      title: '💡 The Innovator',
      bannerBg: 'bg-indigo-400/20',
      desc: 'Explore AI, coding, robotics, and technology challenges to build future-ready skills.',
      cta: 'Innovation Challenges',
      programName: 'Future Innovators Challenge'
    },
    {
      id: 'leader',
      image: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&q=80&w=400&h=280',
      iconBg: 'bg-sky-500',
      badgeColor: 'bg-sky-500',
      icon: <FaVolumeUp className="text-white text-xl" />,
      title: '🎤 The Leader',
      bannerBg: 'bg-sky-400/20',
      desc: 'Master public speaking, join debate leagues, and participate in global leadership events.',
      cta: 'Leadership Events',
      programName: 'Future Leaders Program'
    },
    {
      id: 'entrepreneur',
      image: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&q=80&w=400&h=280',
      iconBg: 'bg-rose-500',
      badgeColor: 'bg-rose-500',
      icon: <FaRocket className="text-white text-xl" />,
      title: '🚀 The Entrepreneur',
      bannerBg: 'bg-rose-400/20',
      desc: 'Dive into startup challenges, pitch business ideas, and learn real-world problem solving.',
      cta: 'Entrepreneurship Programs',
      programName: 'Startup Challenge'
    },
    {
      id: 'creator',
      image: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&q=80&w=400&h=280',
      iconBg: 'bg-amber-500',
      badgeColor: 'bg-amber-500',
      icon: <FaLightbulb className="text-white text-xl" />,
      title: '🎨 The Creator',
      bannerBg: 'bg-amber-400/20',
      desc: 'Unleash your design potential, digital storytelling, and creative content creation.',
      cta: 'Creative Competitions',
      programName: 'Global Communication Contest'
    },
    {
      id: 'changemaker',
      image: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&q=80&w=400&h=280',
      iconBg: 'bg-emerald-500',
      badgeColor: 'bg-emerald-500',
      icon: <FaGlobe className="text-white text-xl" />,
      title: '🌍 The Changemaker',
      bannerBg: 'bg-emerald-400/20',
      desc: 'Focus on social impact, climate action, future career prep, and sustainability challenges.',
      cta: 'Global Challenges',
      programName: 'Sustainability Innovation Challenge'
    },
    {
      id: 'scholar',
      image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&q=80&w=400&h=280',
      iconBg: 'bg-violet-500',
      badgeColor: 'bg-violet-500',
      icon: <FaUniversity className="text-white text-xl" />,
      title: '🎓 The Future Scholar',
      bannerBg: 'bg-violet-400/20',
      desc: 'Experience university visits, campus tours, and exclusive mentorship from top professors.',
      cta: 'University Programs',
      programName: 'University Readiness Workshop'
    }
  ];

  // Featured Opportunities matching 3rd screenshot layout
  const opportunities = [
    {
      title: 'Future Innovators Challenge',
      category: 'Technology & Innovation',
      grades: 'Grades 6–12',
      format: 'Online + Finals',
      image: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&q=80&w=400&h=220',
      mentor: 'Tech Innovation Board',
      mentorAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=60&h=60',
      rating: '4.9',
      reviews: '124'
    },
    {
      title: 'Global Communication Contest',
      category: 'Public Speaking',
      grades: 'Grades 6–12',
      format: 'Live Streamed Stages',
      image: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&q=80&w=400&h=220',
      mentor: 'Debate Guild Leaders',
      mentorAvatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=60&h=60',
      rating: '4.8',
      reviews: '98'
    },
    {
      title: 'Startup Challenge',
      category: 'Entrepreneurship',
      grades: 'Grades 8–12',
      format: 'Incubator Format',
      image: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&q=80&w=400&h=220',
      mentor: 'VC Incubator Mentors',
      mentorAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=60&h=60',
      rating: '5.0',
      reviews: '64'
    },
    {
      title: 'Sustainability Innovation Challenge',
      category: 'Global Impact',
      grades: 'Grades 6–12',
      format: 'Online + Campus Finals',
      image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=400&h=220',
      mentor: 'Green Planet Alliance',
      mentorAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&q=80&w=60&h=60',
      rating: '4.9',
      reviews: '85'
    },
    {
      title: 'Future Leaders Program',
      category: 'Leadership',
      grades: 'Grades 7–12',
      format: 'Online Cohorts',
      image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&q=80&w=400&h=220',
      mentor: 'Civic Leadership Inst.',
      mentorAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=60&h=60',
      rating: '4.9',
      reviews: '112'
    },
    {
      title: 'University Readiness Workshop',
      category: 'Higher Education',
      grades: 'Grades 9–12',
      format: 'In-person Visits',
      image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&q=80&w=400&h=220',
      mentor: 'Alumni Admissions Board',
      mentorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=60&h=60',
      rating: '4.9',
      reviews: '143'
    }
  ];

  // Testimonials definition
  const testimonials = [
    {
      name: 'Sarah Ahmed',
      grade: 'Grade 11 Student',
      award: 'Winner, Future Innovators Challenge 2025',
      text: 'Participating in the KidRove challenges completely transformed how I view technology. Presenting my AI prototype to actual professors gave me the confidence to apply for top-tier computer science programs.',
      img: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200&h=200'
    },
    {
      name: 'David Chen',
      grade: 'Grade 9 Student',
      award: 'Global Communication Contest Finalist',
      text: 'I used to get terrified speaking in front of even my classmates. The mentors at KidRove helped me find my voice, structure my arguments, and eventually speak on a university campus stage. A life-changing journey!',
      img: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=200&h=200'
    },
    {
      name: 'Mariam Al-Mansoori',
      grade: 'Parent of Grade 8 Student',
      award: 'Startup Challenge Participant parent',
      text: 'As parents, we want our kids to develop real-world skills. KidRove goes far beyond traditional textbooks. Seeing my son design a business plan and collaborate globally was absolutely incredible.',
      img: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200&h=200'
    }
  ];

  return (
    <div className="min-h-screen bg-white text-slate-800 font-sans selection:bg-indigo-650 selection:text-white overflow-hidden">
      
      {/* ── HERO SECTION ── */}
      <section className="relative pt-24 pb-20 md:pt-32 md:pb-36 flex flex-col items-center justify-center border-b border-slate-100 bg-white">
        {/* Hand drawn style connections and background shapes */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,#f5f3ff_0%,transparent_70%)]" />
        
        <div className="relative max-w-7xl mx-auto px-6 w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Text Column */}
          <div className="lg:col-span-6 text-left space-y-6">
            <h1 className="text-5xl sm:text-7xl font-black tracking-tight text-slate-900 leading-tight">
              Let them dream. <br />
              <span className="text-indigo-600">Watch them achieve.</span>
            </h1>

            <p className="text-lg sm:text-xl text-slate-650 font-normal leading-relaxed max-w-xl">
              Competitions, innovation challenges, leadership programs, and university experiences designed to help students discover their strengths and showcase their talents.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 items-center pt-2">
              <button
                onClick={() => openStudentModal()}
                className="w-full sm:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-full shadow-lg shadow-indigo-650/20 hover:scale-[1.02] transition-all duration-200 text-center"
              >
                Register Now
              </button>
              <button
                onClick={() => setActiveModal('school')}
                className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 font-bold rounded-full border-2 border-slate-200 transition-all duration-200 text-center"
              >
                Join Through Your School
              </button>
            </div>
          </div>

          {/* Right Images Column (Matching the Outschool curve design with yellow tags) */}
          <div className="lg:col-span-6 relative flex flex-col items-center justify-center">
            {/* Cute sun and dashed line elements */}
            <div className="absolute left-4 top-1/2 -translate-y-1/2 z-0 hidden sm:block pointer-events-none">
              <svg className="w-48 h-96 text-amber-400 opacity-60" fill="none" viewBox="0 0 200 400">
                <path d="M180,20 C100,80 50,150 100,240 C140,320 20,360 10,380" stroke="currentColor" strokeWidth="2.5" strokeDasharray="6 6" />
                <path d="M12,382 L5,372 M12,382 L22,376" stroke="currentColor" strokeWidth="2.5" />
              </svg>
              {/* Little Yellow Sun */}
              <div className="absolute right-0 top-1/2 bg-amber-400 w-12 h-12 rounded-full flex items-center justify-center shadow-lg border border-amber-300">
                <span className="text-white text-xl">☀️</span>
              </div>
            </div>

            <div className="relative space-y-6 z-10 w-full max-w-md">
              {/* First Shape: Clubs */}
              <div className="relative group overflow-hidden rounded-[80px_20px_80px_20px] shadow-lg border-2 border-white hover:scale-102 transition-transform duration-300">
                <img
                  src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&q=80&w=400&h=200"
                  alt="Students collaborating"
                  className="w-full h-40 object-cover"
                />
                <span className="absolute top-4 left-4 bg-amber-400 text-slate-900 text-xs font-black px-4 py-1.5 rounded-full flex items-center gap-1.5 shadow-md">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                  🏆 Competitions
                </span>
              </div>

              {/* Second Shape: Camps */}
              <div className="relative group overflow-hidden rounded-[20px_80px_20px_80px] shadow-lg border-2 border-white translate-x-4 hover:scale-102 transition-transform duration-300">
                <img
                  src="https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&q=80&w=400&h=200"
                  alt="Student holding project"
                  className="w-full h-40 object-cover"
                />
                <span className="absolute top-4 right-4 bg-amber-400 text-slate-900 text-xs font-black px-4 py-1.5 rounded-full flex items-center gap-1.5 shadow-md">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                  🎓 University Experiences
                </span>
              </div>

              {/* Third Shape: Social Skills */}
              <div className="relative group overflow-hidden rounded-[80px_20px_80px_20px] shadow-lg border-2 border-white hover:scale-102 transition-transform duration-300">
                <img
                  src="https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&q=80&w=400&h=200"
                  alt="Group discussion"
                  className="w-full h-40 object-cover"
                />
                <span className="absolute top-4 left-4 bg-amber-400 text-slate-900 text-xs font-black px-4 py-1.5 rounded-full flex items-center gap-1.5 shadow-md">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                  🎤 Leadership
                </span>
                <span className="absolute bottom-4 right-4 bg-amber-400 text-slate-900 text-xs font-black px-3 py-1.5 rounded-xl shadow-md">
                  & Global Opportunities
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 2: FIND YOUR PATH ── */}
      <section className="py-20 md:py-24 bg-white border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-4">Find Your Path to Success</h2>
            <p className="text-slate-500 text-lg max-w-2xl mx-auto">
              Choose opportunities that match your interests, talents, and future ambitions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {paths.map((path) => (
              <div
                key={path.id}
                className="bg-white rounded-3xl border border-slate-200 overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col"
              >
                {/* Upper Half: Image with circular Icon badge overlay */}
                <div className="relative h-48 overflow-hidden bg-slate-100">
                  <img
                    src={path.image}
                    alt={path.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className={`absolute top-4 left-4 w-12 h-12 rounded-full ${path.iconBg} flex items-center justify-center border-2 border-white shadow-md`}>
                    {path.icon}
                  </div>
                </div>

                {/* Lower Half Content */}
                <div className="p-6 md:p-8 flex flex-col flex-grow">
                  <h3 className="text-2xl font-extrabold text-slate-900 mb-3">{path.title}</h3>
                  <p className="text-slate-600 text-sm md:text-base leading-relaxed mb-6 flex-grow">{path.desc}</p>
                  
                  <button
                    onClick={() => openStudentModal(path.programName)}
                    className="w-full py-3 bg-indigo-650 hover:bg-indigo-755 text-white font-bold rounded-xl transition duration-200 text-center"
                  >
                    {path.cta}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 3: TRENDING OPPORTUNITIES ── */}
      <section className="py-20 bg-slate-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-4">Featured Opportunities</h2>
            <p className="text-slate-500 text-lg">Select one of our signature programs to begin your adventure.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
            {opportunities.map((opp, idx) => (
              <div
                key={idx}
                className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col"
              >
                {/* Cover Image & Favorite Toggle Overlay */}
                <div className="relative h-44 overflow-hidden bg-slate-150">
                  <img
                    src={opp.image}
                    alt={opp.title}
                    className="w-full h-full object-cover"
                  />
                  <button className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 hover:bg-white flex items-center justify-center shadow text-slate-400 hover:text-red-500 transition">
                    <FaHeart className="text-sm" />
                  </button>
                </div>

                {/* Card Info Content */}
                <div className="p-5 flex flex-col flex-1">
                  <p className="text-xs font-bold text-indigo-650 uppercase tracking-widest mb-1.5">{opp.category}</p>
                  <h3 className="text-lg font-extrabold text-slate-900 leading-tight mb-4 flex-1 line-clamp-2">{opp.title}</h3>
                  
                  {/* Mentor row */}
                  <div className="flex items-center gap-2 mb-3">
                    <img
                      src={opp.mentorAvatar}
                      alt={opp.mentor}
                      className="w-6 h-6 rounded-full object-cover"
                    />
                    <span className="text-xs text-slate-500">{opp.mentor}</span>
                  </div>

                  {/* Rating row */}
                  <div className="flex items-center gap-1 text-xs text-amber-500 font-bold mb-5">
                    <span>★</span>
                    <span className="text-slate-800">{opp.rating}</span>
                    <span className="text-slate-400 font-normal">({opp.reviews})</span>
                  </div>

                  {/* Badges and action row */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-1.5">
                      <span className="px-2 py-1 bg-slate-100 rounded text-[10px] font-bold text-slate-600">{opp.grades}</span>
                      <span className="px-2 py-1 bg-slate-100 rounded text-[10px] font-bold text-slate-600">{opp.format}</span>
                    </div>
                    
                    <button
                      onClick={() => openStudentModal(opp.title)}
                      className="px-4 py-2 bg-indigo-650 hover:bg-indigo-755 text-white font-extrabold text-xs rounded-lg transition"
                    >
                      Register
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center">
            <button
              onClick={() => openStudentModal()}
              className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-full transition-all shadow-md"
            >
              Explore More Opportunities
            </button>
          </div>
        </div>
      </section>

      {/* ── SECTION 4: WHY CHOOSE KIDROVE? ── */}
      <section className="py-24 bg-indigo-600 text-white relative border-b border-indigo-750 overflow-hidden">
        {/* Abstract shapes behind */}
        <div className="absolute top-12 left-6 w-32 h-32 bg-white/10 rounded-[80px_20px_80px_20px] blur-sm pointer-events-none rotate-45" />
        <div className="absolute -bottom-12 right-6 w-40 h-40 bg-white/10 rounded-full blur-md pointer-events-none" />

        <div className="max-w-6xl mx-auto px-6 relative">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-6xl font-black mb-4">Why Choose KidRove?</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {[
              {
                icon: <FaMedal className="text-white text-2xl" />,
                iconBg: 'bg-cyan-500',
                title: 'Built for Future Leaders',
                desc: 'Programs designed to develop confidence, leadership, creativity, and innovation.'
              },
              {
                icon: <FaGraduationCap className="text-white text-2xl" />,
                iconBg: 'bg-pink-500',
                title: 'Access to Universities & Experts',
                desc: 'Learn from mentors, industry professionals, and university collaborators.'
              },
              {
                icon: <FaGlobe className="text-white text-2xl" />,
                iconBg: 'bg-orange-500',
                title: 'Opportunities Beyond the Classroom',
                desc: 'Competitions, workshops, and experiences that prepare students for future success.'
              }
            ].map((item, idx) => (
              <div key={idx} className="bg-white rounded-3xl p-8 flex flex-col border border-white/15 text-slate-800 shadow-xl">
                <div className={`mb-6 w-14 h-14 rounded-full ${item.iconBg} flex items-center justify-center shadow-inner`}>
                  {item.icon}
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-3">{item.title}</h3>
                <p className="text-slate-650 leading-relaxed text-sm md:text-base">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center">
            <button
              onClick={() => openStudentModal()}
              className="px-8 py-4 bg-indigo-950 hover:bg-slate-900 text-white font-extrabold rounded-full transition shadow-xl"
            >
              Get Started
            </button>
          </div>
        </div>
      </section>

      {/* ── SECTION 5: YOUR JOURNEY ── */}
      <section className="py-20 md:py-24 bg-white border-b border-slate-100 relative">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-4">Your Journey with KidRove</h2>
            <p className="text-slate-650 text-lg max-w-xl mx-auto">
              Follow our simple, high-impact pathway to discover and showcase your talent.
            </p>
          </div>

          {/* Timeline steps */}
          <div className="relative border-l-2 border-indigo-200 ml-4 md:ml-6 space-y-12">
            {[
              { step: '1️⃣', title: 'Register', desc: 'Sign up for the platform to create your student/parent profile.' },
              { step: '2️⃣', title: 'Choose a Program', desc: 'Select from matches across technology, business, leadership, and arts.' },
              { step: '3️⃣', title: 'Learn & Prepare', desc: 'Access masterclasses, resources, and expert mentors to craft your pitch.' },
              { step: '4️⃣', title: 'Participate', desc: 'Submit your entry, showcase your solutions, or join live competitive rounds.' },
              { step: '5️⃣', title: 'Showcase Your Talent', desc: 'Present your designs, codes, or speeches to global juries and panels.' },
              { step: '6️⃣', title: 'Earn Recognition', desc: 'Get verified certificates, awards, and prestigious portfolio achievements.' },
              { step: '7️⃣', title: 'Access Future Opportunities', desc: 'Unlock university campus visits, internship tracks, and global ambassador positions.' }
            ].map((item, idx) => (
              <div key={idx} className="relative pl-10 md:pl-12 group">
                <div className="absolute -left-[17px] top-1 bg-white border-2 border-indigo-500 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-indigo-650 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                  {idx + 1}
                </div>
                <h3 className="text-xl font-extrabold text-slate-900 mb-2 flex items-center gap-2">
                  <span>{item.step.replace(/[0-9]️⃣\s*/, '')}</span>
                </h3>
                <p className="text-slate-650 text-base max-w-2xl leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 6: CAMPUS EXPERIENCE ── */}
      <section className="py-20 bg-slate-50 border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <span className="inline-block bg-violet-100 border border-violet-200 text-violet-700 text-xs font-bold px-4 py-1.5 rounded-full mb-4 uppercase tracking-wider">
            Premium Exposure
          </span>
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6">Experience a Real University Campus</h2>
          <p className="text-slate-650 text-lg max-w-3xl mx-auto mb-12 leading-relaxed">
            Top-performing students may receive exclusive opportunities to take their project beyond the screen.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 max-w-4xl mx-auto mb-12">
            {[
              { text: 'Visit university campuses', color: 'border-indigo-200 bg-indigo-50/50 text-indigo-700' },
              { text: 'Present projects', color: 'border-violet-200 bg-violet-50/50 text-violet-700' },
              { text: 'Meet professors', color: 'border-cyan-200 bg-cyan-50/50 text-cyan-700' },
              { text: 'Connect with mentors', color: 'border-emerald-200 bg-emerald-50/50 text-emerald-700' },
              { text: 'Experience university life', color: 'border-rose-200 bg-rose-50/50 text-rose-700' }
            ].map((item, idx) => (
              <div
                key={idx}
                className={`p-5 rounded-xl border flex flex-col items-center justify-center text-center font-semibold text-sm ${item.color} shadow-sm hover:scale-[1.03] transition-transform`}
              >
                <span className="text-emerald-600 mb-2">✓</span>
                <span>{item.text}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => setActiveModal('talk')}
            className="px-8 py-4 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl border border-slate-200 transition-all inline-flex items-center gap-2 shadow-sm"
          >
            👉 Learn More
          </button>
        </div>
      </section>

      {/* ── SECTION 7: FOR SCHOOLS ── */}
      <section className="py-20 bg-white border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Col: Info */}
            <div className="lg:col-span-6 space-y-6">
              <span className="inline-block bg-indigo-50 border border-indigo-150 text-indigo-650 text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider">
                Institutional Partnerships
              </span>
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 leading-tight">Partner with KidRove</h2>
              <p className="text-slate-650 text-lg leading-relaxed">
                Bring global challenges and elite university enrichment directly to your classroom. Partnering with KidRove gives schools exclusive access to student tracking, community recognition, and extracurricular resources.
              </p>

              <div className="space-y-3 pt-2">
                {[
                  'Enroll students in global challenges',
                  'Enhance student exposure',
                  'Access leadership programs',
                  'Receive participation recognition',
                  'Build future-ready student communities'
                ].map((benefit, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <FaCheckCircle className="text-indigo-600 flex-shrink-0" />
                    <span className="text-slate-700 text-base">{benefit}</span>
                  </div>
                ))}
              </div>

              <div className="pt-4">
                <button
                  onClick={() => setActiveModal('school')}
                  className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold rounded-xl shadow-lg hover:shadow-indigo-500/20 transition-all duration-200 flex items-center justify-center gap-2 w-full sm:w-auto"
                >
                  👉 Register Your School
                </button>
              </div>
            </div>

            {/* Right Col: Creative visual */}
            <div className="lg:col-span-6">
              <div className="relative p-1 bg-gradient-to-tr from-indigo-100 via-violet-100 to-slate-200 rounded-3xl overflow-hidden shadow-lg">
                <div className="bg-white p-8 rounded-[22px] space-y-6 border border-slate-100">
                  <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                    <span className="text-xs font-bold tracking-widest text-slate-400 uppercase">SCHOOL DASHBOARD PREVIEW</span>
                    <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
                  </div>
                  
                  <div className="space-y-4">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <p className="text-xs text-slate-550 font-medium">Total Enrolled Students</p>
                      <h4 className="text-2xl font-black text-slate-900 mt-1">142 Students</h4>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <p className="text-xs text-slate-550 font-medium">Active Competitions</p>
                        <h4 className="text-xl font-bold text-indigo-650 mt-1">4 Contests</h4>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <p className="text-xs text-slate-550 font-medium">Certificates Issued</p>
                        <h4 className="text-xl font-bold text-violet-650 mt-1">87 Badges</h4>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
                    <p className="text-xs font-bold text-slate-700">Upcoming Institutional Milestones</p>
                    <div className="w-full bg-slate-200 rounded-full h-1.5">
                      <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: '75%' }} />
                    </div>
                    <p className="text-[10px] text-slate-400 text-right">75% Complete to Regional Leader Status</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── SECTION 8: SUCCESS STORIES ── */}
      <section className="py-20 bg-slate-50 border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-4">Student Success Stories</h2>
            <p className="text-slate-550 text-lg max-w-2xl mx-auto">
              Read how high schoolers and parents utilized our opportunities to achieve greatness.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((t, idx) => (
              <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 flex flex-col justify-between hover:shadow-lg transition-all relative">
                <div>
                  <FaQuoteLeft className="text-indigo-500/10 text-3xl mb-4" />
                  <p className="text-slate-650 italic mb-6 leading-relaxed">"{t.text}"</p>
                </div>
                <div className="flex items-center gap-4 pt-4 border-t border-slate-100">
                  <img
                    src={t.img}
                    alt={t.name}
                    className="w-12 h-12 rounded-full object-cover border-2 border-indigo-500/20"
                  />
                  <div>
                    <h4 className="font-bold text-slate-900 text-base">{t.name}</h4>
                    <p className="text-xs text-slate-500 font-medium">{t.grade}</p>
                    <span className="inline-block text-[10px] font-bold text-indigo-650 mt-1 uppercase tracking-wider">
                      🏆 {t.award}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 9: FAQ ── */}
      <section className="py-20 bg-white border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-4">Frequently Asked Questions</h2>
            <p className="text-slate-550 text-lg max-w-xl mx-auto">
              Have questions about program structure, eligibility, or certifications? We have answers.
            </p>
          </div>

          <div className="space-y-4">
            {[
              {
                q: 'Who can participate?',
                a: 'Students in Grades 6–12 are welcome to register. Specific challenges have tiered groupings (e.g., Middle School: Grades 6-8, High School: Grades 9-12) to keep competitions fair and engaging.'
              },
              {
                q: 'Do I need experience?',
                a: 'No, absolutely not. Beginners are welcome! We design our challenges with built-in learning modules, templates, and mentor masterclasses to support students starting from scratch.'
              },
              {
                q: 'Are programs online or offline?',
                a: 'Most programs begin with online learning modules, group workshops, and project uploads. Selected finalists and top performers are then invited to offline workshops and presentation ceremonies held on prestigious university campuses.'
              },
              {
                q: 'Do participants receive certificates?',
                a: 'Yes, all active participants receive verified, shareable digital certificates recognizing their project milestones. Award winners receive gold/silver/bronze badges, school trophies, and portfolio recommendations.'
              }
            ].map((faq, idx) => (
              <div
                key={idx}
                className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden transition-all duration-200"
              >
                <button
                  onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                  className="w-full text-left px-6 py-5 flex items-center justify-between gap-4 font-bold text-slate-800 hover:text-indigo-650 transition-colors"
                >
                  <span className="flex items-center gap-3">
                    <FaQuestionCircle className="text-indigo-500 text-lg flex-shrink-0" />
                    <span>{faq.q}</span>
                  </span>
                  <span className="text-xl text-slate-400">
                    {activeFaq === idx ? '−' : '+'}
                  </span>
                </button>
                {activeFaq === idx && (
                  <div className="px-6 pb-6 pt-1 text-slate-500 border-t border-slate-100">
                    <p className="text-slate-600 leading-relaxed text-sm md:text-base">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

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
          {/* Backdrop blur overlay */}
          <div
            onClick={() => setActiveModal(null)}
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
          />

          <div className="relative w-full max-w-xl bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-2xl z-10 max-h-[90vh] flex flex-col text-slate-800">
            
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                {activeModal === 'student' && <span>🚀 Student Registration</span>}
                {activeModal === 'school' && <span>🏫 Partner with KidRove</span>}
                {activeModal === 'talk' && <span>💬 Inquiry Form</span>}
              </h3>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <FaTimes />
              </button>
            </div>

            {/* Modal Body / Scrollable Forms */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              
              {/* STUDENT REGISTRATION FORM */}
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
                        {opportunities.map((opp, idx) => (
                          <option key={idx} value={opp.title}>{opp.title}</option>
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

              {/* SCHOOL PARTNERSHIP FORM */}
              {activeModal === 'school' && (
                <form onSubmit={handleSchoolSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">School Name *</label>
                    <input
                      type="text"
                      required
                      value={schoolForm.schoolName}
                      onChange={e => setSchoolForm({ ...schoolForm, schoolName: e.target.value })}
                      placeholder="e.g. Green Valley International School"
                      className="w-full px-4 py-3 border border-slate-200 bg-white rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">City *</label>
                      <input
                        type="text"
                        required
                        value={schoolForm.city}
                        onChange={e => setSchoolForm({ ...schoolForm, city: e.target.value })}
                        placeholder="e.g. Dubai"
                        className="w-full px-4 py-3 border border-slate-200 bg-white rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Expected Student Enrolment</label>
                      <input
                        type="text"
                        value={schoolForm.expectedStudents}
                        onChange={e => setSchoolForm({ ...schoolForm, expectedStudents: e.target.value })}
                        placeholder="e.g. 50–100 students"
                        className="w-full px-4 py-3 border border-slate-200 bg-white rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Contact Name *</label>
                      <input
                        type="text"
                        required
                        value={schoolForm.contactName}
                        onChange={e => setSchoolForm({ ...schoolForm, contactName: e.target.value })}
                        placeholder="Your Full Name"
                        className="w-full px-4 py-3 border border-slate-200 bg-white rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Designation *</label>
                      <input
                        type="text"
                        required
                        value={schoolForm.designation}
                        onChange={e => setSchoolForm({ ...schoolForm, designation: e.target.value })}
                        placeholder="e.g. Activities Coordinator"
                        className="w-full px-4 py-3 border border-slate-200 bg-white rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Official Email *</label>
                      <input
                        type="email"
                        required
                        value={schoolForm.email}
                        onChange={e => setSchoolForm({ ...schoolForm, email: e.target.value })}
                        placeholder="edu@school.com"
                        className="w-full px-4 py-3 border border-slate-200 bg-white rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Phone Number *</label>
                      <input
                        type="tel"
                        required
                        value={schoolForm.phone}
                        onChange={e => setSchoolForm({ ...schoolForm, phone: e.target.value })}
                        placeholder="+971 XX XXX XXXX"
                        className="w-full px-4 py-3 border border-slate-200 bg-white rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold rounded-xl shadow-lg disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {submitting ? 'Submitting...' : 'Register Your School'}
                  </button>
                </form>
              )}

              {/* GENERAL INQUIRY FORM */}
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

export default StudentSummerRegPage;
