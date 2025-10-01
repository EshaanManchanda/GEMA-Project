import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Download, Calendar, MapPin, Clock, User, Hash, QrCode as QrCodeIcon } from 'lucide-react';
import QRCodeModal from './QRCodeModal';
import { generateTicketQRData, extractEventDates } from '../../utils/qrcode.utils';

interface TicketModalProps {
  ticket: {
    _id: string;
    ticketNumber: string;
    qrCode: string;
    qrCodeImage: string;
    attendeeName: string;
    attendeeEmail: string;
    price: number;
    currency: string;
    status: 'active' | 'used' | 'cancelled' | 'expired';
    validFrom: string;
    validUntil: string;
    eventId: {
      title: string;
      location: {
        address: string;
        city: string;
      };
      dateSchedule: Array<{
        startDate: string;
        endDate: string;
      }>;
      images?: string[];
    };
  };
  isOpen: boolean;
  onClose: () => void;
  onDownload?: (ticket: any) => void;
}

const TicketModal: React.FC<TicketModalProps> = ({ ticket, isOpen, onClose, onDownload }) => {
  const [showQRModal, setShowQRModal] = useState(false);

  if (!isOpen) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-600';
      case 'used':
        return 'text-blue-600';
      case 'cancelled':
        return 'text-red-600';
      case 'expired':
        return 'text-gray-600';
      default:
        return 'text-gray-600';
    }
  };

  const eventDate = ticket.eventId.dateSchedule[0];

  // Generate secure QR code data with event-based expiration
  const qrCodeData = ticket.qrCode || generateTicketQRData(
    ticket.ticketNumber,
    ticket.eventId._id || '',
    undefined, // userId - would come from auth context
    undefined, // orderId - would come from ticket data
    1, // seatsAllocated - assuming 1 for individual tickets
    ticket.eventId.dateSchedule?.[0]?.startDate ? new Date(ticket.eventId.dateSchedule[0].startDate) : undefined,
    ticket.eventId.dateSchedule?.[0]?.endDate ? new Date(ticket.eventId.dateSchedule[0].endDate) : undefined,
    2 // 2 hour grace period
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-primary-dark p-6 text-white">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold mb-2">{ticket.eventId.title}</h2>
              <p className="text-sm opacity-90">Digital Event Ticket</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Ticket Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Event Information */}
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center text-gray-700">
                  <Calendar className="w-5 h-5 mr-3 text-primary" />
                  <div>
                    <p className="font-medium">{formatDate(eventDate.startDate)}</p>
                    <p className="text-sm text-gray-500">
                      {formatTime(eventDate.startDate)} - {formatTime(eventDate.endDate)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center text-gray-700">
                  <MapPin className="w-5 h-5 mr-3 text-primary" />
                  <div>
                    <p className="font-medium">{ticket.eventId.location.address}</p>
                    <p className="text-sm text-gray-500">{ticket.eventId.location.city}</p>
                  </div>
                </div>

                <div className="flex items-center text-gray-700">
                  <User className="w-5 h-5 mr-3 text-primary" />
                  <div>
                    <p className="font-medium">{ticket.attendeeName}</p>
                    <p className="text-sm text-gray-500">{ticket.attendeeEmail}</p>
                  </div>
                </div>

                <div className="flex items-center text-gray-700">
                  <Hash className="w-5 h-5 mr-3 text-primary" />
                  <div>
                    <p className="font-medium">Ticket #{ticket.ticketNumber.slice(-8)}</p>
                    <p className="text-sm text-gray-500">
                      Status: <span className={`font-medium ${getStatusColor(ticket.status)}`}>
                        {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Ticket Price:</span>
                  <span className="text-xl font-bold text-gray-900">
                    {ticket.currency.toUpperCase()} {ticket.price.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* QR Code Section */}
            <div className="flex flex-col items-center justify-center">
              <div className="bg-white p-6 border-2 border-gray-200 rounded-lg shadow-sm">
                <QRCodeSVG
                  value={qrCodeData}
                  size={200}
                  style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                />
              </div>
              <p className="text-center text-sm text-gray-500 mt-3">
                Present this QR code at the venue entrance
              </p>

              {ticket.status === 'active' && (
                <div className="mt-4 text-center">
                  <p className="text-xs text-gray-400">Valid From</p>
                  <p className="text-sm font-medium text-gray-600">
                    {formatDate(ticket.validFrom)}
                  </p>
                  <p className="text-xs text-gray-400 mt-2">Valid Until</p>
                  <p className="text-sm font-medium text-gray-600">
                    {formatDate(ticket.validUntil)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-3 gap-3 mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={() => onDownload?.(ticket)}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
            >
              <Download className="w-5 h-5" />
              Download
            </button>
            <button
              onClick={() => setShowQRModal(true)}
              className="flex items-center justify-center gap-2 px-4 py-3 border border-primary text-primary rounded-lg hover:bg-primary hover:text-white transition-colors"
            >
              <QrCodeIcon className="w-5 h-5" />
              QR Details
            </button>
            <button
              onClick={onClose}
              className="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>

          {/* Footer Notice */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600 text-center">
              Keep this ticket safe and bring it to the event. Screenshots or printed copies are accepted.
              For support, contact the event organizer.
            </p>
          </div>
        </div>
      </div>

      {/* QR Code Modal */}
      <QRCodeModal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        qrData={{
          ticketNumber: ticket.ticketNumber,
          eventId: ticket.eventId._id || '',
          userId: undefined, // would come from auth context
          orderId: undefined, // would come from ticket data
          seatsAllocated: 1,
          type: 'ticket',
          eventStartDate: ticket.eventId.dateSchedule?.[0]?.startDate ? new Date(ticket.eventId.dateSchedule[0].startDate) : undefined,
          eventEndDate: ticket.eventId.dateSchedule?.[0]?.endDate ? new Date(ticket.eventId.dateSchedule[0].endDate) : undefined,
          gracePeriodHours: 2
        }}
        size={300}
        title={`Ticket QR Code - #${ticket.ticketNumber.slice(-8)}`}
      />
    </div>
  );
};

export default TicketModal;