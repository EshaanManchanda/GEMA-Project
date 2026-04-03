import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FaStar, FaUsers, FaChalkboardTeacher, FaGlobe, FaLinkedin,
  FaYoutube, FaInstagram, FaCalendarAlt, FaArrowLeft,
  FaCheckCircle, FaLaptop, FaMapMarkerAlt, FaFacebook,
  FaGraduationCap, FaLanguage, FaBookOpen,
} from 'react-icons/fa';
import { MdVerified } from 'react-icons/md';
import teacherAPI from '@/services/api/teacherAPI';
import { TeacherSEO } from '@/components/common/SEO';
import type { ITeacher, ITeachingEvent } from '@/types/teacher';

const MODE_STYLE: Record<string, { bg: string; text: string; icon: React.ReactNode; label: string }> = {
  online:  { bg: 'bg-blue-100',   text: 'text-blue-700',   icon: <FaLaptop />,           label: 'Online' },
  offline: { bg: 'bg-amber-100',  text: 'text-amber-700',  icon: <FaMapMarkerAlt />,     label: 'In-Person' },
  hybrid:  { bg: 'bg-violet-100', text: 'text-violet-700', icon: <FaChalkboardTeacher />, label: 'Hybrid' },
};

// ── Skeleton ──────────────────────────────────────────────────
const ProfileSkeleton: React.FC = () => (
  <div className="min-h-screen bg-gray-50 animate-pulse">
    <div className="h-64 bg-gray-200" />
    <div className="container mx-auto px-4 -mt-16">
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
        <div className="flex gap-4">
          <div className="w-28 h-28 rounded-2xl bg-gray-300 flex-shrink-0" />
          <div className="flex-1 space-y-2 pt-2">
            <div className="h-6 bg-gray-200 rounded w-48" />
            <div className="h-4 bg-gray-100 rounded w-32" />
            <div className="h-4 bg-gray-100 rounded w-64" />
          </div>
        </div>
      </div>
    </div>
  </div>
);

// ── Stat chip ─────────────────────────────────────────────────
const Stat: React.FC<{ icon: React.ReactNode; value: string | number; label: string; color: string }> =
  ({ icon, value, label, color }) => (
    <div className="flex flex-col items-center gap-1 px-4 py-3">
      <span className={`text-xl ${color}`}>{icon}</span>
      <span className="text-lg font-bold text-gray-900">{value}</span>
      <span className="text-xs text-gray-400">{label}</span>
    </div>
  );

// ── Event card ────────────────────────────────────────────────
const EventCard: React.FC<{ event: ITeachingEvent }> = ({ event }) => (
  <Link
    to={`/events/${event._id}`}
    className="flex gap-4 p-4 bg-white rounded-2xl border border-gray-100 hover:border-purple-200
               hover:shadow-md transition-all group"
  >
    {event.images && event.images.length > 0 ? (
      <img
        src={event.images[0]}
        alt={event.title}
        className="w-20 h-20 rounded-xl object-cover flex-shrink-0 group-hover:scale-105 transition-transform duration-300"
      />
    ) : (
      <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-purple-400 to-indigo-500
                      flex-shrink-0 flex items-center justify-center">
        <FaChalkboardTeacher className="text-white w-7 h-7" />
      </div>
    )}
    <div className="flex-1 min-w-0">
      <h3 className="font-semibold text-gray-900 group-hover:text-purple-600 transition-colors
                     text-sm leading-snug mb-1.5 line-clamp-2">
        {event.title}
      </h3>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {(event.type || event.eventType) && (
          <span className="px-2 py-0.5 bg-purple-50 text-purple-600 rounded-full text-xs">
            {event.type || event.eventType}
          </span>
        )}
        {event.ageRange && (
          <span className="px-2 py-0.5 bg-gray-50 text-gray-500 rounded-full text-xs">
            Ages {event.ageRange[0]}–{event.ageRange[1]}
          </span>
        )}
      </div>
      {event.price != null && (
        <p className="text-purple-600 font-bold text-sm">
          {event.currency || 'AED'} {event.price}
        </p>
      )}
    </div>
  </Link>
);

// ── Main page ─────────────────────────────────────────────────
const TeacherPublicProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<{
    user: any;
    teacher: ITeacher;
    teachingEvents: ITeachingEvent[];
    stats: any;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        setIsLoading(true);
        const result = await teacherAPI.getPublicProfile(id);
        setData(result);
      } catch {
        setError('Teacher profile not found or unavailable.');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [id]);

  if (isLoading) return <ProfileSkeleton />;

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <FaChalkboardTeacher className="w-14 h-14 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">{error || 'Profile not found'}</p>
          <Link to="/teachers"
            className="px-5 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 text-sm">
            Back to Teachers
          </Link>
        </div>
      </div>
    );
  }

  const { user, teacher, teachingEvents, stats } = data;
  const social = teacher.socialLinks || {};
  const isVerified = teacher.verificationStatus === 'verified';
  const mode = teacher.teachingMode as string;
  const modeStyle = MODE_STYLE[mode];

  return (
    <div className="min-h-screen bg-gray-50">
      <TeacherSEO
        teacher={{ ...teacher, firstName: user.firstName, lastName: user.lastName, avatar: user.avatar }}
        breadcrumbs={[
          { name: 'Home', url: '/' },
          { name: 'Teachers', url: '/teachers' },
          { name: teacher.fullName || `${user.firstName} ${user.lastName}`, url: `/teachers/${id}` },
        ]}
      />
      {/* Hero / Cover */}
      <div className="relative h-56 sm:h-72 bg-gradient-to-r from-purple-700 to-indigo-700 overflow-hidden">
        {teacher.coverImage && (
          <img
            src={teacher.coverImage}
            alt="cover"
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

        {/* Back link */}
        <div className="absolute top-4 left-4">
          <Link
            to="/teachers"
            className="inline-flex items-center gap-2 text-white/90 hover:text-white
                       bg-black/20 hover:bg-black/30 backdrop-blur-sm px-3 py-1.5
                       rounded-lg text-sm transition-colors"
          >
            <FaArrowLeft className="w-3 h-3" />
            All Teachers
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-5xl">
        {/* Profile card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg -mt-16 relative z-10 mb-6 overflow-hidden"
        >
          <div className="p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row gap-4 sm:items-start">
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl border-4 border-white shadow-lg
                                overflow-hidden bg-gradient-to-br from-purple-400 to-indigo-400">
                  {user?.avatar ? (
                    <img src={user.avatar} alt={user.firstName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white text-4xl font-bold">
                      {user?.firstName?.[0]}
                    </div>
                  )}
                </div>
                {isVerified && (
                  <MdVerified
                    className="absolute -bottom-1 -right-1 w-7 h-7 text-blue-500 bg-white rounded-full"
                    title="Verified Teacher"
                  />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                    {user?.firstName} {user?.lastName}
                  </h1>
                  {isVerified && (
                    <span className="flex items-center gap-1 px-2.5 py-0.5 bg-blue-50 text-blue-600
                                     rounded-full text-xs font-medium">
                      <FaCheckCircle className="w-3 h-3" />
                      Verified
                    </span>
                  )}
                  {modeStyle && (
                    <span className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full
                                     text-xs font-medium capitalize
                                     ${modeStyle.bg} ${modeStyle.text}`}>
                      {modeStyle.icon}
                      {modeStyle.label}
                    </span>
                  )}
                </div>

                {teacher.specialization && (
                  <p className="text-purple-600 font-medium text-sm mb-2">{teacher.specialization}</p>
                )}

                {/* Quick stats row */}
                <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-gray-500">
                  {stats?.averageRating != null && (
                    <span className="flex items-center gap-1.5">
                      <FaStar className="text-yellow-400 w-3.5 h-3.5" />
                      <span className="font-medium text-gray-700">{stats.averageRating.toFixed(1)}</span>
                      <span>rating</span>
                    </span>
                  )}
                  {stats?.totalStudents != null && (
                    <span className="flex items-center gap-1.5">
                      <FaUsers className="text-purple-400 w-3.5 h-3.5" />
                      <span className="font-medium text-gray-700">{stats.totalStudents.toLocaleString()}</span>
                      <span>students</span>
                    </span>
                  )}
                  {stats?.totalEvents != null && (
                    <span className="flex items-center gap-1.5">
                      <FaBookOpen className="text-indigo-400 w-3.5 h-3.5" />
                      <span className="font-medium text-gray-700">{stats.totalEvents}</span>
                      <span>classes</span>
                    </span>
                  )}
                  {teacher.yearsOfExperience != null && teacher.yearsOfExperience > 0 && (
                    <span className="flex items-center gap-1.5">
                      <FaCalendarAlt className="text-gray-400 w-3.5 h-3.5" />
                      <span className="font-medium text-gray-700">{teacher.yearsOfExperience}y</span>
                      <span>experience</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Social icons */}
              {(social.website || social.linkedin || social.youtube || social.instagram || social.facebook) && (
                <div className="flex items-center gap-2 flex-shrink-0 sm:ml-auto">
                  {social.website && (
                    <a href={social.website} target="_blank" rel="noreferrer"
                      className="p-2.5 bg-gray-100 text-gray-500 rounded-xl hover:bg-purple-100
                                 hover:text-purple-600 transition-colors">
                      <FaGlobe className="w-4 h-4" />
                    </a>
                  )}
                  {social.linkedin && (
                    <a href={social.linkedin} target="_blank" rel="noreferrer"
                      className="p-2.5 bg-gray-100 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors">
                      <FaLinkedin className="w-4 h-4" />
                    </a>
                  )}
                  {social.facebook && (
                    <a href={social.facebook} target="_blank" rel="noreferrer"
                      className="p-2.5 bg-gray-100 text-blue-700 rounded-xl hover:bg-blue-100 transition-colors">
                      <FaFacebook className="w-4 h-4" />
                    </a>
                  )}
                  {social.youtube && (
                    <a href={social.youtube} target="_blank" rel="noreferrer"
                      className="p-2.5 bg-gray-100 text-red-600 rounded-xl hover:bg-red-100 transition-colors">
                      <FaYoutube className="w-4 h-4" />
                    </a>
                  )}
                  {social.instagram && (
                    <a href={social.instagram} target="_blank" rel="noreferrer"
                      className="p-2.5 bg-gray-100 text-pink-600 rounded-xl hover:bg-pink-100 transition-colors">
                      <FaInstagram className="w-4 h-4" />
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Stats bar */}
          {(stats?.averageRating != null || stats?.totalStudents != null || stats?.totalEvents != null) && (
            <div className="border-t border-gray-100 grid grid-cols-3 divide-x divide-gray-100">
              {stats?.averageRating != null && (
                <Stat icon={<FaStar />} value={stats.averageRating.toFixed(1)} label="Avg Rating" color="text-yellow-400" />
              )}
              {stats?.totalStudents != null && (
                <Stat icon={<FaUsers />} value={stats.totalStudents.toLocaleString()} label="Students" color="text-purple-500" />
              )}
              {stats?.totalEvents != null && (
                <Stat icon={<FaBookOpen />} value={stats.totalEvents} label="Classes" color="text-indigo-500" />
              )}
            </div>
          )}
        </motion.div>

        {/* Body */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-12">
          {/* Left sidebar */}
          <div className="space-y-4">
            {/* Bio */}
            {teacher.bio && (
              <motion.div
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5"
              >
                <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">About</h2>
                <p className="text-gray-600 text-sm leading-relaxed">{teacher.bio}</p>
              </motion.div>
            )}

            {/* Subjects */}
            {teacher.subjects && teacher.subjects.length > 0 && (
              <motion.div
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5"
              >
                <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <FaBookOpen className="text-purple-400 w-3.5 h-3.5" />
                  Subjects
                </h2>
                <div className="flex flex-wrap gap-2">
                  {teacher.subjects.map((sub) => (
                    <span key={sub}
                      className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-medium">
                      {sub}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Languages */}
            {teacher.languagesSpoken && teacher.languagesSpoken.length > 0 && (
              <motion.div
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5"
              >
                <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <FaLanguage className="text-indigo-400 w-3.5 h-3.5" />
                  Languages
                </h2>
                <div className="flex flex-wrap gap-2">
                  {teacher.languagesSpoken.map((lang) => (
                    <span key={lang}
                      className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium capitalize">
                      {lang}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Education */}
            {teacher.education && teacher.education.length > 0 && (
              <motion.div
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5"
              >
                <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <FaGraduationCap className="text-green-500 w-3.5 h-3.5" />
                  Education
                </h2>
                <div className="space-y-3">
                  {teacher.education.map((edu, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="w-2 h-2 rounded-full bg-purple-400 mt-1.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{edu.degree}</p>
                        <p className="text-gray-400 text-xs mt-0.5">
                          {edu.institution}
                          {edu.year ? ` · ${edu.year}` : ''}
                          {edu.country ? ` · ${edu.country}` : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          {/* Right — Classes */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">
                  Classes by {user?.firstName}
                </h2>
                {teachingEvents && teachingEvents.length > 0 && (
                  <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
                    {teachingEvents.length} class{teachingEvents.length !== 1 ? 'es' : ''}
                  </span>
                )}
              </div>

              {teachingEvents && teachingEvents.length > 0 ? (
                <div className="space-y-3">
                  {teachingEvents.map((event) => (
                    <EventCard key={event._id} event={event} />
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-14 text-center">
                  <FaChalkboardTeacher className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">No classes available yet.</p>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherPublicProfilePage;
