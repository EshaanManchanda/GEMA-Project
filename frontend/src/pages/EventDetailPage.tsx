import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useAuthContext } from '@/hooks/useAuthContext';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import DOMPurify from 'isomorphic-dompurify';
import { useEventQuery } from '@/hooks/queries/useEventsQuery';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { EventDetailSkeleton } from '@/components/common/SkeletonLoaders';
import affiliateEventAPI from '../services/api/affiliateEventAPI';
import eventsAPI from '../services/api/eventsAPI';
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
import ImageCarousel from '../components/common/ImageCarousel';
import { API_BASE_URL } from '../config/api';
import ReviewSubmissionForm from '../components/client/ReviewSubmissionForm';
import reviewsAPI from '../services/api/reviewsAPI';

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
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useAuthContext();
  const queryClient = useQueryClient();
  const [quantity, setQuantity] = useState(1);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState('about'); // 'about', 'location', 'reviews', 'faqs'
  const [isClaimingEvent, setIsClaimingEvent] = useState(false);
  const [openSyllabusItems, setOpenSyllabusItems] = useState<Record<string, boolean>>({});

  const toggleSyllabusItem = (id: string) => {
    setOpenSyllabusItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };


  // TanStack Query replaces manual fetch + state management
  const { data: eventData, isLoading, error: queryError } = useEventQuery(slug!);

  // Transform event data (replaces useEffect fetch logic)
  const event = useMemo(() => {
    if (!eventData || !eventData._id) {
      // Fallback to mock data if no real data
      const mockEvent = mockEvents.find(e => e.id === slug);
      return mockEvent || null;
    }

    // Helper to get start date from schedule
    const getScheduleDate = (schedule: any) =>
      schedule?.date || schedule?.startDate || new Date().toISOString();

    // Helper to format time
    const getScheduleTime = (schedule: any) => {
      if (!schedule) return 'Time TBD';

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

      return 'Time TBD';
    };

    const firstSchedule = eventData.dateSchedule?.[0];

    const totalSeats = firstSchedule?.totalSeats ||
      (firstSchedule ? (firstSchedule.availableSeats + (firstSchedule.reservedSeats || 0) + (firstSchedule.soldSeats || 0)) : 50);

    return {
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
        startDate: schedule.startDate || schedule.date,
        endDate: schedule.endDate || schedule.date,
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
      faqs: eventData.faqs || [],
      reviews: [],
      // Educational fields
      syllabus: eventData.syllabus || [],
      subject: eventData.subject,
      topic: eventData.topic,
      introVideo: eventData.introVideo,
      teacher: eventData.teacherId ? {
        id: eventData.teacherId._id,
        name: `${eventData.teacherId.firstName} ${eventData.teacherId.lastName}`,
        email: eventData.teacherId.email,
        photo: eventData.teacherId.photo,
        bio: eventData.teacherId.bio || 'Experienced instructor.',
        specialization: eventData.teacherId.specialization || 'Education'
      } : null
    };
  }, [eventData, slug]);

  // Handle URL canonicalization (ID -> Slug)
  useEffect(() => {
    if (event?.slug && event.slug !== slug) {
      navigate(`/events/${event.slug}`, { replace: true });
    }
  }, [event?.slug, slug, navigate]);


  // Reviews — fetched with TanStack Query for caching & deduplication
  const reviewsEnabled = activeTab === 'reviews' && !!event?._id;
  const { data: platformReviewsData, isLoading: loadingReviews } = useQuery({
    queryKey: ['event-reviews', event?._id],
    queryFn: async () => {
      const response = await reviewsAPI.getEventReviews(event!._id);
      return response.data?.reviews || response.reviews || [];
    },
    enabled: reviewsEnabled,
    staleTime: 5 * 60 * 1000,
  });
  const { data: googleReviewsData } = useQuery({
    queryKey: ['event-google-reviews', event?._id],
    queryFn: async () => {
      const response = await reviewsAPI.getGoogleReviews(event!._id);
      const googleData = response.data || response;
      return googleData.hasGooglePlaceId ? (googleData.reviews || []) : [];
    },
    enabled: reviewsEnabled,
    staleTime: 10 * 60 * 1000,
  });
  const platformReviews: any[] = platformReviewsData || [];
  const googleReviews: any[] = googleReviewsData || [];

  const usingMockData = !eventData && !isLoading;
  const error = queryError ? (queryError as any)?.response?.status === 404 ?
    'Event not found. This event may have been removed or the URL is incorrect.' :
    'Unable to load event details. Please check your internet connection and try again.' :
    null;

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

  const isUnlimited = !!(currentSchedule?.unlimitedSeats || currentAvailableSeats >= 999999);
  const isFree = !!(event?.isFreeEvent || currentPrice === 0);

  // Favorites state
  const favorites = useSelector((state: RootState) => state.favorites.items);
  const isFavorite = favorites.some(fav => fav._id === event?._id);



  // Handle review submission success — invalidate cache so useQuery refetches
  const handleReviewSubmitSuccess = () => {
    if (event?._id) {
      queryClient.invalidateQueries({ queryKey: ['event-reviews', event._id] });
    }
  };

  if (isLoading) {
    return <EventDetailSkeleton />;
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
    if (!event || !event._id) {
      toast.error('Event information is not available');
      return;
    }

    // Handle external booking (Affiliate or Vendor-configured)
    if (event.externalBookingLink) {
      if (event.isAffiliateEvent) {
        try {
          // Generate session ID for tracking
          const sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

          // Track the click for affiliates
          await fetch(`${API_BASE_URL}/events/${event._id}/track-click`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ sessionId }),
          });
        } catch (error) {
          console.error('Error tracking affiliate click:', error);
        }
      }

      // Open external booking link in new tab
      window.open(event.externalBookingLink, '_blank', 'noopener,noreferrer');
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

    if (!isUnlimited && quantity > currentAvailableSeats) {
      toast.error(`Only ${currentAvailableSeats} seats available for the selected date`);
      return;
    }

    if (!currentSchedule || !currentSchedule._id) {
      toast.error('Schedule information is not available for the selected date');
      return;
    }

    // Reset booking flow and initialize with current event
    dispatch(resetBookingFlow());
    dispatch(setBookingEvent(event._id)); // Must be ObjectId

    // Create initial participants based on quantity with validation
    if (quantity < 1 || (!isUnlimited && quantity > currentAvailableSeats)) {
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
    navigate(`/booking/${event.slug}`, {
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

  // Handle claiming event (standard or affiliate)
  const handleClaimEvent = async () => {
    if (!event?._id) {
      toast.error('Event information is not available');
      return;
    }

    // Check if user is logged in
    if (!user) {
      toast.error('Please log in to claim this event');
      navigate('/login', { state: { from: `/events/${event.slug}` } });
      return;
    }

    // Check if user is a vendor
    if (user.role !== 'vendor') {
      if (window.confirm('You need a vendor account to claim events. Would you like to upgrade your account or create a new vendor account?')) {
        // Redirect to vendor registration or upgrade page
        // For now, redirecting to vendor registration
        navigate('/vendor/register');
      }
      return;
    }

    if (!window.confirm('Are you sure you want to claim this event? Once claimed, it will be associated with your vendor account.')) {
      return;
    }

    setIsClaimingEvent(true);
    try {
      if (event.isAffiliateEvent) {
        await affiliateEventAPI.claimEvent(event._id);
      } else {
        // Standard event claim
        // We need to import eventsAPI or use the imported one if available. 
        // Assuming eventsAPI is imported at the top. If not, I'll need to add it.
        // Based on file context, affiliateEventAPI is imported, but eventsAPI might not be?
        // Let's check imports. Just use affiliateEventAPI for now if it's the only one, 
        // OR better, import eventsAPI which I just updated. 
        // Since I can't check imports mid-edit easily, I will assume eventsAPI is available 
        // or I will add it to imports in a separate edit if needed.
        // Note: create-react-app might complain if I use undefined variable.
        // I will use `eventsAPI` and ensure it is imported.
        await eventsAPI.claimEvent(event._id);
      }

      toast.success('Event claimed successfully! Redirecting to your dashboard...');
      setTimeout(() => {
        navigate('/vendor');
      }, 2000);
    } catch (error: any) {
      console.error('Error claiming event:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to claim event';
      toast.error(errorMessage);
    } finally {
      setIsClaimingEvent(false);
    }
  };

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

    const { email, firstName, lastName } = event.vendorId;
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

  // Get Directions handler - opens Google Maps
  const handleGetDirections = () => {
    if (!event?.location) return;
    const { coordinates, address, city } = event.location as any;
    let url: string;
    if (coordinates?.lat && coordinates?.lng) {
      url = `https://www.google.com/maps/dir/?api=1&destination=${coordinates.lat},${coordinates.lng}`;
    } else {
      const query = encodeURIComponent(`${address || ''} ${city || ''}`.trim());
      url = `https://www.google.com/maps/search/?api=1&query=${query}`;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Share location handler
  const handleShareLocation = async () => {
    if (!event) return;
    const { address, city } = (event.location as any) || {};
    const locationText = [address, city].filter(Boolean).join(', ');
    const shareText = `${event.title}${locationText ? ' — ' + locationText : ''}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: event.title, text: shareText, url: window.location.href });
      } catch {
        // User cancelled
      }
    } else {
      try {
        await navigator.clipboard.writeText(`${shareText}\n${window.location.href}`);
        toast.success('Location copied to clipboard!');
      } catch {
        toast.error('Failed to copy location');
      }
    }
  };

  const breadcrumbs = event ? [
    { name: 'Home', url: '/' },
    { name: 'Events', url: '/events' },
    { name: event.title, url: `/events/${event.slug}` }
  ] : [];

  return (
    <>
      {event && <EventSEO event={event} breadcrumbs={breadcrumbs} />}

      {/* Inject Custom CSS (sanitized by backend) */}
      {event?.customCSS && (
        <style dangerouslySetInnerHTML={{ __html: event.customCSS }} />
      )}

      <div className="container mx-auto px-4 py-8 pb-20 lg:pb-8">
        {/* Back button */}
        <button
          onClick={() => navigate('/search')}
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

        {/* Claim Event Banner for Unclaimed Events - Enhanced with Disclaimer */}
        {/* Debug: ClaimStatus=${event.claimStatus}, VendorId=${event.vendorId} */}


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

            {/* Event Image Gallery with Carousel */}
            <div className="mb-12">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl group">
                {event.images && event.images.length > 0 ? (
                  <ImageCarousel
                    images={event.images}
                    alt={event.title}
                    onError={createImageErrorHandler(getEventImage(undefined, event.title, 800, 500))}
                    className="w-full h-96 md:h-[500px]"
                    autoplay={false}
                  />
                ) : (
                  <img
                    src={event.image}
                    alt={event.title}
                    className="w-full h-96 md:h-[500px] object-cover transition-transform duration-700 group-hover:scale-105"
                    onError={createImageErrorHandler(getEventImage(undefined, event.title, 800, 500))}
                  />
                )}

                {/* Modern Gradient Overlays */}
                {/* Top gradient for action buttons */}
                <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-black/70 via-black/20 to-transparent pointer-events-none"></div>
                {/* Bottom gradient for stats */}
                <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none"></div>

                {/* Floating Action Buttons */}
                <div className="absolute top-6 right-6 flex space-x-3">
                  <button
                    onClick={handleShare}
                    className="w-12 h-12 bg-gray-900/60 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-gray-900/70 transition-all duration-300 hover:scale-110"
                    title="Share event"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                  </button>
                  <button
                    onClick={handleToggleFavorite}
                    className={`w-12 h-12 backdrop-blur-md rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 ${isFavorite
                      ? 'bg-red-500/80 text-white hover:bg-red-600/80'
                      : 'bg-gray-900/60 text-white hover:bg-gray-900/70'
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
                      <div className="flex items-center bg-black/30 backdrop-blur-md rounded-full px-2 py-1 sm:px-4 sm:py-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <span className="font-medium">{event.viewsCount || 120} views</span>
                      </div>

                      <div className="flex items-center bg-black/30 backdrop-blur-md rounded-full px-2 py-1 sm:px-4 sm:py-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="font-medium">{event.location?.city}</span>
                      </div>
                    </div>

                    <div className="hidden sm:flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium">Available Now</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>


            <div
              className="event-content"
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(event.description || '', {
                  ADD_ATTR: ['style', 'class', 'id', 'data-*', 'width', 'height', 'colspan', 'rowspan', 'align', 'valign'],
                  ADD_TAGS: ['div', 'span', 'section', 'article', 'main', 'aside', 'header', 'footer', 'blockquote', 'iframe', 'svg', 'path', 'circle', 'rect', 'g', 'defs', 'clipPath', 'polygon', 'polyline', 'line', 'ellipse'],
                  ALLOWED_ATTR: ['style', 'class', 'href', 'src', 'alt', 'title', 'target', 'rel', 'width', 'height', 'id', 'frameborder', 'allow', 'allowfullscreen', 'data-*', 'colspan', 'rowspan', 'align', 'valign', 'viewBox', 'fill', 'stroke', 'stroke-width', 'd', 'cx', 'cy', 'r', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'points']
                })
              }}
            />

            {/* Event Meta Information */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
              <div className="flex items-center text-gray-700 bg-gray-50 rounded-lg p-4 transition-colors hover:bg-primary-50/50">
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

              <div className="flex items-center text-gray-700 bg-gray-50 rounded-lg p-4 transition-colors hover:bg-primary-50/50">
                <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center mr-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium">{getDisplayDate()}</div>
                  <div className="text-sm text-gray-500">Event Date</div>
                </div>
              </div>

              <div className="flex items-center text-gray-700 bg-gray-50 rounded-lg p-4 sm:col-span-2 xl:col-span-1 transition-colors hover:bg-primary-50/50">
                <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center mr-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium">{event.ageRange?.[0]} - {event.ageRange?.[1]} years</div>
                  <div className="text-sm text-gray-500">Age Range</div>
                </div>
              </div>

              {/* Subject & Topic (Educational Events) */}
              {event.subject && (
                <div className="flex items-center text-gray-700 bg-gray-50 rounded-lg p-4 transition-colors hover:bg-primary-50/50">
                  <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center mr-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-medium">{event.subject}</div>
                    <div className="text-sm text-gray-500">{event.topic || 'Subject'}</div>
                  </div>
                </div>
              )}
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
                value={event.dateSchedule?.[0]?.unlimitedSeats || (event.dateSchedule?.[0]?.totalSeats || 0) >= 999999 ? 'Unlimited' : (event.dateSchedule?.[0]?.totalSeats || 0)}
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
                value={isUnlimited ? 'Unlimited' : getCurrentAvailableSeats()}
                subtitle={isUnlimited ? 'No seat limit' : `${((getCurrentAvailableSeats() / (event.dateSchedule?.[0]?.totalSeats || 1)) * 100).toFixed(0)}% remaining`}
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
                className="hover:shadow-lg transition-shadow"
              />
            </div>

            {/* Low availability warning */}
            {!isUnlimited && getCurrentAvailableSeats() <= 10 && selectedDate && (
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
            {/* Main Layout */}
            <div className="">
              {/* Main Content */}
              {/* Tabs */}
              <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
                <div className="flex border-b overflow-x-auto">
                  <button
                    className={`flex-none py-3 px-3 sm:flex-1 sm:py-4 sm:px-6 text-center font-medium text-xs sm:text-sm whitespace-nowrap ${activeTab === 'about' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setActiveTab('about')}
                  >
                    About
                  </button>
                  <button
                    className={`flex-none py-3 px-3 sm:flex-1 sm:py-4 sm:px-6 text-center font-medium text-xs sm:text-sm whitespace-nowrap ${activeTab === 'location' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setActiveTab('location')}
                  >
                    Location
                  </button>
                  <button
                    className={`flex-none py-3 px-3 sm:flex-1 sm:py-4 sm:px-6 text-center font-medium text-xs sm:text-sm whitespace-nowrap ${activeTab === 'reviews' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setActiveTab('reviews')}
                  >
                    Reviews ({platformReviews.length + googleReviews.length})
                  </button>
                  {event.faqs && event.faqs.length > 0 && (
                    <button
                      className={`flex-none py-3 px-3 sm:flex-1 sm:py-4 sm:px-6 text-center font-medium text-xs sm:text-sm whitespace-nowrap ${activeTab === 'faqs' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-700'}`}
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

                      <h2 className="text-2xl font-bold mb-4 text-blue-600">About This Event</h2>
                      <div
                        className="event-content"
                        dangerouslySetInnerHTML={{
                          __html: DOMPurify.sanitize(event.description || '', {
                            ADD_ATTR: ['style', 'class', 'id', 'data-*', 'width', 'height', 'colspan', 'rowspan', 'align', 'valign'],
                            ADD_TAGS: ['iframe', 'svg', 'path', 'circle', 'rect', 'g', 'defs', 'clipPath', 'polygon', 'polyline', 'line', 'ellipse'],
                            ALLOWED_ATTR: ['style', 'class', 'href', 'src', 'alt', 'title', 'target', 'rel', 'width', 'height', 'id', 'frameborder', 'allow', 'allowfullscreen', 'data-*', 'colspan', 'rowspan', 'align', 'valign', 'viewBox', 'fill', 'stroke', 'stroke-width', 'd', 'cx', 'cy', 'r', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'points']
                          })
                        }}
                      />

                      <div className="bg-gray-50 p-4 rounded-lg mb-6 border border-gray-200">
                        <h3 className="text-lg font-semibold mb-3 text-blue-600">Event Schedule</h3>
                        <div className="flex items-center mb-2">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="font-medium text-gray-900">{getDisplayDate()}</span>
                        </div>
                        <p className="text-gray-600 text-sm">Doors open 30 minutes before the event starts. Please arrive on time.</p>
                      </div>

                      <h3 className="text-xl font-semibold mb-3 text-blue-600">Event Features</h3>
                      <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                        {event.features.map((feature: string, index: number) => (
                          <li key={index} className="flex items-center bg-gray-50 p-3 rounded-lg border border-gray-100">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span className='text-gray-900'>{feature}</span>
                          </li>
                        ))}
                      </ul>

                      {/* Syllabus Section (Educational Events) */}
                      {event.syllabus && event.syllabus.length > 0 && (
                        <div className="mb-8">
                          <h3 className="text-xl font-semibold mb-4 text-blue-600">Course Syllabus</h3>
                          <div className="space-y-3">
                            {event.syllabus.map((item: any, index: number) => (
                              <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                                <button
                                  onClick={() => toggleSyllabusItem(item._id || index.toString())}
                                  className="w-full flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                                  type="button"
                                >
                                  <div>
                                    <div className="font-medium text-gray-900">{item.title}</div>
                                    {item.description && <div className="text-sm text-gray-500 mt-1">{item.description}</div>}
                                  </div>
                                  <svg
                                    className={`w-5 h-5 text-gray-500 transform transition-transform ${openSyllabusItems[item._id || index.toString()] ? 'rotate-180' : ''}`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                </button>
                                {openSyllabusItems[item._id || index.toString()] && item.lessons && item.lessons.length > 0 && (
                                  <div className="p-4 bg-white border-t border-gray-200">
                                    <ul className="list-disc list-inside space-y-1 text-gray-700">
                                      {item.lessons.map((lesson: any, idx: number) => (
                                        <li key={idx}>
                                          {typeof lesson === 'string' ? lesson : lesson.title}
                                          {typeof lesson === 'object' && lesson.duration && (
                                            <span className="text-gray-400 text-xs ml-2">({lesson.duration})</span>
                                          )}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <h3 className="text-lg font-semibold mb-3 text-blue-600">Additional Information</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <div className="text-sm text-gray-500 mb-1">Age Range</div>
                            <div className="font-medium text-gray-900">{event.ageRange}</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-500 mb-1">Capacity</div>
                            <div className="font-medium text-gray-900">{(event.capacity || 0) >= 999999 ? 'Unlimited' : `${event.capacity} participants`}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Location Tab */}
                  {activeTab === 'location' && (
                    <div>
                      <h2 className="text-2xl font-bold mb-4 text-blue-600">Event Location</h2>
                      <div className="bg-gray-50 p-4 rounded-lg mb-6 border border-gray-200">
                        <div className="flex items-center mb-4">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <div>
                            <h3 className="font-medium text-gray-900">
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
                          <button onClick={handleGetDirections} className="text-primary hover:text-primary-dark flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                            </svg>
                            Get Directions
                          </button>
                          <button onClick={handleShareLocation} className="text-primary hover:text-primary-dark flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                            </svg>
                            Share Location
                          </button>
                        </div>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-gray-900">
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
                    <div className="space-y-6">
                      <h2 className="text-2xl font-bold text-gray-900">Reviews</h2>

                      {/* Review Submission Form */}
                      <ReviewSubmissionForm
                        eventId={event?._id}
                        onSubmitSuccess={handleReviewSubmitSuccess}
                      />

                      {/* Reviews List */}
                      {loadingReviews ? (
                        <div className="text-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600 mx-auto"></div>
                        </div>
                      ) : (platformReviews.length > 0 || googleReviews.length > 0) ? (
                        <div className="space-y-4">
                          {/* Platform reviews */}
                          {platformReviews.map((review: any) => (
                            <div
                              key={review._id}
                              className="bg-white border border-gray-200 rounded-lg p-6 hover:border-blue-200 hover:shadow-md transition-all duration-200"
                            >
                              <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                                  {review.user?.firstName?.charAt(0)?.toUpperCase() || 'U'}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-semibold text-gray-900">
                                    {review.user?.firstName} {review.user?.lastName}
                                  </div>
                                  {review.title && (
                                    <div className="font-medium text-gray-800 mt-0.5">{review.title}</div>
                                  )}
                                  <div className="flex items-center gap-2 mt-1">
                                    <div className="flex items-center gap-0.5">
                                      {[...Array(5)].map((_, i) => (
                                        <svg key={i} xmlns="http://www.w3.org/2000/svg"
                                          className={`h-4 w-4 ${i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                                          viewBox="0 0 20 20">
                                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                        </svg>
                                      ))}
                                    </div>
                                    <span className="text-sm text-gray-500">
                                      {new Date(review.createdAt).toLocaleDateString()}
                                    </span>
                                  </div>
                                  {review.comment && (
                                    <p className="text-gray-700 leading-relaxed mt-2 whitespace-pre-line">
                                      {review.comment}
                                    </p>
                                  )}
                                  {review.responses?.length > 0 && (
                                    <div className="mt-3 space-y-2">
                                      {review.responses.map((resp: any, i: number) => (
                                        <div key={i} className="pl-4 border-l-4 border-blue-200 bg-blue-50 p-3 rounded-r-lg">
                                          <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-semibold text-blue-800 bg-blue-200 px-2 py-0.5 rounded">
                                              {resp.isVendor ? 'Organizer Response' : 'Official Response'}
                                            </span>
                                            <span className="text-xs text-gray-500">
                                              {new Date(resp.respondedAt).toLocaleDateString()}
                                            </span>
                                          </div>
                                          <p className="text-sm text-gray-700">{resp.message}</p>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}

                          {/* Google reviews — same card style, no source label */}
                          {googleReviews.map((review: any, idx: number) => (
                            <div
                              key={`g-${idx}`}
                              className="bg-white border border-gray-200 rounded-lg p-6 hover:border-blue-200 hover:shadow-md transition-all duration-200"
                            >
                              <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                                  {review.profile_photo_url ? (
                                    <img src={review.profile_photo_url} alt={review.author_name} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-green-400 to-teal-500 flex items-center justify-center text-white font-bold">
                                      {review.author_name?.charAt(0)?.toUpperCase() || 'G'}
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-semibold text-gray-900">{review.author_name}</div>
                                  <div className="flex items-center gap-2 mt-1">
                                    <div className="flex items-center gap-0.5">
                                      {[...Array(5)].map((_, i) => (
                                        <svg key={i} xmlns="http://www.w3.org/2000/svg"
                                          className={`h-4 w-4 ${i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                                          viewBox="0 0 20 20">
                                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                        </svg>
                                      ))}
                                    </div>
                                    <span className="text-sm text-gray-500">{review.relative_time_description}</span>
                                  </div>
                                  {review.text && (
                                    <p className="text-gray-700 leading-relaxed mt-2">{review.text}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12 bg-gray-50 rounded-lg">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400 mb-4"
                            fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                          </svg>
                          <p className="text-gray-600 text-lg">No reviews yet</p>
                          <p className="text-gray-500 text-sm mt-2">Be the first to share your experience!</p>
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
                        className={`flex-1 flex items-center justify-center py-3 px-4 text-white rounded-lg transition-all transform hover:-translate-y-0.5 shadow-lg ${isFavorite
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


              </div>
            </div>
          </div>

          {/* Sticky Booking Panel - Right Side */}
          <div className="lg:col-span-1">
            {/* Intro Video Card */}
            {event.introVideo && (
              <Card variant="glass" className="shadow-lg overflow-hidden mb-4">
                <div className="p-4 pb-2">
                  <span className="text-sm text-gray-500 font-medium uppercase tracking-wider">
                    Intro Video
                  </span>
                </div>
                <div className="aspect-video bg-black">
                  {event.introVideo.includes('youtube.com') || event.introVideo.includes('youtu.be') ? (
                    <iframe
                      src={event.introVideo
                        .replace('watch?v=', 'embed/')
                        .replace('youtu.be/', 'youtube.com/embed/')}
                      title="Intro Video"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-full"
                    />
                  ) : event.introVideo.includes('vimeo.com') ? (
                    <iframe
                      src={event.introVideo.replace('vimeo.com/', 'player.vimeo.com/video/')}
                      title="Intro Video"
                      allow="autoplay; fullscreen; picture-in-picture"
                      allowFullScreen
                      className="w-full h-full"
                    />
                  ) : (
                    <video
                      src={event.introVideo}
                      controls
                      className="w-full h-full object-contain"
                      preload="metadata"
                    />
                  )}
                </div>
              </Card>
            )}

            <Card id="booking-panel" variant="glass" className="sticky top-8 shadow-2xl">
              <CardHeader>
                <CardTitle className="text-2xl flex items-center">
                  {event.externalBookingLink ? '🔗 Book This Event' : '🎫 Book Your Spot'}
                </CardTitle>
                {!event.externalBookingLink && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Starting from</span>
                      <div className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
                        {isFree ? <span className="text-green-600">Free</span> : `${event.currency || 'AED'} ${currentPrice}`}
                      </div>
                    </div>
                    {/* Enhanced Progress Bar */}
                    <div className="space-y-2">
                      <div className="w-full bg-gray-200 rounded-full h-3 relative overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-green-400 to-green-600 h-3 rounded-full transition-all duration-500 ease-out shadow-sm"
                          style={{
                            width: isUnlimited ? '100%' : `${((getCurrentAvailableSeats() / (event.dateSchedule?.[0]?.totalSeats || 1)) * 100)}%`
                          }}
                        >
                          <div className="absolute inset-0 bg-white bg-opacity-25 animate-pulse"></div>
                        </div>
                      </div>
                      <div className="flex justify-between text-sm text-gray-600">
                        <span className="font-medium">{isUnlimited ? 'Unlimited' : `${getCurrentAvailableSeats()} available`}</span>
                        <span>{isUnlimited ? 'No seat limit' : `${event.dateSchedule?.[0]?.totalSeats || 0} total`}</span>
                      </div>
                    </div>
                  </>
                )}
              </CardHeader>

              <CardContent className="space-y-6">
                {/* External Booking UI */}
                {event.externalBookingLink ? (
                  <div className="space-y-4">
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                      <div className="flex items-start space-x-3">
                        <svg className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <p className="text-sm font-medium text-amber-800">External Booking</p>
                          <p className="text-xs text-amber-700 mt-1">This event is managed by an external provider. You will be redirected to their website to complete your booking.</p>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={handleBookNow}
                      className="w-full py-4 rounded-xl font-bold text-lg bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105 flex items-center justify-center space-x-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      <span>Book on External Site</span>
                    </button>
                    <div className="flex items-center justify-center text-xs text-gray-500 space-x-2 bg-gray-50 rounded-lg p-3">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      <span>You will be redirected to an external website</span>
                    </div>
                  </div>
                ) : (
                  <>
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
                          onClick={() => setQuantity(isUnlimited ? quantity + 1 : Math.min(getCurrentAvailableSeats(), quantity + 1))}
                          disabled={!isUnlimited && quantity >= getCurrentAvailableSeats()}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Enhanced Pricing Breakdown */}
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-5 space-y-3 border border-gray-200">
                      {isFree ? (
                        <div className="flex justify-between font-bold text-lg items-center">
                          <span className="text-gray-900">Total</span>
                          <span className="text-green-600 text-2xl">Free</span>
                        </div>
                      ) : (
                        <>
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
                        </>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-3">
                      <button
                        onClick={handleBookNow}
                        disabled={!selectedDate || getCurrentAvailableSeats() === 0}
                        className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 ${!selectedDate || getCurrentAvailableSeats() === 0
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-gradient-to-r from-primary-500 to-primary-700 hover:from-primary-600 hover:to-primary-800 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-1 hover:scale-105'
                          }`}
                      >
                        {!selectedDate ? '📅 Select Date to Book' : getCurrentAvailableSeats() === 0 ? '❌ Sold Out' : '🎫 Book Now'}
                      </button>

                    </div>

                    {/* Enhanced Security Note */}
                    <div className="flex items-center justify-center text-xs text-gray-500 space-x-2 bg-gray-50 rounded-lg p-3">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      <span>🔒 Secure booking • No charge until confirmed</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
            {/* Instructor Card (Educational Events) */}
            {event.teacher && (
              <Card variant="elevated" className='mt-4 mb-4' hover>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <div className="w-8 h-8 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-lg flex items-center justify-center mr-3">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                    Instructor
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center">
                    <Avatar
                      size="lg"
                      src={event.teacher.photo}
                      fallback={event.teacher.name}
                      className="mr-4"
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-lg text-gray-900">
                        {event.teacher.name}
                      </div>
                      <div className="text-sm text-gray-600">{event.teacher.specialization}</div>
                      {event.teacher.email && <div className="text-xs text-gray-500 mt-1">{event.teacher.email}</div>}
                    </div>
                  </div>

                  {event.teacher.bio && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-xs text-gray-600 italic">"{event.teacher.bio}"</div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Vendor Information Card (hidden for teaching events – instructor card above replaces it) */}
            {!event.teacher && <Card variant="elevated" className='mt-4 mb-4' hover>
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
            </Card>}

            {/* Location Information Card */}
            <Card variant="elevated" hover className='mt-4 mb-4'>
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

                {(() => {
                  const loc = event.location as any;
                  const lat = loc?.coordinates?.lat;
                  const lng = loc?.coordinates?.lng;
                  const query = lat && lng
                    ? `${lat},${lng}`
                    : encodeURIComponent(`${loc?.address || ''} ${loc?.city || ''}`.trim());
                  const src = `https://maps.google.com/maps?q=${query}&output=embed&z=15`;
                  return (
                    <div className="rounded-lg overflow-hidden h-48">
                      <iframe
                        title="Event Location Map"
                        src={src}
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        allowFullScreen
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                      />
                    </div>
                  );
                })()}

                <div className="flex space-x-2">
                  <button onClick={handleGetDirections} className="flex-1 py-2 px-3 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors">
                    Get Directions
                  </button>
                  <button onClick={handleShareLocation} className="flex-1 py-2 px-3 border border-green-200 text-green-600 text-sm rounded-lg hover:bg-green-50 transition-colors">
                    Share Location
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Event Metadata Card */}
            <Card variant="elevated" className='mt-4 mb-4'>
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
                <div className="flex justify-between items-center py-2 border-b border-gray-100 text-gray-900">
                  <span className="text-sm text-gray-600">Created</span>
                  <span className="text-sm font-medium">{format(new Date(event.createdAt), 'MMM d, yyyy')}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Last Updated</span>
                  <span className="text-sm font-medium text-gray-900">{format(new Date(event.updatedAt), 'MMM d, yyyy')}</span>
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

            {/* Claim Event Card - Visible for all unclaimed events */}
            {event.claimStatus !== 'claimed' && (
              <Card variant="elevated" className="mt-6 border-2 border-primary-200 bg-gradient-to-br from-blue-50 to-white">
                <CardHeader>
                  <CardTitle className="flex items-center text-primary-800">
                    <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                    Is this your event?
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-white/50 rounded-lg p-3 space-y-2 text-sm border border-blue-100">
                    <p className="font-medium text-gray-900">
                      Claim this event to:
                    </p>
                    <div className="flex items-start">
                      <svg className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Update event details and specifications</span>
                    </div>
                    <div className="flex items-start">
                      <svg className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Access booking analytics</span>
                    </div>
                    <div className="flex items-start">
                      <svg className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Manage tickets and pricing</span>
                    </div>
                  </div>

                  <div className="bg-yellow-50 p-3 rounded text-xs text-yellow-800 border border-yellow-200">
                    <strong>Disclaimer:</strong> This event listing was automatically generated or imported and has not yet been verified by the organizer. Information such as dates, times, and location may be subject to change.
                  </div>

                  <button
                    onClick={handleClaimEvent}
                    disabled={isClaimingEvent}
                    className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {isClaimingEvent ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing...
                      </span>
                    ) : (
                      'Claim This Event'
                    )}
                  </button>
                </CardContent>
              </Card>
            )}

            {/* Affiliate Disclaimer */}
            {event.isAffiliateEvent && event.claimStatus !== 'claimed' && (
              <p className="mt-4 text-xs text-gray-400 leading-relaxed">
                Listings may include publicly available information for discovery purposes. Businesses may claim or request removal at any time.
              </p>
            )}
          </div>
        </div>




        {/* Sticky bottom CTA bar — mobile only */}
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 p-3 flex items-center justify-between lg:hidden shadow-2xl" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}>
          <div>
            <div className="text-xs text-gray-500">Starting from</div>
            <div className="text-lg font-bold text-primary">
              {isFree ? 'Free' : `${event?.currency || 'AED'} ${currentPrice}`}
            </div>
          </div>
          <button
            onClick={() => document.getElementById('booking-panel')?.scrollIntoView({ behavior: 'smooth' })}
            className="bg-primary text-white px-6 py-3 rounded-xl font-bold text-sm"
          >
            Book Now →
          </button>
        </div>
      </div >
    </>
  );
};

export default EventDetailPage;