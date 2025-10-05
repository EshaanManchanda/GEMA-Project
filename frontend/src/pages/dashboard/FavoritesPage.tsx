import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/store';
import { fetchFavorites, removeFromFavorites } from '@/store/slices/favoritesSlice';
import { Event } from '@/types/event';

const FavoritesPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { items: favorites, isLoading, error } = useSelector((state: RootState) => state.favorites);
  const [view, setView] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    dispatch(fetchFavorites());
  }, [dispatch]);

  const formatDate = (dateString: string): string => {
    if (!dateString) return 'Date TBD';
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const getEventImage = (event: Event): string => {
    if (event.images && event.images.length > 0) {
      return event.images[0];
    }
    return 'https://placehold.co/600x400/gray/white?text=No+Image';
  };

  const getEventPrice = (event: Event): string => {
    if (event.price && event.currency) {
      return `${event.currency} ${event.price}`;
    }
    return event.price ? `$${event.price}` : 'Price TBD';
  };

  const getEventLocation = (event: Event): string => {
    if (!event.location) return 'Location TBD';
    if (typeof event.location === 'string') return event.location;
    const { city, address } = event.location as any;
    if (city && address) return `${city}, ${address}`;
    return city || address || 'Location TBD';
  };

  const getEventDate = (event: Event): string => {
    if (!event.dateSchedule || !Array.isArray(event.dateSchedule)) return '';
    const firstSchedule = event.dateSchedule[0];
    if (!firstSchedule) return '';
    return (firstSchedule as any).date || (firstSchedule as any).startDate || '';
  };

  const handleRemoveFavorite = async (eventId: string) => {
    if (window.confirm('Are you sure you want to remove this event from your favorites?')) {
      await dispatch(removeFromFavorites(eventId));
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <svg className="animate-spin h-10 w-10 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">My Favorite Events</h1>
          <div className="flex space-x-2">
            <button
              onClick={() => setView('grid')}
              className={`p-2 rounded-md ${view === 'grid' ? 'bg-primary text-white' : 'bg-gray-200 text-gray-600'}`}
              aria-label="Grid view"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setView('list')}
              className={`p-2 rounded-md ${view === 'list' ? 'bg-primary text-white' : 'bg-gray-200 text-gray-600'}`}
              aria-label="List view"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
        
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
            <p>{error}</p>
          </div>
        )}
        
        {favorites.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No favorite events</h3>
            <p className="mt-1 text-sm text-gray-500">
              You haven't saved any events to your favorites yet.
            </p>
            <div className="mt-6">
              <Link to="/events" className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">
                <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Browse Events
              </Link>
            </div>
          </div>
        ) : view === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {favorites.map((event) => (
              <div key={event._id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200">
                <div className="relative">
                  <img
                    className="w-full h-48 object-cover"
                    src={getEventImage(event)}
                    alt={event.title}
                  />
                  <button
                    className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-md hover:bg-gray-100 focus:outline-none"
                    onClick={() => handleRemoveFavorite(event._id)}
                    aria-label="Remove from favorites"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 hover:text-primary">
                      <Link to={`/events/${event._id}`}>
                        {event.title}
                      </Link>
                    </h3>
                    <span className="bg-primary-light text-primary-dark text-xs font-semibold px-2.5 py-0.5 rounded-full">
                      {getEventPrice(event)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 mb-3">
                    <p className="flex items-center mb-1">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {formatDate(getEventDate(event))}
                    </p>
                    <p className="flex items-center mb-1">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {getEventLocation(event)}
                    </p>
                    {event.description && (
                      <p className="flex items-start mb-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-xs line-clamp-2">{event.description}</span>
                      </p>
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <Link
                      to={`/events/${event._id}`}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                    >
                      View Details
                    </Link>
                    <button
                      className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                      onClick={() => handleRemoveFavorite(event._id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {favorites.map((event) => (
              <div key={event._id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200">
                <div className="flex flex-col sm:flex-row">
                  <div className="sm:w-1/3 md:w-1/4 relative">
                    <img
                      className="h-48 w-full object-cover sm:h-full"
                      src={getEventImage(event)}
                      alt={event.title}
                    />
                    <button
                      className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-md hover:bg-gray-100 focus:outline-none"
                      onClick={() => handleRemoveFavorite(event._id)}
                      aria-label="Remove from favorites"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                  <div className="p-4 sm:p-6 sm:w-2/3 md:w-3/4">
                    <div className="flex flex-col sm:flex-row justify-between">
                      <div>
                        <div className="flex items-center mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 mr-2">
                            <Link to={`/events/${event._id}`} className="hover:text-primary">
                              {event.title}
                            </Link>
                          </h3>
                          <span className="bg-primary-light text-primary-dark text-xs font-semibold px-2.5 py-0.5 rounded-full">
                            {getEventPrice(event)}
                          </span>
                        </div>
                        <div className="text-sm text-gray-500 mb-3">
                          <p className="flex items-center mb-1">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {formatDate(getEventDate(event))}
                          </p>
                          <p className="flex items-center mb-1">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {getEventLocation(event)}
                          </p>
                          {event.description && (
                            <p className="flex items-start mb-1">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="text-sm">{event.description}</span>
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="mt-4 sm:mt-0 flex flex-col space-y-2">
                        <Link
                          to={`/events/${event._id}`}
                          className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                        >
                          View Details
                        </Link>
                        <button
                          className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                          onClick={() => handleRemoveFavorite(event._id)}
                        >
                          Remove from Favorites
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FavoritesPage;