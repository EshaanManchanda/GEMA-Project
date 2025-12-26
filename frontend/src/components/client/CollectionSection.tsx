import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useKeenSlider } from 'keen-slider/react';
import { motion } from 'framer-motion';
import { FaArrowRight, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import EventCard from './EventCard';
import 'keen-slider/keen-slider.min.css';
import type { CollectionSectionProps, CollectionSectionHeaderProps, GapSize, PaddingSize, TitleSize, AnimationType } from './CollectionSection.types';

// Helper functions for mapping props to CSS classes
const getGapClass = (gap: GapSize = 'lg'): string => {
  const gapMap = {
    'sm': 'gap-4',
    'md': 'gap-6',
    'lg': 'gap-8',
    'xl': 'gap-12'
  };
  return gapMap[gap] || gapMap['lg'];
};

const getPaddingClass = (padding: PaddingSize = 'md'): string => {
  const paddingMap = {
    'none': 'px-0 py-0',
    'sm': 'px-4 py-8',
    'md': 'px-6 py-16',
    'lg': 'px-8 py-20'
  };
  return paddingMap[padding] || paddingMap['md'];
};

const getTitleSizeClass = (size: TitleSize = 'lg'): string => {
  const sizeMap = {
    'sm': 'text-2xl',
    'md': 'text-3xl',
    'lg': 'text-4xl',
    'xl': 'text-5xl'
  };
  return sizeMap[size] || sizeMap['lg'];
};

// Animation helper functions
const getAnimationVariants = (type: AnimationType, duration: number, delay: number) => {
  const variants: Record<string, any> = {
    'fade': {
      hidden: { opacity: 0 },
      visible: { opacity: 1, transition: { duration: duration / 1000 } }
    },
    'slide-up': {
      hidden: { opacity: 0, y: 20 },
      visible: { opacity: 1, y: 0, transition: { duration: duration / 1000 } }
    },
    'slide-in': {
      hidden: { opacity: 0, x: -20 },
      visible: { opacity: 1, x: 0, transition: { duration: duration / 1000 } }
    },
    'scale': {
      hidden: { opacity: 0, scale: 0.9 },
      visible: { opacity: 1, scale: 1, transition: { duration: duration / 1000 } }
    },
    'none': {
      hidden: {},
      visible: {}
    }
  };
  return variants[type] || variants['fade'];
};

const getContainerVariants = (stagger: boolean, delay: number) => ({
  hidden: {},
  visible: {
    transition: {
      staggerChildren: stagger ? delay / 1000 : 0
    }
  }
});

// Header sub-component
const CollectionSectionHeader: React.FC<CollectionSectionHeaderProps> = ({
  badge,
  badgeColor,
  title,
  subtitle,
  viewAllLink,
  viewAllLabel,
  onViewAll,
  titleColor,
  subtitleColor,
  accentColor,
  titleSize = 'lg',
  titleAlignment = 'left'
}) => {
  const navigate = useNavigate();

  const handleViewAll = () => {
    if (onViewAll) {
      onViewAll();
    } else if (viewAllLink) {
      navigate(viewAllLink);
    }
  };

  const alignmentClass = titleAlignment === 'center' ? 'text-center items-center' : 'text-left items-start';

  return (
    <div className={`flex flex-col md:flex-row justify-between ${alignmentClass} md:items-center mb-8`}>
      <div className={titleAlignment === 'center' ? 'text-center w-full md:w-auto' : ''}>
        {badge && (
          <div
            className="inline-block mb-4 px-4 py-2 rounded-full"
            style={{ backgroundColor: badgeColor || 'rgba(0, 142, 199, 0.1)' }}
          >
            <span
              className="font-semibold"
              style={{ color: accentColor || 'var(--primary-color)' }}
            >
              {badge}
            </span>
          </div>
        )}
        <h2
          className={`${getTitleSizeClass(titleSize)} font-bold mb-2`}
          style={{ color: titleColor || '#111827' }}
        >
          {title}
        </h2>
        {subtitle && (
          <p style={{ color: subtitleColor || '#374151' }}>
            {subtitle}
          </p>
        )}
      </div>

      {(viewAllLink || onViewAll) && (
        <button
          onClick={handleViewAll}
          className="mt-4 md:mt-0 flex items-center gap-2 font-medium hover:underline"
          style={{ color: accentColor || 'var(--primary-color)' }}
        >
          {viewAllLabel || 'View All'} <FaArrowRight size={14} />
        </button>
      )}
    </div>
  );
};

// Autoplay plugin for keen-slider
const AutoplayPlugin = (slider: any) => {
  let timeout: ReturnType<typeof setTimeout>;
  let mouseOver = false;

  const clearNextTimeout = () => {
    clearTimeout(timeout);
  };

  const nextTimeout = () => {
    clearTimeout(timeout);
    if (mouseOver) return;
    timeout = setTimeout(() => {
      slider.next();
    }, 5000);
  };

  slider.on('created', () => {
    slider.container.addEventListener('mouseover', () => {
      mouseOver = true;
      clearNextTimeout();
    });
    slider.container.addEventListener('mouseout', () => {
      mouseOver = false;
      nextTimeout();
    });
    nextTimeout();
  });

  slider.on('dragStarted', clearNextTimeout);
  slider.on('animationEnded', nextTimeout);
  slider.on('updated', nextTimeout);
};

const CollectionSection: React.FC<CollectionSectionProps> = ({
  title,
  subtitle,
  badge,
  badgeColor,
  events,
  layout = 'grid',
  eventCardVariant = 'default',
  showPrice = true,
  showLocation = true,
  showDate = true,
  showTime = false,
  showDescription = false,
  showStats = false,
  showCategory = false,
  showVendor = false,
  showAgeGroup = true,
  showFeaturedBadge = false,
  showWishlist = false,
  viewAllLink,
  viewAllLabel = 'View All',
  onViewAll,
  maxItems,
  enablePagination = false,
  autoplay = false,
  autoplayInterval = 5000,
  showNavigation = false,
  showDots = false,
  gap = 'lg',
  containerPadding = 'md',
  titleColor,
  subtitleColor,
  accentColor,
  secondaryAccentColor,
  titleSize = 'lg',
  titleAlignment = 'left',
  cardBorderRadius,
  cardShadow,
  cardHoverEffect,
  gridCols,
  enableAnimations = true,
  animationType = 'fade',
  animationDuration = 300,
  animationDelay = 50,
  animationStagger = true,
  className = '',
  backgroundColor,
  isLoading = false,
  error = null,
  emptyStateMessage,
  emptyStateIcon,
  wishlistIds = [],
  onWishlistToggle,
}) => {
  const navigate = useNavigate();
  const [showAll, setShowAll] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loaded, setLoaded] = useState(false);

  // Determine max items based on layout
  const defaultMaxItems = useMemo(() => {
    if (maxItems) return maxItems;
    return layout === 'grid' ? 8 : 12;
  }, [layout, maxItems]);

  // Filter and limit events
  const displayedEvents = useMemo(() => {
    const safeEvents = Array.isArray(events) ? events : [];
    const limit = showAll ? safeEvents.length : defaultMaxItems;
    return safeEvents.slice(0, limit);
  }, [events, showAll, defaultMaxItems]);

  const hasMoreEvents = events.length > defaultMaxItems;

  // Runtime validation and helpful warnings (dev mode only)
  if (import.meta.env.DEV) {
    if (!Array.isArray(events)) {
      console.error('CollectionSection: events prop must be an array, received:', typeof events);
    }

    if (layout === 'carousel' && displayedEvents.length < 2) {
      console.warn('CollectionSection: Carousel layout works best with at least 2 items');
    }

    if (enablePagination && layout !== 'grid') {
      console.warn('CollectionSection: enablePagination only works with grid layout');
    }

    if (autoplay && layout !== 'carousel') {
      console.warn('CollectionSection: autoplay only works with carousel layout');
    }

    if (showNavigation && layout !== 'carousel') {
      console.warn('CollectionSection: showNavigation only applies to carousel layout');
    }

    if (showDots && layout !== 'carousel') {
      console.warn('CollectionSection: showDots only applies to carousel layout');
    }
  }

  // Keen-slider setup (for carousel layout)
  const [sliderRef, instanceRef] = useKeenSlider<HTMLDivElement>(
    {
      loop: true,
      drag: true,
      slides: {
        perView: 1,
        spacing: 20,
      },
      breakpoints: {
        '(min-width: 640px)': { slides: { perView: 2, spacing: 24 } },
        '(min-width: 768px)': { slides: { perView: 3, spacing: 24 } },
        '(min-width: 1024px)': { slides: { perView: 4, spacing: 28 } },
        '(min-width: 1280px)': { slides: { perView: 5, spacing: 30 } },
      },
      slideChanged(slider) {
        setCurrentSlide(slider.track.details.rel);
      },
      created() {
        setLoaded(true);
      },
    },
    autoplay ? [AutoplayPlugin] : []
  );

  // Loading skeleton
  const renderLoadingSkeleton = () => {
    const skeletonCount = layout === 'grid' ? 8 : 5;

    return (
      <div className="grid gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-gray-200 h-52 rounded-xl mb-4" />
            <div className="h-4 bg-gray-200 rounded mb-2 w-3/4" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  };

  // Empty state
  const renderEmptyState = () => (
    <div className="text-center py-16">
      {emptyStateIcon || <div className="text-6xl mb-4">🎪</div>}
      <h3 className="text-xl font-semibold text-gray-700 mb-2">
        {emptyStateMessage || 'No events found'}
      </h3>
      <p className="text-gray-600 mb-6">
        Check back soon for exciting activities!
      </p>
      {viewAllLink && (
        <button
          onClick={() => navigate(viewAllLink)}
          className="px-6 py-3 rounded-lg font-medium"
          style={{ backgroundColor: 'var(--accent-color)', color: 'white' }}
        >
          Explore All Events
        </button>
      )}
    </div>
  );

  // Error state
  const renderErrorState = () => (
    <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
      <div className="text-4xl mb-3">⚠️</div>
      <h3 className="text-lg font-semibold text-red-800 mb-2">
        Unable to load {title.toLowerCase()}
      </h3>
      <p className="text-red-600 text-sm mb-4">{error}</p>
      <button
        onClick={() => window.location.reload()}
        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
      >
        Retry
      </button>
    </div>
  );

  // Grid layout
  const renderGridLayout = () => {
    const Container = enableAnimations ? motion.div : 'div';
    const Item = enableAnimations ? motion.div : 'div';
    const variants = getAnimationVariants(animationType, animationDuration, animationDelay);
    const containerVariants = getContainerVariants(animationStagger, animationDelay);

    return (
      <Container
        className={`grid ${getGapClass(gap)} ${gridCols ? '' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`}
        style={gridCols ? { gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))' } : undefined}
        variants={enableAnimations ? containerVariants : undefined}
        initial={enableAnimations ? "hidden" : undefined}
        animate={enableAnimations ? "visible" : undefined}
      >
        {displayedEvents.map((event, index) => (
          <Item
            key={event.id || event._id || index}
            variants={enableAnimations ? variants : undefined}
          >
            <EventCard
              {...event}
              variant={eventCardVariant}
              showPrice={showPrice}
              showLocation={showLocation}
              showDate={showDate}
              showTime={showTime}
              showDescription={showDescription}
              showStats={showStats}
              showCategory={showCategory}
              showVendor={showVendor}
              showAgeGroup={showAgeGroup}
              showFeaturedBadge={showFeaturedBadge}
              showWishlist={showWishlist}
              isInWishlist={wishlistIds.includes((event.id || event._id) as string)}
              onWishlistToggle={onWishlistToggle}
              priority={index === 0}
              lazyLoad={index > 0}
            />
          </Item>
        ))}
      </Container>
    );
  };

  // Carousel layout
  const renderCarouselLayout = () => (
    <div className="relative py-4">
      <div ref={sliderRef} className="keen-slider min-h-[400px] overflow-hidden">
        {displayedEvents.map((event, index) => (
          <div key={event.id || event._id || index} className="keen-slider__slide px-2 py-2">
            <EventCard
              {...event}
              variant={eventCardVariant}
              showPrice={showPrice}
              showLocation={showLocation}
              showDate={showDate}
              showTime={showTime}
              showDescription={showDescription}
              showStats={showStats}
              showCategory={showCategory}
              showVendor={showVendor}
              showAgeGroup={showAgeGroup}
              showFeaturedBadge={showFeaturedBadge}
              showWishlist={showWishlist}
              isInWishlist={wishlistIds.includes((event.id || event._id) as string)}
              onWishlistToggle={onWishlistToggle}
              priority={index === 0}
              lazyLoad={index > 0}
            />
          </div>
        ))}
      </div>

      {/* Navigation arrows */}
      {loaded && showNavigation && instanceRef.current && displayedEvents.length > 1 && (
        <div className="flex justify-center gap-3 mt-6">
          <button
            onClick={() => instanceRef.current?.prev()}
            className="w-10 h-10 rounded-full flex items-center justify-center border border-gray-900 text-gray-900 hover:bg-gray-100 transition-colors"
            aria-label="Previous slide"
          >
            <FaChevronLeft size={14} />
          </button>
          <button
            onClick={() => instanceRef.current?.next()}
            className="w-10 h-10 rounded-full flex items-center justify-center border border-gray-900 text-gray-900 hover:bg-gray-100 transition-colors"
            aria-label="Next slide"
          >
            <FaChevronRight size={14} />
          </button>
        </div>
      )}

      {/* Dot indicators */}
      {loaded && showDots && displayedEvents.length > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {displayedEvents.map((_, idx) => (
            <button
              key={idx}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                currentSlide === idx ? 'w-8' : 'w-2'
              }`}
              style={{
                backgroundColor: currentSlide === idx ? 'var(--primary-color)' : '#D1D5DB'
              }}
              onClick={() => instanceRef.current?.moveToIdx(idx)}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );

  // Horizontal scroll layout
  const renderHorizontalScrollLayout = () => {
    const Container = enableAnimations ? motion.div : 'div';
    const Item = enableAnimations ? motion.div : 'div';
    const variants = getAnimationVariants(animationType, animationDuration, animationDelay);
    const containerVariants = getContainerVariants(animationStagger, animationDelay);

    return (
      <div className="overflow-x-auto -mx-6 px-6 scrollbar-hide">
        <Container
          className="flex gap-6 pb-4 snap-x snap-mandatory"
          variants={enableAnimations ? containerVariants : undefined}
          initial={enableAnimations ? "hidden" : undefined}
          animate={enableAnimations ? "visible" : undefined}
        >
          {displayedEvents.map((event, index) => (
            <Item
              key={event.id || event._id || index}
              className="flex-shrink-0 w-[280px] sm:w-[320px] md:w-[350px] snap-start"
              variants={enableAnimations ? variants : undefined}
            >
              <EventCard
                {...event}
                variant={eventCardVariant}
                showPrice={showPrice}
                showLocation={showLocation}
                showDate={showDate}
                showTime={showTime}
                showDescription={showDescription}
                showStats={showStats}
                showCategory={showCategory}
                showVendor={showVendor}
                showAgeGroup={showAgeGroup}
                showFeaturedBadge={showFeaturedBadge}
                showWishlist={showWishlist}
                isInWishlist={wishlistIds.includes((event.id || event._id) as string)}
                onWishlistToggle={onWishlistToggle}
                priority={index === 0}
                lazyLoad={index > 0}
              />
            </Item>
          ))}
        </Container>
      </div>
    );
  };

  // Stacked layout
  const renderStackedLayout = () => {
    const Container = enableAnimations ? motion.div : 'div';
    const Item = enableAnimations ? motion.div : 'div';
    const variants = getAnimationVariants(animationType, animationDuration, animationDelay);
    const containerVariants = getContainerVariants(animationStagger, animationDelay);

    return (
      <Container
        className="space-y-4"
        variants={enableAnimations ? containerVariants : undefined}
        initial={enableAnimations ? "hidden" : undefined}
        animate={enableAnimations ? "visible" : undefined}
      >
        {displayedEvents.map((event, index) => (
          <Item
            key={event.id || event._id || index}
            variants={enableAnimations ? variants : undefined}
          >
            <EventCard
              {...event}
              variant={eventCardVariant === 'default' ? 'horizontal' : eventCardVariant}
              className="w-full"
              showPrice={showPrice}
              showLocation={showLocation}
              showDate={showDate}
              showTime={showTime}
              showDescription={showDescription}
              showStats={showStats}
              showCategory={showCategory}
              showVendor={showVendor}
              showAgeGroup={showAgeGroup}
              showFeaturedBadge={showFeaturedBadge}
              showWishlist={showWishlist}
              isInWishlist={wishlistIds.includes((event.id || event._id) as string)}
              onWishlistToggle={onWishlistToggle}
              priority={index === 0}
              lazyLoad={index > 0}
            />
          </Item>
        ))}
      </Container>
    );
  };

  // Masonry layout
  const renderMasonryLayout = () => {
    const Container = enableAnimations ? motion.div : 'div';
    const Item = enableAnimations ? motion.div : 'div';
    const variants = getAnimationVariants(animationType, animationDuration, animationDelay);
    const containerVariants = getContainerVariants(animationStagger, animationDelay);

    return (
      <Container
        className={`columns-1 sm:columns-2 lg:columns-3 xl:columns-4 ${getGapClass(gap)}`}
        variants={enableAnimations ? containerVariants : undefined}
        initial={enableAnimations ? "hidden" : undefined}
        animate={enableAnimations ? "visible" : undefined}
      >
        {displayedEvents.map((event, index) => (
          <Item
            key={event.id || event._id || index}
            className={`break-inside-avoid ${gap === 'sm' ? 'mb-4' : gap === 'md' ? 'mb-6' : gap === 'xl' ? 'mb-12' : 'mb-8'}`}
            variants={enableAnimations ? variants : undefined}
          >
            <EventCard
              {...event}
              variant={eventCardVariant}
              showPrice={showPrice}
              showLocation={showLocation}
              showDate={showDate}
              showTime={showTime}
              showDescription={showDescription}
              showStats={showStats}
              showCategory={showCategory}
              showVendor={showVendor}
              showAgeGroup={showAgeGroup}
              showFeaturedBadge={showFeaturedBadge}
              showWishlist={showWishlist}
              isInWishlist={wishlistIds.includes((event.id || event._id) as string)}
              onWishlistToggle={onWishlistToggle}
              priority={index === 0}
              lazyLoad={index > 0}
            />
          </Item>
        ))}
      </Container>
    );
  };

  // Render method selector
  const renderLayout = () => {
    switch (layout) {
      case 'carousel':
        return renderCarouselLayout();
      case 'horizontal-scroll':
        return renderHorizontalScrollLayout();
      case 'stacked':
        return renderStackedLayout();
      case 'masonry':
        return renderMasonryLayout();
      case 'grid':
      default:
        return renderGridLayout();
    }
  };

  // Main render
  return (
    <section
      className={`${getPaddingClass(containerPadding)} max-w-screen-xl mx-auto ${className}`}
      style={{ backgroundColor }}
    >
      <CollectionSectionHeader
        badge={badge}
        badgeColor={badgeColor}
        title={title}
        subtitle={subtitle}
        viewAllLink={viewAllLink}
        viewAllLabel={viewAllLabel}
        onViewAll={onViewAll}
        titleColor={titleColor}
        subtitleColor={subtitleColor}
        accentColor={accentColor}
        titleSize={titleSize}
        titleAlignment={titleAlignment}
      />

      {isLoading && renderLoadingSkeleton()}
      {error && renderErrorState()}
      {!isLoading && !error && displayedEvents.length === 0 && renderEmptyState()}
      {!isLoading && !error && displayedEvents.length > 0 && renderLayout()}

      {/* Load More button (for grid with pagination) */}
      {enablePagination && hasMoreEvents && layout === 'grid' && !isLoading && !error && (
        <div className="mt-12 text-center">
          <button
            onClick={() => setShowAll(!showAll)}
            className="px-8 py-3 rounded-lg font-semibold border-2 transition-all duration-300 hover:shadow-md"
            style={{ borderColor: 'var(--primary-color)', color: 'var(--primary-color)' }}
          >
            {showAll ? 'Show Less' : `Load More (${events.length - defaultMaxItems} more)`}
          </button>
        </div>
      )}
    </section>
  );
};

export default React.memo(CollectionSection);
