import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FaArrowLeft, FaChevronRight, FaMapMarkerAlt, FaCalendarAlt, FaUsers, FaRedo } from 'react-icons/fa';
import collectionsAPI, { Collection } from '../services/api/collectionsAPI';
import { getPlaceholderUrl } from '../utils/placeholderImage';
import { format } from 'date-fns';
import { CollectionSEO } from '@/components/common/SEO';

interface Event {
  _id: string;
  title: string;
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

      const response = await collectionsAPI.getCollectionById(id);
      const collectionData = response.collection as CollectionWithEvents;

      if (import.meta.env.VITE_DEV && import.meta.env.VITE_DEBUG_API === 'true') {
        console.log('Collection detail fetched:', collectionData);
      }

      setCollection(collectionData);
    } catch (err: any) {
      console.error('Error fetching collection:', err);

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
    navigate(`/events/${event._id}`);
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
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg mx-auto transition-colors"
            >
              <FaRedo size={14} />
              <span>Try Again</span>
            </button>
            <button
              onClick={handleBackToCollections}
              className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 px-4 py-2 rounded-lg mx-auto transition-colors"
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
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg mx-auto transition-colors"
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
    { name: collection.title, url: `/collections/${id}` }
  ] : [];

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
            <span className="text-gray-900 font-medium">{collection.title}</span>
          </nav>

          {/* Collection Header */}
          <div className="flex items-start space-x-6">
            {/* Collection Icon */}
            <div className="flex-shrink-0">
              <div className="w-24 h-24 rounded-full p-4 flex items-center justify-center"
                style={{ backgroundColor: 'var(--secondary-color, #6DB0E1)', opacity: 0.1 }}
              >
                <img
                  src={collection.icon}
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
              <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--primary-color, #008EC7)' }}>
                {collection.title}
              </h1>

              <div className="flex items-center space-x-4 mb-4">
                <span className="text-lg text-gray-600">{collection.count}</span>
                {collection.category && (
                  <span className="inline-block px-3 py-1 rounded-full text-sm font-medium"
                    style={{ backgroundColor: 'rgba(255, 107, 0, 0.1)', color: 'var(--accent-color, #FF6B00)' }}
                  >
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
            {collection.events?.length || 0} activities available
          </p>
        </div>

        {collection.events && collection.events.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {collection.events.map((event) => (
              <div
                key={event._id}
                onClick={() => handleEventClick(event)}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer group"
              >
                {/* Event Image */}
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={event.images?.[0] || getPlaceholderUrl('eventCard', event.title)}
                    alt={event.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  {event.price !== undefined && (
                    <div className="absolute top-4 right-4 bg-white bg-opacity-90 px-2 py-1 rounded-lg">
                      <span className="text-lg font-bold text-green-600">
                        {event.price === 0 ? 'Free' : `$${event.price}`}
                      </span>
                    </div>
                  )}
                </div>

                {/* Event Info */}
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                    {event.title}
                  </h3>

                  {event.description && (
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                      {event.description}
                    </p>
                  )}

                  <div className="space-y-2">
                    {/* Location */}
                    {event.location && (event.location.city || event.location.address) && (
                      <div className="flex items-center text-sm text-gray-500">
                        <FaMapMarkerAlt className="mr-2" size={12} />
                        <span>{event.location.city || event.location.address}</span>
                      </div>
                    )}

                    {/* Date */}
                    {event.dateSchedule && event.dateSchedule.length > 0 && (() => {
                      const eventDate = getEventDate(event.dateSchedule);
                      return eventDate ? (
                        <div className="flex items-center text-sm text-gray-500">
                          <FaCalendarAlt className="mr-2" size={12} />
                          <span>
                            {format(new Date(eventDate), 'MMM dd, yyyy')}
                          </span>
                        </div>
                      ) : null;
                    })()}

                    {/* Views */}
                    {event.viewsCount !== undefined && (
                      <div className="flex items-center text-sm text-gray-500">
                        <FaUsers className="mr-2" size={12} />
                        <span>{event.viewsCount} views</span>
                      </div>
                    )}
                  </div>

                  {/* Category */}
                  {event.category && (
                    <div className="mt-3">
                      <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                        {event.category}
                      </span>
                    </div>
                  )}
                </div>
              </div>
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
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
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
          className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 font-medium transition-colors"
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