import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaSearch, FaFilter, FaTimes, FaStar, FaMapMarkerAlt, FaCalendarAlt, FaClock, FaUsers, FaTag } from 'react-icons/fa';
import { SearchEvent, SearchFilters, CategoryOption, FilterOptions } from '../types/search';
import { ApiService } from '../services/api';
import { debounce } from 'lodash';
import SEO from '@/components/common/SEO';

// FilterContent Component
interface FilterContentProps {
  filters: SearchFilters;
  setFilters: (filters: SearchFilters) => void;
  filterOptions: FilterOptions;
  resetFilters: () => void;
  loading?: boolean;
}

const FilterContent: React.FC<FilterContentProps> = ({
  filters,
  setFilters,
  filterOptions,
  resetFilters,
  loading = false
}) => {
  
  return (
    <>
      {/* Category Filter */}
      <div className="mb-6">
        <h3 className="font-medium mb-3">Category</h3>
        <div className="space-y-2">
          {filterOptions.categories.map((category) => (
            <label key={category.value} className="flex items-center justify-between py-1 px-2 rounded hover:bg-gray-50 cursor-pointer">
              <div className="flex items-center">
                <input
                  type="radio"
                  name="category"
                  checked={filters.category === category.value}
                  onChange={() => setFilters({ ...filters, category: category.value, page: 1 })}
                  className="mr-2 accent-primary"
                  disabled={loading}
                />
                <span className="capitalize">{category.label}</span>
              </div>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                {category.count}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Event Type Filter */}
      <div className="mb-6">
        <h3 className="font-medium mb-3">Event Type</h3>
        <div className="space-y-2">
          {filterOptions.eventTypes.map((eventType) => (
            <label key={eventType.value} className="flex items-center justify-between py-1 px-2 rounded hover:bg-gray-50 cursor-pointer">
              <div className="flex items-center">
                <input
                  type="radio"
                  name="eventType"
                  checked={filters.type === eventType.value}
                  onChange={() => setFilters({ ...filters, type: eventType.value, page: 1 })}
                  className="mr-2 accent-primary"
                  disabled={loading}
                />
                <span>{eventType.label}</span>
              </div>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                {eventType.count}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Venue Type Filter */}
      <div className="mb-6">
        <h3 className="font-medium mb-3">Venue Type</h3>
        <div className="space-y-2">
          {filterOptions.venueTypes.map((venueType) => (
            <label key={venueType.value} className="flex items-center justify-between py-1 px-2 rounded hover:bg-gray-50 cursor-pointer">
              <div className="flex items-center">
                <input
                  type="radio"
                  name="venueType"
                  checked={filters.venueType === venueType.value}
                  onChange={() => setFilters({ ...filters, venueType: venueType.value, page: 1 })}
                  className="mr-2 accent-primary"
                  disabled={loading}
                />
                <span>{venueType.label}</span>
              </div>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                {venueType.count}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* City Filter */}
      <div className="mb-6">
        <h3 className="font-medium mb-3">City</h3>
        <div className="space-y-2 max-h-32 overflow-y-auto">
          {filterOptions.cities.slice(0, 5).map((city) => (
            <label key={city.value} className="flex items-center justify-between py-1 px-2 rounded hover:bg-gray-50 cursor-pointer">
              <div className="flex items-center">
                <input
                  type="radio"
                  name="city"
                  checked={filters.city === city.value}
                  onChange={() => setFilters({ ...filters, city: city.value, page: 1 })}
                  className="mr-2 accent-primary"
                  disabled={loading}
                />
                <span>{city.label}</span>
              </div>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                {city.count}
              </span>
            </label>
          ))}
        </div>
      </div>
      
      {/* Price Range Filter */}
      <div className="mb-6">
        <h3 className="font-medium mb-3">Price Range</h3>
        <div className="flex items-center justify-between mb-2">
          <div className="px-3 py-1 bg-gray-100 rounded-md text-sm">
            {filters.minPrice || filterOptions.priceRange.min} {filters.currency || 'AED'}
          </div>
          <div className="px-3 py-1 bg-gray-100 rounded-md text-sm">
            {filters.maxPrice || filterOptions.priceRange.max} {filters.currency || 'AED'}
          </div>
        </div>
        <div className="mb-4">
          <input
            type="range"
            min={filterOptions.priceRange.min}
            max={filterOptions.priceRange.max}
            step="10"
            value={filters.minPrice || filterOptions.priceRange.min}
            onChange={(e) => setFilters({ 
              ...filters, 
              minPrice: parseInt(e.target.value), 
              page: 1 
            })}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
            disabled={loading}
          />
        </div>
        <div>
          <input
            type="range"
            min={filterOptions.priceRange.min}
            max={filterOptions.priceRange.max}
            step="10"
            value={filters.maxPrice || filterOptions.priceRange.max}
            onChange={(e) => setFilters({ 
              ...filters, 
              maxPrice: parseInt(e.target.value), 
              page: 1 
            })}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
            disabled={loading}
          />
        </div>
      </div>

      {/* Currency Filter */}
      <div className="mb-6">
        <h3 className="font-medium mb-3">Currency</h3>
        <select
          value={filters.currency || ''}
          onChange={(e) => setFilters({ ...filters, currency: e.target.value, page: 1 })}
          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          disabled={loading}
        >
          <option value="">All Currencies</option>
          {filterOptions.currencies.map((currency) => (
            <option key={currency.value} value={currency.value}>
              {currency.label} ({currency.count})
            </option>
          ))}
        </select>
      </div>
      
      {/* Age Range Filter */}
      <div className="mb-6">
        <h3 className="font-medium mb-3">Age Range</h3>
        <div className="flex items-center justify-between mb-2">
          <div className="px-3 py-1 bg-gray-100 rounded-md text-sm">
            {filters.ageMin || filterOptions.ageRange.min}+
          </div>
          <div className="px-3 py-1 bg-gray-100 rounded-md text-sm">
            {filters.ageMax || filterOptions.ageRange.max}+
          </div>
        </div>
        <div className="mb-4">
          <input
            type="range"
            min={filterOptions.ageRange.min}
            max={filterOptions.ageRange.max}
            step="1"
            value={filters.ageMin || filterOptions.ageRange.min}
            onChange={(e) => setFilters({ 
              ...filters, 
              ageMin: parseInt(e.target.value), 
              page: 1 
            })}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
            disabled={loading}
          />
        </div>
        <div>
          <input
            type="range"
            min={filterOptions.ageRange.min}
            max={filterOptions.ageRange.max}
            step="1"
            value={filters.ageMax || filterOptions.ageRange.max}
            onChange={(e) => setFilters({ 
              ...filters, 
              ageMax: parseInt(e.target.value), 
              page: 1 
            })}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
            disabled={loading}
          />
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="mb-6">
        <h3 className="font-medium mb-3">Date Range</h3>
        <div className="space-y-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
            <input
              type="date"
              value={filters.dateFrom || ''}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value, page: 1 })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
            <input
              type="date"
              value={filters.dateTo || ''}
              onChange={(e) => setFilters({ ...filters, dateTo: e.target.value, page: 1 })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={loading}
            />
          </div>
        </div>
      </div>

      {/* Featured Events Filter */}
      <div className="mb-6">
        <label className="flex items-center py-1 px-2 rounded hover:bg-gray-50 cursor-pointer">
          <input
            type="checkbox"
            checked={filters.featured || false}
            onChange={(e) => setFilters({ 
              ...filters, 
              featured: e.target.checked ? true : undefined, 
              page: 1 
            })}
            className="mr-2 accent-primary"
            disabled={loading}
          />
          <span>Featured Events Only</span>
        </label>
      </div>
      
      {/* Sort Options for Mobile */}
      <div className="mb-6 md:hidden">
        <h3 className="font-medium mb-3">Sort By</h3>
        <select
          value={`${filters.sortBy || 'createdAt'}-${filters.sortOrder || 'desc'}`}
          onChange={(e) => {
            const [sortBy, sortOrder] = e.target.value.split('-');
            setFilters({ ...filters, sortBy, sortOrder: sortOrder as 'asc' | 'desc', page: 1 });
          }}
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          disabled={loading}
        >
          <option value="createdAt-desc">Newest First</option>
          <option value="createdAt-asc">Oldest First</option>
          <option value="price-asc">Price: Low to High</option>
          <option value="price-desc">Price: High to Low</option>
          <option value="viewsCount-desc">Most Popular</option>
          <option value="title-asc">Name: A to Z</option>
        </select>
      </div>
      
      <button
        onClick={resetFilters}
        className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
        disabled={loading}
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
  const [events, setEvents] = useState<SearchEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState<string>(query);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [pagination, setPagination] = useState<any>(null);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    categories: [{ label: 'All Categories', value: '', count: 0 }],
    cities: [{ label: 'All Cities', value: '', count: 0 }],
    eventTypes: [{ label: 'All Types', value: '', count: 0 }],
    venueTypes: [{ label: 'All Venues', value: '', count: 0 }],
    currencies: [{ label: 'All Currencies', value: '', count: 0 }],
    priceRange: { min: 0, max: 1000 },
    ageRange: { min: 0, max: 100 }
  });
  
  // Initialize filters from URL params
  const [filters, setFilters] = useState<SearchFilters>(() => {
    return {
      category: searchParams.get('category') || undefined,
      type: searchParams.get('type') || undefined,
      venueType: searchParams.get('venueType') || undefined,
      city: searchParams.get('city') || undefined,
      minPrice: searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined,
      maxPrice: searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined,
      currency: searchParams.get('currency') || undefined,
      ageMin: searchParams.get('ageMin') ? Number(searchParams.get('ageMin')) : undefined,
      ageMax: searchParams.get('ageMax') ? Number(searchParams.get('ageMax')) : undefined,
      featured: searchParams.get('featured') === 'true' ? true : undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
      sortBy: searchParams.get('sortBy') || 'createdAt',
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc',
      page: searchParams.get('page') ? Number(searchParams.get('page')) : 1,
      limit: 12
    };
  });

  // Debounced search function
  const debouncedFetchEvents = useCallback(
    debounce(async (searchQuery: string, searchFilters: SearchFilters) => {
      try {
        setLoading(true);
        setError(null);
        
        // Prepare API parameters
        const params: any = {
          limit: searchFilters.limit || 12,
          page: searchFilters.page || 1,
          sortBy: searchFilters.sortBy || 'createdAt',
          sortOrder: searchFilters.sortOrder || 'desc'
        };

        // Add search query if provided
        if (searchQuery.trim()) {
          params.search = searchQuery.trim();
        }

        // Add filters
        if (searchFilters.category) params.category = searchFilters.category;
        if (searchFilters.type) params.type = searchFilters.type;
        if (searchFilters.venueType) params.venueType = searchFilters.venueType;
        if (searchFilters.city) params.city = searchFilters.city;
        if (searchFilters.minPrice !== undefined) params.minPrice = searchFilters.minPrice;
        if (searchFilters.maxPrice !== undefined) params.maxPrice = searchFilters.maxPrice;
        if (searchFilters.currency) params.currency = searchFilters.currency;
        if (searchFilters.ageMin !== undefined) params.ageMin = searchFilters.ageMin;
        if (searchFilters.ageMax !== undefined) params.ageMax = searchFilters.ageMax;
        if (searchFilters.featured !== undefined) params.featured = searchFilters.featured.toString();
        if (searchFilters.dateFrom) params.dateFrom = searchFilters.dateFrom;
        if (searchFilters.dateTo) params.dateTo = searchFilters.dateTo;
        
        // Fetch events from API using ApiService directly
        const response = await ApiService.get('/events', { params });
        
        // Handle API response structure
        let eventsData = [];
        let paginationData = null;
        
        if (response?.data?.data?.events) {
          // Standard API response with nested data wrapper
          eventsData = response.data.data.events;
          paginationData = response.data.data.pagination;
        } else if (response?.data?.events) {
          // API response with direct data wrapper
          eventsData = response.data.events;
          paginationData = response.data.pagination;
        } else if (Array.isArray(response?.data)) {
          // Direct array response
          eventsData = response.data;
        } else {
          console.warn('Unexpected API response structure:', response);
          console.log('Full response:', JSON.stringify(response, null, 2));
        }
        
        setEvents(eventsData);
        setPagination(paginationData);
        
        // Update filter options based on current events
        updateFilterOptions(eventsData);
      } catch (err) {
        console.error('Error fetching events:', err);
        setError('Failed to load search results. Please try again.');
        setEvents([]);
        setPagination(null);
      } finally {
        setLoading(false);
      }
    }, 300),
    []
  );

  // Function to update filter options based on current events
  const updateFilterOptions = useCallback((eventList: SearchEvent[]) => {
    const categories = new Map<string, number>();
    const cities = new Map<string, number>();
    const eventTypes = new Map<string, number>();
    const venueTypes = new Map<string, number>();
    const currencies = new Map<string, number>();
    let minPrice = Infinity;
    let maxPrice = 0;
    let minAge = Infinity;
    let maxAge = 0;

    // Add "All" options
    categories.set('', eventList.length);
    cities.set('', eventList.length);
    eventTypes.set('', eventList.length);
    venueTypes.set('', eventList.length);
    currencies.set('', eventList.length);

    eventList.forEach(event => {
      // Categories
      if (event.category) {
        categories.set(event.category, (categories.get(event.category) || 0) + 1);
      }

      // Cities
      if (event.location?.city) {
        cities.set(event.location.city, (cities.get(event.location.city) || 0) + 1);
      }

      // Event types
      if (event.type) {
        eventTypes.set(event.type, (eventTypes.get(event.type) || 0) + 1);
      }

      // Venue types
      if (event.venueType) {
        venueTypes.set(event.venueType, (venueTypes.get(event.venueType) || 0) + 1);
      }

      // Currencies
      if (event.currency) {
        currencies.set(event.currency, (currencies.get(event.currency) || 0) + 1);
      }

      // Price range
      if (event.price) {
        minPrice = Math.min(minPrice, event.price);
        maxPrice = Math.max(maxPrice, event.price);
      }

      // Age range
      if (event.ageRange && event.ageRange.length >= 2) {
        minAge = Math.min(minAge, event.ageRange[0]);
        maxAge = Math.max(maxAge, event.ageRange[1]);
      }
    });

    setFilterOptions({
      categories: Array.from(categories.entries()).map(([value, count]) => ({
        label: value === '' ? 'All Categories' : value,
        value,
        count
      })),
      cities: Array.from(cities.entries()).map(([value, count]) => ({
        label: value === '' ? 'All Cities' : value,
        value,
        count
      })),
      eventTypes: Array.from(eventTypes.entries()).map(([value, count]) => ({
        label: value === '' ? 'All Types' : value,
        value,
        count
      })),
      venueTypes: Array.from(venueTypes.entries()).map(([value, count]) => ({
        label: value === '' ? 'All Venues' : value,
        value,
        count
      })),
      currencies: Array.from(currencies.entries()).map(([value, count]) => ({
        label: value === '' ? 'All Currencies' : value,
        value,
        count
      })),
      priceRange: {
        min: minPrice === Infinity ? 0 : Math.floor(minPrice / 10) * 10,
        max: maxPrice === 0 ? 1000 : Math.ceil(maxPrice / 10) * 10
      },
      ageRange: {
        min: minAge === Infinity ? 0 : minAge,
        max: maxAge === 0 ? 100 : maxAge
      }
    });
  }, []);

  // Effect to fetch events when query or filters change
  useEffect(() => {
    debouncedFetchEvents(query, filters);
  }, [query, filters, debouncedFetchEvents]);

  // Update URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    
    if (query) params.set('q', query);
    if (filters.category) params.set('category', filters.category);
    if (filters.type) params.set('type', filters.type);
    if (filters.venueType) params.set('venueType', filters.venueType);
    if (filters.city) params.set('city', filters.city);
    if (filters.minPrice !== undefined) params.set('minPrice', filters.minPrice.toString());
    if (filters.maxPrice !== undefined) params.set('maxPrice', filters.maxPrice.toString());
    if (filters.currency) params.set('currency', filters.currency);
    if (filters.ageMin !== undefined) params.set('ageMin', filters.ageMin.toString());
    if (filters.ageMax !== undefined) params.set('ageMax', filters.ageMax.toString());
    if (filters.featured) params.set('featured', 'true');
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.set('dateTo', filters.dateTo);
    if (filters.sortBy && filters.sortBy !== 'createdAt') params.set('sortBy', filters.sortBy);
    if (filters.sortOrder && filters.sortOrder !== 'desc') params.set('sortOrder', filters.sortOrder);
    if (filters.page && filters.page !== 1) params.set('page', filters.page.toString());
    
    setSearchParams(params);
  }, [filters, query, setSearchParams]);

  // Handle search submission
  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (searchInput.trim()) {
      const params = new URLSearchParams(searchParams);
      params.set('q', searchInput.trim());
      setSearchParams(params);
    } else {
      navigate('/');
    }
  };

  // Reset filters function
  const resetFilters = useCallback(() => {
    setFilters({
      sortBy: 'createdAt',
      sortOrder: 'desc',
      page: 1,
      limit: 12
    });
  }, []);

  // Handle pagination
  const handlePageChange = useCallback((newPage: number) => {
    setFilters(prev => ({ ...prev, page: newPage }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

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

  const searchQuery = searchParams.get('q') || '';
  const breadcrumbs = [
    { name: 'Home', url: '/' },
    { name: 'Search', url: '/search' },
    ...(searchQuery ? [{ name: `Results for "${searchQuery}"`, url: `/search?q=${searchQuery}` }] : [])
  ];

  return (
    <>
      <SEO
        title={searchQuery ? `Search Results for "${searchQuery}" | Gema Events` : 'Search Kids Activities & Events | Gema Events'}
        description={searchQuery ? `Find kids activities and events matching "${searchQuery}" in the UAE. Discover educational programs, entertainment, and family-friendly experiences.` : 'Search for the perfect kids activities and events in the UAE. Filter by age, location, category, and more to find the ideal experiences for your children.'}
        keywords={['search', 'kids activities', 'events', 'UAE', 'find activities', searchQuery].filter(Boolean)}
        breadcrumbs={breadcrumbs}
        noIndex={searchQuery ? true : false}
      />
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

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-r-lg" role="alert">
            <p className="font-bold">Error</p>
            <p>{error}</p>
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-1">
              {query ? `Search Results for "${query}"` : 'All Events'}
            </h1>
            <p className="text-gray-600">
              {loading ? 'Loading...' : `${pagination?.totalEvents || events.length} results found`}
              {pagination && (
                <span className="ml-2 text-sm">
                  (Page {pagination.currentPage} of {pagination.totalPages})
                </span>
              )}
            </p>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <label className="text-gray-600 text-sm">Sort by:</label>
            <select
              value={`${filters.sortBy || 'createdAt'}-${filters.sortOrder || 'desc'}`}
              onChange={(e) => {
                const [sortBy, sortOrder] = e.target.value.split('-');
                setFilters(prev => ({ ...prev, sortBy, sortOrder: sortOrder as 'asc' | 'desc', page: 1 }));
              }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={loading}
            >
              <option value="createdAt-desc">Newest First</option>
              <option value="createdAt-asc">Oldest First</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="viewsCount-desc">Most Popular</option>
              <option value="title-asc">Name: A to Z</option>
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
                    filters={filters}
                    setFilters={setFilters}
                    filterOptions={filterOptions}
                    resetFilters={resetFilters}
                    loading={loading}
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
                onClick={resetFilters}
                className="text-sm text-primary hover:underline"
                disabled={loading}
              >
                Reset All
              </button>
            </div>
            
            <FilterContent 
              filters={filters}
              setFilters={setFilters}
              filterOptions={filterOptions}
              resetFilters={resetFilters}
              loading={loading}
            />
          </div>
        </div>
        
        {/* Search Results */}
        <div className="lg:col-span-3">
          {loading ? (
            <div className="text-center py-16 bg-white rounded-lg shadow-sm">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-16 h-16 mb-4 mx-auto"
              >
                <FaSearch className="w-full h-full text-primary opacity-50" />
              </motion.div>
              <h3 className="text-xl font-medium text-gray-500 mb-2">Loading events...</h3>
              <p className="text-gray-400">Please wait while we fetch the latest events</p>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-lg shadow-sm">
              <div className="mb-4">
                <FaSearch className="w-12 h-12 mx-auto text-gray-300" />
              </div>
              <h3 className="text-xl font-medium text-gray-500 mb-2">
                {error ? 'Error loading events' : 'No events found'}
              </h3>
              <p className="text-gray-400 mb-6">
                {error || 'Try adjusting your search or filter options'}
              </p>
              <button 
                onClick={resetFilters}
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                disabled={loading}
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
                {events.map((event) => {
                  // Get the next available date from dateSchedule
                  const nextDate = event.dateSchedule?.find(schedule => 
                    new Date(schedule.startDate) >= new Date()
                  ) || event.dateSchedule?.[0];
                  
                  return (
                    <motion.div
                      key={event._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      whileHover={{ y: -5, transition: { duration: 0.2 } }}
                      className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300"
                    >
                      <Link to={`/events/${event._id}`} className="block h-full">
                        <div className="relative h-48 overflow-hidden">
                          <img 
                            src={event.images?.[0] || '/api/placeholder/400/300'} 
                            alt={event.title} 
                            className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = 'https://placehold.co/400x300?text=' + encodeURIComponent(event.title);
                            }}
                          />
                          {event.isFeatured && (
                            <div className="absolute top-0 left-0 bg-yellow-500 text-white px-3 py-1 m-2 rounded-full text-xs font-medium">
                              Featured
                            </div>
                          )}
                          <div className="absolute top-0 right-0 bg-primary text-white px-3 py-1 m-2 rounded-full text-sm font-medium">
                            {event.price} {event.currency}
                          </div>
                          <div className="absolute bottom-0 left-0 bg-white px-3 py-1 m-2 rounded-full text-xs font-medium shadow-sm">
                            {event.category}
                          </div>
                          <div className="absolute bottom-0 right-0 bg-black bg-opacity-70 text-white px-2 py-1 m-2 rounded text-xs">
                            {event.type}
                          </div>
                        </div>
                        <div className="p-4">
                          <h3 className="font-bold text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                            {event.title}
                          </h3>
                          <p className="text-gray-600 mb-3 text-sm line-clamp-2">{event.description}</p>
                          
                          {nextDate && (
                            <div className="flex items-center text-gray-500 text-sm mb-2">
                              <FaCalendarAlt className="w-4 h-4 mr-2 text-gray-400" />
                              {new Date(nextDate.startDate).toLocaleDateString('en-US', { 
                                weekday: 'short', 
                                month: 'short', 
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </div>
                          )}
                          
                          {nextDate && (
                            <div className="flex items-center text-gray-500 text-sm mb-2">
                              <FaClock className="w-4 h-4 mr-2 text-gray-400" />
                              {new Date(nextDate.startDate).toLocaleTimeString('en-US', { 
                                hour: '2-digit', 
                                minute: '2-digit'
                              })} - {new Date(nextDate.endDate).toLocaleTimeString('en-US', { 
                                hour: '2-digit', 
                                minute: '2-digit'
                              })}
                            </div>
                          )}
                          
                          <div className="flex items-center text-gray-500 text-sm mb-2">
                            <FaMapMarkerAlt className="w-4 h-4 mr-2 text-gray-400" />
                            {event.location?.city}, {event.location?.address}
                          </div>
                          
                          {event.ageRange && event.ageRange.length >= 2 && (
                            <div className="flex items-center text-gray-500 text-sm mb-2">
                              <FaUsers className="w-4 h-4 mr-2 text-gray-400" />
                              Ages {event.ageRange[0]}-{event.ageRange[1]}
                            </div>
                          )}
                          
                          {nextDate && (
                            <div className="flex items-center text-gray-500 text-sm mb-3">
                              <FaUsers className="w-4 h-4 mr-2 text-gray-400" />
                              {nextDate.availableSeats}/{nextDate.totalSeats} seats available
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <span className="text-xs text-gray-500">
                                by {event.vendorId?.firstName} {event.vendorId?.lastName}
                              </span>
                            </div>
                            <div className="flex items-center">
                              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                {event.viewsCount || 0} views
                              </span>
                            </div>
                          </div>
                          
                          {event.tags && event.tags.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-100">
                              <div className="flex items-center flex-wrap gap-1">
                                <FaTag className="w-3 h-3 text-gray-400 mr-1" />
                                {event.tags.slice(0, 3).map((tag, index) => (
                                  <span key={index} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                    {tag}
                                  </span>
                                ))}
                                {event.tags.length > 3 && (
                                  <span className="text-xs text-gray-500">+{event.tags.length - 3} more</span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
              
              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-center space-x-2 mt-8">
                  <button
                    onClick={() => handlePageChange(pagination.currentPage - 1)}
                    disabled={!pagination.hasPrevPage || loading}
                    className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  
                  <div className="flex space-x-2">
                    {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                      const page = Math.max(1, Math.min(
                        pagination.totalPages - 4,
                        pagination.currentPage - 2
                      )) + i;
                      
                      return (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          disabled={loading}
                          className={`px-4 py-2 rounded-lg ${
                            page === pagination.currentPage
                              ? 'bg-primary text-white'
                              : 'border border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    })}
                  </div>
                  
                  <button
                    onClick={() => handlePageChange(pagination.currentPage + 1)}
                    disabled={!pagination.hasNextPage || loading}
                    className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      </div>
    </div>
    </>
  );
};

export default SearchPage;