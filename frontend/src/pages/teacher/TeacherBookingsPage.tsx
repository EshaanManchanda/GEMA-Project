import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaSearch,
  FaDownload,
  FaUsers,
  FaMoneyBillWave,
  FaCheckCircle,
  FaClock,
  FaTimesCircle,
} from 'react-icons/fa';
import { TeacherNavigation, TeacherStatsCard, TeacherBookingTable } from '@/components/teacher';
import { useTeacherBookings } from '@/hooks/queries/useTeacherQuery';

import teacherAPI from '@/services/api/teacherAPI';
import type { TeacherBookingFilters, ITeacherBooking } from '@/types/teacher';

const TeacherBookingsPage: React.FC = () => {
  const [filters, setFilters] = useState<TeacherBookingFilters>({
    page: 1,
    limit: 20,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<ITeacherBooking | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const { data, isLoading } = useTeacherBookings(filters);

  const bookings = data?.Bookings || [];
  const stats = data?.stats || {
    totalRevenue: 0,
    totalBookings: 0,
    confirmedBookings: 0,
    cancelledBookings: 0,
    paidBookings: 0,
    pendingPayments: 0,
  };
  const pagination = data?.pagination || {
    currentPage: 1,
    totalPages: 1,
    totalBookings: 0,
    hasNextPage: false,
    hasPrevPage: false,
  };
  const teachingEvents = data?.teachingEvents || [];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters((prev) => ({ ...prev, search: searchTerm, page: 1 }));
  };

  const handleFilterChange = (key: keyof TeacherBookingFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  const handleExport = async (format: 'csv' | 'json') => {
    setIsExporting(true);
    try {
      await teacherAPI.exportBookings(format, filters);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleViewBooking = (booking: ITeacherBooking) => {
    setSelectedBooking(booking);
  };

  const handleEditBooking = (booking: ITeacherBooking) => {
    setSelectedBooking(booking);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50">
      <TeacherNavigation />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Bookings</h1>
            <p className="text-gray-600 mt-1">Manage student bookings and enrollments</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handleExport('csv')}
              disabled={isExporting}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <FaDownload className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <TeacherStatsCard
            title="Total Bookings"
            value={stats.totalBookings}
            icon={<FaUsers className="w-6 h-6" />}
            color="purple"
          />
          <TeacherStatsCard
            title="Confirmed"
            value={stats.confirmedBookings}
            icon={<FaCheckCircle className="w-6 h-6" />}
            color="green"
          />
          <TeacherStatsCard
            title="Pending Payment"
            value={stats.pendingPayments}
            icon={<FaClock className="w-6 h-6" />}
            color="orange"
          />
          <TeacherStatsCard
            title="Total Revenue"
            value={`AED ${stats.totalRevenue.toLocaleString()}`}
            icon={<FaMoneyBillWave className="w-6 h-6" />}
            color="blue"
          />
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search by booking number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </form>

            {/* Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Status */}
              <select
                value={filters.status || ''}
                onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
                className="px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
              >
                <option value="">All Status</option>
                <option value="confirmed">Confirmed</option>
                <option value="pending">Pending</option>
                <option value="cancelled">Cancelled</option>
                <option value="completed">Completed</option>
              </select>

              {/* Payment Status */}
              <select
                value={filters.paymentStatus || ''}
                onChange={(e) => handleFilterChange('paymentStatus', e.target.value || undefined)}
                className="px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
              >
                <option value="">All Payments</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
              </select>

              {/* Teaching Event Filter */}
              {teachingEvents.length > 0 && (
                <select
                  value={filters.teachingEventId || ''}
                  onChange={(e) => handleFilterChange('teachingEventId', e.target.value || undefined)}
                  className="px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white max-w-[200px]"
                >
                  <option value="">All Classes</option>
                  {teachingEvents.map((event: any) => (
                    <option key={event._id} value={event._id}>
                      {event.title}
                    </option>
                  ))}
                </select>
              )}

              {/* Date Range */}
              <input
                type="date"
                value={filters.startDate || ''}
                onChange={(e) => handleFilterChange('startDate', e.target.value || undefined)}
                className="px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                placeholder="Start Date"
              />
              <input
                type="date"
                value={filters.endDate || ''}
                onChange={(e) => handleFilterChange('endDate', e.target.value || undefined)}
                className="px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                placeholder="End Date"
              />
            </div>
          </div>
        </div>

        {/* Bookings Table */}
        <TeacherBookingTable
          bookings={bookings}
          onView={handleViewBooking}
          onEdit={handleEditBooking}
          isLoading={isLoading}
        />

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button
              onClick={() => handlePageChange(pagination.currentPage - 1)}
              disabled={!pagination.hasPrevPage}
              className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                let pageNum;
                if (pagination.totalPages <= 5) {
                  pageNum = i + 1;
                } else if (pagination.currentPage <= 3) {
                  pageNum = i + 1;
                } else if (pagination.currentPage >= pagination.totalPages - 2) {
                  pageNum = pagination.totalPages - 4 + i;
                } else {
                  pageNum = pagination.currentPage - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`w-10 h-10 rounded-lg font-medium transition-colors ${
                      pagination.currentPage === pageNum
                        ? 'bg-purple-600 text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => handlePageChange(pagination.currentPage + 1)}
              disabled={!pagination.hasNextPage}
              className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}

        {/* Booking Detail Modal */}
        <AnimatePresence>
          {selectedBooking && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={() => setSelectedBooking(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-2xl shadow-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900">Booking Details</h3>
                  <button
                    onClick={() => setSelectedBooking(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <FaTimesCircle className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Student Info */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h4 className="font-semibold text-gray-700 mb-3">Student Information</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Name</p>
                        <p className="font-medium">
                          {selectedBooking.studentId?.firstName} {selectedBooking.studentId?.lastName}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Email</p>
                        <p className="font-medium">{selectedBooking.studentId?.email}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Phone</p>
                        <p className="font-medium">{selectedBooking.studentId?.phone || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Session Info */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h4 className="font-semibold text-gray-700 mb-3">Session Details</h4>
                    {selectedBooking.sessions?.map((session, idx) => (
                      <div key={idx} className="space-y-2">
                        <p className="font-medium">{session.teachingEventTitle}</p>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Date: </span>
                            {new Date(session.scheduleDate).toLocaleDateString()}
                          </div>
                          <div>
                            <span className="text-gray-500">Quantity: </span>
                            {session.quantity}
                          </div>
                          <div>
                            <span className="text-gray-500">Unit Price: </span>
                            {session.currency} {session.unitPrice}
                          </div>
                          <div>
                            <span className="text-gray-500">Total: </span>
                            {session.currency} {session.totalPrice}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Payment Info */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h4 className="font-semibold text-gray-700 mb-3">Payment Summary</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Subtotal</span>
                        <span>{selectedBooking.currency} {selectedBooking.subtotal}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Tax</span>
                        <span>{selectedBooking.currency} {selectedBooking.tax}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Discount</span>
                        <span>-{selectedBooking.currency} {selectedBooking.discount}</span>
                      </div>
                      <div className="flex justify-between font-bold pt-2 border-t">
                        <span>Total</span>
                        <span>{selectedBooking.currency} {selectedBooking.totalAmount}</span>
                      </div>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm text-gray-500 mr-2">Status:</span>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          selectedBooking.status === 'confirmed'
                            ? 'bg-green-100 text-green-700'
                            : selectedBooking.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {selectedBooking.status}
                      </span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500 mr-2">Payment:</span>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          selectedBooking.paymentStatus === 'paid'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {selectedBooking.paymentStatus}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setSelectedBooking(null)}
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default TeacherBookingsPage;
