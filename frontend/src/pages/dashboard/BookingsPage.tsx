import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/store';
import { fetchBookings } from '@/store/slices/bookingsSlice';
import { fetchTicketsByOrder, downloadTicket } from '@/store/slices/ticketsSlice';
import TicketCard from '@/components/booking/TicketCard';
import TicketModal from '@/components/booking/TicketModal';
import QRCodeModal from '@/components/booking/QRCodeModal';
import { Ticket } from '@/services/api/ticketAPI';
import { generateBookingQRData, extractEventDates } from '@/utils/qrcode.utils';

interface Booking {
  id: string;
  eventId: string;
  eventTitle: string;
  eventImage: string;
  eventDate: string;
  eventTime: string;
  eventLocation: string;
  ticketCount: number;
  totalAmount: number;
  bookingDate: string;
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed';
}

const BookingsPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { bookings, isLoading, error } = useSelector((state: RootState) => state.bookings);
  const { tickets } = useSelector((state: RootState) => state.tickets);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'cancelled'>('upcoming');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [expandedBookings, setExpandedBookings] = useState<Set<string>>(new Set());
  const [selectedBookingForQR, setSelectedBookingForQR] = useState<Booking | null>(null);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);

  useEffect(() => {
    dispatch(fetchBookings());
  }, [dispatch]);

  const formatDate = (dateString: string): string => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const getStatusBadgeClass = (status: string): string => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleViewTickets = async (bookingId: string) => {
    const isExpanded = expandedBookings.has(bookingId);
    const newExpanded = new Set(expandedBookings);

    if (isExpanded) {
      newExpanded.delete(bookingId);
    } else {
      newExpanded.add(bookingId);
      // Fetch tickets for this order if not already loaded
      await dispatch(fetchTicketsByOrder(bookingId));
    }

    setExpandedBookings(newExpanded);
  };

  const handleViewTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setIsTicketModalOpen(true);
  };

  const handleDownloadTicket = async (ticket: Ticket) => {
    await dispatch(downloadTicket(ticket._id));
  };

  const handleShowBookingQR = (booking: Booking) => {
    setSelectedBookingForQR(booking);
    setIsQRModalOpen(true);
  };

  const getTicketsForBooking = (bookingId: string): Ticket[] => {
    return tickets.filter(ticket => ticket.orderId === bookingId);
  };

  const filteredBookings = bookings.filter((booking: any) => {
    // Backend returns Order objects, so we need to adapt the filtering logic
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (activeTab === 'upcoming') {
      return booking.status !== 'cancelled' && (booking.status === 'confirmed' || booking.status === 'pending');
    } else if (activeTab === 'past') {
      return booking.status === 'completed';
    } else {
      return booking.status === 'cancelled';
    }
  });

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
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">My Bookings</h1>
        
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
            <p>{error}</p>
          </div>
        )}
        
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex">
              <button
                onClick={() => setActiveTab('upcoming')}
                className={`w-1/3 py-4 px-1 text-center border-b-2 font-medium text-sm ${activeTab === 'upcoming' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              >
                Upcoming
              </button>
              <button
                onClick={() => setActiveTab('past')}
                className={`w-1/3 py-4 px-1 text-center border-b-2 font-medium text-sm ${activeTab === 'past' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              >
                Past
              </button>
              <button
                onClick={() => setActiveTab('cancelled')}
                className={`w-1/3 py-4 px-1 text-center border-b-2 font-medium text-sm ${activeTab === 'cancelled' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              >
                Cancelled
              </button>
            </nav>
          </div>
          
          <div className="p-6">
            {filteredBookings.length === 0 ? (
              <div className="text-center py-8">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  No {activeTab} bookings
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {activeTab === 'upcoming' ? 'You don\'t have any upcoming bookings.' : activeTab === 'past' ? 'You don\'t have any past bookings.' : 'You don\'t have any cancelled bookings.'}
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
            ) : (
              <div className="space-y-6">
                {filteredBookings.map((booking: any) => {
                  // Handle case where booking.items might be an array of order items
                  const firstItem = booking.items && booking.items[0];
                  const event = firstItem?.eventId || {};
                  const eventTitle = event.title || 'Unknown Event';
                  const eventImage = event.images && event.images[0] ? event.images[0] : 'https://placehold.co/600x400/gray/white?text=No+Image';
                  // Handle location object properly - extract string representation
                  const getLocationString = (location: any): string => {
                    if (!location) return 'Location TBD';
                    if (typeof location === 'string') return location;
                    if (typeof location === 'object') {
                      const { address, city } = location;
                      if (address && city) return `${address}, ${city}`;
                      if (city) return city;
                      if (address) return address;
                    }
                    return 'Location TBD';
                  };
                  const eventLocation = getLocationString(event.location);

                  return (
                    <div key={booking._id || booking.id} className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
                      <div className="flex flex-col sm:flex-row">
                        <div className="sm:w-1/3 md:w-1/4">
                          <img
                            className="h-48 w-full object-cover sm:h-full"
                            src={eventImage}
                            alt={eventTitle}
                          />
                        </div>
                        <div className="p-4 sm:p-6 sm:w-2/3 md:w-3/4">
                          <div className="flex flex-col sm:flex-row justify-between">
                            <div>
                              <div className="flex items-center mb-2">
                                <h3 className="text-lg font-semibold text-gray-900 mr-2">
                                  <Link to={`/events/${event._id || event.id}`} className="hover:text-primary">
                                    {eventTitle}
                                  </Link>
                                </h3>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(booking.status)}`}>
                                  {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                </span>
                              </div>
                              <div className="text-sm text-gray-500 mb-4">
                                <p><span className="font-medium">Order Number:</span> {booking.orderNumber || booking._id}</p>
                                <p><span className="font-medium">Location:</span> {eventLocation}</p>
                                <p><span className="font-medium">Items:</span> {booking.items?.length || 0}</p>
                                <p><span className="font-medium">Total Amount:</span> {booking.currency ? booking.currency.toUpperCase() : 'AED'} {(booking.total || 0).toFixed(2)}</p>
                                <p><span className="font-medium">Booked on:</span> {formatDate(booking.createdAt || booking.bookingDate)}</p>
                                {booking.updatedAt && booking.updatedAt !== booking.createdAt && (
                                  <p><span className="font-medium">Last updated:</span> {formatDate(booking.updatedAt)}</p>
                                )}
                              </div>
                            </div>
                            <div className="mt-4 sm:mt-0 flex flex-col space-y-2">
                              <Link
                                to={`/bookings/${booking._id || booking.id}`}
                                className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                              >
                                View Details
                              </Link>

                              {(booking.status === 'confirmed' || booking.status === 'completed') && (
                                <>
                                  <button
                                    onClick={() => handleViewTickets(booking._id || booking.id)}
                                    className="inline-flex items-center justify-center px-4 py-2 border border-primary text-sm font-medium rounded-md text-primary bg-white hover:bg-primary hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
                                  >
                                    {expandedBookings.has(booking._id || booking.id) ? 'Hide Tickets' : 'View Tickets'}
                                  </button>

                                  {booking.status === 'confirmed' && (
                                    <button
                                      onClick={() => handleShowBookingQR(booking)}
                                      className="inline-flex items-center justify-center px-4 py-2 border border-green-500 text-sm font-medium rounded-md text-green-600 bg-white hover:bg-green-500 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                                    >
                                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm2 3a1 1 0 000 2h.01a1 1 0 100-2H5zm0 3a1 1 0 000 2h.01a1 1 0 100-2H5zm0 3a1 1 0 000 2h.01a1 1 0 100-2H5zm3-6a1 1 0 000 2h6a1 1 0 100-2H8zm0 3a1 1 0 000 2h6a1 1 0 100-2H8zm0 3a1 1 0 000 2h6a1 1 0 100-2H8z" clipRule="evenodd" />
                                      </svg>
                                      Show QR Code
                                    </button>
                                  )}
                                </>
                              )}

                              {booking.status === 'confirmed' && (
                                <button
                                  className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                                  onClick={() => {
                                    if (window.confirm('Are you sure you want to cancel this booking?')) {
                                      console.log('Booking cancelled:', booking._id || booking.id);
                                      // TODO: Implement cancel booking functionality with Redux
                                    }
                                  }}
                                >
                                  Cancel Booking
                                </button>
                              )}

                              {booking.status === 'completed' && event._id && (
                                <Link
                                  to={`/review/${event._id}`}
                                  className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                                >
                                  Write Review
                                </Link>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Tickets Section - Expanded */}
                      {expandedBookings.has(booking._id || booking.id) && (
                        <div className="border-t border-gray-200 bg-gray-50 p-4">
                          <div className="space-y-4">
                            <h4 className="text-lg font-semibold text-gray-900 mb-3">Event Tickets</h4>
                            {(() => {
                              const bookingTickets = getTicketsForBooking(booking._id || booking.id);
                              if (bookingTickets.length === 0) {
                                return (
                                  <div className="text-center py-4">
                                    <p className="text-gray-500">No tickets available for this booking.</p>
                                  </div>
                                );
                              }
                              return bookingTickets.map((ticket) => (
                                <TicketCard
                                  key={ticket._id}
                                  ticket={ticket}
                                  onViewTicket={handleViewTicket}
                                  onDownloadTicket={handleDownloadTicket}
                                />
                              ));
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Ticket Modal */}
        {selectedTicket && (
          <TicketModal
            ticket={selectedTicket}
            isOpen={isTicketModalOpen}
            onClose={() => {
              setIsTicketModalOpen(false);
              setSelectedTicket(null);
            }}
            onDownload={handleDownloadTicket}
          />
        )}

        {/* Booking QR Code Modal */}
        {selectedBookingForQR && (
          <QRCodeModal
            isOpen={isQRModalOpen}
            onClose={() => {
              setIsQRModalOpen(false);
              setSelectedBookingForQR(null);
            }}
            qrData={{
              bookingId: selectedBookingForQR.id,
              eventId: selectedBookingForQR.eventId,
              userId: undefined, // would come from auth context
              type: 'booking',
              // Note: selectedBookingForQR might not have full event data, so we fallback to basic dates
              gracePeriodHours: 2
            }}
            size={300}
            title={`Booking QR Code - ${selectedBookingForQR.eventTitle}`}
          />
        )}
      </div>
    </div>
  );
};

export default BookingsPage;