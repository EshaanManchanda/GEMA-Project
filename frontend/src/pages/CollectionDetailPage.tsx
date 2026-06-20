import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FaArrowLeft, FaChevronRight, FaMapMarkerAlt, FaCalendarAlt, FaUsers, FaRedo } from 'react-icons/fa';
import collectionsAPI, { Collection } from '../services/api/collectionsAPI';
import { getPlaceholderUrl } from '../utils/placeholderImage';
import DOMPurify from 'isomorphic-dompurify';
import { format } from 'date-fns';
import { CollectionSEO } from '@/components/common/SEO';
import { HoverCard, AnimatedButton } from '@/components/animations';
import logger from '@/utils/logger';

interface Event {
  _id: string;
  slug?: string;
  title: string;
  shortDescription?: string;
  description?: string;
  images?: string[];
  price?: number;
  category?: string;
  location?: {
    city?: string;
    address?: string;
  };
  dateSchedule?: Array<{
    date?: string;        // Single date field (legacy format)
    startDate?: string;   // Date range start
    endDate?: string;     // Date range end
  }>;
  viewsCount?: number;
}

interface CollectionWithEvents extends Collection {
  events: Event[];
}

// Helper to safely extract date from schedule (handles both date formats)
const getEventDate = (schedule?: Array<{ date?: string; startDate?: string; endDate?: string }>) => {
  if (!schedule || schedule.length === 0) return null;
  const firstSchedule = schedule[0];
  return firstSchedule.date || firstSchedule.startDate || null;
};

const parseCountString = (value?: string): number => {
  if (!value) return 0;
  const parsed = parseInt(value.replace(/[^\d]/g, ''), 10);
  return Number.isNaN(parsed) ? 0 : parsed;
};

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
        className={`w-full h-full object-cover transition-all duration-500 ${isLoading ? 'blur-sm opacity-70' : 'opacity-100'
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

const CollectionDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [collection, setCollection] = useState<CollectionWithEvents | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch collection data
  const fetchCollection = async (isRetry = false) => {
    if (!id) return;

    try {
      if (!isRetry) {
        setIsLoading(true);
      }
      setError(null);

      const response = await collectionsAPI.getCollectionById(id, { _t: Date.now() });
      const collectionData = response.collection as CollectionWithEvents;

      if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_API === 'true') {
        logger.debug('Collection detail fetched:', collectionData);
      }

      setCollection(collectionData);
    } catch (err: any) {
      logger.error('Error fetching collection:', err);

      if (err.response?.status === 404) {
        setError('Collection not found. It may have been removed or is no longer available.');
      } else {
        setError('Unable to load collection details. Please try again later.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCollection();
  }, [id]);

  const handleEventClick = (event: Event) => {
    navigate(`/events/${event.slug || event._id}`);
  };

  const handleBackToCollections = () => {
    navigate('/collections');
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header Skeleton */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="animate-pulse">
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-8 h-8 bg-gray-200 rounded"></div>
                <div className="w-32 h-4 bg-gray-200 rounded"></div>
              </div>
              <div className="flex items-start space-x-6">
                <div className="w-24 h-24 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="w-64 h-8 bg-gray-200 rounded mb-2"></div>
                  <div className="w-32 h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="w-96 h-4 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Skeleton */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
                <div className="w-full h-48 bg-gray-200"></div>
                <div className="p-4">
                  <div className="w-full h-6 bg-gray-200 rounded mb-2"></div>
                  <div className="w-3/4 h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="w-1/2 h-4 bg-gray-200 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center p-6">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Oops! Something went wrong</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-y-3">
            <button
              onClick={() => fetchCollection(true)}
              className="flex items-center space-x-2 bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg mx-auto transition-colors"
            >
              <FaRedo size={14} />
              <span>Try Again</span>
            </button>
            <button
              onClick={handleBackToCollections}
              className="flex items-center space-x-2 text-primary hover:text-primary-dark px-4 py-2 rounded-lg mx-auto transition-colors"
            >
              <FaArrowLeft size={14} />
              <span>Back to Collections</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Collection not found
  if (!collection) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center p-6">
          <div className="text-gray-400 text-6xl mb-4">📚</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Collection Not Found</h2>
          <p className="text-gray-600 mb-6">
            The collection you're looking for doesn't exist or has been removed.
          </p>
          <button
            onClick={handleBackToCollections}
            className="flex items-center space-x-2 bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg mx-auto transition-colors"
          >
            <FaArrowLeft size={14} />
            <span>Back to Collections</span>
          </button>
        </div>
      </div>
    );
  }

  const breadcrumbs = collection ? [
    { name: 'Home', url: '/' },
    { name: 'Collections', url: '/collections' },
    { name: collection.title.replace(/&amp;/g, '&'), url: `/collections/${collection.slug || collection._id}` }
  ] : [];

  const activitiesCount =
    collection.eventsCount ||
    collection.events?.length ||
    parseCountString(collection.count);

  return (
    <>
      {collection && <CollectionSEO collection={collection} breadcrumbs={breadcrumbs} />}
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Breadcrumb */}
            <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-6">
              <Link to="/" className="hover:text-gray-700">Home</Link>
              <FaChevronRight size={10} />
              <button onClick={handleBackToCollections} className="hover:text-gray-700">
                Collections
              </button>
              <FaChevronRight size={10} />
              <span className="text-gray-900 font-medium">{collection.title.replace(/&amp;/g, '&')}</span>
            </nav>

            {/* Collection Header */}
            <div className="flex items-start space-x-6">
              {/* Collection Icon */}
              <div className="flex-shrink-0">
                <div className="w-24 h-24 rounded-full p-4 flex items-center justify-center"
                // style={{ backgroundColor: 'var(--secondary-color, #6DB0E1)', opacity: 0.1 }}
                >
                  <img
                    src={
                      // Priority 1: New iconAsset (MediaAsset.url)
                      collection.iconAsset?.url ||
                      // Priority 2: Legacy icon URL
                      collection.icon ||
                      // Priority 3: Generate placeholder
                      getPlaceholderUrl('categoryIcon', collection.title.slice(0, 2))
                    }
                    alt={collection.title}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = getPlaceholderUrl('categoryIcon', collection.title.slice(0, 2));
                    }}
                  />
                </div>
              </div>

              {/* Collection Info */}
              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-2 text-primary">
                  {collection.title.replace(/&amp;/g, '&')}
                </h1>

                <div className="flex items-center space-x-4 mb-4">
                  <span className="text-lg text-gray-600">{activitiesCount}+ activities</span>
                  {collection.category && (
                    <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-orange-50 text-orange-600">
                      {collection.category}
                    </span>
                  )}
                </div>

                <p className="text-gray-700 text-lg max-w-3xl">
                  {collection.description}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Events Grid */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Featured Activities & Events
            </h2>
            <p className="text-gray-600">
              {activitiesCount} activities available
            </p>
          </div>

          {collection.events && collection.events.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {collection.events.map((event) => (
                <HoverCard
                  key={event._id}
                  className="bg-white rounded-2xl shadow-lg hover:shadow-2xl overflow-hidden group transition-all duration-500 border border-gray-100 hover:border-gray-200 transform hover:-translate-y-2 cursor-pointer"
                  onClick={() => handleEventClick(event)}
                >
                  {/* Event Image */}
                  <div className="relative overflow-hidden">
                    <LazyImage
                      src={event.images?.[0] || getPlaceholderUrl('eventCard', event.title)}
                      alt={event.title}
                      className="w-full h-64 transition-transform duration-500 group-hover:scale-105"
                      fallbackSrc={getPlaceholderUrl('eventCard', 'Event Image')}
                    />
                    {event.category && (
                      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 text-sm font-semibold text-gray-900 shadow-sm">
                        {event.category.replace(/&amp;/g, '&')}
                      </div>
                    )}
                  </div>

                  {/* Event Info */}
                  <div className="p-6">
                    <h3 className="text-xl font-semibold mb-4 line-clamp-2 text-gray-900 group-hover:text-primary transition-colors">
                      {event.title}
                    </h3>

                    {(event.shortDescription || event.description) && (
                      <div
                        className="text-gray-700 text-sm mb-4 line-clamp-2"
                        dangerouslySetInnerHTML={{
                          __html: DOMPurify.sanitize(event.shortDescription || event.description || '', {
                            ADD_ATTR: ['style', 'class'],
                            ADD_TAGS: ['iframe'],
                            ALLOWED_ATTR: ['style', 'class', 'href', 'src', 'alt', 'title', 'target', 'rel', 'width', 'height', 'id']
                          })
                        }}
                      />
                    )}

                    <div className="flex flex-col gap-3 mb-4">
                      {event.price !== undefined && (
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-primary">
                            {event.price === 0 ? 'Free' : `AED ${event.price}`}
                          </span>
                        </div>
                      )}

                      <div className="flex flex-col gap-1">
                        {/* Date */}
                        {event.dateSchedule && event.dateSchedule.length > 0 && (() => {
                          const eventDate = getEventDate(event.dateSchedule);
                          return eventDate ? (
                            <div className="flex items-center text-sm text-gray-700">
                              <FaCalendarAlt size={12} className="mr-2 text-gray-900" />
                              <span>{format(new Date(eventDate), 'MMM dd, yyyy')}</span>
                            </div>
                          ) : null;
                        })()}

                        {/* Location */}
                        {event.location && (event.location.city || event.location.address) && (
                          <div className="flex items-center text-sm text-gray-700">
                            <FaMapMarkerAlt size={12} className="mr-2 text-gray-900" />
                            <span>{event.location.city || event.location.address}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      {event.viewsCount !== undefined && (
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-primary/10">
                            <FaUsers size={14} className="text-gray-900" />
                          </div>
                          <span className="text-sm font-medium">{event.viewsCount} views</span>
                        </div>
                      )}
                      <AnimatedButton
                        className="bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 hover:opacity-90 hover:shadow-lg hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-95 whitespace-nowrap"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEventClick(event);
                        }}
                        aria-label={`View details for ${event.title}`}
                      >
                        View Details
                      </AnimatedButton>
                    </div>
                  </div>
                </HoverCard>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">🎭</div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                No Activities Available
              </h3>
              <p className="text-gray-500 mb-6">
                This collection doesn't have any activities at the moment. Check back later!
              </p>
              <button
                onClick={handleBackToCollections}
                className="bg-primary hover:bg-primary-dark text-white px-6 py-2 rounded-lg transition-colors"
              >
                Browse Other Collections
              </button>
            </div>
          )}
        </div>

        {/* Back to Collections Button */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          <button
            onClick={handleBackToCollections}
            className="flex items-center space-x-2 text-primary hover:text-primary-dark font-medium transition-colors"
          >
            <FaArrowLeft size={14} />
            <span>Back to All Collections</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default CollectionDetailPage;