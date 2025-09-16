import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { CreditCard, Shield, Lock, AlertCircle, CheckCircle, ChevronLeft } from 'lucide-react';
import toast from 'react-hot-toast';

import { AppDispatch } from '../../store';
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
  const bookingFlow = useSelector(selectBookingFlow);
  const participants = useSelector(selectBookingParticipants);
  const checkout = useSelector(selectCheckout);
  const { handleError } = useErrorHandler();

  // Local state
  const [processing, setProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(
    bookingFlow.paymentMethod || 'stripe'
  );
  const [agreedToTerms, setAgreedToTermsLocal] = useState(bookingFlow.agreedToTerms);
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);

  // Payment methods configuration
  const paymentMethods = [
    {
      id: 'stripe',
      name: 'Credit/Debit Card',
      description: 'Visa, Mastercard, American Express',
      icon: CreditCard,
      popular: true,
    },
    {
      id: 'paypal',
      name: 'PayPal',
      description: 'Pay with your PayPal account',
      icon: CreditCard,
      popular: false,
    },
  ];

  // Update Redux state when local state changes
  useEffect(() => {
    dispatch(setPaymentMethod(selectedPaymentMethod));
  }, [selectedPaymentMethod, dispatch]);

  useEffect(() => {
    dispatch(setAgreedToTerms(agreedToTerms));
  }, [agreedToTerms, dispatch]);

  // Calculate total amount
  const calculateTotal = () => {
    const basePrice = event.price;
    const participantCount = participants.length;
    const subtotal = basePrice * participantCount;
    
    // Apply discount if coupon is applied
    const discountAmount = bookingFlow.couponCode ? subtotal * 0.1 : 0; // 10% discount example
    const serviceFee = subtotal * 0.05; // 5% service fee
    const tax = (subtotal - discountAmount + serviceFee) * 0.05; // 5% tax
    const total = subtotal - discountAmount + serviceFee + tax;

    return {
      subtotal,
      discountAmount,
      serviceFee,
      tax,
      total,
    };
  };

  const { subtotal, discountAmount, serviceFee, tax, total } = calculateTotal();

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

  // Handle payment initiation
  const handleInitiatePayment = async () => {
    if (!validateForm()) return;

    if (!event.dateSchedule?.[0]) {
      setPaymentError('Event schedule information is missing');
      return;
    }

    setProcessing(true);
    setPaymentError(null);

    try {
      // Prepare booking data for API
      const bookingData: InitiateBookingData = {
        eventId: event._id,
        dateScheduleId: event.dateSchedule[0]._id,
        seats: participants.length,
        paymentMethod: selectedPaymentMethod as 'stripe' | 'paypal',
      };

      // Initiate booking with payment intent
      const response = await bookingAPI.initiateBooking(bookingData);
      
      if (response.paymentIntentId && response.clientSecret) {
        // Payment intent created successfully
        toast.success('Payment session initialized');
        
        if (selectedPaymentMethod === 'stripe') {
          // For demo purposes, simulate successful payment
          // In a real implementation, you would integrate with Stripe Elements here
          setTimeout(() => {
            toast.success('Payment processed successfully!');
            onNext();
          }, 2000);
        } else {
          // Handle other payment methods
          onNext();
        }
      } else {
        throw new Error('Failed to create payment session');
      }
    } catch (error: any) {
      const apiError = handleError(error, {
        component: 'PaymentForm',
        action: 'initiatePayment',
        eventId: event._id,
      });
      
      setPaymentError(apiError.message);
      toast.error('Payment initialization failed');
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
                    {method.popular && (
                      <span className="ml-2 px-2 py-1 text-xs bg-primary text-white rounded-full">
                        Popular
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{method.description}</p>
                </div>
                <Shield className="w-5 h-5 text-green-500" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Mock Stripe Elements (for demo) */}
      {selectedPaymentMethod === 'stripe' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Lock className="w-5 h-5 mr-2" />
              Card Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 border border-gray-200 rounded-lg bg-gray-50 text-center">
                <div className="flex items-center justify-center mb-2">
                  <CreditCard className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-600 text-sm mb-2">
                  Stripe Payment Elements would be integrated here
                </p>
                <p className="text-xs text-gray-500">
                  This is a demo - actual Stripe integration requires additional setup
                </p>
              </div>
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
              <span>{event.currency} {subtotal.toFixed(2)}</span>
            </div>
            
            {discountAmount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount ({bookingFlow.couponCode})</span>
                <span>-{event.currency} {discountAmount.toFixed(2)}</span>
              </div>
            )}
            
            <div className="flex justify-between text-sm text-gray-600">
              <span>Service Fee (5%)</span>
              <span>{event.currency} {serviceFee.toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between text-sm text-gray-600">
              <span>Tax (5%)</span>
              <span>{event.currency} {tax.toFixed(2)}</span>
            </div>
            
            <div className="border-t pt-3">
              <div className="flex justify-between text-lg font-bold">
                <span>Total Amount</span>
                <span>{event.currency} {total.toFixed(2)}</span>
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

      {/* Action Buttons */}
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
          {processing ? 'Processing Payment...' : `Pay ${event.currency} ${total.toFixed(2)}`}
        </Button>
      </div>
    </div>
  );
};

export default PaymentForm;