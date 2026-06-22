import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle,
  Share2,
  Heart,
  ChevronRight,
  Star,
  Info,
  Image as ImageIcon,
  Shield,
  BookOpen,
  Award,
  Zap,
  Globe,
  Tag,
  MessageCircle,
  X,
  Maximize2,
  ChevronLeft,
} from 'lucide-react';
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
import { SessionPicker } from '../components/ui/SessionPicker';
import { Session, formatTime as formatTimeFn } from '../utils/scheduleUtils';
import Badge from '../components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import Avatar from '../components/ui/Avatar';
import StatCard from '../components/ui/StatCard';
import { getEventImage, getVendorLogo, createImageErrorHandler } from '../utils/imageFallbacks';
import ImageCarousel from '../components/common/ImageCarousel';
import { API_BASE_URL } from '../config/api';
import UserReviewStatus from '../components/client/UserReviewStatus';
import reviewsAPI from '../services/api/reviewsAPI';
import { galleryAPI } from '../services/api/reviewLinkAPI';
import GalleryComponent from '../components/common/GalleryComponent';

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



// ─── Instructor Bio with read-more toggle ────────────────────────────────────
const InstructorBio: React.FC<{ bio: string }> = ({ bio }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="bg-gray-50 rounded-lg p-3 mt-1">
      <p className={`text-xs text-gray-600 italic leading-relaxed ${expanded ? '' : 'line-clamp-3'}`}>
        &ldquo;{bio}&rdquo;
      </p>
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="mt-1.5 text-xs font-medium text-primary-600 hover:text-primary-800 transition-colors"
      >
        {expanded ? 'Show less' : 'Read more'}
      </button>
    </div>
  );
};

const EventDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useAuthContext();
  const queryClient = useQueryClient();
  const [quantity, setQuantity] = useState(1);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [activeTab, setActiveTab] = useState('about'); // 'about', 'location', 'reviews', 'faqs'
  const [isClaimingEvent, setIsClaimingEvent] = useState(false);
  const [openSyllabusItems, setOpenSyllabusItems] = useState<Record<string, boolean>>({});
  // Controls whether the full description is shown when only shortDescription is in preview
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [selectedMemoryIndex, setSelectedMemoryIndex] = useState<number | null>(null);
  const [isAllMemoriesModalOpen, setIsAllMemoriesModalOpen] = useState(false);
  const [showAllEventGallery, setShowAllEventGallery] = useState(false);
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const { user: authUser } = useSelector((state: RootState) => state.auth);
  const hasValidUser = authUser && (authUser.email || authUser._id);

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
      ageRange: eventData.ageRange,
      grades: eventData.grades,
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
      teacher: eventData.teacherId && typeof eventData.teacherId === 'object' ? {
        id: eventData.teacherId.userId?._id || eventData.teacherId.userId || eventData.teacherId._id,
        name: (`${eventData.teacherId.userId?.firstName || ''} ${eventData.teacherId.userId?.lastName || ''}`).trim()
          || eventData.teacherId.fullName
          || (`${eventData.teacherId.firstName || ''} ${eventData.teacherId.lastName || ''}`).trim()
          || 'Instructor',
        email: eventData.teacherId.userId?.email || eventData.teacherId.email || '',
        photo: eventData.teacherId.userId?.avatar || eventData.teacherId.profileImage || eventData.teacherId.photo || '',
        bio: eventData.teacherId.bio || 'Experienced instructor.',
        specialization: eventData.teacherId.specialization || 'Education'
      } : null,
      pastEventMemories: eventData.pastEventMemories || []
    };
  }, [eventData, slug]);

  // Handle URL canonicalization (ID -> Slug)
  useEffect(() => {
    if (event?.slug && event.slug !== slug) {
      navigate(`/events/${event.slug}`, { replace: true });
    }
  }, [event?.slug, slug, navigate]);


  // Reviews — fetched with TanStack Query for caching & deduplication
  const reviewsEnabled = !!event?._id;
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

  const { data: galleryData } = useQuery({
    queryKey: ['event-gallery', event?._id],
    queryFn: async () => {
      const res = await galleryAPI.getByEvent(event!._id);
      return res.data?.data?.gallery || null;
    },
    enabled: !!event?._id,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    setShowAllEventGallery(false);
  }, [galleryData?._id]);

  const totalGalleryImages = galleryData?.images?.length || 0;
  const shouldCollapseGallery = totalGalleryImages > 7;
  const visibleGalleryImages = shouldCollapseGallery && !showAllEventGallery
    ? galleryData?.images?.slice(0, 7)
    : galleryData?.images;

  const usingMockData = !eventData && !isLoading;
  const error = queryError ? (queryError as any)?.response?.status === 404 ?
    'Event not found. This event may have been removed or the URL is incorrect.' :
    'Unable to load event details. Please check your internet connection and try again.' :
    null;

  // Derive booking values directly from the selected session (set by SessionPicker)
  const currentPrice = selectedSession?.price ?? event?.price ?? 0;
  const currentAvailableSeats = selectedSession?.availableSeats ?? event?.availableSpots ?? 0;
  const isUnlimited = !!(selectedSession?.isUnlimited ?? false);
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

  // Helper accessor (keep thin — SessionPicker owns session state now)
  const getCurrentAvailableSeats = () => currentAvailableSeats;

  /**
   * Compute the overall event date range for the meta card.
   * - No session selected → span across all schedules: "Jun 1 – Jun 30, 2026"
   * - Single-day event → "Jun 1, 2026"
   * - Session selected → show just that session: "Mon, Jun 18 • 9:00 AM – 11:00 AM"
   */
  const getEventDateRange = (): { display: string; subtitle: string } => {
    if (selectedSession) {
      const timePart = selectedSession.startTime && selectedSession.endTime
        ? ` • ${formatTimeFn(selectedSession.startTime)} \u2013 ${formatTimeFn(selectedSession.endTime)}`
        : '';
      return { display: `${selectedSession.displayDate}${timePart}`, subtitle: 'Selected Session' };
    }

    const schedules: any[] = event.dateSchedule;
    if (!schedules?.length) {
      return { display: format(new Date(event.date), 'MMM d, yyyy'), subtitle: 'Event Date' };
    }

    try {
      const starts = schedules
        .map((s: any) => new Date(s.startDate || s.date))
        .filter((d: Date) => !isNaN(d.getTime()));
      const ends = schedules
        .map((s: any) => new Date(s.endDate || s.startDate || s.date))
        .filter((d: Date) => !isNaN(d.getTime()));

      if (!starts.length) {
        return { display: format(new Date(event.date), 'MMM d, yyyy'), subtitle: 'Event Date' };
      }

      const minStart = new Date(Math.min(...starts.map((d: Date) => d.getTime())));
      const maxEnd = new Date(Math.max(...ends.map((d: Date) => d.getTime())));
      const sameDay = format(minStart, 'yyyy-MM-dd') === format(maxEnd, 'yyyy-MM-dd');

      if (sameDay) {
        return { display: format(minStart, 'MMM d, yyyy'), subtitle: 'Event Date' };
      }

      const sameYear = minStart.getFullYear() === maxEnd.getFullYear();
      const display = sameYear
        ? `${format(minStart, 'MMM d')} \u2013 ${format(maxEnd, 'MMM d, yyyy')}`
        : `${format(minStart, 'MMM d, yyyy')} \u2013 ${format(maxEnd, 'MMM d, yyyy')}`;

      return { display, subtitle: 'Date Range' };
    } catch {
      return { display: format(new Date(event.date), 'MMM d, yyyy'), subtitle: 'Event Date' };
    }
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
          const sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
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

    if (!isAuthenticated || !hasValidUser) {
      toast.error('Please log in to continue your booking');
      // Save their current URL path so the Login page can redirect them back right here
      navigate(`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`);
      return;
    }
    // Regular event booking flow
    if (!selectedSession) {
      toast.error('Please select a session for your booking');
      return;
    }

    if (!selectedSession.isUnlimited && quantity > selectedSession.availableSeats) {
      toast.error(`Only ${selectedSession.availableSeats} seats available for the selected session`);
      return;
    }

    if (!selectedSession.scheduleId) {
      toast.error('Schedule information is not available for the selected session');
      return;
    }

    // Reset booking flow and initialize with current event
    dispatch(resetBookingFlow());
    dispatch(setBookingEvent(event._id)); // Preserve canonical event id in booking state

    // Create initial participants based on quantity with validation
    if (quantity < 1 || (!selectedSession.isUnlimited && quantity > selectedSession.availableSeats)) {
      toast.error(`Invalid quantity. Please select between 1 and ${selectedSession.availableSeats} participants.`);
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

    const bookingDraft = {
      event: { ...event, _id: event._id, id: event._id },
      quantity,
      selectedDate: selectedSession.date.toISOString(),
      schedule: selectedSession,
      scheduleId: selectedSession.scheduleId,
      ...(selectedSession.timeSlotIndex !== undefined
        ? { timeSlotIndex: selectedSession.timeSlotIndex }
        : {}),
      sessionPrice: selectedSession.price,
      totalPrice: (selectedSession.price * quantity).toFixed(2),
      currency: event.currency || 'AED',
    };

    try {
      sessionStorage.setItem(`kidrove.bookingDraft:${event._id}`, JSON.stringify(bookingDraft));
      if (event.slug) {
        sessionStorage.setItem(`kidrove.bookingDraft:${event.slug}`, JSON.stringify(bookingDraft));
      }
    } catch (storageError) {
      console.warn('Unable to persist booking draft', storageError);
    }

    const bookingRouteId = event.slug || event._id;

    // Navigate to booking page using the human-readable slug when available
    navigate(`/booking/${bookingRouteId}`, {
      state: {
        ...bookingDraft,
        event
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

    const TEACHING_TYPES = ['Class', 'Course', 'Workshop', 'Bootcamp', 'Masterclass'];
    const isTeachingEvent = TEACHING_TYPES.includes(event.type);
    const requiredRole = isTeachingEvent ? 'teacher' : 'vendor';

    if (user.role !== requiredRole) {
      toast.error(
        isTeachingEvent
          ? 'You need a teacher account to claim this event.'
          : 'You need a vendor account to claim this event.'
      );
      navigate(isTeachingEvent ? '/teacher/register' : '/vendor/register');
      return;
    }

    if (!window.confirm(`Are you sure you want to claim this event? Once claimed, it will be associated with your ${requiredRole} account.`)) {
      return;
    }

    setIsClaimingEvent(true);
    try {
      if (event.isAffiliateEvent) {
        await affiliateEventAPI.claimEvent(event._id);
      } else {
        await eventsAPI.claimEvent(event._id);
      }

      toast.success('Event claimed successfully! Redirecting to your dashboard...');
      setTimeout(() => {
        navigate(isTeachingEvent ? '/teacher' : '/vendor');
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

  // Aggregate seat metrics across all schedules for "Class Insights"
  const hasUnlimited = (event.dateSchedule || []).some((s: any) =>
    s.unlimitedSeats || s.isUnlimited || s.availableSeats >= 999999 || s.totalSeats >= 999999
  );
  const totalSeats = hasUnlimited
    ? 0
    : (event.dateSchedule || []).reduce((sum: number, s: any) => sum + (s.totalSeats ?? s.availableSeats ?? 0), 0);
  const soldSeats = (event.dateSchedule || []).reduce((sum: number, s: any) => sum + (s.soldSeats ?? 0), 0);
  const firstDate = event.dateSchedule?.[0]?.date || event.dateSchedule?.[0]?.startDate;
  const totalAvailableEventSeats = hasUnlimited
    ? 0
    : (event.dateSchedule || []).reduce((sum: number, s: any) => sum + (s.availableSeats ?? 0), 0);

  const selectedScheduleForCapacity = selectedSession
    ? (event.dateSchedule || []).find((s: any) => String(s?._id) === String(selectedSession.scheduleId))
    : null;

  const bookingPanelTotalSeats = isUnlimited
    ? 999999
    : (selectedSession
      ? (selectedScheduleForCapacity?.totalSeats
        ?? (selectedSession.availableSeats + (selectedScheduleForCapacity?.soldSeats || 0) + (selectedScheduleForCapacity?.reservedSeats || 0)))
      : totalSeats);

  const bookingPanelAvailableSeats = isUnlimited
    ? 999999
    : (selectedSession ? selectedSession.availableSeats : totalAvailableEventSeats);
  const bookingIsUnlimited = isUnlimited || hasUnlimited || bookingPanelTotalSeats >= 999999;

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
              <Badge variant="secondary" className="text-xs px-2 py-0.5">{event.type}</Badge>
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
                        <span className="font-medium">{event.viewsCount || 0} views</span>
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


            {/* Event Meta Information */}

            <div className="border-t border-gray-100 pt-6 mb-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Date */}
                <div className="flex items-center text-gray-700 bg-gray-50 rounded-lg p-4 transition-colors hover:bg-primary-50/50">
                  <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center mr-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    {(() => {
                      const { display, subtitle } = getEventDateRange();
                      return (
                        <>
                          <div className="font-medium text-sm">{display}</div>
                          <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">{subtitle}</div>
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* Teaching Mode */}
                <div className="flex items-center text-gray-700 bg-gray-50 rounded-lg p-4 transition-colors hover:bg-primary-50/50">
                  <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center mr-3">
                    {event.venueType === 'Online' ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-sm">{event.venueType || 'Offline'}</div>
                    <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">Teaching Mode</div>
                  </div>
                </div>

                {/* Age */}
                <div className="flex items-center text-gray-700 bg-gray-50 rounded-lg p-4 transition-colors hover:bg-primary-50/50">
                  <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center mr-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-medium text-sm">
                      {Array.isArray(event.ageRange) && event.ageRange.length >= 2
                        ? `${Math.min(event.ageRange[0], event.ageRange[1])}-${Math.max(event.ageRange[0], event.ageRange[1])} years`
                        : (event.ageRange || 'All ages')}
                    </div>
                    <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">Age Group</div>
                  </div>
                </div>

                {/* Grades */}
                {event.grades && event.grades.length > 0 && (
                  <div className="flex items-center text-gray-700 bg-gray-50 rounded-lg p-4 transition-colors hover:bg-primary-50/50">
                    <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center mr-3">
                      <BookOpen className="h-5 w-5 text-primary-600" />
                    </div>
                    <div>
                      <div className="font-medium text-sm truncate max-w-[120px]" title={event.grades.join(', ')}>
                        {event.grades.join(', ')}
                      </div>
                      <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">Grades</div>
                    </div>
                  </div>
                )}

                {/* Subject */}
                <div className="flex items-center text-gray-700 bg-gray-50 rounded-lg p-4 transition-colors hover:bg-primary-50/50">
                  <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center mr-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-medium text-sm truncate max-w-[120px]">{event.subject || 'N/A'}</div>
                    <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">Subject</div>
                  </div>
                </div>
              </div>
            </div>

            {/* What you'll learn */}
            <div className="mb-8 p-6 bg-blue-50/30 rounded-2xl border border-blue-100/50">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <span className="w-1.5 h-6 bg-primary-500 rounded-full mr-3"></span>
                What you'll learn
              </h3>
              <p className="text-gray-600 text-lg leading-relaxed">
                {event.shortDescription || 'Learn valuable skills and gain hands-on experience in this interactive session.'}
              </p>
            </div>

            {/* Topics */}
            {event.tags && event.tags.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  Topics
                </h3>
                <div className="flex flex-wrap gap-2">
                  {event.tags.map((tag: string, index: number) => (
                    <span key={index} className="px-4 py-1.5 bg-white border border-gray-100 shadow-sm text-primary-700 text-sm font-medium rounded-full hover:bg-primary-50 hover:border-primary-200 transition-all cursor-pointer">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}




            {/* Class Insights */}
            <div className="mb-8">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Class Insights
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard
                  title="Views"
                  value={event.viewsCount || 0}
                  icon={
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  }
                  className="hover:shadow-lg transition-shadow border-none bg-gray-50 shadow-sm"
                />
                <StatCard
                  title="Seats"
                  value={
                    hasUnlimited || totalSeats >= 999999
                      ? 'Unlimited'
                      : totalSeats
                  }
                  icon={
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  }
                  className="hover:shadow-lg transition-shadow border-none bg-gray-50 shadow-sm"
                />
                <StatCard
                  title="Available"
                  value={
                    hasUnlimited || totalSeats >= 999999
                      ? 'Unlimited'
                      : totalAvailableEventSeats
                  }
                  icon={
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                  className="hover:shadow-lg transition-shadow border-none bg-gray-50 shadow-sm"
                />
              </div>
            </div>

            {/* Low availability warning */}
            {!isUnlimited && getCurrentAvailableSeats() <= 10 && selectedSession && (
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
                      {event.shortDescription && (
                        <p className="text-gray-600 text-base mb-4 leading-relaxed">{event.shortDescription}</p>
                      )}
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
                          <span className="font-medium text-gray-900">{getEventDateRange().display}</span>
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
                            <div className="font-medium text-gray-900">
                              {Array.isArray(event.ageRange) && event.ageRange.length >= 2
                                ? `${Math.min(event.ageRange[0], event.ageRange[1])}-${Math.max(event.ageRange[0], event.ageRange[1])} years`
                                : (event.ageRange || 'All ages')}
                            </div>
                          </div>
                          {event.grades && event.grades.length > 0 && (
                            <div>
                              <div className="text-sm text-gray-500 mb-1">Grades</div>
                              <div className="font-medium text-gray-900">
                                {event.grades.join(', ')}
                              </div>
                            </div>
                          )}
                          <div>
                            <div className="text-sm text-gray-500 mb-1">Capacity</div>
                            <div className="font-medium text-gray-900">
                              {(() => {
                                const capacity = event.dateSchedule?.[0]?.totalSeats || event.capacity || 0;
                                return capacity >= 999999 ? 'Unlimited' : `${capacity} participants`;
                              })()}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Location Tab */}
                  {activeTab === 'location' && (
                    <div>
                      <h2 className="text-2xl font-bold mb-4 text-blue-600">Event Location</h2>
                      {event.venueType === 'Online' ? (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-blue-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                          </svg>
                          <p className="text-blue-700 font-semibold text-lg">This is an online event</p>
                          <p className="text-blue-600 text-sm mt-1">Meeting details will be provided after booking.</p>
                        </div>
                      ) : (
                        <>
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
                        </>
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
                            width: bookingIsUnlimited
                              ? '100%'
                              : `${Math.min(100, Math.max(0, (bookingPanelAvailableSeats / Math.max(1, bookingPanelTotalSeats)) * 100))}%`
                          }}
                        >
                          <div className="absolute inset-0 bg-white bg-opacity-25 animate-pulse"></div>
                        </div>
                      </div>
                      <div className="flex justify-between text-sm text-gray-600">
                        <span className="font-medium">{bookingIsUnlimited ? 'Unlimited' : `${bookingPanelAvailableSeats} available`}</span>
                        <span>{bookingIsUnlimited ? 'No seat limit' : `${bookingPanelTotalSeats} total`}</span>
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
                    {/* Session Picker — replaces the old calendar + separate time-slot picker */}
                    <SessionPicker
                      dateSchedules={event.dateSchedule || []}
                      selectedSession={selectedSession}
                      onSessionSelect={setSelectedSession}
                      currency={event.currency || 'AED'}
                      timezone={event.timezone}
                      className="w-full"
                    />

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
                          onClick={() => setQuantity(isUnlimited ? quantity + 1 : Math.min(currentAvailableSeats, quantity + 1))}
                          disabled={!isUnlimited && quantity >= currentAvailableSeats}
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
                        disabled={!selectedSession}
                        className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 ${!selectedSession
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-gradient-to-r from-primary-500 to-primary-700 hover:from-primary-600 hover:to-primary-800 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-1 hover:scale-105'
                          }`}
                      >
                        {!selectedSession ? '📅 Select a Session to Book' : '🎫 Book Now'}
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

                  {event.teacher.bio && <InstructorBio bio={event.teacher.bio} />}

                  <div className="pt-2">
                    <Link
                      to={`/teachers/${event.teacher.id}`}
                      className="inline-flex py-2 px-4 bg-primary-50 hover:bg-primary-100 text-primary-600 font-medium text-sm rounded-lg transition-colors border border-primary-200"
                    >
                      View Full Profile
                    </Link>
                  </div>
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
                    src={event.vendorId?.logo || event.vendorId?.avatar}
                    fallback={event.vendorId?.businessName || `${event.vendorId?.firstName || ''} ${event.vendorId?.lastName || ''}`.trim() || 'Vendor'}
                    className="mr-4"
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-lg text-gray-900">
                      {event.vendorId?.businessName || `${event.vendorId?.firstName || ''} ${event.vendorId?.lastName || ''}`.trim()}
                    </div>
                    <div className="text-sm text-gray-600">{event.vendorId?.email}</div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-3">
                  {event.vendorId?.bio ? (
                    <div className="text-sm text-gray-700 whitespace-pre-wrap">{event.vendorId.bio}</div>
                  ) : (
                    <>
                      <div className="text-sm font-medium text-gray-700 mb-1">Professional Event Organizer</div>
                      <div className="text-xs text-gray-600">Specializing in education events for children</div>
                    </>
                  )}
                </div>

                <div className="flex">
                  <button
                    onClick={handleViewVendorProfile}
                    className="w-full py-2 px-3 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
                    title="View vendor profile"
                  >
                    View Profile
                  </button>
                </div>
              </CardContent>
            </Card>}

            {/* Location Information Card — hidden for online events */}
            {event.venueType !== 'Online' && <Card variant="elevated" hover className='mt-4 mb-4'>
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
            </Card>}

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

            {/* Claim Event Card - Only for affiliate events that haven't been claimed */}
            {event.isAffiliateEvent && event.claimStatus !== 'claimed' && (() => {
              const TEACHING_TYPES = ['Class', 'Course', 'Workshop', 'Bootcamp', 'Masterclass'];
              const claimRoleLabel = TEACHING_TYPES.includes(event.type) ? 'teacher' : 'vendor';
              return (
                <Card variant="elevated" className="mt-6 border-2 border-primary-200 bg-gradient-to-br from-blue-50 to-white">
                  <CardHeader>
                    <CardTitle className="flex items-center text-primary-800">
                      <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                      Is this your event?
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">Claim this event as its {claimRoleLabel}</p>
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
                      <strong>Disclaimer:</strong> Once claimed, it will be associated with your {claimRoleLabel} account. This event listing was automatically generated or imported and has not yet been verified by the organizer.
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
                        `Claim as ${claimRoleLabel}`
                      )}
                    </button>
                  </CardContent>
                </Card>
              );
            })()}

            {/* Affiliate Disclaimer */}
            {event.isAffiliateEvent && event.claimStatus !== 'claimed' && (
              <p className="mt-4 text-xs text-gray-400 leading-relaxed">
                Listings may include publicly available information for discovery purposes. Businesses may claim or request removal at any time.
              </p>
            )}
          </div>
        </div>

        {/* Event Gallery */}
        {galleryData && galleryData.images?.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-12 border border-gray-100">
            <div className="p-8 md:p-10">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">Event Gallery</h2>
              <GalleryComponent layout={galleryData.type} images={visibleGalleryImages || []} />

              {shouldCollapseGallery && !showAllEventGallery && (
                <div className="mt-8 flex flex-col items-center">
                  <button
                    type="button"
                    onClick={() => setShowAllEventGallery(true)}
                    className="inline-flex items-center gap-3 rounded-2xl bg-[#0b1630] px-8 py-3.5 text-white font-bold text-base hover:bg-[#0f1d3f] transition-colors shadow-lg hover:shadow-xl"
                  >
                    <ImageIcon className="w-6 h-6 text-green-400" />
                    <span>View all {totalGalleryImages} photos</span>
                  </button>
                  <p className="mt-4 text-gray-500 text-base text-center">
                    Click to open full gallery
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Full Gallery Modal */}
        {showAllEventGallery && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-300 p-4">
            {/* Modal Container */}
            <div className="relative w-full max-w-5xl flex flex-col bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh]">
              {/* Close button */}
              <button
                onClick={() => setShowAllEventGallery(false)}
                className="absolute top-6 right-6 text-gray-600 hover:text-gray-900 transition-colors z-[160] hover:bg-gray-100 p-2 rounded-full"
              >
                <X className="w-7 h-7" />
              </button>

              {/* Modal Header */}
              <div className="px-8 md:px-12 pt-8 pb-2">
                <h3 className="text-3xl md:text-4xl font-bold text-gray-900">
                  Event Gallery
                </h3>
                <p className="text-gray-500 text-lg mt-1">
                  {totalGalleryImages} Photos Captured
                </p>
              </div>

              {/* Modal Gallery Content */}
              <div className="overflow-y-auto flex-1 px-8 md:px-12 py-8">
                <GalleryComponent
                  layout={galleryData?.type || 'grid'}
                  images={galleryData?.images || []}
                />
              </div>

              {/* Modal Footer */}
              <div className="bg-gray-50 px-8 md:px-12 py-6 border-t border-gray-200 flex justify-center">
                <button
                  onClick={() => setShowAllEventGallery(false)}
                  className="px-8 py-3 bg-[#0b1630] hover:bg-[#0f1d3f] text-white font-bold rounded-full transition-colors text-base shadow-md hover:shadow-lg"
                >
                  Close Gallery
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Lightbox Modal */}
        {selectedMemoryIndex !== null && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm animate-in fade-in duration-300">
            <button
              onClick={() => setSelectedMemoryIndex(null)}
              className="absolute top-6 right-6 text-white/70 hover:text-white transition-colors z-[110]"
            >
              <X className="w-10 h-10" />
            </button>

            <button
              onClick={() => setSelectedMemoryIndex(prev => (prev! > 0 ? prev! - 1 : event.pastEventMemories.length - 1))}
              className="absolute left-4 md:left-10 text-white/50 hover:text-white transition-colors z-[110]"
            >
              <ChevronLeft className="w-12 h-12" />
            </button>

            <button
              onClick={() => setSelectedMemoryIndex(prev => (prev! < event.pastEventMemories.length - 1 ? prev! + 1 : 0))}
              className="absolute right-4 md:right-10 text-white/50 hover:text-white transition-colors z-[110]"
            >
              <ChevronRight className="w-12 h-12" />
            </button>

            <div className="max-w-5xl w-full px-4 flex flex-col items-center">
              <div className="relative w-full max-h-[70vh] flex justify-center mb-8">
                <img
                  src={event.pastEventMemories[selectedMemoryIndex].image}
                  alt="Past event memory"
                  className="max-w-full max-h-full object-contain rounded-lg shadow-2xl border border-white/10 shadow-primary/20"
                />
              </div>
              <div className="text-center max-w-2xl">
                <p className="text-white text-lg md:text-xl italic mb-4">
                  "{event.pastEventMemories[selectedMemoryIndex].caption}"
                </p>
                <div className="flex items-center justify-center space-x-3">
                  <div className="w-10 h-0.5 bg-primary"></div>
                  <span className="text-primary-400 text-sm font-bold uppercase tracking-[0.2em]">
                    {event.pastEventMemories[selectedMemoryIndex].participantName}
                  </span>
                  <div className="w-10 h-0.5 bg-primary"></div>
                </div>
                <p className="text-white/40 text-xs mt-8">
                  Image {selectedMemoryIndex + 1} of {event.pastEventMemories.length}
                </p>
              </div>
            </div>
          </div>
        )}



        {/* Reviews Section: What People Are Saying */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8 p-6 lg:p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">What People Are Saying</h2>

          <div className="flex flex-col lg:flex-row gap-10">
            {/* Left Column - Stats */}
            <div className="w-full lg:w-1/3 flex flex-col">
              <div className="flex items-center gap-3 mb-2">
                <svg className="w-8 h-8 text-primary fill-current" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span className="text-4xl font-bold text-gray-900">
                  {(() => {
                    const total = platformReviews.length + googleReviews.length;
                    if (total === 0) return "0.0";
                    const sum = [...platformReviews, ...googleReviews].reduce((acc, r: any) => acc + (r.rating || 0), 0);
                    return (sum / total).toFixed(1);
                  })()}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-6">
                {(() => {
                  const total = platformReviews.length + googleReviews.length;
                  return `${total.toLocaleString()} reviews`;
                })()}
              </p>

              <div className="space-y-2.5">
                {[5, 4, 3, 2, 1].map(star => {
                  const all = [...platformReviews, ...googleReviews];
                  const total = all.length;
                  let pct = 0;
                  if (total === 0) {
                    pct = 0;
                  } else {
                    const count = all.filter((r: any) => Math.round(r.rating || 0) === star).length;
                    pct = (count / total) * 100;
                  }
                  return (
                    <div key={star} className="flex items-center gap-3 text-sm">
                      <span className="w-14 text-gray-800 font-semibold">{star} star{star > 1 && 's'}</span>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }}></div>
                      </div>
                      <span className="w-12 text-right text-gray-600 text-[11px]">{pct.toFixed(2)}%</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column - Reviews & Form */}
            <div className="w-full lg:w-2/3 flex flex-col gap-5">
              {(() => {
                const all = [...platformReviews, ...googleReviews];
                const reviewsWithComments = all.filter((r: any) => (r.comment || r.text || '').trim().length > 0);
                if (reviewsWithComments.length === 0) {
                  return (
                    <div className="p-8 text-center border border-dashed border-gray-300 rounded-xl bg-gray-50">
                      <p className="text-sm text-gray-500">No public reviews yet. Be the first to leave one!</p>
                    </div>
                  );
                }
                return reviewsWithComments.map((review: any, idx: number) => {
                  const name = review.author_name || `${review.user?.firstName || ''} ${review.user?.lastName || ''}`.trim() || 'Student';
                  const initial = name.charAt(0).toUpperCase();
                  const avatar = review.profile_photo_url || review.user?.avatar;
                  const date = new Date(review.createdAt || review.time * 1000 || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                  return (
                    <div key={review._id || `r-${idx}`} className="p-5 rounded-xl border border-gray-200 bg-white flex flex-col sm:flex-row items-start gap-4">
                      <div className="flex items-center gap-4 sm:w-48 flex-shrink-0">
                        {avatar ? (
                          <img src={avatar} alt={name} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                            {initial}
                          </div>
                        )}
                        <strong className="text-sm font-semibold text-gray-900 line-clamp-1">{name}</strong>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 text-sm">
                          <svg className="w-4 h-4 text-primary fill-current" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          <span className="font-bold text-gray-900">{review.rating || 0}</span>
                          <span className="text-gray-500 text-xs pl-1">
                            • Reviewed on {date}
                          </span>
                        </div>
                        {(review.comment || review.text) && (
                          <p className="text-[14px] text-gray-700 leading-relaxed">
                            {review.comment || review.text}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}

              <div className="mt-4 pt-6 border-t border-gray-100">
                <UserReviewStatus
                  eventId={event?._id}
                  eventSlug={event?.slug}
                  onSubmitSuccess={handleReviewSubmitSuccess}
                />
              </div>
            </div>
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