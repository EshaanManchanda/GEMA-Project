import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaSearch, FaFilter, FaChevronRight, FaRedo } from 'react-icons/fa';
import collectionsAPI, { Collection } from '../services/api/collectionsAPI';
import { generatePlaceholder } from '../utils/placeholderImage';
import SEO from '@/components/common/SEO';

// Mock collections data for fallback
const mockCollections: Collection[] = [
  {
    _id: 'mock-1',
    id: 'mock-1',
    title: 'Summer Camps',
    description: 'Keep your kids active and engaged during summer break',
    icon: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=80&h=80&fit=crop&crop=center',
    count: '45+ activities',
    category: 'Education',
    events: [],
    isActive: true,
    sortOrder: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    _id: 'mock-2',
    id: 'mock-2',
    title: 'Top Daycation Spots',
    description: 'Perfect day trips for the whole family',
    icon: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=80&h=80&fit=crop&crop=center',
    count: '32+ locations',
    category: 'Adventure',
    events: [],
    isActive: true,
    sortOrder: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    _id: 'mock-3',
    id: 'mock-3',
    title: 'Pool, Brunch & more',
    description: 'Relaxing experiences for parents and kids',
    icon: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=80&h=80&fit=crop&crop=center',
    count: '28+ venues',
    category: 'Food',
    events: [],
    isActive: true,
    sortOrder: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    _id: 'mock-4',
    id: 'mock-4',
    title: 'Top Kids Play Areas',
    description: 'Safe and fun indoor play experiences',
    icon: 'https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?w=80&h=80&fit=crop&crop=center',
    count: '50+ play zones',
    category: 'Entertainment',
    events: [],
    isActive: true,
    sortOrder: 4,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const CollectionsPage: React.FC = () => {
  const navigate = useNavigate();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingMockData, setUsingMockData] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortBy, setSortBy] = useState('sortOrder'); // 'sortOrder', 'title', 'category'

  // Fetch collections data
  const fetchCollections = async (isRetry = false) => {
    try {
      if (!isRetry) {
        setIsLoading(true);
      }
      setError(null);

      const response = await collectionsAPI.getAllCollections({ limit: 50 });
      const fetchedCollections = response.collections || [];

      if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_API === 'true') {
        console.log('Collections fetched:', fetchedCollections.length);
      }

      setCollections(fetchedCollections);
      setUsingMockData(false);
    } catch (err) {
      console.error('Error fetching collections:', err);

      // Fallback to mock data
      setCollections(mockCollections);
      setUsingMockData(true);
      setError('Unable to load latest collections. Showing default content.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCollections();
  }, []);

  // Get unique categories for filter
  const getUniqueCategories = () => {
    const categories = collections
      .map(collection => collection.category)
      .filter(category => category) // Remove undefined/null
      .filter((category, index, arr) => arr.indexOf(category) === index); // Remove duplicates
    return categories;
  };

  // Filter and sort collections
  const getFilteredCollections = () => {
    let filtered = collections.filter(collection => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!collection.title.toLowerCase().includes(query) &&
            !collection.description.toLowerCase().includes(query)) {
          return false;
        }
      }

      // Category filter
      if (selectedCategory && collection.category !== selectedCategory) {
        return false;
      }

      return true;
    });

    // Sort collections
    switch(sortBy) {
      case 'title':
        filtered = filtered.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'category':
        filtered = filtered.sort((a, b) => (a.category || '').localeCompare(b.category || ''));
        break;
      case 'sortOrder':
      default:
        filtered = filtered.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
        break;
    }

    return filtered;
  };

  const handleCollectionClick = (collection: Collection) => {
    // Navigate to individual collection detail page
    navigate(`/collections/${collection._id}`);
  };

  const filteredCollections = getFilteredCollections();

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-96"></div>
            </div>
          </div>
        </div>

        {/* Loading grid */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
                <div className="p-6">
                  <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4"></div>
                  <div className="h-6 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const breadcrumbs = [
    { name: 'Home', url: '/' },
    { name: 'Collections', url: '/collections' }
  ];

  return (
    <>
      <SEO
        title="Collections - Curated Kids Activities | Gema Events"
        description="Explore our curated collections of kids activities and events in the UAE. Find themed activity packages, seasonal events, and specially organized experiences for children."
        keywords={['collections', 'curated activities', 'kids events packages', 'themed activities', 'UAE children events']}
        breadcrumbs={breadcrumbs}
      />
      <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Kidzapproved Collections
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Discover curated collections of the best kid-friendly activities and experiences
            </p>
            {collections.length > 0 && (
              <p className="text-sm text-gray-500 mt-2">
                {collections.length} collection{collections.length !== 1 ? 's' : ''} available
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Error banner */}
      {usingMockData && error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="text-orange-500">⚠️</div>
                <span className="text-sm text-orange-700">{error}</span>
              </div>
              <button
                onClick={() => fetchCollections(true)}
                className="flex items-center space-x-1 text-xs bg-orange-200 hover:bg-orange-300 text-orange-800 px-2 py-1 rounded transition-colors"
              >
                <FaRedo size={10} />
                <span>Retry</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
                <input
                  type="text"
                  placeholder="Search collections..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div className="flex-shrink-0">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="">All Categories</option>
                {getUniqueCategories().map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            {/* Sort By */}
            <div className="flex-shrink-0">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="sortOrder">Default Order</option>
                <option value="title">Alphabetical</option>
                <option value="category">By Category</option>
              </select>
            </div>
          </div>
        </div>

        {/* Collections Grid */}
        {filteredCollections.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredCollections.map((collection, index) => (
              <div
                key={collection._id || collection.id || index}
                onClick={() => handleCollectionClick(collection)}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer group"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleCollectionClick(collection);
                  }
                }}
                aria-label={`Explore ${collection.title} collection`}
              >
                <div className="p-6 text-center">
                  {/* Collection Icon */}
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full p-3 flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                    style={{ backgroundColor: 'var(--secondary-color, #6DB0E1)', opacity: 0.1 }}
                  >
                    <img
                      src={collection.icon}
                      alt={collection.title}
                      className="w-full h-full object-contain"
                      loading="lazy"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = generatePlaceholder({
                          width: 80,
                          height: 80,
                          text: collection.title.slice(0, 2),
                          backgroundColor: '#f0f0f0',
                          textColor: '#666666'
                        });
                      }}
                    />
                  </div>

                  {/* Collection Info */}
                  <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--primary-color, #008EC7)' }}>
                    {collection.title}
                  </h3>

                  <p className="text-sm text-gray-500 mb-2">{collection.count}</p>

                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {collection.description}
                  </p>

                  {/* Category Badge */}
                  {collection.category && (
                    <div className="inline-block px-3 py-1 rounded-full text-xs font-medium mb-4"
                      style={{ backgroundColor: 'rgba(255, 107, 0, 0.1)', color: 'var(--accent-color, #FF6B00)' }}
                    >
                      {collection.category}
                    </div>
                  )}

                  {/* Explore Button */}
                  <button
                    className="w-10 h-10 rounded-full shadow-md flex items-center justify-center transition-all duration-300 group-hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 mx-auto"
                    style={{ backgroundColor: 'var(--accent-color, #FF6B00)', color: 'white' }}
                    aria-label={`View ${collection.title} collection`}
                    tabIndex={-1}
                  >
                    <FaChevronRight size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📚</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              {searchQuery || selectedCategory ? 'No collections found' : 'No collections available'}
            </h3>
            <p className="text-gray-500 mb-4">
              {searchQuery || selectedCategory
                ? 'Try adjusting your search or filter criteria'
                : 'Collections are being curated and will be available soon'
              }
            </p>
            {(searchQuery || selectedCategory) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('');
                }}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
    </>
  );
};

export default CollectionsPage;