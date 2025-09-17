import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { format } from 'date-fns';
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Mail,
  Phone,
  CreditCard,
  Download,
  Eye,
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  XCircle,
  Package,
  QrCode,
  Loader
} from 'lucide-react';
import toast from 'react-hot-toast';

import { AppDispatch, RootState } from '@/store';
import { fetchTicketsByOrder, generateMissingTickets } from '@/store/slices/ticketsSlice';
import { generateQRCodesForBooking } from '@/store/slices/bookingsSlice';
import bookingAPI from '@/services/api/bookingAPI';
import TicketCard from '@/components/booking/TicketCard';
import TicketModal from '@/components/booking/TicketModal';
import QRCodeModal from '@/components/booking/QRCodeModal';
import { Ticket } from '@/services/api/ticketAPI';
import { generateOrderQRData, extractEventDates } from '@/utils/qrcode.utils';

interface BookingDetail {
  _id: string;
  orderNumber: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  total: number;
  currency: string;
  paymentMethod: string;
  paymentStatus: string;
  createdAt: string;
  updatedAt: string;
  items: Array<{
    _id: string;
    eventId: {
      _id: string;
      title: string;
      description: string;
      images: string[];
      location: {
        address: string;
        city: string;
        coordinates?: [number, number];
      };
      dateSchedule: Array<{
        startDate: string;
        endDate: string;
      }>;
      price: number;
      currency: string;
      category: string;
      venueType: string;
    };
    quantity: number;
    price: number;
    unitPrice: number;
    totalPrice: number;
    scheduleDate: string;
  }>;
  participants: Array<{
    name: string;
    email: string;
    phone?: string;
    age?: number;
    gender?: string;
  }>;
  userId: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

const BookingDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();

  const { tickets, isLoading: ticketsLoading, error: ticketsError } = useSelector((state: RootState) => state.tickets);
  const { user, token, isAuthenticated } = useSelector((state: RootState) => state.auth);

  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [isGeneratingTickets, setIsGeneratingTickets] = useState(false);
  const [showOrderQRModal, setShowOrderQRModal] = useState(false);
  const [showTicketQRModal, setShowTicketQRModal] = useState(false);

  useEffect(() => {
    if (id) {
      fetchBookingDetails();
      dispatch(fetchTicketsByOrder(id));
    }
  }, [id, dispatch]);

  // Auto-generate QR codes for confirmed bookings that don't have them
  useEffect(() => {
    if (booking && booking.status === 'confirmed' && !booking.qrCodeData && !booking.qrCode) {
      dispatch(generateQRCodesForBooking(booking._id));
    }
  }, [booking, dispatch]);

  const fetchBookingDetails = async () => {
    if (!id) return;

    try {
      setIsLoading(true);
      setError(null);
      const response = await bookingAPI.getBookingById(id);
      setBooking(response);
    } catch (err: any) {
      console.error('Error fetching booking details:', err);
      setError(err.message || 'Failed to load booking details');
      toast.error('Failed to load booking details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setIsTicketModalOpen(true);
  };

  const handleDownloadTicket = async (ticket: Ticket) => {
    // TODO: Implement ticket download functionality
    toast.success('Ticket download started');
  };

  const handleShowTicketQR = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setShowTicketQRModal(true);
  };

  const handleShowOrderQR = () => {
    setShowOrderQRModal(true);
  };

  const handleGenerateTickets = async () => {
    console.log('🎫 GENERATE TICKETS DEBUG:');
    console.log('- Order ID:', id);
    console.log('- Button clicked at:', new Date().toISOString());

    if (!id) {
      console.log('❌ No order ID, returning early');
      return;
    }

    try {
      console.log('🔄 Starting ticket generation...');
      setIsGeneratingTickets(true);

      console.log('📡 Dispatching generateMissingTickets action');
      const result = await dispatch(generateMissingTickets(id));

      console.log('📋 Generate tickets result:', result);

      if (generateMissingTickets.fulfilled.match(result)) {
        console.log('✅ Tickets generated successfully:', result.payload);
        toast.success(`Generated ${result.payload.length} tickets successfully!`);

        console.log('🔄 Refreshing tickets list...');
        // Refresh tickets
        dispatch(fetchTicketsByOrder(id));
      } else {
        console.log('❌ Generate tickets action rejected:', result);
        toast.error('Failed to generate tickets');
      }
    } catch (err: any) {
      console.error('💥 Error generating tickets:', err);
      toast.error('Failed to generate tickets');
    } finally {
      console.log('🏁 Setting generating state to false');
      setIsGeneratingTickets(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!booking || !id) return;

    if (!window.confirm('Are you sure you want to cancel this booking? This action cannot be undone.')) {
      return;
    }

    try {
      await bookingAPI.cancelBooking(id, 'Cancelled by user');
      toast.success('Booking cancelled successfully');
      await fetchBookingDetails(); // Refresh booking details
    } catch (err: any) {
      console.error('Error cancelling booking:', err);
      toast.error('Failed to cancel booking');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'pending':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case 'cancelled':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-blue-600" />;
      default:
        return <Package className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'completed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'PPP p');
    } catch {
      return 'Invalid date';
    }
  };

  const formatPrice = (amount: number, currency: string) => {
    return `${currency.toUpperCase()} ${amount.toFixed(2)}`;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-6"></div>
            <div className="space-y-4">
              <div className="h-32 bg-gray-200 rounded"></div>
              <div className="h-48 bg-gray-200 rounded"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-red-800 mb-2">Booking Not Found</h2>
            <p className="text-red-600 mb-4">
              {error || 'The booking you are looking for could not be found.'}
            </p>
            <Link
              to="/bookings"
              className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Bookings
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const bookingTickets = tickets.filter(ticket => ticket.orderId === id);

  // Debug logging to understand ticket data
  console.log('🔍 TICKET DEBUG INFO:');
  console.log('- Order ID from URL:', id);
  console.log('- All tickets in Redux state:', tickets);
  console.log('- Filtered booking tickets:', bookingTickets);
  console.log('- Booking tickets length:', bookingTickets.length);
  console.log('- Tickets loading state:', ticketsLoading);
  console.log('- Booking status:', booking?.status);

  console.log('- Tickets Redux error:', ticketsError);

  // Debug auth state
  console.log('🔐 AUTH DEBUG INFO:');
  console.log('- Is authenticated:', isAuthenticated);
  console.log('- Has token:', !!token);
  console.log('- Token preview:', token ? `${token.substring(0, 20)}...` : 'none');
  console.log('- User ID:', user?.id);

  const firstItem = booking?.items?.[0];
  const event = firstItem?.eventId;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <button
              onClick={() => navigate('/bookings')}
              className="mr-4 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Booking Details</h1>
              <p className="text-gray-600">Order #{booking?.orderNumber || 'N/A'}</p>
            </div>
          </div>

          <div className={`flex items-center px-3 py-2 rounded-lg border ${getStatusColor(booking?.status || 'pending')}`}>
            {getStatusIcon(booking?.status || 'pending')}
            <span className="ml-2 font-medium capitalize">{booking?.status || 'pending'}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Event Information */}
            {event && (
              <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
                <div className="p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Event Details</h2>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <img
                      src={event.images?.[0] || '/placeholder-event.jpg'}
                      alt={event.title}
                      className="w-full sm:w-32 h-32 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{event.title}</h3>
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-2" />
                          {event.dateSchedule?.[0] ? formatDate(event.dateSchedule[0].startDate) : 'Date TBD'}
                        </div>
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-2" />
                          {event.dateSchedule?.[0] && event.dateSchedule?.[0].endDate
                            ? `${format(new Date(event.dateSchedule[0].startDate), 'p')} - ${format(new Date(event.dateSchedule[0].endDate), 'p')}`
                            : 'Time TBD'
                          }
                        </div>
                        <div className="flex items-center">
                          <MapPin className="w-4 h-4 mr-2" />
                          {event.location?.address || 'Address TBD'}, {event.location?.city || 'City TBD'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Participant Information */}
            {booking?.participants && booking.participants.length > 0 && (
              <div className="bg-white rounded-lg shadow-md border border-gray-200">
                <div className="p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Participants</h2>
                  <div className="space-y-4">
                    {booking.participants.map((participant, index) => (
                      <div key={index} className="border-l-4 border-primary pl-4">
                        <div className="flex items-center mb-2">
                          <User className="w-4 h-4 mr-2 text-gray-600" />
                          <span className="font-medium">{participant.name}</span>
                        </div>
                        <div className="space-y-1 text-sm text-gray-600">
                          <div className="flex items-center">
                            <Mail className="w-4 h-4 mr-2" />
                            {participant.email}
                          </div>
                          {participant.phone && (
                            <div className="flex items-center">
                              <Phone className="w-4 h-4 mr-2" />
                              {participant.phone}
                            </div>
                          )}
                          {participant.age && (
                            <p>Age: {participant.age}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Tickets Section */}
            <div className="bg-white rounded-lg shadow-md border border-gray-200">
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Event Tickets</h2>
                {ticketsLoading ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="text-gray-500 mt-2">Loading tickets...</p>
                  </div>
                ) : bookingTickets.length > 0 ? (
                  <div className="space-y-4">
                    {bookingTickets.map((ticket) => (
                      <TicketCard
                        key={ticket._id}
                        ticket={ticket}
                        onViewTicket={handleViewTicket}
                        onDownloadTicket={handleDownloadTicket}
                        onShowQRCode={handleShowTicketQR}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <QrCode className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Tickets Generated</h3>
                    <p className="text-gray-500 mb-6">
                      Generate QR code tickets for this confirmed booking to enable entry.
                    </p>
                    <button
                      onClick={handleGenerateTickets}
                      disabled={isGeneratingTickets || booking?.status !== 'confirmed'}
                      className={`inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white transition-colors ${
                        isGeneratingTickets || booking?.status !== 'confirmed'
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary'
                      }`}
                    >
                      {isGeneratingTickets ? (
                        <>
                          <Loader className="w-4 h-4 mr-2 animate-spin" />
                          Generating Tickets...
                        </>
                      ) : (
                        <>
                          <QrCode className="w-4 h-4 mr-2" />
                          Generate QR Code Tickets
                        </>
                      )}
                    </button>
                    {booking?.status !== 'confirmed' && (
                      <p className="text-xs text-red-500 mt-2">
                        Booking must be confirmed to generate tickets
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Booking Summary */}
            <div className="bg-white rounded-lg shadow-md border border-gray-200">
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Booking Summary</h2>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Quantity</span>
                    <span className="font-medium">{firstItem?.quantity || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Price per ticket</span>
                    <span className="font-medium">
                      {firstItem && booking?.currency ? formatPrice(firstItem.unitPrice || firstItem.price || 0, booking.currency) : 'N/A'}
                    </span>
                  </div>
                  <div className="border-t pt-3">
                    <div className="flex justify-between text-lg font-semibold">
                      <span>Total</span>
                      <span>{booking?.total && booking?.currency ? formatPrice(booking.total, booking.currency) : 'N/A'}</span>
                    </div>
                  </div>
                </div>
                {/* Order QR Code Button - Enhanced for confirmed bookings */}
                {booking?.status === 'confirmed' ? (
                  <div className="mt-4 pt-4 border-t border-green-200">
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg mb-3">
                      <div className="flex items-center justify-center text-green-700 mb-2">
                        <CheckCircle className="w-5 h-5 mr-2" />
                        <span className="font-semibold">Booking Confirmed</span>
                      </div>
                      <p className="text-sm text-green-600 text-center">Your QR code is ready for check-in</p>
                    </div>
                    <button
                      onClick={handleShowOrderQR}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-colors shadow-lg"
                    >
                      <QrCode className="w-5 h-5" />
                      View Booking QR Code
                    </button>
                  </div>
                ) : (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <button
                      onClick={handleShowOrderQR}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-600 rounded-lg cursor-not-allowed"
                      disabled
                    >
                      <QrCode className="w-5 h-5" />
                      QR Code (Awaiting Confirmation)
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Payment Information */}
            <div className="bg-white rounded-lg shadow-md border border-gray-200">
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Details</h2>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <CreditCard className="w-4 h-4 mr-2 text-gray-600" />
                    <span className="text-sm text-gray-600">Payment Method</span>
                  </div>
                  <p className="font-medium capitalize">{booking?.paymentMethod || 'N/A'}</p>

                  <div className="mt-4">
                    <span className="text-sm text-gray-600">Payment Status</span>
                    <p className="font-medium capitalize">{booking?.paymentStatus || 'N/A'}</p>
                  </div>

                  <div className="mt-4">
                    <span className="text-sm text-gray-600">Booking Date</span>
                    <p className="font-medium">{booking?.createdAt ? formatDate(booking.createdAt) : 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-lg shadow-md border border-gray-200">
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
                <div className="space-y-3">
                  {booking?.status === 'confirmed' && (
                    <button
                      onClick={handleCancelBooking}
                      className="w-full px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      Cancel Booking
                    </button>
                  )}

                  <Link
                    to={`/events/${event?._id}`}
                    className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    View Event
                  </Link>

                  <Link
                    to="/bookings"
                    className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Back to Bookings
                  </Link>
                </div>
              </div>
            </div>
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

        {/* Order QR Code Modal */}
        {booking && (
          <QRCodeModal
            isOpen={showOrderQRModal}
            onClose={() => setShowOrderQRModal(false)}
            qrData={{
              orderId: booking.orderNumber,
              eventId: firstItem?.eventId._id || '',
              userId: undefined, // would come from auth context
              type: 'order',
              eventStartDate: firstItem?.eventId?.dateSchedule?.[0]?.startDateTime ? new Date(firstItem.eventId.dateSchedule[0].startDateTime) : undefined,
              eventEndDate: firstItem?.eventId?.dateSchedule?.[0]?.endDateTime ? new Date(firstItem.eventId.dateSchedule[0].endDateTime) : undefined,
              gracePeriodHours: 2
            }}
            size={300}
            title={`Order QR Code - ${booking.orderNumber}`}
          />
        )}

        {/* Ticket QR Code Modal */}
        {selectedTicket && (
          <QRCodeModal
            isOpen={showTicketQRModal}
            onClose={() => {
              setShowTicketQRModal(false);
              setSelectedTicket(null);
            }}
            qrData={{
              ticketNumber: selectedTicket.ticketNumber,
              eventId: selectedTicket.eventId._id || '',
              userId: undefined, // would come from auth context
              orderId: booking?.orderNumber,
              seatsAllocated: 1,
              type: 'ticket',
              eventStartDate: selectedTicket.eventId?.dateSchedule?.[0]?.startDateTime ? new Date(selectedTicket.eventId.dateSchedule[0].startDateTime) : undefined,
              eventEndDate: selectedTicket.eventId?.dateSchedule?.[0]?.endDateTime ? new Date(selectedTicket.eventId.dateSchedule[0].endDateTime) : undefined,
              gracePeriodHours: 2
            }}
            size={300}
            title={`Ticket QR Code - #${selectedTicket.ticketNumber.slice(-8)}`}
          />
        )}
      </div>
    </div>
  );
};

export default BookingDetailPage;