import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaPlus,
  FaSearch,
  FaList,
  FaTh,
  FaCalendarAlt,
  FaTrash,
  FaEdit,
  FaEye,
  FaStar,
} from 'react-icons/fa';
import { TeacherNavigation, TeacherEventCard } from '@/components/teacher';
import { useTeacherTeachingEvents } from '@/hooks/queries/useTeacherQuery';
import { useDeleteTeachingEvent } from '@/hooks/mutations/useTeacherMutations';
import type { ITeachingEvent, TeachingEventFilters } from '@/types/teacher';
import { ApiService } from '@/services/api';
import { toast } from 'react-hot-toast';
import { getEventImage } from '@/utils/imageFallbacks';
import { getEventMode } from '@/utils/eventMode';

const PROMOTION_TIERS = [
  { id: 'boost', label: 'Boost', days: 7, priceAED: 49, desc: 'Highlighted for 7 days' },
  { id: 'featured', label: 'Featured', days: 30, priceAED: 149, desc: 'Top placement for 30 days' },
  { id: 'premium', label: 'Premium', days: 90, priceAED: 399, desc: 'Maximum visibility for 90 days' },
] as const;

const TeacherEventsPage: React.FC = () => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filters, setFilters] = useState<TeachingEventFilters>({
    page: 1,
    limit: 12,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<ITeachingEvent | null>(null);
  const [promoteConfirm, setPromoteConfirm] = useState<ITeachingEvent | null>(null);
  const [selectedTier, setSelectedTier] = useState<'boost' | 'featured' | 'premium'>('boost');
  const [isPromoting, setIsPromoting] = useState(false);

  const { data, isLoading, refetch } = useTeacherTeachingEvents(filters);
  const deleteEventMutation = useDeleteTeachingEvent();

  const events = data?.teachingEvents || [];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters((prev) => ({ ...prev, search: searchTerm, page: 1 }));
  };

  const handleFilterChange = (key: keyof TeachingEventFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const handleEdit = (event: ITeachingEvent) => {
    navigate(`/teacher/events/${event._id}/edit`);
  };

  const handleView = (event: ITeachingEvent) => {
    navigate(`/events/${(event as any).slug || event._id}`);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;

    try {
      await deleteEventMutation.mutateAsync({ id: deleteConfirm._id });
      setDeleteConfirm(null);
      refetch();
    } catch (error) {
      console.error('Failed to delete event:', error);
    }
  };

  const handlePromote = async () => {
    if (!promoteConfirm) return;
    setIsPromoting(true);
    try {
      await ApiService.post(`/events/${promoteConfirm._id}/promote`, {
        tier: selectedTier,
        paymentMethodId: 'pm_card_visa', // replace with Stripe Elements in production
      });
      toast.success('Event promoted successfully!');
      setPromoteConfirm(null);
      refetch();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to promote event');
    } finally {
      setIsPromoting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50">
      <TeacherNavigation />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Classes</h1>
            <p className="text-gray-600 mt-1">Manage your teaching events and classes</p>
          </div>

          <Link
            to="/teacher/events/create"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105"
          >
            <FaPlus className="w-4 h-4" />
            Create New Class
          </Link>
        </div>

        {/* Search & Filters */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search classes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </form>

            {/* Filter Toggles */}
            <div className="flex items-center gap-2">
              {/* Status Filter */}
              <select
                value={filters.status || ''}
                onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
                className="px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
              >
                <option value="">All Status</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="pending">Pending</option>
                <option value="archived">Archived</option>
              </select>

              {/* Type Filter */}
              <select
                value={filters.type || ''}
                onChange={(e) => handleFilterChange('type', e.target.value || undefined)}
                className="px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
              >
                <option value="">All Types</option>
                <option value="Class">Class</option>
                <option value="Course">Course</option>
                <option value="Workshop">Workshop</option>
                <option value="Bootcamp">Bootcamp</option>
                <option value="Masterclass">Masterclass</option>
              </select>

              {/* Sort */}
              <select
                value={`${filters.sortBy}-${filters.sortOrder}`}
                onChange={(e) => {
                  const [sortBy, sortOrder] = e.target.value.split('-');
                  setFilters((prev) => ({
                    ...prev,
                    sortBy,
                    sortOrder: sortOrder as 'asc' | 'desc',
                  }));
                }}
                className="px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
              >
                <option value="createdAt-desc">Newest First</option>
                <option value="createdAt-asc">Oldest First</option>
                <option value="title-asc">Title A-Z</option>
                <option value="title-desc">Title Z-A</option>
                <option value="price-asc">Price Low-High</option>
                <option value="price-desc">Price High-Low</option>
              </select>

              {/* View Mode */}
              <div className="flex items-center bg-gray-100 rounded-xl p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-white text-purple-600 shadow'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <FaTh className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'list'
                      ? 'bg-white text-purple-600 shadow'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <FaList className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Events Grid/List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full" />
          </div>
        ) : events.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg p-12 text-center"
          >
            <FaCalendarAlt className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Classes Found</h2>
            <p className="text-gray-600 mb-6">
              {filters.search || filters.status
                ? 'No classes match your search criteria. Try adjusting your filters.'
                : 'You haven\'t created any classes yet. Start by creating your first teaching event!'}
            </p>
            <Link
              to="/teacher/events/create"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
            >
              <FaPlus className="w-4 h-4" />
              Create Your First Class
            </Link>
          </motion.div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <TeacherEventCard
                key={event._id}
                event={event}
                onEdit={handleEdit}
                onView={handleView}
                onDelete={() => setDeleteConfirm(event)}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-purple-50 to-indigo-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">
                    Class
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">
                    Type
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">
                    Price
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {events.map((event) => (
                  <motion.tr
                    key={event._id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center flex-shrink-0">
                          {event.images?.[0] ? (
                            <img
                              src={getEventImage(event.images as any, event.title, 96, 96)}
                              alt={event.title}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            <FaCalendarAlt className="w-5 h-5 text-purple-400" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{event.title}</p>
                          <p className="text-sm text-gray-500">{getEventMode(event)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-600">{event.type}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-purple-600">
                        {event.currency} {event.price}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          event.status === 'published'
                            ? 'bg-green-100 text-green-700'
                            : event.status === 'pending' || event.status === 'draft'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {event.status === 'draft' || event.status === 'pending'
                          ? 'Pending Approval'
                          : event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleView(event)}
                          className="p-2 rounded-lg text-gray-500 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                        >
                          <FaEye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(event)}
                          className="p-2 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                          <FaEdit className="w-4 h-4" />
                        </button>
                        {(event as any).isApproved && (
                          <button
                            onClick={() => { setPromoteConfirm(event); setSelectedTier('boost'); }}
                            className="p-2 rounded-lg text-gray-500 hover:text-yellow-600 hover:bg-yellow-50 transition-colors"
                            title="Promote"
                          >
                            <FaStar className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => setDeleteConfirm(event)}
                          className="p-2 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <FaTrash className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Promote Event Modal */}
        <AnimatePresence>
          {promoteConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={() => setPromoteConfirm(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-2xl shadow-xl p-6 max-w-lg w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-xl font-bold text-gray-900 mb-1">Promote Class</h3>
                <p className="text-sm text-gray-500 mb-5">{promoteConfirm.title}</p>

                <div className="space-y-3 mb-6">
                  {PROMOTION_TIERS.map((tier) => (
                    <button
                      key={tier.id}
                      onClick={() => setSelectedTier(tier.id)}
                      className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                        selectedTier === tier.id
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-purple-300'
                      }`}
                    >
                      <div className="text-left">
                        <div className="font-semibold text-gray-900">{tier.label}</div>
                        <div className="text-sm text-gray-500">{tier.desc}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-purple-600">{tier.priceAED} AED</div>
                        <div className="text-xs text-gray-400">{tier.days} days</div>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-end gap-3">
                  <button
                    onClick={() => setPromoteConfirm(null)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                    disabled={isPromoting}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePromote}
                    disabled={isPromoting}
                    className="px-6 py-2 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50"
                  >
                    {isPromoting ? 'Processing...' : 'Pay & Promote'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {deleteConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={() => setDeleteConfirm(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Class?</h3>
                <p className="text-gray-600 mb-6">
                  Are you sure you want to delete "{deleteConfirm.title}"? This action cannot be
                  undone.
                </p>
                <div className="flex items-center justify-end gap-3">
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleteEventMutation.isPending}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {deleteEventMutation.isPending ? 'Deleting...' : 'Delete'}
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

export default TeacherEventsPage;
