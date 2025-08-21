import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

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
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'cancelled'>('upcoming');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mock data for bookings
        const mockBookings: Booking[] = [
          {
            id: '1001',
            eventId: '101',
            eventTitle: 'Summer Art Camp for Kids',
            eventImage: 'https://placehold.co/600x400/orange/white?text=Art+Camp',
            eventDate: '2023-08-15',
            eventTime: '09:00 AM - 12:00 PM',
            eventLocation: 'Creative Arts Center, Downtown',
            ticketCount: 2,
            totalAmount: 120,
            bookingDate: '2023-07-28',
            status: 'confirmed'
          },
          {
            id: '1002',
            eventId: '102',
            eventTitle: 'Science Workshop: Rockets and Space',
            eventImage: 'https://placehold.co/600x400/blue/white?text=Science+Workshop',
            eventDate: '2023-08-22',
            eventTime: '10:00 AM - 02:00 PM',
            eventLocation: 'Science Museum, West End',
            ticketCount: 3,
            totalAmount: 135,
            bookingDate: '2023-07-26',
            status: 'confirmed'
          },
          {
            id: '1003',
            eventId: '103',
            eventTitle: 'Dinosaur Exhibition Tour',
            eventImage: 'https://placehold.co/600x400/brown/white?text=Dinosaur+Tour',
            eventDate: '2023-07-20',
            eventTime: '10:00 AM - 12:00 PM',
            eventLocation: 'Natural History Museum, Central Park',
            ticketCount: 5,
            totalAmount: 100,
            bookingDate: '2023-07-10',
            status: 'completed'
          },
          {
            id: '1004',
            eventId: '104',
            eventTitle: 'Kids Cooking Class: Baking Basics',
            eventImage: 'https://placehold.co/600x400/green/white?text=Cooking+Class',
            eventDate: '2023-09-05',
            eventTime: '03:00 PM - 05:00 PM',
            eventLocation: 'Culinary Institute, North Side',
            ticketCount: 1,
            totalAmount: 35,
            bookingDate: '2023-08-01',
            status: 'cancelled'
          },
          {
            id: '1005',
            eventId: '105',
            eventTitle: 'Interactive Storytelling Session',
            eventImage: 'https://placehold.co/600x400/purple/white?text=Storytelling',
            eventDate: '2023-08-30',
            eventTime: '11:00 AM - 12:30 PM',
            eventLocation: 'City Library, East Wing',
            ticketCount: 2,
            totalAmount: 40,
            bookingDate: '2023-08-05',
            status: 'confirmed'
          }
        ];
        
        setBookings(mockBookings);
      } catch (err) {
        console.error('Error fetching bookings:', err);
        setError('Failed to load bookings. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchBookings();
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
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredBookings = bookings.filter(booking => {
    const eventDate = new Date(booking.eventDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (activeTab === 'upcoming') {
      return eventDate >= today && booking.status !== 'cancelled';
    } else if (activeTab === 'past') {
      return eventDate < today && booking.status !== 'cancelled';
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
                {filteredBookings.map((booking) => (
                  <div key={booking.id} className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
                    <div className="flex flex-col sm:flex-row">
                      <div className="sm:w-1/3 md:w-1/4">
                        <img 
                          className="h-48 w-full object-cover sm:h-full" 
                          src={booking.eventImage} 
                          alt={booking.eventTitle} 
                        />
                      </div>
                      <div className="p-4 sm:p-6 sm:w-2/3 md:w-3/4">
                        <div className="flex flex-col sm:flex-row justify-between">
                          <div>
                            <div className="flex items-center mb-2">
                              <h3 className="text-lg font-semibold text-gray-900 mr-2">
                                <Link to={`/events/${booking.eventId}`} className="hover:text-primary">
                                  {booking.eventTitle}
                                </Link>
                              </h3>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(booking.status)}`}>
                                {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                              </span>
                            </div>
                            <div className="text-sm text-gray-500 mb-4">
                              <p><span className="font-medium">Date:</span> {formatDate(booking.eventDate)}</p>
                              <p><span className="font-medium">Time:</span> {booking.eventTime}</p>
                              <p><span className="font-medium">Location:</span> {booking.eventLocation}</p>
                              <p><span className="font-medium">Tickets:</span> {booking.ticketCount}</p>
                              <p><span className="font-medium">Total Amount:</span> ${booking.totalAmount.toFixed(2)}</p>
                              <p><span className="font-medium">Booked on:</span> {formatDate(booking.bookingDate)}</p>
                            </div>
                          </div>
                          <div className="mt-4 sm:mt-0 flex flex-col space-y-2">
                            <Link 
                              to={`/bookings/${booking.id}`}
                              className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                            >
                              View Details
                            </Link>
                            
                            {booking.status === 'confirmed' && new Date(booking.eventDate) > new Date() && (
                              <button 
                                className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                                onClick={() => {
                                  if (window.confirm('Are you sure you want to cancel this booking?')) {
                                    // In a real app, you would call an API to cancel the booking
                                    console.log('Booking cancelled:', booking.id);
                                  }
                                }}
                              >
                                Cancel Booking
                              </button>
                            )}
                            
                            {booking.status === 'completed' && (
                              <Link 
                                to={`/review/${booking.eventId}`}
                                className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                              >
                                Write Review
                              </Link>
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
        </div>
      </div>
    </div>
  );
};

export default BookingsPage;