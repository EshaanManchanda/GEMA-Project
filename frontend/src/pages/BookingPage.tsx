import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';

import { CheckCircle, Clock, CreditCard, Users, AlertCircle, ChevronLeft } from 'lucide-react';

import { AppDispatch } from '../store';
import {
  setBookingEvent,
  setBookingSchedule,
  setBookingStep,
  setCurrentBooking,
  setBookingParticipants,
  resetBookingFlow,
  selectBookingFlow,
  selectBookingStep,
  selectIsCreatingBooking,
  selectBookingCreateError,
  selectCheckout,
} from '../store/slices/bookingsSlice';

import eventsAPI from '../services/api/eventsAPI';
import bookingAPI from '../services/api/bookingAPI';
import { Event } from '../types/event';
import { useErrorHandler } from '../utils/errorHandler';
import { logger } from '../utils/logger';
import { ComponentErrorBoundary } from '../components/common/ErrorBoundary';
import { calculatePricingWithDiscount } from '../utils/couponUtils';
import { getCurrentPageUrl } from '../utils/urlHelper';
import SEO from '../components/common/SEO';

import Button from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
// Import booking components directly to prevent loading issues
import BookingSteps from '../components/booking/BookingSteps';
import BookingDetails from '../components/booking/BookingDetails';
import ParticipantForm from '../components/booking/ParticipantForm';
import PaymentForm from '../components/booking/PaymentForm';
import BookingConfirmation from '../components/booking/BookingConfirmation';

// Fallback components in case of import errors
const BookingStepsFallback = () => <div className="text-center p-4">Loading booking steps...</div>;
const BookingDetailsFallback = ({ onNext }: any) => (
  <Card>
    <CardContent className="p-8 text-center">
      <h3 className="text-lg font-semibold mb-4">Booking Details</h3>
      <p className="text-gray-600 mb-6">Event booking details will appear here.</p>
      <Button onClick={onNext}>Continue</Button>
    </CardContent>
  </Card>
);
const ParticipantFormFallback = ({ onNext, onPrev }: any) => (
  <Card>
    <CardContent className="p-8 text-center">
      <h3 className="text-lg font-semibold mb-4">Participant Information</h3>
      <p className="text-gray-600 mb-6">Participant form will appear here.</p>
      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrev}>Back</Button>
        <Button onClick={onNext}>Continue</Button>
      </div>
    </CardContent>
  </Card>
);
const PaymentFormFallback = ({ onNext, onPrev }: any) => (
  <Card>
    <CardContent className="p-8 text-center">
      <h3 className="text-lg font-semibold mb-4">Payment</h3>
      <p className="text-gray-600 mb-6">Payment form will appear here.</p>
      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrev}>Back</Button>
        <Button onClick={onNext}>Complete Booking</Button>
      </div>
    </CardContent>
  </Card>
);
const BookingConfirmationFallback = ({ onComplete }: any) => (
  <Card>
    <CardContent className="p-8 text-center">
      <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
      <h3 className="text-lg font-semibold mb-4">Booking Confirmed!</h3>
      <p className="text-gray-600 mb-6">Your booking has been confirmed.</p>
      <Button onClick={onComplete}>View Bookings</Button>
    </CardContent>
  </Card>
);

// Stripe payment is handled by StripePaymentElement component
// No need for direct Stripe hooks in BookingPage
const BookingPage: React.FC = () => {
  const renderCount = useRef(0);
  renderCount.current++;

  const { eventId } = useParams<{ eventId?: string }>();
  const { id: legacyId } = useParams<{ id?: string }>();

  // Handle both new and legacy route params with validation
  const actualEventId = eventId || legacyId;

  logger.debug('BookingPage render cycle', {
    renderCount: renderCount.current,
    eventId,
    legacyId,
    actualEventId,
    pathname: window.location.pathname
  });

  // Validate event ID format (allow both MongoDB ObjectId and slugs)
  const isValidEventId = actualEventId && actualEventId.length > 2;

  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { handleError } = useErrorHandler();

  // Redux state with error handling
  const [reduxError, setReduxError] = useState<string | null>(null);

  // Additional validation for booking readiness
  const isBookingReady = isValidEventId && !reduxError;

  // Always call hooks unconditionally (Rules of Hooks)
  const bookingFlow = useSelector(selectBookingFlow);
  const currentStep = useSelector(selectBookingStep);
  const isCreating = useSelector(selectIsCreatingBooking);
  const createError = useSelector(selectBookingCreateError);
  const checkout = useSelector(selectCheckout);

  // Handle Redux state validation in useEffect instead of try-catch around hooks
  useEffect(() => {
    try {
      // Validate Redux state structure
      if (bookingFlow && typeof bookingFlow === 'object') {
        logger.debug('Redux state accessed successfully', {
          eventId: actualEventId,
          currentStep,
          participantCount: bookingFlow.participants?.length || 0,
          hasBookingError: !!createError,
          isProcessing: isCreating || checkout?.isProcessing,
          bookingFlowStep: bookingFlow.step,
          hasParticipants: bookingFlow.participants?.length > 0
        });
        setReduxError(null);
      } else {
        throw new Error('Invalid booking flow state');
      }
    } catch (err) {
      logger.error('Redux state validation error', {
        eventId: actualEventId,
        error: err,
        bookingFlowType: typeof bookingFlow,
        stack: err instanceof Error ? err.stack : undefined
      });
      setReduxError('Failed to access booking state. Please refresh the page.');
    }
  }, [bookingFlow, currentStep, isCreating, createError, checkout, actualEventId]);

  // Local state
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookingResponse, setBookingResponse] = useState<any>(null);
  const [isProcessingBooking, setIsProcessingBooking] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('Processing your booking...');

  // Loading timeout protection - moved outside conditional block to fix hooks violation
  useEffect(() => {
    if (!loading) return; // Early return inside effect, not around hook

    const loadingTimeout = setTimeout(() => {
      if (loading) {
        logger.error('Loading timeout reached, forcing state update', {
          eventId: actualEventId,
          hasEvent: !!event,
          error
        });
        setLoading(false);
        if (!event && !error) {
          setError('Loading timeout - please try again');
        }
      }
    }, 15000); // 15 second timeout

    return () => clearTimeout(loadingTimeout);
  }, [loading, actualEventId, event, error]);

  // Initialization guard to prevent duplicate API calls in StrictMode
  const initializationRef = useRef<{ [key: string]: boolean }>({});
  const isInitialized = useRef(false);
  // Prevent concurrent booking submissions (double-click, rapid retry)
  const isBookingInProgress = useRef(false);

  // Get initial data from route state (from EventDetailPage)
  const routeState = location.state as {
    event?: Event;
    quantity?: number;
    selectedDate?: string;
    schedule?: any;
    scheduleId?: string;
    totalPrice?: string;
    currency?: string;
    isTeachingEvent?: boolean;
  } | null;

  const readBookingDraft = (key: string) => {
    try {
      const storedDraft = sessionStorage.getItem(`kidrove.bookingDraft:${key}`);
      return storedDraft ? JSON.parse(storedDraft) : null;
    } catch (storageError) {
      logger.warn('Failed to read booking draft from session storage', {
        key,
        error: storageError,
      });
      return null;
    }
  };

  useEffect(() => {
    // Prevent duplicate initialization (especially in React StrictMode)
    const initKey = `${actualEventId}-${location.pathname}`;
    if (initializationRef.current[initKey] || isInitialized.current) {
      logger.debug('Skipping duplicate initialization', {
        eventId: actualEventId,
        initKey,
        isInitialized: isInitialized.current
      });
      return;
    }

    const initializeBooking = async () => {
      const sessionId = `booking-${Date.now()}`;
      initializationRef.current[initKey] = true;
      isInitialized.current = true;

      logger.info('Initializing booking page', {
        sessionId,
        actualEventId,
        isValidEventId,
        hasRouteState: !!routeState,
        routeEventId: routeState?.event?._id,
        component: 'BookingPage',
        initKey
      });

      // Early validation checks
      if (!actualEventId) {
        logger.error('Missing event ID on booking page', { sessionId, url: getCurrentPageUrl() });
        navigate('/events');
        toast.error('Event ID is required for booking');
        return;
      }

      if (!isValidEventId) {
        logger.error('Invalid event ID format', {
          sessionId,
          actualEventId,
          format: 'Expected 24-character hexadecimal MongoDB ObjectId'
        });
        navigate('/events');
        toast.error('Invalid event identifier. Please select a valid event.');
        return;
      }

      if (!isBookingReady) {
        logger.error('Booking system not ready', {
          sessionId,
          actualEventId,
          hasReduxError: !!reduxError
        });
        toast.error('Booking system is not ready. Please try again.');
        return;
      }

      try {
        setLoading(true);
        logger.info('Starting event data loading', { sessionId, actualEventId });

        // Initialize booking flow first
        dispatch(resetBookingFlow());

        const storedBookingDraft = readBookingDraft(actualEventId);
        if (storedBookingDraft?.event) {
          logger.info('Restoring booking draft from session storage', {
            sessionId,
            actualEventId,
            hasScheduleId: !!storedBookingDraft.scheduleId,
            quantity: storedBookingDraft.quantity,
          });

          const draftEvent = storedBookingDraft.event;
          const bookingEventId = draftEvent._id || draftEvent.id || actualEventId;
          dispatch(setBookingEvent(bookingEventId));

          if (storedBookingDraft.scheduleId) {
            dispatch(setBookingSchedule(storedBookingDraft.scheduleId));
          }

          if (storedBookingDraft.quantity && storedBookingDraft.quantity > 0) {
            const draftParticipants = Array.from(
              { length: storedBookingDraft.quantity },
              (_, index) => ({
                id: `participant-${index + 1}`,
                name: '',
                email: '',
                phone: '',
                age: undefined,
                gender: undefined,
                emergencyContact: undefined,
                specialRequirements: '',
                dietaryRestrictions: [],
              }),
            );
            dispatch(setBookingParticipants(draftParticipants));
          }

          setEvent(draftEvent);
          setError(null);
          setLoading(false);
          return;
        }

        // Prefer the actual _id from route state over URL slug
        const bookingEventId = routeState?.event?._id || actualEventId;
        dispatch(setBookingEvent(bookingEventId));

        // Set schedule ID if provided in route state
        if (routeState?.scheduleId) {
          logger.info('Setting schedule ID from route state', {
            scheduleId: routeState.scheduleId,
            actualEventId
          });
          dispatch(setBookingSchedule(routeState.scheduleId));
        }

        // If we have event data from route state, use it
        // Match by _id or slug (URL param may be a slug)
        const routeEvent = routeState?.event;
        const routeEventMatches = routeEvent && (
          routeEvent._id === actualEventId ||
          (routeEvent as any).slug === actualEventId
        );

        if (routeEvent && routeEventMatches) {
          logger.info('Using event data from route state', {
            sessionId,
            eventId: routeEvent._id,
            eventTitle: routeEvent.title,
            isTeachingEvent: !!routeState?.isTeachingEvent
          });
          setEvent(routeEvent);
        } else if (routeState?.isTeachingEvent) {
          // Teaching event not in route state — fetch via teaching API
          logger.info('Fetching teaching event from API', { sessionId, actualEventId });
          const teachingEventAPI = (await import('../services/api/teachingEventAPI')).default;
          const response = await teachingEventAPI.getById(actualEventId);
          const te = response.teachingEvent;
          setEvent({ ...te, _id: te._id, id: te._id } as any);
        } else {
          // Try fetching as regular event first, then teaching event as fallback
          logger.info('Fetching event data from API (trying both types)', { sessionId, actualEventId });

          try {
            const eventData = await eventsAPI.getEventById(actualEventId);
            logger.info('Regular event successfully fetched', {
              sessionId,
              eventId: eventData._id,
              eventTitle: eventData.title,
              eventPrice: eventData.price,
              eventDates: eventData.dateSchedule?.length
            });
            setEvent(eventData);
          } catch (regularEventError: any) {
            // If regular event not found, try slug lookup before falling back to teaching events.
            logger.info('Regular event lookup failed, trying slug lookup', {
              sessionId,
              actualEventId,
              error: regularEventError.response?.status
            });

            try {
              const slugEventData = await eventsAPI.getEventBySlug(actualEventId);
              logger.info('Event successfully fetched by slug', {
                sessionId,
                eventId: slugEventData._id,
                eventTitle: slugEventData.title,
                eventSlug: slugEventData.slug
              });
              setEvent(slugEventData);
            } catch (slugEventError: any) {
              // If slug lookup also fails, try teaching event
              logger.info('Slug event not found, trying teaching event', {
                sessionId,
                actualEventId,
                error: slugEventError.response?.status
              });

              try {
              const teachingEventAPI = (await import('../services/api/teachingEventAPI')).default;
              const response = await teachingEventAPI.getById(actualEventId);
              const te = response.teachingEvent;
              logger.info('Teaching event successfully fetched', {
                sessionId,
                eventId: te._id,
                eventTitle: te.title
              });
              setEvent({ ...te, _id: te._id, id: te._id } as any);
              } catch (teachingEventError: any) {
                // Last fallback: search by the route text and try to match an event by slug or title.
                try {
                  const fallbackQuery = actualEventId.replace(/-/g, ' ');
                  const searchResponse = await eventsAPI.getAllEvents({
                    search: fallbackQuery,
                    limit: 20,
                  });
                  const fallbackEvents = Array.isArray((searchResponse as any)?.events)
                    ? (searchResponse as any).events
                    : Array.isArray((searchResponse as any)?.data?.events)
                      ? (searchResponse as any).data.events
                      : [];

                  const normalizedTarget = actualEventId.toLowerCase();
                  const matchedEvent = fallbackEvents.find((candidate: any) => {
                    const candidateSlug = String(candidate?.slug || '').toLowerCase();
                    const candidateId = String(candidate?._id || candidate?.id || '').toLowerCase();
                    const candidateTitle = String(candidate?.title || '').toLowerCase();
                    return (
                      candidateSlug === normalizedTarget ||
                      candidateId === normalizedTarget ||
                      candidateTitle === normalizedTarget ||
                      candidateTitle.replace(/\s+/g, '-') === normalizedTarget
                    );
                  });

                  if (matchedEvent) {
                    logger.info('Event resolved from search fallback', {
                      sessionId,
                      eventId: matchedEvent._id,
                      eventTitle: matchedEvent.title,
                      eventSlug: matchedEvent.slug
                    });
                    setEvent(matchedEvent);
                  } else {
                    // Neither worked, throw the original error
                    logger.error('Failed to fetch regular, slug, teaching, and search fallback event', {
                      sessionId,
                      actualEventId,
                      regularError: regularEventError.response?.status,
                      slugError: slugEventError.response?.status,
                      teachingError: teachingEventError.response?.status
                    });
                    throw regularEventError; // Throw original error for outer catch
                  }
                } catch (searchFallbackError) {
                  logger.error('Search fallback failed for booking event lookup', {
                    sessionId,
                    actualEventId,
                    error: searchFallbackError
                  });
                  throw regularEventError;
                }
              }
            }
          }
        }

        // Always fetch fresh registrationConfig and merge into event.
        // The event data (especially from route state or cache) may be missing or stale
        // registrationConfig, which would cause dynamic fields to not show on the booking page.
        try {
          const registrationAPI = (await import('../services/api/registrationAPI')).default;
          const eventIdForConfig = routeEvent?._id || actualEventId;
          const configResponse = await registrationAPI.getConfig(eventIdForConfig);
          if (configResponse?.data?.registrationConfig) {
            setEvent(prev => prev ? {
              ...prev,
              registrationConfig: configResponse.data.registrationConfig
            } : prev);
            logger.info('Registration config merged into event', {
              sessionId,
              eventIdForConfig,
              enabled: configResponse.data.registrationConfig.enabled,
              fieldsCount: configResponse.data.registrationConfig.fields?.length || 0
            });
          }
        } catch (configError: any) {
          // Not a fatal error — event may simply not have registration enabled
          logger.debug('No registration config for this event (or not enabled)', {
            sessionId,
            actualEventId,
            status: configError?.response?.status
          });
        }

        setError(null);
        logger.info('Booking initialization completed successfully', { sessionId, actualEventId });
      } catch (err) {
        logger.error('Failed to initialize booking', {
          sessionId,
          actualEventId,
          error: err,
          stack: err instanceof Error ? err.stack : undefined
        });
        const apiError = handleError(err, {
          component: 'BookingPage',
          action: 'initializeBooking',
          eventId: actualEventId
        });
        setError(apiError.message);
        toast.error('Failed to load event details');
      } finally {
        setLoading(false);
      }
    };

    // Only initialize if we have a valid event ID and booking is ready
    if (actualEventId && isValidEventId && isBookingReady) {
      initializeBooking();
    }

    // Cleanup on unmount
    return () => {
      if (currentStep === 'details') {
        dispatch(resetBookingFlow());
      }
    };
  }, [actualEventId]);  // Simplified dependencies - only re-run when eventId changes

  // For free events, skip the payment step.
  // Treat as free if the explicit flag is set OR if event price is 0 (prevents Stripe 0-amount error).
  const isFreeEvent = !!(event as any)?.isFreeEvent || event?.price === 0;
  const bookingSteps = isFreeEvent
    ? (['details', 'participants', 'confirmation'] as const)
    : (['details', 'participants', 'payment', 'confirmation'] as const);

  // Handle step navigation
  const handleNextStep = () => {
    const steps = bookingSteps;
    const currentIndex = steps.indexOf(currentStep as any);
    if (currentIndex < steps.length - 1) {
      const nextStep = steps[currentIndex + 1];
      logger.info('Navigating to next booking step', {
        eventId: actualEventId,
        currentStep,
        nextStep,
        participantCount: bookingFlow.participants.length
      });
      dispatch(setBookingStep(nextStep));
    }
  };

  const handlePrevStep = () => {
    const steps = bookingSteps;
    const currentIndex = steps.indexOf(currentStep as any);
    if (currentIndex > 0) {
      dispatch(setBookingStep(steps[currentIndex - 1]));
    }
  };

  const handleStepClick = (step: typeof currentStep) => {
    logger.info('Manual step navigation clicked', {
      eventId: actualEventId,
      fromStep: currentStep,
      toStep: step,
      isStepComplete: isStepComplete(step)
    });
    dispatch(setBookingStep(step));
  };

  // Handle booking completion with new API
  const handleCompleteBooking = async () => {
    // Prevent concurrent submissions (double-click, rapid retry)
    if (isBookingInProgress.current) {
      logger.warn('Booking already in progress, ignoring duplicate call');
      return;
    }
    isBookingInProgress.current = true;

    // Validate required data
    if (!event || !actualEventId) {
      logger.error('Cannot complete booking - missing required data', {
        hasEvent: !!event,
        bookingFlowEventId: bookingFlow.eventId,
        actualEventId,
        participantCount: bookingFlow.participants.length
      });
      toast.error('Event information is missing. Please refresh and try again.');
      isBookingInProgress.current = false;
      return;
    }

    // Ensure booking flow is properly initialized
    if (!bookingFlow.eventId) {
      logger.warn('Booking flow eventId is null, setting it now', { actualEventId });
      dispatch(setBookingEvent(event._id));
    }

    // Get schedule information from bookingFlow or route state
    const scheduleId = bookingFlow.scheduleId || routeState?.scheduleId;
    if (!scheduleId) {
      logger.error('Schedule ID is required for booking', {
        hasRouteState: !!routeState,
        routeStateKeys: routeState ? Object.keys(routeState) : [],
        hasBookingFlowScheduleId: !!bookingFlow.scheduleId,
        actualEventId
      });
      toast.error('Booking information is incomplete. Please go back to the event page and select a date/time.');
      navigate(`/events/${event?.slug}`);
      isBookingInProgress.current = false;
      return;
    }

    // Validate we have participants
    if (!bookingFlow.participants || bookingFlow.participants.length === 0) {
      logger.error('No participants found for booking', {
        eventId: actualEventId,
        participantCount: bookingFlow.participants?.length || 0
      });
      toast.error('Please add at least one participant to continue.');
      dispatch(setBookingStep('participants'));
      isBookingInProgress.current = false;
      return;
    }

    const bookingSession = {
      eventId: actualEventId,
      eventTitle: event.title,
      participantCount: bookingFlow.participants.length,
      paymentMethod: bookingFlow.paymentMethod,
      totalPrice: (routeState?.totalPrice || (event.price * (bookingFlow.participants.length || 1))).toString(), // Use routeState totalPrice or recalculate with event.price
      couponCode: bookingFlow.couponCode,
      scheduleId
    };

    logger.info('Starting booking completion process', bookingSession);

    try {
      // Check if we're in the StripePaymentElement flow (payment already processed)
      const isStripeElementFlow = bookingFlow.paymentMethod === 'stripe' && checkout?.paymentIntent;

      if (isStripeElementFlow) {
        // Stripe payment was already processed by StripePaymentElement component
        logger.info('Payment already processed by StripePaymentElement, confirming booking', {
          paymentIntentId: checkout.paymentIntent,
          orderId: checkout.orderId
        });

        setProcessingMessage('Finalizing your booking...');
        setIsProcessingBooking(true);
        toast.loading('Finalizing your booking...');

        // Confirm the booking with the backend using the existing payment intent
        if (!checkout.orderId) {
          logger.error('Missing orderId in checkout state', {
            paymentIntentId: checkout.paymentIntent,
            checkoutState: checkout
          });
          throw new Error('Booking session expired. Please try again.');
        }

        if (!checkout.paymentIntent) {
          throw new Error('Missing payment information.');
        }

        const confirmResponse = await bookingAPI.confirmBooking({
          paymentIntentId: checkout.paymentIntent,
          orderId: checkout.orderId,
          participants: bookingFlow.participants, // Include participants with registration data
        });

        toast.dismiss();

        if (!confirmResponse?.bookingId) {
          logger.error('Booking confirmation failed', {
            response: confirmResponse,
            hasBookingId: !!confirmResponse?.bookingId,
            paymentIntentId: checkout.paymentIntent
          });
          throw new Error('Booking confirmation failed. Please contact support if payment was charged.');
        }

        logger.info('Booking confirmed successfully', confirmResponse);
        setIsProcessingBooking(false);
        toast.success('🎉 Booking completed successfully!');
        dispatch(setBookingStep('confirmation'));
        return;
      }

      // Free / Test payment flow: Initiate and confirm booking directly
      const effectivePaymentMethod = isFreeEvent ? 'free' : 'test';
      logger.info('Processing booking', { ...bookingSession, effectivePaymentMethod });
      const initMsg = isFreeEvent ? 'Completing your free registration...' : 'Processing your booking...';
      setProcessingMessage(initMsg);
      setIsProcessingBooking(true);
      toast.loading(initMsg);

      const selectedDate = bookingFlow.selectedDate || routeState?.selectedDate;
      const compositeScheduleId = (scheduleId && selectedDate)
        ? `${scheduleId}-${selectedDate.includes('T') ? selectedDate.split('T')[0] : selectedDate}`
        : scheduleId;

      // Initiate booking
      const initiateResponse = await bookingAPI.initiateBooking({
        eventId: event._id,
        dateScheduleId: compositeScheduleId,
        seats: bookingFlow.participants.length || 1,
        paymentMethod: effectivePaymentMethod
      });

      if (!initiateResponse) {
        throw new Error('Failed to initiate booking. Please try again.');
      }

      if (!initiateResponse?.paymentIntentId || !initiateResponse?.orderId) {
        logger.error('Invalid booking initiation response', {
          response: initiateResponse,
          hasPaymentIntentId: !!initiateResponse?.paymentIntentId,
          hasOrderId: !!initiateResponse?.orderId
        });
        throw new Error('Invalid booking initiation response. Please try again.');
      }

      logger.info('Booking initiated successfully', {
        bookingId: initiateResponse.bookingId,
        paymentIntentId: initiateResponse.paymentIntentId,
        amount: initiateResponse.amount,
        alreadyConfirmed: initiateResponse.alreadyConfirmed,
      });
      setBookingResponse(initiateResponse);

      // Already confirmed on backend (idempotency) — skip confirm call
      if (initiateResponse.alreadyConfirmed) {
        toast.dismiss();
        setIsProcessingBooking(false);
        toast.success('Registration already completed!');
        dispatch(setBookingStep('confirmation'));
        setTimeout(() => navigate('/bookings'), 2000);
        return;
      }

      setProcessingMessage('Confirming your booking...');

      // Confirm the booking (for test payments, payment is auto-approved)
      const confirmResponse = await handleBookingConfirmation(initiateResponse);

      return confirmResponse;
    } catch (err) {
      toast.dismiss(); // Dismiss any loading toasts
      setIsProcessingBooking(false);

      logger.error('Failed to complete booking', {
        error: err,
        stack: err instanceof Error ? err.stack : undefined
      });

      handleError(err, {
        component: 'BookingPage',
        action: 'completeBooking',
        eventId: actualEventId
      });

      // Provide specific error messages — prefer backend message over generic axios message
      let errorMessage = 'Failed to complete booking. Please try again.';

      if (err instanceof Error) {
        // Axios errors carry the backend message in err.response.data.message
        const backendMessage = (err as any).response?.data?.message as string | undefined;

        if (backendMessage) {
          if (backendMessage.toLowerCase().includes('phone')) {
            errorMessage = 'Please verify your phone number to complete this booking.';
          } else if (backendMessage.toLowerCase().includes('not found') || backendMessage.toLowerCase().includes('not available')) {
            errorMessage = 'Event not available for booking. Please check event details.';
          } else if (backendMessage.toLowerCase().includes('seats') || backendMessage.toLowerCase().includes('capacity')) {
            errorMessage = 'Not enough seats available for the selected date.';
          } else if (backendMessage.toLowerCase().includes('authenticated') || backendMessage.toLowerCase().includes('unauthorized')) {
            errorMessage = 'Please log in to complete your booking.';
          } else {
            // Show the actual backend message for all other cases
            errorMessage = backendMessage;
          }
        } else if (err.message.includes('authentication') || err.message.includes('401')) {
          errorMessage = 'Please log in to complete your booking.';
        } else if (err.message.includes('seats') || err.message.includes('availability')) {
          errorMessage = 'Selected seats are no longer available. Please try again.';
        } else if (err.message.includes('payment')) {
          errorMessage = 'Payment processing failed. Please check your payment method.';
        } else if (err.message && !err.message.startsWith('Request failed')) {
          // Use the JS error message if it's not a raw axios status string
          errorMessage = err.message;
        }
      }

      toast.error(errorMessage);
    } finally {
      isBookingInProgress.current = false;
    }
  };

  // Helper function to handle booking confirmation after successful payment
  const handleBookingConfirmation = async (initiateResponse: any) => {
    toast.loading('Finalizing your booking...');

    try {
      const confirmResponse = await bookingAPI.confirmBooking({
        paymentIntentId: initiateResponse.paymentIntentId,
        orderId: initiateResponse.orderId,
        participants: bookingFlow.participants, // Include participants with registration data
      });

      toast.dismiss();

      if (!confirmResponse?.bookingId) {
        logger.error('Booking confirmation failed', {
          response: confirmResponse,
          hasBookingId: !!confirmResponse?.bookingId,
          paymentIntentId: initiateResponse.paymentIntentId
        });
        throw new Error('Booking confirmation failed. Please contact support if payment was charged.');
      }

      logger.info('Booking confirmed successfully', confirmResponse);
      setIsProcessingBooking(false);
      toast.success('🎉 Booking completed successfully!');

      // Store pricing data so BookingConfirmation can display it correctly
      dispatch(setCurrentBooking({
        id: confirmResponse.orderId || initiateResponse?.orderId || '',
        bookingNumber: confirmResponse.bookingId,
        status: (confirmResponse.status as any) || 'confirmed',
        unitPrice: event?.price ?? 0,
        totalAmount: confirmResponse.amountPaid ?? 0,
        serviceFee: confirmResponse.serviceFee ?? initiateResponse?.serviceFee ?? 0,
        taxAmount: confirmResponse.tax ?? initiateResponse?.tax ?? 0,
        discountAmount: confirmResponse.couponDiscount ?? initiateResponse?.couponDiscount ?? 0,
        currency: confirmResponse.currency || event?.currency || 'AED',
        userId: '',
        eventId: event?._id || '',
        event: event as any,
        participants: bookingFlow.participants,
        totalParticipants: bookingFlow.participants.length,
        bookingDate: new Date().toISOString(),
        payment: { method: 'card', status: 'completed', amount: confirmResponse.amountPaid ?? 0, currency: confirmResponse.currency || 'AED' },
        source: 'web',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

      dispatch(setBookingStep('confirmation'));
      return confirmResponse;
    } catch (error: any) {
      logger.error('Error confirming booking after successful payment', error);
      toast.error(error?.message || 'Error finalizing booking. Please contact support.');
      throw error; // Re-throw to be caught by the parent try/catch
    }
  };

  // Check if current step is valid/complete
  const isStepComplete = (step: typeof currentStep): boolean => {
    switch (step) {
      case 'details':
        return !!bookingFlow.eventId;
      case 'participants':
        return bookingFlow.participants.length > 0 &&
          bookingFlow.participants.every(p => p.name && p.email);
      case 'payment':
        return !!bookingFlow.paymentMethod && bookingFlow.agreedToTerms;
      case 'confirmation':
        return true;
      default:
        return false;
    }
  };



  // Calculate pricing with discounts
  const calculatePricing = () => {
    if (!event) return { subtotal: 0, discount: 0, total: 0, discountPercentage: 0, serviceFee: 0, tax: 0, hasServiceFee: true };

    const participantCount = bookingFlow.participants.length || 1;
    const pricePerTicket = routeState?.schedule?.price || event.price;
    const subtotal = pricePerTicket * participantCount;

    const hasServiceFee = true;
    const serviceFeeRate = bookingResponse?.serviceFeeRate ?? 5;

    // Use centralized coupon utility for consistent calculation
    const pricing = calculatePricingWithDiscount(subtotal, bookingFlow.couponCode, serviceFeeRate, hasServiceFee);

    return {
      subtotal: pricing.subtotal,
      discount: pricing.discount,
      serviceFee: pricing.serviceFee,
      tax: pricing.tax,
      total: pricing.total,
      pricePerTicket,
      participantCount,
      discountPercentage: pricing.discountPercentage,
      isValidCoupon: pricing.isValidCoupon,
      couponError: pricing.couponError,
      hasServiceFee: pricing.hasServiceFee
    };
  };

  // Render step content with error boundaries and fallbacks
  const renderStepContent = () => {
    if (!event) {
      logger.warn('Cannot render step content - no event data', {
        currentStep,
        actualEventId,
        loading,
        error,
        hasRouteState: !!routeState
      });
      return null;
    }

    logger.debug('Rendering step content', {
      eventId: actualEventId,
      currentStep,
      eventTitle: event.title,
      participantCount: bookingFlow.participants.length,
      renderAttempt: renderCount.current
    });

    try {
      switch (currentStep) {
        case 'details':
          return (
            <ComponentErrorBoundary componentName="BookingDetails">
              {BookingDetails ? (
                <BookingDetails
                  event={event}
                  initialData={routeState}
                  onNext={handleNextStep}
                />
              ) : (
                <BookingDetailsFallback onNext={handleNextStep} />
              )}
            </ComponentErrorBoundary>
          );
        case 'participants':
          return (
            <ComponentErrorBoundary componentName="ParticipantForm">
              {ParticipantForm ? (
                <ParticipantForm
                  event={event}
                  onNext={isFreeEvent ? handleCompleteBooking : handleNextStep}
                  onPrev={handlePrevStep}
                />
              ) : (
                <ParticipantFormFallback
                  onNext={isFreeEvent ? handleCompleteBooking : handleNextStep}
                  onPrev={handlePrevStep}
                />
              )}
            </ComponentErrorBoundary>
          );
        case 'payment':
          // Free events skip payment – auto-complete booking
          if (isFreeEvent) {
            return (
              <Card>
                <CardContent className="p-8 text-center">
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Free Registration</h3>
                  <p className="text-gray-600 mb-6">This is a free event. No payment required.</p>
                  <Button onClick={handleCompleteBooking}>Complete Registration</Button>
                </CardContent>
              </Card>
            );
          }
          return (
            <ComponentErrorBoundary componentName="PaymentForm">
              {PaymentForm ? (
                <PaymentForm
                  event={event}
                  onNext={handleCompleteBooking}
                  onPrev={handlePrevStep}
                  schedulePrice={calculatePricing().pricePerTicket}
                />
              ) : (
                <PaymentFormFallback
                  onNext={handleCompleteBooking}
                  onPrev={handlePrevStep}
                />
              )}
            </ComponentErrorBoundary>
          );
        case 'confirmation':
          return (
            <ComponentErrorBoundary componentName="BookingConfirmation">
              {BookingConfirmation ? (
                <BookingConfirmation
                  event={event}
                  onComplete={() => navigate('/bookings')}
                />
              ) : (
                <BookingConfirmationFallback
                  onComplete={() => navigate('/bookings')}
                />
              )}
            </ComponentErrorBoundary>
          );
        default:
          return (
            <div className="text-center p-8">
              <p className="text-gray-600">Invalid booking step</p>
            </div>
          );
      }
    } catch (err) {
      logger.error('Error rendering step content', {
        eventId: actualEventId,
        currentStep,
        error: err,
        stack: err instanceof Error ? err.stack : undefined
      });
      return (
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-4">Component Error</h3>
            <p className="text-gray-600 mb-6">Unable to load this booking step.</p>
            <div className="flex justify-center space-x-4">
              <Button variant="outline" onClick={() => window.location.reload()}>
                Refresh Page
              </Button>
              <Button variant="primary" onClick={() => navigate('/events')}>
                Browse Events
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }
  };

  // Redux error state
  if (reduxError) {
    logger.error('Rendering Redux error state', {
      eventId: actualEventId,
      reduxError,
      url: getCurrentPageUrl()
    });
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <CardTitle className="text-red-800">System Error</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">{reduxError}</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
                fullWidth
              >
                Refresh Page
              </Button>
              <Button
                variant="primary"
                onClick={() => navigate('/events')}
                fullWidth
              >
                Browse Events
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading state
  if (loading) {
    logger.debug('Rendering loading state', {
      eventId: actualEventId,
      hasRouteState: !!routeState,
      renderCount: renderCount.current
    });

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700">Loading Event Details...</h2>
          <p className="text-gray-500 mt-2">Please wait while we prepare your booking</p>
          <p className="text-xs text-gray-400 mt-4">Event ID: {actualEventId}</p>
          <p className="text-xs text-gray-400 mt-1">Render #{renderCount.current}</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !event) {
    logger.error('Rendering error state', {
      eventId: actualEventId,
      error,
      hasRouteState: !!routeState
    });
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <CardTitle className="text-red-800">Booking Error</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">{error}</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                onClick={() => navigate(-1)}
                leftIcon={<ChevronLeft className="w-4 h-4" />}
                fullWidth
              >
                Go Back
              </Button>
              <Button
                variant="primary"
                onClick={() => navigate('/events')}
                fullWidth
              >
                Browse Events
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Final check - if we're not loading and don't have an event, show error
  if (!loading && !event) {
    logger.error('Rendering no event state', {
      eventId: actualEventId,
      loading,
      error,
      hasRouteState: !!routeState,
      renderCount: renderCount.current,
      isInitialized: isInitialized.current
    });
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Card className="max-w-md w-full text-center p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Event Not Found</h2>
          <p className="text-gray-600 mb-6">
            {error || "The event you're trying to book doesn't exist or has been removed."}
          </p>
          <div className="space-y-3">
            <Button
              variant="outline"
              onClick={() => {
                logger.info('Retrying event fetch');
                isInitialized.current = false;
                initializationRef.current = {};
                setLoading(true);
                setError(null);
              }}
              fullWidth
            >
              Retry
            </Button>
            <Button
              variant="primary"
              onClick={() => navigate('/events')}
              fullWidth
            >
              Browse Events
            </Button>
          </div>
          <p className="text-xs text-gray-400 mt-4">Event ID: {actualEventId}</p>
          <p className="text-xs text-gray-400">Render #{renderCount.current}</p>
        </Card>
      </div>
    );
  }

  // Final render decision logging
  logger.debug('BookingPage final render decision - showing main content', {
    eventId: actualEventId,
    renderCount: renderCount.current,
    hasEvent: !!event,
    eventTitle: event?.title,
    loading,
    error,
    reduxError,
    currentStep,
    participantCount: bookingFlow?.participants?.length || 0,
    isInitialized: isInitialized.current
  });

  // At this point we should have event data and no loading state
  if (!event) {
    logger.error('Critical: Reached main render without event data', {
      eventId: actualEventId,
      loading,
      error,
      renderCount: renderCount.current
    });
    return null; // This should not happen if logic above is correct
  }

  return (
    <>
      {/* Processing overlay — shown during booking finalization */}
      {isProcessingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl px-10 py-10 flex flex-col items-center gap-6 max-w-sm w-full mx-4">
            {/* Spinner */}
            <div className="relative flex items-center justify-center w-20 h-20">
              <div className="absolute inset-0 rounded-full border-4 border-primary/20"></div>
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary animate-spin"></div>
              <CheckCircle className="w-8 h-8 text-primary/40" />
            </div>

            {/* Message */}
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-800">{processingMessage}</p>
              <p className="text-sm text-gray-500 mt-1">Please don't close this window</p>
            </div>

            {/* Step dots */}
            <div className="flex gap-2">
              {['Initiating', 'Confirming', 'Done'].map((label, i) => (
                <div key={label} className="flex flex-col items-center gap-1">
                  <div
                    className={`w-2.5 h-2.5 rounded-full transition-all duration-500 ${
                      processingMessage.toLowerCase().includes('confirm') && i === 1
                        ? 'bg-primary scale-125'
                        : processingMessage.toLowerCase().includes('done') && i === 2
                        ? 'bg-green-500 scale-125'
                        : i === 0
                        ? 'bg-primary scale-125'
                        : 'bg-gray-200'
                    }`}
                  />
                  <span className="text-[10px] text-gray-400">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <SEO
        title={`Book ${event.title} | Gema Events`}
        description={`Complete your booking for ${event.title}. Secure payment and instant confirmation.`}
        noIndex={true}
        noFollow={true}
      />
      <ComponentErrorBoundary componentName="BookingPage">
        <div className="min-h-screen bg-gray-50">
          {/* Header */}
          <div className="bg-white border-b border-gray-200">
            <div className="max-w-4xl mx-auto px-4 py-6">
              <div className="flex items-center justify-between">
                <div>
                  <button
                    onClick={() => navigate(-1)}
                    className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-2"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Back to Event
                  </button>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {isFreeEvent ? 'Complete Your Registration' : 'Complete Your Booking'}
                  </h1>
                  <p className="text-gray-600">{event.title}</p>
                  <p className="text-xs text-gray-400">Render #{renderCount.current} | Step: {currentStep}</p>
                </div>
                <div className="hidden sm:block">
                  <div className="flex items-center text-sm text-gray-500">
                    <Clock className="w-4 h-4 mr-1" />
                    Session expires in 15 minutes
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="bg-white border-b border-gray-100">
            <div className="max-w-4xl mx-auto px-4 py-4">
              <ComponentErrorBoundary componentName="BookingSteps">
                {BookingSteps ? (
                  <BookingSteps
                    currentStep={currentStep}
                    onStepClick={handleStepClick}
                    isStepComplete={isStepComplete}
                    isFreeEvent={isFreeEvent}
                  />
                ) : (
                  <BookingStepsFallback />
                )}
              </ComponentErrorBoundary>
            </div>
          </div>

          {/* Main Content */}
          <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Booking Form */}
              <div className="lg:col-span-2">
                {renderStepContent()}
              </div>

              {/* Order Summary Sidebar */}
              <div className="lg:col-span-1">
                <Card className="sticky top-8">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Users className="w-5 h-5 mr-2" />
                      Order Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Event Info */}
                    <div className="flex items-start space-x-3">
                      <img
                        src={event.images?.[0] || '/placeholder-event.jpg'}
                        alt={event.title}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{event.title}</h3>
                        <p className="text-sm text-gray-600">{event.category}</p>
                      </div>
                    </div>

                    <div className="border-t pt-4 space-y-2">
                      {isFreeEvent ? (
                        <>
                          <div className="flex justify-between text-sm">
                            <span>Participants:</span>
                            <span>{bookingFlow.participants.length || 1}</span>
                          </div>
                          <div className="border-t pt-2 flex justify-between font-semibold text-green-700">
                            <span>Total:</span>
                            <span>FREE</span>
                          </div>
                        </>
                      ) : (
                        (() => {
                          const pricing = calculatePricing();
                          return (
                            <>
                              <div className="flex justify-between text-sm">
                                <span>Participants:</span>
                                <span>{pricing.participantCount}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span>Price per ticket:</span>
                                <span>{event.currency} {pricing.pricePerTicket}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span>Subtotal:</span>
                                <span>{event.currency} {pricing.subtotal.toFixed(2)}</span>
                              </div>
                              {bookingFlow.couponCode && pricing.discount > 0 && (
                                <div className="flex justify-between text-sm text-green-600">
                                  <span>Discount ({bookingFlow.couponCode} - {pricing.discountPercentage}%):</span>
                                  <span>-{event.currency} {pricing.discount.toFixed(2)}</span>
                                </div>
                              )}
                              {pricing.hasServiceFee && pricing.serviceFee > 0 && (
                                <div className="flex justify-between text-sm">
                                  <span>Service Fee (5%):</span>
                                  <span>{event.currency} {pricing.serviceFee.toFixed(2)}</span>
                                </div>
                              )}
                              <div className="flex justify-between text-sm">
                                <span>Tax (5%):</span>
                                <span>{event.currency} {pricing.tax.toFixed(2)}</span>
                              </div>
                              <div className="border-t pt-2 flex justify-between font-semibold">
                                <span>Total:</span>
                                <span>{event.currency} {pricing.total.toFixed(2)}</span>
                              </div>
                            </>
                          );
                        })()
                      )}
                    </div>

                    {/* Security Badge */}
                    {isFreeEvent ? (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                        <div className="flex items-center text-emerald-800">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          <span className="text-sm font-medium">Free Registration</span>
                        </div>
                        <p className="text-xs text-emerald-600 mt-1">
                          No payment required — complete your registration to secure your spot
                        </p>
                      </div>
                    ) : (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <div className="flex items-center text-green-800">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          <span className="text-sm font-medium">Secure Payment</span>
                        </div>
                        <p className="text-xs text-green-600 mt-1">
                          Your payment information is protected by 256-bit SSL encryption
                        </p>
                      </div>
                    )}

                    {/* Payment Methods */}
                    <div className="flex items-center justify-center space-x-2 pt-2">
                      <CreditCard className="w-5 h-5 text-gray-400" />
                      <span className="text-xs text-gray-500">Visa, Mastercard, PayPal accepted</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </ComponentErrorBoundary>
    </>
  );
};

export default BookingPage;