import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaSearch, FaStar, FaUsers, FaCalendarAlt,
  FaMapMarkerAlt, FaCheckCircle, FaTimes, FaBuilding
} from 'react-icons/fa';
import { MdOutlineSort } from 'react-icons/md';
import { useVendorsQuery } from '@/hooks/queries/useVendorQuery';
import { useDebounce } from '@/hooks/useDebounce';
import SEO from '@/components/common/SEO';
import { API_BASE_URL } from '@/config/api';

interface Vendor {
  id: string;
  name: string;
  description: string;
  location: string;
  rating: number;
  reviewCount: number;
  eventCount: number;
  logo: string;
  coverImage: string;
  categories: string[];
}

type SortOption = 'rating' | 'reviews' | 'events' | 'newest';

const SORT_LABELS: Record<SortOption, string> = {
  rating: 'Top Rated',
  reviews: 'Most Reviews',
  events: 'Most Events',
  newest: 'Newest',
};

const API_ORIGIN = (() => {
  try {
    return new URL(API_BASE_URL).origin;
  } catch {
    return '';
  }
})();

const normalizeImageUrl = (url?: string) => {
  if (!url) return '';
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  if (API_ORIGIN && url.startsWith('/')) {
    return `${API_ORIGIN}${url}`;
  }
  return url;
};

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

// ── Vendor card ──────────────────────────────────────────────
const VendorCard: React.FC<{ vendor: Vendor; idx: number }> = ({ vendor, idx }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(idx * 0.04, 0.4) }}
    >
      <Link
        to={`/vendors/${vendor.id}`}
        className="block bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all
                   duration-300 overflow-hidden group border border-gray-100
                   hover:border-emerald-200"
      >
        {/* Cover */}
        <div className="h-24 bg-gradient-to-r from-emerald-500 to-teal-500 relative overflow-hidden">
          {vendor.coverImage && (
            <img
              src={normalizeImageUrl(vendor.coverImage)}
              alt="cover"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          )}
        </div>

        <div className="px-4 pb-5">
          {/* Logo */}
          <div className="flex justify-center -mt-10 mb-2">
            <div className="relative">
              <div className="w-20 h-20 rounded-full border-4 border-white shadow-md overflow-hidden
                              bg-gradient-to-br from-emerald-400 to-teal-400 flex items-center justify-center">
                {vendor.logo ? (
                  <img
                    src={normalizeImageUrl(vendor.logo)}
                    alt={vendor.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <FaBuilding className="text-white text-2xl" />
                )}
              </div>
              <FaCheckCircle
                className="absolute -bottom-0.5 -right-0.5 w-5 h-5 text-emerald-500
                           bg-white rounded-full"
                title="Verified vendor"
              />
            </div>
          </div>

          {/* Name + Details */}
          <div className="text-center">
            <h3 className="font-bold text-gray-900 group-hover:text-emerald-600
                           transition-colors leading-tight truncate px-2">
              {vendor.name}
            </h3>
            {vendor.location && (
              <p className="text-xs text-gray-500 mt-1 flex items-center justify-center gap-1">
                <FaMapMarkerAlt className="w-3 h-3" />
                {vendor.location}
              </p>
            )}
            {vendor.description && (
              <p className="text-xs text-gray-600 mt-2 line-clamp-2 px-2 text-center">
                {vendor.description}
              </p>
            )}
          </div>

          {/* Category chips */}
          {vendor.categories && vendor.categories.length > 0 && (
            <div className="flex flex-wrap justify-center gap-1 mt-3">
              {vendor.categories.slice(0, 3).map((cat) => (
                <span
                  key={cat}
                  className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full text-xs font-medium"
                >
                  {cat}
                </span>
              ))}
              {vendor.categories.length > 3 && (
                <span className="px-2 py-0.5 bg-gray-50 text-gray-500 rounded-full text-xs">
                  +{vendor.categories.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Stats row */}
          <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-gray-50 text-xs text-gray-500">
            {vendor.rating != null && (
              <span className="flex items-center gap-1">
                <FaStar className="text-yellow-400 w-3 h-3" />
                <span className="font-medium text-gray-700">
                  {vendor.rating.toFixed(1)}
                </span>
              </span>
            )}
            {vendor.reviewCount != null && (
              <span className="flex items-center gap-1" title="Reviews">
                <FaUsers className="w-3 h-3 text-emerald-500/70" />
                {vendor.reviewCount}
              </span>
            )}
            {vendor.eventCount != null && (
              <span className="flex items-center gap-1" title="Events">
                <FaCalendarAlt className="w-3 h-3 text-emerald-500/70" />
                {vendor.eventCount}
              </span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
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
      <div className="bg-gradient-to-r from-emerald-700 to-green-700 text-white py-14">
        <div className="container mx-auto px-4 text-center">
          <motion.h1
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3"
          >
            Find Top Event Organizers
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-emerald-100 text-base mb-8 max-w-xl mx-auto"
          >
            Discover professional vendors to bring your perfect event to life.
          </motion.p>

          {/* Search */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 }}
            className="max-w-lg mx-auto relative"
          >
            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search organizers by name..."
              className="w-full pl-11 pr-4 py-3 rounded-xl text-gray-900 focus:outline-none
                         focus:ring-2 focus:ring-emerald-500 shadow-lg text-sm"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400
                           hover:text-gray-600"
              >
                <FaTimes className="w-3.5 h-3.5" />
              </button>
            )}
          </motion.div>
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