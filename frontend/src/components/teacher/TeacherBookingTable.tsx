import React from 'react';
import { motion } from 'framer-motion';
import {
  FaEnvelope,
  FaCalendarAlt,
  FaEye,
  FaEdit,
  FaCheckCircle,
  FaClock,
  FaTimesCircle,
} from 'react-icons/fa';
import type { ITeacherBooking } from '@/types/teacher';

interface TeacherBookingTableProps {
  bookings: ITeacherBooking[];
  onView?: (booking: ITeacherBooking) => void;
  onEdit?: (booking: ITeacherBooking) => void;
  isLoading?: boolean;
}

const statusConfig: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  confirmed: {
    icon: <FaCheckCircle className="w-4 h-4" />,
    color: 'text-green-600',
    bg: 'bg-green-100',
  },
  pending: {
    icon: <FaClock className="w-4 h-4" />,
    color: 'text-yellow-600',
    bg: 'bg-yellow-100',
  },
  cancelled: {
    icon: <FaTimesCircle className="w-4 h-4" />,
    color: 'text-red-600',
    bg: 'bg-red-100',
  },
  completed: {
    icon: <FaCheckCircle className="w-4 h-4" />,
    color: 'text-blue-600',
    bg: 'bg-blue-100',
  },
  refunded: {
    icon: <FaTimesCircle className="w-4 h-4" />,
    color: 'text-gray-600',
    bg: 'bg-gray-100',
  },
};

const paymentStatusConfig: Record<string, { color: string; bg: string }> = {
  paid: { color: 'text-green-600', bg: 'bg-green-100' },
  pending: { color: 'text-yellow-600', bg: 'bg-yellow-100' },
  failed: { color: 'text-red-600', bg: 'bg-red-100' },
  refunded: { color: 'text-gray-600', bg: 'bg-gray-100' },
};

const TeacherBookingTable: React.FC<TeacherBookingTableProps> = ({
  bookings,
  onView,
  onEdit,
  isLoading,
}) => {
  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number, currency: string) => {
    return `${currency} ${amount.toFixed(2)}`;
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="p-8 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto" />
          <p className="mt-4 text-gray-500">Loading bookings...</p>
        </div>
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="p-8 text-center">
          <FaCalendarAlt className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No Bookings Yet</h3>
          <p className="text-gray-500">
            Your bookings will appear here once students book your classes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-purple-50 to-indigo-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Student
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Class
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Payment
              </th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {bookings.map((booking, index) => {
              const status = statusConfig[booking.status] || statusConfig.pending;
              const paymentStatus = paymentStatusConfig[booking.paymentStatus] || paymentStatusConfig.pending;
              const session = booking.sessions?.[0];

              return (
                <motion.tr
                  key={booking._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="hover:bg-gray-50 transition-colors"
                >
                  {/* Student */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white font-semibold">
                        {booking.studentId?.firstName?.[0] || 'S'}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {booking.studentId?.firstName} {booking.studentId?.lastName}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <FaEnvelope className="w-3 h-3" />
                          <span className="truncate max-w-[150px]">{booking.studentId?.email}</span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Class */}
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900 line-clamp-1">
                      {session?.teachingEventTitle || 'N/A'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {session?.quantity || 1} seat(s)
                    </p>
                  </td>

                  {/* Date */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-gray-600">
                      <FaCalendarAlt className="w-4 h-4 text-purple-500" />
                      <span>{formatDate(session?.scheduleDate || booking.createdAt)}</span>
                    </div>
                  </td>

                  {/* Amount */}
                  <td className="px-6 py-4">
                    <span className="font-semibold text-gray-900">
                      {formatCurrency(booking.totalAmount, booking.currency)}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${status.bg} ${status.color}`}
                    >
                      {status.icon}
                      {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                    </span>
                  </td>

                  {/* Payment */}
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${paymentStatus.bg} ${paymentStatus.color}`}
                    >
                      {booking.paymentStatus.charAt(0).toUpperCase() + booking.paymentStatus.slice(1)}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      {onView && (
                        <button
                          onClick={() => onView(booking)}
                          className="p-2 rounded-lg text-gray-500 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                          title="View Details"
                        >
                          <FaEye className="w-4 h-4" />
                        </button>
                      )}
                      {onEdit && (
                        <button
                          onClick={() => onEdit(booking)}
                          className="p-2 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Edit"
                        >
                          <FaEdit className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TeacherBookingTable;
