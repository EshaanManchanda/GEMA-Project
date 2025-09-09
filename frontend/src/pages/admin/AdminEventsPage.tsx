import React, { useState, useEffect } from 'react';
import { FaSearch, FaEdit, FaTrash, FaEye, FaCheck, FaTimes, FaStar, FaUndo } from 'react-icons/fa';
import AdminNavigation from '../../components/admin/AdminNavigation';

interface Event {
  id: string;
  title: string;
  description: string;
  category: string;
  type: 'Event' | 'Course' | 'Venue';
  location: {
    city: string;
    address: string;
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
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

const AdminEventsPage: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Modal states
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);
  const [eventToApprove, setEventToApprove] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    filterEvents();
  }, [events, searchTerm, statusFilter, categoryFilter]);

  const fetchEvents = async () => {
    try {
      setIsLoading(true);
      // Simulate API call with mock data
      const mockEvents: Event[] = [
        {
          id: '1',
          title: 'Summer Music Festival',
          description: 'A great summer music festival',
          category: 'Music',
          type: 'Event',
          location: {
            city: 'Dubai',
            address: 'Dubai Marina'
          },
          vendor: {
            id: 'vendor1',
            fullName: 'John Doe',
            email: 'john@example.com'
          },
          price: 150,
          currency: 'AED',
          isApproved: true,
          isFeatured: false,
          viewsCount: 1250,
          images: ['/event1.jpg'],
          isDeleted: false,
          createdAt: '2023-04-15T10:45:00Z',
          updatedAt: '2023-04-15T10:45:00Z'
        }
      ];
      
      setEvents(mockEvents);
      setFilteredEvents(mockEvents);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterEvents = () => {
    let filtered = events.filter(event => {
      const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          event.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || 
                           (statusFilter === 'approved' && event.isApproved) ||
                           (statusFilter === 'pending' && !event.isApproved && !event.isDeleted) ||
                           (statusFilter === 'deleted' && event.isDeleted);
      
      const matchesCategory = categoryFilter === 'all' || event.category === categoryFilter;
      
      return matchesSearch && matchesStatus && matchesCategory;
    });
    
    setFilteredEvents(filtered);
  };

  const handleDeleteEvent = async (eventId: string, permanent: boolean = false) => {
    try {
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
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  const handleRestoreEvent = async (eventId: string) => {
    try {
      setEvents(prev => prev.map(event => 
        event.id === eventId ? { ...event, isDeleted: false } : event
      ));
    } catch (error) {
      console.error('Error restoring event:', error);
    }
  };

  const handleApproveEvent = async (eventId: string) => {
    try {
      setEvents(prev => prev.map(event => 
        event.id === eventId ? { ...event, isApproved: true } : event
      ));
      setEventToApprove(null);
      setIsApprovalModalOpen(false);
      setActionType(null);
    } catch (error) {
      console.error('Error approving event:', error);
    }
  };

  const handleRejectEvent = async (eventId: string, reason: string) => {
    try {
      setEvents(prev => prev.map(event => 
        event.id === eventId ? { ...event, isApproved: false, rejectionReason: reason } : event
      ));
      setIsApprovalModalOpen(false);
      setActionType(null);
      setRejectionReason('');
    } catch (error) {
      console.error('Error rejecting event:', error);
    }
  };

  const handleToggleFeatured = async (eventId: string) => {
    try {
      setEvents(prev => prev.map(event => 
        event.id === eventId ? { ...event, isFeatured: !event.isFeatured } : event
      ));
    } catch (error) {
      console.error('Error toggling featured status:', error);
    }
  };

  if (isLoading) {
    return (
      <>
        <AdminNavigation />
        <div className="min-h-screen bg-gray-50">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <AdminNavigation />
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Events Management</h1>
            <p className="text-gray-600">Manage and moderate events from vendors</p>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow mb-6 p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                <div className="relative">
                  <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search events..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Categories</option>
                  <option value="Music">Music</option>
                  <option value="Sports">Sports</option>
                  <option value="Education">Education</option>
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
                  {filteredEvents.map((event) => (
                    <tr key={event.id} className="hover:bg-gray-50">
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
                  ))}
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
              <div className="bg-white rounded-lg w-full max-w-2xl max-h-96 overflow-y-auto">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-900">{selectedEvent.title}</h3>
                    <button
                      onClick={() => setIsViewModalOpen(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <FaTimes className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Category</p>
                      <p className="text-gray-900">{selectedEvent.category}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Type</p>
                      <p className="text-gray-900">{selectedEvent.type}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Location</p>
                      <p className="text-gray-900">{selectedEvent.location.address}, {selectedEvent.location.city}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Price</p>
                      <p className="text-gray-900">{selectedEvent.currency} {selectedEvent.price}</p>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-500 mb-2">Description</p>
                    <p className="text-gray-900">{selectedEvent.description}</p>
                  </div>
                  
                  <div className="flex justify-end">
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
        </div>
      </div>
    </>
  );
};

export default AdminEventsPage;