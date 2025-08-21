import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import vendorAPI from '../../services/api/vendorAPI';
import eventsAPI from '../../services/api/eventsAPI';
import VendorNavigation from '../../components/vendor/VendorNavigation';

interface Event {
  _id: string;
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
  price: number;
  currency: string;
  isApproved: boolean;
  tags: string[];
  dateSchedule: Array<{
    date: string;
    availableSeats: number;
    price: number;
  }>;
  viewsCount: number;
  isFeatured: boolean;
  images: string[];
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  // Computed fields
  status: 'published' | 'draft' | 'archived';
  bookingsCount?: number;
}

const VendorEventsPage: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'published' | 'draft' | 'archived'>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title' | 'bookings'>('newest');

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Fetch real events from backend
        const eventsData = await vendorAPI.getVendorEvents();
        
        // Transform backend data to frontend format
        const transformedEvents: Event[] = eventsData.map((event: any) => ({
          ...event,
          status: event.isApproved ? 'published' : (event.isDeleted ? 'archived' : 'draft'),
          bookingsCount: 0, // Will be populated by separate API call if needed
        }));
        
        setEvents(transformedEvents);
      } catch (err) {
        console.error('Error fetching events:', err);
        setError('Failed to load events. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchEvents();
  }, []);

  const formatDate = (dateString: string): string => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const getStatusBadgeClass = (status: string): string => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'archived':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      try {
        await eventsAPI.deleteEvent(eventId);
        setEvents(prevEvents => prevEvents.filter(event => event._id !== eventId));
      } catch (err) {
        console.error('Error deleting event:', err);
        setError('Failed to delete event.');
      }
    }
  };

  const handleChangeStatus = async (eventId: string, newStatus: 'published' | 'draft' | 'archived') => {
    try {
      // Convert status to backend format
      const updateData: any = {};
      if (newStatus === 'published') {
        updateData.isApproved = true;
        updateData.isDeleted = false;
      } else if (newStatus === 'archived') {
        updateData.isDeleted = true;
      } else if (newStatus === 'draft') {
        updateData.isApproved = false;
        updateData.isDeleted = false;
      }
      
      await eventsAPI.updateEvent(eventId, updateData);
      setEvents(prevEvents => 
        prevEvents.map(event => 
          event._id === eventId ? { ...event, status: newStatus } : event
        )
      );
    } catch (err) {
      console.error('Error updating event status:', err);
      setError('Failed to update event status.');
    }
  };

  const filteredEvents = events
    .filter(event => {
      // Filter by tab
      if (activeTab !== 'all' && event.status !== activeTab) {
        return false;
      }
      
      // Filter by search term
      if (searchTerm && !event.title.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      
      return true;
    })
    .sort((a, b) => {
      // Sort by selected option
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'title':
          return a.title.localeCompare(b.title);
        case 'bookings':
          return (b.bookingsCount || 0) - (a.bookingsCount || 0);
        default:
          return 0;
      }
    });

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
              <div className="mt-2 flex justify-center space-x-1">
                <div className="h-2 w-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="h-2 w-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="h-2 w-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
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
          <div className="max-w-6xl mx-auto">
            {/* Header Section */}
            <div className="mb-8">
              <div className="bg-gradient-to-r from-emerald-600 to-green-700 h-1 w-20 rounded-full mb-4"></div>
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                  <h1 className="text-4xl font-bold text-gray-900 mb-2">My Events</h1>
                  <p className="text-gray-600">Manage your events, track performance, and create new experiences</p>
                </div>
                <Link 
                  to="/vendor/events/create"
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white font-semibold rounded-xl shadow-lg shadow-emerald-200 hover:shadow-xl hover:shadow-emerald-300 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                >
                  <svg className="-ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  ✨ Create New Event
                </Link>
              </div>
            </div>
        
            {/* Error Message */}
            {error && (
              <div className="bg-gradient-to-r from-red-50 to-pink-50 border-l-4 border-red-400 p-6 mb-6 rounded-r-xl shadow-md" role="alert">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-red-700 font-medium">{error}</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Events Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-gradient-to-br from-emerald-50 to-green-50 p-4 rounded-2xl shadow-lg shadow-emerald-200/50 border border-emerald-100 hover:shadow-xl hover:shadow-emerald-300/30 transition-all duration-300 transform hover:scale-105">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-emerald-700">{events.length}</div>
                    <div className="text-sm text-emerald-600 font-medium">Total Events</div>
                  </div>
                  <div className="p-2 bg-emerald-100 rounded-xl">🎭</div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-green-50 to-teal-50 p-4 rounded-2xl shadow-lg shadow-green-200/50 border border-green-100 hover:shadow-xl hover:shadow-green-300/30 transition-all duration-300 transform hover:scale-105">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-green-700">{events.filter(e => e.status === 'published').length}</div>
                    <div className="text-sm text-green-600 font-medium">Published</div>
                  </div>
                  <div className="p-2 bg-green-100 rounded-xl">✅</div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-yellow-50 to-orange-50 p-4 rounded-2xl shadow-lg shadow-yellow-200/50 border border-yellow-100 hover:shadow-xl hover:shadow-yellow-300/30 transition-all duration-300 transform hover:scale-105">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-yellow-700">{events.filter(e => e.status === 'draft').length}</div>
                    <div className="text-sm text-yellow-600 font-medium">Drafts</div>
                  </div>
                  <div className="p-2 bg-yellow-100 rounded-xl">📝</div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-gray-50 to-slate-50 p-4 rounded-2xl shadow-lg shadow-gray-200/50 border border-gray-100 hover:shadow-xl hover:shadow-gray-300/30 transition-all duration-300 transform hover:scale-105">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-gray-700">{events.filter(e => e.status === 'archived').length}</div>
                    <div className="text-sm text-gray-600 font-medium">Archived</div>
                  </div>
                  <div className="p-2 bg-gray-100 rounded-xl">📁</div>
                </div>
              </div>
            </div>
        
            {/* Main Content Card */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl shadow-emerald-200/20 border border-white/20 overflow-hidden">
              {/* Enhanced Tab Navigation */}
              <div className="bg-gradient-to-r from-emerald-50 to-green-50 border-b border-emerald-100">
                <nav className="flex overflow-x-auto">
                  <button
                    onClick={() => setActiveTab('all')}
                    className={`whitespace-nowrap py-4 px-6 font-semibold text-sm transition-all duration-200 ${
                      activeTab === 'all' 
                        ? 'border-b-3 border-emerald-500 text-emerald-700 bg-white/50' 
                        : 'text-gray-600 hover:text-emerald-600 hover:bg-white/30'
                    }`}
                  >
                    🎭 All Events
                  </button>
                  <button
                    onClick={() => setActiveTab('published')}
                    className={`whitespace-nowrap py-4 px-6 font-semibold text-sm transition-all duration-200 ${
                      activeTab === 'published' 
                        ? 'border-b-3 border-emerald-500 text-emerald-700 bg-white/50' 
                        : 'text-gray-600 hover:text-emerald-600 hover:bg-white/30'
                    }`}
                  >
                    ✅ Published
                  </button>
                  <button
                    onClick={() => setActiveTab('draft')}
                    className={`whitespace-nowrap py-4 px-6 font-semibold text-sm transition-all duration-200 ${
                      activeTab === 'draft' 
                        ? 'border-b-3 border-emerald-500 text-emerald-700 bg-white/50' 
                        : 'text-gray-600 hover:text-emerald-600 hover:bg-white/30'
                    }`}
                  >
                    📝 Drafts
                  </button>
                  <button
                    onClick={() => setActiveTab('archived')}
                    className={`whitespace-nowrap py-4 px-6 font-semibold text-sm transition-all duration-200 ${
                      activeTab === 'archived' 
                        ? 'border-b-3 border-emerald-500 text-emerald-700 bg-white/50' 
                        : 'text-gray-600 hover:text-emerald-600 hover:bg-white/30'
                    }`}
                  >
                    📁 Archived
                  </button>
                </nav>
              </div>
          
              {/* Enhanced Filters Section */}
              <div className="p-6">
                <div className="flex flex-col lg:flex-row gap-4 mb-6">
                  <div className="flex-1">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="🔍 Search events by title, category, or location..."
                        className="w-full pl-12 pr-4 py-3 border border-emerald-200 rounded-xl bg-gradient-to-r from-white to-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 shadow-sm hover:shadow-md"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-emerald-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  <div className="w-full lg:w-64">
                    <select
                      className="w-full border border-emerald-200 rounded-xl py-3 pl-4 pr-10 text-base bg-gradient-to-r from-white to-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 shadow-sm hover:shadow-md"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'title' | 'bookings')}
                    >
                      <option value="newest">📅 Newest First</option>
                      <option value="oldest">⏰ Oldest First</option>
                      <option value="title">🔤 Title (A-Z)</option>
                      <option value="bookings">📊 Most Bookings</option>
                    </select>
                  </div>
                </div>
            
            {filteredEvents.length === 0 ? (
              <div className="text-center py-8">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  No {activeTab === 'all' ? '' : activeTab} events found
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {activeTab === 'all' ? 'You haven\'t created any events yet.' : `You don\'t have any ${activeTab} events.`}
                  {searchTerm && ' No events match your search criteria.'}
                </p>
                <div className="mt-6">
                  <Link to="/vendor/events/create" className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">
                    <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    Create New Event
                  </Link>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Event
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date & Time
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Bookings
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Views
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredEvents.map((event) => (
                      <tr key={event._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <img className="h-10 w-10 rounded-md object-cover" src={event.images?.[0] || '/placeholder-event.png'} alt={event.title} />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                <Link to={`/vendor/events/${event._id}/edit`} className="hover:text-primary">
                                  {event.title}
                                </Link>
                              </div>
                              <div className="text-sm text-gray-500">
                                {event.category} | {event.ageRange[0]}-{event.ageRange[1]} years
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{event.dateSchedule?.[0] ? formatDate(event.dateSchedule[0].date) : 'TBD'}</div>
                          <div className="text-sm text-gray-500">{event.location?.city}, {event.location?.address}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(event.status)}`}>
                            {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {event.bookingsCount}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {event.viewsCount}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            <Link 
                              to={`/vendor/events/${event._id}/edit`}
                              className="text-primary hover:text-primary-dark"
                            >
                              Edit
                            </Link>
                            <button 
                              onClick={() => handleDeleteEvent(event._id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Delete
                            </button>
                            {event.status === 'draft' && (
                              <button 
                                onClick={() => handleChangeStatus(event._id, 'published')}
                                className="text-green-600 hover:text-green-900"
                              >
                                Publish
                              </button>
                            )}
                            {event.status === 'published' && (
                              <button 
                                onClick={() => handleChangeStatus(event._id, 'archived')}
                                className="text-gray-600 hover:text-gray-900"
                              >
                                Archive
                              </button>
                            )}
                            {event.status === 'archived' && (
                              <button 
                                onClick={() => handleChangeStatus(event.id, 'published')}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                Restore
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
    </>
  );
};

export default VendorEventsPage;