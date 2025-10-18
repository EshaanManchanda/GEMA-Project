import React, { useState, useEffect } from 'react';
import { FaSearch, FaEdit, FaTrash, FaEye, FaUndo, FaPlus, FaWpforms } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import VendorNavigation from '../../components/vendor/VendorNavigation';
import vendorAPI from '../../services/api/vendorAPI';
import categoriesAPI, { Category } from '../../services/api/categoriesAPI';
import VendorEventCreateModal from '../../components/vendor/VendorEventCreateModal';
import VendorEventEditModal from '../../components/vendor/VendorEventEditModal';
import VendorEventViewModal from '../../components/vendor/VendorEventViewModal';

interface Event {
  _id: string;
  title: string;
  description: string;
  category: string;
  type: 'Olympiad' | 'Championship' | 'Competition' | 'Event' | 'Course' | 'Venue';
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
  price: number;
  currency: string;
  isApproved: boolean;
  isFeatured?: boolean;
  viewsCount?: number;
  images: string[];
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
  status?: string;
  bookingsCount?: number;
}

const VendorEventsPage: React.FC = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);
  const [deleteType, setDeleteType] = useState<'soft' | 'permanent'>('soft');

  useEffect(() => {
    fetchEvents();
    fetchCategories();
  }, []);

  useEffect(() => {
    filterEvents();
  }, [events, searchTerm, statusFilter, categoryFilter, typeFilter]);

  const fetchEvents = async () => {
    try {
      setIsLoading(true);
      setError('');
      const response = await vendorAPI.getVendorEvents();
      console.log('API Response Events:', response);
      const eventsData = response || [];
      setEvents(eventsData);
    } catch (err: any) {
      console.error('Error fetching events:', err);
      setError(err.response?.data?.message || 'Failed to fetch events.');
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await categoriesAPI.getAllCategories({ tree: false, includeInactive: false });
      const categoriesList = response.data || [];
      setCategories(categoriesList);
    } catch (err: any) {
      console.error('Error fetching categories:', err);
    }
  };

  const filterEvents = () => {
    let filtered = [...events];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(event =>
        event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'approved') {
        filtered = filtered.filter(e => e.isApproved && !e.isDeleted);
      } else if (statusFilter === 'pending') {
        filtered = filtered.filter(e => !e.isApproved && !e.isDeleted);
      } else if (statusFilter === 'deleted') {
        filtered = filtered.filter(e => e.isDeleted);
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

    setFilteredEvents(filtered);
  };

  const handleDeleteEvent = async (eventId: string, permanent: boolean) => {
    try {
      await vendorAPI.deleteVendorEvent(eventId, permanent);
      await fetchEvents();
      setEventToDelete(null);
      setIsDeleteModalOpen(false);
    } catch (err: any) {
      console.error('Error deleting event:', err);
      setError(err.response?.data?.message || err.message || 'Failed to delete event');
    }
  };

  const handleRestoreEvent = async (eventId: string) => {
    try {
      await vendorAPI.restoreVendorEvent(eventId);
      await fetchEvents();
    } catch (err: any) {
      console.error('Error restoring event:', err);
      setError(err.response?.data?.message || err.message || 'Failed to restore event');
    }
  };

  if (isLoading) {
    return (
      <>
        <VendorNavigation />
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50">
          <div className="flex justify-center items-center h-[70vh]">
            <div className="text-center">
              <div className="relative inline-block">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-emerald-200"></div>
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-emerald-600 absolute top-0 left-0"></div>
              </div>
              <p className="mt-4 text-xl font-semibold text-gray-700 animate-pulse">Loading Events...</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <VendorNavigation />
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Events Management</h1>
              <p className="text-gray-600">Create and manage your events</p>
            </div>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center px-4 py-2 bg-gradient-to-r from-emerald-600 to-green-700 text-white rounded-lg hover:from-emerald-700 hover:to-green-800 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <FaPlus className="mr-2" />
              Create New Event
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <p className="text-red-800">{error}</p>
                <button
                  onClick={() => setError('')}
                  className="text-red-600 hover:text-red-800"
                >
                  ×
                </button>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="bg-white rounded-lg shadow mb-6 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="lg:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                <div className="relative">
                  <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search events..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="all">All Status</option>
                  <option value="approved">Approved</option>
                  <option value="pending">Pending</option>
                  <option value="deleted">Deleted</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="all">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat._id} value={cat.slug}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
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
            </div>
          </div>

          {/* Events Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Event
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
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
                        No events found. Try adjusting your filters or create a new event.
                      </td>
                    </tr>
                  ) : (
                    filteredEvents.map((event) => (
                      <tr key={event._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <img
                                className="h-10 w-10 rounded-full object-cover"
                                src={event.images[0] || '/default-event.jpg'}
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
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {event.type}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {event.category}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {event.currency} {event.price}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {event.viewsCount?.toLocaleString() || 0}
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
                                  onClick={() => {
                                    setSelectedEvent(event);
                                    setIsEditModalOpen(true);
                                  }}
                                  className="text-emerald-600 hover:text-emerald-900"
                                  title="Edit Event"
                                >
                                  <FaEdit className="w-4 h-4" />
                                </button>

                                <button
                                  onClick={() => navigate(`/vendor/events/${event._id}/registration/builder`)}
                                  className="text-purple-600 hover:text-purple-900"
                                  title="Form Builder"
                                >
                                  <FaWpforms className="w-4 h-4" />
                                </button>

                                <button
                                  onClick={() => {
                                    setEventToDelete(event._id);
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
                                onClick={() => handleRestoreEvent(event._id)}
                                className="text-blue-600 hover:text-blue-900"
                                title="Restore Event"
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
          </div>
        </div>
      </div>

      {/* Create Modal */}
      <VendorEventCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={() => {
          fetchEvents();
        }}
      />

      {/* Edit Modal */}
      {isEditModalOpen && selectedEvent && (
        <VendorEventEditModal
          event={selectedEvent}
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedEvent(null);
          }}
          onSave={() => {
            fetchEvents();
          }}
        />
      )}

      {/* View Modal */}
      {isViewModalOpen && selectedEvent && (
        <VendorEventViewModal
          event={selectedEvent}
          isOpen={isViewModalOpen}
          onClose={() => {
            setIsViewModalOpen(false);
            setSelectedEvent(null);
          }}
          onEdit={() => {
            setIsViewModalOpen(false);
            setIsEditModalOpen(true);
          }}
        />
      )}

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
    </>
  );
};

export default VendorEventsPage;
