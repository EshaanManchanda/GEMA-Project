import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FaArrowRight,
  FaTrophy,
  FaGraduationCap,
  FaUsers,
  FaFire,
  FaCheckCircle,
  FaStar,
  FaQuoteLeft,
  FaChevronDown,
  FaRocket,
  FaMicrophone,
  FaLightbulb,
  FaGlobeAmericas,
} from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import api from '../services/api';
interface OpportunityCard {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  borderColor: string;
}

interface JourneyStep {
  number: number;
  title: string;
  description: string;
  rightDescription?: string;
}

interface Benefit {
  icon: React.ReactNode;
  title: string;
  description: string;
}

interface UpcomingEvent {
  title: string;
  date: string;
  description: string;
  status: 'coming_soon' | 'open';
  link?: string;
  category?: string;
}

interface UniversityEvent {
  title: string;
  date: string;
  time: string;
  team: string;
  status: 'coming_soon' | 'open';
}

interface FAQItem {
  question: string;
  answer: string;
}

/* ─── Data ──────────────────────────────── */
const OPPORTUNITIES: OpportunityCard[] = [
  {
    icon: <FaRocket className="text-3xl" />,
    title: '🧠 Innovation & Tech Challenges',
    description: 'AI, coding, app development, future technology projects',
    color: 'from-blue-500 to-cyan-500',
    borderColor: 'border-blue-200',
  },
  {
    icon: <FaMicrophone className="text-3xl" />,
    title: '🎤 Communication & Leadership',
    description: 'Public speaking, debate, storytelling competitions',
    color: 'from-purple-500 to-pink-500',
    borderColor: 'border-purple-200',
  },
  {
    icon: <FaLightbulb className="text-3xl" />,
    title: '🚀 Entrepreneurship Competitions',
    description: 'Startup ideas, business pitches, innovation challenges',
    color: 'from-orange-500 to-red-500',
    borderColor: 'border-orange-200',
  },
  {
    icon: <FaGlobeAmericas className="text-3xl" />,
    title: '🎨 Creative & Media Events',
    description: 'Design, filmmaking, digital content creation',
    color: 'from-green-500 to-emerald-500',
    borderColor: 'border-green-200',
  },
];

const JOURNEY_STEPS: JourneyStep[] = [
  {
    number: 1,
    title: 'Register Online',
    description: 'Sign up with your details and select your area of interest',
    rightDescription: 'Join 500+ Schools Empowering Future Innovators',
  },
  {
    number: 2,
    title: 'Participate in Challenges',
    description: 'Compete with students from across the Middle East',
    rightDescription: 'Students compete with peers from top schools and gain global exposure.',
  },
  {
    number: 3,
    title: 'Learn through Workshops',
    description: 'Get mentorship from university experts and industry leaders',
    rightDescription: '50+ Workshops Conducted Every Year',
  },
  {
    number: 4,
    title: 'Get Selected for Finals',
    description: 'Top performers advance to the final round',
    rightDescription: 'National & Regional Recognition',
  },
  {
    number: 5,
    title: 'Showcase at University Campus',
    description: 'Present your work to professors and judges',
    rightDescription: 'University Exposure Experience',
  },
  {
    number: 6,
    title: 'Win Recognition',
    description: 'Earn certificates, awards, and global recognition',
    rightDescription: 'Helping students build confidence, leadership, and achievement',
  },
];

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

const UPCOMING_EVENTS: UpcomingEvent[] = [
  {
    title: 'Scratch Game Creation',
    date: 'Starts May 15, 2026',
    description: 'Learn coding in a fun and creative way!',
    status: 'coming_soon',

    link: 'https://kidrove.com/events/scratch-game-creation-workshop-for-students-',
  },
  {
    title: 'Global Communication Contest',
    date: 'Starts June 1, 2026',
    description: 'Public speaking, debate, and storytelling',
    status: 'open',
    link: 'https://worldstorytellingcompetition.com/',
  },
  {
    title: 'Startup Challenge',
    date: 'Starts June 15, 2026',
    description: 'Pitch your business ideas and win mentorship',
    status: 'coming_soon',
    link: 'https://youngstartupclub.com/',
  },
];

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

/* ─── Components ──────────────────────────── */

// Hero Section
const HeroSection: React.FC = () => (
  <section className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-500 to-pink-500 relative overflow-hidden pt-24 pb-12 flex items-center">
    {/* Animated background elements */}
    <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse" />
    <div className="absolute bottom-0 left-0 w-72 h-72 bg-white/5 rounded-full blur-3xl animate-pulse" />

    <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-16">
      <div className="text-center">
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-white mb-6 leading-tight">
          Showcase Your Talent on a <span className="bg-gradient-to-r from-yellow-200 to-pink-200 bg-clip-text text-transparent">Global Stage</span>
        </h1>
        <p className="text-lg sm:text-xl text-white/90 mb-10 max-w-3xl mx-auto leading-relaxed">
          Participate in competitions, workshops, and campus experiences hosted in collaboration with leading universities.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
          <button
            onClick={() => document.getElementById('register-form')?.scrollIntoView({ behavior: 'smooth' })}
            className="px-8 py-4 bg-white text-purple-600 font-bold text-lg rounded-full hover:bg-yellow-200 hover:scale-105 transition-all duration-200 shadow-2xl flex items-center gap-2"
          >
            👉 Register Now <FaArrowRight />
          </button>
          <button
            onClick={() => toast.success('School registration feature coming soon!')}
            className="px-8 py-4 bg-white/20 text-white font-bold text-lg rounded-full hover:bg-white/30 transition-all duration-200 border-2 border-white flex items-center gap-2"
          >
            👉 Join Through Your School
          </button>
        </div>

        {/* Trust badges */}
        <div className="flex flex-wrap justify-center gap-6 text-white/80 text-sm">
          <div className="flex items-center gap-2">
            <FaCheckCircle className="text-yellow-300" /> 5000+ Students
          </div>
          <div className="flex items-center gap-2">
            <FaCheckCircle className="text-yellow-300" /> 50+ Schools
          </div>
          <div className="flex items-center gap-2">
            <FaCheckCircle className="text-yellow-300" /> 20+ Universities
          </div>
        </div>
      </div>
    </div>
  </section>
);

// What is This Section
const WhatIsSection: React.FC = () => (
  <section className="py-20 bg-white">
    <div className="max-w-5xl mx-auto px-4 sm:px-6">
      <div className="text-center mb-12">
        <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
          What is the KidRove Student Program?
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          A unique platform where students from Grades 6–12 discover their potential
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {[
          {
            icon: '🎯',
            title: 'Participate in Global Competitions',
            desc: 'Compete with thousands of students across the Middle East and beyond',
            link: null,
            linkText: null,
          },
          {
            icon: '📚',
            title: 'Learn from University Experts',
            desc: 'Get mentorship from professors and industry leaders',
            link: null,
            linkText: 'through engaging workshops and seminars.',
          },
          {
            icon: '💡',
            title: 'Build Real-World Skills',
            desc: 'Develop practical abilities that matter in the real world',
            link: null,
            linkText: 'through GEMA Clubs and Activities.',
          },
          {
            icon: '🏫',
            title: 'Visit University Campuses',
            desc: 'Get exclusive access to university visits and networking',
            link: null,
            linkText: null,
          },
        ].map((item, i) => (
          <div key={i} className="flex gap-4 p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-100 hover:shadow-lg transition-shadow">
            <div className="text-4xl flex-shrink-0">{item.icon}</div>
            <div>
              <h3 className="font-bold text-gray-900 mb-2">{item.title}</h3>
              <p className="text-gray-600 text-sm">{item.desc}</p>
              {item.linkText && (
                <p className="text-purple-600 text-sm font-medium mt-1">{item.linkText}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 p-8 bg-gradient-to-r from-blue-100 to-purple-100 rounded-3xl border-2 border-blue-200 text-center">
        <p className="text-xl font-semibold text-gray-900">
          ✨ Designed to prepare you for the future
        </p>
      </div>
    </div>
  </section>
);

// Opportunities Section
const OpportunitiesSection: React.FC = () => (
  <section className="py-20 bg-gradient-to-br from-slate-50 to-slate-100">
    <div className="max-w-6xl mx-auto px-4 sm:px-6">
      <div className="text-center mb-16">
        <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
          Explore Exciting Opportunities
        </h2>
        <p className="text-lg text-purple-600 font-medium">Collab with Kidkove and start your Future ready student journey with us</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {OPPORTUNITIES.map((opp, i) => (
          <div
            key={i}
            className={`p-8 rounded-3xl border-2 ${opp.borderColor} bg-white hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 cursor-pointer group`}
          >
            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${opp.color} flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform`}>
              {opp.icon}
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">{opp.title}</h3>
            <p className="text-gray-600">{opp.description}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

// Journey Section
const JourneySection: React.FC = () => (
  <section className="py-20 bg-white">
    <div className="max-w-6xl mx-auto px-4 sm:px-6">
      <div className="text-center mb-16">
        <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
          Your Journey from Participant to Achiever
        </h2>
        <p className="text-lg text-gray-600">Follow these 6 steps to success</p>
      </div>

      <div className="relative">
        {/* Timeline line */}
        <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-400 via-purple-400 to-pink-400 -translate-x-1/2" />

        <div className="space-y-12 md:space-y-16">
          {JOURNEY_STEPS.map((step, i) => (
            <div key={i} className={`flex gap-8 ${i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}>
              {/* Left content */}
              <div className="flex-1">
                <div className={`p-6 rounded-2xl ${i % 2 === 0 ? 'bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200' : 'bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200'} text-right md:text-left`}>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{step.title}</h3>
                  <p className="text-gray-600">{step.description}</p>
                </div>
              </div>

              {/* Center circle */}
              <div className="hidden md:flex w-12 h-12 rounded-full bg-white border-4 border-blue-500 flex items-center justify-center flex-shrink-0 z-10 shadow-lg">
                <span className="text-blue-600 font-bold text-lg">{step.number}</span>
              </div>

              {/* Right content (showing the suggested right-side description) */}
              <div className="flex-1">
                {step.rightDescription && (
                  <div className={`p-6 rounded-2xl ${i % 2 !== 0 ? 'bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200' : 'bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200'} text-left md:text-right`}>
                    <h3 className="text-2xl font-bold text-transparent mb-2 select-none select-none">{step.title}</h3>
                    <p className="text-gray-600">{step.rightDescription}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);

// Benefits Section
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

// Campus Experience Section
const CampusExperienceSection: React.FC = () => (
  <section className="py-20 bg-white">
    <div className="max-w-5xl mx-auto px-4 sm:px-6">
      <div className="rounded-3xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-12 md:p-16 text-white relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />

        <div className="relative z-10">
          <h2 className="text-4xl sm:text-5xl font-bold mb-6">
            Experience a Real University Campus
          </h2>
          <p className="text-lg text-white/90 mb-8 max-w-2xl">
            Top-performing students get the chance to visit leading university campuses, present their ideas and projects, and interact with professors and mentors.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[
              { emoji: '🏫', text: 'Visit Leading Campuses' },
              { emoji: '🎤', text: 'Present Your Work' },
              { emoji: '👨‍🎓', text: 'Meet Professors & Mentors' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-3xl">{item.emoji}</span>
                <span className="font-semibold">{item.text}</span>
              </div>
            ))}
          </div>

          <p className="text-lg text-white/80">
            A glimpse into your future starts here.
          </p>
        </div>
      </div>
    </div>
  </section>
);

// School Partnership Section
const SchoolPartnershipSection: React.FC = () => (
  <section className="py-20 bg-slate-50">
    <div className="max-w-5xl mx-auto px-4 sm:px-6">
      <div className="bg-white rounded-3xl p-12 border-2 border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Partner With Us as a School
            </h2>

            <ul className="space-y-4 mb-8">
              {[
                'Get Free of cost Engaging Workshop for students on various topics.',
                'Enroll students in global competitions',
                'Provide exposure beyond classroom learning',
                'Receive recognition & participation certificates',
                'Access dedicated school dashboard',
                'Get support from our team',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-gray-700">
                  <FaCheckCircle className="text-green-500 flex-shrink-0 mt-1" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <button onClick={() => toast.success('School registration feature coming soon!')} className="px-8 py-3 bg-blue-600 text-white font-bold rounded-full hover:bg-blue-700 transition">
              👉 Register Your School
            </button>
          </div>
          <div className="aspect-square bg-gradient-to-br from-blue-200 via-purple-200 to-pink-200 rounded-3xl flex items-center justify-center">
            <span className="text-8xl">🏫</span>
          </div>
        </div>
      </div>
    </div>
  </section>
);

// Upcoming Events Section
const UpcomingEventsSection: React.FC = () => (
  <section className="py-20 bg-white">
    <div className="max-w-6xl mx-auto px-4 sm:px-6">
      <div className="text-center mb-16">
        <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
          What's Coming Next
        </h2>
        <p className="text-lg text-gray-600">Mark your calendar for these exciting events</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {UPCOMING_EVENTS.map((event, i) => (
          <div key={i} className="rounded-2xl border-2 border-gray-200 overflow-hidden hover:shadow-xl transition-shadow bg-white flex flex-col">
            <div className={`h-2 bg-gradient-to-r ${i % 2 === 0 ? 'from-blue-500 to-cyan-500' : 'from-purple-500 to-pink-500'}`} />
            <div className="p-8 flex flex-col flex-1">
              {event.category && (
                <span className="text-xs font-bold text-blue-500 uppercase tracking-wide mb-2">{event.category}</span>
              )}
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900 flex-1">{event.title}</h3>
                {event.title === 'Scratch Game Creation' ? (
                  <span className="px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ml-2 bg-green-100 text-green-700">
                    🎉 Open Now
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ml-2 bg-blue-100 text-blue-700">
                    ⏰ Upcoming
                  </span>
                )}
              </div>
              <p className="text-gray-600 text-sm mb-4">{event.date}</p>
              <p className="text-gray-700 mb-6 flex-1">{event.description}</p>
              {event.link ? (
                <a
                  href={event.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold rounded-lg hover:shadow-lg transition-shadow flex items-center justify-center gap-2 text-center"
                >
                  Register Now <FaArrowRight className="text-sm" />
                </a>
              ) : (
                <button onClick={() => toast.success('Registration feature coming soon!')} className="w-full px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold rounded-lg hover:shadow-lg transition-shadow flex items-center justify-center gap-2">
                  Register Now <FaArrowRight className="text-sm" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

// FAQs Section
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

// Testimonials Section
const TestimonialsSection: React.FC = () => (
  <section className="py-20 bg-white">
    <div className="max-w-6xl mx-auto px-4 sm:px-6">
      <div className="text-center mb-16">
        <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
          What Students Say
        </h2>
        <p className="text-lg text-gray-600">Real success stories from our participants</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          {
            name: 'Sarah Ahmed',
            school: 'Al Khaleej School',
            rating: 5,
            quote: 'This program changed my perspective on learning. The campus experience was unforgettable!',
          },
          {
            name: 'Mahmoud Hassan',
            school: 'Emirates International School',
            rating: 5,
            quote: 'I gained practical skills that will help me in my future career. Highly recommended!',
          },
          {
            name: 'Leena Patel',
            school: 'Global Academy',
            rating: 5,
            quote: 'The mentorship from university professors was incredible. I feel confident about my future.',
          },
        ].map((testimonial, i) => (
          <div key={i} className="p-8 bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl border border-blue-100">
            <div className="flex items-center gap-1 mb-4">
              {[...Array(testimonial.rating)].map((_, j) => (
                <FaStar key={j} className="text-amber-400" />
              ))}
            </div>
            <FaQuoteLeft className="text-3xl text-gray-300 mb-4" />
            <p className="text-gray-700 mb-6 italic">"{testimonial.quote}"</p>
            <div>
              <p className="font-bold text-gray-900">{testimonial.name}</p>
              <p className="text-sm text-gray-600">{testimonial.school}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

// Registration Form Section
const RegistrationFormSection: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    studentName: '',
    grade: '',
    schoolName: '',
    location: '',
    email: '',
    phone: '',
    interest: '',
    customInterest: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const finalInterest = formData.interest === 'Others' ? formData.customInterest : formData.interest;
      const submitData = {
        ...formData,
        interest: finalInterest
      };
      const response = await api.post('/students/public-register', submitData);
      if (response.data.success) {
        toast.success(response.data.message || 'Registration submitted! Check your email for details.');
        setFormData({
          studentName: '',
          grade: '',
          schoolName: '',
          location: '',
          email: '',
          phone: '',
          interest: '',
          customInterest: '',
        });
      }
    } catch (error: any) {
      console.error('Registration failed:', error);
      toast.error(error.response?.data?.message || 'Failed to submit registration. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="register-form" className="py-20 bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="bg-white rounded-3xl p-8 md:p-12 border-2 border-gray-200 shadow-xl">
          <h2 className="text-4xl font-bold text-gray-900 mb-2 text-center">
            Register Now
          </h2>
          <p className="text-gray-600 text-center mb-8">
            Fill in your details to join the KidRove Student Program
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Student Name *
                </label>
                <input
                  type="text"
                  name="studentName"
                  value={formData.studentName}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="Your name"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Grade *
                </label>
                <select
                  name="grade"
                  value={formData.grade}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                >
                  <option value="">Select your grade</option>
                  {[...Array(12)].map((_, i) => (
                    <option key={i} value={`Grade ${i + 1}`}>Grade {i + 1}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  School Name *
                </label>
                <input
                  type="text"
                  name="schoolName"
                  value={formData.schoolName}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="Your school"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  City/Country *
                </label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="City, Country"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="Your email"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Phone *
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="Your phone number"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Area of Interest *
                </label>
                <select
                  name="interest"
                  value={formData.interest}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                >
                  <option value="">Select your interest</option>
                  <option value="Innovation & Tech">Innovation & Tech Challenges</option>
                  <option value="Communication">Communication & Leadership</option>
                  <option value="Entrepreneurship">Entrepreneurship Competitions</option>
                  <option value="Creative">Creative & Media Events</option>
                  <option value="Others">Others</option>
                </select>
                {formData.interest === 'Others' && (
                  <div className="mt-4">
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Please specify your interest *
                    </label>
                    <input
                      type="text"
                      name="customInterest"
                      value={formData.customInterest}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                      placeholder="Type your area of interest..."
                    />
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold text-lg rounded-lg hover:shadow-xl hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Submitting...' : 'Register Now 🚀'}
            </button>

            <p className="text-center text-xs text-gray-500">
              We respect your privacy. Your information will never be shared with third parties.
            </p>
          </form>
        </div>
      </div>
    </section>
  );
};

// Final CTA Section
const FinalCTASection: React.FC = () => (
  <section className="py-20 bg-white">
    <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
      <h2 className="text-5xl font-bold text-gray-900 mb-6">
        Ready to Begin Your Journey?
      </h2>
      <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
        Don't miss out on this incredible opportunity to showcase your talent, learn from experts, and prepare for a bright future.
      </p>

      <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
        <button
          onClick={() => document.getElementById('register-form')?.scrollIntoView({ behavior: 'smooth' })}
          className="px-10 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold text-lg rounded-full hover:shadow-2xl hover:scale-105 transition-all duration-200"
        >
          👉 Register Now
        </button>
      </div>
    </div>
  </section>
);

/* ─── Main Component ──────────────────────────– */
const StudentProgramPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white font-sans">
      <HeroSection />
      <WhatIsSection />
      <OpportunitiesSection />
      <JourneySection />
      <BenefitsSection />
      <CampusExperienceSection />
      <SchoolPartnershipSection />
      <UpcomingEventsSection />
      <TestimonialsSection />
      <FAQsSection />
      <RegistrationFormSection />
      <FinalCTASection />
    </div>
  );
};

export default StudentProgramPage;
