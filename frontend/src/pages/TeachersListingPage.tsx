import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaSearch, FaStar, FaUsers, FaChalkboardTeacher,
  FaLaptop, FaMapMarkerAlt, FaCheckCircle, FaTimes,
} from 'react-icons/fa';
import { MdOutlineSort } from 'react-icons/md';
import teacherAPI from '@/services/api/teacherAPI';
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

// ── Teacher card ──────────────────────────────────────────────
const TeacherCard: React.FC<{ t: PublicTeacher; idx: number }> = ({ t, idx }) => {
  const isVerified = t.teacher.verificationStatus === 'verified';
  const mode = t.teacher.teachingMode;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(idx * 0.04, 0.4) }}
    >
      <Link
        to={`/teachers/${t.user._id}`}
        className="block bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all
                   duration-300 overflow-hidden group border border-gray-100
                   hover:border-purple-200"
      >
        {/* Cover */}
        <div className="h-24 bg-gradient-to-r from-purple-500 to-indigo-500 relative overflow-hidden">
          {t.teacher.coverImage && (
            <img
              src={t.teacher.coverImage}
              alt="cover"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          )}
          {/* Mode badge */}
          {mode && (
            <span
              className={`absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5
                          rounded-full text-xs font-medium capitalize
                          ${MODE_COLORS[mode] ?? 'bg-gray-100 text-gray-600'}`}
            >
              {MODE_ICONS[mode]}
              {mode}
            </span>
          )}
        </div>

        <div className="px-4 pb-5">
          {/* Avatar */}
          <div className="flex justify-center -mt-10 mb-2">
            <div className="relative">
              <div className="w-20 h-20 rounded-full border-4 border-white shadow-md overflow-hidden
                              bg-gradient-to-br from-purple-400 to-indigo-400">
                {t.user.avatar ? (
                  <img
                    src={t.user.avatar}
                    alt={t.user.firstName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white
                                  text-2xl font-bold">
                    {t.user.firstName?.[0]}
                  </div>
                )}
              </div>
              {isVerified && (
                <FaCheckCircle
                  className="absolute -bottom-0.5 -right-0.5 w-5 h-5 text-blue-500
                             bg-white rounded-full"
                  title="Verified teacher"
                />
              )}
            </div>
          </div>

          {/* Name + specialization */}
          <div className="text-center">
            <h3 className="font-bold text-gray-900 group-hover:text-purple-600
                           transition-colors leading-tight">
              {t.user.firstName} {t.user.lastName}
            </h3>
            {t.teacher.specialization && (
              <p className="text-xs text-gray-500 mt-0.5 truncate">
                {t.teacher.specialization}
              </p>
            )}
            {t.teacher.yearsOfExperience != null && t.teacher.yearsOfExperience > 0 && (
              <p className="text-xs text-purple-500 font-medium mt-0.5">
                {t.teacher.yearsOfExperience}y exp
              </p>
            )}
          </div>

          {/* Subject chips */}
          {t.teacher.subjects && t.teacher.subjects.length > 0 && (
            <div className="flex flex-wrap justify-center gap-1 mt-2">
              {t.teacher.subjects.slice(0, 3).map((sub) => (
                <span
                  key={sub}
                  className="px-2 py-0.5 bg-purple-50 text-purple-600 rounded-full text-xs"
                >
                  {sub}
                </span>
              ))}
              {t.teacher.subjects.length > 3 && (
                <span className="px-2 py-0.5 bg-gray-50 text-gray-500 rounded-full text-xs">
                  +{t.teacher.subjects.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Stats row */}
          <div className="flex items-center justify-center gap-4 mt-3 text-xs text-gray-500">
            {t.stats?.averageRating != null && (
              <span className="flex items-center gap-1">
                <FaStar className="text-yellow-400 w-3 h-3" />
                <span className="font-medium text-gray-700">
                  {t.stats.averageRating.toFixed(1)}
                </span>
              </span>
            )}
            {t.stats?.totalStudents != null && (
              <span className="flex items-center gap-1">
                <FaUsers className="w-3 h-3" />
                {t.stats.totalStudents.toLocaleString()}
              </span>
            )}
            {t.stats?.totalEvents != null && (
              <span className="flex items-center gap-1">
                <FaChalkboardTeacher className="w-3 h-3" />
                {t.stats.totalEvents}
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
  const [sortBy, setSortBy] = useState<SortOption>('rating');
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
      <div className="bg-gradient-to-r from-purple-700 to-indigo-700 text-white py-14">
        <div className="container mx-auto px-4 text-center">
          <motion.h1
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3"
          >
            Meet Our Teachers
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-purple-200 text-base mb-8 max-w-xl mx-auto"
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
