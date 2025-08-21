import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import vendorAPI from '../../services/api/vendorAPI';
import VendorNavigation from '../../components/vendor/VendorNavigation';

interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  price: number;
  ticketsSold: number;
  totalCapacity: number;
  status: 'published' | 'draft' | 'cancelled';
  image: string;
}

interface Booking {
  id: string;
  eventId: string;
  eventTitle: string;
  customerName: string;
  customerEmail: string;
  ticketCount: number;
  totalAmount: number;
  bookingDate: string;
  status: 'confirmed' | 'pending' | 'cancelled';
}

interface Stats {
  totalEvents: number;
  activeEvents: number;
  totalBookings: number;
  totalRevenue: number;
  revenueThisMonth: number;
  revenueLastMonth: number;
}

const VendorDashboardPage: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Fetch real data from APIs
        const [eventsData, bookingsData, statsData] = await Promise.all([
          vendorAPI.getVendorEvents(),
          vendorAPI.getVendorBookings({ limit: 5 }),
          vendorAPI.getVendorStats()
        ]);
        
        // Handle API response format - extract data if it's wrapped in response object
        setEvents(Array.isArray(eventsData) ? eventsData : []);
        setRecentBookings(Array.isArray(bookingsData) ? bookingsData : []);
        setStats(statsData?.data || statsData);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data. Please try again later.');
        
        // Fallback to mock data if API fails
        const mockEvents: Event[] = [
          {
            id: '1',
            title: 'Summer Art Camp for Kids',
            date: '2023-08-15',
            time: '09:00 AM - 12:00 PM',
            location: 'Creative Arts Center, Downtown',
            price: 60,
            ticketsSold: 15,
            totalCapacity: 20,
            status: 'published',
            image: 'https://placehold.co/600x400/orange/white?text=Art+Camp'
          },
          {
            id: '2',
            title: 'Science Workshop: Rockets and Space',
            date: '2023-08-22',
            time: '10:00 AM - 02:00 PM',
            location: 'Science Museum, West End',
            price: 45,
            ticketsSold: 8,
            totalCapacity: 25,
            status: 'published',
            image: 'https://placehold.co/600x400/blue/white?text=Science+Workshop'
          }
        ];
        
        const mockRecentBookings: Booking[] = [
          {
            id: '101',
            eventId: '1',
            eventTitle: 'Summer Art Camp for Kids',
            customerName: 'John Smith',
            customerEmail: 'john.smith@example.com',
            ticketCount: 2,
            totalAmount: 120,
            bookingDate: '2023-07-28',
            status: 'confirmed'
          }
        ];
        
        const mockStats: Stats = {
          totalEvents: 2,
          activeEvents: 2,
          totalBookings: 1,
          totalRevenue: 120,
          revenueThisMonth: 120,
          revenueLastMonth: 0
        };
        
        setEvents(mockEvents);
        setRecentBookings(mockRecentBookings);
        setStats(mockStats);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);

  const formatDate = (dateString: string): string => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const getStatusBadgeClass = (status: string): string => {
    switch (status) {
      case 'published':
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'draft':
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const calculateProgress = (sold: number, total: number): number => {
    return Math.round((sold / total) * 100);
  };

  if (isLoading) {
    return (
      <>
        <VendorNavigation />
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-[50vh]">
            <div className="text-center">
              <div className="relative inline-block">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-200"></div>
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-green-600 absolute top-0 left-0"></div>
              </div>
              <p className="mt-4 text-xl font-semibold text-gray-700 animate-pulse">Loading Vendor Dashboard...</p>
              <div className="mt-6 space-y-3">
                <div className="h-4 bg-gradient-to-r from-green-200 to-transparent rounded w-64 mx-auto animate-pulse"></div>
                <div className="h-4 bg-gradient-to-r from-emerald-200 to-transparent rounded w-48 mx-auto animate-pulse"></div>
                <div className="h-4 bg-gradient-to-r from-green-200 to-transparent rounded w-56 mx-auto animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <VendorNavigation />
      <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Vendor Dashboard</h1>
          <p className="text-gray-600 mt-1">Manage your events and bookings</p>
        </div>
        <div className="mt-4 md:mt-0">
          <Link 
            to="/vendor/events/create" 
            className="inline-flex items-center px-6 py-3 rounded-xl shadow-lg text-sm font-semibold text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:shadow-xl hover:shadow-green-500/25 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1"
          >
            <svg className="-ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Create New Event
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
          <p>{error}</p>
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl shadow-xl shadow-blue-200/50 p-6 border border-blue-100 backdrop-blur-sm hover:shadow-2xl hover:shadow-blue-300/30 transition-all duration-300 transform hover:scale-105 group">
            <div className="flex items-center">
              <div className="p-4 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white mr-4 shadow-lg transition-all duration-300 group-hover:scale-110">
                <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700 group-hover:text-gray-800 transition-colors duration-300">Total Events</p>
                <p className="text-3xl font-bold text-gray-900 group-hover:text-blue-700 transition-colors duration-300">{stats.totalEvents}</p>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm text-gray-600">
                <span className="text-green-600 font-bold px-2 py-1 rounded-full bg-green-100">{stats.activeEvents} active</span>
                <span className="ml-2">events</span>
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl shadow-xl shadow-green-200/50 p-6 border border-green-100 backdrop-blur-sm hover:shadow-2xl hover:shadow-green-300/30 transition-all duration-300 transform hover:scale-105 group">
            <div className="flex items-center">
              <div className="p-4 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white mr-4 shadow-lg transition-all duration-300 group-hover:scale-110">
                <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700 group-hover:text-gray-800 transition-colors duration-300">Total Bookings</p>
                <p className="text-3xl font-bold text-gray-900 group-hover:text-green-700 transition-colors duration-300">{stats.totalBookings}</p>
              </div>
            </div>
            <div className="mt-4">
              <Link to="/vendor/bookings" className="text-sm font-semibold px-3 py-1 bg-green-100 text-green-700 rounded-full hover:bg-green-200 hover:text-green-800 transition-all duration-300">
                View all bookings
              </Link>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl shadow-xl shadow-purple-200/50 p-6 border border-purple-100 backdrop-blur-sm hover:shadow-2xl hover:shadow-purple-300/30 transition-all duration-300 transform hover:scale-105 group">
            <div className="flex items-center">
              <div className="p-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 text-white mr-4 shadow-lg transition-all duration-300 group-hover:scale-110">
                <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700 group-hover:text-gray-800 transition-colors duration-300">Total Revenue</p>
                <p className="text-3xl font-bold text-gray-900 group-hover:text-purple-700 transition-colors duration-300">${stats.totalRevenue}</p>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm text-gray-600">
                <span className="text-purple-600 font-bold px-2 py-1 rounded-full bg-purple-100">${stats.revenueThisMonth}</span>
                <span className="ml-2">this month</span>
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-2xl shadow-xl shadow-orange-200/50 p-6 border border-orange-100 backdrop-blur-sm hover:shadow-2xl hover:shadow-orange-300/30 transition-all duration-300 transform hover:scale-105 group">
            <div className="flex items-center">
              <div className="p-4 rounded-xl bg-gradient-to-r from-orange-500 to-yellow-600 text-white mr-4 shadow-lg transition-all duration-300 group-hover:scale-110">
                <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700 group-hover:text-gray-800 transition-colors duration-300">Monthly Growth</p>
                <p className="text-2xl font-bold text-gray-900 group-hover:text-orange-700 transition-colors duration-300">
                  {stats.revenueThisMonth > stats.revenueLastMonth ? (
                    <span className="text-green-600 bg-green-100 px-2 py-1 rounded-full font-bold text-lg">↗ +{Math.round((stats.revenueThisMonth - stats.revenueLastMonth) / stats.revenueLastMonth * 100)}%</span>
                  ) : (
                    <span className="text-red-600 bg-red-100 px-2 py-1 rounded-full font-bold text-lg">↘ -{Math.round((stats.revenueLastMonth - stats.revenueThisMonth) / stats.revenueLastMonth * 100)}%</span>
                  )}
                </p>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm text-gray-600">
                <span className="font-semibold">vs ${stats.revenueLastMonth}</span> last month
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-xl shadow-gray-200/50 overflow-hidden border border-white/20 backdrop-blur-sm">
            <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-blue-50 to-indigo-50">
              <h2 className="text-xl font-bold text-gray-900 flex items-center">
                <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-full mr-3"></div>
                Your Events
              </h2>
              <Link to="/vendor/events" className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-300 transform hover:scale-105">
                View All
              </Link>
            </div>
            <div className="p-6">
              {!Array.isArray(events) || events.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">You don't have any events yet.</p>
                  <Link to="/vendor/events/create" className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">
                    Create Your First Event
                  </Link>
                </div>
              ) : (
                <div className="space-y-6">
                  {Array.isArray(events) && events.map((event) => (
                    <div key={event.id} className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
                      <div className="flex flex-col sm:flex-row">
                        <div className="sm:w-1/3 md:w-1/4">
                          <img 
                            className="h-48 w-full object-cover sm:h-full" 
                            src={event.image} 
                            alt={event.title} 
                          />
                        </div>
                        <div className="p-4 sm:p-6 sm:w-2/3 md:w-3/4">
                          <div className="flex flex-col sm:flex-row justify-between">
                            <div>
                              <div className="flex items-center mb-2">
                                <h3 className="text-lg font-semibold text-gray-900 mr-2">
                                  <Link to={`/vendor/events/${event.id}`} className="hover:text-primary">
                                    {event.title}
                                  </Link>
                                </h3>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(event.status)}`}>
                                  {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                                </span>
                              </div>
                              <div className="text-sm text-gray-500 mb-4">
                                <p><span className="font-medium">Date:</span> {formatDate(event.date)}</p>
                                <p><span className="font-medium">Time:</span> {event.time}</p>
                                <p><span className="font-medium">Location:</span> {event.location}</p>
                                <p><span className="font-medium">Price:</span> ${event.price.toFixed(2)}</p>
                              </div>
                            </div>
                            <div className="mt-4 sm:mt-0">
                              <div className="text-sm text-gray-500 mb-2">
                                <span className="font-medium">Tickets sold:</span> {event.ticketsSold} / {event.totalCapacity}
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                                <div 
                                  className="bg-primary h-2.5 rounded-full" 
                                  style={{ width: `${calculateProgress(event.ticketsSold, event.totalCapacity)}%` }}
                                ></div>
                              </div>
                              <div className="flex space-x-2">
                                <Link 
                                  to={`/vendor/events/${event.id}/edit`}
                                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                                >
                                  Edit
                                </Link>
                                <Link 
                                  to={`/events/${event.id}`}
                                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                                >
                                  Preview
                                </Link>
                                {event.status === 'draft' && (
                                  <button 
                                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                  >
                                    Publish
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div>
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-xl shadow-gray-200/50 overflow-hidden border border-white/20 backdrop-blur-sm">
            <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-green-50 to-emerald-50">
              <h2 className="text-xl font-bold text-gray-900 flex items-center">
                <div className="w-1 h-6 bg-gradient-to-b from-green-500 to-emerald-600 rounded-full mr-3"></div>
                Recent Bookings
              </h2>
              <Link to="/vendor/bookings" className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-green-500/25 transition-all duration-300 transform hover:scale-105">
                View All
              </Link>
            </div>
            <div className="p-6">
              {!Array.isArray(recentBookings) || recentBookings.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No bookings yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Array.isArray(recentBookings) && recentBookings.map((booking) => (
                    <div key={booking.id} className="border rounded-lg p-4 hover:shadow-sm transition-shadow duration-200">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-gray-900">{booking.customerName}</h4>
                          <p className="text-sm text-gray-500">{booking.customerEmail}</p>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(booking.status)}`}>
                          {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                        </span>
                      </div>
                      <div className="mt-2 text-sm text-gray-500">
                        <p><span className="font-medium">Event:</span> {booking.eventTitle}</p>
                        <p><span className="font-medium">Tickets:</span> {booking.ticketCount}</p>
                        <p><span className="font-medium">Total:</span> ${booking.totalAmount.toFixed(2)}</p>
                        <p><span className="font-medium">Booked on:</span> {formatDate(booking.bookingDate)}</p>
                      </div>
                      <div className="mt-3">
                        <Link 
                          to={`/vendor/bookings/${booking.id}`}
                          className="text-xs text-primary hover:text-primary-dark font-medium"
                        >
                          View details
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      </div>
    </>
  );
};

export default VendorDashboardPage;