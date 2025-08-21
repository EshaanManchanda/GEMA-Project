import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

// Mock data for when backend is unavailable
const mockEvents = [
  {
    id: '1',
    title: 'Kids Fun Day',
    description: 'A day full of fun activities for kids of all ages. Join us for a memorable experience filled with games, entertainment, and creative activities designed to engage children of various age groups. Our trained staff will ensure a safe and enjoyable environment for all participants.',
    image: 'https://via.placeholder.com/800x400?text=Kids+Fun+Day',
    price: 25,
    date: '2023-12-15',
    time: '10:00 AM - 4:00 PM',
    location: 'Central Park',
    address: '123 Park Avenue, New York, NY 10022',
    category: 'Entertainment',
    ageRange: '3-12 years',
    capacity: 50,
    availableSpots: 15,
    organizer: {
      id: '101',
      name: 'Fun Events Co.',
      logo: 'https://via.placeholder.com/100x100?text=FEC',
      rating: 4.8
    },
    features: [
      'Professional supervision',
      'Lunch and snacks included',
      'Indoor and outdoor activities',
      'Souvenir for each child'
    ],
    reviews: [
      {
        id: '201',
        user: 'Sarah M.',
        rating: 5,
        comment: 'My kids had an amazing time! Highly recommended!',
        date: '2023-11-20'
      },
      {
        id: '202',
        user: 'John D.',
        rating: 4,
        comment: 'Great event, well organized. Would attend again.',
        date: '2023-11-18'
      }
    ]
  },
  {
    id: '2',
    title: 'Science Workshop',
    description: 'Interactive science experiments for curious minds. This workshop introduces children to the fascinating world of science through hands-on experiments and demonstrations. Participants will learn about basic scientific principles in a fun and engaging way, fostering a love for discovery and learning.',
    image: 'https://via.placeholder.com/800x400?text=Science+Workshop',
    price: 30,
    date: '2023-12-20',
    time: '1:00 PM - 5:00 PM',
    location: 'Science Museum',
    address: '456 Museum Road, New York, NY 10024',
    category: 'Education',
    ageRange: '6-14 years',
    capacity: 30,
    availableSpots: 8,
    organizer: {
      id: '102',
      name: 'Science Explorers',
      logo: 'https://via.placeholder.com/100x100?text=SE',
      rating: 4.9
    },
    features: [
      'Take-home experiment kit',
      'Certificate of participation',
      'Small group instruction',
      'All materials provided'
    ],
    reviews: [
      {
        id: '203',
        user: 'Emily R.',
        rating: 5,
        comment: 'My daughter loved the experiments! Educational and fun.',
        date: '2023-11-25'
      },
      {
        id: '204',
        user: 'Michael T.',
        rating: 5,
        comment: 'Excellent workshop. The instructors were knowledgeable and patient.',
        date: '2023-11-22'
      }
    ]
  }
];

const EventDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [event, setEvent] = useState<any>(null);
  const [usingMockData, setUsingMockData] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('about'); // 'about', 'location', 'reviews'
  const { addItemToCart, isItemInCart } = useCart();
  
  // Simulate fetching data from backend
  useEffect(() => {
    const fetchEventDetails = async () => {
      try {
        setIsLoading(true);
        
        // Attempt to fetch real data from backend
        const response = await fetch(`/api/events/${id}`);
        
        if (!response.ok) {
          throw new Error('Backend service unavailable');
        }
        
        const data = await response.json();
        setEvent(data);
        setUsingMockData(false);
        
      } catch (err) {
        console.error('Error fetching event details:', err);
        // Use mock data if backend is unavailable
        const mockEvent = mockEvents.find(e => e.id === id);
        
        if (mockEvent) {
          setEvent(mockEvent);
          setUsingMockData(true);
          setError('Unable to connect to the server. Showing default event data.');
        } else {
          setError('Event not found. Please try another event.');
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchEventDetails();
  }, [id]);
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (error && !event) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
          <p className="font-bold">Error</p>
          <p>{error}</p>
          <Link to="/events" className="mt-4 inline-block text-primary hover:underline">Browse other events</Link>
        </div>
      </div>
    );
  }
  
  if (!event) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-4">Event Not Found</h2>
          <p className="mb-6">The event you're looking for doesn't exist or has been removed.</p>
          <Link to="/events" className="bg-primary text-white px-6 py-2 rounded-md hover:bg-primary-dark transition-colors">
            Browse Events
          </Link>
        </div>
      </div>
    );
  }
  
  // Format date for display
  const formatEventDate = (dateString: string, timeString: string) => {
    try {
      const date = new Date(dateString);
      const formattedDate = format(date, 'EEEE, MMMM d, yyyy');
      return `${formattedDate} • ${timeString}`;
    } catch (e) {
      return `${dateString} • ${timeString}`;
    }
  };

  // Handle booking
  const handleBookNow = () => {
    navigate('/booking', { 
      state: { 
        event, 
        quantity,
        totalPrice: (event.price * quantity * 1.1).toFixed(2)
      } 
    });
  };

  // Handle add to cart
  const handleAddToCart = () => {
    addItemToCart({
      id: event.id,
      title: event.title,
      price: event.price,
      quantity: quantity,
      image: event.image,
      date: event.date,
      time: event.time,
      location: event.location,
      organizer: event.organizer.name
    }, quantity);
    toast.success(`${event.title} added to cart!`);
  };
  
  // Check if event is already in cart
  const eventInCart = event ? isItemInCart(event.id) : false;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back button */}
      <button 
        onClick={() => navigate('/events')} 
        className="flex items-center text-primary hover:text-primary-dark mb-4 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Events
      </button>

      {usingMockData && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6" role="alert">
          <p className="font-bold">Note</p>
          <p>{error}</p>
        </div>
      )}
      
      {/* Event Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-3">{event.title}</h1>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-2">
              <div className="flex items-center text-gray-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>{event.location}</span>
              </div>
              <div className="flex items-center text-gray-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>{formatEventDate(event.date, event.time)}</span>
              </div>
            </div>
            <div className="flex items-center">
              <span className="bg-primary bg-opacity-10 text-primary px-3 py-1 rounded-full text-sm font-medium">
                {event.category}
              </span>
              {event.availableSpots <= 10 && (
                <span className="ml-2 bg-red-100 text-red-600 px-3 py-1 rounded-full text-sm font-medium">
                  Only {event.availableSpots} spots left!
                </span>
              )}
            </div>
          </div>
          <div className="bg-white p-5 rounded-lg shadow-md w-full md:w-auto">
            <div className="flex items-center justify-between mb-3">
              <div className="text-gray-700 font-medium">Price per ticket</div>
              <div className="text-2xl font-bold text-primary">${event.price}</div>
            </div>
            <div className="flex justify-between items-center mb-4">
              <div className="text-sm text-gray-600">Available</div>
              <div className="text-sm font-medium">{event.availableSpots} spots</div>
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-medium mb-2">Quantity</label>
              <div className="flex items-center border border-gray-300 rounded-md overflow-hidden">
                <button 
                  className="bg-gray-100 text-gray-700 px-3 py-2 hover:bg-gray-200 transition-colors focus:outline-none"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  </svg>
                </button>
                <input 
                  type="number" 
                  min="1" 
                  max={event.availableSpots} 
                  value={quantity} 
                  onChange={(e) => setQuantity(Math.min(event.availableSpots, Math.max(1, parseInt(e.target.value) || 1)))} 
                  className="w-full text-center py-2 border-0 focus:outline-none focus:ring-0"
                />
                <button 
                  className="bg-gray-100 text-gray-700 px-3 py-2 hover:bg-gray-200 transition-colors focus:outline-none"
                  onClick={() => setQuantity(Math.min(event.availableSpots, quantity + 1))}
                  disabled={quantity >= event.availableSpots}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="border-t border-gray-200 pt-3 mb-4">
              <div className="flex justify-between mb-1">
                <span className="text-gray-600">Subtotal</span>
                <span>${(event.price * quantity).toFixed(2)}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Service Fee</span>
                <span>${(event.price * quantity * 0.1).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span>${(event.price * quantity * 1.1).toFixed(2)}</span>
              </div>
            </div>
            <button 
              onClick={handleBookNow}
              className="block w-full text-center bg-primary text-white py-3 rounded-md hover:bg-primary-dark transition-colors font-medium mb-3"
            >
              Book Now
            </button>
            <button 
              onClick={handleAddToCart}
              disabled={eventInCart}
              className={`block w-full text-center py-3 rounded-md font-medium ${eventInCart ? 'bg-gray-300 cursor-not-allowed' : 'bg-secondary text-white hover:bg-secondary-dark transition-colors'}`}
            >
              {eventInCart ? 'Already in Cart' : 'Add to Cart'}
            </button>
            <div className="mt-3 text-center text-xs text-gray-500">
              <p>You won't be charged yet</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Event Image */}
      <div className="mb-8 relative rounded-lg overflow-hidden shadow-lg">
        <img src={event.image} alt={event.title} className="w-full h-96 object-cover" />
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-6">
          <div className="flex items-center text-white">
            <div className="mr-4 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span>120 views</span>
            </div>
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              <span>Save for later</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Event Content */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="md:col-span-2">
          {/* Tabs */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
            <div className="flex border-b">
              <button 
                className={`flex-1 py-4 px-6 text-center font-medium ${activeTab === 'about' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => setActiveTab('about')}
              >
                About
              </button>
              <button 
                className={`flex-1 py-4 px-6 text-center font-medium ${activeTab === 'location' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => setActiveTab('location')}
              >
                Location
              </button>
              <button 
                className={`flex-1 py-4 px-6 text-center font-medium ${activeTab === 'reviews' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => setActiveTab('reviews')}
              >
                Reviews ({event.reviews.length})
              </button>
            </div>
            
            <div className="p-6">
              {/* About Tab */}
              {activeTab === 'about' && (
                <div>
                  <h2 className="text-2xl font-bold mb-4">About This Event</h2>
                  <p className="text-gray-700 mb-6 leading-relaxed">{event.description}</p>
                  
                  <div className="bg-gray-50 p-4 rounded-lg mb-6 border border-gray-200">
                    <h3 className="text-lg font-semibold mb-3">Event Schedule</h3>
                    <div className="flex items-center mb-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="font-medium">{formatEventDate(event.date, event.time)}</span>
                    </div>
                    <p className="text-gray-600 text-sm">Doors open 30 minutes before the event starts. Please arrive on time.</p>
                  </div>
                  
                  <h3 className="text-xl font-semibold mb-3">Event Features</h3>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                    {event.features.map((feature: string, index: number) => (
                      <li key={index} className="flex items-center bg-gray-50 p-3 rounded-lg border border-gray-100">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h3 className="text-lg font-semibold mb-3">Additional Information</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-gray-500 mb-1">Age Range</div>
                        <div className="font-medium">{event.ageRange}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500 mb-1">Capacity</div>
                        <div className="font-medium">{event.capacity} participants</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Location Tab */}
              {activeTab === 'location' && (
                <div>
                  <h2 className="text-2xl font-bold mb-4">Event Location</h2>
                  <div className="bg-gray-50 p-4 rounded-lg mb-6 border border-gray-200">
                    <div className="flex items-center mb-4">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <div>
                        <h3 className="font-medium">{event.location}</h3>
                        <p className="text-gray-600 text-sm">{event.address}</p>
                      </div>
                    </div>
                    <div className="bg-gray-200 h-64 rounded-lg mb-4">
                      {/* Map placeholder */}
                      <div className="h-full flex items-center justify-center text-gray-500">
                        Map view would be displayed here
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <button className="text-primary hover:text-primary-dark flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                        </svg>
                        Get Directions
                      </button>
                      <button className="text-primary hover:text-primary-dark flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                        </svg>
                        Share Location
                      </button>
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h3 className="font-bold mb-3">Transportation Options</h3>
                    <ul className="space-y-3">
                      <li className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
                        </svg>
                        <span>Public Transit: Bus lines 42, 56 stop nearby</span>
                      </li>
                      <li className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                        </svg>
                        <span>Parking: Available on-site (limited spaces)</span>
                      </li>
                    </ul>
                  </div>
                </div>
              )}
              
              {/* Reviews Tab */}
              {activeTab === 'reviews' && (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">Customer Reviews</h2>
                    <button className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark transition-colors">
                      Write a Review
                    </button>
                  </div>
                  
                  {event.reviews && event.reviews.length > 0 ? (
                    <div className="space-y-6">
                      {event.reviews.map((review: any) => (
                        <div key={review.id} className="border-b border-gray-200 pb-6 last:border-0">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center">
                              <div className="w-12 h-12 rounded-full bg-gray-300 mr-4 flex items-center justify-center text-gray-600 font-bold text-lg">
                                {review.user.charAt(0)}
                              </div>
                              <div>
                                <div className="font-medium text-lg">{review.user}</div>
                                <div className="text-sm text-gray-500">{review.date}</div>
                              </div>
                            </div>
                            <div className="flex items-center">
                              {[...Array(5)].map((_, i) => (
                                <svg 
                                  key={i} 
                                  xmlns="http://www.w3.org/2000/svg" 
                                  className={`h-5 w-5 ${i < review.rating ? 'text-yellow-400' : 'text-gray-300'}`} 
                                  viewBox="0 0 20 20" 
                                  fill="currentColor"
                                >
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                              ))}
                            </div>
                          </div>
                          <p className="text-gray-700 leading-relaxed mb-3">{review.comment}</p>
                          <div className="flex space-x-4">
                            <button className="text-gray-500 hover:text-primary text-sm flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                              </svg>
                              Helpful (12)
                            </button>
                            <button className="text-gray-500 hover:text-primary text-sm flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                              </svg>
                              Reply
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                      <p className="text-gray-600 mb-4">No reviews yet. Be the first to share your experience!</p>
                      <button className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark transition-colors">
                        Write a Review
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Sidebar */}
        <div>
          {/* Share and save buttons */}
          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <div className="flex space-x-2 mb-6">
              <button className="flex-1 flex items-center justify-center py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-gray-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Share
              </button>
              <button className="flex-1 flex items-center justify-center py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-gray-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                Save
              </button>
            </div>
            
            <h3 className="text-xl font-semibold mb-4">Event Details</h3>
            <div className="space-y-4">
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-primary bg-opacity-10 flex items-center justify-center mr-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Category</div>
                  <div className="font-medium">{event.category}</div>
                </div>
              </div>
              
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-primary bg-opacity-10 flex items-center justify-center mr-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Age Range</div>
                  <div className="font-medium">{event.ageRange}</div>
                </div>
              </div>
              
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-primary bg-opacity-10 flex items-center justify-center mr-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Capacity</div>
                  <div className="font-medium">{event.capacity} participants</div>
                </div>
              </div>
              
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-primary bg-opacity-10 flex items-center justify-center mr-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Available Spots</div>
                  <div className="font-medium">{event.availableSpots} spots left</div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-4">Organizer</h3>
            <div className="flex items-center mb-4">
              <img src={event.organizer.logo} alt={event.organizer.name} className="w-14 h-14 rounded-full mr-4 border-2 border-primary p-0.5" />
              <div>
                <div className="font-medium text-lg">{event.organizer.name}</div>
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <svg 
                      key={i} 
                      xmlns="http://www.w3.org/2000/svg" 
                      className={`h-4 w-4 ${i < Math.floor(event.organizer.rating) ? 'text-yellow-400' : 'text-gray-300'}`} 
                      viewBox="0 0 20 20" 
                      fill="currentColor"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                  <span className="ml-1 text-sm text-gray-600">{event.organizer.rating} • 120 events</span>
                </div>
              </div>
            </div>
            <p className="text-gray-600 mb-4 text-sm">Professional event organizer specializing in educational and entertainment events for children.</p>
            <div className="flex space-x-2">
              <Link to={`/vendors/${event.organizer.id}`} className="flex-1 text-center py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors">
                View Profile
              </Link>
              <button className="flex-1 py-2 border border-primary text-primary rounded-md hover:bg-primary hover:text-white transition-colors">
                Contact
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetailPage;