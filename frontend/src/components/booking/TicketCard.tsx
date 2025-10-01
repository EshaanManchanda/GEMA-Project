import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Calendar, MapPin, Clock, User, Download, Eye, AlertCircle, QrCode as QrCodeIcon } from 'lucide-react';
import { generateTicketQRData, extractEventDates } from '../../utils/qrcode.utils';

interface TicketProps {
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
  onViewTicket?: (ticket: any) => void;
  onDownloadTicket?: (ticket: any) => void;
  onShowQRCode?: (ticket: any) => void;
}

const TicketCard: React.FC<TicketProps> = ({ ticket, onViewTicket, onDownloadTicket, onShowQRCode }) => {
  const [qrImageError, setQrImageError] = useState(false);
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'used':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'expired':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
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
    <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-r from-primary to-primary-dark p-4 text-white">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold mb-1">{ticket.eventId.title}</h3>
            <p className="text-sm opacity-90">Ticket #{ticket.ticketNumber.slice(-8)}</p>
          </div>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(ticket.status)}`}>
            {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
          </span>
        </div>
      </div>

      <div className="p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Event Details */}
          <div className="flex-1 space-y-3">
            <div className="flex items-center text-sm text-gray-600">
              <Calendar className="w-4 h-4 mr-2" />
              <span>{formatDate(eventDate.startDate)}</span>
            </div>

            <div className="flex items-center text-sm text-gray-600">
              <Clock className="w-4 h-4 mr-2" />
              <span>{formatTime(eventDate.startDate)} - {formatTime(eventDate.endDate)}</span>
            </div>

            <div className="flex items-center text-sm text-gray-600">
              <MapPin className="w-4 h-4 mr-2" />
              <span>{ticket.eventId.location.address}, {ticket.eventId.location.city}</span>
            </div>

            <div className="flex items-center text-sm text-gray-600">
              <User className="w-4 h-4 mr-2" />
              <span>{ticket.attendeeName}</span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <span className="text-lg font-semibold text-gray-900">
                {ticket.currency.toUpperCase()} {ticket.price.toFixed(2)}
              </span>
            </div>
          </div>

          {/* QR Code Preview */}
          <div className="lg:w-32 flex flex-col items-center">
            <div className="w-24 h-24 bg-white p-2 border border-gray-200 rounded-lg flex items-center justify-center">
              {ticket.qrCodeImage && !qrImageError ? (
                <img
                  src={ticket.qrCodeImage}
                  alt={`QR Code for ticket ${ticket.ticketNumber}`}
                  className="w-full h-full object-contain"
                  onError={() => setQrImageError(true)}
                />
              ) : qrCodeData ? (
                <QRCodeSVG
                  value={qrCodeData}
                  size={80}
                  style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-gray-400">
                  <AlertCircle className="w-6 h-6 mb-1" />
                  <span className="text-xs">No QR</span>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1 text-center">Scan at venue</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-gray-100">
          <button
            onClick={() => onViewTicket?.(ticket)}
            className="flex items-center justify-center gap-1 px-3 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors text-sm"
          >
            <Eye className="w-4 h-4" />
            View
          </button>

          <button
            onClick={() => onDownloadTicket?.(ticket)}
            className="flex items-center justify-center gap-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
          >
            <Download className="w-4 h-4" />
            Download
          </button>

          <button
            onClick={() => onShowQRCode?.(ticket)}
            className="flex items-center justify-center gap-1 px-3 py-2 border border-primary text-primary rounded-lg hover:bg-primary hover:text-white transition-colors text-sm"
          >
            <QrCodeIcon className="w-4 h-4" />
            QR Code
          </button>
        </div>
      </div>
    </div>
  );
};

export default TicketCard;