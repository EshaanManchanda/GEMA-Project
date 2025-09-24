import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { format } from 'date-fns';
import { ArrowLeft, CreditCard, Shield, CheckCircle } from 'lucide-react';

import { AppDispatch, RootState } from '../store';
import {
  createPaymentIntent,
  confirmPayment,
  selectCheckout,
  selectIsCreatingBooking
} from '../store/slices/bookingsSlice';

import { Event } from '../types/event';
import Button from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import StripePaymentForm from '../components/payment/StripePaymentForm';
import LoadingSpinner from '../components/common/LoadingSpinner';
import CouponValidator from '../components/checkout/CouponValidator';
import SEO from '../components/common/SEO';

interface BookingFormData {
  quantity: number;
  name: string;
  email: string;
  phone: string;
  specialRequests: string;
}

interface LocationState {
  event: Event;
  booking: BookingFormData;
  totalPrice: number;
}

const CheckoutPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();

  const state = location.state as LocationState | null;
  const checkout = useSelector(selectCheckout);
  const isCreatingBooking = useSelector(selectIsCreatingBooking);

  const [isProcessing, setIsProcessing] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [finalTotal, setFinalTotal] = useState(state?.totalPrice || 0);

  useEffect(() => {
    // If no state is passed, redirect to home page
    if (!state || !state.event || !state.booking) {
      navigate('/');
      return;
    }

    // Create payment intent when component mounts
    if (state.totalPrice > 0) {
      // Get the first available schedule ID if not provided
      const dateScheduleId = state.event.dateSchedule?.[0]?._id || state.event.dateSchedule?.[0]?.id;

      dispatch(createPaymentIntent({
        eventId: state.event.id,
        participants: state.booking.quantity,
        dateScheduleId: dateScheduleId
      }));
    }

    // Scroll to top
    window.scrollTo(0, 0);
  }, [state, navigate, dispatch]);

  const handlePaymentSuccess = async (paymentData: any) => {
    try {
      setIsProcessing(true);

      const result = await dispatch(confirmPayment({
        paymentIntentId: paymentData.paymentIntentId,
        bookingData: state!.booking
      }));

      if (result.type === 'bookings/confirmPayment/fulfilled') {
        navigate('/payment/success', {
          state: {
            orderId: result.payload.orderId,
            event: state!.event,
            booking: state!.booking,
            totalPrice: state!.totalPrice
          }
        });
      }
    } catch (error) {
      console.error('Payment confirmation failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleCouponApplied = (coupon: any, discount: number) => {
    setAppliedCoupon(coupon);
    setDiscountAmount(discount);
    setFinalTotal(state!.totalPrice - discount);
  };

  const handleCouponRemoved = () => {
    setAppliedCoupon(null);
    setDiscountAmount(0);
    setFinalTotal(state!.totalPrice);
  };

  if (!state) {
    return null;
  }

  const { event, booking, totalPrice } = state;

  return (
    <>
      <SEO
        title={`Checkout - ${event.title} | Gema Events`}
        description={`Complete your booking for ${event.title}. Secure payment with Stripe.`}
        noIndex={true}
        noFollow={true}
      />
      <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={handleGoBack}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Booking
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
          <p className="text-gray-600 mt-2">Complete your booking for {event.title}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Order Summary */}
          <div className="order-2 lg:order-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Event Details */}
                <div className="flex space-x-4">
                  <img
                    src={event.image}
                    alt={event.title}
                    className="w-20 h-20 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{event.title}</h3>
                    <p className="text-sm text-gray-600">{event.category}</p>
                    <p className="text-sm text-gray-600">
                      {format(new Date(event.date), 'PPP')} at {event.time}
                    </p>
                    <p className="text-sm text-gray-600">{event.location}</p>
                  </div>
                </div>

                {/* Booking Details */}
                <div className="border-t pt-4">
                  <h4 className="font-medium text-gray-900 mb-3">Booking Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Quantity:</span>
                      <span className="text-gray-900">{booking.quantity} ticket(s)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Name:</span>
                      <span className="text-gray-900">{booking.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Email:</span>
                      <span className="text-gray-900">{booking.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Phone:</span>
                      <span className="text-gray-900">{booking.phone}</span>
                    </div>
                    {booking.specialRequests && (
                      <div className="pt-2">
                        <span className="text-gray-600 block mb-1">Special Requests:</span>
                        <p className="text-gray-900 text-xs bg-gray-50 p-2 rounded">
                          {booking.specialRequests}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Price Breakdown */}
                <div className="border-t pt-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        Ticket Price × {booking.quantity}
                      </span>
                      <span className="text-gray-900">
                        ${(event.price * booking.quantity).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Service Fee</span>
                      <span className="text-gray-900">$2.50</span>
                    </div>
                    {appliedCoupon && discountAmount > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Discount ({appliedCoupon.code})</span>
                        <span>-${discountAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="border-t pt-2 flex justify-between font-semibold">
                      <span className="text-gray-900">Total</span>
                      <span className="text-gray-900">${finalTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payment Form */}
          <div className="order-1 lg:order-2 space-y-6">
            {/* Coupon Validator */}
            <CouponValidator
              orderAmount={totalPrice}
              eventIds={[event.id]}
              onCouponApplied={handleCouponApplied}
              onCouponRemoved={handleCouponRemoved}
              appliedCoupon={appliedCoupon}
            />

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CreditCard className="w-5 h-5 mr-2 text-blue-600" />
                  Payment Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                {checkout?.clientSecret ? (
                  <StripePaymentForm
                    clientSecret={checkout.clientSecret}
                    onSuccess={handlePaymentSuccess}
                    isProcessing={isProcessing || isCreatingBooking}
                    amount={finalTotal}
                    currency="USD"
                  />
                ) : (
                  <div className="flex justify-center items-center py-8">
                    <LoadingSpinner size="large" text="Preparing payment..." />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      </div>
    </>
  );
};

export default CheckoutPage;