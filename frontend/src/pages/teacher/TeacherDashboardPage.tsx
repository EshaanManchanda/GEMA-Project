import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FaCalendarAlt,
  FaUsers,
  FaMoneyBillWave,
  FaStar,
  FaChartLine,
  FaArrowRight,
  FaPlus,
} from 'react-icons/fa';
import { TeacherNavigation, TeacherStatsCard } from '@/components/teacher';
import { useTeacherDashboardStats, useTeacherTeachingEvents, useTeacherBookings } from '@/hooks/queries/useTeacherQuery';

const TeacherDashboardPage: React.FC = () => {
  const { data: stats } = useTeacherDashboardStats();
  const { data: eventsData, isLoading: eventsLoading } = useTeacherTeachingEvents({ limit: 3 });
  const { data: bookingsData, isLoading: bookingsLoading } = useTeacherBookings({ limit: 5 });

  const dashboardStats = stats || {
    totalTeachingEvents: 0,
    totalBookings: 0,
    totalRevenue: 0,
    averageRating: 0,
    totalReviews: 0,
    viewsCount: 0,
  };

  const recentEvents = eventsData?.teachingEvents || [];
  const recentBookings = bookingsData?.Bookings || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50">
      <TeacherNavigation />

      <div className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900">Welcome back, Teacher!</h1>
          <p className="text-gray-600 mt-2">Here's what's happening with your classes today.</p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <TeacherStatsCard
            title="Total Classes"
            value={dashboardStats.totalTeachingEvents}
            icon={<FaCalendarAlt className="w-6 h-6" />}
            color="purple"
            subtitle="Active teaching events"
          />
          <TeacherStatsCard
            title="Total Bookings"
            value={dashboardStats.totalBookings}
            icon={<FaUsers className="w-6 h-6" />}
            color="blue"
            subtitle="All time students"
          />
          <TeacherStatsCard
            title="Total Revenue"
            value={`AED ${dashboardStats.totalRevenue.toLocaleString()}`}
            icon={<FaMoneyBillWave className="w-6 h-6" />}
            color="green"
            subtitle="Lifetime earnings"
          />
          <TeacherStatsCard
            title="Average Rating"
            value={(dashboardStats.averageRating ?? 0) > 0 ? (dashboardStats.averageRating ?? 0).toFixed(1) : 'N/A'}
            icon={<FaStar className="w-6 h-6" />}
            color="orange"
            subtitle={`${dashboardStats.totalReviews} reviews`}
          />
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
        >
          <Link
            to="/teacher/events/create"
            className="flex items-center gap-4 p-6 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl text-white shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]"
          >
            <div className="p-3 bg-white/20 rounded-xl">
              <FaPlus className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Create New Class</h3>
              <p className="text-purple-200 text-sm">Add a new teaching event</p>
            </div>
            <FaArrowRight className="w-5 h-5 ml-auto" />
          </Link>

          <Link
            to="/teacher/bookings"
            className="flex items-center gap-4 p-6 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] border border-gray-100"
          >
            <div className="p-3 bg-blue-100 rounded-xl">
              <FaUsers className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-gray-900">View Bookings</h3>
              <p className="text-gray-500 text-sm">Manage student bookings</p>
            </div>
            <FaArrowRight className="w-5 h-5 ml-auto text-gray-400" />
          </Link>

          <Link
            to="/teacher/analytics"
            className="flex items-center gap-4 p-6 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] border border-gray-100"
          >
            <div className="p-3 bg-green-100 rounded-xl">
              <FaChartLine className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-gray-900">View Analytics</h3>
              <p className="text-gray-500 text-sm">Track your performance</p>
            </div>
            <FaArrowRight className="w-5 h-5 ml-auto text-gray-400" />
          </Link>
        </motion.div>

        {/* Recent Events & Bookings */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Classes */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Recent Classes</h2>
              <Link
                to="/teacher/events"
                className="text-purple-600 hover:text-purple-700 font-medium text-sm flex items-center gap-1"
              >
                View All <FaArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {eventsLoading ? (
              <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
                <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto" />
                <p className="mt-4 text-gray-500">Loading classes...</p>
              </div>
            ) : recentEvents.length > 0 ? (
              <div className="space-y-4">
                {recentEvents.map((event) => (
                  <div
                    key={event._id}
                    className="bg-white rounded-xl shadow p-4 flex items-center gap-4 hover:shadow-md transition-shadow"
                  >
                    <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center flex-shrink-0">
                      {event.images?.[0] ? (
                        <img
                          src={event.images[0]}
                          alt={event.title}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <FaCalendarAlt className="w-6 h-6 text-purple-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{event.title}</h3>
                      <p className="text-sm text-gray-500">{event.type} • {event.eventType}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-purple-600">
                        {event.currency} {event.price}
                      </p>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          event.status === 'published'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {event.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
                <FaCalendarAlt className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="font-semibold text-gray-700 mb-2">No Classes Yet</h3>
                <p className="text-gray-500 mb-4">Create your first teaching event to get started.</p>
                <Link
                  to="/teacher/events/create"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <FaPlus className="w-4 h-4" />
                  Create Class
                </Link>
              </div>
            )}
          </motion.div>

          {/* Recent Bookings */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Recent Bookings</h2>
              <Link
                to="/teacher/bookings"
                className="text-purple-600 hover:text-purple-700 font-medium text-sm flex items-center gap-1"
              >
                View All <FaArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {bookingsLoading ? (
              <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
                <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto" />
                <p className="mt-4 text-gray-500">Loading bookings...</p>
              </div>
            ) : recentBookings.length > 0 ? (
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                {recentBookings.map((booking: any, index: number) => (
                  <div
                    key={booking._id}
                    className={`p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors ${
                      index > 0 ? 'border-t border-gray-100' : ''
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white font-semibold flex-shrink-0">
                      {booking.studentId?.firstName?.[0] || 'S'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">
                        {booking.studentId?.firstName} {booking.studentId?.lastName}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        {booking.sessions?.[0]?.teachingEventTitle || 'Unknown Class'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        {booking.currency} {booking.totalAmount}
                      </p>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          booking.paymentStatus === 'paid'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {booking.paymentStatus}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
                <FaUsers className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="font-semibold text-gray-700 mb-2">No Bookings Yet</h3>
                <p className="text-gray-500">
                  Your student bookings will appear here once they enroll in your classes.
                </p>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboardPage;
