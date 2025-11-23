import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaSearch, FaChevronLeft, FaChevronRight, FaStar, FaMapMarkerAlt, FaRedo, FaWifi, FaCalendar } from 'react-icons/fa';
import { PageTransition, FadeIn, SlideIn, ScaleIn, StaggerContainer, NumberCounter, ScrollReveal, HoverCard, AnimatedButton } from '@/components/animations';
import { useDispatch, useSelector } from 'react-redux';
import { useKeenSlider } from 'keen-slider/react';
import 'keen-slider/keen-slider.min.css';
import EventGridSection from '@/components/client/EventGridSection';
import CollectionsCarousel from '@/components/client/CollectionsCarousel';
import CategoryCarousel from '@/components/client/CategoryCarousel';
import NewsletterSubscribe from '@/components/client/NewsletterSubscribe';
import eventsAPI from '../services/api/eventsAPI';
import categoriesAPI from '../services/api/categoriesAPI';
import ReviewCarouselSwiper from '@/components/client/ReviewCarouselKeen';
import FeaturedBlogsSection from '@/components/sections/FeaturedBlogsSection';
import { HomeSEO } from '@/components/common/SEO';
import { Event } from '../types/event';
import { Review } from '../types/review';
import { getPlaceholderUrl, handleImageError } from '../utils/placeholderImage';

// Mock data for when backend is unavailable
const mockEvents = [
  {
    id: '1',
    title: 'Kids Fun Day',
    description: 'A day full of fun activities for kids of all ages.',
    image: getPlaceholderUrl('eventCard', 'Kids Fun Day'),
    price: 25,
    date: '2023-12-15',
    location: 'Central Park',
    category: 'Entertainment'
  },
  {
    id: '2',
    title: 'Science Workshop',
    description: 'Interactive science experiments for curious minds.',
    image: getPlaceholderUrl('eventCard', 'Science Workshop'),
    price: 30,
    date: '2023-12-20',
    location: 'Science Museum',
    category: 'Education'
  },
  {
    id: '3',
    title: 'Art & Craft Session',
    description: 'Creative art and craft activities for children.',
    image: getPlaceholderUrl('eventCard', 'Art & Craft'),
    price: 20,
    date: '2023-12-18',
    location: 'Community Center',
    category: 'Arts'
  }
];

const mockCategories = [
  { id: '1', name: 'Entertainment', icon: '🎭' },
  { id: '2', name: 'Education', icon: '📚' },
  { id: '3', name: 'Arts', icon: '🎨' },
  { id: '4', name: 'Sports', icon: '⚽' },
  { id: '5', name: 'Adventure', icon: '🏕️' }
];

// Helper function to get category icons
const getCategoryIcon = (categoryName: string): string => {
  const iconMap: { [key: string]: string } = {
    'Family & Kids': '👨‍👩‍👧‍👦',
    'Technology': '💻',
    'Sports & Recreation': '⚽',
    'Music': '🎵',
    'Art & Culture': '🎨',
    'Culture & Heritage': '🏛️',
    'Business': '💼',
    'Food & Dining': '🍽️',
    'Health & Wellness': '🧘‍♀️',
    'Entertainment': '🎭',
    'Education': '📚',
    'Arts': '🎨',
    'Sports': '⚽',
    'Adventure': '🏕️'
  };
  return iconMap[categoryName] || '📅';
};

interface FeaturedEvent extends Event {
  buttonLabel: string;
  image: string; // For backward compatibility with existing image display logic
}

// Enhanced image component with lazy loading and fallback
const LazyImage: React.FC<{
  src: string;
  alt: string;
  className?: string;
  fallbackSrc?: string;
}> = ({ src, alt, className = '', fallbackSrc = getPlaceholderUrl('eventCard', 'Loading...') }) => {
  const [imageSrc, setImageSrc] = useState(fallbackSrc);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImageSrc(src);
      setIsLoading(false);
    };
    img.onerror = () => {
      setHasError(true);
      setIsLoading(false);
    };
    img.src = src;
  }, [src]);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <img
        ref={imgRef}
        src={imageSrc}
        alt={alt}
        className={`w-full h-full object-cover transition-all duration-500 ${
          isLoading ? 'blur-sm opacity-70' : 'opacity-100'
        }`}
        loading="lazy"
      />
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2" style={{ borderColor: 'var(--primary-color)' }}></div>
        </div>
      )}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-700">
          <div className="text-center">
            <div className="text-2xl mb-2">📷</div>
            <p className="text-sm">Image unavailable</p>
          </div>
        </div>
      )}
    </div>
  );
};

const Banner = ({ categories }: { categories: any[] }) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handlePopularSearch = (query: string) => {
    navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  const handleCategorySearch = (categoryName: string) => {
    navigate(`/search?category=${encodeURIComponent(categoryName.toLowerCase())}`);
  };

  return (
    <section
      className="relative w-full text-white overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, var(--primary-color) 0%, #1e40af 50%, var(--secondary-color) 100%)',
        backgroundSize: '400% 400%',
        animation: 'gradientShift 8s ease infinite'
      }}
    >
      <style jsx="true">{`
        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>
      {/* Enhanced decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <ScaleIn delay={0.3}>
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-20" 
            style={{ 
              background: 'radial-gradient(circle, var(--accent-color) 0%, transparent 70%)', 
              filter: 'blur(60px)', 
              transform: 'translate(20%, -30%)',
              animation: 'float 6s ease-in-out infinite'
            }}>
          </div>
        </ScaleIn>
        <ScaleIn delay={0.5}>
          <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full opacity-15" 
            style={{ 
              background: 'radial-gradient(circle, #ffffff 0%, transparent 70%)', 
              filter: 'blur(70px)', 
              transform: 'translate(-30%, 30%)',
              animation: 'float 8s ease-in-out infinite reverse'
            }}>
          </div>
        </ScaleIn>
        <ScaleIn delay={0.7}>
          <div className="absolute top-1/2 left-1/2 w-40 h-40 rounded-full opacity-10" 
            style={{ 
              background: 'var(--accent-color)', 
              filter: 'blur(40px)', 
              transform: 'translate(-50%, -50%)',
              animation: 'pulse 4s ease-in-out infinite'
            }}>
          </div>
        </ScaleIn>
      </div>
      <style jsx="true">{`
        @keyframes float {
          0%, 100% { transform: translate(20%, -30%) translateY(0px); }
          50% { transform: translate(20%, -30%) translateY(-20px); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.1; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 0.2; transform: translate(-50%, -50%) scale(1.1); }
        }
      `}</style>
      
      <StaggerContainer staggerDelay={0.1} className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center relative z-10">
        {/* Badge */}
        <SlideIn direction="down" delay={0.1}>
          <div className="inline-block mb-4 sm:mb-6 px-3 sm:px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm">
            <span className="font-semibold text-white text-sm sm:text-base">Discover Fun Activities</span>
          </div>
        </SlideIn>
        
        {/* Heading */}
        <FadeIn delay={0.2}>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-4 sm:mb-6 px-2">
            Find the best places to <br className="hidden sm:block" />
            take your kids in <span style={{ color: 'var(--accent-color)' }}>The UAE</span>
          </h1>
        </FadeIn>

        {/* Subheading */}
        <FadeIn delay={0.3}>
          <p className="mt-4 text-white font-medium text-lg sm:text-xl max-w-2xl mx-auto">
            Our pick of the best kids activities in Dubai, Abu Dhabi and the rest of the UAE
          </p>
        </FadeIn>

        {/* Search Box */}
        <SlideIn direction="up" delay={0.4}>
          <form onSubmit={handleSearch} className="mt-10 flex justify-center">
            <div className="flex w-full max-w-2xl rounded-2xl overflow-hidden bg-white/95 backdrop-blur-sm shadow-2xl transition-all duration-500 hover:shadow-3xl hover:bg-white group">
              <input
                type="text"
                id="homepage-search"
                name="homepage-search"
                placeholder="Find the best kids' activities..."
                className="flex-grow px-6 py-5 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-0 bg-transparent text-lg"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search for kids activities"
              />
              <button 
                type="submit"
                style={{ backgroundColor: 'var(--accent-color)' }} 
                className="px-8 py-5 text-white flex items-center justify-center hover:opacity-90 transition-all duration-300 hover:shadow-lg transform hover:scale-105"
                aria-label="Search button"
              >
                <FaSearch className="mr-2" size={18} />
                <span className="font-semibold text-lg">Search</span>
              </button>
            </div>
          </form>
        </SlideIn>
        
        {/* Popular searches */}
        <FadeIn delay={0.5}>
          <div className="mt-4 flex flex-wrap justify-center gap-2 text-sm">
            <span key="popular-label" className="text-white/70">Popular:</span>
            {categories.slice(0, 2).map((category, index) => (
              <button
                key={category._id || category.id || `category-${index}`}
                onClick={() => handleCategorySearch(category.name)}
                className="text-white hover:text-white/80 transition-colors duration-300 underline underline-offset-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/50 rounded px-1"
                aria-label={`Search for ${category.name}`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </FadeIn>
      </StaggerContainer>
    </section>
  );
};
const FeaturedEventsCarousel: React.FC<{ featuredEvents: FeaturedEvent[] }> = ({ featuredEvents }) => {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [sliderRef, instanceRef] = useKeenSlider<HTMLDivElement>({
    loop: true,
    slides: {
      perView: 1,
      spacing: 20,
    },
    breakpoints: {
      '(min-width: 768px)': {
        slides: { perView: 2, spacing: 24 },
      },
      '(min-width: 1024px)': {
        slides: { perView: 3, spacing: 30 },
      },
    },
    slideChanged(slider) {
      setCurrentSlide(slider.track.details.rel);
    },
    created() {
      setLoaded(true);
    },
  });

  return (
    <div className="px-6 py-16 max-w-screen-xl mx-auto">
      <StaggerContainer className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <SlideIn direction="left">
            <div className="inline-block mb-4 px-4 py-2 rounded-full" style={{ backgroundColor: 'rgba(0, 142, 199, 0.1)' }}>
              <span className="font-semibold text-gray-900">Featured</span>
            </div>
          </SlideIn>
          <FadeIn delay={0.1}>
            <h2 className="text-3xl font-bold mb-2">✨ Featured Events</h2>
          </FadeIn>
          <FadeIn delay={0.2}>
            <p className="text-gray-700">Discover our most popular activities for kids</p>
          </FadeIn>
        </div>
        <AnimatedButton
          className="mt-4 md:mt-0 flex items-center gap-2 font-medium text-gray-900 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
          onClick={() => navigate('/search')}
          aria-label="View all events"
        >
          View All Events <FaChevronRight size={14} aria-hidden="true" />
        </AnimatedButton>
      </StaggerContainer>
      
      <div className="relative">
        <div ref={sliderRef} className="keen-slider min-h-[400px]">
          {featuredEvents && featuredEvents.length > 0 ? featuredEvents.map((event, index) => (
            <HoverCard
              key={index}
              className="keen-slider__slide bg-white rounded-2xl shadow-lg hover:shadow-2xl overflow-hidden group transition-all duration-500 border border-gray-100 hover:border-gray-200 transform hover:-translate-y-2"
            >
              <div className="relative overflow-hidden">
                <LazyImage
                  src={event.image}
                  alt={event.title}
                  className="w-full h-64 transition-transform duration-500 group-hover:scale-105"
                  fallbackSrc={getPlaceholderUrl('eventCard', 'Event Image')}
                />
                <ScaleIn delay={0.1 * index}>
                  <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 text-sm font-semibold text-gray-900 shadow-sm">
                    Featured
                  </div>
                </ScaleIn>
              </div>
              <div className="p-6">
                <FadeIn delay={0.1}>
                  <h3 className="text-xl font-semibold mb-4 line-clamp-2 text-gray-900">{event.title}</h3>
                </FadeIn>
                {event.description && (
                  <FadeIn delay={0.15}>
                    <p className="text-gray-700 text-sm mb-4 line-clamp-2">{event.description}</p>
                  </FadeIn>
                )}
                <div className="flex flex-col gap-3 mb-4">
                  {event.price && (
                    <FadeIn delay={0.2}>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold" style={{ color: 'var(--accent-color)' }}>
                          {event.currency || 'AED'} {event.price}
                        </span>
                      </div>
                    </FadeIn>
                  )}
                  {(event.dateSchedule?.length > 0 || event.location) && (
                    <div className="flex flex-col gap-1">
                      {(event.dateSchedule?.[0]?.startDate || event.dateSchedule?.[0]?.date) && (
                        <div className="flex items-center text-sm text-gray-700">
                          <FaCalendar size={12} className="mr-2 text-gray-900" />
                          <span>{new Date(event.dateSchedule[0].startDate || event.dateSchedule[0].date).toLocaleDateString()}</span>
                        </div>
                      )}
                      {event.location?.city && (
                        <div className="flex items-center text-sm text-gray-700">
                          <FaMapMarkerAlt size={12} className="mr-2 text-gray-900" />
                          <span>{event.location.city}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <FadeIn delay={0.25}>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(0, 142, 199, 0.1)' }}>
                        <FaStar size={14} className="text-gray-900" />
                      </div>
                      <span className="text-sm font-medium">4.8 (120 reviews)</span>
                    </div>
                  </FadeIn>
                  <AnimatedButton
                    style={{
                      backgroundColor: 'var(--accent-color, #FF6B00)',
                      boxShadow: '0 4px 14px 0 rgba(255, 107, 0, 0.3)'
                    }}
                    className="text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 hover:opacity-90 hover:shadow-lg hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-95 whitespace-nowrap"
                    onClick={() => navigate(`/events/${event._id}`)}
                    aria-label={`View details for ${event.title}`}>
                    {event.buttonLabel}
                  </AnimatedButton>
                </div>
              </div>
            </HoverCard>
          )) : (
            <div className="keen-slider__slide flex items-center justify-center p-8">
              <FadeIn>
                <div className="text-center py-16 px-6">
                  <div className="w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(0, 142, 199, 0.1)' }}>
                    <div className="text-4xl">🎪</div>
                  </div>
                  <h3 className="text-xl font-semibold mb-3 text-gray-700">No Events Yet</h3>
                  <p className="text-gray-700 mb-6 max-w-md mx-auto">We're working on bringing you amazing events. Check back soon for exciting activities!</p>
                  <AnimatedButton 
                    onClick={() => navigate('/search')} 
                    className="px-6 py-3 text-white rounded-lg font-medium transition-all duration-300 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                    style={{ backgroundColor: 'var(--accent-color)' }}
                    aria-label="Explore all events"
                  >
                    Explore All Events
                  </AnimatedButton>
                </div>
              </FadeIn>
            </div>
          )}
        </div>
        
        {loaded && instanceRef.current && (
          <FadeIn delay={0.3}>
            <div className="flex justify-center gap-3 mt-6">
              <AnimatedButton
                onClick={() => instanceRef.current?.prev()}
                className="w-10 h-10 rounded-full flex items-center justify-center border border-gray-900 text-gray-900 transition-all duration-300"
                aria-label="Previous events"
              >
                <FaChevronLeft size={14} />
              </AnimatedButton>
              <AnimatedButton
                onClick={() => instanceRef.current?.next()}
                className="w-10 h-10 rounded-full flex items-center justify-center border border-gray-900 text-gray-900 transition-all duration-300"
                aria-label="Next events"
              >
                <FaChevronRight size={14} />
              </AnimatedButton>
            </div>
          </FadeIn>
        )}
      </div>
    </div>
  );
}

const StatsSection = ({ stats }: { stats: any }) => {
  return (
    <section className="w-full py-16 px-6" style={{ backgroundColor: 'rgba(0, 142, 199, 0.05)' }}>
      <div className="max-w-6xl mx-auto">
        <StaggerContainer className="text-center mb-12">
          <SlideIn direction="down">
            <div className="inline-block mb-4 px-4 py-2 rounded-full" style={{ backgroundColor: 'rgba(0, 142, 199, 0.1)' }}>
              <span className="font-semibold text-gray-900">Our Impact</span>
            </div>
          </SlideIn>
          <FadeIn delay={0.1}>
            <h2 className="text-3xl font-bold mb-4">Trusted by families across UAE</h2>
          </FadeIn>
          <FadeIn delay={0.2}>
            <p className="text-gray-700 max-w-2xl mx-auto">Helping parents discover and book the best activities for their children since 2017</p>
          </FadeIn>
        </StaggerContainer>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Trusted Partners Card */}
          <HoverCard className="bg-white rounded-2xl shadow-lg hover:shadow-2xl p-8 flex flex-col items-center text-center transition-all duration-500 border border-gray-100 hover:border-gray-200 transform hover:-translate-y-2">
            <div className="mb-4" style={{ color: 'var(--accent-color)' }}>
              <div className="relative">
                <FaStar size={36} />
                <FaStar className="absolute -top-2 right-0 text-sm" size={16} />
                <FaStar className="absolute -top-4 right-2 text-xs" size={12} />
              </div>
            </div>
            <p className="text-xl font-semibold mb-2">
              Trusted by over <span className="text-gray-900">
                <NumberCounter to={stats?.totalVendors || 750} suffix="+" />
              </span>
            </p>
            <p className="text-gray-700">partners since 2017</p>
          </HoverCard>

          {/* Stats Cards */}
          <HoverCard className="bg-white rounded-2xl shadow-lg hover:shadow-2xl p-8 flex flex-col items-center text-center transition-all duration-500 border border-gray-100 hover:border-gray-200 transform hover:-translate-y-2">
            <div className="w-12 h-12 rounded-full mb-4 flex items-center justify-center" style={{ backgroundColor: 'rgba(0, 142, 199, 0.1)' }}>
              <span className="text-xl font-bold">🎯</span>
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-2">
              <NumberCounter to={stats?.totalEvents || 2500} suffix="+" />
            </p>
            <p className="text-gray-700">Experiences</p>
          </HoverCard>

          <HoverCard className="bg-white rounded-2xl shadow-lg hover:shadow-2xl p-8 flex flex-col items-center text-center transition-all duration-500 border border-gray-100 hover:border-gray-200 transform hover:-translate-y-2">
            <div className="w-12 h-12 rounded-full mb-4 flex items-center justify-center" style={{ backgroundColor: 'rgba(0, 142, 199, 0.1)' }}>
              <span className="text-xl font-bold">🏢</span>
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-2">
              <NumberCounter to={stats?.totalVenues || 500} suffix="+" />
            </p>
            <p className="text-gray-700">Venue & Events</p>
          </HoverCard>

          <HoverCard className="bg-white rounded-2xl shadow-lg hover:shadow-2xl p-8 flex flex-col items-center text-center transition-all duration-500 border border-gray-100 hover:border-gray-200 transform hover:-translate-y-2">
            <div className="w-12 h-12 rounded-full mb-4 flex items-center justify-center" style={{ backgroundColor: 'rgba(0, 142, 199, 0.1)' }}>
              <span className="text-xl font-bold">🎓</span>
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-2">
              <NumberCounter to={stats?.totalClasses || stats?.totalEvents || 1000} suffix="+" />
            </p>
            <p className="text-gray-700">Classes</p>
          </HoverCard>
        </div>
      </div>
    </section>
  );
};


const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState(mockEvents);
  const [featuredEvents, setFeaturedEvents] = useState<FeaturedEvent[]>([]);
  const [categories, setCategories] = useState(mockCategories);
  const [stats, setStats] = useState<any>(null);
  const [usingMockData, setUsingMockData] = useState(false);
  
  // Enhanced retry functionality
  const fetchData = useCallback(async (isRetry = false) => {
    try {
      if (!isRetry) {
        setIsLoading(true);
      }
      setError(null);
      
      // Fetch real data from backend using API services
      const [eventsData, featuredEventsData, categoriesData] = await Promise.all([
        eventsAPI.getAllEvents({ limit: 12 }),
        eventsAPI.getFeaturedEvents(),
        categoriesAPI.getAllCategories({ tree: false }) // Fetch full category objects from /categories endpoint
      ]);
      
      // Extract data using utility functions for consistency
      const events = eventsData || [];
      const featuredEventsRaw = featuredEventsData?.events || [];
      const categories = Array.isArray(categoriesData) ? categoriesData : [];

      // Debug logging (only in development)
      if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_API === 'true') {
        console.log('HomePage Debug - Processed Data:');
        console.log('events length:', events.length);
        console.log('featuredEvents length:', featuredEventsRaw.length);
        console.log('categories length:', categories.length);
      }
      
      setEvents(Array.isArray(events) ? events : []);
      setFeaturedEvents(
        featuredEventsRaw.length > 0 
          ? featuredEventsRaw.slice(0, 6).map((event: any) => ({
              ...event,
              id: event._id, // Map _id to id for compatibility
              buttonLabel: 'View Details',
              image: event.images?.[0] || getPlaceholderUrl('eventCard', event.title),
              date: event.dateSchedule?.[0]?.startDate || new Date().toISOString(),
              location: event.location || { city: 'Dubai', address: '', coordinates: { lat: 0, lng: 0 } }
            }))
          : events.slice(0, 3).map((event: any) => ({
              ...event,
              id: event._id, // Map _id to id for compatibility
              buttonLabel: 'View Details',
              image: event.images?.[0] || getPlaceholderUrl('eventCard', event.title),
              date: event.dateSchedule?.[0]?.startDate || new Date().toISOString(),
              location: event.location || { city: 'Dubai', address: '', coordinates: { lat: 0, lng: 0 } }
            }))
      );
      // Categories now come from /categories API with full object structure
      setCategories(Array.isArray(categories) ? categories : []);
      setStats(null);
      setUsingMockData(false);
      
    } catch (err: any) {
      console.error('Error fetching data:', err);

      // Determine if it's a timeout/cold start issue
      const isColdStart = err?.message?.includes('starting up') || err?.message?.includes('timeout');
      const errorMsg = isColdStart
        ? 'Backend is waking up (takes 30-60s on first request). Click "Retry" in a moment.'
        : 'Unable to connect to the server. Showing default data.';

      // Use mock data if backend is unavailable
      setEvents(mockEvents);
      setFeaturedEvents(mockEvents.slice(0, 3).map(event => ({
        ...event,
        buttonLabel: 'View Details',
        images: [event.image],
        _id: event.id,
        location: { city: event.location, address: event.location, coordinates: { lat: 0, lng: 0 } },
        vendorId: { _id: '1', firstName: 'Mock', lastName: 'Vendor', email: 'mock@example.com' },
        currency: 'AED' as const,
        type: 'Event' as const,
        venueType: 'Indoor' as const,
        ageRange: [0, 100] as [number, number],
        seoMeta: { title: event.title, description: event.description || '', keywords: [] },
        isApproved: true,
        tags: [],
        dateSchedule: [{ _id: '1', startDate: event.date || new Date().toISOString(), endDate: event.date || new Date().toISOString(), availableSeats: 100, totalSeats: 100, soldSeats: 0, reservedSeats: 0 }],
        faqs: [],
        viewsCount: 0,
        isFeatured: false,
        isDeleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'published'
      })));
      setCategories(mockCategories);
      setUsingMockData(true);
      setError(errorMsg);
    } finally {
      // Always set loading to false after a short delay to prevent flash of loading state
      setTimeout(() => setIsLoading(false), 300);
    }
  }, []);
  
  // Fetch data from backend or use mock data if backend is unavailable
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  // Enhanced skeleton loader component
  const SkeletonLoader = () => (
    <div className="w-full bg-gray-50 animate-pulse">
      {/* Banner Skeleton */}
      <div className="w-full h-96 bg-gradient-to-br from-gray-200 to-gray-300 relative">
        <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4">
          <div className="w-16 h-6 bg-gray-300 rounded-full"></div>
          <div className="w-80 h-12 bg-gray-300 rounded"></div>
          <div className="w-64 h-4 bg-gray-300 rounded"></div>
          <div className="w-96 h-12 bg-gray-300 rounded-lg"></div>
        </div>
      </div>
      
      {/* Featured Events Skeleton */}
      <div className="max-w-screen-xl mx-auto px-6 py-16">
        <div className="flex justify-between items-center mb-8">
          <div>
            <div className="w-20 h-6 bg-gray-200 rounded-full mb-4"></div>
            <div className="w-48 h-8 bg-gray-200 rounded mb-2"></div>
            <div className="w-64 h-4 bg-gray-200 rounded"></div>
          </div>
          <div className="w-32 h-6 bg-gray-200 rounded"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="w-full h-64 bg-gray-200"></div>
              <div className="p-6 space-y-3">
                <div className="w-3/4 h-6 bg-gray-200 rounded"></div>
                <div className="w-full h-4 bg-gray-200 rounded"></div>
                <div className="w-1/2 h-4 bg-gray-200 rounded"></div>
                <div className="flex justify-between items-center mt-4">
                  <div className="w-24 h-4 bg-gray-200 rounded"></div>
                  <div className="w-20 h-8 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Stats Skeleton */}
      <div className="w-full py-16 bg-gray-100">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="w-24 h-6 bg-gray-200 rounded-full mx-auto mb-4"></div>
            <div className="w-64 h-8 bg-gray-200 rounded mx-auto mb-4"></div>
            <div className="w-96 h-4 bg-gray-200 rounded mx-auto"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white rounded-xl shadow-md p-6 text-center">
                <div className="w-12 h-12 bg-gray-200 rounded-full mx-auto mb-4"></div>
                <div className="w-16 h-8 bg-gray-200 rounded mx-auto mb-2"></div>
                <div className="w-20 h-4 bg-gray-200 rounded mx-auto"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <PageTransition>
        <FadeIn>
          <SkeletonLoader />
        </FadeIn>
      </PageTransition>
    );
  }
  
  return (
    <PageTransition>
      <HomeSEO />
      <div className="w-full bg-gray-50">
        {usingMockData && (
          <SlideIn direction="right">
            <div className="max-w-screen-xl mx-auto px-6 py-3 bg-white/90 backdrop-blur-sm border-l-4 rounded-r-lg shadow-lg mt-2" 
              style={{ borderColor: 'var(--accent-color)' }} 
              role="alert"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(255, 165, 0, 0.1)' }}>
                    <FaWifi className="text-orange-500" size={16} />
                  </div>
                  <div className="py-1">
                    <p className="font-semibold text-orange-600">
                      {error?.includes('waking up') || error?.includes('starting up') ? 'Backend Starting' : 'Connection Issue'}
                    </p>
                    <p className="text-sm text-gray-700">{error}</p>
                  </div>
                </div>
                <AnimatedButton
                  onClick={() => fetchData(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-lg transition-all duration-300 font-medium focus:outline-none focus:ring-2 focus:ring-orange-500"
                  aria-label="Retry connection to fetch latest data"
                >
                  <FaRedo size={14} aria-hidden="true" />
                  <span>Retry</span>
                </AnimatedButton>
              </div>
            </div>
          </SlideIn>
        )}
        <Banner categories={categories}/>
        <ScrollReveal>
          <FeaturedEventsCarousel featuredEvents={featuredEvents}/>
        </ScrollReveal>
        <ScrollReveal>
          <EventGridSection events={events}/>
        </ScrollReveal>
        <ScrollReveal>
          <CollectionsCarousel/>
        </ScrollReveal>
        <ScrollReveal>
          <CategoryCarousel categories={categories}/>
        </ScrollReveal>
        <ScrollReveal>
          <NewsletterSubscribe/>
        </ScrollReveal>
        <ScrollReveal>
          <ReviewCarouselSwiper/>
        </ScrollReveal>
        <ScrollReveal>
          <FeaturedBlogsSection/>
        </ScrollReveal>
        <ScrollReveal>
          <StatsSection stats={stats}/>
        </ScrollReveal>
      </div>
    </PageTransition>
  );
};

export default HomePage;