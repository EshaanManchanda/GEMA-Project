import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { RootState } from '../../store';
import bookingAPI from '../../services/api/bookingAPI';
import eventsAPI from '../../services/api/eventsAPI';
import favoritesAPI from '../../services/api/favoritesAPI';
import { SkeletonDashboardTab, SkeletonGrid, SkeletonEventCard } from '../../components/common/SkeletonLoader';
import useApiRetry from '../../hooks/useApiRetry';
import CancelOrderModal from '../../components/order/CancelOrderModal';

interface Event {
  _id: string;
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  image: string;
  images?: string[];
  description?: string;
  price?: number;
  currency?: string;
}

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
}

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
        console.error('Error fetching favorites:', favoritesError);
        setSavedEvents([]);
      }

    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
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

  // Helper functions to work with new booking structure
  const getBookingEventTitle = (booking: Booking): string => {
    return booking.items?.[0]?.eventTitle || 'Unknown Event';
  };

  const getBookingEventDate = (booking: Booking): string => {
    return booking.items?.[0]?.scheduleDate || booking.createdAt;
  };

  const getBookingTicketCount = (booking: Booking): number => {
    return booking.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
  };

  const getBookingEventId = (booking: Booking): string => {
    return booking.items?.[0]?.eventId || '';
  };

  // Handle booking actions
  const handleCancelBooking = async (bookingId: string) => {
    try {
      setRefreshing(true);
      await bookingAPI.cancelBooking(bookingId, 'Cancelled by user');
      toast.success('Booking cancelled successfully');
      await fetchDashboardData(); // Refresh without showing success toast again
    } catch (err: any) {
      console.error('Error cancelling booking:', err);
      const errorMessage = err?.message || 'Failed to cancel booking';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setRefreshing(false);
    }
  };

  const handleRemoveSavedEvent = async (eventId: string) => {
    try {
      setRefreshing(true);
      await favoritesAPI.removeFromFavorites(eventId);
      setSavedEvents(prev => prev.filter(event => event._id !== eventId));
      toast.success('Event removed from favorites');
    } catch (err: any) {
      console.error('Error removing saved event:', err);
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
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'refunded':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

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
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Welcome back, {user?.firstName}!</h1>
          <p className="text-gray-600 mt-1">Manage your bookings and saved events</p>
        </div>
        <div className="mt-4 md:mt-0 flex gap-2">
          <button
            onClick={refreshData}
            disabled={refreshing}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
          >
            {refreshing ? (
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="-ml-1 mr-2 h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
            Refresh
          </button>
          <Link
            to="/events"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            Browse Events
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
          <p>{error}</p>
        </div>
      )}

      {retryState.isRetrying && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 text-yellow-700 p-4 mb-6" role="alert">
          <div className="flex items-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-yellow-500" fill="none" viewBox="0 0 24 24">
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

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            <button
              onClick={() => setActiveTab('upcoming')}
              className={`w-1/3 py-4 px-1 text-center border-b-2 font-medium text-sm ${activeTab === 'upcoming' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              Upcoming Events
            </button>
            <button
              onClick={() => setActiveTab('past')}
              className={`w-1/3 py-4 px-1 text-center border-b-2 font-medium text-sm ${activeTab === 'past' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              Past Events
            </button>
            <button
              onClick={() => setActiveTab('saved')}
              className={`w-1/3 py-4 px-1 text-center border-b-2 font-medium text-sm ${activeTab === 'saved' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              Saved Events
            </button>
          </nav>
        </div>

        <div className="p-4">
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
                    <div className="text-center py-8">
                      <p className="text-gray-500">You don't have any upcoming events.</p>
                      <Link to="/events" className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">
                        Browse Events
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {upcomingBookings.map((booking) => (
                        <div key={booking._id} className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
                          <div className="p-4 sm:p-6">
                            <div className="flex flex-col sm:flex-row justify-between">
                              <div>
                                <h3 className="text-lg font-semibold text-gray-900">
                                  <Link to={`/events/${getBookingEventId(booking)}`} className="hover:text-primary">
                                    {getBookingEventTitle(booking)}
                                  </Link>
                                </h3>
                                <div className="mt-2 text-sm text-gray-500">
                                  <p><span className="font-medium">Date:</span> {formatDate(getBookingEventDate(booking))}</p>
                                  <p><span className="font-medium">Booking ID:</span> {booking.orderNumber}</p>
                                  <p><span className="font-medium">Tickets:</span> {getBookingTicketCount(booking)}</p>
                                  <p><span className="font-medium">Total:</span> {booking.currency ? booking.currency.toUpperCase() : 'AED'} {booking.total.toFixed(2)}</p>
                                  <p><span className="font-medium">Payment:</span> {booking.paymentStatus.charAt(0).toUpperCase() + booking.paymentStatus.slice(1)}</p>
                                </div>
                              </div>
                              <div className="mt-4 sm:mt-0 flex flex-col items-start sm:items-end">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(booking.status)}`}>
                                  {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                </span>
                                <p className="mt-2 text-xs text-gray-500">Booked on {formatDate(booking.createdAt)}</p>
                                <div className="mt-4 space-x-2">
                                  <Link
                                    to={`/bookings/${booking._id}`}
                                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
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
                                      className="inline-flex items-center px-3 py-1.5 border border-red-300 text-xs font-medium rounded text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
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
                    <div className="text-center py-8">
                      <p className="text-gray-500">You don't have any past events.</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {pastBookings.map((booking) => (
                        <div key={booking._id} className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 bg-gray-50">
                          <div className="p-4 sm:p-6">
                            <div className="flex flex-col sm:flex-row justify-between">
                              <div>
                                <h3 className="text-lg font-semibold text-gray-900">
                                  <Link to={`/events/${getBookingEventId(booking)}`} className="hover:text-primary">
                                    {getBookingEventTitle(booking)}
                                  </Link>
                                </h3>
                                <div className="mt-2 text-sm text-gray-500">
                                  <p><span className="font-medium">Date:</span> {formatDate(getBookingEventDate(booking))}</p>
                                  <p><span className="font-medium">Booking ID:</span> {booking.orderNumber}</p>
                                  <p><span className="font-medium">Tickets:</span> {getBookingTicketCount(booking)}</p>
                                  <p><span className="font-medium">Total:</span> {booking.currency ? booking.currency.toUpperCase() : 'AED'} {booking.total.toFixed(2)}</p>
                                  <p><span className="font-medium">Payment:</span> {booking.paymentStatus.charAt(0).toUpperCase() + booking.paymentStatus.slice(1)}</p>
                                </div>
                              </div>
                              <div className="mt-4 sm:mt-0 flex flex-col items-start sm:items-end">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(booking.status)}`}>
                                  {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                </span>
                                <p className="mt-2 text-xs text-gray-500">Booked on {formatDate(booking.createdAt)}</p>
                                <div className="mt-4 space-x-2">
                                  <Link
                                    to={`/bookings/${booking._id}`}
                                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                                  >
                                    View Details
                                  </Link>
                                  {booking.status === 'confirmed' && (
                                    <button
                                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                      onClick={() => {
                                        // TODO: Implement review functionality
                                        console.log('Review event:', getBookingEventId(booking));
                                      }}
                                    >
                                      Write Review
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

              {activeTab === 'saved' && (
                <div>
                  {savedEvents.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500">You don't have any saved events yet.</p>
                      <p className="text-gray-400 text-sm mt-2">Save events to your favorites to see them here.</p>
                      <Link to="/events" className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">
                        Browse Events
                      </Link>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {savedEvents.map((event) => (
                        <div key={event._id} className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
                          <div className="relative pb-48 overflow-hidden">
                            <img
                              className="absolute inset-0 h-full w-full object-cover"
                              src={(event.images && event.images.length > 0) ? event.images[0] : event.image || 'https://placehold.co/600x400/gray/white?text=No+Image'}
                              alt={event.title}
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = 'https://placehold.co/600x400/gray/white?text=No+Image';
                              }}
                            />
                          </div>
                          <div className="p-4">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                              <Link to={`/events/${event._id}`} className="hover:text-primary">
                                {event.title}
                              </Link>
                            </h3>
                            <div className="text-sm text-gray-500 mb-4">
                              <p><span className="font-medium">Date:</span> {formatDate(event.date)}</p>
                              {event.time && <p><span className="font-medium">Time:</span> {event.time}</p>}
                              <p><span className="font-medium">Location:</span> {
                                event.location ? (() => {
                                  if (typeof event.location === 'string') return event.location;
                                  const { city, address } = event.location;
                                  if (city && address) return `${city}, ${address}`;
                                  if (city) return city;
                                  if (address) return address;
                                  return 'Location TBD';
                                })() : 'Location TBD'
                              }</p>
                              <p><span className="font-medium">Price:</span> {event.currency ? event.currency.toUpperCase() : 'AED'} {event.price?.toFixed(2) || '0.00'}</p>
                            </div>
                            <div className="flex justify-between items-center">
                              <Link
                                to={`/events/${event._id}`}
                                className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                              >
                                View Event
                              </Link>
                              <button
                                onClick={() => handleRemoveSavedEvent(event._id)}
                                className="inline-flex items-center p-1.5 border border-transparent text-xs font-medium rounded text-red-600 hover:text-red-800 focus:outline-none"
                                title="Remove from saved events"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
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
  );
};

export default DashboardPage;