import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaSearch, FaStar, FaUsers, FaChalkboardTeacher,
  FaLaptop, FaMapMarkerAlt, FaCheckCircle, FaTimes,
} from 'react-icons/fa';
import { MdOutlineSort } from 'react-icons/md';
import { useQuery } from '@tanstack/react-query';
import { useEventsQuery } from '@/hooks/queries/useEventsQuery';
import { useHomepageQuery } from '@/hooks/queries/useHomepageQuery';
import teacherAPI from '@/services/api/teacherAPI';
import { API_BASE_URL } from '@/config/api';
import type { ITeacher } from '@/types/teacher';
interface PublicTeacher {
  user: {
    _id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    email: string;
  };
  teacher: ITeacher;
  stats: {
    totalEvents: number;
    totalStudents: number;
    averageRating?: number;
  };
}
type SortOption = 'rating' | 'students' | 'events' | 'newest';
type ModeFilter = 'all' | 'online' | 'offline' | 'hybrid';
const SORT_LABELS: Record<SortOption, string> = {
  rating: 'Top Rated',
  students: 'Most Students',
  events: 'Most Events',
  newest: 'Newest',
};
const MODE_ICONS: Record<string, React.ReactNode> = {
  online: <FaLaptop className="w-3 h-3" />,
  offline: <FaMapMarkerAlt className="w-3 h-3" />,
  hybrid: <FaChalkboardTeacher className="w-3 h-3" />,
};
const API_ORIGIN = (() => {
  try {
    return new URL(API_BASE_URL).origin;
  } catch {
    return '';
  }
})();
const normalizeImageUrl = (url?: string) => {
  if (!url) return '';
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  if (API_ORIGIN && url.startsWith('/')) {
    return `${API_ORIGIN}${url}`;
  }
  return url;
};
// ── Skeleton card ─────────────────────────────────────────────
const SkeletonCard: React.FC = () => (
  <div className="bg-white rounded-2xl shadow-sm overflow-hidden animate-pulse">
    <div className="h-24 bg-gray-200" />
    <div className="px-4 pb-5">
      <div className="flex justify-center -mt-10 mb-3">
        <div className="w-20 h-20 rounded-full bg-gray-300 border-4 border-white" />
      </div>
      <div className="flex flex-col items-center gap-2">
        <div className="h-4 w-32 bg-gray-200 rounded" />
        <div className="h-3 w-24 bg-gray-100 rounded" />
        <div className="flex gap-1 mt-1">
          <div className="h-5 w-14 bg-gray-100 rounded-full" />
          <div className="h-5 w-14 bg-gray-100 rounded-full" />
        </div>
        <div className="flex gap-4 mt-2">
          <div className="h-3 w-12 bg-gray-100 rounded" />
          <div className="h-3 w-12 bg-gray-100 rounded" />
        </div>
      </div>
    </div>
  </div>
);
const defaultTeacherCovers = [
  'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1543269865-cbf427effbad?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1510531704581-5b2870972060?q=80&w=800&auto=format&fit=crop'
];
// ── Teacher card ──────────────────────────────────────────────
const TeacherCard: React.FC<{ t: PublicTeacher; idx: number }> = ({ t, idx }) => {
  const isVerified = t.teacher.verificationStatus === 'verified';
  const mode = t.teacher.teachingMode;
  // Use avatar as primary image, cover image as fallback, or random default
  const cardImage = t.user.avatar ? normalizeImageUrl(t.user.avatar) :
    t.teacher.coverImage ? normalizeImageUrl(t.teacher.coverImage) :
      defaultTeacherCovers[idx % defaultTeacherCovers.length];
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(idx * 0.04, 0.4) }}
    >
      <Link
        to={`/teachers/${t.user._id}`}
        className="block relative group rounded-2xl overflow-hidden aspect-[4/5] shadow-sm hover:shadow-xl transition-all duration-300"
      >
        {/* Background Image */}
        <div className="absolute inset-0 bg-gray-200">
          <img
            src={cardImage}
            alt={`${t.user.firstName} ${t.user.lastName}`}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
          />
          {/* Gradient Overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-purple-900/60 via-transparent to-transparent opacity-60 transition-opacity duration-300 group-hover:opacity-80" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80" />
        </div>
        {/* Mode badge */}
        {mode && (
          <div className="absolute top-3 right-3 z-10">
            <span
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold capitalize backdrop-blur-md shadow-sm
                          ${mode === 'online' ? 'bg-blue-500/80 text-white' :
                  mode === 'offline' ? 'bg-amber-500/80 text-white' :
                    'bg-violet-500/80 text-white'}`}
            >
              {MODE_ICONS[mode]}
              {mode}
            </span>
          </div>
        )}
        {isVerified && (
          <div className="absolute top-3 left-3 z-10">
            <div className="bg-white/90 backdrop-blur-md rounded-full p-1 shadow-sm">
              <FaCheckCircle className="w-5 h-5 text-blue-500" title="Verified teacher" />
            </div>
          </div>
        )}
        {/* Content Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-5 text-white transform transition-transform duration-300">
          <div className="mb-2">
            <h3 className="text-lg sm:text-xl font-bold leading-tight mb-1 group-hover:text-purple-300 transition-colors">
              {t.user.firstName} {t.user.lastName}
            </h3>
            {t.teacher.specialization && (
              <p className="text-sm font-medium opacity-90 truncate">
                {t.teacher.specialization}
              </p>
            )}
          </div>
          {/* Subjects */}
          {t.teacher.subjects && t.teacher.subjects.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {t.teacher.subjects.slice(0, 2).map((sub) => (
                <span
                  key={sub}
                  className="px-2 py-0.5 bg-white/20 backdrop-blur-sm rounded-full text-[10px] font-medium"
                >
                  {sub}
                </span>
              ))}
              {t.teacher.subjects.length > 2 && (
                <span className="px-2 py-0.5 bg-white/10 backdrop-blur-sm rounded-full text-[10px]">
                  +{t.teacher.subjects.length - 2}
                </span>
              )}
            </div>
          )}
          {/* Stats */}
          <div className="flex items-center gap-4 text-xs opacity-90 pt-3 border-t border-white/20">
            {t.stats?.averageRating != null && (
              <span className="flex items-center gap-1 font-medium">
                <FaStar className="text-yellow-400 w-3 h-3" />
                {t.stats.averageRating.toFixed(1)}
              </span>
            )}
            {t.stats?.totalStudents != null && (
              <span className="flex items-center gap-1">
                <FaUsers className="w-3 h-3" />
                {t.stats.totalStudents.toLocaleString()}
              </span>
            )}
            {t.teacher.yearsOfExperience != null && t.teacher.yearsOfExperience > 0 && (
              <span className="flex items-center gap-1 ml-auto font-medium text-purple-200">
                {t.teacher.yearsOfExperience}y exp
              </span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
};
// ── Main page ─────────────────────────────────────────────────
const TeachersListingPage: React.FC = () => {
  const [teachers, setTeachers] = useState<PublicTeacher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [modeFilter, setModeFilter] = useState<ModeFilter>('all');
  const [activeSubject, setActiveSubject] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [showSort, setShowSort] = useState(false);

  const { data: classesData } = useEventsQuery({
    type: 'Course,Workshop,Class,Bootcamp,Masterclass',
    status: 'published'
  });
  const totalClasses = classesData?.pagination?.totalEvents || classesData?.pagination?.total || 0;

  const { data: homeData } = useHomepageQuery();
  const totalStudents = homeData?.stats?.totalStudents || 0;

  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        setIsLoading(true);
        const response = await (teacherAPI as any).getPublicTeachersList?.();
        setTeachers(response?.teachers || []);
      } catch {
        setError('Failed to load teachers. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchTeachers();
  }, []);
  // Collect all subjects across teachers
  const allSubjects = useMemo(() => {
    const set = new Set<string>();
    teachers.forEach((t) => t.teacher.subjects?.forEach((s) => set.add(s)));
    return Array.from(set).sort();
  }, [teachers]);
  // Filter + sort
  const filtered = useMemo(() => {
    let list = teachers.filter((t) => {
      const name = `${t.user.firstName} ${t.user.lastName}`.toLowerCase();
      const spec = (t.teacher.specialization || '').toLowerCase();
      const q = search.toLowerCase();
      if (q && !name.includes(q) && !spec.includes(q)) return false;
      if (modeFilter !== 'all' && t.teacher.teachingMode !== modeFilter) return false;
      if (activeSubject && !t.teacher.subjects?.includes(activeSubject)) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return (b.stats?.averageRating ?? 0) - (a.stats?.averageRating ?? 0);
        case 'students':
          return (b.stats?.totalStudents ?? 0) - (a.stats?.totalStudents ?? 0);
        case 'events':
          return (b.stats?.totalEvents ?? 0) - (a.stats?.totalEvents ?? 0);
        case 'newest':
          return (
            new Date(b.teacher.createdAt).getTime() -
            new Date(a.teacher.createdAt).getTime()
          );
        default:
          return 0;
      }
    });
    return list;
  }, [teachers, search, modeFilter, activeSubject, sortBy]);
  const hasFilters = search || modeFilter !== 'all' || activeSubject;
  const clearFilters = () => {
    setSearch('');
    setModeFilter('all');
    setActiveSubject(null);
  };
  return (

    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="relative overflow-hidden pt-0 pb-0">
        <div className="absolute inset-0 bg-[#fdfbf6]">
          <img
            src="/assets/teacherbanner.png"
            alt="Teachers Header"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="container mx-auto px-4 text-center relative z-10 pt-10 pb-8">

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#f3f0ff] border border-purple-100 text-[#6d28d9] font-semibold text-sm mb-6 shadow-sm">
            <FaChalkboardTeacher className="text-[#6d28d9]" />
            Expert Educators & Instructors
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-[#111827] mb-4 mt-7 leading-tight tracking-tight">
            Learn from <br className="hidden sm:block" />
            <span className="relative inline-block mt-2 sm:mt-0">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#4f46e5] to-[#7c3aed]">
                Amazing Teachers
              </span>
              {/* Decorative red sunburst lines */}
              <svg className="absolute -right-8 -top-8 w-10 h-10 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                <path d="M12 2v2m10 8h-2M4 12H2m17.07-7.07l-1.42 1.42M6.34 6.34L4.93 4.93m14.14 14.14l-1.42-1.42M6.34 17.66l-1.42 1.42" />
              </svg>
            </span>
          </h1>

          <p className="text-gray-500 text-base sm:text-lg mb-10 pt-4 max-w-2xl mx-auto font-medium leading-relaxed">
            Browse certified educators teaching arts, sports, coding, music, <br className="hidden sm:block" />
            languages and more for kids across the UAE.
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto relative mb-12">
            <div className="flex items-center bg-white rounded-full p-2 mt-17 shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-gray-100">
              <FaSearch className="text-gray-400 ml-4 mr-2 text-lg" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or subject..."
                className="flex-1 border-none focus:ring-0 text-gray-700 placeholder-gray-400 bg-transparent text-base px-2 py-2 outline-none"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="mr-3 text-gray-400 hover:text-gray-600"
                >
                  <FaTimes className="w-4 h-4" />
                </button>
              )}
              <button className="bg-gradient-to-r from-[#4f46e5] to-[#7c3aed] hover:from-[#4338ca] hover:to-[#6d28d9] text-white font-bold px-8 py-3.5 rounded-full transition-all shadow-sm">
                Search
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="flex flex-wrap justify-center gap-4 max-w-4xl mx-auto">
            {/* Stat 1 */}
            <div className="flex items-center gap-4 bg-white rounded-2xl px-6 py-4 shadow-sm border border-red-100 min-w-[200px]">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                <FaUsers className="text-red-400 text-xl" />
              </div>
              <div className="text-left">
                <p className="text-2xl font-bold text-gray-900 leading-tight">{teachers.length > 0 ? `${teachers.length}+` : '0'}</p>
                <p className="text-sm font-medium text-gray-500">Verified Teachers</p>
              </div>
            </div>
            {/* Stat 2 */}
            <div className="flex items-center gap-4 bg-white rounded-2xl px-6 py-4 shadow-sm border border-purple-100 min-w-[200px]">
              <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div className="text-left">
                <p className="text-2xl font-bold text-gray-900 leading-tight">{totalClasses > 0 ? `${totalClasses}+` : '0'}</p>
                <p className="text-sm font-medium text-gray-500">Total classes</p>
              </div>
            </div>
            {/* Stat 3 */}
            <div className="flex items-center gap-4 bg-white rounded-2xl px-6 py-4 shadow-sm border border-emerald-100 min-w-[200px]">
              <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M12 14l9-5-9-5-9 5 9 5z" />
                  <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
                </svg>
              </div>
              <div className="text-left">
                <p className="text-2xl font-bold text-gray-900 leading-tight">{totalStudents > 0 ? `${totalStudents}+` : '0'}</p>
                <p className="text-sm font-medium text-gray-500">Students Taught</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Filters bar */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-100 shadow-sm">
        <div className="container mx-auto px-4 py-3 flex flex-wrap items-center gap-3">
          {/* Mode filter */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {(['all', 'online', 'offline', 'hybrid'] as ModeFilter[]).map((m) => (
              <button
                key={m}
                onClick={() => setModeFilter(m)}
                className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors
                  ${modeFilter === m
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
              >
                {m === 'all' ? 'All Modes' : m}
              </button>
            ))}
          </div>
          {/* Divider */}
          <div className="h-4 w-px bg-gray-200 hidden sm:block" />
          {/* Subject chips (top 8) */}
          <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
            {allSubjects.slice(0, 8).map((sub) => (
              <button
                key={sub}
                onClick={() => setActiveSubject(activeSubject === sub ? null : sub)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors
                  ${activeSubject === sub
                    ? 'bg-indigo-600 text-white'
                    : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                  }`}
              >
                {sub}
              </button>
            ))}
          </div>
          {/* Sort */}
          <div className="relative ml-auto">
            <button
              onClick={() => setShowSort((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200
                         text-gray-600 rounded-lg text-xs font-medium transition-colors"
            >
              <MdOutlineSort className="w-4 h-4" />
              {SORT_LABELS[sortBy]}
            </button>
            <AnimatePresence>
              {showSort && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute right-0 top-full mt-1 w-40 bg-white rounded-xl shadow-lg
                             border border-gray-100 overflow-hidden z-30"
                >
                  {(Object.keys(SORT_LABELS) as SortOption[]).map((opt) => (
                    <button
                      key={opt}
                      onClick={() => { setSortBy(opt); setShowSort(false); }}
                      className={`w-full text-left px-3 py-2 text-xs hover:bg-purple-50
                                  transition-colors
                        ${sortBy === opt ? 'text-purple-600 font-medium bg-purple-50' : 'text-gray-600'}`}
                    >
                      {SORT_LABELS[opt]}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
      {/* Content */}
      <div className="container mx-auto px-4 py-10">
        {/* Results summary */}
        {!isLoading && (
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-gray-500">
              {filtered.length === 0
                ? 'No teachers found'
                : `${filtered.length} teacher${filtered.length !== 1 ? 's' : ''}`}
              {hasFilters && (
                <span className="text-gray-400"> (filtered)</span>
              )}
            </p>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="text-xs text-purple-600 hover:text-purple-800 flex items-center gap-1"
              >
                <FaTimes className="w-3 h-3" />
                Clear filters
              </button>
            )}
          </div>
        )}
        {/* Loading skeletons */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}
        {/* Error */}
        {error && !isLoading && (
          <div className="text-center py-20">
            <p className="text-red-500 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 text-sm"
            >
              Retry
            </button>
          </div>
        )}
        {/* Empty */}
        {!isLoading && !error && filtered.length === 0 && (
          <div className="text-center py-20">
            <FaChalkboardTeacher className="w-14 h-14 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-400 text-lg font-medium mb-1">No teachers found</p>
            <p className="text-gray-400 text-sm">
              {hasFilters
                ? 'Try adjusting your filters.'
                : 'Check back soon.'}
            </p>
          </div>
        )}
        {/* Grid */}
        {!isLoading && !error && filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map((t, idx) => (
              <TeacherCard key={t.user._id} t={t} idx={idx} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
export default TeachersListingPage;