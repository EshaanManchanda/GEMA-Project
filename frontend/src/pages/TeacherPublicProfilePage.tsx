import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FaStar,
  FaUsers,
  FaChalkboardTeacher,
  FaGlobe,
  FaLinkedin,
  FaYoutube,
  FaInstagram,
  FaCalendarAlt,
  FaSpinner,
  FaArrowLeft,
} from 'react-icons/fa';
import teacherAPI from '@/services/api/teacherAPI';
import type { ITeacher, ITeachingEvent } from '@/types/teacher';

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
    const fetch = async () => {
      try {
        setIsLoading(true);
        const result = await teacherAPI.getPublicProfile(id);
        setData(result);
      } catch (err) {
        setError('Teacher profile not found or unavailable.');
      } finally {
        setIsLoading(false);
      }
    };
    fetch();
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-purple-50">
        <FaSpinner className="w-12 h-12 text-purple-500 animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-purple-50">
        <div className="text-center">
          <p className="text-red-500 text-lg mb-4">{error || 'Profile not found'}</p>
          <Link to="/teachers" className="px-6 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700">
            Back to Teachers
          </Link>
        </div>
      </div>
    );
  }

  const { user, teacher, teachingEvents, stats } = data;
  const socialLinks = teacher.socialLinks || {};

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50">
      {/* Back link */}
      <div className="container mx-auto px-4 pt-6">
        <Link
          to="/teachers"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-purple-600 transition-colors text-sm"
        >
          <FaArrowLeft className="w-3.5 h-3.5" />
          All Teachers
        </Link>
      </div>

      {/* Profile Header */}
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg overflow-hidden mb-8"
        >
          {/* Cover */}
          <div className="h-48 bg-gradient-to-r from-purple-600 to-indigo-600 relative">
            {teacher.coverImage && (
              <img src={teacher.coverImage} alt="cover" className="w-full h-full object-cover" />
            )}
          </div>

          <div className="px-6 pb-6">
            <div className="flex flex-col md:flex-row md:items-end gap-4 -mt-16">
              {/* Avatar */}
              <div className="w-32 h-32 rounded-2xl border-4 border-white shadow-lg overflow-hidden bg-gradient-to-br from-purple-400 to-indigo-400 flex-shrink-0">
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.firstName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white text-4xl font-bold">
                    {user?.firstName?.[0]}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 mt-6 md:mt-0">
                <div className="flex flex-wrap items-center gap-3 mb-1">
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                    {user?.firstName} {user?.lastName}
                  </h1>
                  {teacher.verificationStatus === 'verified' && (
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                      Verified
                    </span>
                  )}
                </div>
                {teacher.specialization && (
                  <p className="text-purple-600 font-medium mb-2">{teacher.specialization}</p>
                )}

                {/* Stats row */}
                <div className="flex flex-wrap gap-6 text-sm text-gray-600 mt-2">
                  {stats?.averageRating != null && (
                    <span className="flex items-center gap-1.5">
                      <FaStar className="text-yellow-400" />
                      {stats.averageRating.toFixed(1)} rating
                    </span>
                  )}
                  {stats?.totalStudents != null && (
                    <span className="flex items-center gap-1.5">
                      <FaUsers className="text-purple-500" />
                      {stats.totalStudents} students
                    </span>
                  )}
                  {stats?.totalEvents != null && (
                    <span className="flex items-center gap-1.5">
                      <FaChalkboardTeacher className="text-indigo-500" />
                      {stats.totalEvents} classes
                    </span>
                  )}
                  {teacher.yearsOfExperience != null && teacher.yearsOfExperience > 0 && (
                    <span className="flex items-center gap-1.5">
                      <FaCalendarAlt className="text-gray-400" />
                      {teacher.yearsOfExperience} years experience
                    </span>
                  )}
                </div>
              </div>

              {/* Social Links */}
              <div className="flex gap-3 md:ml-auto">
                {socialLinks.website && (
                  <a href={socialLinks.website} target="_blank" rel="noreferrer"
                    className="p-2.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-purple-100 hover:text-purple-600 transition-colors">
                    <FaGlobe />
                  </a>
                )}
                {socialLinks.linkedin && (
                  <a href={socialLinks.linkedin} target="_blank" rel="noreferrer"
                    className="p-2.5 bg-gray-100 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors">
                    <FaLinkedin />
                  </a>
                )}
                {socialLinks.youtube && (
                  <a href={socialLinks.youtube} target="_blank" rel="noreferrer"
                    className="p-2.5 bg-gray-100 text-red-600 rounded-lg hover:bg-red-100 transition-colors">
                    <FaYoutube />
                  </a>
                )}
                {socialLinks.instagram && (
                  <a href={socialLinks.instagram} target="_blank" rel="noreferrer"
                    className="p-2.5 bg-gray-100 text-pink-600 rounded-lg hover:bg-pink-100 transition-colors">
                    <FaInstagram />
                  </a>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Bio */}
            {teacher.bio && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-2xl shadow-md p-6"
              >
                <h2 className="text-lg font-semibold text-gray-900 mb-3">About</h2>
                <p className="text-gray-600 text-sm leading-relaxed">{teacher.bio}</p>
              </motion.div>
            )}

            {/* Subjects */}
            {teacher.subjects && teacher.subjects.length > 0 && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 }}
                className="bg-white rounded-2xl shadow-md p-6"
              >
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Subjects</h2>
                <div className="flex flex-wrap gap-2">
                  {teacher.subjects.map((sub) => (
                    <span key={sub} className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-full text-sm">
                      {sub}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Languages */}
            {teacher.languagesSpoken && teacher.languagesSpoken.length > 0 && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-2xl shadow-md p-6"
              >
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Languages</h2>
                <div className="flex flex-wrap gap-2">
                  {teacher.languagesSpoken.map((lang) => (
                    <span key={lang} className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-sm capitalize">
                      {lang}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Education */}
            {teacher.education && teacher.education.length > 0 && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 }}
                className="bg-white rounded-2xl shadow-md p-6"
              >
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Education</h2>
                <div className="space-y-3">
                  {teacher.education.map((edu, idx) => (
                    <div key={idx} className="border-l-2 border-purple-300 pl-3">
                      <p className="font-medium text-gray-900 text-sm">{edu.degree}</p>
                      <p className="text-gray-500 text-xs">{edu.institution} · {edu.year}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          {/* Right Column — Classes */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Classes by {user?.firstName}
              </h2>
              {teachingEvents && teachingEvents.length > 0 ? (
                <div className="space-y-4">
                  {teachingEvents.map((event) => (
                    <Link
                      key={event._id}
                      to={`/events/${event._id}`}
                      className="block bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow overflow-hidden group"
                    >
                      <div className="flex gap-4 p-4">
                        {event.images && event.images.length > 0 ? (
                          <img
                            src={event.images[0]}
                            alt={event.title}
                            className="w-24 h-24 rounded-xl object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-purple-400 to-indigo-500 flex-shrink-0 flex items-center justify-center">
                            <FaChalkboardTeacher className="text-white w-8 h-8" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 group-hover:text-purple-600 transition-colors mb-1 truncate">
                            {event.title}
                          </h3>
                          <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                            {event.type && (
                              <span className="px-2 py-0.5 bg-purple-50 text-purple-600 rounded-full">
                                {event.type}
                              </span>
                            )}
                            {event.eventType && (
                              <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">
                                {event.eventType}
                              </span>
                            )}
                            {event.ageRange && (
                              <span>Ages {event.ageRange[0]}–{event.ageRange[1]}</span>
                            )}
                          </div>
                          {event.price != null && (
                            <p className="text-purple-600 font-bold mt-2 text-sm">
                              {event.currency || 'AED'} {event.price}
                            </p>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-2xl shadow-md p-12 text-center">
                  <FaChalkboardTeacher className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-400">No classes available yet.</p>
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
