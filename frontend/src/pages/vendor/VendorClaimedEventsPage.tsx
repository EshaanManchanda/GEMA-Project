import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import affiliateEventAPI from '../../services/api/affiliateEventAPI';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import toast from 'react-hot-toast';

interface ClaimedEvent {
  _id: string;
  title: string;
  description: string;
  image?: string;
  externalBookingLink: string;
  claimedAt: Date;
  affiliateClickTracking: {
    totalClicks: number;
    uniqueClicks: number;
    lastClickedAt?: Date;
  };
  schedule?: {
    startDate: Date;
    endDate?: Date;
  };
  location?: {
    city: string;
    venue: string;
  };
}

const VendorClaimedEventsPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [claimedEvents, setClaimedEvents] = useState<ClaimedEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchClaimedEvents();
  }, []);

  const fetchClaimedEvents = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await affiliateEventAPI.getClaimedEvents();
      setClaimedEvents(data.events || []);
    } catch (err: any) {
      console.error('Error fetching claimed events:', err);
      setError(err.response?.data?.message || 'Failed to load claimed events');
      toast.error('Failed to load claimed events');
    } finally {
      setIsLoading(false);
    }
  };

  const getDefaultImage = (title: string) => {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(title)}&size=400&background=f97316&color=fff&bold=true`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading claimed events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Claimed Events</h1>
        <p className="text-gray-600">
          Manage affiliate events you've claimed and track their performance
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card variant="elevated">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Claimed Events</p>
                <p className="text-3xl font-bold text-gray-900">{claimedEvents.length}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="elevated">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Clicks</p>
                <p className="text-3xl font-bold text-gray-900">
                  {claimedEvents.reduce((sum, event) => sum + (event.affiliateClickTracking?.totalClicks || 0), 0)}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
                  />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="elevated">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Unique Visitors</p>
                <p className="text-3xl font-bold text-gray-900">
                  {claimedEvents.reduce((sum, event) => sum + (event.affiliateClickTracking?.uniqueClicks || 0), 0)}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Events List */}
      {error ? (
        <Card variant="elevated">
          <CardContent className="text-center py-12">
            <svg
              className="w-16 h-16 text-red-500 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Events</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={fetchClaimedEvents}
              className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition"
            >
              Try Again
            </button>
          </CardContent>
        </Card>
      ) : claimedEvents.length === 0 ? (
        <Card variant="elevated">
          <CardContent className="text-center py-12">
            <svg
              className="w-16 h-16 text-gray-400 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Claimed Events Yet</h3>
            <p className="text-gray-600 mb-4">
              You haven't claimed any affiliate events yet. Browse unclaimed events and claim them to manage here.
            </p>
            <Link
              to="/events"
              className="inline-block px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition"
            >
              Browse Events
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {claimedEvents.map((event) => (
            <Card key={event._id} variant="elevated" className="overflow-hidden hover:shadow-lg transition">
              {/* Event Image */}
              <div className="relative h-48 bg-gray-200">
                <img
                  src={event.image || getDefaultImage(event.title)}
                  alt={event.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = getDefaultImage(event.title);
                  }}
                />
                <div className="absolute top-4 right-4">
                  <Badge variant="success">Claimed</Badge>
                </div>
              </div>

              <CardContent className="p-6">
                {/* Title */}
                <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">{event.title}</h3>

                {/* Description */}
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">{event.description}</p>

                {/* Location & Date */}
                {(event.location || event.schedule) && (
                  <div className="mb-4 space-y-2">
                    {event.location && (
                      <div className="flex items-center text-sm text-gray-600">
                        <svg
                          className="w-4 h-4 mr-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                        <span>
                          {event.location.venue}, {event.location.city}
                        </span>
                      </div>
                    )}
                    {event.schedule?.startDate && (
                      <div className="flex items-center text-sm text-gray-600">
                        <svg
                          className="w-4 h-4 mr-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        <span>{format(new Date(event.schedule.startDate), 'MMM dd, yyyy')}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b border-gray-200">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Total Clicks</p>
                    <p className="text-xl font-bold text-gray-900">
                      {event.affiliateClickTracking?.totalClicks || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Unique Visitors</p>
                    <p className="text-xl font-bold text-gray-900">
                      {event.affiliateClickTracking?.uniqueClicks || 0}
                    </p>
                  </div>
                </div>

                {/* Claimed Info */}
                <div className="mb-4">
                  <p className="text-xs text-gray-500">
                    Claimed on {format(new Date(event.claimedAt), 'MMM dd, yyyy')}
                  </p>
                  {event.affiliateClickTracking?.lastClickedAt && (
                    <p className="text-xs text-gray-500">
                      Last clicked {format(new Date(event.affiliateClickTracking.lastClickedAt), 'MMM dd, yyyy HH:mm')}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Link
                    to={`/events/${event._id}`}
                    className="flex-1 px-4 py-2 bg-orange-600 text-white text-center rounded-md hover:bg-orange-700 transition text-sm font-medium"
                  >
                    View Event
                  </Link>
                  <a
                    href={event.externalBookingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 px-4 py-2 bg-white text-orange-600 text-center border border-orange-600 rounded-md hover:bg-orange-50 transition text-sm font-medium"
                  >
                    Booking Link
                  </a>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default VendorClaimedEventsPage;
