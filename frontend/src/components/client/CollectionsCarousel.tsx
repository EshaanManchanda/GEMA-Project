import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useKeenSlider } from 'keen-slider/react';
import 'keen-slider/keen-slider.min.css';
import { FaChevronRight, FaChevronLeft, FaArrowRight, FaRedo } from 'react-icons/fa';
import collectionsAPI, { Collection } from '../../services/api/collectionsAPI';
import { generatePlaceholder } from '../../utils/placeholderImage';

// Mock data for fallback when API is unavailable
type MockCollection = {
  title: string;
  icon: string;
  count: string;
  description: string;
};

const mockCollections: MockCollection[] = [
  { 
    title: 'Summer Camps', 
    icon: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=80&h=80&fit=crop&crop=center',
    count: '45+ activities',
    description: 'Keep your kids active and engaged during summer break'
  },
  { 
    title: 'Top Daycation Spots', 
    icon: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=80&h=80&fit=crop&crop=center',
    count: '32+ locations',
    description: 'Perfect day trips for the whole family'
  },
  { 
    title: 'Pool, Brunch & more', 
    icon: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=80&h=80&fit=crop&crop=center',
    count: '28+ venues',
    description: 'Relaxing experiences for parents and kids'
  },
  { 
    title: 'Top Kids Play Areas', 
    icon: 'https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?w=80&h=80&fit=crop&crop=center',
    count: '50+ play zones',
    description: 'Safe and fun indoor play experiences'
  },
  { 
    title: 'Waterparks & Splash Fun', 
    icon: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=80&h=80&fit=crop&crop=center',
    count: '15+ parks',
    description: 'Cool off with exciting water activities'
  },
  { 
    title: 'Have A Pool Day', 
    icon: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=80&h=80&fit=crop&crop=center',
    count: '25+ pools',
    description: 'Swimming fun for all ages and abilities'
  },
  { 
    title: 'Plan a Birthday', 
    icon: 'https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=80&h=80&fit=crop&crop=center',
    count: '40+ venues',
    description: 'Unforgettable birthday celebrations'
  },
];

const CollectionsCarousel: React.FC = () => {
  const navigate = useNavigate();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingMockData, setUsingMockData] = useState(false);

  const [sliderRef, instanceRef] = useKeenSlider<HTMLDivElement>({
    loop: true,
    slides: {
      perView: 1.2,
      spacing: 16,
    },
    breakpoints: {
      '(min-width: 640px)': {
        slides: { perView: 2.2, spacing: 16 },
      },
      '(min-width: 768px)': {
        slides: { perView: 3, spacing: 20 },
      },
      '(min-width: 1024px)': {
        slides: { perView: 4, spacing: 20 },
      },
    },
    dragSpeed: 0.8,
    mode: "snap",
  });

  // Fetch collections data
  const fetchCollections = async (isRetry = false) => {
    try {
      if (!isRetry) {
        setIsLoading(true);
      }
      setError(null);

      const response = await collectionsAPI.getAllCollections({ limit: 20 });
      const fetchedCollections = response.collections || [];

      if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_API === 'true') {
        console.log('Collections fetched:', fetchedCollections.length);
      }

      setCollections(fetchedCollections);
      setUsingMockData(false);
    } catch (err) {
      console.error('Error fetching collections:', err);

      // Fallback to mock data
      const mockData: Collection[] = mockCollections.map((mock, index) => ({
        _id: `mock-${index + 1}`,
        id: `mock-${index + 1}`,
        title: mock.title,
        description: mock.description,
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
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCollections();
  }, []);

  const handleCollectionClick = (collection: Collection) => {
    // Navigate to individual collection detail page
    navigate(`/collections/${collection._id}`);
  };

  const handleViewAllClick = () => {
    navigate('/collections');
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <section className="max-w-screen-xl mx-auto px-6 my-20">
        <div className="rounded-2xl p-8 md:p-10 shadow-lg bg-gray-200 animate-pulse"
          style={{ minHeight: '400px' }}
        >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
            <div className="mb-4 md:mb-0">
              <div className="w-20 h-6 bg-gray-300 rounded-full mb-2"></div>
              <div className="w-64 h-8 bg-gray-300 rounded mb-2"></div>
              <div className="w-80 h-4 bg-gray-300 rounded"></div>
            </div>
            <div className="w-32 h-8 bg-gray-300 rounded-full"></div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-gray-300 rounded-xl h-48"></div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="max-w-screen-xl mx-auto px-6 my-20">
      <div className="rounded-2xl p-8 md:p-10 shadow-lg" 
        style={{ 
          background: `linear-gradient(135deg, var(--primary-color) 0%, var(--primary-color) 70%, var(--secondary-color) 140%)` 
        }}
      >
        {/* Error banner */}
        {usingMockData && error && (
          <div className="mb-6 p-4 bg-orange-100/20 border border-orange-200/30 rounded-lg">
            <div className="flex items-center justify-between text-white">
              <div className="flex items-center space-x-2">
                <div className="text-orange-300">⚠️</div>
                <span className="text-sm">{error}</span>
              </div>
              <button
                onClick={() => fetchCollections(true)}
                className="flex items-center space-x-1 text-xs bg-white/20 hover:bg-white/30 px-2 py-1 rounded transition-colors"
              >
                <FaRedo size={10} />
                <span>Retry</span>
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div className="mb-4 md:mb-0">
            <div className="inline-block px-3 py-1 rounded-full text-xs font-medium mb-2"
              style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }}>
              COLLECTIONS
            </div>
            <h2 className="text-white text-3xl font-bold">Kidzapproved Collections</h2>
            <p className="text-white/80 mt-2 max-w-md">
              Curated lists of the best kid-friendly activities and venues
              {collections.length > 0 && (
                <span className="block text-xs mt-1 opacity-75">
                  {collections.length} curated collections available
                </span>
              )}
            </p>
          </div>
          <button
            onClick={handleViewAllClick}
            className="flex items-center gap-2 text-white bg-white/20 hover:bg-white/30 transition-all duration-300 px-4 py-2 rounded-full font-medium focus:outline-none focus:ring-2 focus:ring-white/50"
          >
            View All Collections <FaArrowRight size={14} />
          </button>
        </div>
        
        <div className="relative">
          <div ref={sliderRef} className="keen-slider">
            {collections.length > 0 ? collections.map((item, index) => (
              <div
                key={item._id || item.id || index}
                className="keen-slider__slide !min-h-[280px] !h-auto"
                onClick={() => handleCollectionClick(item)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleCollectionClick(item);
                  }
                }}
                aria-label={`Explore ${item.title} collection`}
              >
                <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer group h-full p-6 flex flex-col items-center justify-center text-center">
                  <div
                    className="w-20 h-20 rounded-full p-4 mb-4 flex items-center justify-center transition-all duration-300 group-hover:scale-110"
                    style={{ backgroundColor: 'var(--secondary-color, #6DB0E1)', opacity: 0.1 }}
                  >
                    <img
                      src={item.icon}
                      alt={item.title}
                      className="h-full w-full object-contain"
                      loading="lazy"
                      onError={(e) => {
                        // Fallback to a local placeholder if image fails to load
                        const target = e.target as HTMLImageElement;
                        target.src = generatePlaceholder({
                          width: 80,
                          height: 80,
                          text: item.title.slice(0, 2),
                          backgroundColor: '#f0f0f0',
                          textColor: '#666666'
                        });
                      }}
                    />
                  </div>
                  <p className="text-base font-semibold mb-1" style={{ color: 'var(--primary-color, #008EC7)' }}>
                    {item.title}
                  </p>
                  <p className="text-xs text-gray-500 mb-2">{item.count}</p>
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">{item.description}</p>
                  <button
                    className="mt-auto w-10 h-10 rounded-full shadow-md flex items-center justify-center transition-all duration-300 group-hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2"
                    style={{ backgroundColor: 'var(--accent-color, #FF6B00)', color: 'white' }}
                    aria-label={`View ${item.title} collection`}
                    tabIndex={-1}
                  >
                    <FaChevronRight size={12} />
                  </button>
                </div>
              </div>
            )) : (
              <div className="keen-slider__slide flex items-center justify-center">
                <div className="text-center text-white p-8">
                  <div className="text-4xl mb-4">📚</div>
                  <h3 className="text-xl font-semibold mb-2">No Collections Yet</h3>
                  <p className="text-white/80 mb-4">We're working on curating amazing collections for you!</p>
                  <button
                    onClick={() => fetchCollections(true)}
                    className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <button
            onClick={() => instanceRef.current?.prev()}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center z-10 hover:shadow-lg"
            style={{ color: 'var(--primary-color, #008EC7)' }}
          >
            <FaChevronLeft size={16} />
          </button>

          <button
            onClick={() => instanceRef.current?.next()}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center z-10 hover:shadow-lg"
            style={{ color: 'var(--primary-color, #008EC7)' }}
          >
            <FaChevronRight size={16} />
          </button>
        </div>
        
        {collections.length > 4 && (
          <div className="flex justify-center mt-8">
            <div className="flex space-x-2">
              {[...Array(Math.min(collections.length, 7))].map((_, i) => (
                <button
                  key={i}
                  onClick={() => instanceRef.current?.moveToIdx(i)}
                  className="w-2 h-2 rounded-full transition-all duration-300 focus:outline-none focus:ring-1 focus:ring-white"
                  style={{
                    backgroundColor: 'white',
                    opacity: instanceRef.current?.track.details.abs === i ? 1 : 0.5
                  }}
                  aria-label={`Go to slide ${i + 1}`}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

// Memoize to prevent re-renders when collections don't change
export default React.memo(CollectionsCarousel);
