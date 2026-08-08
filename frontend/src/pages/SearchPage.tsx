import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaSearch, FaTimes, FaChevronDown, FaMapMarkerAlt, FaCalendarAlt,
  FaDollarSign, FaUsers, FaBuilding, FaStar, FaFilter, FaSlidersH, FaTag
} from 'react-icons/fa';
import { SearchEvent, SearchFilters, FilterOptions } from '../types/search';
import { useEventsSearchQuery } from '@/hooks/queries/useEventsQuery';
import { useCategoriesQuery } from '@/hooks/queries/useCategoriesQuery';
import { useQuery } from '@tanstack/react-query';
import eventsAPI from '@/services/api/eventsAPI';
import SEO from '@/components/common/SEO';
import EventCard from '@/components/client/EventCard';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import { toggleFavorite } from '@/store/slices/favoritesSlice';

// ── Dual Range Slider ─────────────────────────────────────────────────────────
interface DualRangeSliderProps {
  min: number; max: number; valueMin: number; valueMax: number;
  onChange: (min: number, max: number) => void;
  step?: number; suffix?: string;
}
const DualRangeSlider: React.FC<DualRangeSliderProps> = ({
  min, max, valueMin, valueMax, onChange, step = 1, suffix = ''
}) => (
  <div className="space-y-3">
    <div className="flex items-center justify-between">
      <span className="px-2 py-1 bg-indigo-50 rounded text-xs font-semibold text-indigo-700">{valueMin}{suffix}</span>
      <span className="text-gray-400 text-xs">to</span>
      <span className="px-2 py-1 bg-indigo-50 rounded text-xs font-semibold text-indigo-700">{valueMax}{suffix}</span>
    </div>
    <div className="relative h-6">
      <input type="range" min={min} max={max} step={step} value={valueMin}
        onChange={e => onChange(Math.min(Number(e.target.value), valueMax - step), valueMax)}
        className="absolute w-full h-2 top-2 bg-transparent appearance-none pointer-events-none z-10 [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-indigo-600 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:bg-indigo-600 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:cursor-pointer" />
      <input type="range" min={min} max={max} step={step} value={valueMax}
        onChange={e => onChange(valueMin, Math.max(Number(e.target.value), valueMin + step))}
        className="absolute w-full h-2 top-2 bg-transparent appearance-none pointer-events-none z-10 [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-indigo-600 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:bg-indigo-600 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:cursor-pointer" />
      <div className="absolute w-full h-2 top-2 bg-gray-200 rounded-full">
        <div className="absolute h-2 bg-indigo-500 rounded-full"
          style={{ left: `${((valueMin - min) / (max - min)) * 100}%`, right: `${100 - ((valueMax - min) / (max - min)) * 100}%` }} />
      </div>
    </div>
  </div>
);

// ── Outschool-style Dropdown ─────────────────────────────────────────────────
interface OutschoolDropdownProps {
  label: string;
  icon?: React.ReactNode;
  active?: boolean;
  title: string;
  description?: string;
  ctaLabel?: string;
  onCtaClick?: () => void;
  children: React.ReactNode;
}
const OutschoolDropdown: React.FC<OutschoolDropdownProps> = ({
  label, icon, active, title, description, ctaLabel, onCtaClick, children
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-2 px-5 py-2.5 rounded-full border text-sm font-semibold transition-all whitespace-nowrap select-none shadow-sm ${active
          ? 'bg-indigo-600 text-white border-indigo-600'
          : 'bg-white text-gray-800 border-gray-400 hover:border-gray-500 hover:bg-gray-50'
          }`}
      >
        {icon && <span className="text-sm">{icon}</span>}
        {label}
        <FaChevronDown className={`text-xs transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full mt-2 left-0 z-50 bg-white rounded-2xl shadow-2xl border border-gray-100 w-72"
            style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.14)' }}
          >
            {/* Header */}
            <div className="px-5 pt-5 pb-3">
              <h3 className="text-lg font-bold text-gray-900">{title}</h3>
              {description && <p className="text-sm text-gray-500 mt-1 leading-snug">{description}</p>}
            </div>

            {/* Content */}
            <div className="px-5 pb-3 max-h-64 overflow-y-auto">
              {children}
            </div>

            {/* CTA button */}
            {ctaLabel && (
              <div className="px-5 pb-5">
                <button
                  onClick={() => { onCtaClick?.(); setOpen(false); }}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-semibold text-sm transition-colors"
                >
                  {ctaLabel}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Active chip ───────────────────────────────────────────────────────────────
const ActiveChip: React.FC<{ label: string; onRemove: () => void }> = ({ label, onRemove }) => (
  <span className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1 bg-indigo-50 border border-indigo-200 text-indigo-800 rounded-full text-xs font-medium">
    {label}
    <button onClick={onRemove} className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-indigo-200 transition-colors">
      <FaTimes size={9} />
    </button>
  </span>
);

// ── Checkbox row ──────────────────────────────────────────────────────────────
const CheckRow: React.FC<{ label: string; checked: boolean; onChange: () => void }> = ({ label, checked, onChange }) => (
  <label className="flex items-center gap-3 py-2 cursor-pointer hover:text-indigo-700 group" onClick={(e) => { e.preventDefault(); onChange(); }}>
    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${checked ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 group-hover:border-indigo-400'
      }`}>
      {checked && <svg viewBox="0 0 10 8" className="w-2.5 h-2 text-white fill-current"><path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>}
    </div>
    <span className="text-sm text-gray-700 group-hover:text-gray-900">{label}</span>
  </label>
);

// ── Radio row ─────────────────────────────────────────────────────────────────
const RadioRow: React.FC<{ label: string; checked: boolean; onChange: () => void }> = ({ label, checked, onChange }) => (
  <label className="flex items-center gap-3 py-2 cursor-pointer hover:text-indigo-700 group" onClick={(e) => { e.preventDefault(); onChange(); }}>
    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${checked ? 'border-indigo-600' : 'border-gray-300 group-hover:border-indigo-400'
      }`}>
      {checked && <div className="w-2 h-2 rounded-full bg-indigo-600" />}
    </div>
    <span className="text-sm text-gray-700 group-hover:text-gray-900">{label}</span>
  </label>
);

// ── Main SearchPage ───────────────────────────────────────────────────────────
const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const dispatch = useDispatch<AppDispatch>();
  const favoriteItems = useSelector((state: RootState) => state.favorites.items);
  const handleToggleFavorite = useCallback((id: string) => { dispatch(toggleFavorite(id)); }, [dispatch]);

  const query = searchParams.get('q') || '';
  const [searchInput, setSearchInput] = useState<string>(query);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Search state inside category dropdown
  const [catSearch, setCatSearch] = useState('');

  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    categories: [{ label: 'All', value: '', count: 0 }],
    cities: [{ label: 'All Cities', value: '', count: 0 }],
    eventTypes: [
      { label: 'All Types', value: '', count: 0 },
      { label: 'Olympiad', value: 'Olympiad', count: 0 },
      { label: 'Championship', value: 'Championship', count: 0 },
      { label: 'Competition', value: 'Competition', count: 0 },
      { label: 'Event', value: 'Event', count: 0 },
      { label: 'Course', value: 'Course', count: 0 },
      { label: 'Venue', value: 'Venue', count: 0 },
      { label: 'Workshop', value: 'Workshop', count: 0 },
      { label: 'Class', value: 'Class', count: 0 },
      { label: 'Bootcamp', value: 'Bootcamp', count: 0 },
      { label: 'Masterclass', value: 'Masterclass', count: 0 },
    ],
    venueTypes: [
      { label: 'All Venues', value: '', count: 0 },
      { label: 'Indoor', value: 'Indoor', count: 0 },
      { label: 'Outdoor', value: 'Outdoor', count: 0 },
      { label: 'Online', value: 'Online', count: 0 },
      { label: 'Offline', value: 'Offline', count: 0 },
    ],
    currencies: [
      { label: 'All Currencies', value: '', count: 0 },
      { label: 'AED', value: 'AED', count: 0 },
      { label: 'EGP', value: 'EGP', count: 0 },
      { label: 'CAD', value: 'CAD', count: 0 },
      { label: 'USD', value: 'USD', count: 0 },
    ],
    priceRange: { min: 0, max: 3000 },
    ageRange: { min: 3, max: 50 },
  });

  const { data: categoriesData } = useCategoriesQuery({ tree: false });
  const { data: citiesData } = useQuery({
    queryKey: ['cities'],
    queryFn: () => eventsAPI.getUniqueCities(),
    staleTime: 30 * 60 * 1000,
  });

  useEffect(() => {
    if (categoriesData) {
      setFilterOptions(prev => ({
        ...prev,
        categories: [
          { label: 'All Categories', value: '', count: 0 },
          ...(categoriesData || []).map((cat: any) => ({ label: cat.name, value: cat.slug, count: cat.eventCount || 0 })),
        ],
      }));
    }
  }, [categoriesData]);

  useEffect(() => {
    if (citiesData?.cities) {
      setFilterOptions(prev => ({
        ...prev,
        cities: [
          { label: 'All Cities', value: '', count: 0 },
          ...(citiesData.cities || []).map((city: string) => ({ label: city, value: city, count: 0 })),
        ],
      }));
    }
  }, [citiesData]);

  const [filters, setFilters] = useState<SearchFilters>(() => ({
    category: searchParams.get('category') ? searchParams.get('category')?.split(',') : undefined,
    type: searchParams.get('type') ? searchParams.get('type')?.split(',') : undefined,
    venueType: searchParams.get('venueType') ? searchParams.get('venueType')?.split(',') : undefined,
    city: searchParams.get('city') ? searchParams.get('city')?.split(',') : undefined,
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
    limit: 24,
  }));

  const [pendingPrice, setPendingPrice] = useState<[number, number]>([filters.minPrice ?? 0, filters.maxPrice ?? 3000]);
  const [pendingAge, setPendingAge] = useState<[number, number]>([filters.ageMin ?? 3, filters.ageMax ?? 50]);
  const [pendingDateFrom, setPendingDateFrom] = useState(filters.dateFrom || '');
  const [pendingDateTo, setPendingDateTo] = useState(filters.dateTo || '');

  const [pendingCategory, setPendingCategory] = useState<string[]>(filters.category || []);
  const [pendingType, setPendingType] = useState<string[]>(filters.type || []);
  const [pendingVenueType, setPendingVenueType] = useState<string[]>(filters.venueType || []);
  const [pendingCity, setPendingCity] = useState<string[]>(filters.city || []);

  useEffect(() => {
    setPendingCategory(filters.category || []);
    setPendingType(filters.type || []);
    setPendingVenueType(filters.venueType || []);
    setPendingCity(filters.city || []);
  }, [filters.category, filters.type, filters.venueType, filters.city]);

  useEffect(() => { if (searchInput !== query) setSearchInput(query); }, [query]); // eslint-disable-line

  const searchParams_API = useMemo(() => {
    const p: any = {
      limit: 24, page: filters.page || 1,
      sortBy: filters.sortBy || 'createdAt', sortOrder: filters.sortOrder || 'desc',
    };
    if (filters.category?.length) p.category = filters.category.join(',');
    if (filters.type?.length) p.type = filters.type.join(',');
    if (filters.venueType?.length) p.venueType = filters.venueType.join(',');
    if (filters.city?.length) p.city = filters.city.join(',');
    if (filters.minPrice !== undefined) p.minPrice = filters.minPrice;
    if (filters.maxPrice !== undefined) p.maxPrice = filters.maxPrice;
    if (filters.currency) p.currency = filters.currency;
    if (filters.ageMin !== undefined) p.ageMin = filters.ageMin;
    if (filters.ageMax !== undefined) p.ageMax = filters.ageMax;
    if (filters.featured !== undefined) p.featured = filters.featured.toString();
    if (filters.dateFrom) p.dateFrom = filters.dateFrom;
    if (filters.dateTo) p.dateTo = filters.dateTo;
    return p;
  }, [filters]);

  const { data: searchData, isLoading: loading, error: queryError } = useEventsSearchQuery(query, searchParams_API);
  const events = useMemo(() => searchData?.events || [], [searchData]);
  const pagination = searchData?.pagination || null;
  const error = queryError ? 'Failed to load search results. Please try again.' : null;

  const searchParamsRef = useRef(searchParams);
  searchParamsRef.current = searchParams;

  useEffect(() => {
    const p = new URLSearchParams();
    if (query) p.set('q', query);
    if (filters.category?.length) p.set('category', filters.category.join(','));
    if (filters.type?.length) p.set('type', filters.type.join(','));
    if (filters.venueType?.length) p.set('venueType', filters.venueType.join(','));
    if (filters.city?.length) p.set('city', filters.city.join(','));
    if (filters.minPrice !== undefined) p.set('minPrice', filters.minPrice.toString());
    if (filters.maxPrice !== undefined) p.set('maxPrice', filters.maxPrice.toString());
    if (filters.currency) p.set('currency', filters.currency);
    if (filters.ageMin !== undefined) p.set('ageMin', filters.ageMin.toString());
    if (filters.ageMax !== undefined) p.set('ageMax', filters.ageMax.toString());
    if (filters.featured) p.set('featured', 'true');
    if (filters.dateFrom) p.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) p.set('dateTo', filters.dateTo);
    if (filters.sortBy && filters.sortBy !== 'createdAt') p.set('sortBy', filters.sortBy);
    if (filters.sortOrder && filters.sortOrder !== 'desc') p.set('sortOrder', filters.sortOrder);
    if (filters.page && filters.page !== 1) p.set('page', filters.page.toString());
    if (p.toString() === searchParamsRef.current.toString()) return;
    setSearchParams(p, { replace: true });
  }, [filters, query]); // eslint-disable-line

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const p = new URLSearchParams(searchParams);
    if (searchInput.trim()) p.set('q', searchInput.trim()); else p.delete('q');
    p.set('page', '1');
    setSearchParams(p, { replace: false });
  };

  const resetFilters = useCallback(() => {
    const d: SearchFilters = { sortBy: 'createdAt', sortOrder: 'desc', page: 1, limit: 18 };
    setFilters(d);
    setPendingPrice([0, 3000]);
    setPendingAge([0, 18]);
    setPendingDateFrom('');
    setPendingDateTo('');
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setFilters(prev => ({ ...prev, page: newPage }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const isInitialLoad = loading && !searchData;
  const searchQuery = searchParams.get('q') || '';

  const activeCount = [
    filters.category?.length ? '1' : undefined,
    filters.type?.length ? '1' : undefined,
    filters.venueType?.length ? '1' : undefined,
    (filters.minPrice !== undefined || filters.maxPrice !== undefined) ? '1' : undefined,
    (filters.ageMin !== undefined || filters.ageMax !== undefined) ? '1' : undefined,
    filters.dateFrom, filters.dateTo,
    filters.featured ? '1' : undefined,
  ].filter(Boolean).length;

  const breadcrumbs = [
    { name: 'Home', url: '/' },
    { name: 'Search', url: '/search' },
    ...(searchQuery ? [{ name: `Results for "${searchQuery}"`, url: `/search?q=${searchQuery}` }] : []),
  ];

  // Filtered categories for the category dropdown search
  const filteredCats = useMemo(() =>
    filterOptions.categories.filter(c =>
      !catSearch || c.label.toLowerCase().includes(catSearch.toLowerCase())
    ),
    [filterOptions.categories, catSearch]
  );

  const toggleFilterArray = useCallback((key: keyof SearchFilters, value: string) => {
    setFilters(prev => {
      const current = (prev[key] as string[]) || [];
      let next;
      if (!value) next = undefined;
      else if (current.includes(value)) next = current.filter(v => v !== value);
      else next = [...current, value];

      if (next && next.length === 0) next = undefined;
      return { ...prev, [key]: next, page: 1 };
    });
  }, []);

  const togglePendingArray = useCallback((setState: React.Dispatch<React.SetStateAction<string[]>>, value: string) => {
    setState(prev => {
      if (!value) return [];
      if (prev.includes(value)) return prev.filter(v => v !== value);
      return [...prev, value];
    });
  }, []);

  // Current category label
  const currentCatLabel = useMemo(() => {
    if (!filters.category?.length) return 'Category';
    if (filters.category.length === 1) {
      return filterOptions.categories.find(c => c.value === filters.category![0])?.label || 'Category';
    }
    return `${filters.category.length} Categories`;
  }, [filters.category, filterOptions.categories]);

  const typeLabel = useMemo(() => {
    if (!filters.type?.length) return 'Event Type';
    if (filters.type.length === 1) return filters.type[0];
    return `${filters.type.length} Types`;
  }, [filters.type]);

  const venueTypeLabel = useMemo(() => {
    if (!filters.venueType?.length) return 'Venue';
    if (filters.venueType.length === 1) return filters.venueType[0];
    return `${filters.venueType.length} Venues`;
  }, [filters.venueType]);

  const cityLabel = useMemo(() => {
    if (!filters.city?.length) return 'City';
    if (filters.city.length === 1) return filters.city[0];
    return `${filters.city.length} Cities`;
  }, [filters.city]);

  const priceLabel = filters.minPrice !== undefined || filters.maxPrice !== undefined
    ? `${filters.minPrice ?? 0}–${filters.maxPrice ?? 3000} ${filters.currency || 'AED'}` : 'Price';

  const ageLabel = filters.ageMin !== undefined || filters.ageMax !== undefined
    ? `${filters.ageMin ?? 0}–${filters.ageMax ?? 18} yrs` : 'Age';

  const dateLabel = filters.dateFrom ? `From ${filters.dateFrom}` : 'Date';

  // Pagination page numbers to show
  const pageNumbers = useMemo(() => {
    if (!pagination) return [];
    const total = pagination.totalPages;
    const current = pagination.currentPage;
    const delta = 2;
    const range: number[] = [];
    const rangeWithDots: (number | '...')[] = [];
    for (let i = Math.max(2, current - delta); i <= Math.min(total - 1, current + delta); i++) range.push(i);
    if (current - delta > 2) rangeWithDots.push(1, '...');
    else rangeWithDots.push(1);
    rangeWithDots.push(...range);
    if (current + delta < total - 1) rangeWithDots.push('...', total);
    else if (total > 1) rangeWithDots.push(total);
    return rangeWithDots;
  }, [pagination]);

  return (
    <>
      <SEO
        title={searchQuery ? `Search Results for "${searchQuery}" | Gema Events` : 'Search Kids Activities & Events | Gema Events'}
        description="Search for the perfect kids activities and events in the UAE. Filter by age, location, category, and more."
        keywords={['search', 'kids activities', 'events', 'UAE', searchQuery].filter(Boolean)}
        breadcrumbs={breadcrumbs}
        noIndex={!!searchQuery}
      />

      <div className="min-h-screen bg-gray-50">

        {/* ── Sticky filter bar ─────────────────────────────────────────────── */}
        <div className="bg-white border-b border-gray-200 sticky z-30 shadow-sm transition-all" style={{ top: 'var(--main-padding-top, 72px)' }}>
          <div className="container mx-auto px-4 pt-10 pb-8">

            {/* Search bar — oval Outschool style, slightly offset from top */}
            <div className="mb-5">
              <form onSubmit={handleSearch} className="flex items-center gap-3 max-w-6xl mx-auto">
                <div className="relative flex-grow">
                  <FaSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 text-lg" />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={e => setSearchInput(e.target.value)}
                    placeholder="Search for events, workshops, activities..."
                    className="w-full pl-14 pr-6 py-4 border border-gray-400 rounded-full focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white text-gray-900 text-base shadow-sm transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  className="text-white px-8 py-4 rounded-full text-base font-bold shadow-md shrink-0 transition-opacity hover:opacity-90"
                  style={{ backgroundColor: 'var(--primary-color)' }}
                >
                  Search
                </button>
                {/* Mobile filters toggle */}
                <button
                  type="button"
                  onClick={() => setShowMobileFilters(true)}
                  className="md:hidden flex items-center gap-1.5 px-4 py-3.5 bg-gray-100 text-gray-700 rounded-full text-sm font-medium shrink-0 relative"
                >
                  <FaSlidersH />
                  {activeCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-600 text-white text-xs rounded-full flex items-center justify-center font-bold">
                      {activeCount}
                    </span>
                  )}
                </button>
              </form>
            </div>

            {/* Filter pill row — Outschool style */}
            <div className="hidden md:flex items-center gap-2 flex-wrap max-w-6xl mx-auto w-full">

              {/* Category dropdown */}
              <OutschoolDropdown
                label={currentCatLabel}
                icon={<FaTag />}
                active={!!filters.category?.length}
                title="Category"
                description="Browse by activity type to find the perfect experience."
                ctaLabel="Apply"
                onCtaClick={() => setFilters(prev => ({ ...prev, category: pendingCategory.length ? pendingCategory : undefined, page: 1 }))}
              >
                <div className="mb-3">
                  <input
                    type="text"
                    placeholder="Search categories..."
                    value={catSearch}
                    onChange={e => setCatSearch(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-400 bg-gray-50"
                  />
                </div>
                <div className="divide-y divide-gray-50">
                  {filteredCats.map(cat => (
                    <CheckRow
                      key={cat.value}
                      label={cat.label}
                      checked={pendingCategory.includes(cat.value) || (pendingCategory.length === 0 && !cat.value)}
                      onChange={() => togglePendingArray(setPendingCategory, cat.value)}
                    />
                  ))}
                </div>
              </OutschoolDropdown>

              {/* Event Type */}
              <OutschoolDropdown
                label={typeLabel}
                icon={<FaCalendarAlt />}
                active={!!filters.type?.length}
                title="Event Type"
                description="Filter by the format of the activity."
                ctaLabel="Apply"
                onCtaClick={() => setFilters(prev => ({ ...prev, type: pendingType.length ? pendingType : undefined, page: 1 }))}
              >
                <div className="divide-y divide-gray-50">
                  {filterOptions.eventTypes.map(et => (
                    <CheckRow
                      key={et.value}
                      label={et.label || 'All Types'}
                      checked={pendingType.includes(et.value) || (pendingType.length === 0 && !et.value)}
                      onChange={() => togglePendingArray(setPendingType, et.value)}
                    />
                  ))}
                </div>
              </OutschoolDropdown>

              {/* Venue Type */}
              <OutschoolDropdown
                label={venueTypeLabel}
                icon={<FaBuilding />}
                active={!!filters.venueType?.length}
                title="Venue Type"
                ctaLabel="Apply"
                onCtaClick={() => setFilters(prev => ({ ...prev, venueType: pendingVenueType.length ? pendingVenueType : undefined, page: 1 }))}
              >
                <div className="divide-y divide-gray-50">
                  {filterOptions.venueTypes.map(vt => (
                    <CheckRow
                      key={vt.value}
                      label={vt.label || 'All Venues'}
                      checked={pendingVenueType.includes(vt.value) || (pendingVenueType.length === 0 && !vt.value)}
                      onChange={() => togglePendingArray(setPendingVenueType, vt.value)}
                    />
                  ))}
                </div>
              </OutschoolDropdown>



              {/* Price */}
              <OutschoolDropdown
                label={priceLabel}
                icon={<FaDollarSign />}
                active={filters.minPrice !== undefined || filters.maxPrice !== undefined}
                title="Price Range"
                description="Set your budget for activities."
                ctaLabel="Apply Price"
                onCtaClick={() => setFilters(prev => ({ ...prev, minPrice: pendingPrice[0], maxPrice: pendingPrice[1], page: 1 }))}
              >
                <select
                  value={filters.currency || ''}
                  onChange={e => setFilters(prev => ({ ...prev, currency: e.target.value || undefined, page: 1 }))}
                  className="w-full mb-4 text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-indigo-400"
                >
                  <option value="">All Currencies</option>
                  {filterOptions.currencies.filter(c => c.value).map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
                <DualRangeSlider min={0} max={3000} step={50}
                  valueMin={pendingPrice[0]} valueMax={pendingPrice[1]}
                  suffix={` ${filters.currency || 'AED'}`}
                  onChange={(a, b) => setPendingPrice([a, b])} />
                <label className="flex items-center gap-2 mt-4 cursor-pointer">
                  <input type="checkbox" className="accent-indigo-600 w-4 h-4"
                    checked={pendingPrice[0] === 0 && pendingPrice[1] === 0}
                    onChange={e => {
                      if (e.target.checked) setPendingPrice([0, 0]);
                      else setPendingPrice([0, 3000]);
                    }} />
                  <span className="text-sm text-gray-700 font-medium">Free Events Only</span>
                </label>
              </OutschoolDropdown>

              {/* Age */}
              <OutschoolDropdown
                label={ageLabel}
                icon={<FaUsers />}
                active={filters.ageMin !== undefined || filters.ageMax !== undefined}
                title="Age Range"
                description="Find activities suited for your child's age."
                ctaLabel="Apply Age"
                onCtaClick={() => setFilters(prev => ({ ...prev, ageMin: pendingAge[0], ageMax: pendingAge[1], page: 1 }))}
              >
                <DualRangeSlider min={3} max={50} step={1}
                  valueMin={pendingAge[0]} valueMax={pendingAge[1]}
                  suffix=" yrs"
                  onChange={(a, b) => setPendingAge([a, b])} />
              </OutschoolDropdown>

              {/* Date */}
              <OutschoolDropdown
                label={dateLabel}
                icon={<FaCalendarAlt />}
                active={!!filters.dateFrom || !!filters.dateTo}
                title="Date Range"
                description="Pick when you want the activity."
                ctaLabel="Apply Dates"
                onCtaClick={() => setFilters(prev => ({ ...prev, dateFrom: pendingDateFrom || undefined, dateTo: pendingDateTo || undefined, page: 1 }))}
              >
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">From</label>
                    <input type="date" value={pendingDateFrom}
                      onChange={e => setPendingDateFrom(e.target.value)}
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-indigo-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">To</label>
                    <input type="date" value={pendingDateTo}
                      onChange={e => setPendingDateTo(e.target.value)}
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-indigo-400" />
                  </div>
                </div>
              </OutschoolDropdown>

              {/* Featured toggle */}
              <button
                onClick={() => setFilters(prev => ({ ...prev, featured: prev.featured ? undefined : true, page: 1 }))}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full border text-sm font-medium transition-all ${filters.featured
                  ? 'bg-yellow-400 text-yellow-900 border-yellow-400 shadow-sm'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                  }`}
              >
                <FaStar className="text-xs" /> Featured
              </button>

              {/* Clear all */}
              {activeCount > 0 && (
                <button
                  onClick={resetFilters}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 transition-all"
                >
                  <FaTimes size={10} /> Clear ({activeCount})
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Active chips row */}
        {activeCount > 0 && (
          <div className="hidden md:block bg-white border-b border-gray-100">
            <div className="container mx-auto px-4 py-2.5">
              <div className="flex flex-wrap gap-2 items-center max-w-6xl mx-auto w-full">
                <span className="text-xs text-gray-500 font-medium mr-1">Active:</span>
                {filters.category?.map(cat => (
                  <ActiveChip
                    key={`cat-${cat}`}
                    label={filterOptions.categories.find(c => c.value === cat)?.label || cat}
                    onRemove={() => toggleFilterArray('category', cat)} />
                ))}
                {filters.type?.map(type => (
                  <ActiveChip key={`type-${type}`} label={type} onRemove={() => toggleFilterArray('type', type)} />
                ))}
                {filters.venueType?.map(vt => (
                  <ActiveChip key={`vt-${vt}`} label={vt} onRemove={() => toggleFilterArray('venueType', vt)} />
                ))}
                {(filters.minPrice !== undefined || filters.maxPrice !== undefined) && (
                  <ActiveChip label={`💰 ${filters.minPrice ?? 0}–${filters.maxPrice ?? 3000} ${filters.currency || 'AED'}`}
                    onRemove={() => setFilters(prev => ({ ...prev, minPrice: undefined, maxPrice: undefined, page: 1 }))} />
                )}
                {(filters.ageMin !== undefined || filters.ageMax !== undefined) && (
                  <ActiveChip label={`Age ${filters.ageMin ?? 0}–${filters.ageMax ?? 18} yrs`}
                    onRemove={() => setFilters(prev => ({ ...prev, ageMin: undefined, ageMax: undefined, page: 1 }))} />
                )}
                {filters.featured && <ActiveChip label="⭐ Featured" onRemove={() => setFilters(prev => ({ ...prev, featured: undefined, page: 1 }))} />}
              </div>
            </div>
          </div>
        )}

        {/* ── Main content ─────────────────────────────────────────────────── */}
        <div className="container mx-auto px-4 py-6">

          {isInitialLoad && (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-12 h-12 mb-4">
                <FaSearch className="w-full h-full text-indigo-400 opacity-60" />
              </motion.div>
              <p className="text-gray-500 font-medium">Searching for activities...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-r-xl" role="alert">
              <p className="font-bold">Error</p><p>{error}</p>
            </div>
          )}

          {!isInitialLoad && (
            <>
              {/* Title + sort row */}
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h1 className="text-xl font-bold text-gray-900">
                    {query ? `Results for "${query}"` : 'All Events'}
                  </h1>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {loading ? 'Loading…' : `${pagination?.totalEvents ?? events.length} results found(Page ${pagination?.currentPage || 1} of ${pagination?.totalPages || 1})`}
                  </p>
                </div>
                <select
                  value={`${filters.sortBy || 'createdAt'}-${filters.sortOrder || 'desc'}`}
                  onChange={e => {
                    const [s, o] = e.target.value.split('-');
                    setFilters(prev => ({ ...prev, sortBy: s, sortOrder: o as 'asc' | 'desc', page: 1 }));
                  }}
                  className="border border-gray-300 rounded-full px-4 py-2 text-sm bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  disabled={loading}
                >
                  <option value="createdAt-desc">Newest</option>
                  <option value="createdAt-asc">Oldest</option>
                  <option value="price-asc">Price ↑</option>
                  <option value="price-desc">Price ↓</option>
                  <option value="viewsCount-desc">Most Popular</option>
                  <option value="title-asc">A → Z</option>
                </select>
              </div>

              {/* Events grid — 4 cols × 6 rows = 24 events */}
              {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
                  {Array.from({ length: 24 }).map((_, i) => (
                    <div key={i} className="bg-white rounded-2xl shadow-sm overflow-hidden animate-pulse">
                      <div className="bg-gray-200 h-44" />
                      <div className="p-4 space-y-2">
                        <div className="h-3 bg-gray-200 rounded w-3/4" />
                        <div className="h-3 bg-gray-200 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : events.length === 0 ? (
                <div className="text-center py-24 bg-white rounded-2xl shadow-sm">
                  <FaSearch className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-500 mb-2">No events found</h3>
                  <p className="text-gray-400 mb-6">Try different keywords or remove some filters</p>
                  <button onClick={resetFilters}
                    className="px-6 py-2.5 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 text-sm font-semibold">
                    Reset Filters
                  </button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5 mb-10">
                    {events.map((event: SearchEvent, idx: number) => (
                      <motion.div
                        key={event._id}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.22, delay: idx * 0.02 }}
                      >
                        <EventCard
                          _id={event._id} id={event._id} slug={event.slug}
                          title={event.title} description={event.description}
                          images={event.images} image={event.images?.[0]}
                          price={event.price} currency={event.currency}
                          location={event.location} venueType={event.venueType}
                          category={event.category} ageRange={event.ageRange}
                          dateSchedule={event.dateSchedule} isFeatured={event.isFeatured}
                          viewsCount={event.viewsCount} rating={event.rating}
                          reviewsCount={event.reviewsCount} vendorId={event.vendorId}
                          variant="overlay" showPrice showLocation
                          showDate={false} showTime={false} showDescription={false}
                          showStats={false} showCategory={false} showVendor={false}
                          showAgeGroup showFeaturedBadge
                          isInWishlist={favoriteItems.some(fav => fav._id === event._id)}
                          onWishlistToggle={handleToggleFavorite}
                        />
                      </motion.div>
                    ))}
                  </div>

                  {/* ── Beautiful Pagination ─────────────────────────────── */}
                  {pagination && (
                    <div className="flex flex-col items-center gap-4 py-6">
                      <div className="flex items-center gap-2">
                        {/* Prev */}
                        <button
                          onClick={() => handlePageChange(pagination.currentPage - 1)}
                          disabled={!pagination.hasPrevPage || loading}
                          className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-gray-300 text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
                        >
                          ← Previous
                        </button>

                        {/* Page numbers */}
                        <div className="flex items-center gap-1">
                          {pageNumbers.map((pg, i) =>
                            pg === '...' ? (
                              <span key={`dot-${i}`} className="w-9 h-9 flex items-center justify-center text-gray-400 text-sm">…</span>
                            ) : (
                              <button
                                key={pg}
                                onClick={() => handlePageChange(pg as number)}
                                disabled={loading}
                                className={`w-9 h-9 rounded-full text-sm font-semibold transition-all ${pg === pagination.currentPage
                                  ? 'text-white shadow-md'
                                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                                  }`}
                                style={pg === pagination.currentPage ? { backgroundColor: 'var(--primary-color)' } : {}}
                              >
                                {pg}
                              </button>
                            )
                          )}
                        </div>

                        {/* Next */}
                        <button
                          onClick={() => handlePageChange(pagination.currentPage + 1)}
                          disabled={!pagination.hasNextPage || loading}
                          className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-gray-300 text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
                        >
                          Next →
                        </button>
                      </div>

                      {/* Page info */}
                      <p className="text-sm text-gray-400">
                        Showing page <span className="font-semibold text-gray-600">{pagination.currentPage}</span> of{' '}
                        <span className="font-semibold text-gray-600">{pagination.totalPages}</span>
                        {pagination.totalEvents && (
                          <> · <span className="font-semibold text-gray-600">{pagination.totalEvents}</span> total events</>
                        )}
                      </p>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {/* ── Mobile Filter Drawer ──────────────────────────────────────────── */}
        <AnimatePresence>
          {showMobileFilters && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 md:hidden"
              onClick={() => setShowMobileFilters(false)}>
              <motion.div
                initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                className="absolute top-0 right-0 bottom-0 w-4/5 max-w-sm bg-white overflow-y-auto"
                onClick={e => e.stopPropagation()}>

                <div className="sticky top-0 bg-white border-b px-4 py-4 flex justify-between items-center z-10">
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <FaFilter className="text-indigo-600" /> Filters
                    {activeCount > 0 && (
                      <span className="bg-indigo-600 text-white text-xs rounded-full px-2 py-0.5 font-bold">{activeCount}</span>
                    )}
                  </h2>
                  <button onClick={() => setShowMobileFilters(false)} className="p-2 rounded-full hover:bg-gray-100">
                    <FaTimes className="text-gray-600" />
                  </button>
                </div>

                <div className="p-4 space-y-6">
                  {/* Category */}
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Category</p>
                    <input type="text" placeholder="Search categories..." value={catSearch}
                      onChange={e => setCatSearch(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg mb-3 focus:outline-none focus:border-indigo-400 bg-gray-50" />
                    <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                      {filteredCats.map(cat => (
                        <button key={cat.value}
                          onClick={() => { setFilters(prev => ({ ...prev, category: cat.value ? [cat.value] : undefined, page: 1 })); setShowMobileFilters(false); }}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${(filters.category?.includes(cat.value)) || (!filters.category?.length && !cat.value)
                            ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-300'
                            }`}>
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Event Type */}
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Event Type</p>
                    <div className="flex flex-wrap gap-2">
                      {filterOptions.eventTypes.map(et => (
                        <button key={et.value}
                          onClick={() => setFilters(prev => ({ ...prev, type: et.value ? [et.value] : undefined, page: 1 }))}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${(filters.type?.includes(et.value)) || (!filters.type?.length && !et.value)
                            ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-300'
                            }`}>
                          {et.label || 'All'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Venue Type */}
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Venue Type</p>
                    <div className="flex flex-wrap gap-2">
                      {filterOptions.venueTypes.map(vt => (
                        <button key={vt.value}
                          onClick={() => setFilters(prev => ({ ...prev, venueType: vt.value ? [vt.value] : undefined, page: 1 }))}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${(filters.venueType?.includes(vt.value)) || (!filters.venueType?.length && !vt.value)
                            ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-300'
                            }`}>
                          {vt.label || 'All'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Price */}
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Price Range</p>
                    <DualRangeSlider min={0} max={3000} step={50} valueMin={pendingPrice[0]} valueMax={pendingPrice[1]}
                      suffix={` ${filters.currency || 'AED'}`} onChange={(a, b) => setPendingPrice([a, b])} />
                    <label className="flex items-center gap-2 mt-4 mb-2 cursor-pointer">
                      <input type="checkbox" className="accent-indigo-600 w-4 h-4"
                        checked={pendingPrice[0] === 0 && pendingPrice[1] === 0}
                        onChange={e => {
                          if (e.target.checked) setPendingPrice([0, 0]);
                          else setPendingPrice([0, 3000]);
                        }} />
                      <span className="text-sm text-gray-700 font-medium">Free Events Only</span>
                    </label>
                    <button onClick={() => setFilters(prev => ({ ...prev, minPrice: pendingPrice[0], maxPrice: pendingPrice[1], page: 1 }))}
                      className="mt-3 w-full py-2 bg-indigo-600 text-white text-sm rounded-full font-semibold">Apply Price</button>
                  </div>

                  {/* Age */}
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Age Range</p>
                    <DualRangeSlider min={3} max={50} step={1} valueMin={pendingAge[0]} valueMax={pendingAge[1]}
                      suffix=" yrs" onChange={(a, b) => setPendingAge([a, b])} />
                    <button onClick={() => setFilters(prev => ({ ...prev, ageMin: pendingAge[0], ageMax: pendingAge[1], page: 1 }))}
                      className="mt-3 w-full py-2 bg-indigo-600 text-white text-sm rounded-full font-semibold">Apply Age</button>
                  </div>

                  {/* Date */}
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Date Range</p>
                    <div className="space-y-2">
                      <input type="date" value={pendingDateFrom}
                        onChange={e => setPendingDateFrom(e.target.value)}
                        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" />
                      <input type="date" value={pendingDateTo}
                        onChange={e => setPendingDateTo(e.target.value)}
                        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" />
                      <button onClick={() => setFilters(prev => ({ ...prev, dateFrom: pendingDateFrom || undefined, dateTo: pendingDateTo || undefined, page: 1 }))}
                        className="w-full py-2 bg-indigo-600 text-white text-sm rounded-full font-semibold">Apply Dates</button>
                    </div>
                  </div>

                  {/* Featured */}
                  <label className="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-xl cursor-pointer">
                    <input type="checkbox" checked={!!filters.featured}
                      onChange={e => setFilters(prev => ({ ...prev, featured: e.target.checked ? true : undefined, page: 1 }))}
                      className="accent-yellow-500 w-4 h-4" />
                    <span className="text-sm font-semibold text-yellow-800">⭐ Featured Events Only</span>
                  </label>

                  {/* Reset */}
                  <button onClick={() => { resetFilters(); setShowMobileFilters(false); }}
                    className="w-full py-3 bg-red-500 text-white rounded-full font-bold text-sm hover:bg-red-600 transition-colors">
                    Reset All Filters
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export default SearchPage;