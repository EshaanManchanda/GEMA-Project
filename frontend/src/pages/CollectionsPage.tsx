import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaSearch, FaChevronRight, FaRedo } from 'react-icons/fa';
import collectionsAPI, { Collection } from '../services/api/collectionsAPI';
import { generatePlaceholder } from '../utils/placeholderImage';
import SEO from '@/components/common/SEO';
import logger from '@/utils/logger';

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

      // Add cache buster to ensure we get the latest data, fixing the "values not getting updated" issue
      const response = await collectionsAPI.getAllCollections({ limit: 50, _t: Date.now() });
      const fetchedCollections = response.collections || [];

      if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_API === 'true') {
        logger.debug('Collections fetched:', fetchedCollections.length);
      }

      setCollections(fetchedCollections);
      setUsingMockData(false);
    } catch (err) {
      logger.error('Error fetching collections:', err);

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
    switch (sortBy) {
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
    navigate(`/collections/${collection.slug || collection._id}`);
  };

  const filteredCollections = getFilteredCollections();

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50/50">
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="animate-pulse flex flex-col items-center">
              <div className="h-10 bg-gray-200 rounded-lg w-64 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-96"></div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-pulse">
                <div className="p-8">
                  <div className="w-20 h-20 bg-gray-100 rounded-2xl mx-auto mb-6"></div>
                  <div className="h-6 bg-gray-200 rounded mb-3 mx-auto w-3/4"></div>
                  <div className="h-4 bg-gray-100 rounded mb-4 mx-auto w-1/4"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-100 rounded w-full"></div>
                    <div className="h-4 bg-gray-100 rounded w-5/6 mx-auto"></div>
                  </div>
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
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        {/* Stunning Header with Dynamic Elements */}
        <div className="relative overflow-hidden bg-white border-b border-gray-100">
          {/* Decorative background blobs */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
            <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-blue-50 opacity-50 blur-3xl"></div>
            <div className="absolute top-12 -right-24 w-80 h-80 rounded-full bg-orange-50 opacity-50 blur-3xl"></div>
          </div>
          
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
            <div className="text-center">
              <div className="inline-flex items-center space-x-2 bg-blue-50 text-blue-700 px-4 py-1.5 rounded-full text-sm font-semibold tracking-wide mb-6">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
                </span>
                <span>Curated Experiences</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-6 tracking-tight">
                Kidzapproved <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">Collections</span>
              </h1>
              <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
                Discover our handpicked selections of the best kid-friendly activities, venues, and memorable experiences tailored for your family.
              </p>
              {collections.length > 0 && (
                <div className="mt-8 flex justify-center items-center space-x-4 text-sm text-gray-500 font-medium">
                  <div className="flex -space-x-2">
                    {/* Tiny preview thumbnails for visual interest */}
                    {collections.slice(0, 3).map((c, i) => (
                      <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-gray-100 overflow-hidden flex items-center justify-center p-1" style={{ zIndex: 3 - i }}>
                        <img 
                          src={c.iconAsset?.url || c.icon || generatePlaceholder({width:32,height:32,text:c.title.slice(0,1)})} 
                          alt="" 
                          className="w-full h-full object-contain"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      </div>
                    ))}
                  </div>
                  <span>{collections.length} Curated Collection{collections.length !== 1 ? 's' : ''}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Error banner */}
        {usingMockData && error && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
            <div className="bg-orange-50/80 backdrop-blur-sm border border-orange-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-orange-100 text-orange-500 rounded-full">⚠️</div>
                  <span className="text-sm font-medium text-orange-800">{error}</span>
                </div>
                <button
                  onClick={() => fetchCollections(true)}
                  className="flex items-center space-x-1.5 text-xs font-semibold bg-white border border-orange-200 hover:bg-orange-50 hover:text-orange-600 text-orange-800 px-3 py-1.5 rounded-lg transition-all shadow-sm"
                >
                  <FaRedo size={10} className={isLoading ? "animate-spin" : ""} />
                  <span>Retry Connection</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Filters and Search - Modern Floating Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
          <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 p-4 mb-10 sticky top-24 z-20">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              {/* Search */}
              <div className="flex-1 w-full relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FaSearch className="text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                </div>
                <input
                  type="text"
                  placeholder="Find your next adventure..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all text-gray-900 placeholder-gray-400 font-medium"
                />
              </div>

              <div className="flex w-full md:w-auto gap-4">
                {/* Category Filter */}
                <div className="flex-1 md:flex-none relative">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full md:w-48 appearance-none pl-4 pr-10 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all text-gray-700 font-medium cursor-pointer"
                  >
                    <option value="">All Categories</option>
                    {getUniqueCategories().map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>

                {/* Sort By */}
                <div className="flex-1 md:flex-none relative">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full md:w-48 appearance-none pl-4 pr-10 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all text-gray-700 font-medium cursor-pointer"
                  >
                    <option value="sortOrder">Curated Order</option>
                    <option value="title">Alphabetical</option>
                    <option value="category">By Category</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Collections Grid - Premium Cards */}
          {filteredCollections.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {filteredCollections.map((collection, index) => {
                // Ensure icon source is valid using new iconAsset property if available
                const iconSrc = collection.iconAsset?.url || collection.icon;
                
                return (
                  <div
                    key={collection._id || collection.id || index}
                    onClick={() => handleCollectionClick(collection)}
                    className="group bg-white rounded-2xl border border-gray-100 overflow-hidden cursor-pointer transition-all duration-400 hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] hover:-translate-y-1 relative flex flex-col h-full"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleCollectionClick(collection);
                      }
                    }}
                    style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'both' }}
                    aria-label={`Explore ${collection.title} collection`}
                  >
                    {/* Colorful accent line at top */}
                    <div className="h-1.5 w-full bg-gradient-to-r from-blue-400 to-cyan-400 group-hover:from-orange-400 group-hover:to-pink-500 transition-all duration-500"></div>
                    
                    <div className="p-8 flex-1 flex flex-col text-center items-center justify-start relative z-10">
                      {/* Collection Icon with correct opacity fix (rgba bg instead of wrapper opacity) */}
                      <div className="w-20 h-20 mb-6 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 relative"
                        style={{ backgroundColor: 'rgba(109, 176, 225, 0.1)' }}
                      >
                        {/* Glow effect on hover */}
                        <div className="absolute inset-0 rounded-2xl bg-blue-400 opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500"></div>
                        
                        <img
                          src={iconSrc}
                          alt={collection.title}
                          className="w-12 h-12 object-contain relative z-10 transition-transform duration-500"
                          loading="lazy"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = generatePlaceholder({
                              width: 80,
                              height: 80,
                              text: collection.title.slice(0, 2),
                              backgroundColor: '#f0f4f8',
                              textColor: '#64748b'
                            });
                          }}
                        />
                      </div>

                      {/* Collection Category Pill */}
                      {collection.category && (
                        <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase mb-4 transition-colors"
                          style={{ backgroundColor: 'rgba(255, 107, 0, 0.08)', color: '#FF6B00' }}
                        >
                          {collection.category}
                        </div>
                      )}

                      {/* Collection Info */}
                      <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                        {collection.title}
                      </h3>

                      <p className="text-sm font-medium text-gray-400 mb-4 bg-gray-50 px-3 py-1 rounded-lg inline-block">
                        {collection.eventsCount ? `${collection.eventsCount}+ activities` : collection.count || `${collection.events?.length || 0} activities`}
                      </p>

                      <p className="text-gray-600 text-sm leading-relaxed mb-6 line-clamp-3 group-hover:text-gray-700 transition-colors flex-1">
                        {collection.description}
                      </p>

                      {/* Explore Button / Call to Action */}
                      <div className="w-full mt-auto pt-4 border-t border-gray-50 flex items-center justify-between">
                        <span className="text-sm font-semibold text-blue-600 group-hover:text-orange-500 transition-colors">
                          Explore Collection
                        </span>
                        <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center transition-all duration-300 group-hover:bg-orange-500 group-hover:text-white group-hover:shadow-md">
                          <FaChevronRight size={12} className="transform group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm max-w-3xl mx-auto">
              <div className="w-24 h-24 mx-auto mb-6 bg-gray-50 rounded-full flex items-center justify-center">
                <span className="text-gray-300 text-5xl">🧭</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                {searchQuery || selectedCategory ? 'No matches found' : 'Collections coming soon'}
              </h3>
              <p className="text-gray-500 text-lg mb-8 max-w-md mx-auto">
                {searchQuery || selectedCategory
                  ? 'We couldn\'t find any collections matching your filters. Try exploring different terms or categories.'
                  : 'We are currently curating the best experiences. Check back soon for amazing new collections.'
                }
              </p>
              {(searchQuery || selectedCategory) && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('');
                  }}
                  className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors shadow-sm hover:shadow"
                >
                  <FaRedo size={12} />
                  <span>Clear All Filters</span>
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