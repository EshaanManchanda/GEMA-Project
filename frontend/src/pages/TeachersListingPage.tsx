import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaSearch, FaStar, FaUsers, FaChalkboardTeacher,
  FaLaptop, FaMapMarkerAlt, FaCheckCircle, FaTimes,
} from 'react-icons/fa';
import { MdOutlineSort } from 'react-icons/md';
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
const MODE_COLORS: Record<string, string> = {
  online: 'bg-blue-100 text-blue-700',
  offline: 'bg-amber-100 text-amber-700',
  hybrid: 'bg-violet-100 text-violet-700',
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
      <div className="relative py-28 sm:py-48 overflow-hidden">
        {/* Background Image & Overlay */}
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1577896851231-70ef18881754?q=80&w=2070&auto=format&fit=crop"
            alt="Teachers Header"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-[2px]" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-transparent" />
        </div>
        <div className="container mx-auto px-4 text-center relative z-10 text-white">
          <motion.h1
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 drop-shadow-lg"
          >
            Meet Our <span className='text-purple-400'>Teachers</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-purple-300 text-base sm:text-lg mb-8 max-w-2xl mx-auto drop-shadow-md font-medium"
          >
            Learn from passionate educators across a variety of subjects
          </motion.p>
          {/* Search */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 }}
            className="max-w-lg mx-auto relative"
          >
            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or subject..."
              className="w-full pl-11 pr-4 py-3 rounded-xl text-gray-900 focus:outline-none
                         focus:ring-2 focus:ring-white shadow-lg text-sm"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400
                           hover:text-gray-600"
              >
                <FaTimes className="w-3.5 h-3.5" />
              </button>
            )}
          </motion.div>
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