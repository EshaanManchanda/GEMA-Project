import React, { useState, useEffect } from 'react';
import { FaSearch, FaEdit, FaTrash, FaEye, FaUndo, FaPlus, FaWpforms, FaClipboardList, FaStar } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import vendorAPI from '../../services/api/vendorAPI';
import categoriesAPI, { Category } from '../../services/api/categoriesAPI';
import { ApiService } from '../../services/api';
import PrivatePageSEO from '@/components/common/PrivatePageSEO';
import logger from '../../utils/logger';
import { toast } from 'react-hot-toast';

const PROMOTION_TIERS = [
  { id: 'boost', label: 'Boost', days: 7, priceAED: 49, desc: 'Highlighted for 7 days' },
  { id: 'featured', label: 'Featured', days: 30, priceAED: 149, desc: 'Top placement for 30 days' },
  { id: 'premium', label: 'Premium', days: 90, priceAED: 399, desc: 'Maximum visibility for 90 days' },
] as const;

const getEventThumbnail = (event: { images?: string[]; imageAssets?: any[] }): string => {
  // Prefer populated imageAssets
  if (Array.isArray(event.imageAssets) && event.imageAssets.length > 0) {
    const first = event.imageAssets[0];
    const url = typeof first === 'object' ? (first.url || first.secureUrl) : null;
    if (typeof url === 'string' && url.startsWith('http')) return url;
  }
  // Fall back to images[] if it's a full URL
  if (Array.isArray(event.images) && event.images.length > 0) {
    const url = event.images[0];
    if (typeof url === 'string' && url.startsWith('http')) return url;
  }
  return 'https://placehold.co/40x40/e5e7eb/9ca3af?text=No+Image';
};

interface Event {
  _id: string;
  title: string;
  description: string;
  category: string;
  type: 'Olympiad' | 'Championship' | 'Competition' | 'Event' | 'Course' | 'Venue' | 'Workshop' | 'Class' | 'Bootcamp' | 'Masterclass';
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
  imageAssets: Array<{ _id: string; url: string; secureUrl?: string } | string>;
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

  // Delete modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);

  // Promote modal state
  const [isPromoteModalOpen, setIsPromoteModalOpen] = useState(false);
  const [eventToPromote, setEventToPromote] = useState<Event | null>(null);
  const [selectedTier, setSelectedTier] = useState<'boost' | 'featured' | 'premium'>('boost');
  const [isPromoting, setIsPromoting] = useState(false);


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
      logger.debug('API Response Events:', response);
      const eventsData = response || [];
      setEvents(eventsData);
    } catch (err: any) {
      logger.error('Error fetching events:', err);
      setError(err.response?.data?.message || 'Failed to fetch events.');
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await categoriesAPI.getAllCategories({ tree: false, includeInactive: false });
      // categoriesAPI.getAllCategories returns the array directly or in a structure depending on implementation.
      // Based on AdminEventsPage usage (which handles array vs .data), and AdminEditEventPage (which handles array check),
      // we should be robust.
      const categoriesList = Array.isArray(response) ? response : ((response as any).data || []);
      setCategories(categoriesList);
    } catch (err: any) {
      logger.error('Error fetching categories:', err);
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
    if (statusFilter === 'deleted') {
      filtered = filtered.filter(e => e.isDeleted);
    } else if (statusFilter === 'approved') {
      filtered = filtered.filter(e => e.isApproved && !e.isDeleted);
    } else if (statusFilter === 'pending') {
      filtered = filtered.filter(e => !e.isApproved && !e.isDeleted);
    } else {
      // 'all' — hide deleted unless explicitly viewing deleted
      filtered = filtered.filter(e => !e.isDeleted);
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
      logger.error('Error deleting event:', err);
      setError(err.response?.data?.message || err.message || 'Failed to delete event');
    }
  };

  const handleRestoreEvent = async (eventId: string) => {
    try {
      await vendorAPI.restoreVendorEvent(eventId);
      await fetchEvents();
    } catch (err: any) {
      logger.error('Error restoring event:', err);
      setError(err.response?.data?.message || err.message || 'Failed to restore event');
    }
  };

  const handlePromoteEvent = async () => {
    if (!eventToPromote) return;
    setIsPromoting(true);
    try {
      // paymentMethodId would come from Stripe Elements in production.
      // For now we pass a placeholder; real impl needs Stripe.js.
      await ApiService.post(`/events/${eventToPromote._id}/promote`, {
        tier: selectedTier,
        paymentMethodId: 'pm_card_visa', // replace with real Stripe Elements token
      });
      toast.success('Event promoted successfully!');
      setIsPromoteModalOpen(false);
      setEventToPromote(null);
      await fetchEvents();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to promote event');
      logger.error('Promote event error:', err);
    } finally {
      setIsPromoting(false);
    }
  };

  if (isLoading) {
    return (
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
    );
  }

  return (
    <>
      <PrivatePageSEO title="Vendor - Events | Kidrove" description="Manage your events" />
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Events Management</h1>
              <p className="text-gray-600">Create and manage your events</p>
            </div>
            <button
              onClick={() => navigate('/vendor/events/create')}
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
                    <option key={cat._id} value={cat.name}>
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
                  <option value="Class">Class</option>
                  <option value="Bootcamp">Bootcamp</option>
                  <option value="Masterclass">Masterclass</option>
                  <option value="Workshop">Workshop</option>
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
                                src={getEventThumbnail(event)}
                                alt=""
                              />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {event.title}
                              </div>
                              <div className="text-sm text-gray-500">
                                {event.location?.city}
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
                              onClick={() => navigate(`/vendor/events/${event._id}`)}
                              className="text-blue-600 hover:text-blue-900"
                              title="View Details"
                            >
                              <FaEye className="w-4 h-4" />
                            </button>

                            {!event.isDeleted && (
                              <>
                                <button
                                  onClick={() => navigate(`/vendor/events/${event._id}/edit`)}
                                  className="text-emerald-600 hover:text-emerald-900"
                                  title="Edit Event"
                                >
                                  <FaEdit className="w-4 h-4" />
                                </button>

                                <button
                                  onClick={() => navigate(`/vendor/events/${event._id}/registrations`)}
                                  className="text-indigo-600 hover:text-indigo-900"
                                  title="Registrations"
                                >
                                  <FaClipboardList className="w-4 h-4" />
                                </button>

                                <button
                                  onClick={() => navigate(`/vendor/events/${event._id}/registration/builder`)}
                                  className="text-purple-600 hover:text-purple-900"
                                  title="Form Builder"
                                >
                                  <FaWpforms className="w-4 h-4" />
                                </button>

                                {event.isApproved && (
                                  <button
                                    onClick={() => {
                                      setEventToPromote(event);
                                      setSelectedTier('boost');
                                      setIsPromoteModalOpen(true);
                                    }}
                                    className="text-yellow-600 hover:text-yellow-900"
                                    title="Promote Event"
                                  >
                                    <FaStar className="w-4 h-4" />
                                  </button>
                                )}

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

      {/* Promote Event Modal */}
      {isPromoteModalOpen && eventToPromote && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 mb-1">Promote Event</h3>
            <p className="text-sm text-gray-500 mb-5">{eventToPromote.title}</p>

            <div className="space-y-3 mb-6">
              {PROMOTION_TIERS.map((tier) => (
                <button
                  key={tier.id}
                  onClick={() => setSelectedTier(tier.id)}
                  className={`w-full flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                    selectedTier === tier.id
                      ? 'border-yellow-500 bg-yellow-50'
                      : 'border-gray-200 hover:border-yellow-300'
                  }`}
                >
                  <div className="text-left">
                    <div className="font-semibold text-gray-900">{tier.label}</div>
                    <div className="text-sm text-gray-500">{tier.desc}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-yellow-600">{tier.priceAED} AED</div>
                    <div className="text-xs text-gray-400">{tier.days} days</div>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setIsPromoteModalOpen(false); setEventToPromote(null); }}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={isPromoting}
              >
                Cancel
              </button>
              <button
                onClick={handlePromoteEvent}
                disabled={isPromoting}
                className="px-6 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 font-semibold disabled:opacity-50"
              >
                {isPromoting ? 'Processing...' : `Pay & Promote`}
              </button>
            </div>
          </div>
        </div>
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
