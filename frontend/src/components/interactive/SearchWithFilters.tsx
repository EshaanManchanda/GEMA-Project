import React, { useState, useEffect, useCallback } from 'react';
import { 
  FaSearch, 
  FaFilter, 
  FaTimes, 
  FaMapMarkerAlt, 
  FaCalendarAlt, 
  FaTag,
  FaStar,
  FaDollarSign,
  FaUsers,
  FaLocationArrow,
  FaSort,
  FaList,
  FaTh,
  FaSliders,
  FaChevronDown,
  FaChevronUp,
  FaClock
} from 'react-icons/fa';
import { categoriesAPI } from '../../services/api';
import type { Category } from '../../services/api/categoriesAPI';
import LoadingSpinner from '../common/LoadingSpinner';

interface SearchFilters {
  query: string;
  category: string;
  location: {
    address: string;
    lat?: number;
    lng?: number;
    radius?: number;
  };
  dateRange: {
    startDate: string;
    endDate: string;
  };
  priceRange: {
    min: number;
    max: number;
  };
  ageRange: {
    min: number;
    max: number;
  };
  eventType: string;
  tags: string[];
  rating: number;
  capacity: {
    min: number;
    max: number;
  };
  venueType: 'all' | 'indoor' | 'outdoor' | 'hybrid' | 'online';
  sortBy: 'relevance' | 'date' | 'price_low' | 'price_high' | 'rating' | 'popularity' | 'distance';
  filters: {
    isFeatured?: boolean;
    hasAvailability?: boolean;
    isOnline?: boolean;
    ageGroups?: string[];
    currency?: string;
  };
}

interface SearchWithFiltersProps {
  onSearch?: (filters: SearchFilters) => void;
  onFiltersChange?: (filters: Partial<SearchFilters>) => void;
  onResultsChange?: (results: any[]) => void;
  initialFilters?: Partial<SearchFilters>;
  showQuickFilters?: boolean;
  showAdvancedFilters?: boolean;
  showLocationSearch?: boolean;
  showRatingFilter?: boolean;
  showCapacityFilter?: boolean;
  showViewToggle?: boolean;
  showSortOptions?: boolean;
  placeholder?: string;
  className?: string;
  autoSearch?: boolean;
  debounceMs?: number;
  compact?: boolean;
  enableGeolocation?: boolean;
  currencies?: string[];
}

const defaultFilters: SearchFilters = {
  query: '',
  category: '',
  location: {
    address: '',
    radius: 10
  },
  dateRange: {
    startDate: '',
    endDate: ''
  },
  priceRange: {
    min: 0,
    max: 1000
  },
  ageRange: {
    min: 0,
    max: 18
  },
  eventType: '',
  tags: [],
  rating: 0,
  capacity: {
    min: 1,
    max: 1000
  },
  venueType: 'all',
  sortBy: 'relevance',
  filters: {}
};

const SearchWithFilters: React.FC<SearchWithFiltersProps> = ({
  onSearch,
  onFiltersChange,
  onResultsChange,
  initialFilters = {},
  showQuickFilters = true,
  showAdvancedFilters = true,
  showLocationSearch = true,
  showRatingFilter = true,
  showCapacityFilter = false,
  showViewToggle = true,
  showSortOptions = true,
  placeholder = 'Search events, activities...',
  className = '',
  autoSearch = true,
  debounceMs = 300,
  compact = false,
  enableGeolocation = true,
  currencies = ['AED', 'USD', 'EUR']
}) => {
  const [filters, setFilters] = useState<SearchFilters>({
    ...defaultFilters,
    ...initialFilters
  });
  const [showFilters, setShowFilters] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [popularTags, setPopularTags] = useState<string[]>([]);
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showLocationPermission, setShowLocationPermission] = useState(false);

  useEffect(() => {
    loadFilterOptions();
    
    // Request geolocation if enabled
    if (enableGeolocation && showLocationSearch && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.log('Geolocation access denied:', error);
          setShowLocationPermission(true);
        }
      );
    }
  }, [enableGeolocation, showLocationSearch]);

  useEffect(() => {
    if (autoSearch) {
      debouncedSearch();
    }
    onFiltersChange?.(filters);
  }, [filters, autoSearch, onFiltersChange]);

  const loadFilterOptions = async () => {
    try {
      // Load categories
      const categoriesResponse = await categoriesAPI.getAllCategories();
      setCategories(categoriesResponse.data || categoriesResponse);

      // Mock locations - replace with actual API call
      setLocations([
        'Dubai',
        'Abu Dhabi',
        'Sharjah',
        'Ajman',
        'Ras Al Khaimah',
        'Fujairah',
        'Umm Al Quwain'
      ]);

      // Mock popular tags
      setPopularTags([
        'indoor',
        'outdoor',
        'educational',
        'sports',
        'arts',
        'music',
        'dance',
        'swimming',
        'birthday',
        'summer camp'
      ]);
    } catch (error) {
      console.error('Failed to load filter options:', error);
    }
  };

  const debouncedSearch = useCallback(() => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    const timer = setTimeout(() => {
      performSearch();
    }, debounceMs);

    setDebounceTimer(timer);
  }, [filters, onSearch, debounceTimer, debounceMs]);

  const performSearch = useCallback(async () => {
    setIsSearching(true);
    
    try {
      // Mock search implementation with enhanced filtering
      const mockResults = await simulateSearch(filters);
      setSearchResults(mockResults);
      onSearch?.(filters);
      onResultsChange?.(mockResults);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  }, [filters, onSearch, onResultsChange]);

  const simulateSearch = async (searchFilters: SearchFilters): Promise<any[]> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        // Mock search results with advanced filtering
        const mockResults = [
          {
            id: '1',
            title: 'Kids Summer Fun Day 2025',
            category: 'Family & Kids',
            price: 75,
            rating: 4.8,
            location: { city: 'Dubai', address: 'Dubai Marina Beach' },
            capacity: 150,
            venueType: 'outdoor',
            isFeatured: true,
            hasAvailability: true,
            distance: userLocation ? Math.random() * 20 : undefined
          },
          {
            id: '2',
            title: 'Tech Conference Dubai 2025',
            category: 'Technology',
            price: 299,
            rating: 4.6,
            location: { city: 'Dubai', address: 'Dubai World Trade Centre' },
            capacity: 500,
            venueType: 'indoor',
            isFeatured: false,
            hasAvailability: true,
            distance: userLocation ? Math.random() * 20 : undefined
          }
        ];

        // Apply filters
        let filtered = mockResults;

        if (searchFilters.query) {
          filtered = filtered.filter(r => 
            r.title.toLowerCase().includes(searchFilters.query.toLowerCase())
          );
        }

        if (searchFilters.category) {
          filtered = filtered.filter(r => r.category === searchFilters.category);
        }

        if (searchFilters.rating > 0) {
          filtered = filtered.filter(r => r.rating >= searchFilters.rating);
        }

        if (searchFilters.priceRange.min > 0 || searchFilters.priceRange.max < 1000) {
          filtered = filtered.filter(r => 
            r.price >= searchFilters.priceRange.min && 
            r.price <= searchFilters.priceRange.max
          );
        }

        if (searchFilters.venueType !== 'all') {
          filtered = filtered.filter(r => r.venueType === searchFilters.venueType);
        }

        if (searchFilters.filters.isFeatured) {
          filtered = filtered.filter(r => r.isFeatured);
        }

        if (searchFilters.filters.hasAvailability) {
          filtered = filtered.filter(r => r.hasAvailability);
        }

        // Sort results
        switch (searchFilters.sortBy) {
          case 'price_low':
            filtered.sort((a, b) => a.price - b.price);
            break;
          case 'price_high':
            filtered.sort((a, b) => b.price - a.price);
            break;
          case 'rating':
            filtered.sort((a, b) => b.rating - a.rating);
            break;
          case 'distance':
            if (userLocation) {
              filtered.sort((a, b) => (a.distance || 0) - (b.distance || 0));
            }
            break;
          default:
            filtered.sort((a, b) => b.isFeatured ? 1 : -1);
        }

        resolve(filtered);
      }, 500);
    });
  };

  const handleInputChange = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleNestedChange = (parentKey: keyof SearchFilters, childKey: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [parentKey]: {
        ...(prev[parentKey] as any),
        [childKey]: value
      }
    }));
  };

  const handleTagToggle = (tag: string) => {
    setFilters(prev => ({
      ...prev,
      tags: prev.tags.includes(tag) 
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  const clearFilters = () => {
    setFilters(defaultFilters);
  };

  const clearFilter = (filterKey: string, subKey?: string) => {
    if (subKey) {
      handleNestedChange(filterKey as keyof SearchFilters, subKey, '');
    } else if (filterKey === 'tags') {
      handleInputChange('tags', []);
    } else {
      handleInputChange(filterKey as keyof SearchFilters, filterKey === 'priceRange' || filterKey === 'ageRange' ? defaultFilters[filterKey as keyof SearchFilters] : '');
    }
  };

  const handleSearch = () => {
    performSearch();
  };

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLocation = {
            address: 'Current Location',
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            radius: filters.location.radius || 10
          };
          setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
          handleInputChange('location', newLocation);
          setShowLocationPermission(false);
        },
        (error) => {
          console.error('Geolocation error:', error);
          alert('Unable to access your location. Please enter a location manually.');
        }
      );
    }
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.category) count++;
    if (filters.location.address) count++;
    if (filters.dateRange.startDate) count++;
    if (filters.priceRange.min > 0 || filters.priceRange.max < 1000) count++;
    if (filters.ageRange.min > 0 || filters.ageRange.max < 18) count++;
    if (filters.eventType) count++;
    if (filters.rating > 0) count++;
    if (filters.venueType !== 'all') count++;
    if (filters.tags.length > 0) count++;
    if (filters.capacity.min > 1 || filters.capacity.max < 1000) count++;
    if (Object.keys(filters.filters).some(key => filters.filters[key as keyof typeof filters.filters])) count++;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <div className={`bg-white rounded-lg shadow-lg ${className}`}>
      {/* Main Search Bar */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="flex-1 relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              value={filters.query}
              onChange={(e) => handleInputChange('query', e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder={placeholder}
              className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {isSearching && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <LoadingSpinner size="small" />
              </div>
            )}
          </div>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center px-4 py-3 border rounded-lg transition-colors ${
              showFilters || activeFiltersCount > 0
                ? 'border-blue-500 bg-blue-50 text-blue-600'
                : 'border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <FaFilter size={16} className="mr-2" />
            Filters
            {activeFiltersCount > 0 && (
              <span className="ml-2 bg-blue-500 text-white text-xs rounded-full px-2 py-0.5">
                {activeFiltersCount}
              </span>
            )}
          </button>

          {!autoSearch && (
            <button
              onClick={handleSearch}
              disabled={isSearching}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Search
            </button>
          )}

          {showViewToggle && (
            <div className="flex border border-gray-300 rounded-lg">
              <button
                onClick={() => setViewMode('list')}
                className={`p-3 ${viewMode === 'list' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <FaList size={16} />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-3 ${viewMode === 'grid' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <FaTh size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Search Results Summary */}
        {searchResults.length > 0 && (
          <div className="mt-3 flex items-center justify-between text-sm text-gray-600">
            <span>
              Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
              {filters.query && ` for "${filters.query}"`}
            </span>
            <span className="text-xs">
              Sorted by {filters.sortBy.replace('_', ' ')}
            </span>
          </div>
        )}

        {/* Location Permission Prompt */}
        {showLocationPermission && enableGeolocation && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FaLocationArrow className="text-blue-500" size={14} />
                <span className="text-sm text-blue-700">
                  Enable location access for personalized search results
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleUseCurrentLocation}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Allow Location
                </button>
                <button
                  onClick={() => setShowLocationPermission(false)}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  <FaTimes size={12} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Filters */}
      {showQuickFilters && (
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-wrap gap-2">
            <select
              value={filters.sortBy}
              onChange={(e) => handleInputChange('sortBy', e.target.value as SearchFilters['sortBy'])}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="relevance">Most Relevant</option>
              <option value="date">Date</option>
              <option value="price_low">Price: Low to High</option>
              <option value="price_high">Price: High to Low</option>
              <option value="rating">Highest Rated</option>
              <option value="popularity">Most Popular</option>
            </select>

            {popularTags.slice(0, 6).map(tag => (
              <button
                key={tag}
                onClick={() => handleTagToggle(tag)}
                className={`px-3 py-1 rounded-full text-sm border ${
                  filters.tags.includes(tag)
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Advanced Filters Panel */}
      {showFilters && showAdvancedFilters && (
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <FaTag className="inline mr-1" size={12} />
                Category
              </label>
              <select
                value={filters.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category._id} value={category._id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Location Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <FaMapMarkerAlt className="inline mr-1" size={12} />
                Location
              </label>
              <select
                value={filters.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Locations</option>
                {locations.map(location => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
              </select>
            </div>

            {/* Event Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Event Type
              </label>
              <select
                value={filters.eventType}
                onChange={(e) => handleInputChange('eventType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Types</option>
                <option value="Event">Event</option>
                <option value="Class">Class</option>
                <option value="Camp">Camp</option>
                <option value="Workshop">Workshop</option>
              </select>
            </div>

            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <FaCalendarAlt className="inline mr-1" size={12} />
                Start Date
              </label>
              <input
                type="date"
                value={filters.dateRange.startDate}
                onChange={(e) => handleNestedChange('dateRange', 'startDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={filters.dateRange.endDate}
                onChange={(e) => handleNestedChange('dateRange', 'endDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Price Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price Range (AED)
              </label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  value={filters.priceRange.min}
                  onChange={(e) => handleNestedChange('priceRange', 'min', Number(e.target.value))}
                  placeholder="Min"
                  className="w-1/2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="number"
                  value={filters.priceRange.max}
                  onChange={(e) => handleNestedChange('priceRange', 'max', Number(e.target.value))}
                  placeholder="Max"
                  className="w-1/2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Age Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Age Range
              </label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  value={filters.ageRange.min}
                  onChange={(e) => handleNestedChange('ageRange', 'min', Number(e.target.value))}
                  placeholder="Min"
                  className="w-1/2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="number"
                  value={filters.ageRange.max}
                  onChange={(e) => handleNestedChange('ageRange', 'max', Number(e.target.value))}
                  placeholder="Max"
                  className="w-1/2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* All Tags */}
            <div className="md:col-span-2 lg:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags
              </label>
              <div className="flex flex-wrap gap-2">
                {popularTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => handleTagToggle(tag)}
                    className={`px-3 py-1 rounded-full text-sm border ${
                      filters.tags.includes(tag)
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Filter Actions */}
          <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
            <button
              onClick={clearFilters}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Clear All Filters
            </button>
            <div className="text-sm text-gray-600">
              {activeFiltersCount} filter{activeFiltersCount !== 1 ? 's' : ''} active
            </div>
          </div>
        </div>
      )}

      {/* Active Filters Tags */}
      {activeFiltersCount > 0 && (
        <div className="p-4">
          <div className="flex flex-wrap gap-2">
            {filters.category && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Category: {categories.find(c => c._id === filters.category)?.name}
                <button
                  onClick={() => clearFilter('category')}
                  className="ml-2 text-blue-600 hover:text-blue-800"
                >
                  <FaTimes size={10} />
                </button>
              </span>
            )}
            
            {filters.location && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Location: {filters.location}
                <button
                  onClick={() => clearFilter('location')}
                  className="ml-2 text-green-600 hover:text-green-800"
                >
                  <FaTimes size={10} />
                </button>
              </span>
            )}
            
            {filters.dateRange.startDate && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                From: {new Date(filters.dateRange.startDate).toLocaleDateString()}
                <button
                  onClick={() => clearFilter('dateRange', 'startDate')}
                  className="ml-2 text-purple-600 hover:text-purple-800"
                >
                  <FaTimes size={10} />
                </button>
              </span>
            )}
            
            {filters.tags.map(tag => (
              <span
                key={tag}
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
              >
                #{tag}
                <button
                  onClick={() => handleTagToggle(tag)}
                  className="ml-2 text-gray-600 hover:text-gray-800"
                >
                  <FaTimes size={10} />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchWithFilters;