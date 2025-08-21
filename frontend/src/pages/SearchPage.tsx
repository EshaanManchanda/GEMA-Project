import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaSearch, FaFilter, FaTimes, FaStar, FaMapMarkerAlt, FaCalendarAlt, FaClock } from 'react-icons/fa';

interface Event {
  id: number;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  price: number;
  category: string;
  image: string;
  organizer: {
    id: number;
    name: string;
    logo: string;
  };
  rating: number;
  reviewCount: number;
  attendees?: number;
  featured?: boolean;
}

// FilterContent Component
interface FilterContentProps {
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  priceRange: [number, number];
  setPriceRange: (range: [number, number]) => void;
  dateRange: string;
  setDateRange: (range: string) => void;
  categoryCounts: Record<string, number>;
  sortBy: string;
  setSortBy: (sort: string) => void;
  resetFilters: () => void;
}

const FilterContent: React.FC<FilterContentProps> = ({
  selectedCategory,
  setSelectedCategory,
  priceRange,
  setPriceRange,
  dateRange,
  setDateRange,
  categoryCounts,
  sortBy,
  setSortBy,
  resetFilters
}) => {
  // Get unique categories from events
  const categories = ['all', 'Conference', 'Festival', 'Seminar', 'Networking', 'Workshop', 'Charity', 'Concert', 'Exhibition'];
  
  return (
    <>
      <div className="mb-6">
        <h3 className="font-medium mb-3">Category</h3>
        <div className="space-y-2">
          {categories.map((category) => (
            <label key={category} className="flex items-center justify-between py-1 px-2 rounded hover:bg-gray-50 cursor-pointer">
              <div className="flex items-center">
                <input
                  type="radio"
                  name="category"
                  checked={selectedCategory === category}
                  onChange={() => setSelectedCategory(category)}
                  className="mr-2 accent-primary"
                />
                <span className="capitalize">{category === 'all' ? 'All Categories' : category}</span>
              </div>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                {categoryCounts[category] || 0}
              </span>
            </label>
          ))}
        </div>
      </div>
      
      <div className="mb-6">
        <h3 className="font-medium mb-3">Price Range</h3>
        <div className="flex items-center justify-between mb-2">
          <div className="px-3 py-1 bg-gray-100 rounded-md text-sm">${priceRange[0]}</div>
          <div className="px-3 py-1 bg-gray-100 rounded-md text-sm">${priceRange[1]}</div>
        </div>
        <div className="mb-4">
          <input
            type="range"
            min="0"
            max="1000"
            step="50"
            value={priceRange[0]}
            onChange={(e) => setPriceRange([parseInt(e.target.value), priceRange[1]])}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
          />
        </div>
        <div>
          <input
            type="range"
            min="0"
            max="1000"
            step="50"
            value={priceRange[1]}
            onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
          />
        </div>
      </div>
      
      <div className="mb-6">
        <h3 className="font-medium mb-3">Date</h3>
        <div className="space-y-2">
          {[
            { value: 'all', label: 'All Dates' },
            { value: 'today', label: 'Today' },
            { value: 'this-week', label: 'This Week' },
            { value: 'this-month', label: 'This Month' }
          ].map((option) => (
            <label key={option.value} className="flex items-center py-1 px-2 rounded hover:bg-gray-50 cursor-pointer">
              <input
                type="radio"
                name="date-range"
                value={option.value}
                checked={dateRange === option.value}
                onChange={() => setDateRange(option.value)}
                className="mr-2 accent-primary"
              />
              {option.label}
            </label>
          ))}
        </div>
      </div>
      
      <div className="mb-6 md:hidden">
        <h3 className="font-medium mb-3">Sort By</h3>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="relevance">Relevance</option>
          <option value="date">Date</option>
          <option value="price-low">Price: Low to High</option>
          <option value="price-high">Price: High to Low</option>
          <option value="rating">Rating</option>
        </select>
      </div>
      
      <button
        onClick={resetFilters}
        className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
      >
        <FaTimes className="w-3 h-3" />
        <span>Reset Filters</span>
      </button>
    </>
  );
};

const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get('q') || '';
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [usingMockData, setUsingMockData] = useState<boolean>(false);
  const [searchInput, setSearchInput] = useState<string>(query);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  
  // Filter states
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [dateRange, setDateRange] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('relevance');

  // Mock data for events
  const mockEvents: Event[] = [
    {
      id: 1,
      title: 'Tech Conference 2023',
      image: 'https://via.placeholder.com/400x300',
      date: '2023-11-15',
      time: '09:00 AM - 05:00 PM',
      location: 'Convention Center, New York',
      price: 299.99,
      category: 'Conference',
      description: 'Join us for the biggest tech conference of the year featuring keynotes from industry leaders, workshops, and networking opportunities.',
      organizer: {
        id: 101,
        name: 'TechEvents Inc',
        logo: 'https://via.placeholder.com/50'
      },
      rating: 4.8,
      reviewCount: 124,
      featured: true,
      attendees: 1250
    },
    {
      id: 2,
      title: 'Music Festival Weekend',
      image: 'https://via.placeholder.com/400x300',
      date: '2023-12-10',
      time: '12:00 PM - 11:00 PM',
      location: 'Central Park, New York',
      price: 149.99,
      category: 'Festival',
      description: 'A two-day music festival featuring top artists from around the world, food vendors, and art installations.',
      organizer: {
        id: 102,
        name: 'Festival Productions',
        logo: 'https://via.placeholder.com/50'
      },
      rating: 4.5,
      reviewCount: 89,
      attendees: 3500
    },
    {
      id: 3,
      title: 'Business Leadership Summit',
      image: 'https://via.placeholder.com/400x300',
      date: '2023-11-25',
      time: '10:00 AM - 04:00 PM',
      location: 'Grand Hotel, Chicago',
      price: 349.99,
      category: 'Seminar',
      description: 'Learn from successful business leaders and entrepreneurs about strategies for growth and innovation in today\'s market.',
      organizer: {
        id: 103,
        name: 'Business Growth Network',
        logo: 'https://via.placeholder.com/50'
      },
      rating: 4.7,
      reviewCount: 56
    },
    {
      id: 4,
      title: 'Startup Networking Mixer',
      image: 'https://via.placeholder.com/400x300',
      date: '2023-11-30',
      time: '06:00 PM - 09:00 PM',
      location: 'Innovation Hub, San Francisco',
      price: 25.00,
      category: 'Networking',
      description: 'Connect with fellow entrepreneurs, investors, and industry professionals in a casual networking environment.',
      organizer: {
        id: 104,
        name: 'Startup Connect',
        logo: 'https://via.placeholder.com/50'
      },
      rating: 4.3,
      reviewCount: 42
    },
    {
      id: 5,
      title: 'Digital Marketing Workshop',
      image: 'https://via.placeholder.com/400x300',
      date: '2023-12-05',
      time: '09:30 AM - 03:30 PM',
      location: 'Business Center, Los Angeles',
      price: 199.99,
      category: 'Workshop',
      description: 'A hands-on workshop covering the latest digital marketing strategies, SEO techniques, and social media best practices.',
      organizer: {
        id: 105,
        name: 'Marketing Pros',
        logo: 'https://via.placeholder.com/50'
      },
      rating: 4.6,
      reviewCount: 78
    },
    {
      id: 6,
      title: 'Charity Gala Dinner',
      image: 'https://via.placeholder.com/400x300',
      date: '2023-12-15',
      time: '07:00 PM - 11:00 PM',
      location: 'Luxury Hotel, Miami',
      price: 500.00,
      category: 'Charity',
      description: 'An elegant evening of dining and entertainment to raise funds for children\'s education in underprivileged communities.',
      organizer: {
        id: 106,
        name: 'Global Education Foundation',
        logo: 'https://via.placeholder.com/50'
      },
      rating: 4.9,
      reviewCount: 32,
      featured: true,
      attendees: 250
    },
    {
      id: 7,
      title: 'Artificial Intelligence Symposium',
      image: 'https://via.placeholder.com/400x300',
      date: '2024-01-20',
      time: '09:00 AM - 05:00 PM',
      location: 'Tech Campus, Boston',
      price: 279.99,
      category: 'Conference',
      description: 'Explore the latest advancements in AI technology with presentations from leading researchers and industry applications.',
      organizer: {
        id: 107,
        name: 'AI Research Institute',
        logo: 'https://via.placeholder.com/50'
      },
      rating: 4.7,
      reviewCount: 45
    },
    {
      id: 8,
      title: 'Wellness Retreat Weekend',
      image: 'https://via.placeholder.com/400x300',
      date: '2024-02-10',
      time: 'All Day',
      location: 'Mountain Resort, Colorado',
      price: 899.99,
      category: 'Retreat',
      description: 'A rejuvenating weekend of yoga, meditation, healthy cuisine, and wellness workshops in a beautiful mountain setting.',
      organizer: {
        id: 108,
        name: 'Mindful Living Co',
        logo: 'https://via.placeholder.com/50'
      },
      rating: 4.8,
      reviewCount: 67
    }
  ];

  // Categories derived from mock data
  const categories = ['all', ...Array.from(new Set(mockEvents.map(event => event.category)))];

  useEffect(() => {
    const fetchSearchResults = async () => {
      try {
        setLoading(true);
        
        // In a real app, you would fetch from an API with the search query
        // const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        // if (!response.ok) throw new Error('Failed to fetch search results');
        // const data = await response.json();
        
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Filter mock data based on search query
        const filteredEvents = mockEvents.filter(event => 
          event.title.toLowerCase().includes(query.toLowerCase()) ||
          event.description.toLowerCase().includes(query.toLowerCase()) ||
          event.category.toLowerCase().includes(query.toLowerCase()) ||
          event.location.toLowerCase().includes(query.toLowerCase())
        );
        
        setEvents(filteredEvents);
        setUsingMockData(true);
        setError(null);
      } catch (err) {
        console.error('Error fetching search results:', err);
        setError('Failed to load search results. Using mock data instead.');
        
        // Filter mock data based on search query as fallback
        const filteredEvents = mockEvents.filter(event => 
          event.title.toLowerCase().includes(query.toLowerCase()) ||
          event.description.toLowerCase().includes(query.toLowerCase()) ||
          event.category.toLowerCase().includes(query.toLowerCase()) ||
          event.location.toLowerCase().includes(query.toLowerCase())
        );
        
        setEvents(filteredEvents);
        setUsingMockData(true);
      } finally {
        setLoading(false);
      }
    };

    fetchSearchResults();
  }, [query]);

  // Handle search submission
  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (searchInput.trim()) {
      setSearchParams({ q: searchInput.trim() });
    } else {
      navigate('/');
    }
  };

  // Calculate category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: events.length };
    events.forEach(event => {
      counts[event.category] = (counts[event.category] || 0) + 1;
    });
    return counts;
  }, [events]);

  // Apply filters and sorting to events
  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      // Category filter
      const matchesCategory = selectedCategory === 'all' || event.category === selectedCategory;
      
      // Price filter
      const matchesPrice = event.price >= priceRange[0] && event.price <= priceRange[1];
      
      // Date filter
      let matchesDate = true;
      const eventDate = new Date(event.date);
      const today = new Date();
      
      if (dateRange === 'today') {
        matchesDate = eventDate.toDateString() === today.toDateString();
      } else if (dateRange === 'this-week') {
        const weekLater = new Date(today);
        weekLater.setDate(today.getDate() + 7);
        matchesDate = eventDate >= today && eventDate <= weekLater;
      } else if (dateRange === 'this-month') {
        matchesDate = eventDate.getMonth() === today.getMonth() && 
                     eventDate.getFullYear() === today.getFullYear();
      }
      
      return matchesCategory && matchesPrice && matchesDate;
    }).sort((a, b) => {
      if (sortBy === 'price-low') return a.price - b.price;
      if (sortBy === 'price-high') return b.price - a.price;
      if (sortBy === 'date') return new Date(a.date).getTime() - new Date(b.date).getTime();
      if (sortBy === 'rating') return b.rating - a.rating;
      // Default: relevance (no specific sorting)
      return 0;
    });
  }, [events, selectedCategory, priceRange, dateRange, sortBy]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 mb-4"
          >
            <FaSearch className="w-full h-full text-primary opacity-50" />
          </motion.div>
          <h2 className="text-xl font-semibold text-gray-600 mb-2">Searching for events</h2>
          <p className="text-gray-500">Finding the best matches for "{query}"</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Search Header */}
      <div className="bg-white shadow-md sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaSearch className="text-gray-400" />
              </div>
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search for events, workshops, conferences..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <button 
              type="submit" 
              className="bg-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-dark transition-colors"
            >
              Search
            </button>
            <button 
              type="button" 
              onClick={() => setShowFilters(!showFilters)}
              className="md:hidden bg-gray-100 text-gray-700 p-3 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <FaFilter />
            </button>
          </form>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {usingMockData && (
          <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6 rounded-r-lg" role="alert">
            <p className="font-bold">Note</p>
            <p>Using mock data. In a production environment, this would be fetched from a backend API.</p>
          </div>
        )}

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-r-lg" role="alert">
            <p className="font-bold">Error</p>
            <p>{error}</p>
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-1">Search Results for "{query}"</h1>
            <p className="text-gray-600">{filteredEvents.length} results found</p>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <label className="text-gray-600 text-sm">Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="relevance">Relevance</option>
              <option value="date">Date</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="rating">Rating</option>
            </select>
          </div>
        </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        {/* Mobile Filter Toggle */}
        <AnimatePresence>
          {showFilters && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
              onClick={() => setShowFilters(false)}
            >
              <motion.div 
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25 }}
                className="absolute top-0 left-0 bottom-0 w-4/5 max-w-sm bg-white overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-4 border-b sticky top-0 bg-white z-10 flex justify-between items-center">
                  <h2 className="text-xl font-bold">Filters</h2>
                  <button 
                    onClick={() => setShowFilters(false)}
                    className="p-2 rounded-full hover:bg-gray-100"
                  >
                    <FaTimes />
                  </button>
                </div>
                <div className="p-4">
                  {/* Mobile Filters Content */}
                  <FilterContent 
                    selectedCategory={selectedCategory}
                    setSelectedCategory={setSelectedCategory}
                    priceRange={priceRange}
                    setPriceRange={setPriceRange}
                    dateRange={dateRange}
                    setDateRange={setDateRange}
                    categoryCounts={categoryCounts}
                    sortBy={sortBy}
                    setSortBy={setSortBy}
                    resetFilters={() => {
                      setSelectedCategory('all');
                      setPriceRange([0, 1000]);
                      setDateRange('all');
                      setSortBy('relevance');
                    }}
                  />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Desktop Filters Sidebar */}
        <div className="hidden lg:block lg:col-span-1">
          <div className="bg-white p-6 rounded-lg shadow-sm sticky top-24">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Filters</h2>
              <button
                onClick={() => {
                  setSelectedCategory('all');
                  setPriceRange([0, 1000]);
                  setDateRange('all');
                  setSortBy('relevance');
                }}
                className="text-sm text-primary hover:underline"
              >
                Reset All
              </button>
            </div>
            
            <FilterContent 
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              priceRange={priceRange}
              setPriceRange={setPriceRange}
              dateRange={dateRange}
              setDateRange={setDateRange}
              categoryCounts={categoryCounts}
              sortBy={sortBy}
              setSortBy={setSortBy}
              resetFilters={() => {
                setSelectedCategory('all');
                setPriceRange([0, 1000]);
                setDateRange('all');
                setSortBy('relevance');
              }}
            />
          </div>
        </div>
        
        {/* Search Results */}
        <div className="lg:col-span-3">
          {filteredEvents.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-lg shadow-sm">
              <div className="mb-4">
                <FaSearch className="w-12 h-12 mx-auto text-gray-300" />
              </div>
              <h3 className="text-xl font-medium text-gray-500 mb-2">No events found</h3>
              <p className="text-gray-400 mb-6">Try adjusting your search or filter options</p>
              <button 
                onClick={() => {
                  setSelectedCategory('all');
                  setPriceRange([0, 1000]);
                  setDateRange('all');
                  setSortBy('relevance');
                }}
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredEvents.map((event) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  whileHover={{ y: -5, transition: { duration: 0.2 } }}
                  className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300"
                >
                  <Link to={`/events/${event.id}`} className="block h-full">
                    <div className="relative h-48 overflow-hidden">
                      <img 
                        src={event.image} 
                        alt={event.title} 
                        className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                      />
                      {event.featured && (
                        <div className="absolute top-0 left-0 bg-yellow-500 text-white px-3 py-1 m-2 rounded-full text-xs font-medium">
                          Featured
                        </div>
                      )}
                      <div className="absolute top-0 right-0 bg-primary text-white px-3 py-1 m-2 rounded-full text-sm font-medium">
                        ${event.price.toFixed(2)}
                      </div>
                      <div className="absolute bottom-0 left-0 bg-white px-3 py-1 m-2 rounded-full text-xs font-medium shadow-sm">
                        {event.category}
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-lg mb-2 line-clamp-1 group-hover:text-primary transition-colors">{event.title}</h3>
                      <p className="text-gray-600 mb-3 text-sm line-clamp-2">{event.description}</p>
                      <div className="flex items-center text-gray-500 text-sm mb-2">
                        <FaCalendarAlt className="w-4 h-4 mr-2 text-gray-400" />
                        {new Date(event.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </div>
                      <div className="flex items-center text-gray-500 text-sm mb-2">
                        <FaClock className="w-4 h-4 mr-2 text-gray-400" />
                        {event.time}
                      </div>
                      <div className="flex items-center text-gray-500 text-sm mb-3">
                        <FaMapMarkerAlt className="w-4 h-4 mr-2 text-gray-400" />
                        {event.location}
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <img 
                            src={event.organizer.logo} 
                            alt={event.organizer.name} 
                            className="w-6 h-6 rounded-full mr-2"
                          />
                          <span className="text-xs text-gray-500">{event.organizer.name}</span>
                        </div>
                        <div className="flex items-center">
                          <FaStar className="text-yellow-500 mr-1 w-3 h-3" />
                          <span className="text-xs text-gray-500">{event.rating} ({event.reviewCount})</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
};

export default SearchPage;