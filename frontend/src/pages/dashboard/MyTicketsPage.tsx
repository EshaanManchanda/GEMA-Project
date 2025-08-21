import React, { useState, useEffect } from 'react';
import { Download, Calendar, MapPin, Clock, User, Ticket, QrCode, Share } from 'lucide-react';
import { motion } from 'framer-motion';
import { ApiService } from '../../services/api';
import QRCode from 'qrcode.react';

interface TicketData {
  id: string;
  ticketNumber: string;
  attendeeName: string;
  attendeeEmail: string;
  attendeePhone?: string;
  ticketType: string;
  seatNumber?: string;
  price: number;
  currency: string;
  status: 'active' | 'used' | 'expired' | 'cancelled';
  qrCode: string;
  qrCodeImage: string;
  checkInDetails?: {
    isCheckedIn: boolean;
    checkInTime?: string;
    scanCount: number;
  };
  eventId: {
    id: string;
    title: string;
    dateSchedule: Array<{ date: string; time?: string }>;
    location: {
      address: string;
      city: string;
      state: string;
      country: string;
    };
    images: string[];
    description: string;
  };
  validUntil?: string;
  createdAt: string;
}

const MyTicketsPage: React.FC = () => {
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past' | 'active' | 'used'>('upcoming');
  const [selectedTicket, setSelectedTicket] = useState<TicketData | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);

  // Fetch user tickets
  useEffect(() => {
    const fetchTickets = async () => {
      try {
        setIsLoading(true);
        const response = await ApiService.get('/tickets/user/my-tickets', {
          params: { upcoming: filter === 'upcoming' }
        });
        setTickets(response.data || []);
      } catch (error) {
        console.error('Error fetching tickets:', error);
        // Fallback to mock data for demo
        setTickets([
          {
            id: '1',
            ticketNumber: 'TKT-001-ABC123',
            attendeeName: 'John Doe',
            attendeeEmail: 'john@example.com',
            ticketType: 'General Admission',
            price: 25,
            currency: 'USD',
            status: 'active',
            qrCode: JSON.stringify({ ticketNumber: 'TKT-001-ABC123', eventId: '1', userId: 'user1' }),
            qrCodeImage: 'data:image/png;base64,placeholder',
            checkInDetails: {
              isCheckedIn: false,
              scanCount: 0,
            },
            eventId: {
              id: '1',
              title: 'Summer Art Camp for Kids',
              dateSchedule: [{ date: '2024-08-15T09:00:00Z', time: '09:00 AM - 12:00 PM' }],
              location: {
                address: '123 Art Street',
                city: 'New York',
                state: 'NY',
                country: 'USA',
              },
              images: ['https://placehold.co/600x400/orange/white?text=Art+Camp'],
              description: 'A fun and creative art camp for children aged 6-12.',
            },
            validUntil: '2024-08-16T00:00:00Z',
            createdAt: '2024-01-15T10:00:00Z',
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTickets();
  }, [filter]);

  // Filter tickets
  const filteredTickets = tickets.filter(ticket => {
    const eventDate = new Date(ticket.eventId.dateSchedule[0]?.date);
    const now = new Date();

    switch (filter) {
      case 'upcoming':
        return eventDate > now && ticket.status === 'active';
      case 'past':
        return eventDate <= now;
      case 'active':
        return ticket.status === 'active';
      case 'used':
        return ticket.status === 'used' || ticket.checkInDetails?.isCheckedIn;
      default:
        return true;
    }
  });

  // Download ticket
  const handleDownloadTicket = async (ticketId: string) => {
    try {
      const response = await ApiService.get(`/tickets/${ticketId}/download`);
      
      // For now, we'll create a simple ticket download
      // In a real implementation, you'd generate a PDF
      const ticketData = response.data.ticket;
      const element = document.createElement('a');
      const file = new Blob([JSON.stringify(ticketData, null, 2)], { type: 'application/json' });
      element.href = URL.createObjectURL(file);
      element.download = `ticket-${ticketData.ticketNumber}.json`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    } catch (error) {
      console.error('Error downloading ticket:', error);
      alert('Failed to download ticket. Please try again.');
    }
  };

  // Get status badge class
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'used':
        return 'bg-blue-100 text-blue-800';
      case 'expired':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Format time
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Tickets</h1>
          <p className="text-gray-600 mt-1">View and manage your event tickets</p>
        </div>

        {/* Filter Tabs */}
        <div className="flex bg-gray-100 rounded-lg p-1 mt-4 md:mt-0">
          {[
            { key: 'upcoming', label: 'Upcoming' },
            { key: 'past', label: 'Past' },
            { key: 'active', label: 'Active' },
            { key: 'used', label: 'Used' },
            { key: 'all', label: 'All' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as any)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === tab.key
                  ? 'bg-white text-primary shadow'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tickets Grid */}
      {filteredTickets.length === 0 ? (
        <div className="text-center py-12">
          <Ticket className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No tickets found</h3>
          <p className="text-gray-500">
            {filter === 'upcoming' 
              ? "You don't have any upcoming events."
              : "No tickets match the selected filter."
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTickets.map((ticket) => (
            <motion.div
              key={ticket.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
            >
              {/* Event Image */}
              <div className="relative h-48">
                <img
                  src={ticket.eventId.images[0] || 'https://placehold.co/600x400/gray/white?text=Event'}
                  alt={ticket.eventId.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 right-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(ticket.status)}`}>
                    {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                  </span>
                </div>
              </div>

              {/* Ticket Details */}
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {ticket.eventId.title}
                </h3>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="h-4 w-4 mr-2" />
                    {formatDate(ticket.eventId.dateSchedule[0]?.date)}
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-600">
                    <Clock className="h-4 w-4 mr-2" />
                    {formatTime(ticket.eventId.dateSchedule[0]?.date)}
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="h-4 w-4 mr-2" />
                    {ticket.eventId.location.city}, {ticket.eventId.location.state}
                  </div>

                  <div className="flex items-center text-sm text-gray-600">
                    <User className="h-4 w-4 mr-2" />
                    {ticket.attendeeName}
                  </div>

                  <div className="flex items-center text-sm text-gray-600">
                    <Ticket className="h-4 w-4 mr-2" />
                    {ticket.ticketNumber}
                  </div>
                </div>

                {/* Price and Seat Info */}
                <div className="flex justify-between items-center mb-4">
                  <span className="text-lg font-bold text-primary">
                    {ticket.currency} {ticket.price}
                  </span>
                  {ticket.seatNumber && (
                    <span className="text-sm text-gray-600">
                      Seat: {ticket.seatNumber}
                    </span>
                  )}
                </div>

                {/* Check-in Status */}
                {ticket.checkInDetails?.isCheckedIn && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                    <p className="text-sm text-green-800 font-medium">
                      ✓ Checked in at {new Date(ticket.checkInDetails.checkInTime!).toLocaleString()}
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setSelectedTicket(ticket);
                      setShowQRModal(true);
                    }}
                    className="flex-1 bg-primary text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors flex items-center justify-center"
                  >
                    <QrCode className="h-4 w-4 mr-2" />
                    Show QR
                  </button>
                  
                  <button
                    onClick={() => handleDownloadTicket(ticket.id)}
                    className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors flex items-center justify-center"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* QR Code Modal */}
      {showQRModal && selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white rounded-lg max-w-md w-full mx-4 p-6"
          >
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-4">Your Ticket QR Code</h3>
              
              <div className="bg-white p-6 rounded-lg border mb-4 inline-block">
                <QRCode
                  value={selectedTicket.qrCode}
                  size={200}
                  level="M"
                  includeMargin
                />
              </div>

              <div className="text-sm text-gray-600 mb-4">
                <p className="font-medium">{selectedTicket.eventId.title}</p>
                <p>{selectedTicket.ticketNumber}</p>
                <p>{selectedTicket.attendeeName}</p>
              </div>

              <p className="text-xs text-gray-500 mb-4">
                Show this QR code to staff for entry to the event
              </p>

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    // Share functionality could be implemented here
                    if (navigator.share) {
                      navigator.share({
                        title: `Ticket for ${selectedTicket.eventId.title}`,
                        text: `My ticket: ${selectedTicket.ticketNumber}`,
                      });
                    }
                  }}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center"
                >
                  <Share className="h-4 w-4 mr-2" />
                  Share
                </button>
                
                <button
                  onClick={() => setShowQRModal(false)}
                  className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default MyTicketsPage;