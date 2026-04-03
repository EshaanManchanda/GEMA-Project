import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaSearch, FaFilter, FaTimes, FaChevronDown, FaChevronUp, FaMapMarkerAlt, FaCalendarAlt, FaTag, FaDollarSign, FaUsers, FaBuilding, FaStar } from 'react-icons/fa';
import { SearchEvent, SearchFilters, FilterOptions } from '../types/search';
import { useEventsSearchQuery } from '@/hooks/queries/useEventsQuery';
import SEO from '@/components/common/SEO';
import EventCard from '@/components/client/EventCard';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import { toggleFavorite } from '@/store/slices/favoritesSlice';

// Collapsible Filter Section Component
interface CollapsibleSectionProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ title, icon, children, defaultExpanded = false }) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="mb-4 border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          {icon && <span className="text-primary">{icon}</span>}
          <h3 className="font-semibold text-gray-900">{title}</h3>
        </div>
        {isExpanded ? <FaChevronUp className="text-gray-500" /> : <FaChevronDown className="text-gray-500" />}
      </button>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 bg-white">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Dual Range Slider Component
interface DualRangeSliderProps {
  min: number;
  max: number;
  valueMin: number;
  valueMax: number;
  onChange: (min: number, max: number) => void;
  step?: number;
  prefix?: string;
  suffix?: string;
  disabled?: boolean;
}

const DualRangeSlider: React.FC<DualRangeSliderProps> = ({
  min,
  max,
  valueMin,
  valueMax,
  onChange,
  step = 1,
  prefix = '',
  suffix = '',
  disabled = false
}) => {
  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMin = Math.min(Number(e.target.value), valueMax - step);
    onChange(newMin, valueMax);
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMax = Math.max(Number(e.target.value), valueMin + step);
    onChange(valueMin, newMax);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="px-3 py-2 bg-primary bg-opacity-10 rounded-md text-sm font-medium text-primary">
          {prefix}{valueMin}{suffix}
        </div>
        <div className="text-gray-400">-</div>
        <div className="px-3 py-2 bg-primary bg-opacity-10 rounded-md text-sm font-medium text-primary">
          {prefix}{valueMax}{suffix}
        </div>
      </div>
      <div className="relative pt-2">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={valueMin}
          onChange={handleMinChange}
          className="absolute w-full h-2 bg-transparent appearance-none pointer-events-none z-10 slider-thumb"
          style={{
            background: 'transparent',
            WebkitAppearance: 'none'
          }}
          disabled={disabled}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={valueMax}
          onChange={handleMaxChange}
          className="absolute w-full h-2 bg-transparent appearance-none pointer-events-none z-10 slider-thumb"
          style={{
            background: 'transparent',
            WebkitAppearance: 'none'
          }}
          disabled={disabled}
        />
        <div className="relative w-full h-2 bg-gray-200 rounded-full">
          <div
            className="absolute h-2 bg-primary rounded-full"
            style={{
              left: `${((valueMin - min) / (max - min)) * 100}%`,
              right: `${100 - ((valueMax - min) / (max - min)) * 100}%`
            }}
          />
        </div>
      </div>
    </div>
  );
};

// Active Filters Display Component
interface ActiveFiltersProps {
  filters: SearchFilters;
  filterOptions: FilterOptions;
  onRemoveFilter: (key: keyof SearchFilters) => void;
  onClearAll: () => void;
}

const ActiveFilters: React.FC<ActiveFiltersProps> = ({ filters, filterOptions, onRemoveFilter, onClearAll }) => {
  const activeFilters = [];

  if (filters.category) {
    activeFilters.push({ key: 'category', label: 'Category', value: filterOptions.categories.find(c => c.value === filters.category)?.label || filters.category });
  }
  if (filters.type) {
    activeFilters.push({ key: 'type', label: 'Type', value: filterOptions.eventTypes.find(t => t.value === filters.type)?.label || filters.type });
  }
  if (filters.venueType) {
    activeFilters.push({ key: 'venueType', label: 'Venue', value: filterOptions.venueTypes.find(v => v.value === filters.venueType)?.label || filters.venueType });
  }
  if (filters.city) {
    activeFilters.push({ key: 'city', label: 'City', value: filters.city });
  }
  if (filters.minPrice || filters.maxPrice) {
    activeFilters.push({ key: 'minPrice', label: 'Price', value: `${filters.minPrice || 0} - ${filters.maxPrice || filterOptions.priceRange.max} ${filters.currency || 'AED'}` });
  }
  if (filters.ageMin || filters.ageMax) {
    activeFilters.push({ key: 'ageMin', label: 'Age', value: `${filters.ageMin || 0} - ${filters.ageMax || filterOptions.ageRange.max}` });
  }
  if (filters.dateFrom) {
    activeFilters.push({ key: 'dateFrom', label: 'From', value: new Date(filters.dateFrom).toLocaleDateString() });
  }
  if (filters.dateTo) {
    activeFilters.push({ key: 'dateTo', label: 'To', value: new Date(filters.dateTo).toLocaleDateString() });
  }
  if (filters.featured) {
    activeFilters.push({ key: 'featured', label: 'Featured Only', value: 'Yes' });
  }

  if (activeFilters.length === 0) return null;

  return (
    <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900 text-sm">Active Filters ({activeFilters.length})</h3>
        <button
          onClick={onClearAll}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
        >
          <FaTimes size={12} />
          Clear All
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {activeFilters.map((filter) => (
          <span
            key={filter.key}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-blue-300 rounded-full text-sm font-medium text-blue-800 shadow-sm"
          >
            <span className="text-xs text-blue-600">{filter.label}:</span>
            <span>{filter.value}</span>
            <button
              onClick={() => onRemoveFilter(filter.key as keyof SearchFilters)}
              className="hover:bg-blue-100 rounded-full p-0.5 transition-colors"
            >
              <FaTimes size={10} className="text-blue-600" />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
};

// FilterContent Component
interface FilterContentProps {
  filters: SearchFilters;
  pendingFilters: SearchFilters;
  setFilters: React.Dispatch<React.SetStateAction<SearchFilters>>;
  setPendingFilters: React.Dispatch<React.SetStateAction<SearchFilters>>;
  filterOptions: FilterOptions;
  resetFilters: () => void;
  onApply: () => void;
  hasChanges: boolean;
  loading?: boolean;
}

const FilterContent: React.FC<FilterContentProps> = ({
  filters,
  pendingFilters,
  setFilters,
  setPendingFilters,
  filterOptions,
  resetFilters,
  onApply,
  hasChanges,
  loading = false
}) => {

  const handleRemoveFilter = (key: keyof SearchFilters) => {
    const newFilters = { ...filters };
    if (key === 'minPrice') {
      delete newFilters.minPrice;
      delete newFilters.maxPrice;
    } else if (key === 'ageMin') {
      delete newFilters.ageMin;
      delete newFilters.ageMax;
    } else {
      delete newFilters[key];
    }
    setFilters({ ...newFilters, page: 1 });
    setPendingFilters({ ...newFilters, page: 1 });
  };

  // Filter valid options
  const validCategories = filterOptions.categories.filter(c => c.count > 0 && c.value);
  const validEventTypes = filterOptions.eventTypes.filter(t => t.count > 0 && t.value);
  const validVenueTypes = filterOptions.venueTypes.filter(v => v.count > 0 && v.value);
  const validCities = filterOptions.cities.filter(c => c.count > 0 && c.value);
  const validCurrencies = filterOptions.currencies.filter(c => c.count > 0 && c.value);

  return (
    <>
      {/* Active Filters */}
      <ActiveFilters
        filters={filters}
        filterOptions={filterOptions}
        onRemoveFilter={handleRemoveFilter}
        onClearAll={resetFilters}
      />

      {/* Category Filter */}
      {validCategories.length > 0 && (
        <CollapsibleSection title="Category" icon={<FaTag />} defaultExpanded={true}>
          <div className="space-y-2">
            {validCategories.map((category) => (
              <label key={category.value} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-blue-50 cursor-pointer transition-colors group">
                <div className="flex items-center">
                  <input
                    type="radio"
                    name="category"
                    checked={pendingFilters.category === category.value}
                    onChange={() => setPendingFilters({ ...pendingFilters, category: category.value, page: 1 })}
                    className="mr-3 w-4 h-4 accent-primary"
                    disabled={loading}
                  />
                  <span className="capitalize text-gray-700 group-hover:text-gray-900">{category.label}</span>
                </div>
                <span className="text-xs bg-gray-100 group-hover:bg-blue-100 text-gray-600 group-hover:text-blue-700 px-2.5 py-1 rounded-full font-medium transition-colors">
                  {category.count}
                </span>
              </label>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Event Type Filter */}
      {validEventTypes.length > 0 && (
        <CollapsibleSection title="Event Type" icon={<FaCalendarAlt />} defaultExpanded={false}>
          <div className="space-y-2">
            {validEventTypes.map((eventType) => (
              <label key={eventType.value} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-blue-50 cursor-pointer transition-colors group">
                <div className="flex items-center">
                  <input
                    type="radio"
                    name="eventType"
                    checked={pendingFilters.type === eventType.value}
                    onChange={() => setPendingFilters({ ...pendingFilters, type: eventType.value, page: 1 })}
                    className="mr-3 w-4 h-4 accent-primary"
                    disabled={loading}
                  />
                  <span className="text-gray-700 group-hover:text-gray-900">{eventType.label}</span>
                </div>
                <span className="text-xs bg-gray-100 group-hover:bg-blue-100 text-gray-600 group-hover:text-blue-700 px-2.5 py-1 rounded-full font-medium transition-colors">
                  {eventType.count}
                </span>
              </label>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Venue Type Filter */}
      {validVenueTypes.length > 0 && (
        <CollapsibleSection title="Venue Type" icon={<FaBuilding />} defaultExpanded={false}>
          <div className="space-y-2">
            {validVenueTypes.map((venueType) => (
              <label key={venueType.value} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-blue-50 cursor-pointer transition-colors group">
                <div className="flex items-center">
                  <input
                    type="radio"
                    name="venueType"
                    checked={pendingFilters.venueType === venueType.value}
                    onChange={() => setPendingFilters({ ...pendingFilters, venueType: venueType.value, page: 1 })}
                    className="mr-3 w-4 h-4 accent-primary"
                    disabled={loading}
                  />
                  <span className="text-gray-700 group-hover:text-gray-900">{venueType.label}</span>
                </div>
                <span className="text-xs bg-gray-100 group-hover:bg-blue-100 text-gray-600 group-hover:text-blue-700 px-2.5 py-1 rounded-full font-medium transition-colors">
                  {venueType.count}
                </span>
              </label>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* City Filter */}
      {validCities.length > 0 && (
        <CollapsibleSection title="City" icon={<FaMapMarkerAlt />} defaultExpanded={false}>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {validCities.slice(0, 10).map((city) => (
              <label key={city.value} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-blue-50 cursor-pointer transition-colors group">
                <div className="flex items-center">
                  <input
                    type="radio"
                    name="city"
                    checked={pendingFilters.city === city.value}
                    onChange={() => setPendingFilters({ ...pendingFilters, city: city.value, page: 1 })}
                    className="mr-3 w-4 h-4 accent-primary"
                    disabled={loading}
                  />
                  <span className="text-gray-700 group-hover:text-gray-900">{city.label}</span>
                </div>
                <span className="text-xs bg-gray-100 group-hover:bg-blue-100 text-gray-600 group-hover:text-blue-700 px-2.5 py-1 rounded-full font-medium transition-colors">
                  {city.count}
                </span>
              </label>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Price Range Filter */}
      <CollapsibleSection title="Price Range" icon={<FaDollarSign />} defaultExpanded={true}>
        <div className="space-y-2">
          {/* Currency Selector */}
          {validCurrencies.length > 0 && (
            <select
              value={pendingFilters.currency || ''}
              onChange={(e) => setPendingFilters({ ...pendingFilters, currency: e.target.value, page: 1 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white text-gray-900 mb-3"
              disabled={loading}
            >
              <option value="">All Currencies</option>
              {validCurrencies.map((currency) => (
                <option key={currency.value} value={currency.value}>
                  {currency.label} ({currency.count})
                </option>
              ))}
            </select>
          )}

          {/* Dual Range Slider */}
          <DualRangeSlider
            min={filterOptions.priceRange.min}
            max={filterOptions.priceRange.max}
            valueMin={pendingFilters.minPrice || filterOptions.priceRange.min}
            valueMax={pendingFilters.maxPrice || filterOptions.priceRange.max}
            onChange={(min, max) => setPendingFilters({ ...pendingFilters, minPrice: min, maxPrice: max, page: 1 })}
            step={10}
            suffix={` ${pendingFilters.currency || 'AED'}`}
            disabled={loading}
          />
        </div>
      </CollapsibleSection>

      {/* Age Range Filter */}
      <CollapsibleSection title="Age Range" icon={<FaUsers />} defaultExpanded={false}>
        <DualRangeSlider
          min={filterOptions.ageRange.min}
          max={filterOptions.ageRange.max}
          valueMin={pendingFilters.ageMin || filterOptions.ageRange.min}
          valueMax={pendingFilters.ageMax || filterOptions.ageRange.max}
          onChange={(min, max) => setPendingFilters({ ...pendingFilters, ageMin: min, ageMax: max, page: 1 })}
          step={1}
          suffix=" yrs"
          disabled={loading}
        />
      </CollapsibleSection>

      {/* Date Range Filter */}
      <CollapsibleSection title="Date Range" icon={<FaCalendarAlt />} defaultExpanded={false}>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">From</label>
            <input
              type="date"
              value={pendingFilters.dateFrom || ''}
              onChange={(e) => setPendingFilters({ ...pendingFilters, dateFrom: e.target.value, page: 1 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white text-gray-900"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">To</label>
            <input
              type="date"
              value={pendingFilters.dateTo || ''}
              onChange={(e) => setPendingFilters({ ...pendingFilters, dateTo: e.target.value, page: 1 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white text-gray-900"
              disabled={loading}
            />
          </div>
        </div>
      </CollapsibleSection>

      {/* Featured Events Filter */}
      <CollapsibleSection title="Special Filters" icon={<FaStar />} defaultExpanded={false}>
        <label className="flex items-center py-2 px-3 rounded-lg hover:bg-blue-50 cursor-pointer transition-colors">
          <input
            type="checkbox"
            checked={pendingFilters.featured || false}
            onChange={(e) => setPendingFilters({
              ...pendingFilters,
              featured: e.target.checked ? true : undefined,
              page: 1
            })}
            className="mr-3 w-4 h-4 accent-primary"
            disabled={loading}
          />
          <span className="text-gray-700">Featured Events Only</span>
        </label>
      </CollapsibleSection>

      {/* Sort Options for Mobile */}
      <div className="mb-6 md:hidden">
        <h3 className="font-medium mb-3">Sort By</h3>
        <select
          value={`${pendingFilters.sortBy || 'createdAt'}-${pendingFilters.sortOrder || 'desc'}`}
          onChange={(e) => {
            const [sortBy, sortOrder] = e.target.value.split('-');
            setPendingFilters({ ...pendingFilters, sortBy, sortOrder: sortOrder as 'asc' | 'desc', page: 1 });
          }}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white text-gray-900"
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

      {/* Apply / Reset buttons */}
      <div className="flex flex-col gap-2 mt-4">
        <button
          onClick={onApply}
          disabled={!hasChanges || loading}
          className="w-full px-4 py-3 bg-primary text-white rounded-lg font-medium
                     hover:bg-primary-dark transition-all disabled:opacity-50
                     disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          Apply Filters
          {hasChanges && <span className="bg-white/20 text-xs px-2 py-0.5 rounded-full">!</span>}
        </button>
        <button
          onClick={resetFilters}
          className="w-full px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white
                     rounded-lg hover:from-red-600 hover:to-red-700 transition-all shadow-md
                     flex items-center justify-center gap-2 font-medium"
          disabled={loading}
        >
          <FaTimes className="w-4 h-4" />
          Reset All
        </button>
      </div>
    </>
  );
};

/** Decode common HTML entities in category/filter labels */
const decodeHTMLEntities = (str: string): string => {
  const entities: Record<string, string> = {
    '&amp;': '&', '&lt;': '<', '&gt;': '>',
    '&quot;': '"', '&#39;': "'", '&Amp;': '&',
  };
  return str.replace(
    /&(?:amp|lt|gt|quot|#39|Amp);/gi,
    (match) => entities[match] || match
  );
};

const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const dispatch = useDispatch<AppDispatch>();
  const favoriteItems = useSelector((state: RootState) => state.favorites.items);

  const handleToggleFavorite = useCallback((eventId: string) => {
    dispatch(toggleFavorite(eventId));
  }, [dispatch]);
  const query = searchParams.get('q') || '';
  const [searchInput, setSearchInput] = useState<string>(query);
  const [showFilters, setShowFilters] = useState<boolean>(false);

  // Debounced search query state (for TanStack Query)
  const [debouncedQuery, setDebouncedQuery] = useState<string>(query);

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

  // Pending filters: what's shown in filter UI (changes on every checkbox/radio/slider)
  // Only applied to the API when Apply is clicked
  const [pendingFilters, setPendingFilters] = useState<SearchFilters>(() => ({
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
  }));

  // Debounced search query update (300ms delay) - reacts to URL param changes
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => clearTimeout(handler);
  }, [query]);

  // Live search: update URL when user types (debounced 500ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      const params = new URLSearchParams(searchParamsRef.current);
      if (searchInput.trim()) {
        params.set('q', searchInput.trim());
      } else {
        params.delete('q');
      }
      // Guard: skip if URL hasn't actually changed (prevents spurious re-renders)
      if (params.toString() === searchParamsRef.current.toString()) return;
      setSearchParams(params, { replace: true });
    }, 500);

    return () => clearTimeout(handler);
  }, [searchInput]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync input box when URL q param changes externally (browser back/forward, link click)
  // Guard: only update if value actually differs (prevents retriggering live-search debounce)
  useEffect(() => {
    if (searchInput !== query) {
      setSearchInput(query);
    }
  }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  // Prepare API parameters from filters
  const searchParams_API = useMemo(() => {
    const params: any = {
      limit: filters.limit || 12,
      page: filters.page || 1,
      sortBy: filters.sortBy || 'createdAt',
      sortOrder: filters.sortOrder || 'desc'
    };

    // Add filters
    if (filters.category) params.category = filters.category;
    if (filters.type) params.type = filters.type;
    if (filters.venueType) params.venueType = filters.venueType;
    if (filters.city) params.city = filters.city;
    if (filters.minPrice !== undefined) params.minPrice = filters.minPrice;
    if (filters.maxPrice !== undefined) params.maxPrice = filters.maxPrice;
    if (filters.currency) params.currency = filters.currency;
    if (filters.ageMin !== undefined) params.ageMin = filters.ageMin;
    if (filters.ageMax !== undefined) params.ageMax = filters.ageMax;
    if (filters.featured !== undefined) params.featured = filters.featured.toString();
    if (filters.dateFrom) params.dateFrom = filters.dateFrom;
    if (filters.dateTo) params.dateTo = filters.dateTo;

    return params;
  }, [filters]);

  // TanStack Query replaces manual fetch + debounce logic
  const { data: searchData, isLoading: loading, error: queryError } = useEventsSearchQuery(
    debouncedQuery,
    searchParams_API
  );

  // Extract events and pagination from query response
  const events = useMemo(() => searchData?.events || [], [searchData]);
  const pagination = searchData?.pagination || null;
  const error = queryError ? 'Failed to load search results. Please try again.' : null;

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
        label: value === '' ? 'All Categories' : decodeHTMLEntities(value),
        value,
        count
      })),
      cities: Array.from(cities.entries()).map(([value, count]) => ({
        label: value === '' ? 'All Cities' : decodeHTMLEntities(value),
        value,
        count
      })),
      eventTypes: Array.from(eventTypes.entries()).map(([value, count]) => ({
        label: value === '' ? 'All Types' : decodeHTMLEntities(value),
        value,
        count
      })),
      venueTypes: Array.from(venueTypes.entries()).map(([value, count]) => ({
        label: value === '' ? 'All Venues' : decodeHTMLEntities(value),
        value,
        count
      })),
      currencies: Array.from(currencies.entries()).map(([value, count]) => ({
        label: value === '' ? 'All Currencies' : decodeHTMLEntities(value),
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

  // Update filter options when events change
  useEffect(() => {
    if (events.length > 0) {
      updateFilterOptions(events);
    }
  }, [events, updateFilterOptions]);

  // Update URL params when filters change
  // searchParams ref prevents the effect from depending on searchParams (would cause a loop:
  // effect fires → setSearchParams → searchParams changes → effect fires again)
  const searchParamsRef = useRef(searchParams);
  searchParamsRef.current = searchParams;

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

    // Guard: skip if URL string is already identical — prevents feedback loops
    if (params.toString() === searchParamsRef.current.toString()) return;

    setSearchParams(params, { replace: true });
  }, [filters, query]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle search submission
  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const params = new URLSearchParams(searchParams);
    if (searchInput.trim()) {
      params.set('q', searchInput.trim());
    } else {
      params.delete('q');
    }
    setSearchParams(params, { replace: false });
  };

  // Reset filters function
  const resetFilters = useCallback(() => {
    const defaults: SearchFilters = { sortBy: 'createdAt', sortOrder: 'desc', page: 1, limit: 12 };
    setFilters(defaults);
    setPendingFilters(defaults);
  }, []);

  // Handle pagination
  const handlePageChange = useCallback((newPage: number) => {
    setFilters(prev => ({ ...prev, page: newPage }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const hasChanges = useMemo(
    () => JSON.stringify(pendingFilters) !== JSON.stringify(filters),
    [pendingFilters, filters]
  );

  const onApply = useCallback(() => {
    setFilters({ ...pendingFilters, page: 1 });
  }, [pendingFilters]);

  const isInitialLoad = loading && !searchData;

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
      <div className="min-h-screen bg-gray-50 pt-1">
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
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white text-gray-900"
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

          {isInitialLoad ? (
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
          ) : null}

          {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-r-lg" role="alert">
              <p className="font-bold">Error</p>
              <p>{error}</p>
            </div>
          )}

          {!isInitialLoad && (<>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-lg sm:text-2xl font-bold mb-1 line-clamp-1">
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
                  setPendingFilters(prev => ({ ...prev, sortBy, sortOrder: sortOrder as 'asc' | 'desc', page: 1 }));
                }}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white text-gray-900"
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
                        pendingFilters={pendingFilters}
                        setFilters={setFilters}
                        setPendingFilters={setPendingFilters}
                        filterOptions={filterOptions}
                        resetFilters={resetFilters}
                        onApply={onApply}
                        hasChanges={hasChanges}
                        loading={loading}
                      />
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Desktop Filters Sidebar */}
            <div className="hidden lg:block lg:col-span-1">
              <div className="bg-white p-6 rounded-lg shadow-sm sticky top-24 text-gray-900">
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
                  pendingFilters={pendingFilters}
                  setFilters={setFilters}
                  setPendingFilters={setPendingFilters}
                  filterOptions={filterOptions}
                  resetFilters={resetFilters}
                  onApply={onApply}
                  hasChanges={hasChanges}
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
                  <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 mb-8">
                    {events.map((event: SearchEvent) => (
                      <motion.div
                        key={event._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <EventCard
                          _id={event._id}
                          id={event._id}
                          slug={event.slug}
                          title={event.title}
                          description={event.description}
                          images={event.images}
                          image={event.images?.[0]}
                          price={event.price}
                          currency={event.currency}
                          location={event.location}
                          category={event.category}
                          ageRange={event.ageRange}
                          dateSchedule={event.dateSchedule}
                          isFeatured={event.isFeatured}
                          viewsCount={event.viewsCount}
                          rating={event.rating}
                          reviewsCount={event.reviewsCount}
                          vendorId={event.vendorId}
                          variant="overlay"
                          showPrice={false}
                          showLocation={false}
                          showDate={false}
                          showTime={false}
                          showDescription={false}
                          showStats={false}
                          showCategory={false}
                          showVendor={false}
                          showAgeGroup={false}
                          showFeaturedBadge={true}
                          isInWishlist={favoriteItems.some(fav => fav._id === event._id)}
                          onWishlistToggle={handleToggleFavorite}
                        />
                      </motion.div>
                    ))}
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
                              className={`px-4 py-2 rounded-lg ${page === pagination.currentPage
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
          </>)}
        </div>
      </div>
    </>
  );
};

export default SearchPage;