import React, { useState, useEffect, useMemo } from 'react';
import { FaSearch, FaFilter, FaEdit, FaTrash, FaPlus, FaSort, FaEye, FaCheck, FaTimes, FaStar, FaUndo } from 'react-icons/fa';
import { format } from 'date-fns';
import adminAPI from '../../services/api/adminAPI';
import AdminNavigation from '../../components/admin/AdminNavigation';

interface Event {
  id: string;
  title: string;
  description: string;
  category: string;
  type: 'Event' | 'Course' | 'Venue';
  venueType: 'Indoor' | 'Outdoor';
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
    firstName: string;
    lastName: string;
    email: string;
    fullName: string;
  } | null;
  price: number;
  currency: string;
  isApproved: boolean;
  isFeatured: boolean;
  affiliateCode?: string;
  tags: string[];
  dateSchedule: Array<{
    date: string;
    availableSeats: number;
    price: number;
  }>;
  viewsCount: number;
  images: string[];
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

const AdminEventsPage: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [approvalFilter, setApprovalFilter] = useState<string>('all');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Event; direction: 'ascending' | 'descending' }>({ 
    key: 'createdAt', 
    direction: 'descending' 
  });
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState<boolean>(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState<boolean>(false);
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);
  const [eventToApprove, setEventToApprove] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'delete' | 'restore' | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [pagination, setPagination] = useState<any>(null);
  const [eventStats, setEventStats] = useState<any>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setIsLoading(true);
        
        // Fetch real data from backend
        const params = {
          page: 1,
          limit: 20,
          search: searchTerm,
          category: categoryFilter !== 'all' ? categoryFilter : undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          isApproved: approvalFilter !== 'all' ? (approvalFilter === 'approved' ? 'true' : 'false') : undefined,
          sortBy: sortConfig.key,
          sortOrder: sortConfig.direction
        };
        
        const [eventsResponse, statsResponse] = await Promise.all([
          adminAPI.getAllEvents(params),
          adminAPI.getEventStats()
        ]);
        
        if (eventsResponse.success) {
          setEvents(eventsResponse.data.events);
          setFilteredEvents(eventsResponse.data.events);
          setPagination(eventsResponse.data.pagination);
        }
        
        if (statsResponse.success) {
          setEventStats(statsResponse.data);
        }
      } catch (error) {
        console.error('Error fetching events:', error);
        
        // Fallback to mock data if API fails
        const mockEvents: Event[] = [
          {
            id: '1',
            title: 'Summer Music Festival',
            description: 'An amazing summer music festival',
            category: 'Music',
            type: 'Event',
            venueType: 'Outdoor',
            ageRange: [18, 65],
            location: {
              city: 'New York',
              address: 'Central Park',
              coordinates: { lat: 40.7829, lng: -73.9654 }
            },
            vendor: {
              id: 'v1',
              firstName: 'John',
              lastName: 'Doe',
              email: 'john@example.com',
              fullName: 'John Doe'
            },
            price: 49.99,
            currency: 'USD',
            isApproved: true,
            isFeatured: true,
            tags: ['music', 'festival'],
            dateSchedule: [
              { date: '2023-08-15T18:00:00Z', availableSeats: 100, price: 49.99 }
            ],
            viewsCount: 156,
            images: ['https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3'],
            isDeleted: false,
            createdAt: '2023-05-10T14:30:00Z',
            updatedAt: '2023-05-10T14:30:00Z'
          },
          {
            id: '2',
            title: 'Tech Conference 2023',
            description: 'Latest technology trends conference',
            category: 'Conference',
            type: 'Event',
            venueType: 'Indoor',
            ageRange: [20, 60],
            location: {
              city: 'San Francisco',
              address: 'Convention Center',
              coordinates: { lat: 37.7749, lng: -122.4194 }
            },
            vendor: {
              id: 'v2',
              firstName: 'Jane',
              lastName: 'Smith',
              email: 'jane@example.com',
              fullName: 'Jane Smith'
            },
            price: 299.99,
            currency: 'USD',
            isApproved: false,
            isFeatured: false,
            tags: ['tech', 'conference'],
            dateSchedule: [
              { date: '2023-09-20T09:00:00Z', availableSeats: 200, price: 299.99 }
            ],
            viewsCount: 89,
            images: ['https://images.unsplash.com/photo-1540575467063-178a50c2df87'],
            isDeleted: false,
            createdAt: '2023-04-15T10:45:00Z',
            updatedAt: '2023-04-15T10:45:00Z'
          }
        ];
        
        setEvents(mockEvents);
        setFilteredEvents(mockEvents);
        setPagination({ currentPage: 1, totalPages: 1, totalEvents: mockEvents.length });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchEvents();
  }, [searchTerm, categoryFilter, statusFilter, approvalFilter, sortConfig]);

  // Filter and sort events
  useEffect(() => {
    let filtered = events.filter(event => {
      const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           event.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           event.location.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (event.vendor && event.vendor.fullName.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesCategory = categoryFilter === 'all' || event.category === categoryFilter;
      const matchesStatus = statusFilter === 'all' || 
                           (statusFilter === 'active' && !event.isDeleted) ||
                           (statusFilter === 'deleted' && event.isDeleted);
      const matchesApproval = approvalFilter === 'all' || 
                             (approvalFilter === 'approved' && event.isApproved) ||
                             (approvalFilter === 'pending' && !event.isApproved);
      
      return matchesSearch && matchesCategory && matchesStatus && matchesApproval;
    });

    // Sort events
    filtered.sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      
      if (aValue < bValue) {
        return sortConfig.direction === 'ascending' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'ascending' ? 1 : -1;
      }
      return 0;
    });

    setFilteredEvents(filtered);
  }, [events, searchTerm, categoryFilter, statusFilter, approvalFilter, sortConfig]);

  const handleSort = (key: keyof Event) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'ascending' 
        ? 'descending' 
        : 'ascending'
    }));
  };

  const handleDeleteEvent = async (eventId: string, permanent = false) => {
    try {
      const response = await adminAPI.deleteEvent(eventId, permanent);
      if (response.success) {
        if (permanent) {
          setEvents(prev => prev.filter(event => event.id !== eventId));
        } else {
          setEvents(prev => prev.map(event => 
            event.id === eventId ? { ...event, isDeleted: true } : event
          ));
        }
        setEventToDelete(null);
        setIsDeleteModalOpen(false);
        setActionType(null);
      }
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Error deleting event: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleRestoreEvent = async (eventId: string) => {
    try {
      const response = await adminAPI.restoreEvent(eventId);
      if (response.success) {
        setEvents(prev => prev.map(event => 
          event.id === eventId ? { ...event, isDeleted: false } : event
        ));
      }
    } catch (error) {
      console.error('Error restoring event:', error);
      alert('Error restoring event: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleApproveEvent = async (eventId: string) => {
    try {
      const response = await adminAPI.approveEvent(eventId);
      if (response.success) {
        setEvents(prev => prev.map(event => 
          event.id === eventId ? { ...event, isApproved: true } : event
        ));
        setEventToApprove(null);
        setIsApprovalModalOpen(false);
        setActionType(null);
      }
    } catch (error) {
      console.error('Error approving event:', error);
      alert('Error approving event: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleRejectEvent = async (eventId: string, reason: string) => {
    try {
      const response = await adminAPI.rejectEvent(eventId, reason);
      if (response.success) {
        setEvents(prev => prev.map(event => 
          event.id === eventId ? { ...event, isApproved: false } : event
        ));
        setEventToApprove(null);
        setIsApprovalModalOpen(false);
        setActionType(null);
        setRejectionReason('');
      }
    } catch (error) {
      console.error('Error rejecting event:', error);
      alert('Error rejecting event: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleToggleFeatured = async (eventId: string) => {
    try {
      const response = await adminAPI.toggleEventFeatured(eventId);
      if (response.success) {
        setEvents(prev => prev.map(event => 
          event.id === eventId ? { ...event, isFeatured: !event.isFeatured } : event
        ));
      }
    } catch (error) {
      console.error('Error toggling featured status:', error);
      alert('Error toggling featured status: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleViewEvent = (event: Event) => {
    setSelectedEvent(event);
    setIsViewModalOpen(true);
  };

  const getStatusBadgeClass = (event: Event) => {
    if (event.isDeleted) return 'bg-red-100 text-red-800';
    if (!event.isApproved) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const getStatusText = (event: Event) => {
    if (event.isDeleted) return 'Deleted';
    if (!event.isApproved) return 'Pending';
    return 'Approved';
  };

  if (isLoading) {
    return (
      <>
        <AdminNavigation />
        <div className="p-6">
          <div className="flex justify-center items-center h-[50vh]">
            <div className="text-center">
              <div className="relative inline-block">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-200"></div>
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-green-600 absolute top-0 left-0"></div>
              </div>
              <p className="mt-4 text-xl font-semibold text-gray-700 animate-pulse">Loading Events...</p>
              <div className="mt-6 space-y-3">
                <div className="h-4 bg-gradient-to-r from-green-200 to-transparent rounded w-64 mx-auto animate-pulse"></div>
                <div className="h-4 bg-gradient-to-r from-emerald-200 to-transparent rounded w-48 mx-auto animate-pulse"></div>
                <div className="h-4 bg-gradient-to-r from-green-200 to-transparent rounded w-56 mx-auto animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <AdminNavigation />
      <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center">
            <div className="w-1 h-10 bg-gradient-to-b from-green-500 to-emerald-600 rounded-full mr-4"></div>
            Event Management
          </h1>
          <p className="text-lg text-gray-600">Manage events, approvals, and featured content</p>
        </div>
        {eventStats && (
          <div className="mt-6 lg:mt-0 grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-2xl shadow-lg shadow-blue-200/50 border border-blue-100 hover:shadow-xl hover:shadow-blue-300/30 transition-all duration-300 transform hover:scale-105">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-blue-700">{eventStats.totalEvents || filteredEvents.length}</div>
                  <div className="text-sm text-blue-600 font-medium">Total Events</div>
                </div>
                <div className="p-2 bg-blue-100 rounded-xl">
                  📅
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-2xl shadow-lg shadow-green-200/50 border border-green-100 hover:shadow-xl hover:shadow-green-300/30 transition-all duration-300 transform hover:scale-105">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-green-700">{eventStats.approvedEvents || filteredEvents.filter(e => e.isApproved).length}</div>
                  <div className="text-sm text-green-600 font-medium">Approved</div>
                </div>
                <div className="p-2 bg-green-100 rounded-xl">
                  ✅
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-yellow-50 to-orange-50 p-4 rounded-2xl shadow-lg shadow-yellow-200/50 border border-yellow-100 hover:shadow-xl hover:shadow-yellow-300/30 transition-all duration-300 transform hover:scale-105">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-yellow-700">{eventStats.pendingEvents || filteredEvents.filter(e => !e.isApproved).length}</div>
                  <div className="text-sm text-yellow-600 font-medium">Pending</div>
                </div>
                <div className="p-2 bg-yellow-100 rounded-xl">
                  ⏳
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-2xl shadow-lg shadow-purple-200/50 border border-purple-100 hover:shadow-xl hover:shadow-purple-300/30 transition-all duration-300 transform hover:scale-105">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-purple-700">{eventStats.featuredEvents || filteredEvents.filter(e => e.isFeatured).length}</div>
                  <div className="text-sm text-purple-600 font-medium">Featured</div>
                </div>
                <div className="p-2 bg-purple-100 rounded-xl">
                  ⭐
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-xl shadow-gray-200/50 p-6 border border-white/20 backdrop-blur-sm">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <div className="relative">
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
              <FaSearch className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search events by title, category, or location..."
              className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300 bg-white/80 backdrop-blur-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <select
            className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300 bg-white/80 backdrop-blur-sm font-medium"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">🏷️ All Categories</option>
            <option value="Music">🎵 Music</option>
            <option value="Conference">🎯 Conference</option>
            <option value="Food">🍴 Food</option>
            <option value="Wellness">🧘 Wellness</option>
            <option value="Entertainment">🎭 Entertainment</option>
            <option value="Sports">⚽ Sports</option>
            <option value="Art">🎨 Art</option>
          </select>
          
          <select
            className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300 bg-white/80 backdrop-blur-sm font-medium"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">📊 All Status</option>
            <option value="active">✅ Active</option>
            <option value="deleted">❌ Deleted</option>
          </select>

          <select
            className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300 bg-white/80 backdrop-blur-sm font-medium"
            value={approvalFilter}
            onChange={(e) => setApprovalFilter(e.target.value)}
          >
            <option value="all">🔍 All Approvals</option>
            <option value="approved">✅ Approved</option>
            <option value="pending">⏳ Pending</option>
          </select>
          
          <div className="flex items-center justify-center bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-3 border border-green-100">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{filteredEvents.length}</div>
              <div className="text-sm text-green-700 font-medium">Events Found</div>
            </div>
          </div>
        </div>
      </div>

      {/* Events Table */}
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-xl shadow-gray-200/50 overflow-hidden border border-white/20 backdrop-blur-sm">
        <div className="px-8 py-6 border-b border-gray-100 bg-gradient-to-r from-green-50 to-emerald-50">
          <h2 className="text-xl font-bold text-gray-900 flex items-center">
            📅 Events Directory
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th className="px-8 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('title')}
                    className="flex items-center gap-2 hover:text-green-600 transition-colors duration-300 group"
                  >
                    🎯 Event
                    <FaSort className="w-3 h-3 group-hover:scale-110 transition-transform duration-300" />
                  </button>
                </th>
                <th className="px-8 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                  👤 Vendor
                </th>
                <th className="px-8 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('category')}
                    className="flex items-center gap-2 hover:text-green-600 transition-colors duration-300 group"
                  >
                    🏷️ Category
                    <FaSort className="w-3 h-3 group-hover:scale-110 transition-transform duration-300" />
                  </button>
                </th>
                <th className="px-8 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('price')}
                    className="flex items-center gap-2 hover:text-green-600 transition-colors duration-300 group"
                  >
                    💰 Price
                    <FaSort className="w-3 h-3 group-hover:scale-110 transition-transform duration-300" />
                  </button>
                </th>
                <th className="px-8 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                  📊 Status
                </th>
                <th className="px-8 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('createdAt')}
                    className="flex items-center gap-2 hover:text-green-600 transition-colors duration-300 group"
                  >
                    📅 Created
                    <FaSort className="w-3 h-3 group-hover:scale-110 transition-transform duration-300" />
                  </button>
                </th>
                <th className="px-8 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                  ⚡ Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredEvents.map((event, index) => (
                <tr key={event.id} className="hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 transition-all duration-300 group">
                  <td className="px-8 py-6 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-14 w-14 relative">
                        <img
                          className="h-14 w-14 rounded-2xl object-cover ring-2 ring-white shadow-lg group-hover:ring-green-200 transition-all duration-300"
                          src={event.images[0] || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30'}
                          alt={event.title}
                        />
                        {event.isFeatured && (
                          <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                            <FaStar className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-semibold text-gray-900 group-hover:text-green-700 transition-colors duration-300 flex items-center gap-2">
                          {event.title}
                        </div>
                        <div className="text-sm text-gray-500 flex items-center gap-2">
                          <span className="px-2 py-1 bg-gray-100 rounded-full text-xs font-medium">{event.type}</span>
                          <span className="px-2 py-1 bg-gray-100 rounded-full text-xs font-medium">{event.venueType}</span>
                        </div>
                        <div className="text-xs text-gray-400 flex items-center mt-1">
                          📍 {event.location.city}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {event.vendor ? event.vendor.fullName : 'No vendor assigned'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {event.vendor ? `📧 ${event.vendor.email}` : ''}
                    </div>
                  </td>
                  <td className="px-8 py-6 whitespace-nowrap">
                    <span className="inline-flex px-3 py-1 text-xs font-bold rounded-full bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 ring-1 ring-inset ring-blue-200 transition-all duration-300 hover:scale-105">
                      {event.category}
                    </span>
                  </td>
                  <td className="px-8 py-6 whitespace-nowrap">
                    <div className="text-sm font-bold text-gray-900">
                      💰 {event.price} {event.currency}
                    </div>
                    <div className="text-xs text-gray-500">
                      👁️ {event.viewsCount} views
                    </div>
                  </td>
                  <td className="px-8 py-6 whitespace-nowrap">
                    <div className="flex flex-col gap-2">
                      <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-full ring-1 ring-inset transition-all duration-300 hover:scale-105 ${
                        event.isDeleted ? 'bg-red-100 text-red-800 ring-red-200' :
                        !event.isApproved ? 'bg-yellow-100 text-yellow-800 ring-yellow-200' :
                        'bg-green-100 text-green-800 ring-green-200'
                      }`}>
                        {event.isDeleted ? '❌ Deleted' : !event.isApproved ? '⏳ Pending' : '✅ Approved'}
                      </span>
                      {event.isFeatured && (
                        <span className="inline-flex px-3 py-1 text-xs font-bold rounded-full bg-gradient-to-r from-yellow-100 to-orange-100 text-yellow-800 ring-1 ring-inset ring-yellow-200">
                          ⭐ Featured
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-6 whitespace-nowrap text-sm text-gray-500 font-medium">
                    {format(new Date(event.createdAt), 'MMM dd, yyyy')}
                  </td>
                  <td className="px-8 py-6 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button 
                        className="p-2 text-blue-600 hover:text-white hover:bg-blue-600 rounded-lg transition-all duration-300 hover:scale-110 hover:shadow-lg"
                        onClick={() => handleViewEvent(event)}
                        title="View Event"
                      >
                        <FaEye className="w-4 h-4" />
                      </button>
                      
                      {!event.isDeleted && (
                        <>
                          {!event.isApproved ? (
                            <button 
                              className="p-2 text-green-600 hover:text-white hover:bg-green-600 rounded-lg transition-all duration-300 hover:scale-110 hover:shadow-lg"
                              onClick={() => {
                                setEventToApprove(event.id);
                                setActionType('approve');
                                setIsApprovalModalOpen(true);
                              }}
                              title="Approve Event"
                            >
                              <FaCheck className="w-4 h-4" />
                            </button>
                          ) : (
                            <button 
                              className="p-2 text-yellow-600 hover:text-white hover:bg-yellow-600 rounded-lg transition-all duration-300 hover:scale-110 hover:shadow-lg"
                              onClick={() => {
                                setEventToApprove(event.id);
                                setActionType('reject');
                                setIsApprovalModalOpen(true);
                              }}
                              title="Reject Event"
                            >
                              <FaTimes className="w-4 h-4" />
                            </button>
                          )}
                          
                          <button 
                            className={`p-2 rounded-lg transition-all duration-300 hover:scale-110 hover:shadow-lg ${
                              event.isFeatured 
                                ? 'text-yellow-600 hover:text-white hover:bg-yellow-600' 
                                : 'text-gray-400 hover:text-white hover:bg-gray-600'
                            }`}
                            onClick={() => handleToggleFeatured(event.id)}
                            title={event.isFeatured ? 'Remove from Featured' : 'Make Featured'}
                          >
                            <FaStar className="w-4 h-4" />
                          </button>
                          
                          <button 
                            className="p-2 text-red-600 hover:text-white hover:bg-red-600 rounded-lg transition-all duration-300 hover:scale-110 hover:shadow-lg"
                            onClick={() => {
                              setEventToDelete(event.id);
                              setActionType('delete');
                              setIsDeleteModalOpen(true);
                            }}
                            title="Delete Event"
                          >
                            <FaTrash className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      
                      {event.isDeleted && (
                        <button 
                          className="p-2 text-green-600 hover:text-white hover:bg-green-600 rounded-lg transition-all duration-300 hover:scale-110 hover:shadow-lg"
                          onClick={() => handleRestoreEvent(event.id)}
                          title="Restore Event"
                        >
                          <FaUndo className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
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
                  setActionType(null);
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

      {/* Approval/Rejection Modal */}
      {isApprovalModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">
              {actionType === 'approve' ? 'Approve Event' : 'Reject Event'}
            </h3>
            {actionType === 'approve' ? (
              <p className="text-gray-600 mb-6">
                Are you sure you want to approve this event? It will become visible to users.
              </p>
            ) : (
              <div className="mb-6">
                <p className="text-gray-600 mb-4">
                  Please provide a reason for rejecting this event:
                </p>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Reason for rejection..."
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
                disabled={actionType === 'reject' && !rejectionReason.trim()}
              >
                {actionType === 'approve' ? 'Approve' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Event View Modal */}
      {isViewModalOpen && selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold">Event Details</h3>
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <p className="text-gray-900">{selectedEvent.title}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <p className="text-gray-900">{selectedEvent.description}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <span className="inline-flex px-3 py-1 text-sm font-semibold rounded-full bg-blue-100 text-blue-800">
                    {selectedEvent.category}
                  </span>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type & Venue</label>
                  <p className="text-gray-900">{selectedEvent.type} • {selectedEvent.venueType}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Age Range</label>
                  <p className="text-gray-900">{selectedEvent.ageRange[0]} - {selectedEvent.ageRange[1]} years</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
                  <p className="text-gray-900">{selectedEvent.price} {selectedEvent.currency}</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
                  <p className="text-gray-900">
                    {selectedEvent.vendor ? selectedEvent.vendor.fullName : 'No vendor assigned'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {selectedEvent.vendor ? selectedEvent.vendor.email : ''}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <p className="text-gray-900">{selectedEvent.location.address}</p>
                  <p className="text-sm text-gray-500">{selectedEvent.location.city}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <div className="flex gap-2">
                    <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusBadgeClass(selectedEvent)}`}>
                      {getStatusText(selectedEvent)}
                    </span>
                    {selectedEvent.isFeatured && (
                      <span className="inline-flex px-3 py-1 text-sm font-semibold rounded-full bg-yellow-100 text-yellow-800">
                        Featured
                      </span>
                    )}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Views</label>
                  <p className="text-gray-900">{selectedEvent.viewsCount}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                  <div className="flex flex-wrap gap-2">
                    {selectedEvent.tags.map((tag, index) => (
                      <span key={index} className="inline-flex px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-800">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Created</label>
                  <p className="text-gray-900">{format(new Date(selectedEvent.createdAt), 'MMM dd, yyyy HH:mm')}</p>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
};

export default AdminEventsPage;