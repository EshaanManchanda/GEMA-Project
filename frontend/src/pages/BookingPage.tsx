import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight, CheckCircle, Clock, CreditCard, Users, AlertCircle } from 'lucide-react';

import { AppDispatch, RootState } from '../store';
import {
  setBookingEvent,
  setBookingSchedule,
  setBookingStep,
  resetBookingFlow,
  selectBookingFlow,
  selectBookingStep,
  selectIsCreatingBooking,
  selectBookingCreateError,
  createPaymentIntent,
  confirmPayment,
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
  
  // Validate event ID format (should be a valid MongoDB ObjectId)
  const isValidEventId = actualEventId && /^[0-9a-fA-F]{24}$/.test(actualEventId);

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

  // Get initial data from route state (from EventDetailPage)
  const routeState = location.state as {
    event?: Event;
    quantity?: number;
    selectedDate?: string;
    schedule?: any;
    scheduleId?: string;
    totalPrice?: string;
    currency?: string;
  } | null;

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
        toast.error('Invalid event ID format. Please select a valid event.');
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
        dispatch(setBookingEvent(actualEventId));

        // Set schedule ID if provided in route state
        if (routeState?.scheduleId) {
          logger.info('Setting schedule ID from route state', {
            scheduleId: routeState.scheduleId,
            actualEventId
          });
          dispatch(setBookingSchedule(routeState.scheduleId));
        }

        // If we have event data from route state, use it
        if (routeState?.event && routeState.event._id === actualEventId) {
          logger.info('Using event data from route state', {
            sessionId,
            eventId: routeState.event._id,
            eventTitle: routeState.event.title
          });
          setEvent(routeState.event);
        } else {
          // Otherwise fetch event data
          logger.info('Fetching event data from API', { sessionId, actualEventId });
          const eventData = await eventsAPI.getEventById(actualEventId);
          logger.info('Event data successfully fetched', {
            sessionId,
            eventId: eventData._id,
            eventTitle: eventData.title,
            eventPrice: eventData.price,
            eventDates: eventData.dateSchedule?.length
          });
          setEvent(eventData);
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

  // Handle step navigation
  const handleNextStep = () => {
    const steps = ['details', 'participants', 'payment', 'confirmation'] as const;
    const currentIndex = steps.indexOf(currentStep);
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
    const steps = ['details', 'participants', 'payment', 'confirmation'] as const;
    const currentIndex = steps.indexOf(currentStep);
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
    // Validate required data
    if (!event || !actualEventId) {
      logger.error('Cannot complete booking - missing required data', {
        hasEvent: !!event,
        bookingFlowEventId: bookingFlow.eventId,
        actualEventId,
        participantCount: bookingFlow.participants.length
      });
      toast.error('Event information is missing. Please refresh and try again.');
      return;
    }

    // Ensure booking flow is properly initialized
    if (!bookingFlow.eventId) {
      logger.warn('Booking flow eventId is null, setting it now', { actualEventId });
      dispatch(setBookingEvent(actualEventId));
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
      navigate(`/events/${actualEventId}`);
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

        toast.loading('Finalizing your booking...');

        // Confirm the booking with the backend using the existing payment intent
        if (!checkout.orderId) {
          logger.error('Missing orderId in checkout state', {
            paymentIntentId: checkout.paymentIntent,
            checkoutState: checkout
          });
          throw new Error('Booking session expired. Please try again.');
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
        toast.success('🎉 Booking completed successfully!');
        dispatch(setBookingStep('confirmation'));

        // Navigate to bookings page
        setTimeout(() => {
          logger.info('Navigating to bookings page after confirmation', {
            bookingId: confirmResponse.bookingId,
            paymentIntentId: checkout.paymentIntent
          });
          navigate('/bookings');
        }, 2000);

        return;
      }

      // Test payment flow: Initiate and confirm booking directly
      logger.info('Processing test payment booking', bookingSession);
      toast.loading('Processing your booking...');

      // Initiate booking with test payment
      const initiateResponse = await bookingAPI.initiateBooking({
        eventId: actualEventId,
        dateScheduleId: scheduleId,
        seats: bookingFlow.participants.length || 1,
        paymentMethod: 'test' // Backend will handle test payment
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
        amount: initiateResponse.amount
      });

      // Confirm the booking (for test payments, payment is auto-approved)
      const confirmResponse = await handleBookingConfirmation(initiateResponse);

      return confirmResponse;
    } catch (err) {
      toast.dismiss(); // Dismiss any loading toasts

      logger.error('Failed to complete booking', {
        error: err,
        stack: err instanceof Error ? err.stack : undefined
      });

      const apiError = handleError(err, {
        component: 'BookingPage',
        action: 'completeBooking',
        eventId: actualEventId
      });

      // Provide specific error messages based on error type
      let errorMessage = 'Failed to complete booking. Please try again.';

      if (err instanceof Error) {
        if (err.message.includes('authentication')) {
          errorMessage = 'Please log in to complete your booking.';
        } else if (err.message.includes('seats') || err.message.includes('availability')) {
          errorMessage = 'Selected seats are no longer available. Please try again.';
        } else if (err.message.includes('payment')) {
          errorMessage = 'Payment processing failed. Please check your payment method.';
        }
      }

      toast.error(errorMessage);
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
      toast.success('🎉 Booking completed successfully!');
      dispatch(setBookingStep('confirmation'));

      // Navigate to confirmation page or user bookings
      setTimeout(() => {
        logger.info('Navigating to bookings page after confirmation', {
          bookingId: confirmResponse.bookingId,
          paymentIntentId: initiateResponse.paymentIntentId
        });
        navigate('/bookings');
      }, 2000);
      
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

  const canProceedToNext = (): boolean => {
    return isStepComplete(currentStep);
  };

  // Calculate pricing with discounts
  const calculatePricing = () => {
    if (!event) return { subtotal: 0, discount: 0, total: 0, discountPercentage: 0, serviceFee: 0, tax: 0, hasServiceFee: true };

    const participantCount = bookingFlow.participants.length || 1;
    const pricePerTicket = routeState?.schedule?.price || event.price;
    const subtotal = pricePerTicket * participantCount;

    // For now, assume service fee applies (5%) - this could be made dynamic based on vendor
    // In a real implementation, you'd fetch this from the vendor's payment settings
    const hasServiceFee = true; // TODO: Get from vendor payment settings
    const serviceFeeRate = 5; // TODO: Get from vendor payment settings

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
                  onNext={handleNextStep}
                  onPrev={handlePrevStep}
                />
              ) : (
                <ParticipantFormFallback 
                  onNext={handleNextStep}
                  onPrev={handlePrevStep}
                />
              )}
            </ComponentErrorBoundary>
          );
        case 'payment':
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
                <h1 className="text-2xl font-bold text-gray-900">Complete Your Booking</h1>
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
                    {(() => {
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
                    })()}
                  </div>

                  {/* Security Badge */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center text-green-800">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      <span className="text-sm font-medium">Secure Payment</span>
                    </div>
                    <p className="text-xs text-green-600 mt-1">
                      Your payment information is protected by 256-bit SSL encryption
                    </p>
                  </div>

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