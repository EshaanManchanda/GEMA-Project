import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useInView } from 'react-intersection-observer';
import { FaMapMarkerAlt, FaChild, FaCalendar, FaClock, FaEye, FaStar, FaHeart, FaRegHeart } from 'react-icons/fa';
import { getPlaceholderUrl } from '../../utils/placeholderImage';
import DOMPurify from 'isomorphic-dompurify';


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
  images?: string[];
  image?: string;
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
  if (!price) return '';
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

const getEventDate = (event: EventCardProps): string => {
  if (event.date) return new Date(event.date).toLocaleDateString();
  if (event.dateSchedule?.[0]) {
    return new Date(event.dateSchedule[0].startDate).toLocaleDateString();
  }
  return 'Date TBD';
};

const getEventTime = (event: EventCardProps): string => {
  if (event.dateSchedule?.[0]) {
    const start = new Date(event.dateSchedule[0].startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const end = new Date(event.dateSchedule[0].endDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `${start} - ${end}`;
  }
  return '10:00 AM - 4:00 PM';
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
    'default': 'shadow-md hover:shadow-lg',
    'featured': 'shadow-lg hover:shadow-2xl border border-gray-100 hover:border-gray-200 transform hover:-translate-y-2 duration-500',
    'compact': 'shadow-sm hover:shadow-md',
    'horizontal': 'shadow-md hover:shadow-lg flex flex-row',
    'vertical-tall': 'shadow-lg hover:shadow-xl',
    'overlay': 'shadow-xl relative',
    'minimal': 'hover:shadow-md',
    'magazine': 'shadow-md hover:shadow-lg border-l-4 border-transparent hover:border-primary',
    'list-item': 'shadow-sm hover:bg-gray-50 flex flex-row items-center'
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

  return (
    <img
      src={src}
      alt={alt}
      className={imageClasses}
      loading={priority ? 'eager' : 'lazy'}
      onError={onError}
      width="400"
      height="300"
    />
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
          {category}
        </div>
      )}
    </>
  );
};

interface EventCardContentProps {
  title: string;
  description?: string;
  showDescription?: boolean;
  variant: string;
}

const EventCardContent: React.FC<EventCardContentProps> = ({
  title,
  description,
  showDescription = false,
  variant
}) => {
  const truncatedDescription = description ? truncateDescription(description, variant) : '';

  return (
    <>
      <h3 className="text-lg font-semibold mb-2 line-clamp-2 min-h-[3.5rem] text-gray-900 group-hover:text-blue-600 transition-colors">
        {title}
      </h3>
      {showDescription && truncatedDescription && (
        <div
          className="text-sm text-gray-700 mb-3 line-clamp-2"
          dangerouslySetInnerHTML={{
            __html: DOMPurify.sanitize(truncatedDescription, {
              ADD_ATTR: ['style', 'class'],
              ADD_TAGS: ['iframe'],
              ALLOWED_ATTR: ['style', 'class', 'href', 'src', 'alt', 'title', 'target', 'rel', 'width', 'height', 'id']
            })
          }}
        />
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

      {showTime && variant !== 'compact' && variant !== 'minimal' && variant !== 'list-item' && (
        <div className="flex items-center text-gray-700 text-sm">
          <FaClock className="mr-2 flex-shrink-0" style={{ color: 'var(--primary-color)' }} />
          <p>{getEventTime(event)}</p>
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
      {showPrice && price ? (
        <div>
          <span className="text-xs text-gray-700">Starting from</span>
          <div className="font-bold text-lg" style={{ color: 'var(--primary-color)' }}>
            {formatPrice(price, currency)}
          </div>
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

  const eventId = event.id || event._id || '';
  const eventSlug = event.slug || event.id || event._id || '';
  const eventImage = getEventImage(event);
  const ageGroup = getAgeGroup(event);

  const finalShowTime = showTime !== undefined ? showTime : !['compact', 'minimal', 'list-item'].includes(variant);
  const finalShowDescription = showDescription !== undefined ? showDescription : ['vertical-tall', 'magazine'].includes(variant);
  const finalShowVendor = showVendor !== undefined ? showVendor : variant === 'featured';

  const handleClick = () => {
    if (onClick) {
      onClick(event as EventCardProps);
    } else if (!disableNavigation && eventSlug) {
      navigate(`/events/${eventSlug}`);
    }
  };

  const handleButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleClick();
  };

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
              {showPrice && event.price && (
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
            <h3 className="text-2xl font-bold mb-2">{event.title}</h3>
            {finalShowDescription && event.description && (
              <div
                className="text-sm text-white/90 mb-3 line-clamp-2"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(truncateDescription(event.description, variant), {
                    ADD_ATTR: ['style', 'class'],
                    ADD_TAGS: ['iframe'],
                    ALLOWED_ATTR: ['style', 'class', 'href', 'src', 'alt', 'title', 'target', 'rel', 'width', 'height', 'id']
                  })
                }}
              />
            )}
            <div className="flex items-center justify-between">
              {showPrice && event.price && (
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
        <h3 className="text-base font-semibold mb-2 line-clamp-1 text-gray-900 group-hover:text-blue-600 transition-colors">
          {event.title}
        </h3>
        {showPrice && event.price && (
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
        <h3 className="text-xl font-bold mb-3 leading-tight text-gray-900 group-hover:text-blue-600 transition-colors">
          {event.title}
        </h3>
        {finalShowDescription && event.description && (
          <div
            className="text-sm text-gray-700 mb-4 line-clamp-3 leading-relaxed"
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(truncateDescription(event.description, variant), {
                ADD_ATTR: ['style', 'class'],
                ADD_TAGS: ['iframe'],
                ALLOWED_ATTR: ['style', 'class', 'href', 'src', 'alt', 'title', 'target', 'rel', 'width', 'height', 'id']
              })
            }}
          />
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
          {showPrice && event.price && (
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
          {showPrice && event.price && (
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

// Memoize component to prevent unnecessary re-renders when props don't change
export default React.memo(EventCard);