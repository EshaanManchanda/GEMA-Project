import React, { useState, useMemo, useTransition } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { useInView } from 'react-intersection-observer';
import { useEventsQuery } from '@/hooks/queries/useEventsQuery';
import { getPlaceholderUrl } from '../utils/placeholderImage';
import SEO from '@/components/common/SEO';
import { useDebounce } from '@/hooks/useScrollAnimation';
import { StaggerContainer } from '@/components/animations';
import { EventsPageSkeleton } from '@/components/common/SkeletonLoaders';

// Lazy loaded event card component with intersection observer
interface EventCardProps {
  event: any;
  formattedDate: string;
}

const EventCard: React.FC<EventCardProps> = ({ event, formattedDate }) => {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
    rootMargin: '50px'
  });

  return (
    <div ref={ref} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow group">
      <div className="relative overflow-hidden">
        {inView ? (
          <img
            src={event.image}
            alt={event.title}
            className="w-full h-48 object-cover transform group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-48 bg-gray-200 animate-pulse" />
        )}
        <div className="absolute top-0 right-0 m-3">
          <span className="bg-primary text-white px-3 py-1 rounded-full text-sm font-medium">
            {event.currency || 'AED'} {event.price}
          </span>
        </div>
        <div className="absolute bottom-0 left-0 m-3">
          <span className="bg-black bg-opacity-70 text-white px-3 py-1 rounded-full text-xs">
            {event.category}
          </span>
        </div>
      </div>
      <div className="p-5">
        <h3 className="font-bold text-lg mb-2 group-hover:text-primary transition-colors">{event.title}</h3>
        <p className="text-gray-600 mb-4 line-clamp-2">{event.description}</p>
        <div className="flex flex-col space-y-2 mb-4">
          <div className="flex items-center text-sm text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>{formattedDate}</span>
          </div>
          <div className="flex items-center text-sm text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>{typeof event.location === 'string' ? event.location : event.location?.city || 'Location TBD'}</span>
          </div>
        </div>
        <Link
          to={`/events/${event.slug || event.id}`}
          className="block w-full text-center bg-primary text-white py-3 rounded-md hover:bg-primary-dark transition-colors font-medium"
        >
          View Details
        </Link>
      </div>
    </div>
  );
};

// Mock data for when backend is unavailable
const mockEvents = [
  {
    id: '1',
    title: 'Kids Fun Day',
    description: 'A day full of fun activities for kids of all ages.',
    image: getPlaceholderUrl('eventCard', 'Kids Fun Day'),
    price: 25,
    date: '2023-12-15',
    location: 'Central Park',
    category: 'Entertainment'
  },
  {
    id: '2',
    title: 'Science Workshop',
    description: 'Interactive science experiments for curious minds.',
    image: 'https://via.placeholder.com/400x300?text=Science+Workshop',
    price: 30,
    date: '2023-12-20',
    location: 'Science Museum',
    category: 'Education'
  },
  {
    id: '3',
    title: 'Art & Craft Session',
    description: 'Creative art and craft activities for children.',
    image: 'https://via.placeholder.com/400x300?text=Art+Craft',
    price: 20,
    date: '2023-12-18',
    location: 'Community Center',
    category: 'Arts'
  },
  {
    id: '4',
    title: 'Junior Soccer Camp',
    description: 'Learn soccer skills in a fun and supportive environment.',
    image: 'https://via.placeholder.com/400x300?text=Soccer+Camp',
    price: 35,
    date: '2023-12-22',
    location: 'Sports Complex',
    category: 'Sports'
  },
  {
    id: '5',
    title: 'Coding for Kids',
    description: 'Introduction to programming concepts for children aged 8-12.',
    image: 'https://via.placeholder.com/400x300?text=Coding+Kids',
    price: 40,
    date: '2023-12-27',
    location: 'Tech Hub',
    category: 'Education'
  },
  {
    id: '6',
    title: 'Adventure Park Day',
    description: 'Exciting outdoor activities and adventures for the whole family.',
    image: 'https://via.placeholder.com/400x300?text=Adventure+Park',
    price: 45,
    date: '2023-12-30',
    location: 'Adventure World',
    category: 'Adventure'
  }
];

const EventsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const teacherIdFilter = searchParams.get('teacherId') || '';
  const teacherNameFilter = searchParams.get('teacherName') || '';

  // TanStack Query hook replaces useEffect + manual state management (30+ lines → 2 lines!)
  const { data: eventsData, isLoading, error } = useEventsQuery();

  const [filters, setFilters] = useState({
    category: '',
    priceRange: [0, 100],
    date: '',
    searchQuery: ''
  });
  const [sortBy, setSortBy] = useState('date'); // 'date', 'price-low', 'price-high'
  const [isPending, startTransition] = useTransition();

  // Debounce search query to prevent expensive filtering on every keystroke
  const debouncedSearchQuery = useDebounce(filters.searchQuery, 300);

  // Extract and transform events data (with fallback to mock data)
  const rawEvents = eventsData?.events || [];
  const events = Array.isArray(rawEvents) ? rawEvents.map((event: any) => ({
    ...event,
    id: event._id || event.id,
    image: event.images?.[0] || `https://via.placeholder.com/400x300?text=${encodeURIComponent(event.title)}`,
    date: event.dateSchedule?.[0]?.startDate || new Date().toISOString(),
    location: event.location?.city || event.location?.address || 'Location TBD',
    price: event.price || 0
  })) : mockEvents;

  const usingMockData = !eventsData && !isLoading;

  if (isLoading) {
    return <EventsPageSkeleton />;
  }

  // Memoize filtered events to prevent recalculation on every render
  const filteredEvents = useMemo(() => {
    const getEventTeacherId = (event: any): string => {
      const rawTeacher = event?.teacherId;
      if (!rawTeacher) return '';

      if (typeof rawTeacher === 'string') return rawTeacher;
      if (typeof rawTeacher?._id === 'string') return rawTeacher._id;
      if (typeof rawTeacher?.id === 'string') return rawTeacher.id;

      if (rawTeacher?._id?.toString) return rawTeacher._id.toString();
      if (rawTeacher?.toString) return rawTeacher.toString();
      return '';
    };

    const filtered = events.filter(event => {
      if (teacherIdFilter) {
        const eventTeacherId = getEventTeacherId(event);
        if (!eventTeacherId || eventTeacherId !== teacherIdFilter) return false;
      }

      // Apply category filter
      if (filters.category && event.category !== filters.category) return false;

      // Apply price filter
      if (event.price > filters.priceRange[1]) return false;

      // Apply date filter (simplified for demo)
      if (filters.date) {
        const filterDate = new Date(filters.date).toISOString().split('T')[0];
        const eventDate = new Date(event.date).toISOString().split('T')[0];
        if (eventDate !== filterDate) return false;
      }

      // Apply debounced search query filter (prevents lag while typing)
      if (debouncedSearchQuery) {
        const query = debouncedSearchQuery.toLowerCase();
        const eventLocation = typeof event.location === 'string' ? event.location : event.location?.city || '';
        return (
          event.title?.toLowerCase().includes(query) ||
          event.description?.toLowerCase().includes(query) ||
          eventLocation.toLowerCase().includes(query) ||
          event.category?.toLowerCase().includes(query)
        );
      }

      return true;
    });

    // Sort filtered events
    switch (sortBy) {
      case 'price-low':
        return [...filtered].sort((a, b) => a.price - b.price);
      case 'price-high':
        return [...filtered].sort((a, b) => b.price - a.price);
      case 'date':
      default:
        return [...filtered].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }
  }, [
    events,
    teacherIdFilter,
    filters.category,
    filters.priceRange,
    filters.date,
    debouncedSearchQuery,
    sortBy,
  ]);

  const breadcrumbs = [
    { name: 'Home', url: '/' },
    { name: 'Events', url: '/events' }
  ];

  return (
    <>
      <SEO
        title="Kids Activities & Events in UAE | Gema Events"
        description="Discover amazing kids activities and events across the UAE. Book educational programs, entertainment, sports, and family-friendly experiences for children of all ages."
        keywords={['kids activities', 'events', 'UAE', 'Dubai', 'children', 'family fun', 'entertainment', 'education']}
        breadcrumbs={breadcrumbs}
      />
      <div className="container mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
            <p className="font-bold">Error</p>
            <p>{error instanceof Error ? error.message : 'Unable to load events. Please try again later.'}</p>
          </div>
        )}

        {usingMockData && (
          <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6" role="alert">
            <p className="font-bold">Note</p>
            <p>Unable to connect to the server. Showing default events data.</p>
          </div>
        )}

        <h1 className="text-3xl font-bold mb-4">
          {teacherNameFilter ? `Events by ${teacherNameFilter}` : 'Upcoming Events'}
        </h1>

        {teacherIdFilter && (
          <div className="mb-6">
            <Link
              to="/events"
              className="inline-flex items-center px-3 py-1.5 text-sm rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              Clear teacher filter
            </Link>
          </div>
        )}

        {/* Search bar */}
        <div className="mb-8">
          <div className="relative">
            <input
              type="text"
              placeholder="Search events by name, description, location..."
              className="w-full p-4 pl-12 pr-4 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              value={filters.searchQuery}
              onChange={(e) => {
                const newValue = e.target.value;
                startTransition(() => {
                  setFilters({ ...filters, searchQuery: newValue });
                });
              }}
            />
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
              {isPending ? (
                <svg className="animate-spin h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-6 mb-8">
          {/* Filters sidebar */}
          <div className="w-full md:w-1/4 bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Filters</h2>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Category</label>
              <select
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                value={filters.category}
                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              >
                <option value="">All Categories</option>
                <option value="Entertainment">Entertainment</option>
                <option value="Education">Education</option>
                <option value="Arts">Arts</option>
                <option value="Sports">Sports</option>
                <option value="Adventure">Adventure</option>
              </select>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Price Range</label>
              <div className="flex flex-col">
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-500">$0</span>
                  <span className="text-sm font-medium">${filters.priceRange[1]}</span>
                  <span className="text-sm text-gray-500">$100</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={filters.priceRange[1]}
                  onChange={(e) => setFilters({ ...filters, priceRange: [0, parseInt(e.target.value)] })}
                  className="w-full accent-primary"
                />
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Date</label>
              <input
                type="date"
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                value={filters.date}
                onChange={(e) => setFilters({ ...filters, date: e.target.value })}
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Sort By</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  className={`p-2 text-sm border rounded-md transition-colors ${sortBy === 'date' ? 'bg-primary text-white border-primary' : 'border-gray-300 hover:bg-gray-50'}`}
                  onClick={() => setSortBy('date')}
                >
                  Date
                </button>
                <button
                  className={`p-2 text-sm border rounded-md transition-colors ${sortBy === 'price-low' ? 'bg-primary text-white border-primary' : 'border-gray-300 hover:bg-gray-50'}`}
                  onClick={() => setSortBy('price-low')}
                >
                  Price: Low
                </button>
                <button
                  className={`p-2 text-sm border rounded-md transition-colors ${sortBy === 'price-high' ? 'bg-primary text-white border-primary' : 'border-gray-300 hover:bg-gray-50'}`}
                  onClick={() => setSortBy('price-high')}
                >
                  Price: High
                </button>
              </div>
            </div>

            <button
              className="w-full bg-primary text-white py-3 rounded-md hover:bg-primary-dark transition-colors font-medium"
              onClick={() => {
                setFilters({ category: '', priceRange: [0, 100], date: '', searchQuery: '' });
                setSortBy('date');
              }}
            >
              Reset All Filters
            </button>
          </div>

          {/* Events grid */}
          <div className="w-full md:w-3/4">
            <div className="flex justify-between items-center mb-6">
              <div className="text-gray-600">
                <span className="font-medium">{filteredEvents.length}</span> events found
              </div>
              <div className="hidden md:block">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">View:</span>
                  <button className="p-2 bg-primary text-white rounded-md">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>
                  <button className="p-2 bg-gray-200 text-gray-600 rounded-md">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEvents.map(event => {
                const eventDate = new Date(event.date);
                const formattedDate = format(eventDate, 'MMM d, yyyy');

                return (
                  <EventCard
                    key={event.id}
                    event={event}
                    formattedDate={formattedDate}
                  />
                );
              })}
            </StaggerContainer>

            {filteredEvents.length === 0 && (
              <div className="text-center py-12 bg-white rounded-lg shadow-md">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-xl font-medium mb-2">No events found</h3>
                <p className="text-gray-600 mb-4">Try adjusting your filters or search query</p>
                <button
                  onClick={() => {
                    setFilters({ category: '', priceRange: [0, 100], date: '', searchQuery: '' });
                    setSortBy('date');
                  }}
                  className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
                >
                  Reset All Filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default EventsPage;