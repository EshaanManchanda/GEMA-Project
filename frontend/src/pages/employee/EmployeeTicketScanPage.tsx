import React, { useState, useEffect } from 'react';
import { QrCode, Users, CheckCircle, XCircle, Clock, Search, Filter } from 'lucide-react';
import QRCodeScanner from '../../components/employee/QRCodeScanner';
import employeeAPI from '../../services/api/employeeAPI';
import { ApiService } from '../../services/api';

interface TicketScanRecord {
  id: string;
  ticketNumber: string;
  attendeeName: string;
  eventTitle: string;
  status: 'verified' | 'expired' | 'invalid' | 'already_used' | 'not_yet_valid';
  scannedAt: string;
  checkedIn: boolean;
}

interface Event {
  id: string;
  title: string;
  date: string;
  location: string;
  totalTickets: number;
  checkedInTickets: number;
}

const EmployeeTicketScanPage: React.FC = () => {
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [events, setEvents] = useState<Event[]>([]);
  const [scanRecords, setScanRecords] = useState<TicketScanRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'verified' | 'invalid' | 'used'>('all');

  // Fetch events for selection
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setIsLoading(true);
        // You would call your events API here
        // For now, using mock data
        const mockEvents: Event[] = [
          {
            id: '1',
            title: 'Summer Art Camp for Kids',
            date: '2024-08-15',
            location: 'Creative Arts Center',
            totalTickets: 50,
            checkedInTickets: 23,
          },
          {
            id: '2',
            title: 'Science Workshop: Rockets',
            date: '2024-08-22',
            location: 'Science Museum',
            totalTickets: 30,
            checkedInTickets: 12,
          },
        ];
        setEvents(mockEvents);
      } catch (error) {
        console.error('Error fetching events:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
  }, []);

  // Handle QR verification result
  const handleVerificationResult = (result: any) => {
    const newRecord: TicketScanRecord = {
      id: Date.now().toString(),
      ticketNumber: result.data?.ticket?.ticketNumber || 'Unknown',
      attendeeName: result.data?.ticket?.attendeeName || 'Unknown',
      eventTitle: result.data?.ticket?.eventTitle || 'Unknown Event',
      status: result.status,
      scannedAt: new Date().toISOString(),
      checkedIn: false,
    };

    setScanRecords(prev => [newRecord, ...prev]);
  };

  // Handle check-in
  const handleCheckIn = async (ticketId: string) => {
    try {
      const response = await ApiService.post(`/tickets/${ticketId}/checkin`, {
        location: selectedEventId ? events.find(e => e.id === selectedEventId)?.location : undefined,
      });

      if (response.success) {
        // Update scan records
        setScanRecords(prev => 
          prev.map(record => 
            record.id === ticketId ? { ...record, checkedIn: true } : record
          )
        );

        // Show success message
        alert('Ticket checked in successfully!');
      }
    } catch (error) {
      console.error('Error checking in ticket:', error);
      alert('Failed to check in ticket. Please try again.');
    }
  };

  // Filter scan records
  const filteredRecords = scanRecords.filter(record => {
    if (filter === 'all') return true;
    if (filter === 'verified') return record.status === 'verified';
    if (filter === 'invalid') return ['invalid', 'expired'].includes(record.status);
    if (filter === 'used') return record.status === 'already_used' || record.checkedIn;
    return true;
  });

  // Get status badge class
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'verified':
        return 'bg-green-100 text-green-800';
      case 'expired':
        return 'bg-orange-100 text-orange-800';
      case 'already_used':
        return 'bg-blue-100 text-blue-800';
      case 'not_yet_valid':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-red-100 text-red-800';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'expired':
      case 'not_yet_valid':
        return <Clock className="h-4 w-4 text-orange-500" />;
      default:
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
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
          <h1 className="text-3xl font-bold text-gray-900">Ticket Scanner</h1>
          <p className="text-gray-600 mt-1">Scan QR codes to verify and check-in attendees</p>
        </div>
        
        <div className="flex items-center space-x-4 mt-4 md:mt-0">
          {/* Event Selector */}
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="">All Events</option>
            {events.map(event => (
              <option key={event.id} value={event.id}>
                {event.title}
              </option>
            ))}
          </select>

          {/* Scan Button */}
          <button
            onClick={() => setIsScannerOpen(true)}
            className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            <QrCode className="h-5 w-5 mr-2" />
            Scan QR Code
          </button>
        </div>
      </div>

      {/* Event Statistics */}
      {selectedEventId && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {(() => {
            const event = events.find(e => e.id === selectedEventId);
            if (!event) return null;
            
            return (
              <>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="p-3 rounded-full bg-blue-100 text-blue-500 mr-4">
                      <Users className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Tickets</p>
                      <p className="text-2xl font-semibold text-gray-900">{event.totalTickets}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="p-3 rounded-full bg-green-100 text-green-500 mr-4">
                      <CheckCircle className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Checked In</p>
                      <p className="text-2xl font-semibold text-gray-900">{event.checkedInTickets}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="p-3 rounded-full bg-purple-100 text-purple-500 mr-4">
                      <Users className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Check-in Rate</p>
                      <p className="text-2xl font-semibold text-gray-900">
                        {Math.round((event.checkedInTickets / event.totalTickets) * 100)}%
                      </p>
                    </div>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* Scan Records */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">Recent Scans</h2>
          
          {/* Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="all">All Scans</option>
              <option value="verified">Verified</option>
              <option value="invalid">Invalid/Expired</option>
              <option value="used">Used/Checked In</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          {filteredRecords.length === 0 ? (
            <div className="text-center py-8">
              <QrCode className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No scans yet. Start scanning tickets!</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ticket
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Attendee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Event
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Scanned At
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRecords.map((record) => (
                  <tr key={record.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {record.ticketNumber}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{record.attendeeName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{record.eventTitle}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getStatusIcon(record.status)}
                        <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(record.status)}`}>
                          {record.status.replace('_', ' ')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(record.scannedAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {record.status === 'verified' && !record.checkedIn ? (
                        <button
                          onClick={() => handleCheckIn(record.id)}
                          className="text-green-600 hover:text-green-900"
                        >
                          Check In
                        </button>
                      ) : record.checkedIn ? (
                        <span className="text-green-600">Checked In</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* QR Code Scanner Modal */}
      <QRCodeScanner
        eventId={selectedEventId}
        onVerificationResult={handleVerificationResult}
        onCheckIn={handleCheckIn}
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
      />
    </div>
  );
};

export default EmployeeTicketScanPage;