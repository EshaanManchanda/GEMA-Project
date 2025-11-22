import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useCart } from '@/contexts/CartContext';
import { useAuthContext } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import eventsAPI from '../services/api/eventsAPI';
import affiliateEventAPI from '../services/api/affiliateEventAPI';
import { useErrorHandler } from '../utils/errorHandler';
import { ComponentErrorBoundary } from '../components/common/ErrorBoundary';
import { EventSEO } from '@/components/common/SEO';
import { AppDispatch } from '../store';
import {
  setBookingEvent,
  resetBookingFlow,
  setBookingParticipants
} from '../store/slices/bookingsSlice';
import { toggleFavorite } from '../store/slices/favoritesSlice';
import { RootState } from '../store';
import EventDatePicker from '../components/ui/EventDatePicker';
import Badge from '../components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import Avatar from '../components/ui/Avatar';
import StatCard from '../components/ui/StatCard';
import { getEventImage, getVendorLogo, createImageErrorHandler } from '../utils/imageFallbacks';

// Mock data for when backend is unavailable
const mockEvents = [
  {
    id: '1',
    title: 'Kids Fun Day',
    description: 'A day full of fun activities for kids of all ages. Join us for a memorable experience filled with games, entertainment, and creative activities designed to engage children of various age groups. Our trained staff will ensure a safe and enjoyable environment for all participants.',
    image: getEventImage(undefined, 'Kids Fun Day', 800, 400),
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
      logo: getVendorLogo(undefined, 'Fun Events Co.', 100),
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
    image: getEventImage(undefined, 'Science Workshop', 800, 400),
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
      logo: getVendorLogo(undefined, 'Science Explorers', 100),
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
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useAuthContext();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [event, setEvent] = useState<any>(null);
  const [usingMockData, setUsingMockData] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState('about'); // 'about', 'location', 'reviews', 'faqs'
  const [isClaimingEvent, setIsClaimingEvent] = useState(false);
  const { addItemToCart, isItemInCart } = useCart();

  // Memoized schedule calculations - must be before any early returns
  const currentSchedule = useMemo(() => {
    if (!event?.dateSchedule || event.dateSchedule.length === 0) return null;

    if (selectedDate) {
      // Use local date to avoid timezone issues
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const targetDate = `${year}-${month}-${day}`;

      // Find all schedules that contain the selected date
      const matchingSchedules = event.dateSchedule.filter((schedule: any) => {
        const startDate = new Date(schedule.startDate).toISOString().split('T')[0];
        const endDate = new Date(schedule.endDate).toISOString().split('T')[0];
        return targetDate >= startDate && targetDate <= endDate;
      });

      if (matchingSchedules.length === 0) return event.dateSchedule[0];

      // Prefer override schedule if one exists
      const overrideSchedule = matchingSchedules.find((s: any) => s.isOverride === true);
      return overrideSchedule || matchingSchedules[0];
    }

    return event.dateSchedule[0];
  }, [event?.dateSchedule, selectedDate]);

  const currentPrice = useMemo(() => {
    return currentSchedule?.price || event?.price || 0;
  }, [currentSchedule, event?.price]);

  const currentAvailableSeats = useMemo(() => {
    return currentSchedule?.availableSeats || event?.availableSpots || 0;
  }, [currentSchedule, event?.availableSpots]);

  // Favorites state
  const favorites = useSelector((state: RootState) => state.favorites.items);
  const isFavorite = favorites.some(fav => fav._id === event?._id);
  
  // Simulate fetching data from backend
  useEffect(() => {
    const fetchEventDetails = async () => {
      try {
        setIsLoading(true);
        
        // Attempt to fetch real data from backend using API service
        const eventData = await eventsAPI.getEventById(id!);
        
        // Log the response for debugging
        console.log('Received event data:', eventData);
        
        // Validate that we have event data
        if (!eventData || !eventData._id) {
          throw new Error('Invalid event data received from API');
        }
        
        // Transform the API data to match component expectations

        // Helper to get start date from schedule (handles both date and startDate formats)
        const getScheduleDate = (schedule: any) =>
          schedule?.date || schedule?.startDate || new Date().toISOString();

        // Helper to format time (handles startTime/endTime fields or falls back to date-based extraction)
        const getScheduleTime = (schedule: any) => {
          if (!schedule) return 'Time TBD';

          // Use explicit time fields if available
          if (schedule.startTime && schedule.endTime) {
            const formatTime = (time: string) => {
              const [hours, minutes] = time.split(':');
              const hour = parseInt(hours);
              const ampm = hour >= 12 ? 'PM' : 'AM';
              const hour12 = hour % 12 || 12;
              return `${hour12}:${minutes} ${ampm}`;
            };
            return `${formatTime(schedule.startTime)} - ${formatTime(schedule.endTime)}`;
          }

          // Fallback for legacy data without time fields
          return 'Time TBD';
        };

        const firstSchedule = eventData.dateSchedule?.[0];

        // Use totalSeats from API if available, otherwise calculate
        const totalSeats = firstSchedule?.totalSeats ||
          (firstSchedule ? (firstSchedule.availableSeats + (firstSchedule.reservedSeats || 0) + (firstSchedule.soldSeats || 0)) : 50);

        const transformedEvent = {
          ...eventData,
          id: eventData._id,
          image: getEventImage(eventData.images, eventData.title, 800, 400),
          date: getScheduleDate(firstSchedule),
          time: getScheduleTime(firstSchedule),
          location: eventData.location || { city: 'Location TBD', address: 'Address TBD', coordinates: {} },
          ageRange: eventData.ageRange ? `${eventData.ageRange[0]}-${eventData.ageRange[1]} years` : 'All ages',
          capacity: totalSeats,
          availableSpots: firstSchedule?.availableSeats || totalSeats,
          dateSchedule: (eventData.dateSchedule || []).map((schedule: any) => ({
            ...schedule,
            // Preserve existing startDate/endDate, or use date field as fallback
            startDate: schedule.startDate || schedule.date,
            endDate: schedule.endDate || schedule.date,
            // Use totalSeats from API if available, otherwise calculate
            totalSeats: schedule.totalSeats || (schedule.availableSeats + (schedule.reservedSeats || 0) + (schedule.soldSeats || 0))
          })),
          organizer: {
            id: eventData.vendorId?._id || eventData.vendorId,
            name: eventData.vendorId?.firstName && eventData.vendorId?.lastName ? 
              `${eventData.vendorId.firstName} ${eventData.vendorId.lastName}` : 
              'Event Organizer',
            logo: getVendorLogo(undefined, eventData.vendorId?.firstName && eventData.vendorId?.lastName ?
              `${eventData.vendorId.firstName} ${eventData.vendorId.lastName}` :
              'Event Organizer', 100),
            rating: 4.8
          },
          features: [
            'Professional supervision',
            'All materials included',
            'Age-appropriate activities',
            'Safe environment'
          ],
          reviews: []
        };
        
        setEvent(transformedEvent);
        setUsingMockData(false);
        
      } catch (err) {
        console.error('Error fetching event details:', err);
        
        // Check if it's a 404 error (event not found)
        if (err && typeof err === 'object' && 'response' in err) {
          const axiosError = err as any;
          if (axiosError.response?.status === 404) {
            setError('Event not found. This event may have been removed or the URL is incorrect.');
            return;
          }
        }
        
        // For network or other errors, try mock data
        const mockEvent = mockEvents.find(e => e.id === id);
        
        if (mockEvent) {
          setEvent(mockEvent);
          setUsingMockData(true);
          setError('Unable to connect to the server. Showing default event data.');
        } else {
          setError('Unable to load event details. Please check your internet connection and try again.');
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
  
  // Legacy functions for compatibility - use memoized values from top of component
  const getCurrentSchedule = () => currentSchedule;
  const getCurrentPrice = () => currentPrice;
  const getCurrentAvailableSeats = () => currentAvailableSeats;

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

  // Format selected date for display
  const getDisplayDate = () => {
    if (selectedDate) {
      return formatEventDate(selectedDate.toISOString(), event.time);
    }
    return formatEventDate(event.date, event.time);
  };

  // Handle booking
  const handleBookNow = async () => {
    if (!event || !id) {
      toast.error('Event information is not available');
      return;
    }

    // Handle affiliate events - redirect to external booking link
    if (event.isAffiliateEvent && event.externalBookingLink) {
      try {
        // Generate session ID for tracking
        const sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Track the click
        await fetch(`${import.meta.env.VITE_API_URL}/events/${id}/track-click`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sessionId }),
        });

        // Confirm before redirecting
        if (window.confirm('You will be redirected to an external website to complete your booking. Continue?')) {
          window.open(event.externalBookingLink, '_blank', 'noopener,noreferrer');
        }
      } catch (error) {
        console.error('Error tracking affiliate click:', error);
        // Still redirect even if tracking fails
        if (window.confirm('You will be redirected to an external website to complete your booking. Continue?')) {
          window.open(event.externalBookingLink, '_blank', 'noopener,noreferrer');
        }
      }
      return;
    }

    // Regular event booking flow
    if (!selectedDate) {
      toast.error('Please select a date for your booking');
      return;
    }

    const currentPrice = getCurrentPrice();
    const currentAvailableSeats = getCurrentAvailableSeats();
    const currentSchedule = getCurrentSchedule();
    
    if (quantity > currentAvailableSeats) {
      toast.error(`Only ${currentAvailableSeats} seats available for the selected date`);
      return;
    }

    if (!currentSchedule || !currentSchedule._id) {
      toast.error('Schedule information is not available for the selected date');
      return;
    }

    // Reset booking flow and initialize with current event
    dispatch(resetBookingFlow());
    dispatch(setBookingEvent(id));

    // Create initial participants based on quantity with validation
    if (quantity < 1 || quantity > currentAvailableSeats) {
      toast.error(`Invalid quantity. Please select between 1 and ${currentAvailableSeats} participants.`);
      return;
    }

    const initialParticipants = Array.from({ length: quantity }, (_, index) => ({
      id: `participant-${index + 1}`,
      name: '',
      email: '',
      phone: '',
      age: undefined,
      gender: undefined,
      emergencyContact: undefined,
      specialRequirements: '',
      dietaryRestrictions: [],
    }));

    dispatch(setBookingParticipants(initialParticipants));

    // Navigate to booking page with event data including schedule ID
    navigate(`/booking/${id}`, {
      state: {
        event,
        quantity,
        selectedDate: selectedDate.toISOString(),
        schedule: currentSchedule,
        scheduleId: currentSchedule._id, // Include schedule ID for backend API
        totalPrice: (currentPrice * quantity).toFixed(2),
        currency: event.currency || 'AED'
      }
    });

    toast.success('Starting your booking process...');
  };

  // Handle claiming affiliate event
  const handleClaimEvent = async () => {
    if (!id) {
      toast.error('Event information is not available');
      return;
    }

    if (!window.confirm('Are you sure you want to claim this event? Once claimed, it will be associated with your vendor account.')) {
      return;
    }

    setIsClaimingEvent(true);
    try {
      await affiliateEventAPI.claimEvent(id);
      toast.success('Event claimed successfully! Redirecting to your dashboard...');
      setTimeout(() => {
        navigate('/vendor/dashboard');
      }, 2000);
    } catch (error: any) {
      console.error('Error claiming event:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to claim event';
      toast.error(errorMessage);
    } finally {
      setIsClaimingEvent(false);
    }
  };

  // Handle add to cart
  const handleAddToCart = () => {
    if (!selectedDate) {
      toast.error('Please select a date for your booking');
      return;
    }

    const currentPrice = getCurrentPrice();
    const currentAvailableSeats = getCurrentAvailableSeats();
    
    if (quantity > currentAvailableSeats) {
      toast.error(`Only ${currentAvailableSeats} seats available for the selected date`);
      return;
    }

    addItemToCart({
      id: event.id,
      title: event.title,
      price: currentPrice,
      quantity: quantity,
      image: event.image,
      date: selectedDate.toISOString(),
      time: event.time,
      location: event.location,
      organizer: event.organizer.name,
      schedule: getCurrentSchedule()
    }, quantity);
  };
  
  // Check if event is already in cart for the selected date
  const eventInCart = event && selectedDate ? isItemInCart(event.id, selectedDate.toISOString()) : false;

  // Share handler
  const handleShare = async () => {
    if (!event) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: event.title,
          text: event.description,
          url: window.location.href,
        });
        toast.success('Shared successfully!');
      } catch (err) {
        // User cancelled share - do nothing
      }
    } else {
      // Fallback: copy link to clipboard
      try {
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Link copied to clipboard!');
      } catch (err) {
        toast.error('Failed to copy link');
      }
    }
  };

  // Favorite handler
  const handleToggleFavorite = () => {
    if (!event?._id) return;
    dispatch(toggleFavorite(event._id));
  };

  // Contact vendor handler
  const handleContactVendor = () => {
    if (!event?.vendorId) return;

    const { email, phone, firstName, lastName } = event.vendorId;
    const subject = encodeURIComponent(`Inquiry about ${event.title}`);
    const body = encodeURIComponent(`Hello ${firstName} ${lastName},\n\nI'm interested in your event "${event.title}".\n\n`);

    // Open email client with pre-filled information
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
  };

  // View vendor profile handler
  const handleViewVendorProfile = () => {
    if (!event?.vendorId?._id) return;
    navigate(`/vendors/${event.vendorId._id}`);
  };

  const breadcrumbs = event ? [
    { name: 'Home', url: '/' },
    { name: 'Events', url: '/events' },
    { name: event.title, url: `/events/${event.id}` }
  ] : [];

  return (
    <>
      {event && <EventSEO event={event} breadcrumbs={breadcrumbs} />}
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
      
      {/* Modern Hero Section with Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        {/* Main Hero Content - Left Side */}
        <div className="lg:col-span-2 space-y-6">
          {/* Hero Header with Badges */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <Badge variant="default">{event.category}</Badge>
            {event.venueType && <Badge variant={event.venueType?.toLowerCase() as 'outdoor' | 'indoor'}>{event.venueType}</Badge>}
            {event.isFeatured && <Badge variant="featured">✨ Featured</Badge>}
            <Badge variant="secondary">{event.type}</Badge>
            {event.status === 'published' && <Badge variant="success">📋 Published</Badge>}
          </div>
          
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-4 leading-tight">
            {event.title}
          </h1>
          
          <p className="text-lg text-gray-600 mb-6 leading-relaxed">
            {event.description}
          </p>
          
          {/* Event Meta Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
            <div className="flex items-center text-gray-700 bg-gray-50 rounded-lg p-4">
              <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <div className="font-medium">{event.location?.city}</div>
                <div className="text-sm text-gray-500">{event.location?.address}</div>
              </div>
            </div>
            
            <div className="flex items-center text-gray-700 bg-gray-50 rounded-lg p-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <div className="font-medium">{getDisplayDate()}</div>
                <div className="text-sm text-gray-500">Event Date</div>
              </div>
            </div>

            <div className="flex items-center text-gray-700 bg-gray-50 rounded-lg p-4 sm:col-span-2 xl:col-span-1">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <div className="font-medium">{event.ageRange?.[0]} - {event.ageRange?.[1]} years</div>
                <div className="text-sm text-gray-500">Age Range</div>
              </div>
            </div>
          </div>

          {/* Tags */}
          {event.tags && event.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {event.tags.map((tag: string, index: number) => (
                <span key={index} className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full hover:bg-gray-200 transition-colors cursor-pointer">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <StatCard
              title="Views"
              value={event.viewsCount || 0}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              }
              className="hover:shadow-lg transition-shadow"
            />
            <StatCard
              title="Capacity"
              value={event.dateSchedule?.[0]?.totalSeats || 0}
              subtitle="Total seats"
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              }
              className="hover:shadow-lg transition-shadow"
            />
            <StatCard
              title="Available"
              value={getCurrentAvailableSeats()}
              subtitle={`${((getCurrentAvailableSeats() / (event.dateSchedule?.[0]?.totalSeats || 1)) * 100).toFixed(0)}% remaining`}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              className="hover:shadow-lg transition-shadow"
            />
          </div>

          {/* Low availability warning */}
          {getCurrentAvailableSeats() <= 10 && selectedDate && (
            <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-lg p-4 animate-pulse">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.996-.833-2.664 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div>
                  <div className="font-semibold text-red-800">⚡ Limited Availability!</div>
                  <div className="text-red-600 text-sm">Only {getCurrentAvailableSeats()} spots remaining for this date</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sticky Booking Panel - Right Side */}
        <div className="lg:col-span-1">
          <Card variant="glass" className="sticky top-8 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center">
                🎫 Book Your Spot
              </CardTitle>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Starting from</span>
                <div className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
                  {event.currency || 'AED'} {currentPrice}
                </div>
              </div>
              
              {/* Enhanced Progress Bar */}
              <div className="space-y-2">
                <div className="w-full bg-gray-200 rounded-full h-3 relative overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-green-400 to-green-600 h-3 rounded-full transition-all duration-500 ease-out shadow-sm" 
                    style={{
                      width: `${((getCurrentAvailableSeats() / (event.dateSchedule?.[0]?.totalSeats || 1)) * 100)}%`
                    }}
                  >
                    <div className="absolute inset-0 bg-white bg-opacity-25 animate-pulse"></div>
                  </div>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span className="font-medium">{getCurrentAvailableSeats()} available</span>
                  <span>{event.dateSchedule?.[0]?.totalSeats || 0} total</span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Date Selection */}
              <div className="space-y-2">
                <label className="block text-gray-700 text-sm font-semibold">
                  📅 Select Date
                </label>
                <EventDatePicker
                  dateSchedules={event.dateSchedule || []}
                  selectedDate={selectedDate}
                  onDateSelect={setSelectedDate}
                  className="w-full"
                />
              </div>

              {/* Quantity Selector */}
              <div className="space-y-3">
                <label className="block text-gray-700 text-sm font-semibold">
                  🎟️ Number of Tickets
                </label>
                <div className="flex items-center bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-2 border border-gray-200 shadow-inner">
                  <button 
                    className="flex items-center justify-center w-12 h-12 bg-white text-gray-700 rounded-xl hover:bg-gray-100 hover:shadow-md transition-all focus:outline-none shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    </svg>
                  </button>
                  <div className="flex-1 text-center py-3 font-bold text-xl text-gray-900">
                    {quantity}
                  </div>
                  <button 
                    className="flex items-center justify-center w-12 h-12 bg-white text-gray-700 rounded-xl hover:bg-gray-100 hover:shadow-md transition-all focus:outline-none shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => setQuantity(Math.min(getCurrentAvailableSeats(), quantity + 1))}
                    disabled={quantity >= getCurrentAvailableSeats()}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Enhanced Pricing Breakdown */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-5 space-y-3 border border-gray-200">
                <div className="flex justify-between text-sm items-center">
                  <span className="text-gray-600 flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                    </svg>
                    Tickets × {quantity}
                  </span>
                  <span className="font-semibold text-gray-900">{event.currency || 'AED'} {(currentPrice * quantity).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm items-center">
                  <span className="text-gray-600 flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                    Service Fee (10%)
                  </span>
                  <span className="font-semibold text-gray-900">{event.currency || 'AED'} {(currentPrice * quantity * 0.1).toFixed(2)}</span>
                </div>
                <div className="border-t border-gray-300 pt-3">
                  <div className="flex justify-between font-bold text-lg items-center">
                    <span className="text-gray-900">Total</span>
                    <span className="text-primary-600 text-2xl">{event.currency || 'AED'} {(currentPrice * quantity * 1.1).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <button 
                  onClick={handleBookNow}
                  disabled={!selectedDate || getCurrentAvailableSeats() === 0}
                  className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 ${
                    !selectedDate || getCurrentAvailableSeats() === 0
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-primary-500 to-primary-700 hover:from-primary-600 hover:to-primary-800 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-1 hover:scale-105'
                  }`}
                >
                  {!selectedDate ? '📅 Select Date to Book' : getCurrentAvailableSeats() === 0 ? '❌ Sold Out' : '🎫 Book Now'}
                </button>
                
                <button 
                  onClick={handleAddToCart}
                  disabled={eventInCart || !selectedDate || getCurrentAvailableSeats() === 0}
                  className={`w-full py-3 rounded-xl font-semibold transition-all duration-300 border-2 ${
                    eventInCart || !selectedDate || getCurrentAvailableSeats() === 0
                      ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                      : 'bg-white text-primary-600 border-primary-200 hover:bg-primary-50 hover:border-primary-300 transform hover:-translate-y-0.5'
                  }`}
                >
                  {eventInCart ? '✅ Already in Cart' : !selectedDate ? '🛒 Select Date' : getCurrentAvailableSeats() === 0 ? '❌ Sold Out' : '🛒 Add to Cart'}
                </button>
              </div>

              {/* Enhanced Security Note */}
              <div className="flex items-center justify-center text-xs text-gray-500 space-x-2 bg-gray-50 rounded-lg p-3">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>🔒 Secure booking • No charge until confirmed</span>
              </div>
            </CardContent>
          </Card>

          {/* Affiliate Event Claim Card - Only show for unclaimed affiliate events */}
          {event.isAffiliateEvent && event.claimStatus === 'unclaimed' && user?.role === 'vendor' && (
            <Card variant="elevated" className="mt-6 border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-yellow-50">
              <CardHeader>
                <CardTitle className="flex items-center text-orange-800">
                  <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                  Claim This Event
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-700">
                  This is an unclaimed affiliate event. As a verified vendor, you can claim this event and manage it under your account.
                </p>
                <div className="bg-white rounded-lg p-3 space-y-2 text-sm">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Manage event details and settings</span>
                  </div>
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Track bookings and analytics</span>
                  </div>
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Become the official event provider</span>
                  </div>
                </div>
                <button
                  onClick={handleClaimEvent}
                  disabled={isClaimingEvent}
                  className="w-full py-3 bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {isClaimingEvent ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Claiming...
                    </span>
                  ) : (
                    '🎯 Claim This Event'
                  )}
                </button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Event Image Gallery */}
      <div className="mb-12">
        <div className="relative rounded-2xl overflow-hidden shadow-2xl group">
          <img
            src={event.image}
            alt={event.title}
            className="w-full h-96 md:h-[500px] object-cover transition-transform duration-700 group-hover:scale-105"
            onError={createImageErrorHandler(getEventImage(undefined, event.title, 800, 500))}
          />
          
          {/* Modern Gradient Overlays */}
          {/* Top gradient for action buttons */}
          <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-black/70 via-black/20 to-transparent pointer-events-none"></div>
          {/* Bottom gradient for stats */}
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none"></div>

          {/* Floating Action Buttons */}
          <div className="absolute top-6 right-6 flex space-x-3">
            <button
              onClick={handleShare}
              className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-all duration-300 hover:scale-110"
              title="Share event"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </button>
            <button
              onClick={handleToggleFavorite}
              className={`w-12 h-12 backdrop-blur-md rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 ${
                isFavorite
                  ? 'bg-red-500/80 text-white hover:bg-red-600/80'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
              title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <svg className="w-6 h-6" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </button>
          </div>
          
          {/* Image Stats Overlay */}
          <div className="absolute bottom-6 left-6 right-6">
            <div className="flex items-center justify-between text-white">
              <div className="flex items-center space-x-6">
                <div className="flex items-center bg-black/30 backdrop-blur-md rounded-full px-4 py-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <span className="font-medium">{event.viewsCount || 120} views</span>
                </div>
                
                <div className="flex items-center bg-black/30 backdrop-blur-md rounded-full px-4 py-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="font-medium">{event.location?.city}</span>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">Available Now</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
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
              {event.faqs && event.faqs.length > 0 && (
                <button
                  className={`flex-1 py-4 px-6 text-center font-medium ${activeTab === 'faqs' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-700'}`}
                  onClick={() => setActiveTab('faqs')}
                >
                  FAQs ({event.faqs.length})
                </button>
              )}
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
                      <span className="font-medium">{getDisplayDate()}</span>
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
                        <h3 className="font-medium">
                          {event.location?.city && event.location?.address
                            ? `${event.location.city}, ${event.location.address}`
                            : event.location?.city || event.location?.address || 'Location TBD'}
                        </h3>
                        <p className="text-gray-600 text-sm">{event.location?.address}</p>
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

              {/* FAQs Tab */}
              {activeTab === 'faqs' && event.faqs && event.faqs.length > 0 && (
                <div>
                  <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>
                  <div className="space-y-4">
                    {event.faqs.map((faq: any, index: number) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-5 border border-gray-200 hover:border-primary-200 transition-colors">
                        <div className="flex items-start">
                          <div className="flex-shrink-0 w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center mr-4">
                            <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg text-gray-900 mb-2">{faq.question}</h3>
                            <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Modern Sidebar */}
        <div className="space-y-6">
          
          
          {/* Action Buttons */}
          <Card variant="elevated" className="lg:hidden">
            <CardContent className="p-4">
              <div className="flex space-x-3">
                <button
                  onClick={handleShare}
                  className="flex-1 flex items-center justify-center py-3 px-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all transform hover:-translate-y-0.5 shadow-lg"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  Share
                </button>
                <button
                  onClick={handleToggleFavorite}
                  className={`flex-1 flex items-center justify-center py-3 px-4 text-white rounded-lg transition-all transform hover:-translate-y-0.5 shadow-lg ${
                    isFavorite
                      ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700'
                      : 'bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600'
                  }`}
                >
                  <svg className="w-5 h-5 mr-2" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  {isFavorite ? 'Saved' : 'Save'}
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Vendor Information Card */}
          <Card variant="elevated" hover>
            <CardHeader>
              <CardTitle className="flex items-center">
                <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-primary-600 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H9m0 0H5m0 0h2M7 7h3M7 10h3M7 13h3" />
                  </svg>
                </div>
                Event Organizer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center">
                <Avatar 
                  size="lg" 
                  fallback={`${event.vendorId?.firstName} ${event.vendorId?.lastName}`}
                  className="mr-4"
                />
                <div className="flex-1">
                  <div className="font-semibold text-lg text-gray-900">
                    {event.vendorId?.firstName} {event.vendorId?.lastName}
                  </div>
                  <div className="text-sm text-gray-600">{event.vendorId?.email}</div>
                  <div className="text-sm text-gray-600">{event.vendorId?.phone}</div>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-sm font-medium text-gray-700 mb-1">Professional Event Organizer</div>
                <div className="text-xs text-gray-600">Specializing in {event.category?.toLowerCase() || 'general'} events for children</div>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={handleContactVendor}
                  className="flex-1 py-2 px-3 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors"
                  title="Send email to vendor"
                >
                  Contact
                </button>
                <button
                  onClick={handleViewVendorProfile}
                  className="flex-1 py-2 px-3 border border-primary-200 text-primary-600 text-sm rounded-lg hover:bg-primary-50 transition-colors"
                  title="View vendor profile"
                >
                  View Profile
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Location Information Card */}
          <Card variant="elevated" hover>
            <CardHeader>
              <CardTitle className="flex items-center">
                <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                Event Location
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="font-semibold text-gray-900">{event.location?.address}</div>
                <div className="text-gray-600">{event.location?.city}</div>
                <div className="text-xs text-gray-500">
                  📍 {event.location?.coordinates?.lat}, {event.location?.coordinates?.lng}
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg h-32 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                  <div className="text-sm">Interactive Map</div>
                </div>
              </div>

              <div className="flex space-x-2">
                <button className="flex-1 py-2 px-3 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors">
                  Get Directions
                </button>
                <button className="flex-1 py-2 px-3 border border-green-200 text-green-600 text-sm rounded-lg hover:bg-green-50 transition-colors">
                  Share Location
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Event Metadata Card */}
          <Card variant="elevated">
            <CardHeader>
              <CardTitle className="flex items-center">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                Event Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Created</span>
                <span className="text-sm font-medium">{format(new Date(event.createdAt), 'MMM d, yyyy')}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Last Updated</span>
                <span className="text-sm font-medium">{format(new Date(event.updatedAt), 'MMM d, yyyy')}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Event Type</span>
                <Badge variant="secondary" size="sm">{event.type}</Badge>
              </div>
              {event.venueType && (
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Venue Type</span>
                  <Badge variant={event.venueType?.toLowerCase() as 'outdoor' | 'indoor'} size="sm">
                    {event.venueType}
                  </Badge>
                </div>
              )}
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-600">Status</span>
                <Badge variant="success" size="sm">✅ {event.status}</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
    </>
  );
};

export default EventDetailPage;