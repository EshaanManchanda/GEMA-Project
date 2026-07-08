import React, { useState } from 'react';
import api from '../services/api';
import { getCompanyAddress, getContactEmail, getContactPhone } from '../utils/brandConfig';
import {
  FaArrowRight,
  FaCheckCircle,
  FaTrophy,
  FaUsers,
  FaGraduationCap,
  FaChartLine,
  FaGlobe,
  FaQuoteLeft,
  FaStar,
  FaMapMarkerAlt,
  FaPhone,
  FaEnvelope,
} from 'react-icons/fa';
import { toast } from 'react-hot-toast';

/* ─── Types ──────────────────────────────── */
interface ProblemCard {
  icon: React.ReactNode;
  title: string;
  description: string;
}

interface ProgramModel {
  icon: React.ReactNode;
  title: string;
  description: string;
  bullets: string[];
  highlighted?: boolean;
}

interface HowItWorksStep {
  number: number;
  title: string;
  description: string;
  icon: React.ReactNode;
}

interface Benefit {
  icon: React.ReactNode;
  title: string;
  value: string;
}

interface Metric {
  number: string;
  label: string;
  description: string;
}

/* ─── Data ──────────────────────────────── */
const PROBLEMS: ProblemCard[] = [
  {
    icon: <FaUsers className="text-3xl text-blue-500" />,
    title: 'Student Engagement Crisis',
    description: 'Students lose interest in campus life after enrollment. Need unique experiences beyond classroom.',
  },
  {
    icon: <FaChartLine className="text-3xl text-purple-500" />,
    title: 'Limited Brand Visibility',
    description: 'Universities struggle to showcase their value to younger audiences and build long-term brand loyalty.',
  },
  {
    icon: <FaGlobe className="text-3xl text-cyan-500" />,
    title: 'Disconnected Ecosystem',
    description: 'No structured platform to connect students with universities, schools, and real-world opportunities.',
  },
];

const PROGRAM_MODELS: ProgramModel[] = [
  {
    icon: <FaTrophy className="text-4xl text-amber-500" />,
    title: 'Flagship Event',
    description: 'Annual signature competition or campus event',
    bullets: [
      '1-2 events per year',
      '500–2000 student participants',
      'Multi-country reach',
    ],
  },
  {
    icon: <FaGraduationCap className="text-4xl text-blue-500" />,
    title: 'Multi-Event Series',
    description: 'Quarterly competitions + workshops throughout the year',
    bullets: [
      '4–6 events annually',
      '2000–5000 student touchpoints',
      'Continuous engagement',
    ],
    highlighted: true,
  },
  {
    icon: <FaChartLine className="text-4xl text-green-500" />,
    title: 'Annual Program',
    description: 'Full ecosystem: competitions, workshops, campus visits',
    bullets: [
      'Year-round engagement',
      '5000+ student participants',
      'Complete student pipeline',
    ],
  },
];

const HOW_IT_WORKS: HowItWorksStep[] = [
  {
    number: 1,
    title: 'Discovery',
    description: 'Students discover your university through our platform',
    icon: <FaGlobe className="text-2xl" />,
  },
  {
    number: 2,
    title: 'Engagement',
    description: 'Compete, learn, and interact with your university teams',
    icon: <FaUsers className="text-2xl" />,
  },
  {
    number: 3,
    title: 'Experience',
    description: 'Top performers visit campus, meet faculty, explore programs',
    icon: <FaGraduationCap className="text-2xl" />,
  },
  {
    number: 4,
    title: 'Conversion',
    description: 'Qualified leads become enrolled students and alumni',
    icon: <FaCheckCircle className="text-2xl" />,
  },
];

const BENEFITS: Benefit[] = [
  {
    icon: <FaUsers className="text-2xl text-blue-500" />,
    title: 'Student Pipeline',
    value: '5000+',
  },
  {
    icon: <FaGlobe className="text-2xl text-cyan-500" />,
    title: 'Campus Visits',
    value: '1500+',
  },
  {
    icon: <FaMapMarkerAlt className="text-2xl text-red-500" />,
    title: 'Geographic Reach',
    value: '5+ Countries',
  },
  {
    icon: <FaTrophy className="text-2xl text-amber-500" />,
    title: 'Lead Quality',
    value: 'High Intent',
  },
  {
    icon: <FaChartLine className="text-2xl text-green-500" />,
    title: 'Conversion Rate',
    value: '25-40%',
  },
  {
    icon: <FaStar className="text-2xl text-purple-500" />,
    title: 'Brand Exposure',
    value: 'Global',
  },
];

const METRICS: Metric[] = [
  {
    number: '5000+',
    label: 'Students',
    description: 'Engaged annually through competitions',
  },
  {
    number: '1500+',
    label: 'Campus Visits',
    description: 'Top-performing students visit annually',
  },
  {
    number: '5+',
    label: 'Countries',
    description: 'Operating across Middle East region',
  },
  {
    number: '25-40%',
    label: 'Conversion',
    description: 'Qualified leads to enrollment',
  },
];

/* ─── Components ──────────────────────────── */

// Summer 2026 Promotional Banner
const Summer2026Banner: React.FC = () => (
  <section className="relative overflow-hidden bg-gradient-to-r from-orange-500 via-amber-400 to-yellow-400">
    {/* Animated sunrays */}
    <div className="absolute inset-0 opacity-20">
      {[...Array(8)].map((_, i) => (
        <div
          key={i}
          className="absolute top-0 left-1/2 h-full w-1 bg-white origin-top"
          style={{ transform: `rotate(${i * 22.5}deg)`, transformOrigin: '50% 0%' }}
        />
      ))}
    </div>

  </section>
);

// Hero Section
const HeroSection: React.FC = () => (
  <section className="pt-32 pb-16 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 relative overflow-hidden">
    <div className="absolute top-10 right-10 text-6xl opacity-10 animate-pulse">🎓</div>
    <div className="absolute bottom-10 left-10 text-6xl opacity-10 animate-pulse">💡</div>
    <div className="absolute top-1/2 right-1/4 text-5xl opacity-10 animate-pulse">🚀</div>

    <div className="max-w-7xl mx-auto px-4 sm:px-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        {/* Left Content */}
        <div>
          <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 mb-6 leading-tight">
            Build Your <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Student Pipeline</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 leading-relaxed">
            Connect with thousands of talented students across the Middle East through innovative competitions, workshops, and campus experiences.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mb-12">
            <button
              onClick={() => document.getElementById('contact-form')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-full hover:shadow-xl transition-shadow text-lg flex items-center justify-center gap-2"
            >
              Request Proposal <FaArrowRight />
            </button>
          </div>

          <div className="flex flex-wrap gap-6 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <FaCheckCircle className="text-green-500 text-lg" />
              <span>No platform fees</span>
            </div>
            <div className="flex items-center gap-2">
              <FaCheckCircle className="text-green-500 text-lg" />
              <span>Complete control</span>
            </div>
            <div className="flex items-center gap-2">
              <FaCheckCircle className="text-green-500 text-lg" />
              <span>Dedicated support</span>
            </div>
          </div>
        </div>

        {/* Right Visual */}
        <div className="relative">
          <div className="aspect-square bg-gradient-to-br from-blue-200 via-purple-200 to-pink-200 rounded-3xl flex items-center justify-center relative">
            <div className="absolute inset-0 rounded-3xl overflow-hidden">
              <div className="absolute top-1/4 left-1/4 text-8xl opacity-20 animate-pulse">🎓</div>
              <div className="absolute bottom-1/4 right-1/4 text-8xl opacity-20 animate-pulse">📊</div>
              <div className="absolute top-1/3 right-1/3 text-7xl opacity-20 animate-pulse">🚀</div>
            </div>
            <div className="relative text-center">
              <p className="text-7xl font-extrabold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">5000+</p>
              <p className="text-xl font-semibold text-gray-700 mt-2">Students Ready</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

// Trust Bar
const TrustBar: React.FC = () => (
  <section className="py-8 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-center">
    <div className="max-w-7xl mx-auto px-4 sm:px-6">
      <p className="text-lg font-semibold">
        ✨ Engaging students across <span className="font-extrabold">UAE • Saudi Arabia • Qatar • Oman • Kuwait</span>
      </p>
    </div>
  </section>
);

// Problem Section
const ProblemSection: React.FC = () => (
  <section className="py-20 bg-gray-50">
    <div className="max-w-6xl mx-auto px-4 sm:px-6">
      <div className="text-center mb-16">
        <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">The Challenge Universities Face</h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Modern students expect more than a degree. They want transformative experiences.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {PROBLEMS.map((problem, i) => (
          <div key={i} className="p-8 bg-white rounded-2xl border border-gray-200 hover:shadow-xl transition-shadow">
            <div className="mb-6">{problem.icon}</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">{problem.title}</h3>
            <p className="text-gray-600">{problem.description}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

// Solution/Funnel Section
const SolutionSection: React.FC = () => (
  <section className="py-20 bg-white">
    <div className="max-w-6xl mx-auto px-4 sm:px-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        {/* Funnel Visual */}
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-blue-100 to-blue-50 rounded-2xl p-6 text-center text-blue-700 font-bold text-lg">
            📢 Awareness
          </div>
          <div className="bg-gradient-to-r from-purple-100 to-purple-50 rounded-2xl p-6 text-center text-purple-700 font-bold text-lg">
            🤝 Engagement
          </div>
          <div className="bg-gradient-to-r from-cyan-100 to-cyan-50 rounded-2xl p-6 text-center text-cyan-700 font-bold text-lg">
            🎓 Experience
          </div>
          <div className="bg-gradient-to-r from-green-100 to-green-50 rounded-2xl p-6 text-center text-green-700 font-bold text-lg">
            ✅ Conversion
          </div>
        </div>

        {/* Content */}
        <div>
          <h2 className="text-4xl font-bold text-gray-900 mb-6">Our Proven Funnel</h2>
          <p className="text-lg text-gray-600 mb-8">
            We guide students through a structured journey that transforms them from curious prospects into enrolled students and brand advocates.
          </p>

          <div className="space-y-4">
            {[
              { step: 'Awareness', text: 'Students discover your university through national competitions' },
              { step: 'Engagement', text: 'Active participation in challenges, workshops, and events' },
              { step: 'Experience', text: 'Top performers visit campus, meet faculty, explore programs' },
              { step: 'Conversion', text: 'Qualified leads with high intent-to-enroll rates' },
            ].map((item, i) => (
              <div key={i} className="flex gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0 font-bold">
                  {i + 1}
                </div>
                <div>
                  <p className="font-bold text-gray-900">{item.step}</p>
                  <p className="text-gray-600">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </section>
);

// Program Models Section
const ProgramModelsSection: React.FC = () => (
  <section id="programs" className="py-20 bg-gradient-to-br from-slate-50 to-slate-100">
    <div className="max-w-6xl mx-auto px-4 sm:px-6">
      <div className="text-center mb-16">
        <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Partnership Models</h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Choose the model that fits your goals and resources
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {PROGRAM_MODELS.map((model, i) => (
          <div
            key={i}
            className={`p-8 rounded-2xl transition-all duration-300 ${model.highlighted
                ? 'bg-white border-2 border-blue-600 shadow-2xl scale-105'
                : 'bg-white border border-gray-200 hover:shadow-xl'
              }`}
          >
            <div className="mb-6">{model.icon}</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">{model.title}</h3>
            <p className="text-gray-600 mb-6">{model.description}</p>

            <ul className="space-y-3 mb-8">
              {model.bullets.map((bullet, j) => (
                <li key={j} className="flex items-start gap-2 text-gray-700">
                  <FaCheckCircle className="text-green-500 flex-shrink-0 mt-1" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => toast('Coming soon!')}
              className="text-blue-600 font-bold flex items-center gap-2 hover:gap-3 transition-all"
            >
              Learn More <FaArrowRight className="text-sm" />
            </button>
          </div>
        ))}
      </div>
    </div>
  </section>
);

// How It Works Section
const HowItWorksSection: React.FC = () => (
  <section id="how-it-works" className="py-20 bg-white">
    <div className="max-w-6xl mx-auto px-4 sm:px-6">
      <div className="text-center mb-16">
        <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">How It Works</h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          A structured process to maximize impact
        </p>
      </div>

      <div className="relative">
        {/* Connecting line */}
        <div className="hidden md:block absolute top-1/3 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 z-0" />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative z-10">
          {HOW_IT_WORKS.map((step, i) => (
            <div key={i} className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white text-2xl mb-6 shadow-lg">
                {step.icon}
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{step.title}</h3>
              <p className="text-gray-600 text-sm">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);

// Student Experience Section
const StudentExperienceSection: React.FC = () => (
  <section className="py-20 bg-gradient-to-br from-blue-50 to-purple-50">
    <div className="max-w-6xl mx-auto px-4 sm:px-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        {/* Visual */}
        <div className="aspect-square bg-gradient-to-br from-blue-200 to-purple-200 rounded-3xl flex items-center justify-center">
          <div className="text-center">
            <p className="text-6xl mb-4">👥</p>
            <p className="text-2xl font-bold text-gray-700">Student Campus Visits</p>
          </div>
        </div>

        {/* Content */}
        <div>
          <h2 className="text-4xl font-bold text-gray-900 mb-6">What Students Experience</h2>
          <div className="space-y-4">
            {[
              'Showcase their talent on a global stage',
              'Meet university professors and industry experts',
              'Participate in real-world problem solving',
              'Build network with peers from across the region',
              'Earn recognition and certificates',
              'Explore university campus and programs firsthand',
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <FaCheckCircle className="text-green-500 flex-shrink-0 mt-1" />
                <p className="text-gray-700">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </section>
);

// University Benefits Section
const UniversityBenefitsSection: React.FC = () => (
  <section id="impact" className="py-20 bg-white">
    <div className="max-w-6xl mx-auto px-4 sm:px-6">
      <div className="text-center mb-16">
        <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">University Benefits</h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Measurable impact on enrollment and brand building
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {BENEFITS.map((benefit, i) => (
          <div key={i} className="p-8 bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl border border-gray-200 hover:shadow-lg transition-shadow text-center">
            <div className="flex justify-center mb-6">{benefit.icon}</div>
            <p className="text-3xl font-extrabold text-gray-900 mb-2">{benefit.value}</p>
            <p className="text-gray-700 font-semibold">{benefit.title}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

// Geographic Reach Section
const GeographicReachSection: React.FC = () => (
  <section className="py-20 bg-gradient-to-br from-blue-50 to-cyan-50">
    <div className="max-w-6xl mx-auto px-4 sm:px-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        {/* Map Illustration */}
        <div className="aspect-square bg-gradient-to-br from-cyan-200 to-blue-200 rounded-3xl flex items-center justify-center relative">
          <div className="text-center">
            <p className="text-6xl mb-4">🌍</p>
            <p className="text-2xl font-bold text-gray-700">Middle East Region</p>
          </div>
          <div className="absolute top-10 left-10 text-2xl animate-pulse">📍</div>
          <div className="absolute top-20 right-12 text-2xl animate-pulse">📍</div>
          <div className="absolute bottom-16 left-12 text-2xl animate-pulse">📍</div>
          <div className="absolute bottom-10 right-20 text-2xl animate-pulse">📍</div>
        </div>

        {/* Content */}
        <div>
          <h2 className="text-4xl font-bold text-gray-900 mb-6">Our Geographic Reach</h2>
          <p className="text-lg text-gray-600 mb-8">
            We operate across the major education hubs in the Middle East, ensuring maximum reach for your partnership.
          </p>

          <div className="space-y-4">
            {[
              { country: 'United Arab Emirates', icon: '🇦🇪' },
              { country: 'Saudi Arabia', icon: '🇸🇦' },
              { country: 'Qatar', icon: '🇶🇦' },
              { country: 'Oman', icon: '🇴🇲' },
              { country: 'Kuwait', icon: '🇰🇼' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-lg font-semibold text-gray-700">
                <span className="text-3xl">{item.icon}</span>
                {item.country}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </section>
);

interface UniversityEvent {
  title: string;
  date: string;
  time: string;
  team: string;
  status: 'coming_soon' | 'open';
}

const UNIVERSITY_EVENTS: UniversityEvent[] = [
  {
    title: 'Harvard Week: Summer College Programs',
    date: 'June 5, 2026',
    time: '2:00 PM UTC',
    team: 'Team Overland Summers',
    status: 'coming_soon',
  },
  {
    title: 'Immersive Film Making & Virtual Reality',
    date: 'June 15, 2026',
    time: '4:00 PM UTC',
    team: 'Team UCA Canterbury',
    status: 'coming_soon',
  },
  {
    title: 'Inside Cybersecurity & Computer Science at Sharda University',
    date: 'June 25, 2026',
    time: '6:00 PM UTC',
    team: 'Team Sharda University, India',
    status: 'coming_soon',
  },
];

// University Partner Sessions Section
const UniversityPartnerSessionsSection: React.FC = () => {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">University Partner Sessions</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Exclusive sessions with leading universities — register your interest now
          </p>
        </div>

          <div
            className="flex flex-wrap md:justify-center gap-6 pb-4"
          >
            {UNIVERSITY_EVENTS.map((ev, i) => (
              <div key={i} className="flex-shrink-0 w-80 p-6 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border-2 border-indigo-200 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700">
                    ⏰ Upcoming
                  </span>
                </div>
                <h3 className="font-bold text-gray-900 mb-3 text-lg leading-snug">{ev.title}</h3>
                <div className="space-y-2 text-sm text-gray-600 mb-6">
                  <p>📅 {ev.date}</p>
                  <p>⏰ {ev.time}</p>
                  <p>👥 {ev.team}</p>
                </div>
                <button
                  onClick={() => toast('University session registration is coming soon!')}
                  className="w-full px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold rounded-lg hover:shadow-lg transition-shadow text-sm"
                >
                  Register Now
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  };

// Execution Model Section
const ExecutionModelSection: React.FC = () => (
  <section className="py-20 bg-gradient-to-br from-slate-50 to-slate-100">
    <div className="max-w-6xl mx-auto px-4 sm:px-6">
      <div className="text-center mb-16">
        <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Execution Model</h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Clear roles and responsibilities for seamless collaboration
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          {
            name: 'KidRove',
            color: 'from-blue-500 to-cyan-500',
            responsibilities: [
              'Platform & tech infrastructure',
              'Marketing & promotion',
              'Event logistics',
              'Student recruitment',
              'Data analytics & reporting',
            ],
          },
          {
            name: 'GEMA Hub',
            color: 'from-purple-500 to-pink-500',
            responsibilities: [
              'Content curation',
              'Partnership coordination',
              'School liaisons',
              'Regional operations',
              'Community management',
            ],
          },
          {
            name: 'Your University',
            color: 'from-green-500 to-emerald-500',
            responsibilities: [
              'Brand presence',
              'Faculty engagement',
              'Campus experiences',
              'Student recruitment',
              'Program promotion',
            ],
          },
        ].map((org, i) => (
          <div key={i} className="p-8 bg-white rounded-2xl border-l-4" style={{ borderColor: `url(#grad${i})` }}>
            <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${org.color} text-white flex items-center justify-center text-2xl font-bold mb-6`}>
              {org.name[0]}
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-6">{org.name}</h3>
            <ul className="space-y-3">
              {org.responsibilities.map((resp, j) => (
                <li key={j} className="flex items-start gap-3 text-gray-700">
                  <FaCheckCircle className="text-green-500 flex-shrink-0 mt-1" />
                  <span>{resp}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  </section>
);

// Impact Metrics Section
const ImpactMetricsSection: React.FC = () => (
  <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
    <div className="max-w-6xl mx-auto px-4 sm:px-6">
      <div className="text-center mb-16">
        <h2 className="text-4xl md:text-5xl font-bold mb-4">Proven Results</h2>
        <p className="text-lg text-white/80 max-w-2xl mx-auto">
          Real numbers from existing partnerships
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {METRICS.map((metric, i) => (
          <div key={i} className="text-center p-8 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 hover:bg-white/20 transition">
            <p className="text-5xl md:text-6xl font-extrabold mb-2">{metric.number}</p>
            <p className="text-2xl font-bold mb-2">{metric.label}</p>
            <p className="text-white/80 text-sm">{metric.description}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

// Testimonial Section
const TestimonialSection: React.FC = () => (
  <section className="py-20 bg-white">
    <div className="max-w-6xl mx-auto px-4 sm:px-6">
      <div className="text-center mb-16">
        <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">What Partners Say</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {[
          {
            name: 'Giovanni Ciserani',
            title: 'Head of Strategy',
            university: 'Sustainability Management Business School,Switzerland',
            quote: 'KidRove transformed how we engage with prospective students. We saw a 35% increase in qualified leads within the first year.',
          },
          {
            name: 'Mclenney, Professor James',
            title: 'HOD Evolution, Ecology & Behaviour',
            university: 'University of Liverpool, UK',
            quote: 'The structured approach and dedicated support made partnership execution seamless. Highly recommended.',
          },
        ].map((testimonial, i) => (
          <div key={i} className="p-8 bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl border border-blue-200">
            <div className="flex items-center gap-1 mb-4">
              {[...Array(5)].map((_, j) => (
                <FaStar key={j} className="text-amber-400" />
              ))}
            </div>
            <FaQuoteLeft className="text-3xl text-gray-300 mb-4" />
            <p className="text-gray-700 mb-6 text-lg italic">"{testimonial.quote}"</p>
            <div>
              <p className="font-bold text-gray-900">{testimonial.name}</p>
              <p className="text-sm text-gray-600">{testimonial.title}</p>
              <p className="text-sm text-gray-500">{testimonial.university}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

// Final CTA Section
const FinalCTASection: React.FC = () => (
  <section className="py-20 bg-gradient-to-br from-blue-900 to-purple-900 text-white relative overflow-hidden">
    <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
    <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />

    <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center relative z-10">
      <h2 className="text-5xl md:text-6xl font-extrabold mb-6">
        Let's Build Your Future Student Pipeline
      </h2>
      <p className="text-xl text-white/80 mb-10">
        Connect with thousands of talented students across the Middle East through innovative programs designed for mutual success.
      </p>

      <button
        onClick={() => document.getElementById('contact-form')?.scrollIntoView({ behavior: 'smooth' })}
        className="px-10 py-5 bg-white text-blue-600 font-extrabold text-lg rounded-full hover:bg-blue-50 transition-all hover:scale-105 inline-flex items-center gap-2"
      >
        Request a Proposal <FaArrowRight />
      </button>
    </div>
  </section>
);

// Contact Form Section
const ContactFormSection: React.FC = () => {
  const [formData, setFormData] = useState({
    universityName: '',
    contactName: '',
    email: '',
    phone: '',
    message: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const finalMessage = formData.message 
        ? (formData.message.length < 10 ? formData.message + ' (Short inquiry)' : formData.message)
        : 'Interested in university partnership';

      await api.post('/partnerships', {
        name: formData.contactName,
        email: formData.email,
        phone: formData.phone,
        organization: formData.universityName,
        partnershipType: 'school',
        message: finalMessage,
        agreeToTerms: true,
      });
      
      toast.success('Proposal request submitted! We\'ll contact you within 24 hours.');
      setFormData({
        universityName: '',
        contactName: '',
        email: '',
        phone: '',
        message: '',
      });
    } catch (error: any) {
      console.error('Submission error:', error);
      toast.error(error.response?.data?.message || 'Failed to submit proposal request. Please check your inputs.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="contact-form" className="py-20 bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Contact Details */}
          <div>
            <h2 className="text-4xl font-bold text-gray-900 mb-8">Get In Touch</h2>
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <FaPhone className="text-blue-600 text-xl flex-shrink-0 mt-1" />
                <div>
                  <p className="font-bold text-gray-900">Phone</p>
                  <p className="text-gray-600">{getContactPhone()}</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <FaEnvelope className="text-blue-600 text-xl flex-shrink-0 mt-1" />
                <div>
                  <p className="font-bold text-gray-900">Email</p>
                  <p className="text-gray-600">{getContactEmail()}</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <FaMapMarkerAlt className="text-blue-600 text-xl flex-shrink-0 mt-1" />
                <div>
                  <p className="font-bold text-gray-900">Office</p>
                  <p className="text-gray-600">{getCompanyAddress()}</p>
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-6 rounded-2xl border border-blue-200 mt-8">
                <p className="text-gray-700 font-semibold">
                  ⏱️ We respond within 24 hours
                </p>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-lg">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">University Name *</label>
                <input
                  type="text"
                  name="universityName"
                  value={formData.universityName}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="Your university name"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Contact Person *</label>
                <input
                  type="text"
                  name="contactName"
                  value={formData.contactName}
                  onChange={handleChange}
                  required
                  minLength={2}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="Your name"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Email *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Phone *</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  pattern="^[\d\s\+\(\)\-]+$"
                  title="Please enter a valid phone number"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="+971 XX XXX XXXX"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Message</label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
                  placeholder="Tell us about your institution and goals..."
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-lg hover:shadow-xl transition-shadow text-lg disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Submitting...' : 'Request a Proposal'}
              </button>

              <p className="text-xs text-gray-500 text-center">
                We respect your privacy. Your information will never be shared.
              </p>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};



/* ─── Main Component ──────────────────────────– */
const PartnershipsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white font-sans">
      <Summer2026Banner />
      <HeroSection />
      <TrustBar />
      <ProblemSection />
      <SolutionSection />
      <ProgramModelsSection />
      <HowItWorksSection />
      <StudentExperienceSection />
      <UniversityBenefitsSection />
      <GeographicReachSection />
      <UniversityPartnerSessionsSection />
      <ExecutionModelSection />
      <ImpactMetricsSection />
      <TestimonialSection />
      <FinalCTASection />
      <ContactFormSection />
    </div>
  );
};

export default PartnershipsPage;
