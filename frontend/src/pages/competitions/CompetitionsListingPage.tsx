import React, { useState, useMemo } from 'react';
import { FiAward, FiGlobe, FiCheckCircle } from 'react-icons/fi';
import { FaGraduationCap } from 'react-icons/fa';
import {
  FaTrophy,
  FaSearch,
  FaTimes,
  FaExternalLinkAlt
} from 'react-icons/fa';
import SEO from '@/components/common/SEO';

export interface CompetitionListingItem {
  id: string;
  slug: string;
  title: string;
  badge: string;
  category: string;
  tagline: string;
  description: string;
  coverImage: string;
  status: 'active' | 'upcoming' | 'concluded';
  grades: string;
  duration: string;
  bgColor: string;
  link: string;
}

export const COMPETITIONS_DATA: CompetitionListingItem[] = [
  {
    id: 'gcc-reel-challenge',
    slug: 'gcc-reel-challenge',
    title: 'GCC Through My Lens — Reel Challenge 2027',
    badge: '📱 GCC Mobile Reel Challenge',
    category: 'Mobile Video & Filmmaking',
    tagline: 'Ramadan & Eid Through My Mobile Camera — Capture the Spirit. Share the Moment.',
    description: 'A regional mobile video reel competition celebrating the joyful moments of Ramadan and Eid. Open to students Kindergarten through Grade 12 across all 6 GCC member nations.',
    coverImage: '/assets/ramdan.png',
    status: 'upcoming',
    grades: 'Grades K–12',
    duration: 'Competition: February 2027',
    bgColor: 'bg-indigo-50 text-indigo-900 border-indigo-200',
    link: '/competitions/gcc-reel-challenge'
  },
  {
    id: 'young-voices-of-the-gcc',
    slug: 'young-voices-of-the-gcc',
    title: 'Young Voices of the GCC 2027',
    badge: '🌍 GCC Creative Writing',
    category: 'Creative Writing',
    tagline: 'Our Heritage, Our Story — Six Countries. Many Cultures. One Shared Story.',
    description: 'A regional short-story writing competition for young authors across Bahrain, Kuwait, Oman, Qatar, Saudi Arabia, and the UAE celebrating Gulf culture and traditions.',
    coverImage: '/assets/gulf.png',
    status: 'upcoming',
    grades: 'Grades 3–12',
    duration: 'Competition: January 2027',
    bgColor: 'bg-teal-50 text-teal-700 border-teal-200',
    link: '/competitions/young-voices-of-the-gcc'
  },
  {
    id: 'national-day-art-competition',
    slug: 'national-day-art-competition',
    title: "Eid Al Etihad National Day Children's Art Competition 2026",
    badge: '🇦🇪 UAE National Day',
    category: 'Traditional Art',
    tagline: 'My UAE, My Pride — Celebrating Heritage, Culture & Future Visions',
    description: 'Honoring UAE National Day across all 7 Emirates. Students express patriotism through drawings, colourings, and paintings.',
    coverImage: '/assets/nationalart.png',
    status: 'active',
    grades: 'Grades K–12',
    duration: 'Deadline: 15 Dec 2026',
    bgColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    link: '/competitions/national-day-art-competition'
  },
  {
    id: 'ai-art-competition',
    slug: 'ai-art-competition',
    title: 'KidRove AI Art Competition 2026',
    badge: '🚀 AI & Creative Tech',
    category: 'Digital Art & AI',
    tagline: 'Reimagine Tomorrow — Where Human Imagination Meets Artificial Intelligence',
    description: 'Empowering students to harness ethical Generative AI tools to produce visionary creative artworks.',
    coverImage: '/assets/dubb.png',
    status: 'active',
    grades: 'Grades K–12',
    duration: 'Deadline: 10 Nov 2026',
    bgColor: 'bg-purple-50 text-purple-700 border-purple-200',
    link: '/competitions/ai-art-competition'
  }
];

const CompetitionsListingPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCompetitions = useMemo(() => {
    return COMPETITIONS_DATA.filter(comp => {
      return (
        comp.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        comp.tagline.toLowerCase().includes(searchTerm.toLowerCase()) ||
        comp.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        comp.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  }, [searchTerm]);

  const breadcrumbs = [
    { name: 'Home', url: '/' },
    { name: 'Competitions', url: '/competitions' }
  ];

  return (
    <div className="min-h-screen bg-gray-50/70 text-slate-900 font-sans pb-24">
      <SEO
        title="Student Competitions & Challenges 2026 | KidRove"
        description="Explore prestigious student competitions in traditional art, AI creative tech, debate, and science. Register now to showcase your talent, win awards, and earn verified credentials."
        keywords={['student competitions', 'kidrove competitions', 'ai art competition', 'national day art competition', 'uae competitions']}
        breadcrumbs={breadcrumbs}
      />

      {/* ── 1. Hero Header ── */}
      <div
        className="relative overflow-hidden bg-cover bg-center bg-no-repeat pt-20 pb-20 sm:pt-24 sm:pb-24"
        style={{ backgroundImage: "url('/assets/competitions.png')" }}
      >
        <div className="container mx-auto px-4 text-center relative z-10 max-w-5xl">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#0a1a38]/85 border border-amber-500/80 text-amber-400 font-semibold text-xs sm:text-sm mb-6 shadow-md backdrop-blur-sm">
            <FaTrophy className="text-amber-400 text-sm" />
            <span>Prestigious Student Challenges & Awards</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white mb-5 leading-tight tracking-tight drop-shadow-md">
            Discover & Compete in <br />
            <span className="bg-gradient-to-r from-amber-400 via-orange-300 to-emerald-400 bg-clip-text text-transparent">
              Inspiring Global Competitions
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-200 max-w-2xl mx-auto leading-relaxed font-medium">
            Empowering students from Kindergarten to Grade 12 to showcase their creativity, technological mastery, and critical thinking on grand stages.
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto relative mt-8 mb-12 sm:mb-16 px-2 sm:px-0">
            <div className="flex items-center bg-white rounded-full p-1.5 sm:p-2 shadow-[0_8px_30px_rgb(0,0,0,0.25)] border border-gray-100">
              <FaSearch className="text-gray-400 ml-3 sm:ml-4 mr-1 sm:mr-2 text-sm sm:text-base flex-shrink-0" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search competitions by title, category, or keyword..."
                className="flex-1 border-none focus:ring-0 text-gray-700 placeholder-gray-400 bg-transparent text-sm sm:text-base px-2 py-1.5 sm:py-2 outline-none min-w-0"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="mr-2 sm:mr-3 text-gray-400 hover:text-gray-600 flex-shrink-0"
                  aria-label="Clear search"
                >
                  <FaTimes className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                className="bg-[#34d399] hover:bg-emerald-500 text-white text-sm sm:text-base font-bold px-5 sm:px-8 py-2 sm:py-3 rounded-full transition-colors flex-shrink-0 shadow-sm"
              >
                Search
              </button>
            </div>
          </div>

        </div>

        {/* ── Wide 4-Metric Highlights: Full Width max-w-7xl matching GCC Reel Challenge ── */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 sm:mt-16 md:mt-24 pb-4 sm:pb-6 relative z-10 w-full">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 text-left">
            {/* Card 1: AED 50K+ Prize Pools (Amber / Gold Accent) */}
            <div className="bg-gradient-to-br from-amber-500/25 to-yellow-600/15 backdrop-blur-xl border border-white/25 rounded-2xl p-5 sm:p-6 flex items-center gap-4 shadow-lg hover:-translate-y-1 transition-all">
              <div className="w-12 h-12 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center text-amber-300 shrink-0 text-2xl">
                🏆
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-amber-200 mb-0.5">AED 50K+ PRIZES</p>
                <p className="text-base sm:text-lg font-black text-white">Prize Pools & Grants</p>
                <p className="text-xs text-slate-200">Cash awards & tech prizes</p>
              </div>
            </div>

            {/* Card 2: 7 Emirates Nationwide (Emerald / Cyan Accent) */}
            <div className="bg-gradient-to-br from-emerald-500/25 to-teal-600/15 backdrop-blur-xl border border-white/25 rounded-2xl p-5 sm:p-6 flex items-center gap-4 shadow-lg hover:-translate-y-1 transition-all">
              <div className="w-12 h-12 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center text-emerald-300 shrink-0 text-2xl">
                🌍
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-emerald-200 mb-0.5">7 EMIRATES</p>
                <p className="text-base sm:text-lg font-black text-white">Nationwide & Global</p>
                <p className="text-xs text-slate-200">Open for all student entries</p>
              </div>
            </div>

            {/* Card 3: Grades K-12 Cohorts (Sky / Indigo Accent) */}
            <div className="bg-gradient-to-br from-sky-500/25 to-indigo-600/15 backdrop-blur-xl border border-white/25 rounded-2xl p-5 sm:p-6 flex items-center gap-4 shadow-lg hover:-translate-y-1 transition-all">
              <div className="w-12 h-12 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center text-sky-300 shrink-0 text-2xl">
                🎓
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-sky-200 mb-0.5">GRADES K–12</p>
                <p className="text-base sm:text-lg font-black text-white">Age-Group Cohorts</p>
                <p className="text-xs text-slate-200">Fair evaluation tiers</p>
              </div>
            </div>

            {/* Card 4: 100% Verified Certificates (Purple / Violet Accent) */}
            <div className="bg-gradient-to-br from-purple-500/25 to-fuchsia-600/15 backdrop-blur-xl border border-white/25 rounded-2xl p-5 sm:p-6 flex items-center gap-4 shadow-lg hover:-translate-y-1 transition-all">
              <div className="w-12 h-12 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center text-purple-300 shrink-0 text-2xl">
                🎖️
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-purple-200 mb-0.5">100% VERIFIED</p>
                <p className="text-base sm:text-lg font-black text-white">Verified Certificates</p>
                <p className="text-xs text-slate-200">Commemorative credentials</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. Competitions Cards Grid ── */}
      <div className="container mx-auto px-4 mt-12 max-w-6xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Active Competitions</h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Showing {filteredCompetitions.length} competition{filteredCompetitions.length === 1 ? '' : 's'} open for student entries
            </p>
          </div>
        </div>

        {filteredCompetitions.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-gray-200 p-8">
            <FaTrophy className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-gray-700">No competitions found</h3>
            <p className="text-sm text-gray-400 mt-1">Try refining your search keyword.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
            {filteredCompetitions.map(comp => (
              <div
                key={comp.id}
                onClick={() => {
                  window.location.href = comp.link;
                }}
                className="group relative bg-white rounded-3xl overflow-hidden shadow-soft hover:shadow-medium border border-slate-100/80 cursor-pointer transform hover:-translate-y-1.5 transition-all duration-300 flex flex-col h-[390px]"
              >
                {/* Card Image Area */}
                <div className="h-56 w-full relative overflow-hidden bg-slate-900 flex items-center justify-center p-4">
                  <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                    style={{ backgroundImage: `url('${comp.coverImage}')` }}
                  />

                  {/* Top Badge */}
                  <div className="absolute top-4 left-4 z-10">
                    <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-emerald-500 text-white shadow-sm flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                      Live & Open
                    </span>
                  </div>

                  {/* Visual cover gradient on hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-6">
                    <div className="px-4 py-2 rounded-xl bg-sky-500/80 backdrop-blur-md text-white text-xs font-bold border border-white/25 shadow-sm transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 flex items-center gap-1.5">
                      <span>View Competition Page</span>
                      <FaExternalLinkAlt className="text-[10px]" />
                    </div>
                  </div>
                </div>

                {/* Card Info Area */}
                <div className="p-6 flex-grow flex flex-col justify-between">
                  <div>
                    {/* Category Pill Tag */}
                    <span className={`text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-md border ${comp.bgColor}`}>
                      {comp.category}
                    </span>

                    {/* Title */}
                    <h3 className="font-extrabold text-slate-800 text-lg mt-3 group-hover:text-sky-600 transition-colors leading-snug line-clamp-2">
                      {comp.title}
                    </h3>
                  </div>

                  {/* Card Meta Row */}
                  <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-2">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
                      <span>{comp.grades}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 font-bold bg-slate-100 px-2.5 py-1 rounded-full">
                      <span>{comp.duration}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CompetitionsListingPage;
