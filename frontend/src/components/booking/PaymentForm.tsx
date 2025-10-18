import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useLocation } from 'react-router-dom';
import { CreditCard, Shield, Lock, AlertCircle, CheckCircle, ChevronLeft, AlertTriangle, Info } from 'lucide-react';
import toast from 'react-hot-toast';

import { AppDispatch } from '../../store';
import StripeElementsWrapper from '../payment/StripeElementsWrapper';
import StripePaymentElement from '../payment/StripePaymentElement';
import { getPaymentConfig, getRegionalPaymentMethods, getPreferredPaymentMethod, shouldShowRegulatoryWarning, getRegulatoryMessage } from '../../utils/paymentConfig';
import { getEnvironmentInfo, getPaymentMethodAvailability } from '../../utils/environmentUtils';
import { formatCurrency, getDefaultCurrency, getCurrencySymbol } from '../../utils/currencyUtils';
import {
  setPaymentMethod,
  setAgreedToTerms,
  selectBookingFlow,
  selectBookingParticipants,
  selectCheckout,
  createPaymentIntent,
} from '../../store/slices/bookingsSlice';
import { Event } from '../../types/event';
import bookingAPI, { InitiateBookingData } from '../../services/api/bookingAPI';
import { useErrorHandler } from '../../utils/errorHandler';
import vendorPaymentService, { VendorPaymentInfo } from '../../services/vendorPaymentService';
import { logger } from '../../utils/logger';

import Button from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';

interface PaymentFormProps {
  event: Event;
  onNext: () => void;
  onPrev: () => void;
}

const PaymentForm: React.FC<PaymentFormProps> = ({
  event,
  onNext,
  onPrev
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const location = useLocation();
  const bookingFlow = useSelector(selectBookingFlow);
  const participants = useSelector(selectBookingParticipants);
  const checkout = useSelector(selectCheckout);
  const { handleError } = useErrorHandler();

  // Local state
  const [processing, setProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(
    bookingFlow.paymentMethod || getPreferredPaymentMethod()
  );
  const [agreedToTerms, setAgreedToTermsLocal] = useState(bookingFlow.agreedToTerms);
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [vendorPaymentInfo, setVendorPaymentInfo] = useState<VendorPaymentInfo | null>(null);

  // Payment methods configuration with environment-based settings
  const paymentConfig = getPaymentConfig();
  const regionalMethods = getRegionalPaymentMethods();
  const environmentInfo = getEnvironmentInfo();
  const paymentAvailability = getPaymentMethodAvailability();

  // Extract and stabilize vendorId to prevent unnecessary re-renders
  const stableVendorId = useMemo(() => {
    // Validate vendorId exists, is populated object, and has valid MongoDB ObjectId format
    if (event.vendorId &&
        typeof event.vendorId === 'object' &&
        '_id' in event.vendorId &&
        event.vendorId._id &&
        /^[0-9a-fA-F]{24}$/.test(event.vendorId._id)) {
      return event.vendorId._id;
    }
    return undefined;
  }, [event.vendorId]);

  // Fetch vendor payment info on mount
  useEffect(() => {
    const fetchVendorPaymentInfo = async () => {
      if (stableVendorId) {
        // Valid vendorId - fetch payment info
        const info = await vendorPaymentService.getVendorPaymentInfo(stableVendorId);
        setVendorPaymentInfo(info);
      } else {
        // Invalid or missing vendorId - use platform defaults
        logger.warn('Invalid or missing vendorId, using platform payment defaults', {
          vendorId: event.vendorId,
          hasVendorId: !!event.vendorId,
          isObject: typeof event.vendorId === 'object'
        });
        setVendorPaymentInfo({
          vendorId: 'platform',
          hasCustomStripe: false,
          stripePublishableKey: null,
          serviceFeeRate: 5,
          usePlatformStripe: true,
        });
      }
    };

    fetchVendorPaymentInfo();
  }, [stableVendorId, event.vendorId]);

  const paymentMethods = [
    {
      id: 'test',
      name: 'Test Payment',
      description: environmentInfo.isDevelopment
        ? 'Recommended for development - automatically succeeds and processes your order normally'
        : 'Safe test payment option - processes your order normally without charging your card',
      icon: CheckCircle,
      popular: regionalMethods.test.recommended || !regionalMethods.stripe.enabled,
      recommended: regionalMethods.test.recommended || !paymentAvailability.stripeElements,
      enabled: regionalMethods.test.enabled,
      warning: regionalMethods.test.warning,
      reliable: true,
    },
    {
      id: 'stripe',
      name: 'Credit/Debit Card',
      description: paymentAvailability.stripeElements
        ? 'Visa, Mastercard, American Express - Secure payment processing'
        : 'Credit/Debit Card payments may have limitations in current environment',
      icon: CreditCard,
      popular: regionalMethods.stripe.recommended && paymentAvailability.stripeElements,
      recommended: regionalMethods.stripe.recommended && paymentAvailability.stripeElements,
      enabled: regionalMethods.stripe.enabled,
      warning: regionalMethods.stripe.warning || (!paymentAvailability.stripeElements ? 'May have limitations in current environment' : undefined),
      reliable: paymentAvailability.stripeElements,
    },
    {
      id: 'paypal',
      name: 'PayPal',
      description: 'Pay with your PayPal account (Coming Soon)',
      icon: CreditCard,
      popular: false,
      recommended: false,
      enabled: false, // Disabled for now
      warning: 'PayPal integration coming soon',
      reliable: false,
    },
  ].filter(method => method.enabled);

  // Update Redux state when local state changes
  useEffect(() => {
    dispatch(setPaymentMethod(selectedPaymentMethod));
  }, [selectedPaymentMethod, dispatch]);

  useEffect(() => {
    dispatch(setAgreedToTerms(agreedToTerms));
  }, [agreedToTerms, dispatch]);

  // Create payment intent when Stripe is selected and we don't have one yet
  useEffect(() => {
    if (selectedPaymentMethod === 'stripe' && !checkout?.clientSecret && participants.length > 0) {
      // Get schedule ID from bookingFlow (set during booking initialization)
      const dateScheduleId = bookingFlow.scheduleId;

      if (dateScheduleId) {
        logger.debug('Creating payment intent for Stripe');
        dispatch(createPaymentIntent({
          eventId: event._id,
          participants: participants.length,
          dateScheduleId: dateScheduleId
        }));
      } else {
        logger.warn('No schedule ID found in booking flow. User must select a schedule.');
      }
    }
  }, [selectedPaymentMethod, checkout?.clientSecret, participants.length, event._id, bookingFlow.scheduleId, dispatch]);

  // Calculate total amount
  const calculateTotal = () => {
    const basePrice = event.price;
    const participantCount = participants.length;
    const subtotal = basePrice * participantCount;

    // Apply discount if coupon is applied
    const discountAmount = bookingFlow.couponCode ? subtotal * 0.1 : 0; // 10% discount example

    // Service fee based on vendor payment settings
    // If vendor has custom Stripe, no service fee. Otherwise, use vendor's commission rate
    const serviceFeeRate = vendorPaymentInfo?.serviceFeeRate || 5; // Default 5%
    const serviceFee = vendorPaymentInfo?.usePlatformStripe !== false ? (subtotal * (serviceFeeRate / 100)) : 0;

    const tax = (subtotal - discountAmount + serviceFee) * 0.05; // 5% tax
    const total = subtotal - discountAmount + serviceFee + tax;

    return {
      subtotal,
      discountAmount,
      serviceFee,
      serviceFeeRate,
      tax,
      total,
      hasVendorStripe: vendorPaymentInfo?.hasCustomStripe || false,
    };
  };

  const { subtotal, discountAmount, serviceFee, serviceFeeRate, tax, total, hasVendorStripe } = calculateTotal();

  // Handle payment method selection
  const handlePaymentMethodChange = (method: string) => {
    setSelectedPaymentMethod(method);
    setPaymentError(null);
  };

  // Handle terms agreement
  const handleTermsChange = (checked: boolean) => {
    setAgreedToTermsLocal(checked);
    setPaymentError(null);
  };

  // Validate form
  const validateForm = (): boolean => {
    if (!selectedPaymentMethod) {
      setPaymentError('Please select a payment method');
      return false;
    }

    if (!agreedToTerms) {
      setPaymentError('You must agree to the terms and conditions');
      return false;
    }

    if (!agreedToPrivacy) {
      setPaymentError('You must agree to the privacy policy');
      return false;
    }

    return true;
  };

  // Handle successful payment
  const handlePaymentSuccess = async () => {
    setProcessing(true);
    try {
      // Get orderId and paymentIntent from checkout state
      // Note: checkout.paymentIntent (not paymentIntentId)
      const { orderId, paymentIntent: paymentIntentId } = checkout || {};

      logger.debug('Checkout state:', { orderId, paymentIntentId, checkoutKeys: Object.keys(checkout || {}) });

      if (!orderId || !paymentIntentId) {
        throw new Error('Missing order or payment information');
      }

      logger.debug('Confirming booking after successful payment', {
        orderId,
        paymentIntentId: paymentIntentId.substring(0, 20) + '...'
      });

      // Confirm booking on backend - this will:
      // - Update order status to 'confirmed'
      // - Update payment status to 'paid'
      // - Reduce available seats
      // - Generate tickets
      // - Send confirmation emails
      await bookingAPI.confirmBooking({
        paymentIntentId,
        orderId
      });

      toast.success('Booking confirmed successfully!');
      onNext();
    } catch (error: any) {
      logger.error('Booking confirmation failed:', error);
      const apiError = handleError(error, {
        component: 'PaymentForm',
        action: 'confirmBooking'
      });
      setPaymentError(apiError.message);
      toast.error('Booking confirmation failed. Please contact support with your order details.');
    } finally {
      setProcessing(false);
    }
  };

  // Handle fallback to test payment
  const handleFallbackToTestPayment = () => {
    setSelectedPaymentMethod('test');
    setPaymentError(null);
    toast.success('Switched to Test Payment method');
  };

  // Handle payment initiation
  const handleInitiatePayment = async () => {
    if (!validateForm()) return;

    setProcessing(true);
    setPaymentError(null);

    try {
      if (selectedPaymentMethod === 'test') {
        // Test payment - first initiate if needed, then confirm
        let orderId = checkout?.orderId;
        let paymentIntentId = checkout?.paymentIntent;

        // If we don't have an order yet, create one
        if (!orderId) {
          logger.debug('Initiating test payment booking');
          const dateScheduleId = bookingFlow.scheduleId;

          if (!dateScheduleId) {
            setPaymentError('No schedule selected. Please try again.');
            return;
          }

          // Initiate booking with test payment method
          const initiateResponse = await bookingAPI.initiateBooking({
            eventId: event._id,
            dateScheduleId,
            seats: participants.length,
            paymentMethod: 'test',
            participants: participants
          });

          orderId = initiateResponse.orderId;
          paymentIntentId = initiateResponse.paymentIntentId;
          logger.debug('Test payment initiated:', { orderId, paymentIntentId });
        }

        if (!orderId || !paymentIntentId) {
          setPaymentError('Failed to initiate booking. Please try again.');
          return;
        }

        logger.debug('Confirming test payment booking', { orderId, paymentIntentId });

        // Confirm test payment booking
        await bookingAPI.confirmBooking({
          paymentIntentId,
          orderId
        });

        toast.success('Test booking confirmed successfully!');
        setTimeout(() => {
          onNext();
        }, 500);
        return;
      }

      if (selectedPaymentMethod === 'stripe') {
        // Stripe payment is handled by StripePaymentElement component
        // Just check if payment intent is ready
        if (!checkout?.clientSecret) {
          setPaymentError('Payment session not ready. Please try again.');
          return;
        }
        // The actual payment will be handled by StripePaymentElement
        return;
      } else {
        // Handle other payment methods (PayPal, etc.)
        onNext();
      }
    } catch (error: any) {
      const apiError = handleError(error, {
        component: 'PaymentForm',
        action: 'initiatePayment',
        eventId: event._id,
      });

      setPaymentError(apiError.message);
      toast.error('Payment processing failed');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Information</h2>
        <p className="text-gray-600">
          Secure payment processing with 256-bit SSL encryption
        </p>
        {shouldShowRegulatoryWarning() && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start">
              <AlertTriangle className="w-5 h-5 text-amber-600 mr-2 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-amber-800 font-medium mb-1">Payment Configuration Notice</p>
                <p className="text-sm text-amber-700">{getRegulatoryMessage()}</p>
                <div className="mt-2 text-xs text-amber-600">
                  <p>Recommendation: Use Test Payment for reliable processing</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced guidance for payment method selection */}
        {!environmentInfo.isDevelopment && !paymentAvailability.stripeElements && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start">
              <Info className="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-blue-800 font-medium mb-1">Payment Method Guidance</p>
                <p className="text-sm text-blue-700">
                  Some payment features may be limited. Test Payment is recommended for the most reliable experience.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Payment Methods */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CreditCard className="w-5 h-5 mr-2" />
            Select Payment Method
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {paymentMethods.map((method) => (
            <div
              key={method.id}
              className={`
                relative border rounded-lg p-4 cursor-pointer transition-all duration-200
                ${selectedPaymentMethod === method.id
                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }
              `}
              onClick={() => handlePaymentMethodChange(method.id)}
            >
              <div className="flex items-center">
                <input
                  type="radio"
                  name="paymentMethod"
                  value={method.id}
                  checked={selectedPaymentMethod === method.id}
                  onChange={() => handlePaymentMethodChange(method.id)}
                  className="mr-3"
                />
                <method.icon className="w-6 h-6 text-gray-600 mr-3" />
                <div className="flex-1">
                  <div className="flex items-center">
                    <span className="font-medium text-gray-900">{method.name}</span>
                    {method.recommended && (
                      <span className="ml-2 px-2 py-1 text-xs bg-green-600 text-white rounded-full">
                        Recommended
                      </span>
                    )}
                    {method.popular && !method.recommended && (
                      <span className="ml-2 px-2 py-1 text-xs bg-primary text-white rounded-full">
                        Popular
                      </span>
                    )}
                    {method.reliable === false && (
                      <span className="ml-2 px-2 py-1 text-xs bg-orange-500 text-white rounded-full">
                        Limited
                      </span>
                    )}
                    {method.reliable === true && method.id === 'test' && (
                      <span className="ml-2 px-2 py-1 text-xs bg-blue-500 text-white rounded-full">
                        Reliable
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{method.description}</p>
                  {method.warning && (
                    <div className="flex items-start mt-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-amber-700">{method.warning}</p>
                    </div>
                  )}
                </div>
                <Shield className="w-5 h-5 text-green-500" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Real Stripe Elements */}
      {selectedPaymentMethod === 'stripe' && checkout?.clientSecret && (
        <StripeElementsWrapper
          clientSecret={checkout.clientSecret}
          vendorId={stableVendorId}
        >
          <StripePaymentElement
            onSuccess={handlePaymentSuccess}
            onError={(error) => setPaymentError(error)}
            onFallbackToTestPayment={handleFallbackToTestPayment}
            isProcessing={processing}
            amount={total}
            currency={event.currency || 'USD'}
          />
        </StripeElementsWrapper>
      )}

      {/* Loading state for Stripe Elements */}
      {selectedPaymentMethod === 'stripe' && !checkout?.clientSecret && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Lock className="w-5 h-5 mr-2" />
              Card Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-3 text-gray-600">Loading payment form...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Order Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span>Subtotal ({participants.length} participants)</span>
              <span>{formatCurrency(subtotal, event.currency || getDefaultCurrency())}</span>
            </div>

            {discountAmount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount ({bookingFlow.couponCode})</span>
                <span>-{formatCurrency(discountAmount, event.currency || getDefaultCurrency())}</span>
              </div>
            )}

            {hasVendorStripe ? (
              <div className="flex justify-between text-sm text-green-600">
                <span className="flex items-center">
                  Service Fee
                  <Info className="w-3 h-3 ml-1" title="No service fee - vendor payment" />
                </span>
                <span className="font-medium">Free</span>
              </div>
            ) : (
              <div className="flex justify-between text-sm text-gray-600">
                <span className="flex items-center">
                  Service Fee ({serviceFeeRate}%)
                  <Info className="w-3 h-3 ml-1" title="Platform payment processing fee" />
                </span>
                <span>{formatCurrency(serviceFee, event.currency || getDefaultCurrency())}</span>
              </div>
            )}

            <div className="flex justify-between text-sm text-gray-600">
              <span>Tax (5%)</span>
              <span>{formatCurrency(tax, event.currency || getDefaultCurrency())}</span>
            </div>

            <div className="border-t pt-3">
              <div className="flex justify-between text-lg font-bold">
                <span>Total Amount</span>
                <span>{formatCurrency(total, event.currency || getDefaultCurrency())}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Terms and Conditions */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-start">
              <input
                type="checkbox"
                id="terms"
                checked={agreedToTerms}
                onChange={(e) => handleTermsChange(e.target.checked)}
                className="mt-1 mr-3"
              />
              <label htmlFor="terms" className="text-sm text-gray-700">
                I agree to the{' '}
                <Link to="/terms" className="text-primary hover:underline">
                  Terms and Conditions
                </Link>{' '}
                and{' '}
                <Link to="/cancellation-policy" className="text-primary hover:underline">
                  Cancellation Policy
                </Link>
              </label>
            </div>

            <div className="flex items-start">
              <input
                type="checkbox"
                id="privacy"
                checked={agreedToPrivacy}
                onChange={(e) => setAgreedToPrivacy(e.target.checked)}
                className="mt-1 mr-3"
              />
              <label htmlFor="privacy" className="text-sm text-gray-700">
                I agree to the{' '}
                <Link to="/privacy" className="text-primary hover:underline">
                  Privacy Policy
                </Link>{' '}
                and consent to data processing
              </label>
            </div>

            <div className="flex items-start">
              <input
                type="checkbox"
                id="marketing"
                checked={marketingConsent}
                onChange={(e) => setMarketingConsent(e.target.checked)}
                className="mt-1 mr-3"
              />
              <label htmlFor="marketing" className="text-sm text-gray-700">
                I'd like to receive marketing communications about similar events and offers (optional)
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {paymentError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 mr-3" />
            <p className="text-sm text-red-800">{paymentError}</p>
          </div>
        </div>
      )}

      {/* Security Notice */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-start">
          <CheckCircle className="w-5 h-5 text-green-600 mr-3 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-green-800 mb-1">Secure Payment</p>
            <p className="text-green-700">
              Your payment information is encrypted and secure. We never store your credit card details.
              All transactions are processed through our certified payment partners.
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons - Only show for non-Stripe payments or when Stripe is not ready */}
      {/* For Stripe payments, StripePaymentElement has its own submit button */}
      {!(selectedPaymentMethod === 'stripe' && checkout?.clientSecret) && (
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={onPrev}
            leftIcon={<ChevronLeft className="w-4 h-4" />}
          >
            Back to Participants
          </Button>
          <Button
            variant="primary"
            onClick={handleInitiatePayment}
            disabled={processing || !agreedToTerms || !agreedToPrivacy}
            loading={processing}
            size="lg"
          >
            {processing ? 'Processing Payment...' : `Pay ${formatCurrency(total, event.currency || getDefaultCurrency())}`}
          </Button>
        </div>
      )}

      {/* Back button for Stripe payments (when payment element is shown) */}
      {selectedPaymentMethod === 'stripe' && checkout?.clientSecret && (
        <div className="flex justify-start">
          <Button
            variant="outline"
            onClick={onPrev}
            leftIcon={<ChevronLeft className="w-4 h-4" />}
          >
            Back to Participants
          </Button>
        </div>
      )}
    </div>
  );
};

export default PaymentForm;