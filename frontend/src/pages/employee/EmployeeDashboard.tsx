import React, { useState, useEffect } from 'react';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { ApiService } from '@/services/api';

interface CheckinStats {
  totalCheckins: number;
  todayCheckins: number;
  pendingTickets: number;
  upcomingEvents: number;
}

interface Event {
  _id: string;
  title: string;
  dateSchedule: string;
  location: string;
  ticketsCount: number;
  checkedInCount: number;
}

interface CheckinLog {
  _id: string;
  ticketId: string;
  eventTitle: string;
  customerName: string;
  checkedInAt: string;
  status: 'checked_in' | 'pending' | 'invalid';
}

const EmployeeDashboard: React.FC = () => {
  const [stats, setStats] = useState<CheckinStats | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [recentCheckins, setRecentCheckins] = useState<CheckinLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [scannerActive, setScannerActive] = useState(false);
  const [activeTab, setActiveTab] = useState('events');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      
      // Mock data for now since backend endpoints may not exist yet
      setStats({
        totalCheckins: 150,
        todayCheckins: 25,
        pendingTickets: 10,
        upcomingEvents: 5
      });
      
      setEvents([
        {
          _id: '1',
          title: 'Summer Music Festival',
          dateSchedule: new Date().toISOString(),
          location: 'Central Park',
          ticketsCount: 100,
          checkedInCount: 75
        }
      ]);
      
      setRecentCheckins([
        {
          _id: '1',
          ticketId: 'TKT001',
          eventTitle: 'Summer Music Festival',
          customerName: 'John Doe',
          checkedInAt: new Date().toISOString(),
          status: 'checked_in'
        }
      ]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickCheckin = async (ticketCode: string) => {
    try {
      const response = await ApiService.post('/checkin', { ticketCode });

      if (response.success) {
        alert('Ticket checked in successfully!');
        fetchDashboardData();
      } else {
        alert('Failed to check in ticket');
      }
    } catch (error) {
      alert('Failed to check in ticket');
      console.error('Error checking in ticket:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <LoadingSpinner size="large" text="Loading dashboard..." />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Employee Dashboard</h1>
          <p className="text-gray-600">Check-in management and event monitoring</p>
        </div>
        
        <button 
          onClick={() => setScannerActive(!scannerActive)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          📱 {scannerActive ? 'Stop Scanner' : 'Start QR Scanner'}
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Check-ins</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.totalCheckins || 0}</p>
            </div>
            <div className="text-blue-600 text-2xl">✅</div>
          </div>
          <p className="text-xs text-gray-500 mt-1">All time</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Today's Check-ins</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.todayCheckins || 0}</p>
            </div>
            <div className="text-green-600 text-2xl">📅</div>
          </div>
          <p className="text-xs text-gray-500 mt-1">Since midnight</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Tickets</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.pendingTickets || 0}</p>
            </div>
            <div className="text-yellow-600 text-2xl">⏳</div>
          </div>
          <p className="text-xs text-gray-500 mt-1">Awaiting check-in</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Upcoming Events</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.upcomingEvents || 0}</p>
            </div>
            <div className="text-purple-600 text-2xl">📊</div>
          </div>
          <p className="text-xs text-gray-500 mt-1">Next 7 days</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {['events', 'checkins', 'scanner'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Events Tab */}
          {activeTab === 'events' && (
            <div>
              <h3 className="text-lg font-medium mb-4">Upcoming Events</h3>
              {events.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-4">📅</div>
                  <p>No upcoming events</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {events.map((event) => (
                    <div
                      key={event._id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <h4 className="font-semibold">{event.title}</h4>
                        <p className="text-sm text-gray-600">
                          {new Date(event.dateSchedule).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-gray-600">{event.location}</p>
                      </div>
                      <div className="text-right">
                        <div className="bg-gray-100 px-3 py-1 rounded-full text-sm">
                          {event.checkedInCount}/{event.ticketsCount} checked in
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {((event.checkedInCount / event.ticketsCount) * 100).toFixed(1)}% completion
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Check-ins Tab */}
          {activeTab === 'checkins' && (
            <div>
              <h3 className="text-lg font-medium mb-4">Recent Check-ins</h3>
              {recentCheckins.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-4">✅</div>
                  <p>No recent check-ins</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentCheckins.map((checkin) => (
                    <div
                      key={checkin._id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <h4 className="font-semibold">{checkin.customerName}</h4>
                        <p className="text-sm text-gray-600">{checkin.eventTitle}</p>
                        <p className="text-xs text-gray-500">
                          Ticket: {checkin.ticketId}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          checkin.status === 'checked_in' ? 'bg-green-100 text-green-800' :
                          checkin.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {checkin.status.replace('_', ' ')}
                        </span>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(checkin.checkedInAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Scanner Tab */}
          {activeTab === 'scanner' && (
            <div>
              <h3 className="text-lg font-medium mb-4">QR Code Scanner</h3>
              {scannerActive ? (
                <div className="text-center py-8">
                  <div className="w-64 h-64 mx-auto border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-6xl mb-4">📱</div>
                      <p className="text-gray-600">Camera feed would appear here</p>
                      <p className="text-sm text-gray-500">Point camera at QR code to scan</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setScannerActive(false)}
                    className="mt-4 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
                  >
                    Stop Scanner
                  </button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">📱</div>
                  <p className="text-gray-600 mb-4">Scanner is inactive</p>
                  <button 
                    onClick={() => setScannerActive(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    Start QR Scanner
                  </button>
                </div>
              )}

              {/* Manual Check-in */}
              <div className="mt-8 border-t pt-6">
                <h4 className="font-medium mb-3">Manual Check-in</h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter ticket code..."
                    className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        const ticketCode = (e.target as HTMLInputElement).value;
                        if (ticketCode) {
                          handleQuickCheckin(ticketCode);
                          (e.target as HTMLInputElement).value = '';
                        }
                      }
                    }}
                  />
                  <button 
                    onClick={() => {
                      const input = document.querySelector('input[placeholder="Enter ticket code..."]') as HTMLInputElement;
                      if (input?.value) {
                        handleQuickCheckin(input.value);
                        input.value = '';
                      }
                    }}
                    className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                  >
                    Check In
                  </button>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Enter the ticket code manually to check in a customer
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;