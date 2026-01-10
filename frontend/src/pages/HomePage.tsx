import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaSearch, FaChevronLeft, FaChevronRight, FaStar, FaMapMarkerAlt, FaRedo, FaWifi, FaCalendar } from 'react-icons/fa';
import { PageTransition, FadeIn, SlideIn, ScaleIn, StaggerContainer, NumberCounter, ScrollReveal, AnimatedButton } from '@/components/animations';
import { useDispatch, useSelector } from 'react-redux';
import DOMPurify from 'isomorphic-dompurify';
import { useKeenSlider } from 'keen-slider/react';
import 'keen-slider/keen-slider.min.css';
import EventGridSection from '@/components/client/EventGridSection';
import EventCard from '@/components/client/EventCard';
import CollectionSection from '@/components/client/CollectionSection';
import CollectionsCarousel from '@/components/client/CollectionsCarousel';
import CollectionPills from '@/components/client/CollectionPills';
import CategoryCarousel from '@/components/client/CategoryCarousel';
import BannerCarousel from '@/components/client/BannerCarousel';
import NewsletterSubscribe from '@/components/client/NewsletterSubscribe';
import bannerAPI from '@/services/api/bannerAPI';
import { useQuery } from '@tanstack/react-query';
import { useHomepageQuery } from '@/hooks/queries/useHomepageQuery';
import ReviewCarouselSwiper from '@/components/client/ReviewCarouselKeen';
import FeaturedBlogsSection from '@/components/sections/FeaturedBlogsSection';
import ReelsFeed from '@/components/client/ReelsFeed';
// import TrustSignals from '@/components/sections/TrustSignals';
// import HowItWorks from '@/components/sections/HowItWorks';
import WhyChooseUs from '@/components/sections/WhyChooseUs';
import HomepageFAQs from '@/components/sections/HomepageFAQs';
import GiftCardPromo from '@/components/sections/GiftCardPromo';
import CitiesSection from '@/components/sections/CitiesSection';
import FeaturedInstructors from '@/components/sections/FeaturedInstructors';
import { HomeSEO } from '@/components/common/SEO';
import { selectSocialSettings } from '@/store/slices/settingsSlice';
import type { Event as UIEvent } from '@/components/client/CollectionSection.types';
import type { Event as ApiEvent } from '../types/event';
import { getPlaceholderUrl, handleImageError } from '../utils/placeholderImage';

// Helper to map API Event to UI Event
const mapToUIEvent = (event: ApiEvent): UIEvent => ({
  id: event._id,
  title: event.title,
  description: event.description,
  image: event.images?.[0], // Map first image
  images: event.images,
  price: event.price,
  currency: event.currency,
  category: event.category,
  categories: event.tags, // approximate mapping
  isFeatured: event.isFeatured,
  viewsCount: event.viewsCount,
  // dateSchedule mapping: UI expects startDate/endDate, API has startDateTime/endDateTime
  dateSchedule: event.dateSchedule?.map(ds => ({
    startDate: ds.startDateTime,
    endDate: ds.endDateTime
  })),
  date: event.dateSchedule?.[0]?.startDateTime, // fallback date
  location: event.location,
  vendorId: event.vendorId ? { businessName: `${event.vendorId.firstName} ${event.vendorId.lastName}` } : undefined,
  // Add missing fields or defaults
  ageGroup: event.ageRange ? `${event.ageRange[0]}-${event.ageRange[1]}` : undefined,
  // These fields might be missing in API type but useful if they exist at runtime or need defaults
  rating: 0, // Default if missing
  reviewsCount: 0, // Default if missing
});

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
  { _id: '1', id: '1', name: 'Entertainment', slug: 'entertainment', icon: '🎭', eventCount: 0, isActive: true, level: 0, sortOrder: 0 },
  { _id: '2', id: '2', name: 'Education', slug: 'education', icon: '📚', eventCount: 0, isActive: true, level: 0, sortOrder: 1 },
  { _id: '3', id: '3', name: 'Arts', slug: 'arts', icon: '🎨', eventCount: 0, isActive: true, level: 0, sortOrder: 2 },
  { _id: '4', id: '4', name: 'Sports', slug: 'sports', icon: '⚽', eventCount: 0, isActive: true, level: 0, sortOrder: 3 },
  { _id: '5', id: '5', name: 'Adventure', slug: 'adventure', icon: '🏕️', eventCount: 0, isActive: true, level: 0, sortOrder: 4 }
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

interface FeaturedEvent extends UIEvent {
  buttonLabel: string;
  image: string; // Ensure at least string is returned
}

// Autoplay plugin for Keen-Slider
const AutoplayPlugin = (slider: any) => {
  let timeout: NodeJS.Timeout;
  let mouseOver = false;

  function clearNextTimeout() {
    clearTimeout(timeout);
  }

  function nextTimeout() {
    clearTimeout(timeout);
    if (mouseOver) return;
    timeout = setTimeout(() => {
      slider.next();
    }, 5000);
  }

  slider.on("created", () => {
    slider.container.addEventListener("mouseover", () => {
      mouseOver = true;
      clearNextTimeout();
    });
    slider.container.addEventListener("mouseout", () => {
      mouseOver = false;
      nextTimeout();
    });
    nextTimeout();
  });

  slider.on("animationEnded", nextTimeout);
  slider.on("updated", nextTimeout);
};

// @ts-ignore - Old Banner component kept for reference
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
      className="relative w-full text-white overflow-hidden min-h-[600px] md:min-h-[700px]"
      style={{
        backgroundImage: 'url(/assets/images/header-background.png), linear-gradient(135deg, var(--primary-color) 0%, #1e40af 50%, var(--secondary-color) 100%)',
        backgroundSize: 'cover, 400% 400%',
        backgroundPosition: 'center, 0% 50%',
        animation: 'gradientShift 8s ease infinite'
      }}
    >
      <style jsx="true">{`
        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <ScaleIn delay={0.3}>
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10"
            style={{
              background: 'radial-gradient(circle, var(--accent-color) 0%, transparent 70%)',
              filter: 'blur(60px)',
              transform: 'translate(20%, -30%)',
              animation: 'float 6s ease-in-out infinite'
            }}>
          </div>
        </ScaleIn>
        <ScaleIn delay={0.5}>
          <div className="absolute bottom-0 left-0 w-52 h-52 rounded-full"
            style={{
              background: 'radial-gradient(circle, #ffffff 0%, transparent 70%)',
              filter: 'blur(70px)',
              transform: 'translate(-30%, 30%)',
              animation: 'float 8s ease-in-out infinite reverse',
              opacity: 0.08
            }}>
          </div>
        </ScaleIn>
        <ScaleIn delay={0.7}>
          <div className="absolute top-1/2 left-1/2 w-24 h-24 rounded-full"
            style={{
              background: 'var(--accent-color)',
              filter: 'blur(40px)',
              transform: 'translate(-50%, -50%)',
              animation: 'pulse 4s ease-in-out infinite',
              opacity: 0.05
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
        <SlideIn direction="down" delay={0.1}>
          <div className="inline-block mb-4 sm:mb-6 px-3 sm:px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm">
            <span className="font-semibold text-white text-sm sm:text-base">Discover Fun Activities</span>
          </div>
        </SlideIn>

        <FadeIn delay={0.2}>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-4 sm:mb-6 px-2">
            Find the best places to <br className="hidden sm:block" />
            take your kids in <span style={{ color: 'var(--accent-color)' }}>The UAE</span>
          </h1>
        </FadeIn>

        <FadeIn delay={0.3}>
          <p className="mt-4 text-white font-medium text-lg sm:text-xl max-w-2xl mx-auto">
            Our pick of the best kids activities in Dubai, Abu Dhabi and the rest of the UAE
          </p>
        </FadeIn>

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

const FeaturedEventsCarousel: React.FC<{
  featuredEvents: FeaturedEvent[];
}> = ({ featuredEvents }) => {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [sliderRef, instanceRef] = useKeenSlider<HTMLDivElement>(
    {
      loop: true,
      drag: false, // Disable drag feature
      slides: {
        perView: 1,
        spacing: 20,
      },
      breakpoints: {
        '(min-width: 640px)': {
          slides: { perView: 2, spacing: 24 },
        },
        '(min-width: 768px)': {
          slides: { perView: 3, spacing: 24 },
        },
        '(min-width: 1024px)': {
          slides: { perView: 4, spacing: 28 },
        },
        '(min-width: 1280px)': {
          slides: { perView: 5, spacing: 30 },
        },
      },
      slideChanged(slider) {
        setCurrentSlide(slider.track.details.rel);
      },
      created() {
        setLoaded(true);
      },
    },
    [AutoplayPlugin]
  );

  return (
    <div className="px-6 py-16 max-w-screen-xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h2 className="text-3xl font-bold mb-2 text-gray-900">Our Top Recommendations</h2>
          <p className="text-gray-700">Only the highest-rated activities in Dubai, Abu Dhabi, and the UAE make our list</p>
        </div>
        <AnimatedButton
          className="mt-4 md:mt-0 flex items-center gap-2 font-medium text-gray-900 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
          onClick={() => navigate('/search?featured=true')}
          aria-label="View all events"
        >
          View All Events <FaChevronRight size={14} aria-hidden="true" />
        </AnimatedButton>
      </div>

      <div className="relative py-4">
        <div ref={sliderRef} className="keen-slider min-h-[400px] overflow-hidden">
          {featuredEvents && featuredEvents.length > 0 ? featuredEvents.map((event, index) => (
            <div key={index} className="keen-slider__slide px-2 py-2">
              <EventCard
                {...event}
                variant="overlay"
                showPrice={false}
                showLocation={false}
                showDate={false}
                showTime={false}
                showDescription={false}
                showStats={false}
                showFeaturedBadge={false}
                showCategory={false}
                showVendor={false}
                showAgeGroup={true}
                priority={index === 0}
                lazyLoad={index > 0}
                showWishlist={false}
              />
            </div>
          )) : (
            <div className="keen-slider__slide flex items-center justify-center p-8">
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
            </div>
          )}
        </div>

        {loaded && instanceRef.current && (
          <div className="flex justify-center gap-3 mt-6">
            <button
              onClick={() => instanceRef.current?.prev()}
              className="w-10 h-10 rounded-full flex items-center justify-center border border-gray-900 text-gray-900"
              aria-label="Previous events"
            >
              <FaChevronLeft size={14} />
            </button>
            <button
              onClick={() => instanceRef.current?.next()}
              className="w-10 h-10 rounded-full flex items-center justify-center border border-gray-900 text-gray-900"
              aria-label="Next events"
            >
              <FaChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const StatsSection = ({ stats }: { stats: any }) => {
  return (
    <section className="w-full py-16 px-6" style={{
      backgroundImage: 'url(/assets/images/trust-with-kidrove.png)',
      backgroundSize: 'cover',
      backgroundPosition: 'bottom'
    }}>
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
          <div className="bg-white rounded-2xl shadow-lg hover:shadow-2xl p-8 flex flex-col items-center text-center transition-all duration-300 border border-gray-100 hover:border-gray-200">
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
          </div>

          {/* Stats Cards */}
          <div className="bg-white rounded-2xl shadow-lg hover:shadow-2xl p-8 flex flex-col items-center text-center transition-all duration-300 border border-gray-100 hover:border-gray-200">
            <div className="w-12 h-12 rounded-full mb-4 flex items-center justify-center" style={{ backgroundColor: 'rgba(0, 142, 199, 0.1)' }}>
              <span className="text-xl font-bold">🎯</span>
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-2">
              <NumberCounter to={stats?.totalEvents || 2500} suffix="+" />
            </p>
            <p className="text-gray-700">Experiences</p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg hover:shadow-2xl p-8 flex flex-col items-center text-center transition-all duration-300 border border-gray-100 hover:border-gray-200">
            <div className="w-12 h-12 rounded-full mb-4 flex items-center justify-center" style={{ backgroundColor: 'rgba(0, 142, 199, 0.1)' }}>
              <span className="text-xl font-bold">🏢</span>
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-2">
              <NumberCounter to={stats?.totalVenues || 500} suffix="+" />
            </p>
            <p className="text-gray-700">Venue & Events</p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg hover:shadow-2xl p-8 flex flex-col items-center text-center transition-all duration-300 border border-gray-100 hover:border-gray-200">
            <div className="w-12 h-12 rounded-full mb-4 flex items-center justify-center" style={{ backgroundColor: 'rgba(0, 142, 199, 0.1)' }}>
              <span className="text-xl font-bold">🎓</span>
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-2">
              <NumberCounter to={stats?.totalClasses || stats?.totalEvents || 1000} suffix="+" />
            </p>
            <p className="text-gray-700">Classes</p>
          </div>
        </div>
      </div>
    </section>
  );
};

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const socialSettings = useSelector(selectSocialSettings);

  // Wishlist state management
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);

  const handleWishlistToggle = useCallback((eventId: string) => {
    setWishlistIds(prev => {
      if (prev.includes(eventId)) {
        return prev.filter(id => id !== eventId);
      } else {
        return [...prev, eventId];
      }
    });
  }, []);

  // Single homepage query replaces 6 separate queries (400-600ms savings!)
  const { data: homepageData, isLoading: homepageLoading, error: homepageError, refetch: refetchHomepage } = useHomepageQuery();

  // Only block on homepage query (critical data)
  const isLoading = homepageLoading;

  // Extract data from combined response with fallbacks
  // Cast to ApiEvent[] because useHomepageQuery returns API shape
  const apiEvents = (homepageData?.events || (homepageError ? mockEvents : [])) as unknown as ApiEvent[];

  // Transform API events to UI events
  const events: UIEvent[] = apiEvents.map(mapToUIEvent);

  const featuredEventsRaw = homepageData?.featuredEvents || [];
  const categories = homepageData?.categories || (homepageError ? mockCategories : []);
  const featuredBlogs = homepageData?.featuredBlogs || [];
  const reels = homepageData?.reels || [];
  const bannersData = { banners: homepageData?.banners || [] };
  const statsData = homepageData?.stats;
  const seoContentData = { seoContent: homepageData?.seoContent || null };
  const collectionsData = homepageData?.collections || [];

  // Transform featured events using the same mapper for consistency, but cast to FeaturedEvent
  const featuredEvents: FeaturedEvent[] = featuredEventsRaw.slice(0, 6).map((event: any) => ({
    ...mapToUIEvent(event), // Use helper first to get standard UI fields properly mapped
    buttonLabel: 'View Details',
    image: event.images?.[0] || getPlaceholderUrl('eventCard', event.title || ''),
  }));

  const stats = statsData || {
    totalEvents: Number(import.meta.env.VITE_STATS_TOTAL_EVENTS) || 2500,
    totalVendors: Number(import.meta.env.VITE_STATS_TOTAL_VENDORS) || 750,
    totalVenues: Number(import.meta.env.VITE_STATS_TOTAL_VENUES) || 500,
    totalReviews: Number(import.meta.env.VITE_STATS_TOTAL_REVIEWS) || 10000,
    totalBookings: Number(import.meta.env.VITE_STATS_TOTAL_BOOKINGS) || 50000,
    averageRating: Number(import.meta.env.VITE_STATS_AVERAGE_RATING) || 4.8
  };

  // Prepare different event collections for various layouts
  const handpickedEvents = events.filter(e => e.isFeatured || (e.rating && e.rating >= 4.5)).slice(0, 8);
  const bestPriceEvents = [...events].sort((a, b) => (a.price || 0) - (b.price || 0)).slice(0, 12);
  const trendingEvents = [...events].sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0)).slice(0, 12);
  const newEvents = [...events].sort((a, b) => {
    // events already have mapped 'date' (startDate) or 'dateSchedule' with 'startDate'
    const dateA = new Date(a.dateSchedule?.[0]?.startDate || a.date || 0);
    const dateB = new Date(b.dateSchedule?.[0]?.startDate || b.date || 0);
    return dateB.getTime() - dateA.getTime();
  }).slice(0, 8);
  const quickPicksEvents = events.slice(0, 5);

  const usingMockData = !!homepageError;
  const error = homepageError
    ? 'Unable to connect to the server. Showing default data.'
    : null;

  // Retry handler using TanStack Query refetch
  const handleRetry = useCallback(() => {
    refetchHomepage();
  }, [refetchHomepage]);

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
              <div className="w-full h-80 bg-gray-200"></div>
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
      <HomeSEO
        socialSettings={socialSettings}
        seoContent={seoContentData?.seoContent}
        stats={statsData}
      />
      <div className="w-full bg-gray-50">
        {/* Homepage Banner Carousel - No ScrollReveal for LCP */}
        {bannersData?.banners && bannersData.banners.length > 0 && (
          <BannerCarousel banners={bannersData.banners} />
        )}

        {/* Collections Pills */}
        <CollectionPills collections={collectionsData} />
        <FeaturedEventsCarousel
          featuredEvents={featuredEvents}
        />

        {/* Carousel Layout - Best Price Tickets */}
        <CollectionSection
          badge="Best Price"
          badgeColor="rgba(255, 107, 0, 0.1)"
          title="☀️ Best-Price Tickets to Make the Most of the Sunshine!"
          subtitle="Sunshine's out, fun's in! Grab best-price e-tickets now and make the most of this glorious weather."
          events={bestPriceEvents}
          layout="carousel"
          eventCardVariant="overlay"
          autoplay={true}
          autoplayInterval={5000}
          showNavigation={true}
          showDots={true}
          viewAllLink="/search?sort=price"
          showPrice={true}
          showLocation={true}
          showWishlist={false}
          showAgeGroup={true}
        />

        {/* Horizontal Scroll Layout - Trending Now */}
        <CollectionSection
          badge="Trending"
          title="🔥 Trending Now"
          subtitle="What's popular right now in Dubai and UAE"
          events={trendingEvents}
          layout="horizontal-scroll"
          eventCardVariant="compact"
          maxItems={12}
          viewAllLink="/search?sort=trending"
          showPrice={true}
          showLocation={true}
          showStats={true}
          showWishlist={false}
          showAgeGroup={true}
        />

        {/* Grid Layout - Handpicked Experiences */}
        <CollectionSection
          badge="Handpicked"
          title="Handpicked Experiences"
          subtitle="Curated by our team of experts - only the best activities for your family"
          events={handpickedEvents}
          layout="grid"
          eventCardVariant="default"
          maxItems={8}
          enablePagination={true}
          viewAllLink="/search?collection=handpicked"
          showPrice={true}
          showLocation={true}
          showAgeGroup={true}
          showWishlist={true}
          wishlistIds={wishlistIds}
          onWishlistToggle={handleWishlistToggle}
        />


        {/* Featured Instructors Section */}
        <FeaturedInstructors />

        {/* Masonry Layout - New This Week */}
        <CollectionSection
          badge="New"
          title="✨ New This Week"
          subtitle="Fresh activities just added to our platform"
          events={newEvents}
          layout="masonry"
          eventCardVariant="vertical-tall"
          showDescription={true}
          viewAllLink="/search?sort=newest"
          showPrice={true}
          showLocation={true}
          showWishlist={true}
          wishlistIds={wishlistIds}
          onWishlistToggle={handleWishlistToggle}
          showAgeGroup={true}
        />

        <EventGridSection events={events} />
        <CitiesSection />
        <NewsletterSubscribe />
        <CategoryCarousel categories={categories} />
        <ReviewCarouselSwiper />
        {/* Gift Card Promo Section */}
        <GiftCardPromo activityCount={stats?.totalEvents || 100} />
        {/* Featured Blogs Section - Moved above fold for better visibility */}
        <FeaturedBlogsSection blogs={featuredBlogs} loading={isLoading} />


        {/* Reels Section - Instagram-style vertical videos */}
        {reels && reels.length > 0 && (
          <div className="px-6 py-16 max-w-screen-xl mx-auto">
            <div className="text-center mb-8">
              <div className="inline-block mb-4 px-4 py-2 rounded-full" style={{ backgroundColor: 'rgba(0, 142, 199, 0.1)' }}>
                <span className="font-semibold text-gray-900">Trending</span>
              </div>
              <h2 className="text-3xl font-bold mb-2">Discover Fun Moments</h2>
              <p className="text-gray-700">Quick videos of amazing activities happening now</p>
            </div>

            {/* Reels carousel - mobile-optimized container */}
            <div className="rounded-2xl overflow-hidden shadow-2xl mx-auto max-w-md" style={{ height: '80vh' }}>
              <ReelsFeed
                reels={reels}
                onLike={async (reelId) => {
                  console.log('Liked reel:', reelId);
                }}
                onShare={(reelId) => {
                  console.log('Shared reel:', reelId);
                }}
              />
            </div>

            <div className="text-center mt-6">
              <AnimatedButton
                onClick={() => navigate('/reels')}
                className="px-6 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
              >
                View All Reels
              </AnimatedButton>
            </div>
          </div>
        )}

        {/* Why Choose Us Section */}
        <WhyChooseUs features={seoContentData?.seoContent?.features} />

        {/* Homepage FAQs Section */}
        <HomepageFAQs faqItems={seoContentData?.seoContent?.faqItems} />

        {/* Stacked Layout - Quick Picks */}
        <CollectionSection
          title="Quick Picks for You"
          subtitle="Fast access to today's top activities"
          events={quickPicksEvents}
          layout="stacked"
          eventCardVariant="list-item"
          maxItems={5}
          showPrice={true}
          showDate={true}
          viewAllLink="/search"
          showWishlist={false}
        />

        <StatsSection stats={stats} />
      </div>
    </PageTransition >
  );
};

export default HomePage;