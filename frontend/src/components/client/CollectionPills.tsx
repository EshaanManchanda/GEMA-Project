import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaRedo, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import collectionsAPI, { Collection } from '@/services/api/collectionsAPI';
import logger from '@/utils/logger';

// Mock collections for fallback
const mockCollections = [
  { title: 'Winter Camps', icon: '⛄', count: '25+ activities' },
  { title: 'Discover Something New', icon: '🔍', count: '30+ activities' },
  { title: "What's On", icon: '📅', count: '40+ activities' },
  { title: 'Things To Do This December', icon: '🎄', count: '35+ activities' },
  { title: 'Top Kids Play Areas', icon: '🎪', count: '20+ activities' },
  { title: 'Top Experiences', icon: '⭐', count: '28+ activities' },
  { title: 'Picks of the Week', icon: '🏆', count: '15+ activities' },
];

interface CollectionPillsProps {
  maxDisplay?: number;
  collections?: Collection[];  // Optional: if provided, use instead of fetching
}

const CollectionPills: React.FC<CollectionPillsProps> = ({ maxDisplay = 12, collections: propCollections }) => {
  const navigate = useNavigate();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingMockData, setUsingMockData] = useState(false);
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  // Cache dimensions to avoid forced reflows on scroll
  const [dimensions, setDimensions] = useState({ scrollWidth: 0, clientWidth: 0 });

  // Fetch collections data
  const fetchCollections = async (isRetry = false) => {
    try {
      if (!isRetry) {
        setIsLoading(true);
      }
      setError(null);

      const response = await collectionsAPI.getAllCollections({ limit: maxDisplay });
      const fetchedCollections = response.collections || [];

      if (import.meta.env.DEV || import.meta.env.VITE_DEBUG_API === 'true') {
        logger.debug('CollectionPills: Collections fetched:', fetchedCollections.length);
      }

      setCollections(fetchedCollections);
      setUsingMockData(false);

      // Set first collection as active by default
      if (fetchedCollections.length > 0) {
        setActiveCollectionId(fetchedCollections[0]._id || fetchedCollections[0].id);
      }
    } catch (err) {
      logger.error('CollectionPills: Error fetching collections:', err);

      // Fallback to mock data
      const mockData: Collection[] = mockCollections.map((mock, index) => ({
        _id: `mock-${index + 1}`,
        id: `mock-${index + 1}`,
        title: mock.title,
        description: '',
        icon: mock.icon,
        count: mock.count,
        category: undefined,
        events: [],
        isActive: true,
        sortOrder: index,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));

      setCollections(mockData);
      setUsingMockData(true);
      setError('Unable to load latest collections. Showing default content.');

      if (mockData.length > 0) {
        setActiveCollectionId(mockData[0]._id);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Check scroll position with RAF throttling (only reads scrollLeft, not width/height)
  const checkScrollPosition = useCallback(() => {
    if (!scrollContainerRef.current) return;

    // Use requestAnimationFrame for throttling
    requestAnimationFrame(() => {
      if (!scrollContainerRef.current) return;

      // Only read scrollLeft (changes frequently), dimensions are cached
      const scrollLeft = scrollContainerRef.current.scrollLeft;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < dimensions.scrollWidth - dimensions.clientWidth - 10);
    });
  }, [dimensions]);

  // Scroll handlers
  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({
        left: -300,
        behavior: 'smooth'
      });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({
        left: 300,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    // If collections prop is explicitly provided, use it (even if empty — parent controls data)
    if (propCollections !== undefined) {
      setCollections(propCollections);
      setIsLoading(false);
      setUsingMockData(false);
      if (propCollections.length > 0) {
        setActiveCollectionId(propCollections[0]._id || propCollections[0].id);
      }
      return;
    }

    // Otherwise fetch (for when used standalone outside HomePage)
    fetchCollections();
  }, [propCollections]);

  // Cache dimensions using ResizeObserver (only updates on actual size changes)
  useEffect(() => {
    if (!scrollContainerRef.current) return;

    const updateDimensions = () => {
      if (scrollContainerRef.current) {
        setDimensions({
          scrollWidth: scrollContainerRef.current.scrollWidth,
          clientWidth: scrollContainerRef.current.clientWidth
        });
      }
    };

    updateDimensions();
    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(scrollContainerRef.current);

    return () => resizeObserver.disconnect();
  }, [collections]);

  // Attach scroll listener with passive flag for better performance
  useEffect(() => {
    checkScrollPosition();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScrollPosition, { passive: true });
      return () => {
        container.removeEventListener('scroll', checkScrollPosition);
      };
    }
    return;
  }, [checkScrollPosition]);

  const handleCollectionClick = (collection: Collection) => {
    const collectionId = collection._id || collection.id;
    setActiveCollectionId(collectionId);
    navigate(`/collections/${collection.slug || collection._id}`);
  };

  const handleRetry = () => {
    fetchCollections(true);
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <section className="w-full px-4 sm:px-6 py-12 sm:py-16 bg-white">
        <div className="max-w-screen-xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4">
            <div className="w-full sm:w-auto">
              <div className="w-24 h-6 bg-gray-200 rounded-full mb-3 animate-pulse"></div>
              <div className="w-48 h-8 bg-gray-200 rounded mb-2 animate-pulse"></div>
              <div className="w-64 h-4 bg-gray-200 rounded animate-pulse"></div>
            </div>
            <div className="w-24 h-6 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="flex gap-3 overflow-hidden">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-12 w-36 bg-gray-200 rounded-full animate-pulse flex-shrink-0" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Empty state
  if (collections.length === 0 && !usingMockData) {
    return (
      <section className="w-full px-4 sm:px-6 py-12 sm:py-16 bg-white">
        <div className="max-w-screen-xl mx-auto">
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center bg-[#005580]/10">
              <span className="text-3xl">📚</span>
            </div>
            <h3 className="text-xl font-semibold mb-2 text-gray-900">No Collections Available</h3>
            <p className="text-gray-600 mb-6">We're working on creating amazing collections for you.</p>
            <button
              onClick={handleRetry}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all duration-300 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#005580] text-white bg-[#005580] hover:bg-[#004466]"
              aria-label="Try again to load collections"
            >
              <FaRedo size={14} />
              <span>Try Again</span>
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="w-full">
      <div className="max-w-screen-xl mx-auto">
        {/* Error banner (optional, non-intrusive) */}
        {usingMockData && error && (
          <div className="mb-6 px-4 py-3 bg-orange-50 border-l-4 border-orange-400 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <p className="text-sm text-orange-800 flex-1">{error}</p>
            <button
              onClick={handleRetry}
              className="flex items-center gap-2 px-4 py-2 bg-orange-100 hover:bg-orange-200 text-orange-800 rounded-lg text-sm font-medium transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-orange-500 whitespace-nowrap"
              aria-label="Retry loading collections"
            >
              <FaRedo size={12} />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* Carousel Container */}
        <div className="relative flex items-center justify-center pb-8 md:pb-0 md:mx-8" style={{ minHeight: '80px' }}>
          {/* Left Navigation Arrow */}
          {canScrollLeft && (
            <button
              onClick={scrollLeft}
              className="hidden md:flex absolute -left-6 top-1/2 -translate-y-1/2 z-10 w-10 h-10 items-center justify-center rounded-full bg-white border-2 border-[#005580] text-[#005580] hover:bg-[#005580] hover:text-white transition-all duration-300 shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-[#005580] focus:ring-offset-2"
              aria-label="Scroll left"
            >
              <FaChevronLeft size={16} />
            </button>
          )}

          {/* Pills Container */}
          <div
            ref={scrollContainerRef}
            className="flex gap-2 sm:gap-3 overflow-x-auto scrollbar-hide scroll-smooth px-1 py-3 items-center"
            role="list"
            aria-label="Collections list"
          >
            {collections.map((collection, index) => {
              const collectionId = collection._id || collection.id;
              const isActive = activeCollectionId === collectionId;

              return (
                <div key={collectionId || index} role="listitem">
                  <button
                    onClick={() => handleCollectionClick(collection)}
                    className={`
                      flex-shrink-0 px-5 sm:px-6 py-2.5 sm:py-3 rounded-full
                      font-medium text-sm sm:text-base whitespace-nowrap
                      transition-all duration-300 transform
                      focus:outline-none focus:ring-2 focus:ring-[#005580] focus:ring-offset-2
                      ${isActive
                        ? 'bg-[#005580] text-white border-2 border-[#005580] shadow-lg hover:bg-[#004466] hover:shadow-xl hover:scale-110'
                        : 'bg-white text-[#005580] border-2 border-[#005580]/30 hover:border-[#005580] hover:bg-[#005580]/10 hover:shadow-lg hover:scale-105 shadow-sm'
                      }
                    `}
                    aria-label={`View ${collection.title} collection`}
                    aria-pressed={isActive}
                    tabIndex={0}
                  >
                    {collection.title}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Right Navigation Arrow */}
          {canScrollRight && (
            <button
              onClick={scrollRight}
              className="hidden md:flex absolute -right-6 top-1/2 -translate-y-1/2 z-10 w-10 h-10 items-center justify-center rounded-full bg-white border-2 border-[#005580] text-[#005580] hover:bg-[#005580] hover:text-white transition-all duration-300 shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-[#005580] focus:ring-offset-2"
              aria-label="Scroll right"
            >
              <FaChevronRight size={16} />
            </button>
          )}

          {/* Mobile scroll indicators */}
          <div className="md:hidden absolute -bottom-8 left-1/2 -translate-x-1/2 flex justify-center gap-1">
            <div className={`h-1 rounded-full transition-all duration-300 ${canScrollLeft ? 'w-8 bg-[#005580]' : 'w-2 bg-gray-300'}`} />
            <div className={`h-1 rounded-full transition-all duration-300 ${canScrollRight ? 'w-8 bg-[#005580]' : 'w-2 bg-gray-300'}`} />
          </div>
        </div>

        {/* CSS for hiding scrollbar */}
        <style>{`
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
          .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `}</style>
      </div>
    </section>
  );
};

export default React.memo(CollectionPills);
