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
  dateTime: {
    startDate: Date;
    endDate: Date;
    startTime: string;
    endTime: string;
  };
  pricing: {
    currency: string;
    ticketTypes: Array<{
      type: string;
      price: number;
      capacity: number;
    }>;
  };
  images: string[];
  status: 'draft' | 'published' | 'archived';
  isApproved: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  bookingsCount?: number;
}

const VendorEventsPage: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'all' | 'draft' | 'published' | 'archived'>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title' | 'bookings'>('newest');

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setIsLoading(true);
      const response = await vendorAPI.getVendorEvents();
      setEvents(response.data || []);
    } catch (err) {
      console.error('Error fetching events:', err);
      setError('Failed to fetch events.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangeStatus = async (eventId: string, newStatus: string) => {
    try {
      const updateData: any = {};
      
      if (newStatus === 'published') {
        updateData.isApproved = true;
        updateData.isDeleted = false;
      } else if (newStatus === 'archived') {
        updateData.isApproved = false;
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
      if (activeTab !== 'all' && event.status !== activeTab) {
        return false;
      }
      
      if (searchTerm && !event.title.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      
      return true;
    })
    .sort((a, b) => {
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
                  className="bg-gradient-to-r from-emerald-600 to-green-700 text-white px-6 py-3 rounded-lg hover:from-emerald-700 hover:to-green-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  + Create New Event
                </Link>
              </div>
            </div>

            {/* Tabs */}
            <div className="mb-6">
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                  {[
                    { key: 'all', label: 'All Events' },
                    { key: 'draft', label: 'Drafts' },
                    { key: 'published', label: 'Published' },
                    { key: 'archived', label: 'Archived' }
                  ].map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key as any)}
                      className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                        activeTab === tab.key
                          ? 'border-emerald-500 text-emerald-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </div>
            </div>

            {/* Search and Sort */}
            <div className="mb-6 flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search events..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="title">A-Z</option>
                  <option value="bookings">Most Bookings</option>
                </select>
              </div>
            </div>

            {/* Error State */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600">{error}</p>
              </div>
            )}

            {/* Events List */}
            {filteredEvents.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">No events found</p>
                <Link
                  to="/vendor/events/create"
                  className="mt-4 inline-block bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700"
                >
                  Create Your First Event
                </Link>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow overflow-hidden">
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
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Bookings
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            event.status === 'published'
                              ? 'bg-green-100 text-green-800'
                              : event.status === 'draft'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {event.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(event.dateTime.startDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {event.bookingsCount || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <Link
                              to={`/vendor/events/${event._id}/edit`}
                              className="text-indigo-600 hover:text-indigo-900"
                            >
                              Edit
                            </Link>
                            <button 
                              onClick={() => handleChangeStatus(event._id, 'archived')}
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
                                onClick={() => handleChangeStatus(event._id, 'published')}
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
    </>
  );
};

export default VendorEventsPage;