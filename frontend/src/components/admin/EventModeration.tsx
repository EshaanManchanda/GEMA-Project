import React, { useState, useEffect, useMemo } from 'react';
// import { useDispatch } from 'react-redux';
import { 
  FaCalendarCheck,
  FaEye,
  FaCheck,
  FaTimes,
  FaClock,
  FaMapMarkerAlt,
  FaStar,
  FaTag,
  FaSearch,
  FaFilter,
  FaDownload,
  FaDollarSign,
  FaUsers,
  FaCalendarAlt,
  FaTrash
} from 'react-icons/fa';
import { format, parseISO } from 'date-fns';
// import { AppDispatch } from '../../store';
import type { Event } from '../../types/event';
import Modal from '../interactive/Modal';
import DataTable from '../interactive/DataTable';

interface EventModerationProps {
  className?: string;
  compact?: boolean;
}

interface EventFilters {
  status: 'all' | 'pending' | 'approved' | 'rejected' | 'published' | 'draft';
  category: string;
  venueType: 'all' | 'Indoor' | 'Outdoor' | 'hybrid';
  dateRange: 'all' | 'today' | 'week' | 'month' | 'upcoming';
  featured: 'all' | 'featured' | 'not_featured';
  search: string;
  priceRange: 'all' | 'free' | 'paid' | 'premium';
}

interface ModerationAction {
  type: 'approve' | 'reject' | 'feature' | 'unfeature' | 'delete';
  label: string;
  icon: React.ReactNode;
  color: string;
}

const EventModeration: React.FC<EventModerationProps> = ({
  className = '',
  compact = false
}) => {
  // const dispatch = useDispatch<AppDispatch>();
  
  // Mock data - In real app, this would come from Redux store
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalEvents, setTotalEvents] = useState(0);
  
  const [filters, setFilters] = useState<EventFilters>({
    status: 'all',
    category: 'all',
    venueType: 'all',
    dateRange: 'all',
    featured: 'all',
    search: '',
    priceRange: 'all'
  });
  
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showModerationModal, setShowModerationModal] = useState(false);
  const [moderationAction, setModerationAction] = useState<ModerationAction | null>(null);
  const [moderationComment, setModerationComment] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    totalPages: 1
  });

  // Mock event data - In real implementation, fetch from API
  useEffect(() => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      const mockEvents: Event[] = [
        {
          _id: '68b2d0d63293690deba680a2',
          title: 'Kids Summer Fun Day 2025',
          description: 'Join us for an amazing day of fun activities, games, and entertainment designed specifically for children aged 4-12. Features include face painting, bouncy castles, magic shows, and interactive workshops.',
          category: 'Family & Kids',
          type: 'Event',
          venueType: 'Outdoor',
          images: ['https://placehold.co/400x300?text=Summer+Fun+Day&font=roboto'],
          location: {
            address: 'Dubai Marina Beach',
            city: 'Dubai',
            coordinates: { lat: 25.0772, lng: 55.1413 }
          },
          ageRange: [4, 12] as [number, number],
          seoMeta: {
            title: 'Kids Summer Fun Day 2025 | Best Family Event in Dubai',
            description: 'Join the best summer fun day event for kids in Dubai Marina Beach',
            keywords: ['kids', 'summer', 'fun', 'dubai', 'family']
          },
          vendorId: {
            _id: 'vendor1',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com'
          },
          dateSchedule: [{
            _id: 'schedule1',
            date: '2025-09-06',
            startDateTime: '2025-09-06T10:22:14.610Z',
            endDateTime: '2025-09-06T16:22:14.610Z',
            totalSeats: 150,
            availableSeats: 150,
            soldSeats: 0,
            reservedSeats: 0,
            price: 75
          }],
          price: 75,
          currency: 'AED',
          tags: ['kids', 'outdoor', 'family', 'summer', 'activities'],
          isApproved: true,
          isDeleted: false,
          isFeatured: true,
          status: 'published',
          viewsCount: 6,
          createdAt: '2025-08-30T10:22:14.711Z',
          updatedAt: '2025-09-03T12:56:56.514Z',
          faqs: [{
            _id: 'faq1',
            question: 'What age groups is this event suitable for?',
            answer: 'This event is designed for children aged 4-12 years old.'
          }],
          affiliateCode: 'SUMMER2025'
        },
        {
          _id: '68b2d0d63293690deba680a3',
          title: 'Tech Conference Dubai 2025',
          description: 'Leading technology conference featuring industry experts, workshops, and networking opportunities.',
          category: 'Technology',
          type: 'Event',
          venueType: 'Indoor',
          images: ['https://placehold.co/400x300?text=Tech+Conference&font=roboto'],
          location: {
            address: 'Dubai World Trade Centre',
            city: 'Dubai',
            coordinates: { lat: 25.2319, lng: 55.3244 }
          },
          ageRange: [18, 65] as [number, number],
          seoMeta: {
            title: 'Tech Conference Dubai 2025 | Leading Technology Event',
            description: 'Join the premier tech conference in Dubai featuring industry experts',
            keywords: ['tech', 'conference', 'dubai', 'technology', 'networking']
          },
          vendorId: {
            _id: 'vendor2',
            firstName: 'Sarah',
            lastName: 'Johnson',
            email: 'sarah.johnson@techconf.com'
          },
          dateSchedule: [{
            _id: 'schedule2',
            date: '2025-10-15',
            startDateTime: '2025-10-15T09:00:00.000Z',
            endDateTime: '2025-10-17T18:00:00.000Z',
            totalSeats: 500,
            availableSeats: 450,
            soldSeats: 50,
            reservedSeats: 0,
            price: 299
          }],
          price: 299,
          currency: 'AED',
          tags: ['technology', 'conference', 'networking', 'business'],
          isApproved: false,
          isDeleted: false,
          isFeatured: false,
          status: 'pending',
          viewsCount: 12,
          createdAt: '2025-09-01T08:15:30.000Z',
          updatedAt: '2025-09-01T08:15:30.000Z',
          faqs: [{
            _id: 'faq2',
            question: 'What topics will be covered at the conference?',
            answer: 'The conference will cover AI, blockchain, cloud computing, and emerging technologies.'
          }],
          affiliateCode: 'TECH2025'
        },
        {
          _id: '68b2d0d63293690deba680a4',
          title: 'Art Exhibition - Modern Masters',
          description: 'Contemporary art exhibition featuring works from emerging and established artists.',
          category: 'Arts & Culture',
          type: 'Event',
          venueType: 'Indoor',
          images: ['https://placehold.co/400x300?text=Art+Exhibition&font=roboto'],
          location: {
            address: 'Dubai Design District',
            city: 'Dubai',
            coordinates: { lat: 25.1901, lng: 55.2441 }
          },
          ageRange: [12, 80] as [number, number],
          seoMeta: {
            title: 'Art Exhibition - Modern Masters | Dubai Design District',
            description: 'Contemporary art exhibition featuring emerging and established artists',
            keywords: ['art', 'exhibition', 'dubai', 'contemporary', 'culture']
          },
          vendorId: {
            _id: 'vendor3',
            firstName: 'Michael',
            lastName: 'Chen',
            email: 'michael.chen@artgallery.com'
          },
          dateSchedule: [{
            _id: 'schedule3',
            date: '2025-09-20',
            startDateTime: '2025-09-20T10:00:00.000Z',
            endDateTime: '2025-10-20T20:00:00.000Z',
            totalSeats: 200,
            availableSeats: 200,
            soldSeats: 0,
            reservedSeats: 0,
            price: 25
          }],
          price: 25,
          currency: 'AED',
          tags: ['art', 'exhibition', 'culture', 'design'],
          isApproved: false,
          isDeleted: false,
          isFeatured: false,
          status: 'pending',
          viewsCount: 3,
          createdAt: '2025-09-02T14:30:00.000Z',
          updatedAt: '2025-09-02T14:30:00.000Z',
          faqs: [{
            _id: 'faq3',
            question: 'How long will the exhibition run?',
            answer: 'The exhibition will be open for one month from September 20 to October 20.'
          }],
          affiliateCode: 'ART2025'
        }
      ];
      
      setEvents(mockEvents);
      setTotalEvents(mockEvents.length);
      setIsLoading(false);
    }, 1000);
  }, [filters, pagination.page]);

  // Filter events based on current filters
  const filteredEvents = useMemo(() => {
    let filtered = events;

    if (filters.status !== 'all') {
      if (filters.status === 'pending') {
        filtered = filtered.filter(event => !event.isApproved && event.status === 'pending');
      } else if (filters.status === 'approved') {
        filtered = filtered.filter(event => event.isApproved);
      } else if (filters.status === 'rejected') {
        filtered = filtered.filter(event => event.status === 'rejected');
      } else {
        filtered = filtered.filter(event => event.status === filters.status);
      }
    }

    if (filters.category !== 'all') {
      filtered = filtered.filter(event => event.category === filters.category);
    }

    if (filters.venueType !== 'all') {
      filtered = filtered.filter(event => event.venueType === filters.venueType);
    }

    if (filters.featured !== 'all') {
      filtered = filtered.filter(event => 
        filters.featured === 'featured' ? event.isFeatured : !event.isFeatured
      );
    }

    if (filters.priceRange !== 'all') {
      if (filters.priceRange === 'free') {
        filtered = filtered.filter(event => event.price === 0);
      } else if (filters.priceRange === 'paid') {
        filtered = filtered.filter(event => event.price > 0 && event.price <= 100);
      } else if (filters.priceRange === 'premium') {
        filtered = filtered.filter(event => event.price > 100);
      }
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(event =>
        event.title.toLowerCase().includes(searchLower) ||
        event.description.toLowerCase().includes(searchLower) ||
        event.category.toLowerCase().includes(searchLower) ||
        event.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [events, filters]);

  const moderationActions: ModerationAction[] = [
    {
      type: 'approve',
      label: 'Approve Events',
      icon: <FaCheck size={14} />,
      color: 'text-green-600'
    },
    {
      type: 'reject',
      label: 'Reject Events',
      icon: <FaTimes size={14} />,
      color: 'text-red-600'
    },
    {
      type: 'feature',
      label: 'Feature Events',
      icon: <FaStar size={14} />,
      color: 'text-yellow-600'
    },
    {
      type: 'unfeature',
      label: 'Remove from Featured',
      icon: <FaStar size={14} />,
      color: 'text-gray-600'
    },
    {
      type: 'delete',
      label: 'Delete Events',
      icon: <FaTrash size={14} />,
      color: 'text-red-600'
    }
  ];

  const handleViewEvent = (event: Event) => {
    setSelectedEvent(event);
    setShowEventModal(true);
  };

  const handleModerationAction = (action: ModerationAction, event?: Event) => {
    setModerationAction(action);
    if (event) {
      setSelectedEvents(new Set([event._id]));
    }
    setShowModerationModal(true);
  };

  const executeModerationAction = () => {
    if (moderationAction && selectedEvents.size > 0) {
      console.log(`Executing ${moderationAction.type} on events:`, Array.from(selectedEvents));
      console.log('Moderation comment:', moderationComment);
      // In real app, dispatch moderation action
      
      setSelectedEvents(new Set());
      setShowModerationModal(false);
      setModerationAction(null);
      setModerationComment('');
    }
  };

  const handleSelectEvent = (eventId: string) => {
    setSelectedEvents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) {
        newSet.delete(eventId);
      } else {
        newSet.add(eventId);
      }
      return newSet;
    });
  };

  // Unused function - commented out to fix TypeScript error
  // const handleSelectAll = () => {
  //   if (selectedEvents.size === filteredEvents.length) {
  //     setSelectedEvents(new Set());
  //   } else {
  //     setSelectedEvents(new Set(filteredEvents.map(event => event._id)));
  //   }
  // };

  const getStatusColor = (event: Event) => {
    if (!event.isApproved && event.status === 'pending') {
      return 'text-yellow-700 bg-yellow-100';
    } else if (event.isApproved && event.status === 'published') {
      return 'text-green-700 bg-green-100';
    } else if (event.status === 'rejected') {
      return 'text-red-700 bg-red-100';
    } else if (event.status === 'draft') {
      return 'text-gray-700 bg-gray-100';
    }
    return 'text-gray-700 bg-gray-100';
  };

  const getStatusText = (event: Event) => {
    if (!event.isApproved && event.status === 'pending') {
      return 'Pending Review';
    } else if (event.isApproved && event.status === 'published') {
      return 'Approved';
    } else if (event.status === 'rejected') {
      return 'Rejected';
    } else if (event.status === 'draft') {
      return 'Draft';
    }
    return 'Unknown';
  };

  const columns = [
    {
      key: 'select',
      title: '',
      render: (event: Event) => (
        <input
          type="checkbox"
          checked={selectedEvents.has(event._id)}
          onChange={() => handleSelectEvent(event._id)}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
      ),
      width: '50px'
    },
    {
      key: 'event',
      title: 'Event',
      sortable: true,
      render: (event: Event) => (
        <div className="flex items-center space-x-3">
          {event.images && event.images.length > 0 && (
            <img
              src={event.images[0]}
              alt={event.title}
              className="h-12 w-12 rounded-lg object-cover flex-shrink-0"
            />
          )}
          <div className="min-w-0">
            <div className="font-medium text-gray-900 truncate">
              {event.title}
            </div>
            <div className="flex items-center space-x-2 mt-1">
              <span className="text-sm text-gray-500">{event.category}</span>
              {event.isFeatured && (
                <FaStar className="text-yellow-500" size={12} />
              )}
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'venue',
      title: 'Venue & Date',
      render: (event: Event) => (
        <div className="text-sm">
          <div className="flex items-center space-x-1 text-gray-900">
            <FaMapMarkerAlt className="text-gray-400" size={12} />
            <span className="truncate">{event.location.city}</span>
          </div>
          <div className="flex items-center space-x-1 text-gray-500 mt-1">
            <FaCalendarAlt className="text-gray-400" size={12} />
            <span>
              {format(parseISO(event.dateSchedule[0].startDateTime), 'MMM dd, yyyy')}
            </span>
          </div>
          <div className="text-xs text-gray-400 capitalize mt-1">
            {event.venueType} venue
          </div>
        </div>
      )
    },
    {
      key: 'pricing',
      title: 'Pricing & Capacity',
      render: (event: Event) => (
        <div className="text-sm">
          <div className="flex items-center space-x-1 text-gray-900">
            <FaDollarSign className="text-gray-400" size={12} />
            <span className="font-medium">
              {event.price === 0 ? 'Free' : `${event.price} ${event.currency}`}
            </span>
          </div>
          <div className="flex items-center space-x-1 text-gray-500 mt-1">
            <FaUsers className="text-gray-400" size={12} />
            <span>
              {event.dateSchedule[0].totalSeats} seats
            </span>
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {event.dateSchedule[0].soldSeats} sold
          </div>
        </div>
      )
    },
    {
      key: 'status',
      title: 'Status',
      sortable: true,
      render: (event: Event) => (
        <div className="space-y-2">
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(event)}`}>
            {getStatusText(event)}
          </span>
          {!event.isApproved && event.status === 'pending' && (
            <div className="flex items-center space-x-1">
              <FaClock className="text-yellow-500" size={12} />
              <span className="text-xs text-yellow-600">Needs Review</span>
            </div>
          )}
        </div>
      )
    },
    {
      key: 'metrics',
      title: 'Engagement',
      render: (event: Event) => (
        <div className="text-sm space-y-1">
          <div className="flex items-center space-x-1 text-gray-600">
            <FaEye className="text-gray-400" size={12} />
            <span>{event.viewsCount} views</span>
          </div>
          <div className="text-xs text-gray-500">
            Created {format(parseISO(event.createdAt), 'MMM dd')}
          </div>
        </div>
      )
    }
  ];

  const actions = [
    {
      key: 'view',
      label: 'View Details',
      icon: <FaEye size={14} />,
      onClick: handleViewEvent,
      className: 'text-blue-600 hover:text-blue-800'
    },
    {
      key: 'approve',
      label: 'Approve',
      icon: <FaCheck size={14} />,
      onClick: (event: Event) => handleModerationAction(moderationActions[0], event),
      className: 'text-green-600 hover:text-green-800',
      condition: (event: Event) => !event.isApproved
    },
    {
      key: 'reject',
      label: 'Reject',
      icon: <FaTimes size={14} />,
      onClick: (event: Event) => handleModerationAction(moderationActions[1], event),
      className: 'text-red-600 hover:text-red-800',
      condition: (event: Event) => !event.isApproved || event.status !== 'rejected'
    },
    {
      key: 'feature',
      label: 'Feature',
      icon: <FaStar size={14} />,
      onClick: (event: Event) => handleModerationAction(moderationActions[2], event),
      className: 'text-yellow-600 hover:text-yellow-800',
      condition: (event: Event) => !event.isFeatured && event.isApproved
    }
  ];

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <FaCalendarCheck className="text-gray-600" size={24} />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Event Moderation</h2>
              <p className="text-sm text-gray-600">
                Review and manage event submissions and approvals
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-md transition-colors ${
                showFilters ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <FaFilter size={16} />
            </button>
            
            <button className="flex items-center px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors">
              <FaDownload size={14} className="mr-2" />
              Export Report
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-yellow-50 rounded-lg p-4">
            <div className="flex items-center">
              <FaClock className="text-yellow-500" size={24} />
              <div className="ml-3">
                <p className="text-sm font-medium text-yellow-900">Pending Review</p>
                <p className="text-2xl font-semibold text-yellow-600">
                  {events.filter(e => !e.isApproved && e.status === 'pending').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center">
              <FaCheck className="text-green-500" size={24} />
              <div className="ml-3">
                <p className="text-sm font-medium text-green-900">Approved</p>
                <p className="text-2xl font-semibold text-green-600">
                  {events.filter(e => e.isApproved).length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center">
              <FaStar className="text-purple-500" size={24} />
              <div className="ml-3">
                <p className="text-sm font-medium text-purple-900">Featured</p>
                <p className="text-2xl font-semibold text-purple-600">
                  {events.filter(e => e.isFeatured).length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center">
              <FaCalendarCheck className="text-blue-500" size={24} />
              <div className="ml-3">
                <p className="text-sm font-medium text-blue-900">Total Events</p>
                <p className="text-2xl font-semibold text-blue-600">{totalEvents}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                <input
                  type="text"
                  placeholder="Search events..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as EventFilters['status'] }))}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending Review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>

              <select
                value={filters.category}
                onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Categories</option>
                <option value="Family & Kids">Family & Kids</option>
                <option value="Technology">Technology</option>
                <option value="Arts & Culture">Arts & Culture</option>
                <option value="Business">Business</option>
                <option value="Sports">Sports</option>
                <option value="Music">Music</option>
              </select>

              <select
                value={filters.venueType}
                onChange={(e) => setFilters(prev => ({ ...prev, venueType: e.target.value as EventFilters['venueType'] }))}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Venues</option>
                <option value="indoor">Indoor</option>
                <option value="outdoor">Outdoor</option>
                <option value="hybrid">Hybrid</option>
              </select>

              <select
                value={filters.featured}
                onChange={(e) => setFilters(prev => ({ ...prev, featured: e.target.value as EventFilters['featured'] }))}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Events</option>
                <option value="featured">Featured Only</option>
                <option value="not_featured">Not Featured</option>
              </select>

              <select
                value={filters.priceRange}
                onChange={(e) => setFilters(prev => ({ ...prev, priceRange: e.target.value as EventFilters['priceRange'] }))}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Prices</option>
                <option value="free">Free Events</option>
                <option value="paid">Paid (≤ 100 AED)</option>
                <option value="premium">Premium (&gt; 100 AED)</option>
              </select>
            </div>
          </div>
        )}

        {/* Bulk Actions */}
        {selectedEvents.size > 0 && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-700">
                {selectedEvents.size} event{selectedEvents.size !== 1 ? 's' : ''} selected
              </span>
              <div className="flex items-center space-x-2">
                {moderationActions.map((action) => (
                  <button
                    key={action.type}
                    onClick={() => handleModerationAction(action)}
                    className={`flex items-center px-3 py-1 text-xs rounded-md border transition-colors ${action.color} border-current hover:bg-current hover:text-white`}
                  >
                    {action.icon}
                    <span className="ml-1">{action.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Events Table */}
      <div>
        <DataTable
          data={filteredEvents}
          columns={columns}
          actions={actions}
          loading={isLoading}
          pagination={{
            current: pagination.page,
            pageSize: pagination.limit,
            total: filteredEvents.length,
            onChange: (page: number) => setPagination(prev => ({ ...prev, page }))
          }}
        />
      </div>

      {/* Event Details Modal */}
      <Modal
        isOpen={showEventModal}
        onClose={() => setShowEventModal(false)}
        title="Event Details"
        size="xl"
      >
        {selectedEvent && (
          <div className="p-6 space-y-6">
            {/* Event Header */}
            <div className="flex items-start space-x-4">
              {selectedEvent.images && selectedEvent.images.length > 0 && (
                <img
                  src={selectedEvent.images[0]}
                  alt={selectedEvent.title}
                  className="h-32 w-32 rounded-lg object-cover flex-shrink-0"
                />
              )}
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-gray-900">{selectedEvent.title}</h3>
                <p className="text-gray-600 mt-2">{selectedEvent.description}</p>
                <div className="flex items-center space-x-4 mt-4">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedEvent)}`}>
                    {getStatusText(selectedEvent)}
                  </span>
                  <span className="text-sm text-gray-500">{selectedEvent.category}</span>
                  {selectedEvent.isFeatured && (
                    <div className="flex items-center space-x-1 text-yellow-600">
                      <FaStar size={14} />
                      <span className="text-sm">Featured</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Event Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Event Information</h4>
                <dl className="space-y-2">
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">Type:</dt>
                    <dd className="text-sm font-medium text-gray-900">{selectedEvent.type}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">Venue Type:</dt>
                    <dd className="text-sm font-medium text-gray-900 capitalize">{selectedEvent.venueType}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">Price:</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {selectedEvent.price === 0 ? 'Free' : `${selectedEvent.price} ${selectedEvent.currency}`}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">Age Range:</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {selectedEvent.ageRange[0]}-{selectedEvent.ageRange[1]} years
                    </dd>
                  </div>
                </dl>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Schedule & Capacity</h4>
                <dl className="space-y-2">
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">Start Date:</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {format(parseISO(selectedEvent.dateSchedule[0].startDateTime), 'MMM dd, yyyy HH:mm')}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">End Date:</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {format(parseISO(selectedEvent.dateSchedule[0].endDateTime), 'MMM dd, yyyy HH:mm')}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">Total Seats:</dt>
                    <dd className="text-sm font-medium text-gray-900">{selectedEvent.dateSchedule[0].totalSeats}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">Sold Seats:</dt>
                    <dd className="text-sm font-medium text-gray-900">{selectedEvent.dateSchedule[0].soldSeats}</dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Location */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Location</h4>
              <div className="flex items-start space-x-2">
                <FaMapMarkerAlt className="text-gray-400 mt-0.5" size={14} />
                <div>
                  <div className="text-sm font-medium text-gray-900">{selectedEvent.location.address}</div>
                  <div className="text-sm text-gray-500">{selectedEvent.location.city}</div>
                </div>
              </div>
            </div>

            {/* Tags */}
            {selectedEvent.tags && selectedEvent.tags.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedEvent.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                    >
                      <FaTag className="mr-1" size={10} />
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <button
                onClick={() => setShowEventModal(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Close
              </button>
              {!selectedEvent.isApproved && (
                <>
                  <button
                    onClick={() => handleModerationAction(moderationActions[1], selectedEvent)}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                  >
                    Reject Event
                  </button>
                  <button
                    onClick={() => handleModerationAction(moderationActions[0], selectedEvent)}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    Approve Event
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Moderation Action Modal */}
      <Modal
        isOpen={showModerationModal}
        onClose={() => setShowModerationModal(false)}
        title={`${moderationAction?.label}`}
        size="md"
      >
        <div className="p-6">
          <p className="text-gray-600 mb-4">
            Are you sure you want to {moderationAction?.label.toLowerCase()} {selectedEvents.size} event{selectedEvents.size !== 1 ? 's' : ''}?
          </p>
          
          {(moderationAction?.type === 'reject' || moderationAction?.type === 'delete') && (
            <div className="mb-6">
              <label htmlFor="moderation-comment" className="block text-sm font-medium text-gray-700 mb-2">
                {moderationAction.type === 'reject' ? 'Rejection Reason' : 'Deletion Reason'} (Optional)
              </label>
              <textarea
                id="moderation-comment"
                rows={3}
                value={moderationComment}
                onChange={(e) => setModerationComment(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={`Enter reason for ${moderationAction.type}ing this event...`}
              />
            </div>
          )}
          
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setShowModerationModal(false)}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={executeModerationAction}
              className={`px-4 py-2 text-white rounded-md hover:opacity-90 ${
                moderationAction?.type === 'delete' || moderationAction?.type === 'reject' 
                  ? 'bg-red-600' 
                  : moderationAction?.type === 'approve'
                  ? 'bg-green-600'
                  : 'bg-blue-600'
              }`}
            >
              {moderationAction?.label}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default EventModeration;