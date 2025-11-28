import React, { useState, useEffect } from 'react';
import { FaSearch, FaEdit, FaTrash, FaEye, FaCheck, FaTimes, FaStar, FaUndo, FaPlus, FaWpforms } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import DOMPurify from 'isomorphic-dompurify';
import adminAPI from '../../services/api/adminAPI';
import EventEditModal from '../../components/admin/EventEditModal';
import categoriesAPI, { Category } from '../../services/api/categoriesAPI';

interface Event {
  id: string;
  title: string;
  description: string;
  category: string;
  type: 'Olympiad' | 'Championship' | 'Competition' | 'Event' | 'Course' | 'Venue' | 'Workshop';
  venueType: 'Indoor' | 'Outdoor' | 'Online' | 'Offline';
  ageRange: [number, number];
  location: {
    city: string;
    address: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
  vendor: {
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
  imageAssets?: Array<{
    id: string;
    url: string;
    thumbnailUrl?: string;
    variations?: any;
  }>;
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
  createdAt: string;
  updatedAt: string;
}

const AdminEventsPage: React.FC = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [featuredFilter, setFeaturedFilter] = useState<string>('all');

  // Bulk operations
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<string>('');
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);

  // Modal states
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);
  const [eventToApprove, setEventToApprove] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [eventToEdit, setEventToEdit] = useState<Event | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');

  useEffect(() => {
    fetchEvents();
    fetchCategories();
  }, [searchTerm, statusFilter, categoryFilter, typeFilter, featuredFilter]);

  const fetchEvents = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Build filter params for API
      const params: any = {};

      if (searchTerm) {
        params.search = searchTerm;
      }

      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      if (categoryFilter !== 'all') {
        params.category = categoryFilter;
      }

      if (typeFilter !== 'all') {
        params.type = typeFilter;
      }

      if (featuredFilter !== 'all') {
        params.isFeatured = featuredFilter === 'featured';
      }

      // Call the admin API
      const response = await adminAPI.getAllEvents(params);

      // Extract events from response
      const eventsData = response.data?.events || response.events || [];

      setEvents(eventsData);
      setFilteredEvents(eventsData);
    } catch (error: any) {
      console.error('Error fetching events:', error);
      setError(error.response?.data?.message || error.message || 'Failed to fetch events');
      setEvents([]);
      setFilteredEvents([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await categoriesAPI.getAllCategories({ tree: false, includeInactive: false });
      const categoriesList = response.data || [];
      setCategories(categoriesList);
    } catch (error: any) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleDeleteEvent = async (eventId: string, permanent: boolean = false) => {
    try {
      await adminAPI.deleteEvent(eventId, permanent);

      // Refresh events list
      await fetchEvents();

      setEventToDelete(null);
      setIsDeleteModalOpen(false);
      setActionType(null);
    } catch (error: any) {
      console.error('Error deleting event:', error);
      setError(error.response?.data?.message || error.message || 'Failed to delete event');
    }
  };

  const handleRestoreEvent = async (eventId: string) => {
    try {
      await adminAPI.restoreEvent(eventId);

      // Refresh events list
      await fetchEvents();
    } catch (error: any) {
      console.error('Error restoring event:', error);
      setError(error.response?.data?.message || error.message || 'Failed to restore event');
    }
  };

  const handleApproveEvent = async (eventId: string) => {
    try {
      await adminAPI.approveEvent(eventId);

      // Refresh events list
      await fetchEvents();

      setEventToApprove(null);
      setIsApprovalModalOpen(false);
      setActionType(null);
    } catch (error: any) {
      console.error('Error approving event:', error);
      setError(error.response?.data?.message || error.message || 'Failed to approve event');
    }
  };

  const handleRejectEvent = async (eventId: string, reason: string) => {
    try {
      await adminAPI.rejectEvent(eventId, reason);

      // Refresh events list
      await fetchEvents();

      setIsApprovalModalOpen(false);
      setActionType(null);
      setRejectionReason('');
    } catch (error: any) {
      console.error('Error rejecting event:', error);
      setError(error.response?.data?.message || error.message || 'Failed to reject event');
    }
  };

  const handleToggleFeatured = async (eventId: string) => {
    try {
      await adminAPI.toggleEventFeatured(eventId);

      // Refresh events list
      await fetchEvents();
    } catch (error: any) {
      console.error('Error toggling featured status:', error);
      setError(error.response?.data?.message || error.message || 'Failed to toggle featured status');
    }
  };

  // Bulk operations handlers
  const toggleSelectAll = () => {
    if (selectedEventIds.length === filteredEvents.length) {
      setSelectedEventIds([]);
    } else {
      setSelectedEventIds(filteredEvents.map(e => e.id));
    }
  };

  const toggleSelectEvent = (eventId: string) => {
    setSelectedEventIds(prev =>
      prev.includes(eventId)
        ? prev.filter(id => id !== eventId)
        : [...prev, eventId]
    );
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedEventIds.length === 0) return;

    try {
      setIsLoading(true);
      setError(null);

      switch (bulkAction) {
        case 'approve':
          await adminAPI.bulkUpdateEvents(selectedEventIds, { isApproved: true });
          break;
        case 'reject':
          await adminAPI.bulkUpdateEvents(selectedEventIds, { isApproved: false });
          break;
        case 'feature':
          await adminAPI.bulkUpdateEvents(selectedEventIds, { isFeatured: true });
          break;
        case 'unfeature':
          await adminAPI.bulkUpdateEvents(selectedEventIds, { isFeatured: false });
          break;
        case 'delete':
          for (const eventId of selectedEventIds) {
            await adminAPI.deleteEvent(eventId, false);
          }
          break;
        default:
          break;
      }

      // Refresh events list
      await fetchEvents();
      setSelectedEventIds([]);
      setBulkAction('');
      setShowBulkConfirm(false);
    } catch (error: any) {
      console.error('Error performing bulk action:', error);
      setError(error.response?.data?.message || error.message || 'Failed to perform bulk action');
    } finally {
      setIsLoading(false);
    }
  };

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
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Events Management</h1>
              <p className="text-gray-600">Manage and moderate events from vendors</p>
            </div>
            <button
              onClick={() => navigate('/admin/events/create')}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <FaPlus className="mr-2" />
              Create New Event
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <FaTimes className="text-red-600 mr-2" />
                  <p className="text-red-800">{error}</p>
                </div>
                <button
                  onClick={() => setError(null)}
                  className="text-red-600 hover:text-red-800"
                >
                  <FaTimes className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="bg-white rounded-lg shadow mb-6 p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                <div className="relative">
                  <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search events..."
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
                  <option value="Olympiad">Olympiad</option>
                  <option value="Championship">Championship</option>
                  <option value="Competition">Competition</option>
                  <option value="Event">Event</option>
                  <option value="Course">Course</option>
                  <option value="Venue">Venue</option>
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
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full md:w-1/3 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
              >
                <option value="all">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat._id} value={cat.slug}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Bulk Actions Toolbar */}
          {selectedEventIds.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="font-medium text-blue-900">
                    {selectedEventIds.length} event{selectedEventIds.length > 1 ? 's' : ''} selected
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
                  onClick={() => setSelectedEventIds([])}
                  className="text-gray-600 hover:text-gray-800"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          )}

          {/* Events Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedEventIds.length === filteredEvents.length && filteredEvents.length > 0}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Event
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vendor
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
                  {filteredEvents.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                        No events found. Try adjusting your filters.
                      </td>
                    </tr>
                  ) : (
                    filteredEvents.map((event) => (
                    <tr key={event.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedEventIds.includes(event.id)}
                          onChange={() => toggleSelectEvent(event.id)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <img
                              className="h-10 w-10 rounded-full object-cover"
                              src={event.imageUrls?.[0] || event.images?.[0] || '/default-event.jpg'}
                              alt=""
                            />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {event.title}
                            </div>
                            <div className="text-sm text-gray-500">
                              {event.location.city}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {event.vendor?.fullName || 'N/A'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {event.vendor?.email || ''}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {event.isDeleted ? (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                              Deleted
                            </span>
                          ) : event.isApproved ? (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                              Approved
                            </span>
                          ) : (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                              Pending
                            </span>
                          )}
                          {event.isFeatured && (
                            <FaStar className="text-yellow-500" size={14} />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {event.currency} {event.price}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {event.viewsCount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              setSelectedEvent(event);
                              setIsViewModalOpen(true);
                            }}
                            className="text-blue-600 hover:text-blue-900"
                            title="View Details"
                          >
                            <FaEye className="w-4 h-4" />
                          </button>

                          {!event.isDeleted && (
                            <>
                              <button
                                onClick={() => navigate(`/admin/events/${event.id}/edit`)}
                                className="text-indigo-600 hover:text-indigo-900"
                                title="Edit Event"
                              >
                                <FaEdit className="w-4 h-4" />
                              </button>

                              {!event.isApproved && (
                                <button
                                  onClick={() => {
                                    setEventToApprove(event.id);
                                    setActionType('approve');
                                    setIsApprovalModalOpen(true);
                                  }}
                                  className="text-green-600 hover:text-green-900"
                                  title="Approve Event"
                                >
                                  <FaCheck className="w-4 h-4" />
                                </button>
                              )}

                              <button
                                onClick={() => handleToggleFeatured(event.id)}
                                className={`${event.isFeatured ? 'text-yellow-500' : 'text-gray-400'} hover:text-yellow-600`}
                                title="Toggle Featured"
                              >
                                <FaStar className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => navigate(`/admin/events/${event.id}/registration/builder`)}
                                className="text-purple-600 hover:text-purple-900"
                                title="Form Builder"
                              >
                                <FaWpforms className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => {
                                  setEventToDelete(event.id);
                                  setIsDeleteModalOpen(true);
                                }}
                                className="text-red-600 hover:text-red-900"
                                title="Delete Event"
                              >
                                <FaTrash className="w-4 h-4" />
                              </button>
                            </>
                          )}

                          {event.isDeleted && (
                            <button
                              onClick={() => handleRestoreEvent(event.id)}
                              className="text-blue-600 hover:text-blue-900"
                              title="Restore Event"
                            >
                              <FaUndo className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Delete Confirmation Modal */}
          {isDeleteModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h3 className="text-lg font-medium mb-4">Confirm Delete</h3>
                <p className="text-gray-600 mb-6">
                  Are you sure you want to delete this event? You can choose to soft delete (recoverable) or permanently delete.
                </p>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setIsDeleteModalOpen(false);
                      setEventToDelete(null);
                    }}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => eventToDelete && handleDeleteEvent(eventToDelete, false)}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
                  >
                    Soft Delete
                  </button>
                  <button
                    onClick={() => eventToDelete && handleDeleteEvent(eventToDelete, true)}
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
                  {actionType === 'approve' ? 'Approve Event' : 'Reject Event'}
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
                      setEventToApprove(null);
                      setActionType(null);
                      setRejectionReason('');
                    }}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (actionType === 'approve' && eventToApprove) {
                        handleApproveEvent(eventToApprove);
                      } else if (actionType === 'reject' && eventToApprove) {
                        handleRejectEvent(eventToApprove, rejectionReason);
                      }
                    }}
                    className={`px-4 py-2 text-white rounded-lg ${
                      actionType === 'approve'
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

          {/* Event Details Modal */}
          {isViewModalOpen && selectedEvent && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-2xl font-bold text-gray-900">{selectedEvent.title}</h3>
                    <button
                      onClick={() => setIsViewModalOpen(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <FaTimes className="w-6 h-6" />
                    </button>
                  </div>

                  {/* Status Badges */}
                  <div className="flex items-center gap-2 mb-4">
                    {selectedEvent.isApproved ? (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        Approved
                      </span>
                    ) : (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                        Pending
                      </span>
                    )}
                    {selectedEvent.isFeatured && (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        <FaStar className="inline mr-1" size={10} />
                        Featured
                      </span>
                    )}
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                      {selectedEvent.type}
                    </span>
                  </div>

                   {/* Images */}
                   {selectedEvent.imageUrls && selectedEvent.imageUrls.length > 0 && (
                      <div className="mb-4">
                        <p className="text-sm font-medium text-gray-700 mb-2">Images</p>
                        <div className="grid grid-cols-3 gap-2">
                          {selectedEvent.imageUrls.slice(0, 3).map((imgUrl, idx) => (
                            <img
                              key={idx}
                              src={imgUrl}
                              alt={`Event ${idx + 1}`}
                              className="w-full h-32 object-cover rounded-lg"
                              onError={(e) => {
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
                      <p className="text-gray-900">{selectedEvent.category}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Venue Type</p>
                      <p className="text-gray-900">{selectedEvent.venueType}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Age Range</p>
                      <p className="text-gray-900">{selectedEvent.ageRange[0]} - {selectedEvent.ageRange[1]} years</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Price</p>
                      <p className="text-gray-900">{selectedEvent.currency} {selectedEvent.price}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Location</p>
                      <p className="text-gray-900">{selectedEvent.location.address}, {selectedEvent.location.city}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Vendor</p>
                      <p className="text-gray-900">{selectedEvent.vendor?.fullName || 'N/A'}</p>
                      <p className="text-xs text-gray-500">{selectedEvent.vendor?.email || ''}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Views</p>
                      <p className="text-gray-900">{selectedEvent.viewsCount.toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Description</p>
                    <div
                      className="text-gray-900 text-sm prose max-w-none"
                      dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(selectedEvent.description || '', {
                          ADD_ATTR: ['style', 'class'],
                          ADD_TAGS: ['iframe'],
                          ALLOWED_ATTR: ['style', 'class', 'href', 'src', 'alt', 'title', 'target', 'rel', 'width', 'height', 'id', 'frameborder', 'allow', 'allowfullscreen']
                        })
                      }}
                    />
                  </div>

                  {/* Tags */}
                  {selectedEvent.tags && selectedEvent.tags.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">Tags</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedEvent.tags.map((tag, idx) => (
                          <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Date Schedules */}
                  {selectedEvent.dateSchedule && selectedEvent.dateSchedule.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">Date Schedules</p>
                      <div className="space-y-2">
                        {selectedEvent.dateSchedule.map((schedule, idx) => (
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
                              <span className="font-medium">Price:</span> {selectedEvent.currency} {schedule.price}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* FAQs */}
                  {selectedEvent.faqs && selectedEvent.faqs.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">FAQs</p>
                      <div className="space-y-2">
                        {selectedEvent.faqs.map((faq, idx) => (
                          <div key={idx} className="bg-gray-50 p-3 rounded-lg">
                            <p className="font-medium text-sm text-gray-900">{faq.question}</p>
                            <p className="text-sm text-gray-700 mt-1">{faq.answer}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* SEO Meta */}
                  {selectedEvent.seoMeta && (
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">SEO Meta</p>
                      <div className="bg-gray-50 p-3 rounded-lg text-sm space-y-1">
                        {selectedEvent.seoMeta.title && (
                          <p><span className="font-medium">Title:</span> {selectedEvent.seoMeta.title}</p>
                        )}
                        {selectedEvent.seoMeta.description && (
                          <p><span className="font-medium">Description:</span> {selectedEvent.seoMeta.description}</p>
                        )}
                        {selectedEvent.seoMeta.keywords && selectedEvent.seoMeta.keywords.length > 0 && (
                          <p><span className="font-medium">Keywords:</span> {selectedEvent.seoMeta.keywords.join(', ')}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Timestamps */}
                  <div className="mb-4 text-xs text-gray-500">
                    <p>Created: {new Date(selectedEvent.createdAt).toLocaleString()}</p>
                    <p>Updated: {new Date(selectedEvent.updatedAt).toLocaleString()}</p>
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setIsViewModalOpen(false);
                        navigate(`/admin/events/${selectedEvent.id}/edit`);
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
                  Are you sure you want to perform this action on {selectedEventIds.length} event{selectedEventIds.length > 1 ? 's' : ''}?
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

          {/* Event Edit Modal */}
          {isEditModalOpen && eventToEdit && (
            <EventEditModal
              event={eventToEdit}
              isOpen={isEditModalOpen}
              onClose={() => {
                setIsEditModalOpen(false);
                setEventToEdit(null);
              }}
              onSave={() => {
                fetchEvents();
              }}
            />
          )}
        </div>
      </div>
  );
};

export default AdminEventsPage;