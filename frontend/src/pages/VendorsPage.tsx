import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaSearch, FaTimes, FaBuilding, FaUsers
} from 'react-icons/fa';
import { MdOutlineSort } from 'react-icons/md';
import { useVendorsQuery } from '@/hooks/queries/useVendorQuery';
import { useHomepageQuery } from '@/hooks/queries/useHomepageQuery';
import { useDebounce } from '@/hooks/useDebounce';
import SEO from '@/components/common/SEO';
import VendorCard, { Vendor } from '@/components/vendor/VendorCard';



// ── Skeleton card ─────────────────────────────────────────────
const SkeletonCard: React.FC = () => (
  <div className="bg-white rounded-2xl shadow-sm overflow-hidden animate-pulse">
    <div className="h-24 bg-gray-200" />
    <div className="px-4 pb-5">
      <div className="flex justify-center -mt-10 mb-3">
        <div className="w-20 h-20 rounded-full bg-gray-300 border-4 border-white" />
      </div>
      <div className="flex flex-col items-center gap-2">
        <div className="h-4 w-32 bg-gray-200 rounded" />
        <div className="h-3 w-24 bg-gray-100 rounded" />
        <div className="flex gap-1 mt-1">
          <div className="h-5 w-14 bg-gray-100 rounded-full" />
          <div className="h-5 w-14 bg-gray-100 rounded-full" />
        </div>
        <div className="flex gap-4 mt-2">
          <div className="h-3 w-12 bg-gray-100 rounded" />
          <div className="h-3 w-12 bg-gray-100 rounded" />
        </div>
      </div>
    </div>
  </div>
);

type SortOption = 'rating' | 'reviews' | 'events' | 'newest';

const SORT_LABELS: Record<SortOption, string> = {
  rating: 'Top Rated',
  reviews: 'Most Reviews',
  events: 'Most Events',
  newest: 'Newest',
};

// ── Main page ─────────────────────────────────────────────────
const VendorsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 500);

  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [showSort, setShowSort] = useState(false);
  const [page, setPage] = useState(1);

  // Reset page on filter changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, activeCategory, sortBy]);

  // Build API query parameters
  const queryParams = {
    page,
    limit: 12,
    search: debouncedSearch || undefined,
    sortBy: sortBy === 'rating' || sortBy === 'reviews' || sortBy === 'events' ? 'stats' : 'createdAt',
    sortOrder: 'desc' as 'desc' | 'asc'
  };

  const { data, isLoading, isError, error } = useVendorsQuery(queryParams);
  const { data: homeData } = useHomepageQuery();
  
  const totalEvents = homeData?.stats?.totalEvents || 0;

  const vendors = (data?.vendors || data?.data?.vendors || []) as Vendor[];
  const pagination = data?.pagination || data?.data?.pagination || {
    currentPage: 1,
    totalPages: 1,
    total: 0,
    hasNextPage: false,
    hasPrevPage: false
  };

  // Pre-defined categories for vendors
  const allCategories = ['Corporate', 'Wedding', 'Festival', 'Technology', 'Sports', 'Education', 'Entertainment'];

  // Client-side filtering & sorting (since backend may not support complex filters yet)
  const filtered = useMemo(() => {
    let list = vendors.filter((v) => {
      if (activeCategory && !v.categories?.includes(activeCategory) && v.categories?.[0] !== activeCategory) {
        // Also match partial strings if categories are comma separated
        if (!v.categories?.some(c => c.toLowerCase().includes(activeCategory.toLowerCase()))) {
          return false;
        }
      }
      return true;
    });

    list = [...list].sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return (b.rating ?? 0) - (a.rating ?? 0);
        case 'reviews':
          return (b.reviewCount ?? 0) - (a.reviewCount ?? 0);
        case 'events':
          return (b.eventCount ?? 0) - (a.eventCount ?? 0);
        default:
          return 0; // Newest is default from backend
      }
    });

    return list;
  }, [vendors, activeCategory, sortBy]);

  const hasFilters = debouncedSearch || activeCategory;

  const clearFilters = () => {
    setSearchTerm('');
    setActiveCategory(null);
  };

  const breadcrumbs = [
    { name: 'Home', url: '/' },
    { name: 'Vendors', url: '/vendors' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <SEO
        title="Event Vendors & Organizers | Gema Events"
        description="Discover top-rated event vendors and organizers. Find professional service providers for birthday parties, corporate events, educational programs, and more."
        keywords={['event vendors', 'event organizers', 'party planners', 'event services']}
        breadcrumbs={breadcrumbs}
      />

      {/* Hero */}
      <div className="relative overflow-hidden pt-0 pb-0">
        {/* Background Image & Overlay */}
        <div className="absolute inset-0 bg-[#fff5f5]">
          <img
            src="/assets/vendbanner.png"
            alt="Vendors Header"
            className="w-full h-full object-cover"
          />
        </div>

        <div className="container mx-auto px-4 text-center relative z-10 pt-10 pb-8">

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 font-semibold text-sm mb-6 shadow-sm">
            <FaUsers className="text-emerald-500" />
            Verified Event Organizers
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-[#111827] mb-4 leading-tight tracking-tight">
            Find the Best <br className="hidden sm:block" />
            Events for Kids <br />
            <span className="inline-block relative text-[#3b82f6] font-handwriting italic mt-1">
              in the UAE
              <svg className="absolute w-full h-3 -bottom-1 left-0 text-yellow-400" viewBox="0 0 100 10" preserveAspectRatio="none">
                <path d="M0 5 Q 50 15 100 5" stroke="currentColor" strokeWidth="4" fill="transparent" strokeLinecap="round" />
              </svg>
              {/* Decorative yellow lines */}
              <svg className="absolute -right-8 -top-6 w-8 h-8 text-yellow-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                <path d="M4 12h-2m20 0h-2m-9-9v-2m0 20v-2m7.07-7.07l1.42-1.42m-14.14 0l-1.42-1.42m14.14 14.14l1.42 1.42m-14.14 0l-1.42 1.42" />
              </svg>
            </span>
          </h1>

          <p className="text-gray-500 text-base sm:text-lg mb-10 max-w-2xl mx-auto font-medium leading-relaxed">
            Discover trusted vendors who run classes, courses, camps, <br className="hidden sm:block" />
            and exciting events for kids and families across the UAE.
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto relative mb-12">
            <div className="flex items-center bg-white rounded-full p-2 shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-gray-100">
              <FaSearch className="text-gray-400 ml-4 mr-2 text-lg" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search vendors by name..."
                className="flex-1 border-none focus:ring-0 text-gray-700 placeholder-gray-400 bg-transparent text-base px-2 py-2 outline-none"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="mr-3 text-gray-400 hover:text-gray-600"
                >
                  <FaTimes className="w-4 h-4" />
                </button>
              )}
              <button className="bg-[#34d399] hover:bg-emerald-500 text-white font-bold px-8 py-3.5 rounded-full transition-colors">
                Search
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="flex flex-wrap justify-center gap-4 max-w-4xl mx-auto">
            {/* Stat 1 */}
            <div className="flex items-center gap-4 bg-white rounded-2xl px-6 py-4 shadow-sm border border-red-100 min-w-[200px]">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                <FaUsers className="text-red-400 text-xl" />
              </div>
              <div className="text-left">
                <p className="text-2xl font-bold text-gray-900 leading-tight">{pagination.total > 0 ? `${pagination.total}+` : '0'}</p>
                <p className="text-sm font-medium text-gray-500">Verified Vendors</p>
              </div>
            </div>
            {/* Stat 2 */}
            <div className="flex items-center gap-4 bg-white rounded-2xl px-6 py-4 shadow-sm border border-blue-100 min-w-[200px]">
              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="text-left">
                <p className="text-2xl font-bold text-gray-900 leading-tight">{totalEvents > 0 ? `${totalEvents}+` : '0'}</p>
                <p className="text-sm font-medium text-gray-500">Events Organized</p>
              </div>
            </div>
            {/* Stat 3 */}
            <div className="flex items-center gap-4 bg-white rounded-2xl px-6 py-4 shadow-sm border border-emerald-100 min-w-[200px]">
              <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="text-left">
                <p className="text-2xl font-bold text-gray-900 leading-tight">1k+</p>
                <p className="text-sm font-medium text-gray-500">Happy Families</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters bar */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-100 shadow-sm">
        <div className="container mx-auto px-4 py-3 flex flex-wrap items-center gap-3">
          {/* Category chips */}
          <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
            <button
              onClick={() => setActiveCategory(null)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors
                ${!activeCategory
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                }`}
            >
              All Categories
            </button>
            {allCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors
                  ${activeCategory === cat
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Sort */}
          <div className="relative ml-auto">
            <button
              onClick={() => setShowSort((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200
                         text-gray-600 rounded-lg text-xs font-medium transition-colors"
            >
              <MdOutlineSort className="w-4 h-4" />
              {SORT_LABELS[sortBy]}
            </button>
            <AnimatePresence>
              {showSort && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute right-0 top-full mt-1 w-40 bg-white rounded-xl shadow-lg
                             border border-gray-100 overflow-hidden z-30"
                >
                  {(Object.keys(SORT_LABELS) as SortOption[]).map((opt) => (
                    <button
                      key={opt}
                      onClick={() => { setSortBy(opt); setShowSort(false); }}
                      className={`w-full text-left px-3 py-2 text-xs hover:bg-emerald-50
                                  transition-colors
                        ${sortBy === opt ? 'text-emerald-600 font-medium bg-emerald-50' : 'text-gray-600'}`}
                    >
                      {SORT_LABELS[opt]}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-10">
        {/* Results summary */}
        {!isLoading && (
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-gray-500">
              {filtered.length === 0
                ? 'No vendors found'
                : `${filtered.length} vendor${filtered.length !== 1 ? 's' : ''}`}
              {hasFilters && (
                <span className="text-gray-400"> (filtered)</span>
              )}
            </p>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="text-xs text-emerald-600 hover:text-emerald-800 flex items-center gap-1"
              >
                <FaTimes className="w-3 h-3" />
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* Loading skeletons */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {/* Error */}
        {isError && !isLoading && (
          <div className="text-center py-20">
            <p className="text-red-500 mb-4">{(error as any)?.message || 'Failed to load vendors. Please try again.'}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 text-sm"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty */}
        {!isLoading && !isError && filtered.length === 0 && (
          <div className="text-center py-20">
            <FaBuilding className="w-14 h-14 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-400 text-lg font-medium mb-1">No organizers found</p>
            <p className="text-gray-400 text-sm">
              {hasFilters
                ? 'Try adjusting your filters or search term.'
                : 'Check back soon for new event organizers.'}
            </p>
          </div>
        )}

        {/* Grid */}
        {!isLoading && !isError && filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map((vendor, idx) => (
              <VendorCard key={vendor.id} vendor={vendor} idx={idx} />
            ))}
          </div>
        )}

        {/* Pagination Controls */}
        {!isLoading && !isError && pagination.totalPages > 1 && (
          <div className="mt-12 flex justify-center items-center gap-4">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={!pagination.hasPrevPage}
              className="px-4 py-2 border border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <span className="text-gray-500 text-sm font-medium">
              Page {pagination.currentPage} of {pagination.totalPages}
            </span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={!pagination.hasNextPage}
              className="px-4 py-2 border border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default VendorsPage;