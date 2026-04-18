import React, { useState, useMemo, useRef, useEffect } from 'react';
import { FaSearch, FaEdit, FaTrash, FaEye, FaCheck, FaTimes, FaStar, FaUndo, FaPlus, FaWpforms } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import DOMPurify from 'isomorphic-dompurify';
import { useQueryClient } from '@tanstack/react-query';

import TeacherEventEditModal from '../../components/admin/TeacherEventEditModal';
import adminAPI from '../../services/api/adminAPI';
import { MediaAsset } from '../../store/legacySlices/mediaSlice';
import { useAdminTeachingEventsQuery } from '@/hooks/queries/useAdminQuery';
import {
  useApproveTeachingEventMutation,
  useRejectTeachingEventMutation,
  useDeleteTeachingEventMutation,
  useRestoreTeachingEventMutation,
  useToggleTeachingEventFeaturedMutation,
} from '@/hooks/mutations/useTeachingEventMutations';
import { teachingEventsKeys, adminKeys } from '@/hooks/queries/queryKeys';
import logger from '@/utils/logger';

interface TeachingEvent {
  id: string;
  title: string;
  description: string;
  category?: string;
  type: 'Class' | 'Course' | 'Workshop' | 'Bootcamp' | 'Masterclass';
  eventType: 'Online' | 'Offline';
  ageRange?: [number, number];
  location: {
    country?: string;
    city: string;
    address: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
  teacher: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  price: number;
  currency: string;
  isApproved: boolean;
  isFeatured: boolean;
  viewsCount: number;
  images: string[];
  imageUrls?: string[];
  imageAssets?: MediaAsset[];
  isDeleted: boolean;
  tags: string[];
  dateSchedule: Array<{
    _id?: string;
    date?: string;
    startDate?: string;
    endDate?: string;
    availableSeats: number;
    totalSeats?: number;
    price: number;
  }>;
  seoMeta?: {
    title: string;
    description: string;
    keywords: string[];
  };
  faqs?: Array<{
    _id?: string;
    question: string;
    answer: string;
  }>;
  meetingLink?: string;
  customCSS?: string;
  createdAt: string;
  updatedAt: string;
}

const AdminTeachingEventsPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Filter state (kept as local state for UI control)
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [featuredFilter, setFeaturedFilter] = useState<string>('all');
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');

  // Client-side pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(20);

  // Fetch ALL teaching events (client-side filtering)
  const { data: teachingEventsResponse, isLoading, error } = useAdminTeachingEventsQuery({ limit: 1000 });

  // Extract data with fallbacks
  const teachingEvents = teachingEventsResponse?.data?.teachingEvents || teachingEventsResponse?.teachingEvents || [];

  // Client-side filtering
  const filteredTeachingEvents = useMemo(() => {
    let filtered = [...teachingEvents];

    // Search filter (title, description, location, teacher)
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(event =>
        event.title.toLowerCase().includes(search) ||
        event.description.toLowerCase().includes(search) ||
        event.location.city.toLowerCase().includes(search) ||
        event.teacher?.fullName?.toLowerCase().includes(search) ||
        event.teacher?.email?.toLowerCase().includes(search) ||
        event.category?.toLowerCase().includes(search)
      );
    }

    // Status filter (approval + deletion status)
    if (statusFilter !== 'all') {
      switch (statusFilter) {
        case 'approved':
          filtered = filtered.filter(e => e.isApproved && !e.isDeleted);
          break;
        case 'pending':
          filtered = filtered.filter(e => !e.isApproved && !e.isDeleted);
          break;
        case 'deleted':
          filtered = filtered.filter(e => e.isDeleted);
          break;
      }
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(e => e.category === categoryFilter);
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(e => e.type === typeFilter);
    }

    // Event Type filter (Online/Offline)
    if (eventTypeFilter !== 'all') {
      filtered = filtered.filter(e => e.eventType === eventTypeFilter);
    }

    // Featured filter
    if (featuredFilter === 'featured') {
      filtered = filtered.filter(e => e.isFeatured);
    } else if (featuredFilter === 'not-featured') {
      filtered = filtered.filter(e => !e.isFeatured);
    }

    return filtered;
  }, [teachingEvents, searchTerm, statusFilter, categoryFilter, typeFilter, eventTypeFilter, featuredFilter]);

  // Client-side pagination calculations
  const totalPages = Math.ceil(filteredTeachingEvents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTeachingEvents = filteredTeachingEvents.slice(startIndex, endIndex);

  // Mutation hooks with automatic cache invalidation
  const approveTeachingEvent = useApproveTeachingEventMutation();
  const rejectTeachingEvent = useRejectTeachingEventMutation();
  const deleteTeachingEvent = useDeleteTeachingEventMutation();
  const restoreTeachingEvent = useRestoreTeachingEventMutation();
  const toggleFeatured = useToggleTeachingEventFeaturedMutation();

  const parentRef = useRef<HTMLDivElement>(null);

  // Bulk operations
  const [selectedTeachingEventIds, setSelectedTeachingEventIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<string>('');
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);

  // Modal states
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [teachingEventToDelete, setTeachingEventToDelete] = useState<string | null>(null);
  const [teachingEventToApprove, setTeachingEventToApprove] = useState<string | null>(null);
  const [selectedTeachingEvent, setSelectedTeachingEvent] = useState<TeachingEvent | null>(null);
  const [teachingEventToEdit, setTeachingEventToEdit] = useState<TeachingEvent | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');

  // Get unique categories from teaching events
  const categories = useMemo(() => {
    const uniqueCategories = Array.from(new Set(teachingEvents.map((e: any) => e.category).filter(Boolean)));
    return uniqueCategories as string[];
  }, [teachingEvents]);

  const handleDeleteTeachingEvent = (teachingEventId: string, permanent: boolean = false) => {
    deleteTeachingEvent.mutate(
      { teachingEventId, permanent },
      {
        onSuccess: () => {
          setTeachingEventToDelete(null);
          setIsDeleteModalOpen(false);
          setActionType(null);
        },
      }
    );
  };

  const handleRestoreTeachingEvent = (teachingEventId: string) => {
    restoreTeachingEvent.mutate(teachingEventId);
  };

  const handleApproveTeachingEvent = (teachingEventId: string) => {
    approveTeachingEvent.mutate(teachingEventId, {
      onSuccess: () => {
        setTeachingEventToApprove(null);
        setIsApprovalModalOpen(false);
        setActionType(null);
      },
    });
  };

  const handleRejectTeachingEvent = (teachingEventId: string, reason: string) => {
    rejectTeachingEvent.mutate(
      { teachingEventId, reason },
      {
        onSuccess: () => {
          setIsApprovalModalOpen(false);
          setActionType(null);
          setRejectionReason('');
        },
      }
    );
  };

  const handleToggleFeatured = (teachingEventId: string) => {
    toggleFeatured.mutate(teachingEventId);
  };

  // Bulk operations handlers
  const toggleSelectAll = () => {
    const currentPageIds = paginatedTeachingEvents.map(e => e.id);
    const allCurrentPageSelected = currentPageIds.every(id => selectedTeachingEventIds.includes(id));

    if (allCurrentPageSelected) {
      // Deselect all on current page
      setSelectedTeachingEventIds(prev => prev.filter(id => !currentPageIds.includes(id)));
    } else {
      // Select all on current page
      setSelectedTeachingEventIds(prev => [...new Set([...prev, ...currentPageIds])]);
    }
  };

  const toggleSelectTeachingEvent = (teachingEventId: string) => {
    setSelectedTeachingEventIds(prev =>
      prev.includes(teachingEventId)
        ? prev.filter(id => id !== teachingEventId)
        : [...prev, teachingEventId]
    );
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedTeachingEventIds.length === 0) return;

    try {
      switch (bulkAction) {
        case 'approve':
          await adminAPI.bulkUpdateTeachingEvents(selectedTeachingEventIds, { isApproved: true });
          break;
        case 'reject':
          await adminAPI.bulkUpdateTeachingEvents(selectedTeachingEventIds, { isApproved: false });
          break;
        case 'feature':
          await adminAPI.bulkUpdateTeachingEvents(selectedTeachingEventIds, { isFeatured: true });
          break;
        case 'unfeature':
          await adminAPI.bulkUpdateTeachingEvents(selectedTeachingEventIds, { isFeatured: false });
          break;
        case 'delete':
          for (const teachingEventId of selectedTeachingEventIds) {
            await adminAPI.deleteTeachingEvent(teachingEventId, false);
          }
          break;
        default:
          break;
      }

      // Invalidate queries to trigger refetch
      queryClient.invalidateQueries({ queryKey: teachingEventsKeys.all });
      queryClient.invalidateQueries({ queryKey: adminKeys.teachingEvents.all() });

      setSelectedTeachingEventIds([]);
      setBulkAction('');
      setShowBulkConfirm(false);
    } catch (error: any) {
      logger.error('Error performing bulk action:', error);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      // Scroll to top of table
      parentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, categoryFilter, typeFilter, eventTypeFilter, featuredFilter]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Teaching Events Management</h1>
            <p className="text-gray-600">Manage and moderate teaching events from teachers</p>
          </div>
          <button
            onClick={() => navigate('/admin/teaching-events/create')}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <FaPlus className="mr-2" />
            Create New Teaching Event
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <FaTimes className="text-red-600 mr-2" />
              <p className="text-red-800">
                {error instanceof Error ? error.message : 'An error occurred while loading teaching events'}
              </p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search teaching events..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
              >
                <option value="all">All Status</option>
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
                <option value="deleted">Deleted</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
              >
                <option value="all">All Types</option>
                <option value="Class">Class</option>
                <option value="Course">Course</option>
                <option value="Workshop">Workshop</option>
                <option value="Bootcamp">Bootcamp</option>
                <option value="Masterclass">Masterclass</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Event Type</label>
              <select
                value={eventTypeFilter}
                onChange={(e) => setEventTypeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
              >
                <option value="all">All</option>
                <option value="Online">Online</option>
                <option value="Offline">Offline</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Featured</label>
              <select
                value={featuredFilter}
                onChange={(e) => setFeaturedFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
              >
                <option value="all">All Events</option>
                <option value="featured">Featured Only</option>
                <option value="not-featured">Not Featured</option>
              </select>
            </div>
          </div>

          {/* Second row for Category filter */}
          {categories.length > 0 && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full md:w-1/3 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
              >
                <option value="all">All Categories</option>
                {categories.map((cat: string) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Bulk Actions Toolbar */}
        {selectedTeachingEventIds.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="font-medium text-blue-900">
                  {selectedTeachingEventIds.length} teaching event{selectedTeachingEventIds.length > 1 ? 's' : ''} selected
                </span>
                <select
                  value={bulkAction}
                  onChange={(e) => setBulkAction(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                >
                  <option value="">Select action...</option>
                  <option value="approve">Approve</option>
                  <option value="reject">Reject</option>
                  <option value="feature">Mark as Featured</option>
                  <option value="unfeature">Remove Featured</option>
                  <option value="delete">Soft Delete</option>
                </select>
                <button
                  onClick={() => setShowBulkConfirm(true)}
                  disabled={!bulkAction}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Apply
                </button>
              </div>
              <button
                onClick={() => setSelectedTeachingEventIds([])}
                className="text-gray-600 hover:text-gray-800"
              >
                Clear Selection
              </button>
            </div>
          </div>
        )}

        {/* Results Count */}
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {filteredTeachingEvents.length === teachingEvents.length ? (
              <>
                Total: <span className="font-semibold text-gray-900">{teachingEvents.length}</span> teaching events
              </>
            ) : (
              <>
                Filtered: <span className="font-semibold text-gray-900">{filteredTeachingEvents.length}</span> of{' '}
                <span className="font-semibold text-gray-900">{teachingEvents.length}</span> teaching events
              </>
            )}
          </div>
        </div>

        {/* Teaching Events Table with Virtualization */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div
            ref={parentRef}
            className="overflow-auto"
            style={{ maxHeight: '800px' }}
          >
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={
                        paginatedTeachingEvents.length > 0 &&
                        paginatedTeachingEvents.every(e => selectedTeachingEventIds.includes(e.id))
                      }
                      onChange={toggleSelectAll}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Teaching Event
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Teacher
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Views
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedTeachingEvents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      No teaching events found. Try adjusting your filters.
                    </td>
                  </tr>
                ) : (
                  paginatedTeachingEvents.map((teachingEvent) => (
                      <tr
                        key={teachingEvent.id}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-4 py-4">
                          <input
                            type="checkbox"
                            checked={selectedTeachingEventIds.includes(teachingEvent.id)}
                            onChange={() => toggleSelectTeachingEvent(teachingEvent.id)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <img
                                className="h-10 w-10 rounded-full object-cover"
                                src={teachingEvent.imageUrls?.[0] || teachingEvent.images?.[0] || '/default-event.jpg'}
                                alt=""
                              />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {teachingEvent.title}
                              </div>
                              <div className="text-sm text-gray-500">
                                {teachingEvent.eventType} • {teachingEvent.location.city}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {teachingEvent.teacher?.fullName || 'N/A'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {teachingEvent.teacher?.email || ''}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            {teachingEvent.isDeleted ? (
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                                Deleted
                              </span>
                            ) : teachingEvent.isApproved ? (
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                Approved
                              </span>
                            ) : (
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                Pending
                              </span>
                            )}
                            {teachingEvent.isFeatured && (
                              <FaStar className="text-yellow-500" size={14} />
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {teachingEvent.currency} {teachingEvent.price}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {teachingEvent.viewsCount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => {
                                setSelectedTeachingEvent(teachingEvent);
                                setIsViewModalOpen(true);
                              }}
                              className="text-blue-600 hover:text-blue-900"
                              title="View Details"
                            >
                              <FaEye className="w-4 h-4" />
                            </button>

                            {!teachingEvent.isDeleted && (
                              <>
                                <button
                                  onClick={() => navigate(`/admin/teaching-events/${teachingEvent.id}/edit`)}
                                  className="text-indigo-600 hover:text-indigo-900"
                                  title="Edit Teaching Event"
                                >
                                  <FaEdit className="w-4 h-4" />
                                </button>

                                {!teachingEvent.isApproved && (
                                  <button
                                    onClick={() => {
                                      setTeachingEventToApprove(teachingEvent.id);
                                      setActionType('approve');
                                      setIsApprovalModalOpen(true);
                                    }}
                                    className="text-green-600 hover:text-green-900"
                                    title="Approve Teaching Event"
                                  >
                                    <FaCheck className="w-4 h-4" />
                                  </button>
                                )}

                                <button
                                  onClick={() => handleToggleFeatured(teachingEvent.id)}
                                  className={`${teachingEvent.isFeatured ? 'text-yellow-500' : 'text-gray-400'} hover:text-yellow-600`}
                                  title="Toggle Featured"
                                >
                                  <FaStar className="w-4 h-4" />
                                </button>

                                <button
                                  onClick={() => navigate(`/admin/teaching-events/${teachingEvent.id}/registration/builder`)}
                                  className="text-purple-600 hover:text-purple-900"
                                  title="Form Builder"
                                >
                                  <FaWpforms className="w-4 h-4" />
                                </button>

                                <button
                                  onClick={() => {
                                    setTeachingEventToDelete(teachingEvent.id);
                                    setIsDeleteModalOpen(true);
                                  }}
                                  className="text-red-600 hover:text-red-900"
                                  title="Delete Teaching Event"
                                >
                                  <FaTrash className="w-4 h-4" />
                                </button>
                              </>
                            )}

                            {teachingEvent.isDeleted && (
                              <button
                                onClick={() => handleRestoreTeachingEvent(teachingEvent.id)}
                                className="text-blue-600 hover:text-blue-900"
                                title="Restore Teaching Event"
                              >
                                <FaUndo className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 bg-white">
              <div className="flex items-center justify-between">
                {/* Item count */}
                <div className="text-sm text-gray-600">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredTeachingEvents.length)} of{' '}
                  {filteredTeachingEvents.length} teaching events
                </div>

                {/* Page buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Previous
                  </button>

                  {/* Page numbers */}
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => {
                      // Show: first, last, current, and 2 pages around current
                      return page === 1 ||
                        page === totalPages ||
                        Math.abs(page - currentPage) <= 2;
                    })
                    .map((page, idx, arr) => (
                      <React.Fragment key={page}>
                        {idx > 0 && arr[idx - 1] !== page - 1 && (
                          <span className="px-2 text-gray-400">...</span>
                        )}
                        <button
                          onClick={() => handlePageChange(page)}
                          className={`px-3 py-1 rounded-lg ${page === currentPage
                              ? 'bg-blue-600 text-white'
                              : 'border border-gray-300 hover:bg-gray-50'
                            }`}
                        >
                          {page}
                        </button>
                      </React.Fragment>
                    ))}

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {isDeleteModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-medium mb-4">Confirm Delete</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this teaching event? You can choose to soft delete (recoverable) or permanently delete.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setTeachingEventToDelete(null);
                  }}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => teachingEventToDelete && handleDeleteTeachingEvent(teachingEventToDelete, false)}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
                >
                  Soft Delete
                </button>
                <button
                  onClick={() => teachingEventToDelete && handleDeleteTeachingEvent(teachingEventToDelete, true)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Permanent Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Approval Modal */}
        {isApprovalModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-medium mb-4">
                {actionType === 'approve' ? 'Approve Teaching Event' : 'Reject Teaching Event'}
              </h3>

              {actionType === 'reject' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rejection Reason
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                    rows={3}
                    placeholder="Please provide a reason for rejection..."
                  />
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setIsApprovalModalOpen(false);
                    setTeachingEventToApprove(null);
                    setActionType(null);
                    setRejectionReason('');
                  }}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (actionType === 'approve' && teachingEventToApprove) {
                      handleApproveTeachingEvent(teachingEventToApprove);
                    } else if (actionType === 'reject' && teachingEventToApprove) {
                      handleRejectTeachingEvent(teachingEventToApprove, rejectionReason);
                    }
                  }}
                  className={`px-4 py-2 text-white rounded-lg ${actionType === 'approve'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                    }`}
                >
                  {actionType === 'approve' ? 'Approve' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Teaching Event Details Modal */}
        {isViewModalOpen && selectedTeachingEvent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-2xl font-bold text-gray-900">{selectedTeachingEvent.title}</h3>
                  <button
                    onClick={() => setIsViewModalOpen(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <FaTimes className="w-6 h-6" />
                  </button>
                </div>

                {/* Status Badges */}
                <div className="flex items-center gap-2 mb-4">
                  {selectedTeachingEvent.isApproved ? (
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                      Approved
                    </span>
                  ) : (
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                      Pending
                    </span>
                  )}
                  {selectedTeachingEvent.isFeatured && (
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      <FaStar className="inline mr-1" size={10} />
                      Featured
                    </span>
                  )}
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                    {selectedTeachingEvent.type}
                  </span>
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                    {selectedTeachingEvent.eventType}
                  </span>
                </div>

                {/* Images */}
                {selectedTeachingEvent.imageUrls && selectedTeachingEvent.imageUrls.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Images</p>
                    <div className="grid grid-cols-3 gap-2">
                      {selectedTeachingEvent.imageUrls.slice(0, 3).map((imgUrl, idx) => (
                        <img
                          key={idx}
                          src={imgUrl}
                          alt={`Teaching Event ${idx + 1}`}
                          className="w-full h-32 object-cover rounded-lg"
                          onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                            e.currentTarget.src = '/default-event.jpg';
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Category</p>
                    <p className="text-gray-900">{selectedTeachingEvent.category || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Event Type</p>
                    <p className="text-gray-900">{selectedTeachingEvent.eventType}</p>
                  </div>
                  {selectedTeachingEvent.ageRange && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Age Range</p>
                      <p className="text-gray-900">{selectedTeachingEvent.ageRange[0]} - {selectedTeachingEvent.ageRange[1]} years</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-500">Price</p>
                    <p className="text-gray-900">{selectedTeachingEvent.currency} {selectedTeachingEvent.price}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Location</p>
                    <p className="text-gray-900">{selectedTeachingEvent.location.address}, {selectedTeachingEvent.location.city}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Teacher</p>
                    <p className="text-gray-900">{selectedTeachingEvent.teacher?.fullName || 'N/A'}</p>
                    <p className="text-xs text-gray-500">{selectedTeachingEvent.teacher?.email || ''}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Views</p>
                    <p className="text-gray-900">{selectedTeachingEvent.viewsCount.toLocaleString()}</p>
                  </div>
                  {selectedTeachingEvent.meetingLink && (
                    <div className="col-span-2">
                      <p className="text-sm font-medium text-gray-500">Meeting Link</p>
                      <a href={selectedTeachingEvent.meetingLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                        {selectedTeachingEvent.meetingLink}
                      </a>
                    </div>
                  )}
                </div>

                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Description</p>
                  <div
                    className="text-gray-900 text-sm prose max-w-none"
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(selectedTeachingEvent.description || '', {
                        ADD_ATTR: ['style', 'class'],
                        ADD_TAGS: ['iframe'],
                        ALLOWED_ATTR: ['style', 'class', 'href', 'src', 'alt', 'title', 'target', 'rel', 'width', 'height', 'id', 'frameborder', 'allow', 'allowfullscreen']
                      })
                    }}
                  />
                </div>

                {/* Tags */}
                {selectedTeachingEvent.tags && selectedTeachingEvent.tags.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Tags</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedTeachingEvent.tags.map((tag, idx) => (
                        <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Date Schedules */}
                {selectedTeachingEvent.dateSchedule && selectedTeachingEvent.dateSchedule.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Date Schedules</p>
                    <div className="space-y-2">
                      {selectedTeachingEvent.dateSchedule.map((schedule, idx) => (
                        <div key={idx} className="bg-gray-50 p-3 rounded-lg text-sm">
                          <p>
                            <span className="font-medium">Date:</span>{' '}
                            {schedule.startDate
                              ? new Date(schedule.startDate).toLocaleString()
                              : schedule.date
                                ? new Date(schedule.date).toLocaleString()
                                : 'N/A'}
                            {schedule.endDate && ` - ${new Date(schedule.endDate).toLocaleString()}`}
                          </p>
                          <p>
                            <span className="font-medium">Seats:</span> {schedule.availableSeats} available
                            {schedule.totalSeats && ` / ${schedule.totalSeats} total`}
                          </p>
                          <p>
                            <span className="font-medium">Price:</span> {selectedTeachingEvent.currency} {schedule.price}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* FAQs */}
                {selectedTeachingEvent.faqs && selectedTeachingEvent.faqs.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">FAQs</p>
                    <div className="space-y-2">
                      {selectedTeachingEvent.faqs.map((faq, idx) => (
                        <div key={idx} className="bg-gray-50 p-3 rounded-lg">
                          <p className="font-medium text-sm text-gray-900">{faq.question}</p>
                          <p className="text-sm text-gray-700 mt-1">{faq.answer}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* SEO Meta */}
                {selectedTeachingEvent.seoMeta && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">SEO Meta</p>
                    <div className="bg-gray-50 p-3 rounded-lg text-sm space-y-1">
                      {selectedTeachingEvent.seoMeta.title && (
                        <p><span className="font-medium">Title:</span> {selectedTeachingEvent.seoMeta.title}</p>
                      )}
                      {selectedTeachingEvent.seoMeta.description && (
                        <p><span className="font-medium">Description:</span> {selectedTeachingEvent.seoMeta.description}</p>
                      )}
                      {selectedTeachingEvent.seoMeta.keywords && selectedTeachingEvent.seoMeta.keywords.length > 0 && (
                        <p><span className="font-medium">Keywords:</span> {selectedTeachingEvent.seoMeta.keywords.join(', ')}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Timestamps */}
                <div className="mb-4 text-xs text-gray-500">
                  <p>Created: {new Date(selectedTeachingEvent.createdAt).toLocaleString()}</p>
                  <p>Updated: {new Date(selectedTeachingEvent.updatedAt).toLocaleString()}</p>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setIsViewModalOpen(false);
                      setTeachingEventToEdit(selectedTeachingEvent);
                      setIsEditModalOpen(true);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
                  >
                    <FaEdit className="mr-2" />
                    Edit
                  </button>
                  <button
                    onClick={() => setIsViewModalOpen(false)}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Confirm Modal */}
        {showBulkConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-medium mb-4">Confirm Bulk Action</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to perform this action on {selectedTeachingEventIds.length} teaching event{selectedTeachingEventIds.length > 1 ? 's' : ''}?
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowBulkConfirm(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkAction}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Teaching Event Edit Modal */}
        {isEditModalOpen && teachingEventToEdit && (
          <TeacherEventEditModal
            teachingEvent={teachingEventToEdit}
            isOpen={isEditModalOpen}
            onClose={() => {
              setIsEditModalOpen(false);
              setTeachingEventToEdit(null);
            }}
            onSave={() => {
              queryClient.invalidateQueries({ queryKey: teachingEventsKeys.all });
              queryClient.invalidateQueries({ queryKey: adminKeys.teachingEvents.all() });
            }}
          />
        )}
      </div>
    </div>
  );
};

export default AdminTeachingEventsPage;
