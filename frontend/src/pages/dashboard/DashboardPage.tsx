import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  image: string;
}

interface Booking {
  id: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  eventLocation: string;
  ticketCount: number;
  totalAmount: number;
  status: 'confirmed' | 'pending' | 'cancelled';
  bookingDate: string;
}

const DashboardPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'saved'>('upcoming');
  const [upcomingEvents, setUpcomingEvents] = useState<Booking[]>([]);
  const [pastEvents, setPastEvents] = useState<Booking[]>([]);
  const [savedEvents, setSavedEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // In a real app, you would fetch data from your API
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mock data for upcoming bookings
        const mockUpcomingBookings: Booking[] = [
          {
            id: '1',
            eventId: '101',
            eventTitle: 'Summer Art Camp for Kids',
            eventDate: '2023-08-15',
            eventTime: '09:00 AM - 12:00 PM',
            eventLocation: 'Creative Arts Center, Downtown',
            ticketCount: 2,
            totalAmount: 120,
            status: 'confirmed',
            bookingDate: '2023-07-20'
          },
          {
            id: '2',
            eventId: '102',
            eventTitle: 'Science Workshop: Rockets and Space',
            eventDate: '2023-08-22',
            eventTime: '10:00 AM - 02:00 PM',
            eventLocation: 'Science Museum, West End',
            ticketCount: 1,
            totalAmount: 45,
            status: 'confirmed',
            bookingDate: '2023-07-25'
          },
          {
            id: '3',
            eventId: '103',
            eventTitle: 'Kids Cooking Class: Baking Basics',
            eventDate: '2023-09-05',
            eventTime: '03:00 PM - 05:00 PM',
            eventLocation: 'Culinary Institute, North Side',
            ticketCount: 3,
            totalAmount: 135,
            status: 'pending',
            bookingDate: '2023-08-01'
          }
        ];
        
        // Mock data for past bookings
        const mockPastBookings: Booking[] = [
          {
            id: '4',
            eventId: '104',
            eventTitle: 'Swimming Lessons for Beginners',
            eventDate: '2023-06-10',
            eventTime: '04:00 PM - 05:30 PM',
            eventLocation: 'Aquatic Center, East Side',
            ticketCount: 1,
            totalAmount: 60,
            status: 'confirmed',
            bookingDate: '2023-05-15'
          },
          {
            id: '5',
            eventId: '105',
            eventTitle: 'Dinosaur Exhibition Tour',
            eventDate: '2023-07-05',
            eventTime: '10:00 AM - 12:00 PM',
            eventLocation: 'Natural History Museum, Central Park',
            ticketCount: 4,
            totalAmount: 80,
            status: 'confirmed',
            bookingDate: '2023-06-20'
          },
          {
            id: '6',
            eventId: '106',
            eventTitle: 'Ballet Performance: Swan Lake for Kids',
            eventDate: '2023-07-15',
            eventTime: '06:00 PM - 08:00 PM',
            eventLocation: 'City Theater, Downtown',
            ticketCount: 2,
            totalAmount: 100,
            status: 'cancelled',
            bookingDate: '2023-06-25'
          }
        ];
        
        // Mock data for saved events
        const mockSavedEvents: Event[] = [
          {
            id: '201',
            title: 'Robotics Workshop for Kids',
            date: '2023-09-15',
            time: '02:00 PM - 04:00 PM',
            location: 'Tech Hub, Innovation District',
            image: 'https://placehold.co/600x400/orange/white?text=Robotics+Workshop'
          },
          {
            id: '202',
            title: 'Zoo Adventure Day',
            date: '2023-09-20',
            time: '09:00 AM - 03:00 PM',
            location: 'City Zoo, Wildlife Park',
            image: 'https://placehold.co/600x400/green/white?text=Zoo+Adventure'
          },
          {
            id: '203',
            title: 'Musical Instruments Introduction',
            date: '2023-10-05',
            time: '10:00 AM - 12:00 PM',
            location: 'Music Academy, Arts District',
            image: 'https://placehold.co/600x400/purple/white?text=Music+Class'
          },
          {
            id: '204',
            title: 'Storytelling Festival',
            date: '2023-10-12',
            time: '11:00 AM - 02:00 PM',
            location: 'Central Library, Downtown',
            image: 'https://placehold.co/600x400/blue/white?text=Storytelling'
          }
        ];
        
        setUpcomingEvents(mockUpcomingBookings);
        setPastEvents(mockPastBookings);
        setSavedEvents(mockSavedEvents);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data. Please try again later.');
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
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Dashboard</h1>
          <p className="text-gray-600 mt-1">Manage your bookings and saved events</p>
        </div>
        <div className="mt-4 md:mt-0">
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
            <div className="flex justify-center py-8">
              <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          ) : (
            <div>
              {activeTab === 'upcoming' && (
                <div>
                  {upcomingEvents.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500">You don't have any upcoming events.</p>
                      <Link to="/events" className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">
                        Browse Events
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {upcomingEvents.map((booking) => (
                        <div key={booking.id} className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
                          <div className="p-4 sm:p-6">
                            <div className="flex flex-col sm:flex-row justify-between">
                              <div>
                                <h3 className="text-lg font-semibold text-gray-900">
                                  <Link to={`/events/${booking.eventId}`} className="hover:text-primary">
                                    {booking.eventTitle}
                                  </Link>
                                </h3>
                                <div className="mt-2 text-sm text-gray-500">
                                  <p><span className="font-medium">Date:</span> {formatDate(booking.eventDate)}</p>
                                  <p><span className="font-medium">Time:</span> {booking.eventTime}</p>
                                  <p><span className="font-medium">Location:</span> {booking.eventLocation}</p>
                                  <p><span className="font-medium">Tickets:</span> {booking.ticketCount}</p>
                                  <p><span className="font-medium">Total:</span> ${booking.totalAmount.toFixed(2)}</p>
                                </div>
                              </div>
                              <div className="mt-4 sm:mt-0 flex flex-col items-start sm:items-end">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(booking.status)}`}>
                                  {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                </span>
                                <p className="mt-2 text-xs text-gray-500">Booked on {formatDate(booking.bookingDate)}</p>
                                <div className="mt-4 space-x-2">
                                  <Link 
                                    to={`/bookings/${booking.id}`}
                                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                                  >
                                    View Details
                                  </Link>
                                  {booking.status !== 'cancelled' && (
                                    <button 
                                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
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
                  {pastEvents.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500">You don't have any past events.</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {pastEvents.map((booking) => (
                        <div key={booking.id} className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 bg-gray-50">
                          <div className="p-4 sm:p-6">
                            <div className="flex flex-col sm:flex-row justify-between">
                              <div>
                                <h3 className="text-lg font-semibold text-gray-900">
                                  <Link to={`/events/${booking.eventId}`} className="hover:text-primary">
                                    {booking.eventTitle}
                                  </Link>
                                </h3>
                                <div className="mt-2 text-sm text-gray-500">
                                  <p><span className="font-medium">Date:</span> {formatDate(booking.eventDate)}</p>
                                  <p><span className="font-medium">Time:</span> {booking.eventTime}</p>
                                  <p><span className="font-medium">Location:</span> {booking.eventLocation}</p>
                                  <p><span className="font-medium">Tickets:</span> {booking.ticketCount}</p>
                                  <p><span className="font-medium">Total:</span> ${booking.totalAmount.toFixed(2)}</p>
                                </div>
                              </div>
                              <div className="mt-4 sm:mt-0 flex flex-col items-start sm:items-end">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(booking.status)}`}>
                                  {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                </span>
                                <p className="mt-2 text-xs text-gray-500">Booked on {formatDate(booking.bookingDate)}</p>
                                <div className="mt-4">
                                  <Link 
                                    to={`/bookings/${booking.id}`}
                                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                                  >
                                    View Details
                                  </Link>
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
                      <p className="text-gray-500">You don't have any saved events.</p>
                      <Link to="/events" className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">
                        Browse Events
                      </Link>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {savedEvents.map((event) => (
                        <div key={event.id} className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
                          <div className="relative pb-48 overflow-hidden">
                            <img 
                              className="absolute inset-0 h-full w-full object-cover" 
                              src={event.image} 
                              alt={event.title} 
                            />
                          </div>
                          <div className="p-4">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                              <Link to={`/events/${event.id}`} className="hover:text-primary">
                                {event.title}
                              </Link>
                            </h3>
                            <div className="text-sm text-gray-500 mb-4">
                              <p><span className="font-medium">Date:</span> {formatDate(event.date)}</p>
                              <p><span className="font-medium">Time:</span> {event.time}</p>
                              <p><span className="font-medium">Location:</span> {event.location}</p>
                            </div>
                            <div className="flex justify-between items-center">
                              <Link 
                                to={`/events/${event.id}`}
                                className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                              >
                                View Event
                              </Link>
                              <button 
                                className="inline-flex items-center p-1.5 border border-transparent text-xs font-medium rounded text-red-600 hover:text-red-800 focus:outline-none"
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
    </div>
  );
};

export default DashboardPage;