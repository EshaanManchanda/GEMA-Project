import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaSearch, FaStar, FaUsers, FaChalkboardTeacher, FaSpinner } from 'react-icons/fa';
import teacherAPI from '@/services/api/teacherAPI';
import type { ITeacher } from '@/types/teacher';
import { API_BASE_URL } from '@/config/api';

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

const TeachersListingPage: React.FC = () => {
  const [teachers, setTeachers] = useState<PublicTeacher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        setIsLoading(true);
        const response = await teacherAPI.getPublicTeachersList() as any;
        const rawTeachers = Array.isArray(response?.teachers) ? response.teachers : [];

        // Normalize to page shape for both legacy and current API payloads.
        const normalized: PublicTeacher[] = rawTeachers.map((item: any) => {
          if (item?.teacher && item?.user) {
            return item as PublicTeacher;
          }

          return {
            user: item?.user || {
              _id: item?.userId || item?._id || '',
              firstName: '',
              lastName: '',
              email: '',
            },
            teacher: item,
            stats: item?.stats || {
              totalEvents: 0,
              totalStudents: 0,
              averageRating: undefined,
            },
          };
        });

        setTeachers(normalized);
      } catch (err) {
        setError('Failed to load teachers. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchTeachers();
  }, []);

  const filtered = teachers.filter((t) => {
    const name = `${t.user.firstName} ${t.user.lastName}`.toLowerCase();
    const spec = (t.teacher.specialization || '').toLowerCase();
    const q = search.toLowerCase();
    return name.includes(q) || spec.includes(q);
  });

  const toAbsoluteMediaUrl = (url?: string): string => {
    if (!url) return '';
    if (/^https?:\/\//i.test(url)) return url;

    const apiOrigin = API_BASE_URL.replace(/\/api\/?$/, '');
    if (url.startsWith('/')) {
      return `${apiOrigin}${url}`;
    }
    return `${apiOrigin}/${url}`;
  };

  const getTeacherCover = (teacher: PublicTeacher): string => {
    const t: any = teacher.teacher || {};
    return toAbsoluteMediaUrl(t.coverImage || t.coverImageUrl || '');
  };

  const getUserAvatar = (teacher: PublicTeacher): string => {
    return toAbsoluteMediaUrl(teacher.user?.avatar || '');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-purple-50">
        <FaSpinner className="w-12 h-12 text-purple-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-purple-50">
        <div className="text-center">
          <p className="text-red-500 text-lg mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50">
      {/* Hero */}
      <div className="bg-gradient-to-r from-purple-700 to-indigo-700 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-bold mb-4"
          >
            Meet Our Teachers
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-purple-200 text-lg mb-8"
          >
            Learn from passionate educators across a variety of subjects
          </motion.p>

          {/* Search */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="max-w-lg mx-auto relative"
          >
            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or subject..."
              className="w-full pl-11 pr-4 py-3 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-white shadow-lg"
            />
          </motion.div>
        </div>
      </div>

      {/* Grid */}
      <div className="container mx-auto px-4 py-12">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <FaChalkboardTeacher className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">
              {search ? 'No teachers match your search.' : 'No teachers available yet.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map((t, idx) => (
              <motion.div
                key={t.teacher?._id || t.user?._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Link
                  to={`/teachers/${t.teacher?._id || t.user?._id}`}
                  className="block bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden group"
                >
                  {/* Cover */}
                  <div className="h-24 bg-gradient-to-r from-purple-500 to-indigo-500 relative z-0 overflow-hidden">
                    {getTeacherCover(t) && (
                      <img
                        src={getTeacherCover(t)}
                        alt="cover"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    )}
                  </div>

                  <div className="relative z-10 px-4 pb-4">
                    {/* Avatar */}
                    <div className="relative z-20 flex justify-center -mt-10 mb-3">
                      <div className="w-20 h-20 rounded-full border-4 border-white shadow-lg overflow-hidden bg-gradient-to-br from-purple-400 to-indigo-400">
                        {getUserAvatar(t) ? (
                          <img
                            src={getUserAvatar(t)}
                            alt={t.user.firstName}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white text-2xl font-bold">
                            {t.user.firstName?.[0]}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="text-center">
                      <h3 className="font-bold text-gray-900 group-hover:text-purple-600 transition-colors">
                        {t.user.firstName} {t.user.lastName}
                      </h3>
                      {t.teacher.specialization && (
                        <p className="text-sm text-gray-500 mt-0.5">{t.teacher.specialization}</p>
                      )}

                      {/* Subjects */}
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
                        </div>
                      )}

                      {/* Stats */}
                      <div className="flex items-center justify-center gap-4 mt-3 text-sm text-gray-500">
                        {t.stats?.averageRating != null && (
                          <span className="flex items-center gap-1">
                            <FaStar className="text-yellow-400 w-3.5 h-3.5" />
                            {t.stats.averageRating.toFixed(1)}
                          </span>
                        )}
                        {t.stats?.totalStudents != null && (
                          <span className="flex items-center gap-1">
                            <FaUsers className="w-3.5 h-3.5" />
                            {t.stats.totalStudents}
                          </span>
                        )}
                        {t.stats?.totalEvents != null && (
                          <span className="flex items-center gap-1">
                            <FaChalkboardTeacher className="w-3.5 h-3.5" />
                            {t.stats.totalEvents}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TeachersListingPage;
