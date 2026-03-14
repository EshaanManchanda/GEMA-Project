import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import SEO from '@/components/common/SEO';
import { useVendorsQuery } from '@/hooks/queries/useVendorQuery';
import { useDebounce } from '@/hooks/useDebounce';

interface Vendor {
  id: string;
  name: string;
  logo: string;
  coverImage: string;
  description: string;
  rating: number;
  reviewCount: number;
  eventCount: number;
  location: string;
  categories: string[];
}

// Lazy loaded vendor card with intersection observer
interface VendorCardProps {
  vendor: Vendor;
}

const VendorCard: React.FC<VendorCardProps> = ({ vendor }) => {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
    rootMargin: '50px'
  });

  return (
    <motion.div
      ref={ref}
      key={vendor.id}
      whileHover={{ y: -5 }}
      className="bg-white rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300"
    >
      <Link to={`/vendors/${vendor.id}`}>
        <div className="relative h-48 overflow-hidden">
          {inView ? (
            <img
              src={vendor.coverImage}
              alt={`${vendor.name} cover`}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-gray-200 animate-pulse" />
          )}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
            <div className="flex items-center">
              {inView ? (
                <img
                  src={vendor.logo}
                  alt={vendor.name}
                  className="w-12 h-12 rounded-full border-2 border-white mr-3 object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-12 h-12 rounded-full border-2 border-white mr-3 bg-gray-300 animate-pulse" />
              )}
              <h3 className="text-white font-bold text-lg truncate">{vendor.name}</h3>
            </div>
          </div>
        </div>
        <div className="p-4">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center">
              <span className="text-yellow-500">★</span>
              <span className="ml-1 font-medium">{vendor.rating}</span>
              <span className="ml-1 text-gray-500">({vendor.reviewCount} reviews)</span>
            </div>
            <span className="text-sm text-gray-500">{vendor.eventCount} events</span>
          </div>
          <p className="text-gray-600 mb-3 line-clamp-2">{vendor.description}</p>
          <div className="flex items-center text-gray-500 text-sm">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
            </svg>
            {vendor.location}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {vendor.categories.slice(0, 3).map((category, index) => (
              <span key={index} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                {category}
              </span>
            ))}
            {vendor.categories.length > 3 && (
              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                +{vendor.categories.length - 3} more
              </span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

const VendorsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [page, setPage] = useState<number>(1);

  // Debounce search to prevent excessive API calls
  const debouncedSearch = useDebounce(searchTerm, 500);

  // Build API query parameters
  const queryParams = {
    page,
    limit: 12,
    search: debouncedSearch || undefined,
    sortBy: 'createdAt',
    sortOrder: 'desc' as 'desc' | 'asc'
  };

  // Fetch vendors using TanStack Query
  const { data, isLoading, isError, error } = useVendorsQuery(queryParams);

  // Extract data from response
  const vendors = data?.data?.vendors || [];
  const pagination = data?.data?.pagination || {
    currentPage: 1,
    totalPages: 1,
    total: 0,
    hasNextPage: false,
    hasPrevPage: false
  };

  // Static categories (backend doesn't support filtering yet)
  const categories = ['all', 'Corporate', 'Wedding', 'Festival', 'Technology', 'Sports', 'Education'];

  // Reset to page 1 when search changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, selectedCategory]);

  // Client-side category filter (backend limitation)
  const filteredVendors = selectedCategory === 'all'
    ? vendors
    : vendors.filter((vendor: Vendor) =>
        vendor.categories.includes(selectedCategory)
      );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const breadcrumbs = [
    { name: 'Home', url: '/' },
    { name: 'Vendors', url: '/vendors' }
  ];

  return (
    <>
      <SEO
        title="Event Vendors - Kids Activities Organizers | Gema Events"
        description="Discover trusted event vendors and organizers for kids activities in the UAE. Find professional service providers for birthday parties, educational programs, and family events."
        keywords={['event vendors', 'kids activities organizers', 'event planners UAE', 'children event services', 'party organizers']}
        breadcrumbs={breadcrumbs}
      />
      <div className="container mx-auto px-4 py-8">
        {isError && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
            <p className="font-bold">Error</p>
            <p>Failed to load vendors. {(error as any)?.message || 'Please try again later.'}</p>
          </div>
        )}

      <h1 className="text-3xl font-bold mb-8 text-center">Event Organizers & Vendors</h1>
      
      <div className="mb-8">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search vendors..."
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="w-full md:w-64">
            <select
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              {categories.map((category, index) => (
                <option key={index} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {!isLoading && filteredVendors.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-xl font-medium text-gray-500">
            {debouncedSearch || selectedCategory !== 'all'
              ? 'No vendors found matching your criteria'
              : 'No vendors available at the moment'}
          </h3>
          <p className="mt-2 text-gray-400">
            {debouncedSearch || selectedCategory !== 'all'
              ? 'Try adjusting your search or filter options'
              : 'Please check back later'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredVendors.map((vendor: any) => (
            <VendorCard key={vendor.id} vendor={vendor} />
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {pagination.totalPages > 1 && (
        <div className="mt-8 flex justify-center items-center gap-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={!pagination.hasPrevPage}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          <span className="text-gray-700">
            Page {pagination.currentPage} of {pagination.totalPages}
          </span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={!pagination.hasNextPage}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
    </>
  );
};

export default VendorsPage;