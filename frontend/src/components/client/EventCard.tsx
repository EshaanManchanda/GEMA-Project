import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaMapMarkerAlt, FaChild, FaCalendar, FaClock, FaEye, FaStar } from 'react-icons/fa';
import { getPlaceholderUrl } from '../../utils/placeholderImage';

export interface EventCardProps {
  _id?: string;
  id: string;
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
  ageRange?: {
    min: number;
    max: number;
  };
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
  variant?: 'default' | 'featured' | 'compact';
  showStats?: boolean;
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
    return `${event.ageRange.min}-${event.ageRange.max} years`;
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

const EventCard: React.FC<EventCardProps> = ({ 
  variant = 'default',
  className = '',
  showStats = false,
  ...event 
}) => {
  const navigate = useNavigate();
  
  const eventId = event.id || event._id || '';
  const eventImage = getEventImage(event);
  const ageGroup = getAgeGroup(event);
  
  const handleClick = () => {
    if (eventId) {
      navigate(`/events/${eventId}`);
    }
  };

  const cardClasses = {
    default: 'bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-all duration-300 group cursor-pointer',
    featured: 'bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-500 group cursor-pointer border border-gray-100 hover:border-gray-200 transform hover:-translate-y-2',
    compact: 'bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-all duration-300 group cursor-pointer'
  };

  const imageClasses = {
    default: 'w-full h-52 object-cover transition-transform duration-500 group-hover:scale-105',
    featured: 'w-full h-64 object-cover transition-transform duration-500 group-hover:scale-105',
    compact: 'w-full h-40 object-cover transition-transform duration-300 group-hover:scale-105'
  };

  return (
    <div 
      className={`${cardClasses[variant]} ${className}`}
      onClick={handleClick}
    >
      <div className="relative overflow-hidden">
        <img 
          src={eventImage} 
          alt={event.title} 
          className={imageClasses[variant]}
          onError={(e) => {
            e.currentTarget.src = getPlaceholderUrl('eventCard', event.title);
          }}
        />
        {ageGroup && (
          <div className="absolute top-3 right-3 bg-white rounded-full px-3 py-1 text-sm font-semibold shadow-sm" 
               style={{ color: 'var(--primary-color)' }}>
            <FaChild className="inline mr-1" />
            Ages {ageGroup}
          </div>
        )}
        {event.isFeatured && (
          <div className="absolute top-3 left-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-sm">
            FEATURED
          </div>
        )}
      </div>
      
      <div className="p-5">
        <h3 className="text-lg font-semibold mb-2 line-clamp-2 min-h-[3.5rem] group-hover:text-blue-600 transition-colors">
          {event.title}
        </h3>
        
        {event.description && variant !== 'compact' && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {event.description}
          </p>
        )}

        <div className="space-y-2 mb-3">
          <div className="flex items-center text-gray-500 text-sm">
            <FaMapMarkerAlt className="mr-2 flex-shrink-0" style={{ color: 'var(--primary-color)' }} />
            <p className="truncate">{getEventLocation(event.location)}</p>
          </div>
          
          {variant !== 'compact' && (
            <>
              <div className="flex items-center text-gray-500 text-sm">
                <FaCalendar className="mr-2 flex-shrink-0" style={{ color: 'var(--primary-color)' }} />
                <p>{getEventDate(event)}</p>
              </div>
              
              <div className="flex items-center text-gray-500 text-sm">
                <FaClock className="mr-2 flex-shrink-0" style={{ color: 'var(--primary-color)' }} />
                <p>{getEventTime(event)}</p>
              </div>
            </>
          )}
        </div>

        {/* Stats display for popular events */}
        {showStats && (event.viewsCount || event.rating) && (
          <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
            {event.viewsCount && (
              <div className="flex items-center gap-1">
                <FaEye className="text-blue-500" />
                <span>{formatViewCount(event.viewsCount)}</span>
              </div>
            )}
            {event.rating && (
              <div className="flex items-center gap-1">
                <FaStar className="text-yellow-500" />
                <span>{formatRating(event.rating)}</span>
                {event.reviewsCount && (
                  <span className="text-gray-400">({event.reviewsCount})</span>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-between items-center pt-3 border-t border-gray-100">
          <div>
            {event.price ? (
              <>
                <span className="text-xs text-gray-500">Starting from</span>
                <div className="font-bold text-lg" style={{ color: 'var(--primary-color)' }}>
                  {formatPrice(event.price, event.currency)}
                </div>
              </>
            ) : (
              <div className="text-sm text-gray-500">
                {getEventDate(event)}
              </div>
            )}
          </div>
          
          <button
            className="px-6 py-3 text-white text-sm font-semibold rounded-xl hover:opacity-90 hover:shadow-lg hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-95 whitespace-nowrap"
            style={{
              backgroundColor: 'var(--accent-color, #FF6B00)',
              boxShadow: '0 4px 14px 0 rgba(255, 107, 0, 0.3)'
            }}
            onClick={(e) => {
              e.stopPropagation();
              handleClick();
            }}
          >
            View Details
          </button>
        </div>

        {event.vendorId?.businessName && variant === 'featured' && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              By <span className="font-medium">{event.vendorId.businessName}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// Memoize component to prevent unnecessary re-renders when props don't change
export default React.memo(EventCard);