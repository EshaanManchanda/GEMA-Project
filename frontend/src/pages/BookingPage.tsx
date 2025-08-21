import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

interface Event {
  id: number;
  title: string;
  image: string;
  date: string;
  time: string;
  location: string;
  price: number;
  category: string;
  description: string;
  organizer: {
    id: number;
    name: string;
    logo: string;
  };
}

interface BookingFormData {
  quantity: number;
  name: string;
  email: string;
  phone: string;
  specialRequests: string;
}

const BookingPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [usingMockData, setUsingMockData] = useState<boolean>(false);
  
  const [formData, setFormData] = useState<BookingFormData>({
    quantity: 1,
    name: '',
    email: '',
    phone: '',
    specialRequests: ''
  });

  // Mock event data
  const mockEvent: Event = {
    id: parseInt(id || '1'),
    title: 'Tech Conference 2023',
    image: 'https://via.placeholder.com/800x400',
    date: '2023-11-15',
    time: '09:00 AM - 05:00 PM',
    location: 'Convention Center, New York',
    price: 299.99,
    category: 'Conference',
    description: 'Join us for the biggest tech conference of the year featuring keynotes from industry leaders, workshops, and networking opportunities.',
    organizer: {
      id: 101,
      name: 'TechEvents Inc',
      logo: 'https://via.placeholder.com/50'
    }
  };

  useEffect(() => {
    const fetchEvent = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        
        // In a real app, you would fetch from an API
        // const response = await fetch(`/api/events/${id}`);
        // if (!response.ok) throw new Error('Failed to fetch event details');
        // const data = await response.json();
        
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Use mock data instead
        setEvent(mockEvent);
        setUsingMockData(true);
        setError(null);
      } catch (err) {
        console.error('Error fetching event details:', err);
        setError('Failed to load event details. Using mock data instead.');
        setEvent(mockEvent);
        setUsingMockData(true);
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'quantity' ? Math.max(1, parseInt(value) || 1) : value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // In a real app, you would submit to an API
    // const response = await fetch('/api/bookings', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ eventId: id, ...formData })
    // });
    
    // For demo purposes, just navigate to checkout
    navigate(`/checkout/${id}`, { 
      state: { 
        event, 
        booking: formData,
        totalPrice: event ? event.price * formData.quantity : 0
      } 
    });
  };

  const incrementQuantity = () => {
    setFormData(prev => ({
      ...prev,
      quantity: prev.quantity + 1
    }));
  };

  const decrementQuantity = () => {
    setFormData(prev => ({
      ...prev,
      quantity: Math.max(1, prev.quantity - 1)
    }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error && !event) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
          <p className="font-bold">Error</p>
          <p>{error}</p>
        </div>
        <div className="text-center">
          <button 
            onClick={() => navigate(-1)}
            className="inline-block mt-4 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Event not found</h2>
        <p className="mb-6">The event you're looking for doesn't exist or has been removed.</p>
        <button 
          onClick={() => navigate('/events')}
          className="inline-block px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
        >
          Browse Events
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {usingMockData && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6" role="alert">
          <p className="font-bold">Note</p>
          <p>Using mock data. In a production environment, this would be fetched from a backend API.</p>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Event Summary */}
        <div className="lg:w-1/2">
          <div className="bg-white rounded-lg overflow-hidden shadow-md">
            <img 
              src={event.image} 
              alt={event.title} 
              className="w-full h-64 object-cover"
            />
            <div className="p-6">
              <h1 className="text-2xl font-bold mb-2">{event.title}</h1>
              
              <div className="flex items-center text-gray-500 text-sm mb-2">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                </svg>
                {new Date(event.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </div>
              
              <div className="flex items-center text-gray-500 text-sm mb-2">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                {event.time}
              </div>
              
              <div className="flex items-center text-gray-500 text-sm mb-4">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                </svg>
                {event.location}
              </div>
              
              <div className="mb-4 pb-4 border-b border-gray-200">
                <span className="inline-block bg-primary text-white px-3 py-1 rounded-full text-sm font-medium">
                  ${event.price.toFixed(2)} per ticket
                </span>
                <span className="inline-block ml-2 bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm font-medium">
                  {event.category}
                </span>
              </div>
              
              <h2 className="text-lg font-bold mb-2">About This Event</h2>
              <p className="text-gray-700 mb-4">{event.description}</p>
              
              <div className="flex items-center">
                <img 
                  src={event.organizer.logo} 
                  alt={event.organizer.name} 
                  className="w-10 h-10 rounded-full mr-3"
                />
                <div>
                  <p className="text-sm text-gray-500">Organized by</p>
                  <p className="font-medium">{event.organizer.name}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Booking Form */}
        <div className="lg:w-1/2">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold mb-6">Book Your Tickets</h2>
            
            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <label className="block text-gray-700 font-medium mb-2">Number of Tickets</label>
                <div className="flex items-center">
                  <button 
                    type="button"
                    onClick={decrementQuantity}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-l-lg hover:bg-gray-300 transition-colors"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleInputChange}
                    min="1"
                    className="w-20 text-center py-2 border-t border-b border-gray-300 focus:outline-none"
                  />
                  <button 
                    type="button"
                    onClick={incrementQuantity}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-r-lg hover:bg-gray-300 transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
              
              <div className="mb-4">
                <label htmlFor="name" className="block text-gray-700 font-medium mb-2">Full Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Enter your full name"
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="email" className="block text-gray-700 font-medium mb-2">Email Address</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Enter your email address"
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="phone" className="block text-gray-700 font-medium mb-2">Phone Number</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Enter your phone number"
                />
              </div>
              
              <div className="mb-6">
                <label htmlFor="specialRequests" className="block text-gray-700 font-medium mb-2">Special Requests (Optional)</label>
                <textarea
                  id="specialRequests"
                  name="specialRequests"
                  value={formData.specialRequests}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Any special requirements or requests?"
                ></textarea>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <h3 className="font-bold mb-2">Order Summary</h3>
                <div className="flex justify-between mb-2">
                  <span>{event.title} x {formData.quantity}</span>
                  <span>${(event.price * formData.quantity).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-200">
                  <span>Total</span>
                  <span>${(event.price * formData.quantity).toFixed(2)}</span>
                </div>
              </div>
              
              <button
                type="submit"
                className="w-full py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors font-medium"
              >
                Proceed to Checkout
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingPage;