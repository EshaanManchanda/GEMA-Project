import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import vendorAPI from '../../services/api/vendorAPI';
import eventsAPI from '../../services/api/eventsAPI';
import { Card, CardContent } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';

import toast from 'react-hot-toast';
import PrivatePageSEO from '@/components/common/PrivatePageSEO';

interface ClaimedEvent {
  _id: string;
  title: string;
  slug?: string;
  description: string;
  image?: string;
  externalBookingLink?: string;
  claimedAt?: Date;
  affiliateClickTracking?: {
    totalClicks: number;
    uniqueClicks: number;
    lastClickedAt?: Date;
  };
  viewsCount?: number;
  schedule?: {
    startDate: Date;
    endDate?: Date;
  };
  location?: {
    city: string;
    venue: string;
  };
  type: 'affiliate' | 'standard';
  status?: string;
}

const VendorClaimedEventsPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [claimedEvents, setClaimedEvents] = useState<ClaimedEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchClaimedListings();
  }, []);

  const fetchClaimedListings = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch both affiliate claimed events and standard vendor events in parallel
      const [affiliateData, standardData] = await Promise.all([
        vendorAPI.getClaimedEvents().catch(err => {
          console.error('Error fetching affiliate events:', err);
          return { claimedEvents: [] };
        }),
        eventsAPI.getVendorEvents().catch(err => {
          console.error('Error fetching vendor events:', err);
          return { data: { events: [] } };
        })
      ]);

      const affiliateEvents = ((affiliateData as any).claimedEvents || []).map((e: any) => ({
        ...e,
        type: 'affiliate' as const
      }));

      const standardEvents = (standardData.data?.events || standardData.events || []).map((e: any) => ({
        _id: e._id,
        title: e.title,
        slug: e.slug,
        description: e.description,
        image: e.images?.[0] || e.imageAssets?.[0]?.url,
        claimedAt: e.claimedAt || e.createdAt,
        viewsCount: e.viewsCount || 0,
        schedule: e.dateSchedule?.[0] ? {
          startDate: e.dateSchedule[0].startDate || e.dateSchedule[0].date,
          endDate: e.dateSchedule[0].endDate
        } : undefined,
        location: {
          city: e.location?.city,
          venue: e.location?.address
        },
        type: 'standard' as const,
        status: e.status,
        externalBookingLink: e.externalBookingLink
      }));

      // Filter standard events to only include those that were "claimed" if needed, 
      // or just show all vendor events as "My Listings". 
      // The user asked for "My Claimed Listing", and standard events where vendorId is set 
      // ARE effectively claimed/owned.
      // We'll combine them.

      setClaimedEvents([...affiliateEvents, ...standardEvents]);

    } catch (err: any) {
      console.error('Error fetching listings:', err);
      setError(err.message || 'Failed to load listings');
      toast.error('Failed to load listings');
    } finally {
      setIsLoading(false);
    }
  };

  const getDefaultImage = (title: string) => {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(title)}&size=400&background=f97316&color=fff&bold=true`;
  };

  const totalItems = claimedEvents.length;
  // Combine clicks for affiliate and views for standard
  const totalInteractions = claimedEvents.reduce((sum, item) => {
    if (item.type === 'affiliate') {
      return sum + (item.affiliateClickTracking?.totalClicks || 0);
    }
    return sum + (item.viewsCount || 0);
  }, 0);

  // Unique only applies to affiliate for now, or we treat views as unique? 
  // Let's keep unique for affiliate and just use views for standard in the "Interactions" metric


  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading listings...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <PrivatePageSEO title="Vendor - My Listings | Kidrove" description="Manage your events and track their performance" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Listings</h1>
          <p className="text-gray-600">
            Manage your claimed and created events
          </p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card variant="elevated">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Total Events</p>
                  <p className="text-3xl font-bold text-gray-900">{totalItems}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="elevated">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Total Views/Clicks</p>
                  <p className="text-3xl font-bold text-gray-900">{totalInteractions}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="elevated">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Actions Required</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {claimedEvents.filter(e => e.status === 'pending' || e.status === 'draft').length}
                  </p>
                </div>
                <div className="p-3 bg-purple-100 rounded-full">
                  <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Content */}
        {error ? (
          <Card variant="elevated">
            <CardContent className="text-center py-12">
              <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Listings</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={fetchClaimedListings}
                className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition"
              >
                Try Again
              </button>
            </CardContent>
          </Card>
        ) : (
          claimedEvents.length === 0 ? (
            <Card variant="elevated">
              <CardContent className="text-center py-12">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Listings Yet</h3>
                <p className="text-gray-600 mb-4">
                  Browse events to claim or create your own.
                </p>
                <div className="flex justify-center gap-4">
                  <Link
                    to="/events"
                    className="inline-block px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition"
                  >
                    Browse Events
                  </Link>
                  <Link
                    to="/vendor/dashboard/create-event"
                    className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                  >
                    Create Event
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {claimedEvents.map((event) => (
                <Card key={event._id} variant="elevated" className="overflow-hidden hover:shadow-lg transition">
                  <div className="relative h-48 bg-gray-200">
                    <img
                      src={event.image || getDefaultImage(event.title)}
                      alt={event.title}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.currentTarget.src = getDefaultImage(event.title); }}
                    />
                    <div className="absolute top-4 right-4 flex gap-2">
                      {event.type === 'affiliate' && <Badge variant="warning">Affiliate</Badge>}
                      {event.type === 'standard' && <Badge variant="success">Standard</Badge>}
                    </div>
                    {event.status && (
                      <div className="absolute bottom-4 left-4">
                        <Badge variant={event.status === 'published' ? 'success' : event.status === 'draft' ? 'secondary' : 'warning'}>
                          {event.status}
                        </Badge>
                      </div>
                    )}
                  </div>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">{event.title}</h3>
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">{event.description?.replace(/<[^>]*>?/gm, '')}</p>
                    {(event.location || event.schedule) && (
                      <div className="mb-4 space-y-2">
                        {event.location && (
                          <div className="flex items-center text-sm text-gray-600">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span>{event.location.venue || ''} {event.location.city}</span>
                          </div>
                        )}
                        {event.schedule?.startDate && (
                          <div className="flex items-center text-sm text-gray-600">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>{format(new Date(event.schedule.startDate), 'MMM dd, yyyy')}</span>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b border-gray-200">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">
                          {event.type === 'affiliate' ? 'Total Clicks' : 'Total Views'}
                        </p>
                        <p className="text-xl font-bold text-gray-900">
                          {event.type === 'affiliate'
                            ? (event.affiliateClickTracking?.totalClicks || 0)
                            : (event.viewsCount || 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Status</p>
                        <p className="text-sm font-medium text-gray-900 capitalize">{event.status || 'Active'}</p>
                      </div>
                    </div>
                    <div>
                      {event.claimedAt && (
                        <p className="text-xs text-gray-500 mb-3">
                          Claimed on {format(new Date(event.claimedAt), 'MMM dd, yyyy')}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Link
                        to={`/events/${event.slug || event._id}`}
                        className="flex-1 px-4 py-2 bg-orange-600 text-white text-center rounded-md hover:bg-orange-700 transition text-sm font-medium"
                      >
                        View Event
                      </Link>
                      {event.externalBookingLink && (
                        <a
                          href={event.externalBookingLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 px-4 py-2 bg-white text-orange-600 text-center border border-orange-600 rounded-md hover:bg-orange-50 transition text-sm font-medium"
                        >
                          Booking Link
                        </a>
                      )}
                      {!event.externalBookingLink && (
                        <Link
                          to={`/vendor/dashboard/events/${event._id}/edit`}
                          className="flex-1 px-4 py-2 bg-white text-blue-600 text-center border border-blue-600 rounded-md hover:bg-blue-50 transition text-sm font-medium"
                        >
                          Edit Event
                        </Link>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        )}
      </div>
    </>
  );
};

export default VendorClaimedEventsPage;
