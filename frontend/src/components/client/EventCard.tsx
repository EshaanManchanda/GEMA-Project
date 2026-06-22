import React, { useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInView } from 'react-intersection-observer';
import { FaMapMarkerAlt, FaChild, FaCalendar, FaClock, FaEye, FaStar, FaHeart, FaRegHeart } from 'react-icons/fa';
import { getPlaceholderUrl } from '../../utils/placeholderImage';
import { getCloudinaryWebP, generateSrcSet } from '@/utils/cloudinaryHelpers';
import { generateEventUrl } from '@/utils/urlHelper';


// Render prop function types
type RenderPropFn<T = any> = (props: T) => React.ReactNode;

export interface EventCardRenderProps {
  event: EventCardProps;
  eventId: string;
  eventImage: string;
  ageGroup: string;
  handleClick: () => void;
}

export interface EventCardProps {
  _id?: string;
  id?: string;
  slug?: string;
  title: string;
  description?: string;
  shortDescription?: string;
  images?: string[];
  image?: string;
  customLink?: string;
  price?: number;
  currency?: string;
  location?: {
    city?: string;
    address?: string;
    coordinates?: { lat: number; lng: number };
  } | string;
  category?: string;
  categories?: string[];
  ageRange?: [number, number] | { min: number; max: number };
  ageGroup?: string;
  dateSchedule?: Array<{
    startDate: string;
    endDate: string;
  }>;
  date?: string;
  isFeatured?: boolean;
  viewsCount?: number;
  bookingsCount?: number;
  rating?: number;
  reviewsCount?: number;
  vendorId?: {
    businessName: string;
  };
  className?: string;
  variant?: 'default' | 'featured' | 'compact' | 'horizontal' | 'vertical-tall' | 'overlay' | 'minimal' | 'magazine' | 'list-item';

  // Toggleable information display
  showPrice?: boolean;
  showLocation?: boolean;
  showDate?: boolean;
  showTime?: boolean;
  showDescription?: boolean;
  showStats?: boolean;
  showCategory?: boolean;
  showVendor?: boolean;
  showAgeGroup?: boolean;
  showFeaturedBadge?: boolean;

  // Render props for extensibility
  renderHeader?: RenderPropFn<EventCardRenderProps>;
  renderFooter?: RenderPropFn<EventCardRenderProps>;
  renderActions?: RenderPropFn<EventCardRenderProps>;
  renderOverlay?: RenderPropFn<EventCardRenderProps>;
  renderBadges?: RenderPropFn<EventCardRenderProps>;

  // Behavior customization
  onClick?: (event: EventCardProps) => void;
  disableNavigation?: boolean;

  // Styling customization
  imageHeight?: string;
  imageFit?: 'cover' | 'contain' | 'fill';
  borderRadius?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';

  // Performance
  priority?: boolean;
  lazyLoad?: boolean;

  // Accessibility
  ariaLabel?: string;

  // Wishlist functionality
  isInWishlist?: boolean;
  onWishlistToggle?: (eventId: string) => void;
  showWishlist?: boolean;
}

// Utility functions
const formatPrice = (price?: number, currency: string = 'AED'): string => {
  if (price === undefined || price === null) return '';
  if (price === 0) return 'Free';
  return new Intl.NumberFormat('en-AE', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
  }).format(price);
};

const getEventLocation = (location?: EventCardProps['location']): string => {
  if (!location) return 'Location TBD';
  if (typeof location === 'string') return location;
  return location.city || location.address || 'Location TBD';
};

const getEventImage = (event: EventCardProps): string => {
  if (event.image) return event.image;
  if (event.images && event.images.length > 0) return event.images[0];
  return getPlaceholderUrl('eventCard', event.title);
};

const getAgeGroup = (event: EventCardProps): string => {
  if (event.ageGroup) return event.ageGroup;
  if (event.ageRange) {
    if (Array.isArray(event.ageRange)) {
      return `${event.ageRange[0]}-${event.ageRange[1]} years`;
    } else {
      return `${event.ageRange.min}-${event.ageRange.max} years`;
    }
  }
  return '';
};

const formatDate = (raw: string | undefined): string | null => {
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d.toLocaleDateString();
};

const formatTime = (raw: string | undefined): string | null => {
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const getEventDate = (event: EventCardProps): string => {
  const fromDate = formatDate(event.date);
  if (fromDate) return fromDate;
  const fromSchedule = formatDate(event.dateSchedule?.[0]?.startDate);
  if (fromSchedule) return fromSchedule;
  return 'Date TBD';
};

const getEventTime = (event: EventCardProps): string => {
  const schedule = event.dateSchedule?.[0];
  if (schedule) {
    const start = formatTime(schedule.startDate);
    const end = formatTime(schedule.endDate);
    if (start && end) return `${start} - ${end}`;
    if (start) return start;
  }
  return '';
};

const formatViewCount = (count?: number): string => {
  if (!count) return '';
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k views`;
  }
  return `${count} views`;
};

const formatRating = (rating?: number): string => {
  if (!rating) return '';
  return rating.toFixed(1);
};

// New helper functions
/** Strip HTML tags and decode common entities to get plain preview text. */
const stripHtml = (html: string): string => {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s{2,}/g, ' ')
    .trim();
};

const truncateDescription = (text: string, variant: string): string => {
  const maxLengths: Record<string, number> = {
    'default': 100,
    'featured': 150,
    'vertical-tall': 250,
    'magazine': 200,
    'horizontal': 120,
    'minimal': 0,
    'compact': 0,
    'list-item': 0,
    'overlay': 150
  };
  const maxLength = maxLengths[variant] || 100;
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength).split(' ').slice(0, -1).join(' ') + '...';
};

const getImageHeightClass = (variant: string, custom?: string): string => {
  if (custom) return custom;
  const heights: Record<string, string> = {
    'default': 'h-52',
    'featured': 'h-64',
    'compact': 'h-40',
    'horizontal': 'h-full',
    'vertical-tall': 'h-72',
    'overlay': 'h-80',
    'minimal': 'h-48',
    'magazine': 'h-64',
    'list-item': 'h-16 w-16'
  };
  return heights[variant] || 'h-52';
};

const getBorderRadiusClass = (radius: string): string => {
  const classes: Record<string, string> = {
    'none': 'rounded-none',
    'sm': 'rounded-sm',
    'md': 'rounded-md',
    'lg': 'rounded-lg',
    'xl': 'rounded-xl',
    '2xl': 'rounded-2xl',
    'full': 'rounded-full'
  };
  return classes[radius] || 'rounded-xl';
};

const getCardClasses = (variant: string, borderRadius: string): string => {
  const baseClasses: Record<string, string> = {
    'default': 'bg-white overflow-hidden transition-all duration-300 group cursor-pointer',
    'featured': 'bg-white overflow-hidden transition-all duration-300 group cursor-pointer',
    'compact': 'bg-white overflow-hidden transition-all duration-300 group cursor-pointer',
    'horizontal': 'bg-white overflow-hidden transition-all duration-300 group cursor-pointer',
    'vertical-tall': 'bg-white overflow-hidden transition-all duration-300 group cursor-pointer',
    'overlay': 'bg-white overflow-hidden transition-all duration-300 group cursor-pointer',
    'minimal': 'overflow-hidden transition-all duration-300 group cursor-pointer',
    'magazine': 'bg-white overflow-hidden transition-all duration-300 group cursor-pointer',
    'list-item': 'bg-white overflow-hidden transition-all duration-300 group cursor-pointer'
  };

  const radiusClass = getBorderRadiusClass(borderRadius);

  const variantClasses: Record<string, string> = {
    'default': 'shadow-md shadow-primary/5 hover:shadow-lg hover:shadow-primary/10',
    'featured': 'shadow-lg shadow-primary/5 hover:shadow-2xl hover:shadow-primary/10 border border-primary/10 hover:border-primary/20 transform hover:-translate-y-2 duration-500',
    'compact': 'shadow-sm hover:shadow-md hover:shadow-primary/5',
    'horizontal': 'shadow-md shadow-primary/5 hover:shadow-lg hover:shadow-primary/10 flex flex-row',
    'vertical-tall': 'shadow-lg shadow-primary/5 hover:shadow-xl hover:shadow-primary/10',
    'overlay': 'shadow-xl shadow-primary/10 relative',
    'minimal': 'hover:shadow-md hover:shadow-primary/5',
    'magazine': 'shadow-md shadow-primary/5 hover:shadow-lg hover:shadow-primary/10 border-l-4 border-transparent hover:border-primary-500',
    'list-item': 'shadow-sm hover:bg-primary-50/30 flex flex-row items-center'
  };

  const base = baseClasses[variant] || baseClasses['default'];
  return `${base} ${radiusClass} ${variantClasses[variant] || variantClasses['default']}`;
};

const formatBookingCount = (count?: number): string => {
  if (!count) return '';
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k booked`;
  return `${count}+ booked`;
};

const getCategoryConfig = (category?: string): { color: string; icon: string } => {
  const configs: Record<string, { color: string; icon: string }> = {
    'Entertainment': { color: 'bg-purple-100 text-purple-800', icon: '🎭' },
    'Education': { color: 'bg-blue-100 text-blue-800', icon: '📚' },
    'Arts': { color: 'bg-pink-100 text-pink-800', icon: '🎨' },
    'Sports': { color: 'bg-green-100 text-green-800', icon: '⚽' },
    'Adventure': { color: 'bg-orange-100 text-orange-800', icon: '🏕️' },
    'Music': { color: 'bg-indigo-100 text-indigo-800', icon: '🎵' },
    'Food': { color: 'bg-red-100 text-red-800', icon: '🍴' },
    'Technology': { color: 'bg-cyan-100 text-cyan-800', icon: '💻' }
  };
  return configs[category || ''] || { color: 'bg-gray-100 text-gray-800', icon: '📂' };
};

// Sub-components
interface WishlistButtonProps {
  eventId: string;
  isInWishlist?: boolean;
  onToggle?: (eventId: string) => void;
}

const WishlistButton: React.FC<WishlistButtonProps> = ({
  eventId,
  isInWishlist = false,
  onToggle
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggle) {
      onToggle(eventId);
    }
  };

  return (
    <button
      onClick={handleClick}
      className="absolute top-3 right-3 z-20 p-2 bg-white rounded-full shadow-md hover:scale-110 transition-transform duration-200"
      aria-label={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
      type="button"
    >
      {isInWishlist ? (
        <FaHeart className="text-red-500 w-5 h-5" />
      ) : (
        <FaRegHeart className="text-gray-600 w-5 h-5 hover:text-red-400" />
      )}
    </button>
  );
};

// Sub-components
interface EventCardImageProps {
  src: string;
  alt: string;
  variant: string;
  inView: boolean;
  imageFit?: string;
  imageHeight?: string;
  priority?: boolean;
  onError?: () => void;
}

const EventCardImage: React.FC<EventCardImageProps> = ({
  src,
  alt,
  variant,
  inView,
  imageFit = 'cover',
  imageHeight,
  priority = false,
  onError
}) => {
  const heightClass = imageHeight || getImageHeightClass(variant);
  const roundedClass = variant === 'minimal' ? 'rounded-2xl' : '';
  const imageClasses = `w-full ${heightClass} object-${imageFit} transition-transform duration-${variant === 'compact' ? '300' : '500'} group-hover:scale-105 ${roundedClass}`;

  if (!inView && !priority) {
    return <div className={`${imageClasses.replace(`object-${imageFit}`, '')} bg-gray-200 animate-pulse`} />;
  }

  // Determine optimal image width based on variant
  const getImageWidth = (variant: string): number => {
    switch (variant) {
      case 'list-item': return 200;
      case 'compact': return 300;
      case 'minimal': return 300;
      case 'horizontal': return 400;
      case 'overlay': return 600;
      case 'magazine': return 600;
      default: return 400;
    }
  };

  const imageWidth = getImageWidth(variant);

  // Check if src is a data URI (placeholder)
  const isDataUri = src.startsWith('data:');

  if (isDataUri) {
    return (
      <img
        src={src}
        alt={alt}
        className={imageClasses}
        loading={priority ? 'eager' : 'lazy'}
        // @ts-expect-error - fetchpriority not in React types yet
        fetchpriority={priority ? 'high' : 'auto'}
        decoding="async"
        width={imageWidth}
        height={Math.floor(imageWidth * 0.75)}
        onError={onError}
      />
    );
  }

  return (
    <picture>
      <source
        type="image/webp"
        srcSet={generateSrcSet(src, [imageWidth, Math.floor(imageWidth * 0.75), Math.floor(imageWidth * 0.5)])}
        sizes={`${imageWidth}px`}
      />
      <img
        src={getCloudinaryWebP(src, imageWidth)}
        alt={alt}
        className={imageClasses}
        loading={priority ? 'eager' : 'lazy'}
        // @ts-expect-error - fetchpriority not in React types yet
        fetchpriority={priority ? 'high' : 'auto'}
        decoding="async"
        width={imageWidth}
        height={Math.floor(imageWidth * 0.75)}
        onError={onError}
      />
    </picture>
  );
};

interface EventCardBadgesProps {
  ageGroup?: string;
  isFeatured?: boolean;
  category?: string;
  showAgeGroup?: boolean;
  showFeaturedBadge?: boolean;
  showCategory?: boolean;
}

const EventCardBadges: React.FC<EventCardBadgesProps> = ({
  ageGroup,
  isFeatured,
  category,
  showAgeGroup = true,
  showFeaturedBadge = true,
  showCategory = false
}) => {
  const categoryConfig = getCategoryConfig(category);

  return (
    <>
      {ageGroup && showAgeGroup && (
        <div
          className="absolute top-3 right-3 bg-white rounded-full px-3 py-1 text-sm font-semibold shadow-sm z-10"
          style={{ color: 'var(--primary-color)' }}
        >
          <FaChild className="inline mr-1" />
          Ages {ageGroup}
        </div>
      )}
      {isFeatured && showFeaturedBadge && (
        <div className="absolute top-3 left-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-sm z-10">
          FEATURED
        </div>
      )}
      {category && showCategory && (
        <div className={`absolute bottom-3 left-3 ${categoryConfig.color} text-xs font-semibold px-2 py-1 rounded-full shadow-sm z-10`}>
          <span className="mr-1">{categoryConfig.icon}</span>
          {category.replace(/&amp;/g, '&')}
        </div>
      )}
    </>
  );
};

interface EventCardContentProps {
  title: string;
  description?: string;
  shortDescription?: string;
  showDescription?: boolean;
  variant: string;
}

const EventCardContent: React.FC<EventCardContentProps> = ({
  title,
  description,
  shortDescription,
  showDescription = false,
  variant
}) => {
  return (
    <>
      <h3 className="text-sm sm:text-lg font-semibold mb-2 line-clamp-2 min-w-0 min-h-[3.5rem] text-gray-900 group-hover:text-primary-600 transition-colors">
        {title}
      </h3>
      {showDescription && shortDescription && (
        <p className="text-sm text-gray-700 mb-3 line-clamp-2">{truncateDescription(shortDescription, variant)}</p>
      )}
      {showDescription && !shortDescription && description && (
        <p className="text-sm text-gray-700 mb-3 line-clamp-2">
          {truncateDescription(stripHtml(description), variant)}
        </p>
      )}
    </>
  );
};

interface EventCardMetadataProps {
  location?: EventCardProps['location'];
  dateSchedule?: EventCardProps['dateSchedule'];
  date?: string;
  showLocation?: boolean;
  showDate?: boolean;
  showTime?: boolean;
  variant: string;
}

const EventCardMetadata: React.FC<EventCardMetadataProps> = ({
  location,
  dateSchedule,
  date,
  showLocation = true,
  showDate = true,
  showTime = true,
  variant
}) => {
  const event = { location, dateSchedule, date } as EventCardProps;
  const timeStr = getEventTime(event);

  return (
    <div className="space-y-2 mb-3">
      {showLocation && (
        <div className="flex items-center text-gray-700 text-sm">
          <FaMapMarkerAlt className="mr-2 flex-shrink-0" style={{ color: 'var(--primary-color)' }} />
          <p className="truncate">{getEventLocation(location)}</p>
        </div>
      )}

      {showDate && variant !== 'list-item' && (
        <div className="flex items-center text-gray-700 text-sm">
          <FaCalendar className="mr-2 flex-shrink-0" style={{ color: 'var(--primary-color)' }} />
          <p>{getEventDate(event)}</p>
        </div>
      )}

      {showTime && timeStr && variant !== 'compact' && variant !== 'minimal' && variant !== 'list-item' && (
        <div className="flex items-center text-gray-700 text-sm">
          <FaClock className="mr-2 flex-shrink-0" style={{ color: 'var(--primary-color)' }} />
          <p>{timeStr}</p>
        </div>
      )}
    </div>
  );
};

interface EventCardActionsProps {
  price?: number;
  currency?: string;
  showPrice?: boolean;
  onClick: (e: React.MouseEvent) => void;
}

const EventCardActions: React.FC<EventCardActionsProps> = ({
  price,
  currency,
  showPrice = true,
  onClick
}) => {
  return (
    <div className="flex justify-between items-center pt-3 border-t border-gray-100">
      {showPrice && price !== undefined && price !== null ? (
        <div>
          {price === 0 ? (
            <div className="font-bold text-lg text-green-600">Free</div>
          ) : (
            <>
              <span className="text-xs text-gray-700">Starting from</span>
              <div className="font-bold text-lg" style={{ color: 'var(--primary-color)' }}>
                {formatPrice(price, currency)}
              </div>
            </>
          )}
        </div>
      ) : (
        <div></div>
      )}

      <button
        className="px-6 py-3 text-white text-sm font-semibold rounded-xl hover:opacity-90 hover:shadow-lg hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-95 whitespace-nowrap"
        style={{
          backgroundColor: 'var(--accent-color, #FF6B00)',
          boxShadow: '0 4px 14px 0 rgba(255, 107, 0, 0.3)'
        }}
        onClick={onClick}
      >
        View Details
      </button>
    </div>
  );
};

interface EventCardStatsProps {
  viewsCount?: number;
  rating?: number;
  reviewsCount?: number;
  bookingsCount?: number;
  showStats?: boolean;
}

const EventCardStats: React.FC<EventCardStatsProps> = ({
  viewsCount,
  rating,
  reviewsCount,
  bookingsCount,
  showStats = false
}) => {
  if (!showStats || (!viewsCount && !rating && !bookingsCount)) return null;

  return (
    <div className="flex items-center justify-between text-xs text-gray-700 mb-3">
      {viewsCount && (
        <div className="flex items-center gap-1">
          <FaEye className="text-blue-500" />
          <span>{formatViewCount(viewsCount)}</span>
        </div>
      )}
      {rating && (
        <div className="flex items-center gap-1">
          <FaStar className="text-yellow-500" />
          <span>{formatRating(rating)}</span>
          {reviewsCount && (
            <span className="text-gray-700">({reviewsCount})</span>
          )}
        </div>
      )}
      {bookingsCount && (
        <div className="flex items-center gap-1">
          <span className="text-green-600 font-medium">{formatBookingCount(bookingsCount)}</span>
        </div>
      )}
    </div>
  );
};

const EventCard: React.FC<EventCardProps> = (props) => {
  const {
    variant = 'default',
    className = '',
    showPrice = true,
    showLocation = true,
    showDate = true,
    showTime,
    showDescription,
    showStats = false,
    showCategory = false,
    showVendor,
    showAgeGroup = true,
    showFeaturedBadge = true,
    showWishlist = true,
    onClick,
    disableNavigation = false,
    imageHeight,
    imageFit = 'cover',
    borderRadius = 'xl',
    lazyLoad = true,
    priority = false,
    ariaLabel,
    renderHeader,
    renderFooter,
    renderActions,
    renderOverlay,
    renderBadges,
    ...event
  } = props;

  const navigate = useNavigate();
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
    rootMargin: '50px',
    skip: !lazyLoad || priority
  });

  // Memoize computed values to prevent recalculation on every render
  const eventId = useMemo(() => event.id || event._id || '', [event.id, event._id]);
  const eventSlug = useMemo(() => event.slug || event.id || event._id || '', [event.slug, event.id, event._id]);
  const eventImage = useMemo(() => getEventImage(event), [event.image, event.images, event.title]);
  const ageGroup = useMemo(() => getAgeGroup(event), [event.ageGroup, event.ageRange]);

  const finalShowTime = useMemo(
    () => showTime !== undefined ? showTime : !['compact', 'minimal', 'list-item'].includes(variant),
    [showTime, variant]
  );
  const finalShowDescription = useMemo(
    () => showDescription !== undefined ? showDescription : ['vertical-tall', 'magazine'].includes(variant),
    [showDescription, variant]
  );
  const finalShowVendor = useMemo(
    () => showVendor !== undefined ? showVendor : variant === 'featured',
    [showVendor, variant]
  );

  // Memoize event handlers to prevent child re-renders
  const handleClick = useCallback(() => {
    if (onClick) {
      onClick(event as EventCardProps);
    } else if (!disableNavigation) {
      if (event.customLink) {
        navigate(event.customLink);
      } else {
        // Construct URL using helper for consistency
        const targetUrl = generateEventUrl(eventSlug);
        navigate(targetUrl);
      }
    }
  }, [onClick, event, disableNavigation, eventSlug, navigate]);

  const handleButtonClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    handleClick();
  }, [handleClick]);

  const renderProps: EventCardRenderProps = {
    event: event as EventCardProps,
    eventId,
    eventImage,
    ageGroup,
    handleClick
  };

  const cardClasses = getCardClasses(variant, borderRadius);

  const renderDefaultVariant = () => (
    <>
      <div className="relative overflow-hidden">
        <EventCardImage
          src={eventImage}
          alt={event.title}
          variant={variant}
          inView={inView}
          imageFit={imageFit}
          imageHeight={imageHeight}
          priority={priority}
          onError={() => { }}
        />
        {showWishlist && <WishlistButton eventId={eventId} isInWishlist={props.isInWishlist} onToggle={props.onWishlistToggle} />}
        {renderOverlay ? renderOverlay(renderProps) : null}
        {renderBadges ? (
          renderBadges(renderProps)
        ) : (
          <EventCardBadges
            ageGroup={ageGroup}
            isFeatured={event.isFeatured}
            category={event.category}
            showAgeGroup={showAgeGroup}
            showFeaturedBadge={showFeaturedBadge}
            showCategory={showCategory}
          />
        )}
        {renderHeader ? renderHeader(renderProps) : null}
      </div>

      <div className="p-5">
        <EventCardContent
          title={event.title}
          description={event.description}
          shortDescription={event.shortDescription}
          showDescription={finalShowDescription}
          variant={variant}
        />

        <EventCardMetadata
          location={event.location}
          dateSchedule={event.dateSchedule}
          date={event.date}
          showLocation={showLocation}
          showDate={showDate}
          showTime={finalShowTime}
          variant={variant}
        />

        <EventCardStats
          viewsCount={event.viewsCount}
          rating={event.rating}
          reviewsCount={event.reviewsCount}
          bookingsCount={event.bookingsCount}
          showStats={showStats}
        />

        {renderActions ? (
          renderActions(renderProps)
        ) : (
          <EventCardActions
            price={event.price}
            currency={event.currency}
            showPrice={showPrice}
            onClick={handleButtonClick}
          />
        )}

        {finalShowVendor && event.vendorId?.businessName && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-700">
              By <span className="font-medium">{event.vendorId.businessName}</span>
            </p>
          </div>
        )}

        {renderFooter ? renderFooter(renderProps) : null}
      </div>
    </>
  );

  const renderHorizontalVariant = () => (
    <>
      <div className="relative overflow-hidden w-48 md:w-64 flex-shrink-0">
        <EventCardImage
          src={eventImage}
          alt={event.title}
          variant={variant}
          inView={inView}
          imageFit={imageFit}
          imageHeight={imageHeight}
          priority={priority}
          onError={() => { }}
        />
        {showWishlist && <WishlistButton eventId={eventId} isInWishlist={props.isInWishlist} onToggle={props.onWishlistToggle} />}
        {renderOverlay ? renderOverlay(renderProps) : null}
        {renderBadges ? renderBadges(renderProps) : (
          <EventCardBadges
            ageGroup={ageGroup}
            isFeatured={event.isFeatured}
            category={event.category}
            showAgeGroup={showAgeGroup}
            showFeaturedBadge={showFeaturedBadge}
            showCategory={showCategory}
          />
        )}
      </div>

      <div className="flex-1 p-4 flex flex-col justify-between">
        <div>
          {renderHeader ? renderHeader(renderProps) : null}
          <EventCardContent
            title={event.title}
            description={event.description}
            shortDescription={event.shortDescription}
            showDescription={finalShowDescription}
            variant={variant}
          />
          <EventCardMetadata
            location={event.location}
            dateSchedule={event.dateSchedule}
            date={event.date}
            showLocation={showLocation}
            showDate={showDate}
            showTime={finalShowTime}
            variant={variant}
          />
          <EventCardStats
            viewsCount={event.viewsCount}
            rating={event.rating}
            reviewsCount={event.reviewsCount}
            bookingsCount={event.bookingsCount}
            showStats={showStats}
          />
        </div>

        <div className="mt-3">
          {renderActions ? renderActions(renderProps) : (
            <div className="flex items-center justify-between">
              {showPrice && event.price != null && (
                <div className="font-bold text-lg" style={{ color: 'var(--primary-color)' }}>
                  {formatPrice(event.price, event.currency)}
                </div>
              )}
              <button
                className="px-4 py-2 text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-all"
                style={{ backgroundColor: 'var(--accent-color, #FF6B00)' }}
                onClick={handleButtonClick}
              >
                View Details
              </button>
            </div>
          )}
          {renderFooter ? renderFooter(renderProps) : null}
        </div>
      </div>
    </>
  );

  const renderOverlayVariant = () => (
    <>
      <div className="relative overflow-hidden">
        <EventCardImage
          src={eventImage}
          alt={event.title}
          variant={variant}
          inView={inView}
          imageFit={imageFit}
          imageHeight={imageHeight}
          priority={priority}
          onError={() => { }}
        />
        {showWishlist && <WishlistButton eventId={eventId} isInWishlist={props.isInWishlist} onToggle={props.onWishlistToggle} />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        {renderOverlay ? (
          renderOverlay(renderProps)
        ) : (
          <div className="absolute inset-0 p-6 flex flex-col justify-end text-white">
            {renderHeader ? renderHeader(renderProps) : null}
            <h3 className="text-xl sm:text-2xl font-bold mb-2 min-w-0 line-clamp-2">{event.title}</h3>
            {finalShowDescription && event.shortDescription && (
              <p className="text-sm text-white/90 mb-3 line-clamp-2">{event.shortDescription}</p>
            )}
            {finalShowDescription && !event.shortDescription && event.description && (
              <p className="text-sm text-white/90 mb-3 line-clamp-2">
                {truncateDescription(stripHtml(event.description), variant)}
              </p>
            )}
            <div className="flex items-center justify-between">
              {showPrice && event.price != null && (
                <div className="text-xl font-bold">{formatPrice(event.price, event.currency)}</div>
              )}
              {showLocation && (
                <div className="flex items-center text-sm">
                  <FaMapMarkerAlt className="mr-1" />
                  {getEventLocation(event.location)}
                </div>
              )}
            </div>
            {renderFooter ? renderFooter(renderProps) : null}
          </div>
        )}
        {renderBadges ? renderBadges(renderProps) : (
          <EventCardBadges
            ageGroup={ageGroup}
            isFeatured={event.isFeatured}
            category={event.category}
            showAgeGroup={showAgeGroup}
            showFeaturedBadge={showFeaturedBadge}
            showCategory={showCategory}
          />
        )}
      </div>
    </>
  );

  const renderMinimalVariant = () => (
    <>
      <div className="relative overflow-hidden mb-3">
        <EventCardImage
          src={eventImage}
          alt={event.title}
          variant={variant}
          inView={inView}
          imageFit={imageFit}
          imageHeight={imageHeight}
          priority={priority}
          onError={() => { }}
        />
        {showWishlist && <WishlistButton eventId={eventId} isInWishlist={props.isInWishlist} onToggle={props.onWishlistToggle} />}
        {renderBadges && renderBadges(renderProps)}
      </div>

      <div className="text-center">
        {renderHeader ? renderHeader(renderProps) : null}
        <h3 className="text-sm sm:text-base font-semibold mb-2 line-clamp-1 min-w-0 text-gray-900 group-hover:text-blue-600 transition-colors">
          {event.title}
        </h3>
        {showPrice && event.price != null && (
          <div className="font-bold text-base" style={{ color: 'var(--primary-color)' }}>
            {formatPrice(event.price, event.currency)}
          </div>
        )}
        {renderActions && renderActions(renderProps)}
        {renderFooter && renderFooter(renderProps)}
      </div>
    </>
  );

  const renderMagazineVariant = () => (
    <>
      <div className="relative overflow-hidden">
        <EventCardImage
          src={eventImage}
          alt={event.title}
          variant={variant}
          inView={inView}
          imageFit={imageFit}
          imageHeight={imageHeight}
          priority={priority}
          onError={() => { }}
        />
        {showWishlist && <WishlistButton eventId={eventId} isInWishlist={props.isInWishlist} onToggle={props.onWishlistToggle} />}
        {renderOverlay ? renderOverlay(renderProps) : null}
        {renderBadges ? renderBadges(renderProps) : (
          <EventCardBadges
            ageGroup={ageGroup}
            isFeatured={event.isFeatured}
            category={event.category}
            showAgeGroup={showAgeGroup}
            showFeaturedBadge={showFeaturedBadge}
            showCategory={showCategory}
          />
        )}
        {renderHeader ? renderHeader(renderProps) : null}
      </div>

      <div className="p-6">
        {showCategory && event.category && (
          <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--primary-color)' }}>
            {event.category}
          </div>
        )}
        <h3 className="text-lg sm:text-xl font-bold mb-3 leading-tight min-w-0 line-clamp-2 text-gray-900 group-hover:text-blue-600 transition-colors">
          {event.title}
        </h3>
        {finalShowDescription && event.shortDescription && (
          <p className="text-sm text-gray-700 mb-4 line-clamp-3 leading-relaxed">{event.shortDescription}</p>
        )}
        {finalShowDescription && !event.shortDescription && event.description && (
          <p className="text-sm text-gray-700 mb-4 line-clamp-3 leading-relaxed">
            {truncateDescription(stripHtml(event.description), variant)}
          </p>
        )}

        <EventCardMetadata
          location={event.location}
          dateSchedule={event.dateSchedule}
          date={event.date}
          showLocation={showLocation}
          showDate={showDate}
          showTime={finalShowTime}
          variant={variant}
        />

        <EventCardStats
          viewsCount={event.viewsCount}
          rating={event.rating}
          reviewsCount={event.reviewsCount}
          bookingsCount={event.bookingsCount}
          showStats={showStats}
        />

        <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
          {showPrice && event.price != null && (
            <div>
              <span className="text-xs text-gray-600">From</span>
              <div className="font-bold text-xl" style={{ color: 'var(--primary-color)' }}>
                {formatPrice(event.price, event.currency)}
              </div>
            </div>
          )}
          {renderActions ? renderActions(renderProps) : (
            <button
              className="px-6 py-2 text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-all"
              style={{ backgroundColor: 'var(--accent-color, #FF6B00)' }}
              onClick={handleButtonClick}
            >
              Read More
            </button>
          )}
        </div>

        {renderFooter ? renderFooter(renderProps) : null}
      </div>
    </>
  );

  const renderListItemVariant = () => (
    <>
      <div className="relative overflow-hidden flex-shrink-0">
        <EventCardImage
          src={eventImage}
          alt={event.title}
          variant={variant}
          inView={inView}
          imageFit={imageFit}
          imageHeight={imageHeight}
          priority={priority}
          onError={() => { }}
        />
        {showWishlist && <WishlistButton eventId={eventId} isInWishlist={props.isInWishlist} onToggle={props.onWishlistToggle} />}
      </div>

      <div className="flex-1 px-4 py-2 flex items-center justify-between min-w-0">
        <div className="flex-1 min-w-0 mr-4">
          {renderHeader ? renderHeader(renderProps) : null}
          <h3 className="text-sm font-semibold truncate text-gray-900 group-hover:text-blue-600">
            {event.title}
          </h3>
          {showDate && (
            <p className="text-xs text-gray-600 truncate">
              {getEventDate(event as EventCardProps)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {showPrice && event.price != null && (
            <div className="text-sm font-bold" style={{ color: 'var(--primary-color)' }}>
              {formatPrice(event.price, event.currency)}
            </div>
          )}
          {renderActions && renderActions(renderProps)}
        </div>
        {renderFooter && renderFooter(renderProps)}
      </div>
    </>
  );

  const renderVariant = () => {
    switch (variant) {
      case 'horizontal':
        return renderHorizontalVariant();
      case 'overlay':
        return renderOverlayVariant();
      case 'minimal':
        return renderMinimalVariant();
      case 'magazine':
        return renderMagazineVariant();
      case 'list-item':
        return renderListItemVariant();
      case 'vertical-tall':
      case 'featured':
      case 'compact':
      case 'default':
      default:
        return renderDefaultVariant();
    }
  };

  return (
    <div
      ref={ref}
      className={`${cardClasses} ${className}`}
      onClick={handleClick}
      aria-label={ariaLabel || `Event: ${event.title}`}
      role="article"
    >
      {renderVariant()}
    </div>
  );
};

// Custom comparison function for React.memo
// Prevents unnecessary re-renders when props haven't meaningfully changed
const arePropsEqual = (prevProps: EventCardProps, nextProps: EventCardProps): boolean => {
  // Check primitive props and IDs (most common case - fast path)
  if (
    prevProps.id !== nextProps.id &&
    prevProps._id !== nextProps._id
  ) {
    return false; // Different event, must re-render
  }

  // Check display flags
  if (
    prevProps.showPrice !== nextProps.showPrice ||
    prevProps.showLocation !== nextProps.showLocation ||
    prevProps.showDate !== nextProps.showDate ||
    prevProps.showTime !== nextProps.showTime ||
    prevProps.showDescription !== nextProps.showDescription ||
    prevProps.showStats !== nextProps.showStats ||
    prevProps.showCategory !== nextProps.showCategory ||
    prevProps.showVendor !== nextProps.showVendor ||
    prevProps.showAgeGroup !== nextProps.showAgeGroup ||
    prevProps.showFeaturedBadge !== nextProps.showFeaturedBadge ||
    prevProps.showWishlist !== nextProps.showWishlist
  ) {
    return false;
  }

  // Check variant and styling
  if (
    prevProps.variant !== nextProps.variant ||
    prevProps.className !== nextProps.className ||
    prevProps.borderRadius !== nextProps.borderRadius ||
    prevProps.imageHeight !== nextProps.imageHeight ||
    prevProps.imageFit !== nextProps.imageFit
  ) {
    return false;
  }

  // Check title, price, and other frequently changing fields
  if (
    prevProps.title !== nextProps.title ||
    prevProps.price !== nextProps.price ||
    prevProps.currency !== nextProps.currency ||
    prevProps.isFeatured !== nextProps.isFeatured ||
    prevProps.viewsCount !== nextProps.viewsCount
  ) {
    return false;
  }

  // Check wishlist state
  if (prevProps.isInWishlist !== nextProps.isInWishlist) {
    return false;
  }

  // Check function references (only if they changed)
  if (
    prevProps.onClick !== nextProps.onClick ||
    prevProps.onWishlistToggle !== nextProps.onWishlistToggle
  ) {
    return false;
  }

  // For performance, skip deep comparison of images array if first image is the same
  const prevFirstImage = prevProps.images?.[0] || prevProps.image;
  const nextFirstImage = nextProps.images?.[0] || nextProps.image;
  if (prevFirstImage !== nextFirstImage) {
    return false;
  }

  // Props are equal, skip re-render
  return true;
};

// Memoize component to prevent unnecessary re-renders when props don't change
// With custom comparison for better performance on complex props
export default React.memo(EventCard, arePropsEqual);