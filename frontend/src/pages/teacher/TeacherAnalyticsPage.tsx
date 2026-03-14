import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  FaChartLine,
  FaDollarSign,
  FaStar,
  FaEye,
  FaUsers,
} from 'react-icons/fa';
import { TeacherNavigation } from '@/components/teacher';
import { useTeacherDashboardStats, useTeacherEarnings } from '@/hooks/queries/useTeacherQuery';

type DateRange = '7d' | '30d' | '90d' | '1y';

const TeacherAnalyticsPage: React.FC = () => {
  const [dateRange, setDateRange] = useState<DateRange>('30d');

  // Calculate date range
  const dateParams = useMemo(() => {
    const end = new Date();
    const start = new Date();

    switch (dateRange) {
      case '7d':
        start.setDate(end.getDate() - 7);
        break;
      case '30d':
        start.setDate(end.getDate() - 30);
        break;
      case '90d':
        start.setDate(end.getDate() - 90);
        break;
      case '1y':
        start.setFullYear(end.getFullYear() - 1);
        break;
    }

    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    };
  }, [dateRange]);

  const { data: stats, isLoading: isLoadingStats } = useTeacherDashboardStats();
  const { data: earnings, isLoading: isLoadingEarnings } = useTeacherEarnings(dateParams);

  const dateRangeOptions: { value: DateRange; label: string }[] = [
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 90 days' },
    { value: '1y', label: 'Last year' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50">
      <TeacherNavigation />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
            <p className="text-gray-600 mt-1">Track your teaching performance and earnings</p>
          </div>

          {/* Date Range Selector */}
          <div className="flex items-center gap-2 bg-white rounded-xl p-1 shadow-sm">
            {dateRangeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setDateRange(option.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  dateRange === option.value
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {isLoadingStats ? (
                    <span className="animate-pulse bg-gray-200 rounded h-8 w-24 inline-block" />
                  ) : (
                    `AED ${(stats?.totalRevenue || 0).toLocaleString()}`
                  )}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-xl">
                <FaDollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl shadow-lg p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Bookings</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {isLoadingStats ? (
                    <span className="animate-pulse bg-gray-200 rounded h-8 w-16 inline-block" />
                  ) : (
                    stats?.totalBookings || 0
                  )}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <FaUsers className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl shadow-lg p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Average Rating</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {isLoadingStats ? (
                    <span className="animate-pulse bg-gray-200 rounded h-8 w-16 inline-block" />
                  ) : (
                    <span className="flex items-center gap-1">
                      {(stats?.averageRating || 0).toFixed(1)}
                      <FaStar className="w-5 h-5 text-yellow-400" />
                    </span>
                  )}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {stats?.totalReviews || 0} reviews
                </p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-xl">
                <FaStar className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl shadow-lg p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Views</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {isLoadingStats ? (
                    <span className="animate-pulse bg-gray-200 rounded h-8 w-16 inline-block" />
                  ) : (
                    (stats?.viewsCount || 0).toLocaleString()
                  )}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-xl">
                <FaEye className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Earnings Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-2xl shadow-lg p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Earnings Summary</h3>
            {isLoadingEarnings ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="animate-pulse flex justify-between">
                    <span className="bg-gray-200 rounded h-4 w-24" />
                    <span className="bg-gray-200 rounded h-4 w-16" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Earnings</span>
                  <span className="font-semibold text-gray-900">
                    {earnings?.currency || 'AED'} {(earnings?.totalEarnings || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Pending</span>
                  <span className="font-semibold text-orange-600">
                    {earnings?.currency || 'AED'} {(earnings?.pendingEarnings || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Paid Out</span>
                  <span className="font-semibold text-green-600">
                    {earnings?.currency || 'AED'} {(earnings?.paidEarnings || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-3 mt-3">
                  <span className="text-gray-600">Commission Paid</span>
                  <span className="font-semibold text-red-600">
                    -{earnings?.currency || 'AED'} {(earnings?.commissionPaid || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-900 font-medium">Net Earnings</span>
                  <span className="font-bold text-purple-600">
                    {earnings?.currency || 'AED'} {(earnings?.netEarnings || 0).toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </motion.div>

          {/* Quick Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-2xl shadow-lg p-6 lg:col-span-2"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-purple-50 rounded-xl">
                <p className="text-2xl font-bold text-purple-600">
                  {stats?.totalTeachingEvents || 0}
                </p>
                <p className="text-sm text-gray-600">Total Classes</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-xl">
                <p className="text-2xl font-bold text-green-600">
                  {stats?.activeTeachingEvents || 0}
                </p>
                <p className="text-sm text-gray-600">Active Classes</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-xl">
                <p className="text-2xl font-bold text-blue-600">
                  {stats?.confirmedBookings || 0}
                </p>
                <p className="text-sm text-gray-600">Confirmed</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-xl">
                <p className="text-2xl font-bold text-red-600">
                  {stats?.cancelledBookings || 0}
                </p>
                <p className="text-sm text-gray-600">Cancelled</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Revenue by Event Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-2xl shadow-lg overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Revenue by Class</h3>
            <p className="text-sm text-gray-500 mt-1">
              Breakdown of earnings per teaching event
            </p>
          </div>

          {isLoadingEarnings ? (
            <div className="p-6">
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse flex items-center gap-4">
                    <span className="bg-gray-200 rounded h-10 flex-1" />
                  </div>
                ))}
              </div>
            </div>
          ) : earnings?.breakdown && earnings.breakdown.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Class
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bookings
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Revenue
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Commission
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Net
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {earnings.breakdown.map((item) => (
                    <tr key={item.teachingEventId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {item.teachingEventTitle}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                        {item.bookingsCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                        {earnings.currency} {item.totalRevenue.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-red-600">
                        -{earnings.currency} {item.commission.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-green-600">
                        {earnings.currency} {item.netRevenue.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      Total
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                      {earnings.breakdown.reduce((sum, item) => sum + item.bookingsCount, 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-gray-900">
                      {earnings.currency} {earnings.totalEarnings.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-red-600">
                      -{earnings.currency} {earnings.commissionPaid.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-green-600">
                      {earnings.currency} {earnings.netEarnings.toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center">
              <FaChartLine className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">No earnings data yet</h4>
              <p className="text-gray-500">
                Start creating classes and receiving bookings to see your earnings breakdown.
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default TeacherAnalyticsPage;
