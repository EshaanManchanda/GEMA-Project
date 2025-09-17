import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { format } from 'date-fns';
import { 
  CheckCircle, 
  Download, 
  Mail, 
  Smartphone, 
  Calendar, 
  MapPin, 
  Users, 
  Share2,
  Clock,
  Star,
  QrCode
} from 'lucide-react';
import toast from 'react-hot-toast';

import {
  selectBookingFlow,
  selectBookingParticipants,
  selectCurrentBooking,
} from '../../store/slices/bookingsSlice';
import { Event } from '../../types/event';

import Button from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import Badge from '../ui/Badge';
import QRCodeModal from './QRCodeModal';
import { generateBookingQRWithEventData, extractEventDates } from '../../utils/qrcode.utils';

interface BookingConfirmationProps {
  event: Event;
  onComplete: () => void;
}

const BookingConfirmation: React.FC<BookingConfirmationProps> = ({
  event,
  onComplete
}) => {
  const bookingFlow = useSelector(selectBookingFlow);
  const participants = useSelector(selectBookingParticipants);
  const currentBooking = useSelector(selectCurrentBooking);

  // Use actual booking data from Redux store, fallback to mock for development
  const bookingData = currentBooking ? {
    bookingId: currentBooking.bookingNumber || currentBooking.id,
    transactionId: currentBooking.payment?.transactionId || `TXN-${currentBooking.id}`,
    qrCode: currentBooking.qrCodeData?.bookingQR || currentBooking.qrCode,
    orderQR: currentBooking.qrCodeData?.orderQR,
    ticketUrl: `/api/bookings/${currentBooking.id}/tickets.pdf`,
    confirmationSent: true,
    status: currentBooking.status,
  } : {
    bookingId: `BKG-${Date.now()}`,
    transactionId: `TXN-${Date.now()}`,
    qrCode: null,
    orderQR: null,
    ticketUrl: `/api/bookings/temp/tickets.pdf`,
    confirmationSent: true,
    status: 'confirmed' as const,
  };

  // QR Code modal state
  const [showQRModal, setShowQRModal] = useState(false);

  // Calculate totals
  const subtotal = event.price * participants.length;
  const discount = bookingFlow.couponCode ? subtotal * 0.1 : 0;
  const serviceFee = subtotal * 0.05;
  const tax = (subtotal - discount + serviceFee) * 0.05;
  const total = subtotal - discount + serviceFee + tax;

  // Handle sharing
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `I'm attending ${event.title}!`,
          text: `Join me at ${event.title} - an amazing ${event.category.toLowerCase()} event.`,
          url: window.location.origin + `/events/${event._id}`,
        });
        toast.success('Event shared successfully!');
      } catch (err) {
        // User cancelled sharing
      }
    } else {
      // Fallback to clipboard
      const shareText = `I'm attending ${event.title}! Check it out: ${window.location.origin}/events/${event._id}`;
      navigator.clipboard.writeText(shareText);
      toast.success('Event link copied to clipboard!');
    }
  };

  // Handle ticket download (mock)
  const handleDownloadTickets = () => {
    toast.success('Tickets will be downloaded shortly');
    // In real app, this would trigger actual file download
  };

  // Handle email resend
  const handleResendEmail = () => {
    toast.success('Confirmation email sent to all participants');
    // In real app, this would call the resend API
  };

  return (
    <div className="space-y-6">
      {/* Success Header */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Booking Confirmed!</h2>
        <p className="text-gray-600 text-lg">
          Your tickets for {event.title} have been secured
        </p>
        <div className="mt-4">
          <Badge variant="success" className="px-4 py-2 text-sm">
            Booking ID: {bookingData.bookingId}
          </Badge>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Button
          variant="primary"
          onClick={handleDownloadTickets}
          leftIcon={<Download className="w-4 h-4" />}
          fullWidth
        >
          Download Tickets
        </Button>
        <Button
          variant="outline"
          onClick={() => setShowQRModal(true)}
          leftIcon={<QrCode className="w-4 h-4" />}
          fullWidth
          disabled={bookingData.status !== 'confirmed'}
        >
          {bookingData.status === 'confirmed' ? 'View QR Details' : 'QR Code (Pending Confirmation)'}
        </Button>
        <Button
          variant="outline"
          onClick={handleShare}
          leftIcon={<Share2 className="w-4 h-4" />}
          fullWidth
        >
          Share Event
        </Button>
      </div>


      {/* QR Code Modal */}
      <QRCodeModal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        qrData={{
          bookingId: bookingData.bookingId,
          eventId: event._id,
          userId: currentBooking?.userId,
          type: 'booking',
          eventStartDate: event.dateSchedule?.[0]?.startDateTime ? new Date(event.dateSchedule[0].startDateTime) : undefined,
          eventEndDate: event.dateSchedule?.[0]?.endDateTime ? new Date(event.dateSchedule[0].endDateTime) : undefined,
          gracePeriodHours: 2
        }}
        size={300}
        title={`Booking Confirmed - ${bookingData.bookingId}`}
      />

      {/* Booking Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Booking Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Event Details */}
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <img 
                  src={event.images?.[0] || '/placeholder-event.jpg'} 
                  alt={event.title}
                  className="w-16 h-16 object-cover rounded-lg"
                />
                <div>
                  <h3 className="font-semibold text-lg">{event.title}</h3>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge variant="default">{event.category}</Badge>
                    <Badge variant="outline">{event.type}</Badge>
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-2 text-gray-500" />
                  <span>
                    {event.dateSchedule?.[0] ? (() => {
                      const schedule = event.dateSchedule[0];
                      const dateValue = schedule.startDate || schedule.date || schedule.startDateTime;

                      if (!dateValue) return 'Date: TBD';

                      try {
                        const date = new Date(dateValue);
                        if (isNaN(date.getTime())) return 'Date: TBD';
                        return format(date, 'PPP p');
                      } catch (error) {
                        console.warn('Error formatting date:', error);
                        return 'Date: TBD';
                      }
                    })() : 'Date: TBD'}
                  </span>
                </div>
                <div className="flex items-center">
                  <MapPin className="w-4 h-4 mr-2 text-gray-500" />
                  <span>
                    {event.location ? (() => {
                      const { city, address } = event.location;
                      if (city && address) return `${city}, ${address}`;
                      if (city) return city;
                      if (address) return address;
                      return 'Location TBD';
                    })() : 'Location TBD'}
                  </span>
                </div>
                <div className="flex items-center">
                  <Users className="w-4 h-4 mr-2 text-gray-500" />
                  <span>{participants.length} participant{participants.length !== 1 ? 's' : ''}</span>
                </div>
              </div>
            </div>

            {/* Payment Summary */}
            <div className="space-y-3">
              <h4 className="font-semibold">Payment Details</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal ({participants.length} × {event.currency} {event.price})</span>
                  <span>{event.currency} {subtotal.toFixed(2)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount ({bookingFlow.couponCode})</span>
                    <span>-{event.currency} {discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Service Fee</span>
                  <span>{event.currency} {serviceFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax</span>
                  <span>{event.currency} {tax.toFixed(2)}</span>
                </div>
                <div className="border-t pt-2">
                  <div className="flex justify-between font-semibold">
                    <span>Total Paid</span>
                    <span>{event.currency} {total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
              <div className="text-xs text-gray-500 mt-2">
                Transaction ID: {bookingData.transactionId}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Participants */}
      <Card>
        <CardHeader>
          <CardTitle>Registered Participants</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {participants.map((participant, index) => (
              <div key={participant.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-semibold">
                    {participant.name ? participant.name.charAt(0).toUpperCase() : index + 1}
                  </div>
                  <div>
                    <div className="font-medium">{participant.name || `Participant ${index + 1}`}</div>
                    <div className="text-sm text-gray-600">{participant.email}</div>
                  </div>
                </div>
                {index === 0 && (
                  <Badge variant="outline">Primary</Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Important Information */}
      <Card>
        <CardHeader>
          <CardTitle>Important Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <Mail className="w-5 h-5 text-blue-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-gray-900">Confirmation Email</h4>
                <p className="text-sm text-gray-600">
                  Confirmation emails have been sent to all participants with detailed event information and tickets.
                </p>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleResendEmail}
                  className="mt-1 p-0 h-auto font-normal"
                >
                  Resend confirmation email
                </Button>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Clock className="w-5 h-5 text-orange-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-gray-900">Check-in Instructions</h4>
                <p className="text-sm text-gray-600">
                  Please arrive 15 minutes early for check-in. Bring a valid ID and show your QR code or ticket.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Smartphone className="w-5 h-5 text-green-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-gray-900">Mobile Tickets</h4>
                <p className="text-sm text-gray-600">
                  Your tickets are also available in our mobile app. Download it for easy access on the day of the event.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Next Steps */}
      <Card>
        <CardHeader>
          <CardTitle>What's Next?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold">1</div>
              <span className="text-sm">Save your tickets to your phone or print them out</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold">2</div>
              <span className="text-sm">Add the event to your calendar</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold">3</div>
              <span className="text-sm">Arrive 15 minutes early on the event day</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold">4</div>
              <span className="text-sm">Show your QR code at check-in and enjoy the event!</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feedback Request */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-3">
            <Star className="w-6 h-6 text-amber-500" />
            <div className="flex-1">
              <h4 className="font-medium text-amber-900">Help us improve!</h4>
              <p className="text-sm text-amber-800">
                After the event, we'd love to hear about your experience. Your feedback helps us make future events even better.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Button */}
      <div className="text-center">
        <Button
          variant="primary"
          onClick={onComplete}
          size="lg"
          className="min-w-48"
        >
          View My Bookings
        </Button>
        <p className="text-sm text-gray-500 mt-2">
          You can manage your bookings and download tickets anytime from your profile
        </p>
      </div>
    </div>
  );
};

export default BookingConfirmation;