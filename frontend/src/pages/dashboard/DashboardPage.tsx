import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { RootState } from '../../store';
import bookingAPI from '../../services/api/bookingAPI';

import favoritesAPI from '../../services/api/favoritesAPI';
import logger from '../../utils/logger';
import { SkeletonDashboardTab, SkeletonGrid, SkeletonEventCard } from '../../components/common/SkeletonLoader';
import useApiRetry from '../../hooks/useApiRetry';
import CancelOrderModal from '../../components/order/CancelOrderModal';
import PrivatePageSEO from '@/components/common/PrivatePageSEO';

interface Booking {
  _id: string;
  id: string;
  orderNumber: string;
  items: Array<{
    eventId: string;
    eventTitle: string;
    scheduleDate: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    currency: string;
  }>;
  subtotal: number;
  tax: number;
  serviceFee: number;
  total: number;
  currency: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'refunded';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  createdAt: string;
  confirmedAt?: string;
  userId: string;
}

interface SavedEvent {
  _id: string;
  title: string;
  date: string;
  time?: string;
  location: string;
  image?: string;
  images?: string[];
  price: number;
  currency: string;
  slug?: string;
}

const BOOKING_PREVIEW_LIMIT = 2;

const DashboardPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'saved'>('upcoming');
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
  const [pastBookings, setPastBookings] = useState<Booking[]>([]);
  const [savedEvents, setSavedEvents] = useState<SavedEvent[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [selectedBookingForCancel, setSelectedBookingForCancel] = useState<Booking | null>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const retryState = useApiRetry();

  // Fetch dashboard data from API
  const fetchDashboardData = async () => {
    if (!isAuthenticated || !user) {
      setError('Please log in to view your dashboard');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Fetch user bookings
      const bookingsResponse = await bookingAPI.getUserBookings({
        sortBy: 'createdAt',
        sortOrder: 'desc',
        limit: 50
      });

      if (bookingsResponse?.bookings) {
        const allBookings = bookingsResponse.bookings;
        const now = new Date();

        // Separate upcoming and past bookings based on event dates
        const upcoming: Booking[] = [];
        const past: Booking[] = [];

        allBookings.forEach((booking: Booking) => {
          if (booking.items && booking.items.length > 0) {
            // Check the latest event date in the booking
            const latestEventDate = new Date(booking.items[0].scheduleDate);

            if (latestEventDate >= now && (booking.status === 'confirmed' || booking.status === 'pending')) {
              upcoming.push(booking);
            } else {
              past.push(booking);
            }
          }
        });

        setUpcomingBookings(upcoming);
        setPastBookings(past);
      }

      // Fetch saved/favorite events
      try {
        const favoritesResponse = await favoritesAPI.getFavoriteEvents();
        if (favoritesResponse?.favorites) {
          // Transform favorite events to match SavedEvent interface
          const transformedFavorites: SavedEvent[] = favoritesResponse.favorites.map((event: any) => ({
            _id: event._id,
            title: event.title,
            date: event.dateSchedule?.[0]?.date || new Date().toISOString(),
            time: event.dateSchedule?.[0]?.startTime || '',
            location: event.location || 'Location TBA',
            image: event.images?.[0] || '',
            images: event.images || [],
            price: event.price || 0,
            currency: event.currency || 'AED'
          }));
          setSavedEvents(transformedFavorites);
        } else {
          setSavedEvents([]);
        }
      } catch (favoritesError) {
        logger.error('Error fetching favorites:', favoritesError);
        setSavedEvents([]);
      }

    } catch (err: any) {
      logger.error('Error fetching dashboard data:', err);
      const errorMessage = err?.message || 'Failed to load dashboard data. Please try again later.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh data
  const refreshData = async () => {
    setRefreshing(true);
    try {
      await fetchDashboardData();
      toast.success('Dashboard data refreshed successfully');
    } catch (err) {
      // Error handling is already done in fetchDashboardData
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [isAuthenticated, user]);

  // Auto-refresh data when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isAuthenticated) {
        refreshData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isAuthenticated]);

  const formatDate = (dateString: string): string => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const formatCurrency = (value: number, currency?: string) => {
    return `${(currency || 'AED').toUpperCase()} ${value.toFixed(2)}`;
  };

  // Helper functions to work with new booking structure
  const getBookingEventTitle = (booking: Booking): string => {
    const event = booking.items?.[0]?.eventId as any;
    if (event && typeof event === 'object' && event.title) {
      return event.title;
    }
    return booking.items?.[0]?.eventTitle || 'Unknown Event';
  };

  const getBookingEventDate = (booking: Booking): string => {
    return booking.items?.[0]?.scheduleDate || booking.createdAt;
  };

  const getBookingTicketCount = (booking: Booking): number => {
    return booking.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
  };

  const getBookingEventId = (booking: Booking): string => {
    const event = booking.items?.[0]?.eventId as any;
    if (event && typeof event === 'object') {
      return event._id || event.id || '';
    }
    return event || '';
  };

  const getBookingEventSlug = (booking: Booking): string => {
    const event = booking.items?.[0]?.eventId as any;
    if (event && typeof event === 'object') {
      return event.slug || '';
    }
    return '';
  };

  const getBookingEventImage = (booking: Booking): string => {
    const event = booking.items?.[0]?.eventId as any;
    if (event && typeof event === 'object') {
      return (
        event.coverImage ||
        event.imageAssets?.[0]?.url ||
        event.imageAssets?.[0]?.thumbnailUrl ||
        event.images?.[0] ||
        'https://placehold.co/600x400/e5e7eb/9ca3af?text=No+Image'
      );
    }
    return 'https://placehold.co/600x400/e5e7eb/9ca3af?text=No+Image';
  };

  const getBookingVenueType = (booking: Booking): string => {
    const event = booking.items?.[0]?.eventId as any;
    if (event && typeof event === 'object') {
      return event.venueType || '';
    }
    return '';
  };

  const getBookingMeetingLink = (booking: Booking): string => {
    const event = booking.items?.[0]?.eventId as any;
    if (event && typeof event === 'object') {
      return event.meetingLink || '';
    }
    return '';
  };

  const handleRemoveSavedEvent = async (eventId: string) => {
    try {
      setRefreshing(true);
      await favoritesAPI.removeFromFavorites(eventId);
      setSavedEvents(prev => prev.filter(event => event._id !== eventId));
      toast.success('Event removed from favorites');
    } catch (err: any) {
      logger.error('Error removing saved event:', err);
      const errorMessage = err?.message || 'Failed to remove saved event';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setRefreshing(false);
    }
  };

  const getStatusBadgeClass = (status: string): string => {
    switch (status) {
      case 'confirmed':
        return 'bg-emerald-100 text-emerald-800';
      case 'pending':
        return 'bg-amber-100 text-amber-800';
      case 'cancelled':
        return 'bg-rose-100 text-rose-700';
      case 'refunded':
        return 'bg-sky-100 text-sky-700';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const totalBookingCount = upcomingBookings.length + pastBookings.length;
  const totalSavedCount = savedEvents.length;
  const upcomingTotalValue = upcomingBookings.reduce((sum, booking) => sum + (booking.total || 0), 0);
  const tabCounts = {
    upcoming: upcomingBookings.length,
    past: pastBookings.length,
    saved: savedEvents.length,
  };
  const upcomingPreview = upcomingBookings.slice(0, BOOKING_PREVIEW_LIMIT);
  const pastPreview = pastBookings.slice(0, BOOKING_PREVIEW_LIMIT);

  // Show login prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">My Dashboard</h1>
          <p className="text-gray-600 mb-8">Please log in to view your dashboard</p>
          <Link
            to="/login"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            Log In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <PrivatePageSEO title="My Dashboard | Kidrove" description="Manage your bookings and favorites" />
      <div className="relative overflow-hidden bg-slate-50/80">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-[-120px] top-[-120px] h-[360px] w-[360px] rounded-full bg-gradient-to-br from-amber-200/60 to-orange-300/40 blur-3xl" />
          <div className="absolute right-[-140px] top-[180px] h-[300px] w-[300px] rounded-full bg-gradient-to-br from-cyan-200/50 to-sky-300/40 blur-3xl" />
        </div>

        <div className="relative container mx-auto px-4 py-8 md:py-10">
          <div className="mb-8 rounded-3xl border border-white/70 bg-gradient-to-r from-[#1f2937] via-[#0f4c5c] to-[#2a6f97] p-6 shadow-xl shadow-slate-900/10 md:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-200">Customer Hub</p>
                <h1 className="mt-2 text-3xl font-black text-white md:text-4xl">Welcome back, {user?.firstName}!</h1>
                <p className="mt-2 max-w-2xl text-sm text-cyan-100 md:text-base">
                  Everything in one place: track your upcoming plans, revisit past bookings, and keep favorites ready to book.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={refreshData}
                  disabled={refreshing}
                  className="inline-flex items-center rounded-xl border border-white/35 bg-white/15 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {refreshing ? (
                    <svg className="mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  )}
                  Refresh
                </button>
                <Link
                  to="/search"
                  className="inline-flex items-center rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-bold text-slate-900 shadow-lg shadow-amber-500/30 transition hover:bg-amber-300"
                >
                  Browse Events
                </Link>
              </div>
            </div>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            <div className="rounded-2xl border border-white bg-white/90 p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Upcoming</p>
              <p className="mt-1 text-2xl font-extrabold text-slate-900">{upcomingBookings.length}</p>
            </div>
            <div className="rounded-2xl border border-white bg-white/90 p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Past</p>
              <p className="mt-1 text-2xl font-extrabold text-slate-900">{pastBookings.length}</p>
            </div>
            <div className="rounded-2xl border border-white bg-white/90 p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Saved</p>
              <p className="mt-1 text-2xl font-extrabold text-slate-900">{totalSavedCount}</p>
            </div>
            <div className="rounded-2xl border border-white bg-white/90 p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Upcoming Value</p>
              <p className="mt-1 text-lg font-extrabold text-slate-900">{formatCurrency(upcomingTotalValue)}</p>
            </div>
          </div>

          {error && (
            <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700" role="alert">
              <p className="font-semibold">Something needs attention</p>
              <p className="mt-1 text-sm">{error}</p>
            </div>
          )}

          {retryState.isRetrying && (
            <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800" role="alert">
              <div className="flex items-center">
                <svg className="mr-3 h-5 w-5 animate-spin text-amber-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <div>
                  <p className="font-medium">Retrying API call...</p>
                  <p className="text-sm">
                    Attempt {retryState.currentAttempt} of {retryState.maxAttempts}
                    {retryState.lastRetry && (
                      <span className="ml-2 text-xs">
                        ({retryState.lastRetry.method} {retryState.lastRetry.url})
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white/95 shadow-xl shadow-slate-200/70">
            <div className="border-b border-slate-200 px-4 py-3 md:px-6 md:py-5">
              <div className="flex flex-wrap gap-2 md:gap-3">
                <button
                  onClick={() => setActiveTab('upcoming')}
                  className={`inline-flex items-center rounded-xl px-4 py-2 text-sm font-semibold transition ${activeTab === 'upcoming' ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  Upcoming Events
                  <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${activeTab === 'upcoming' ? 'bg-white/20 text-white' : 'bg-white text-slate-700'}`}>
                    {tabCounts.upcoming}
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('past')}
                  className={`inline-flex items-center rounded-xl px-4 py-2 text-sm font-semibold transition ${activeTab === 'past' ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  Past Events
                  <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${activeTab === 'past' ? 'bg-white/20 text-white' : 'bg-white text-slate-700'}`}>
                    {tabCounts.past}
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('saved')}
                  className={`inline-flex items-center rounded-xl px-4 py-2 text-sm font-semibold transition ${activeTab === 'saved' ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  Saved Events
                  <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${activeTab === 'saved' ? 'bg-white/20 text-white' : 'bg-white text-slate-700'}`}>
                    {tabCounts.saved}
                  </span>
                </button>
              </div>
              <p className="mt-3 text-sm text-slate-500">You currently have {totalBookingCount} bookings in total.</p>
              {activeTab !== 'saved' && (
                <Link
                  to="/bookings"
                  className="mt-3 inline-flex items-center rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                >
                  Go To Full Bookings Page
                </Link>
              )}
            </div>

            <div className="p-4 md:p-6">
            {isLoading ? (
              <div>
                {activeTab === 'upcoming' && <SkeletonDashboardTab count={3} />}
                {activeTab === 'past' && <SkeletonDashboardTab count={2} />}
                {activeTab === 'saved' && (
                  <SkeletonGrid columns={3} count={6}>
                    <SkeletonEventCard />
                  </SkeletonGrid>
                )}
              </div>
            ) : (
              <div>
                {activeTab === 'upcoming' && (
                  <div>
                    {upcomingBookings.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-10 text-center">
                        <p className="text-slate-600">You don't have any upcoming events.</p>
                        <Link to="/search" className="mt-4 inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
                          Browse Events
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {upcomingBookings.map((booking) => (
                          <div key={booking._id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
                            <div className="h-1 w-full bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-500" />
                            <div className="p-4 sm:p-6">
                              <div className="flex flex-col sm:flex-row justify-between">
                                <div>
                                  <h3 className="text-lg font-bold text-slate-900 md:text-xl">
                                    <Link to={`/events/${getBookingEventId(booking)}`} className="hover:text-teal-700">
                                      {getBookingEventTitle(booking)}
                                    </Link>
                                  </h3>
                                  <div className="mt-3 grid grid-cols-1 gap-1 text-sm text-slate-600 md:grid-cols-2 md:gap-x-8">
                                    <p><span className="font-semibold text-slate-800">Date:</span> {formatDate(getBookingEventDate(booking))}</p>
                                    <p><span className="font-semibold text-slate-800">Booking ID:</span> {booking.orderNumber}</p>
                                    <p><span className="font-semibold text-slate-800">Tickets:</span> {getBookingTicketCount(booking)}</p>
                                    <p><span className="font-semibold text-slate-800">Total:</span> {formatCurrency(booking.total, booking.currency)}</p>
                                    <p><span className="font-semibold text-slate-800">Payment:</span> {booking.paymentStatus.charAt(0).toUpperCase() + booking.paymentStatus.slice(1)}</p>
                                  </div>
                                </div>
                                <div className="mt-4 sm:mt-0 flex flex-col items-start sm:items-end">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(booking.status)}`}>
                                    {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                  </span>
                                  <p className="mt-2 text-xs text-slate-500">Booked on {formatDate(booking.createdAt)}</p>
                                  <div className="mt-4 flex flex-wrap gap-2">
                                    <Link
                                      to={`/bookings/${booking._id}`}
                                      className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                    >
                                      View Details
                                    </Link>
                                    {(booking.status === 'confirmed' || booking.status === 'pending') && (
                                      <button
                                        onClick={() => {
                                          setSelectedBookingForCancel(booking);
                                          setIsCancelModalOpen(true);
                                        }}
                                        disabled={refreshing}
                                        className="inline-flex items-center rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                                      >
                                        Cancel
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'past' && (
                  <div>
                    {pastBookings.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-10 text-center">
                        <p className="text-slate-600">You don't have any past events.</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {upcomingPreview.map((booking) => (
                          <div key={booking._id} className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/80 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
                            <div className="h-1 w-full bg-gradient-to-r from-slate-300 via-slate-400 to-slate-500" />
                            <div className="flex flex-col lg:flex-row">
                              <div className="lg:w-64">
                                <img
                                  src={getBookingEventImage(booking)}
                                  alt={getBookingEventTitle(booking)}
                                  className="h-48 w-full object-cover lg:h-full"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src = 'https://placehold.co/600x400/e5e7eb/9ca3af?text=No+Image';
                                  }}
                                />
                              </div>
                              <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6 lg:flex-row lg:justify-between">
                                <div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="text-lg font-bold text-slate-900 md:text-xl">
                                      <Link to={`/events/${getBookingEventSlug(booking) || getBookingEventId(booking)}`} className="hover:text-teal-700">
                                        {getBookingEventTitle(booking)}
                                      </Link>
                                    </h3>
                                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusBadgeClass(booking.status)}`}>
                                      {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                    </span>
                                  </div>
                                  <div className="mt-3 space-y-1 text-sm text-slate-600">
                                    <p><span className="font-semibold text-slate-800">Order Number:</span> {booking.orderNumber}</p>
                                    <p><span className="font-semibold text-slate-800">Location:</span> {getBookingVenueType(booking) || 'Location TBD'}</p>
                                    <p><span className="font-semibold text-slate-800">Items:</span> {getBookingTicketCount(booking)}</p>
                                    <p><span className="font-semibold text-slate-800">Total Amount:</span> {booking.total > 0 ? formatCurrency(booking.total, booking.currency) : 'Free'}</p>
                                    <p><span className="font-semibold text-slate-800">Booked on:</span> {formatDate(booking.createdAt)}</p>
                                    <p><span className="font-semibold text-slate-800">Event Date:</span> {formatDate(getBookingEventDate(booking))}</p>
                                  </div>
                                </div>

                                <div className="flex flex-col gap-2 lg:min-w-[220px]">
                                  <Link
                                    to={`/bookings/${booking._id}`}
                                    className="inline-flex items-center justify-center rounded-lg border border-emerald-500 bg-white px-3 py-2 text-sm font-semibold text-emerald-600 hover:bg-emerald-50"
                                  >
                                    View Details
                                  </Link>

                                  {getBookingVenueType(booking) === 'Online' && getBookingMeetingLink(booking) && (
                                    <a
                                      href={getBookingMeetingLink(booking)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                                    >
                                      Join Meeting
                                    </a>
                                  )}

                                  <Link
                                    to={`/bookings/${booking._id}`}
                                    className="inline-flex items-center justify-center rounded-lg bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-700"
                                  >
                                    View Booking QR Code
                                  </Link>

                                  {(booking.status === 'confirmed' || booking.status === 'pending') && (
                                    <button
                                      onClick={() => {
                                        setSelectedBookingForCancel(booking);
                                        setIsCancelModalOpen(true);
                                      }}
                                      disabled={refreshing}
                                      className="inline-flex items-center justify-center rounded-lg border border-rose-300 bg-white px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                                    >
                                      Cancel Booking
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}

                        {upcomingBookings.length > BOOKING_PREVIEW_LIMIT && (
                          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-600">
                            Showing {BOOKING_PREVIEW_LIMIT} of {upcomingBookings.length} upcoming bookings.
                            <div className="mt-2">
                              <Link to="/bookings" className="inline-flex items-center rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800">
                                View All In My Bookings
                              </Link>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'past' && (
                  <div>
                    {pastBookings.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-10 text-center">
                        <p className="text-slate-600">You don't have any past events.</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {pastPreview.map((booking) => (
                          <div key={booking._id} className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/80 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
                            <div className="h-1 w-full bg-gradient-to-r from-slate-300 via-slate-400 to-slate-500" />
                            <div className="flex flex-col lg:flex-row">
                              <div className="lg:w-64">
                                <img
                                  src={getBookingEventImage(booking)}
                                  alt={getBookingEventTitle(booking)}
                                  className="h-48 w-full object-cover lg:h-full"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src = 'https://placehold.co/600x400/e5e7eb/9ca3af?text=No+Image';
                                  }}
                                />
                              </div>
                              <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6 lg:flex-row lg:justify-between">
                                <div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="text-lg font-bold text-slate-900 md:text-xl">
                                      <Link to={`/events/${getBookingEventSlug(booking) || getBookingEventId(booking)}`} className="hover:text-slate-700">
                                        {getBookingEventTitle(booking)}
                                      </Link>
                                    </h3>
                                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusBadgeClass(booking.status)}`}>
                                      {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                    </span>
                                  </div>
                                  <div className="mt-3 space-y-1 text-sm text-slate-600">
                                    <p><span className="font-semibold text-slate-800">Order Number:</span> {booking.orderNumber}</p>
                                    <p><span className="font-semibold text-slate-800">Items:</span> {getBookingTicketCount(booking)}</p>
                                    <p><span className="font-semibold text-slate-800">Total Amount:</span> {booking.total > 0 ? formatCurrency(booking.total, booking.currency) : 'Free'}</p>
                                    <p><span className="font-semibold text-slate-800">Booked on:</span> {formatDate(booking.createdAt)}</p>
                                    <p><span className="font-semibold text-slate-800">Event Date:</span> {formatDate(getBookingEventDate(booking))}</p>
                                  </div>
                                </div>

                                <div className="flex flex-col gap-2 lg:min-w-[220px]">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(booking.status)}`}>
                                    {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                  </span>
                                  <Link
                                    to={`/bookings/${booking._id}`}
                                    className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                                  >
                                    View Details
                                  </Link>
                                  {booking.status === 'confirmed' && (
                                    <button
                                      className="inline-flex items-center justify-center rounded-lg bg-sky-600 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-700"
                                      onClick={() => {
                                        // TODO: Implement review functionality
                                        logger.info('Review event clicked', { eventId: getBookingEventId(booking) });
                                      }}
                                    >
                                      Write Review
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}

                        {pastBookings.length > BOOKING_PREVIEW_LIMIT && (
                          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-600">
                            Showing {BOOKING_PREVIEW_LIMIT} of {pastBookings.length} past bookings.
                            <div className="mt-2">
                              <Link to="/bookings" className="inline-flex items-center rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800">
                                View All In My Bookings
                              </Link>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        </div>

        {/* Cancel Order Modal */}
        {selectedBookingForCancel && (
          <CancelOrderModal
            isOpen={isCancelModalOpen}
            onClose={() => {
              setIsCancelModalOpen(false);
              setSelectedBookingForCancel(null);
            }}
            orderId={selectedBookingForCancel._id}
            orderNumber={selectedBookingForCancel.orderNumber}
            eventTitle={getBookingEventTitle(selectedBookingForCancel)}
            eventDate={getBookingEventDate(selectedBookingForCancel)}
            totalAmount={selectedBookingForCancel.total || 0}
            subtotal={selectedBookingForCancel.subtotal || 0}
            serviceFee={selectedBookingForCancel.serviceFee || 0}
            tax={selectedBookingForCancel.tax || 0}
            currency={selectedBookingForCancel.currency?.toUpperCase() || 'AED'}
            onSuccess={() => {
              fetchDashboardData(); // Refresh dashboard after cancellation
            }}
          />
        )}
      </div>
    </>
  );
};

export default DashboardPage;