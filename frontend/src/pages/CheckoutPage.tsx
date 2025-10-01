import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { CartItem, CartSummary } from '../store/slices/cartSlice';
import { orderService } from '../services/order.service';
import { useCart } from '../contexts/CartContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { FaArrowLeft, FaCreditCard, FaShieldAlt } from 'react-icons/fa';

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_51Mc53pSCHTDPvxRRg7cq9G4Nv2Hq1qck7M0O4eg0b6umLEjXXMRTuYTBoandQkbGDlElWgONwNXfc9UiOtCRYUKl007v4H2fBQ');

// Support both cart-based checkout and single-event booking
interface BookingFormData {
  quantity: number;
  name: string;
  email: string;
  phone: string;
  specialRequests: string;
}

interface CartLocationState {
  cartItems: CartItem[];
  cartSummary: CartSummary;
  coupon: {
    code: string;
    discount: number;
    type: 'percentage' | 'fixed';
  } | null;
}

interface BookingLocationState {
  event: any;
  booking: BookingFormData;
  totalPrice: number;
}

interface BillingInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

interface PaymentInfo {
  cardNumber: string;
  cardName: string;
  expiryDate: string;
  cvv: string;
}

// Stripe checkout component
const StripeCheckoutForm: React.FC<{
  cartState: CartLocationState;
  bookingState: BookingLocationState;
  billingInfo: BillingInfo;
  isCartCheckout: boolean;
  onPaymentSuccess: (orderId: string) => void;
  onPaymentError: (error: string) => void;
  isProcessing: boolean;
  setIsProcessing: (processing: boolean) => void;
}> = ({
  cartState,
  bookingState,
  billingInfo,
  isCartCheckout,
  onPaymentSuccess,
  onPaymentError,
  isProcessing,
  setIsProcessing
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const { clearCart } = useCart();

  const handleStripeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripe || !elements) {
      onPaymentError('Stripe has not loaded yet. Please try again.');
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      onPaymentError('Card element not found. Please refresh and try again.');
      return;
    }

    setIsProcessing(true);

    try {
      if (isCartCheckout) {
        // Cart-based payment processing with Stripe
        const paymentIntent = await orderService.createCartPaymentIntent(
          cartState.cartItems,
          cartState.cartSummary,
          billingInfo,
          cartState.coupon?.code
        );

        if (!paymentIntent.success || !paymentIntent.data) {
          throw new Error('Failed to create payment intent');
        }

        const { clientSecret, orderId } = paymentIntent.data;

        // Confirm payment with Stripe
        const { error: stripeError, paymentIntent: confirmedPayment } = await stripe.confirmCardPayment(
          clientSecret,
          {
            payment_method: {
              card: cardElement,
              billing_details: {
                name: `${billingInfo.firstName} ${billingInfo.lastName}`,
                email: billingInfo.email,
                phone: billingInfo.phone,
                address: {
                  line1: billingInfo.address,
                  city: billingInfo.city,
                  state: billingInfo.state,
                  postal_code: billingInfo.zipCode,
                  country: billingInfo.country
                }
              }
            }
          }
        );

        if (stripeError) {
          throw new Error(stripeError.message || 'Payment failed');
        }

        if (confirmedPayment?.status === 'succeeded') {
          // Confirm payment on backend
          await orderService.confirmCartPayment(confirmedPayment.id, orderId);
          
          // Clear cart after successful payment
          clearCart();
          
          toast.success('Payment successful! Order confirmed.');
          onPaymentSuccess(orderId);
        } else {
          throw new Error('Payment was not completed successfully');
        }
      } else {
        // Single event booking - use existing simple flow for now
        const orderData = {
          items: [{
            eventId: bookingState.event._id,
            eventTitle: bookingState.event.title,
            scheduleDate: bookingState.event.dateSchedule?.[0]?.date,
            quantity: bookingState.booking.quantity,
            unitPrice: bookingState.event.price,
            totalPrice: bookingState.totalPrice,
            currency: bookingState.event.currency || 'USD',
            participants: [{
              name: bookingState.booking.name,
              age: 0,
              specialRequirements: bookingState.booking.specialRequests
            }]
          }],
          billingAddress: {
            ...billingInfo,
            email: bookingState.booking.email,
            phone: bookingState.booking.phone,
            firstName: bookingState.booking.name.split(' ')[0] || billingInfo.firstName,
            lastName: bookingState.booking.name.split(' ').slice(1).join(' ') || billingInfo.lastName
          },
          paymentMethod: 'stripe' as const,
          notes: bookingState.booking.specialRequests,
          source: 'web' as const
        };

        const result = await orderService.createOrder(orderData);
        
        if (result.success) {
          toast.success('Order placed successfully!');
          onPaymentSuccess(result.data.orderNumber);
        } else {
          throw new Error(result.error || 'Order creation failed');
        }
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      
      // Handle failed payment
      if (isCartCheckout && err.orderId) {
        await orderService.handleFailedCartPayment(err.orderId, err.message);
      }
      
      onPaymentError(err.message || 'Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleStripeSubmit} className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Card Information</h3>
        <div className="p-4 border border-gray-300 rounded-lg">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#424770',
                  '::placeholder': {
                    color: '#aab7c4',
                  },
                },
                invalid: {
                  color: '#9e2146',
                },
              },
            }}
          />
        </div>
      </div>
      
      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full bg-primary text-white py-3 px-4 rounded-lg font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
      >
        {isProcessing ? (
          <>
            <LoadingSpinner />
            <span className="ml-2">Processing Payment...</span>
          </>
        ) : (
          <>
            <FaShieldAlt className="mr-2" />
            Complete Secure Payment
          </>
        )}
      </button>
    </form>
  );
};

const CheckoutPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { clearCart } = useCart();
  
  const [paymentMethod, setPaymentMethod] = useState<string>('credit_card');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const [billingInfo, setBillingInfo] = useState<BillingInfo>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'UAE'
  });

  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo>({
    cardNumber: '',
    cardName: '',
    expiryDate: '',
    cvv: ''
  });

  const [errors, setErrors] = useState<{[key: string]: string}>({});

  // Payment success/error handlers
  const handlePaymentSuccess = (orderId: string) => {
    navigate('/payment/success', {
      state: {
        orderId,
        ...(isCartCheckout ? {
          cartItems: cartState.cartItems,
          totalPrice: cartState.cartSummary.total
        } : {
          event: bookingState.event,
          booking: bookingState.booking,
          totalPrice: bookingState.totalPrice
        }),
        billingInfo,
        paymentMethod: 'stripe'
      }
    });
  };

  const handlePaymentError = (errorMessage: string) => {
    setError(errorMessage);
    toast.error(errorMessage);
  };

  // Determine checkout type
  const cartState = location.state as CartLocationState;
  const bookingState = location.state as BookingLocationState;
  const isCartCheckout = cartState?.cartItems && cartState.cartItems.length > 0;
  
  useEffect(() => {
    // Handle different checkout scenarios
    if (isCartCheckout) {
      // Cart-based checkout
      if (!cartState.cartItems || cartState.cartItems.length === 0) {
        toast.error('No items in cart. Please add items before checkout.');
        navigate('/cart');
      }
    } else {
      // Single event booking checkout
      if (!bookingState?.event || !bookingState?.booking) {
        navigate(`/booking/${id}`);
      }
    }
  }, [cartState, bookingState, navigate, id, isCartCheckout]);

  // Helper functions for card validation
  const formatCardNumber = (value: string) => {
    const digits = value.replace(/\D/g, '');
    let formatted = '';
    for (let i = 0; i < digits.length; i++) {
      if (i > 0 && i % 4 === 0) {
        formatted += ' ';
      }
      formatted += digits[i];
    }
    return formatted.substring(0, 19);
  };

  const formatExpiryDate = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 2) {
      return digits;
    } else {
      return `${digits.substring(0, 2)}/${digits.substring(2, 4)}`;
    }
  };

  const validateForm = (): boolean => {
    const newErrors: {[key: string]: string} = {};

    // Billing validation
    if (!billingInfo.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!billingInfo.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!billingInfo.email.trim()) newErrors.email = 'Email is required';
    if (!/\S+@\S+\.\S+/.test(billingInfo.email)) newErrors.email = 'Email is invalid';
    if (!billingInfo.phone.trim()) newErrors.phone = 'Phone is required';
    if (!billingInfo.address.trim()) newErrors.address = 'Address is required';
    if (!billingInfo.city.trim()) newErrors.city = 'City is required';
    if (!billingInfo.zipCode.trim()) newErrors.zipCode = 'ZIP code is required';

    // Payment validation (for credit card)
    if (paymentMethod === 'credit_card') {
      if (!paymentInfo.cardNumber || paymentInfo.cardNumber.replace(/\s/g, '').length < 13) {
        newErrors.cardNumber = 'Please enter a valid card number';
      }
      if (!paymentInfo.cardName.trim()) newErrors.cardName = 'Cardholder name is required';
      if (!paymentInfo.expiryDate || paymentInfo.expiryDate.length < 5) {
        newErrors.expiryDate = 'Please enter a valid expiry date';
      }
      if (!paymentInfo.cvv || paymentInfo.cvv.length < 3) {
        newErrors.cvv = 'Please enter a valid CVV';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!validateForm()) {
      setError('Please fix the errors below');
      return;
    }

    setIsProcessing(true);

    try {
      let orderData;
      
      if (isCartCheckout) {
        // Cart-based order
        orderData = {
          items: cartState.cartItems.map(item => ({
            eventId: item.event._id,
            eventTitle: item.event.title,
            scheduleDate: item.selectedDate || item.event.dateSchedule?.[0]?.date,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            currency: item.currency,
            participants: item.participants || []
          })),
          billingAddress: billingInfo,
          paymentMethod: paymentMethod as 'stripe' | 'paypal',
          couponCode: cartState.coupon?.code,
          notes: '',
          source: 'web' as const
        };
      } else {
        // Single event booking
        orderData = {
          items: [{
            eventId: bookingState.event._id,
            eventTitle: bookingState.event.title,
            scheduleDate: bookingState.event.dateSchedule?.[0]?.date,
            quantity: bookingState.booking.quantity,
            unitPrice: bookingState.event.price,
            totalPrice: bookingState.totalPrice,
            currency: bookingState.event.currency || 'USD',
            participants: [{
              name: bookingState.booking.name,
              age: 0, // Default age
              specialRequirements: bookingState.booking.specialRequests
            }]
          }],
          billingAddress: {
            ...billingInfo,
            email: bookingState.booking.email,
            phone: bookingState.booking.phone,
            firstName: bookingState.booking.name.split(' ')[0] || billingInfo.firstName,
            lastName: bookingState.booking.name.split(' ').slice(1).join(' ') || billingInfo.lastName
          },
          paymentMethod: paymentMethod as 'stripe' | 'paypal',
          notes: bookingState.booking.specialRequests,
          source: 'web' as const
        };
      }

      // Create order
      const result = await orderService.createOrder(orderData);
      
      if (result.success) {
        // Clear cart if it was a cart checkout
        if (isCartCheckout) {
          clearCart();
        }
        
        toast.success('Order placed successfully!');
        
        // Redirect to success page
        navigate('/payment/success', {
          state: {
            orderId: result.data.orderNumber,
            paymentId: result.data.transactionId,
            ...(isCartCheckout ? {
              cartItems: cartState.cartItems,
              totalPrice: cartState.cartSummary.total
            } : {
              event: bookingState.event,
              booking: bookingState.booking,
              totalPrice: bookingState.totalPrice
            }),
            billingInfo,
            paymentMethod
          }
        });
      } else {
        throw new Error(result.error || 'Order creation failed');
      }
      
    } catch (err: any) {
      console.error('Checkout error:', err);
      setError(err.message || 'Checkout failed. Please try again.');
      toast.error('Checkout failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Show loading if we're determining the checkout type
  if (isCartCheckout && (!cartState || !cartState.cartItems || cartState.cartItems.length === 0)) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <LoadingSpinner size="large" />
        <p className="mt-4">Redirecting to cart...</p>
      </div>
    );
  }

  if (!isCartCheckout && (!bookingState || !bookingState.event || !bookingState.booking)) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <LoadingSpinner size="large" />
        <p className="mt-4">Redirecting to booking page...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back button */}
      <button 
        onClick={() => navigate(isCartCheckout ? '/cart' : `/booking/${id}`)} 
        className="flex items-center text-primary hover:text-primary-dark mb-6 transition-colors"
      >
        <FaArrowLeft className="mr-2" />
        Back {isCartCheckout ? 'to Cart' : 'to Booking'}
      </button>

      <h1 className="text-3xl font-bold mb-6">Checkout</h1>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Order Summary */}
        <div className="lg:w-1/3">
          <div className="bg-white rounded-lg shadow-md p-6 sticky top-6">
            <h2 className="text-xl font-bold mb-4">Order Summary</h2>
            
            {/* Items */}
            <div className="space-y-4 mb-6">
              {isCartCheckout ? (
                // Cart items
                cartState.cartItems.map((item) => {
                  const event = item.event;
                  const eventDate = item.selectedDate 
                    ? new Date(item.selectedDate) 
                    : event.dateSchedule?.[0]?.date 
                      ? new Date(event.dateSchedule[0].date) 
                      : null;

                  return (
                    <div key={item.id} className="flex items-center space-x-3 pb-4 border-b">
                      <img 
                        src={event.images?.[0] || 'https://placehold.co/400x300?text=Event+Image&font=roboto'} 
                        alt={event.title} 
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                      <div className="flex-1">
                        <h3 className="font-medium text-sm mb-1">{event.title}</h3>
                        <div className="text-xs text-gray-600 mb-1">
                          {eventDate ? format(eventDate, 'MMM d, yyyy') : 'Date TBD'}
                        </div>
                        <div className="text-xs text-gray-600">
                          Qty: {item.quantity} × ${item.unitPrice.toFixed(2)}
                        </div>
                      </div>
                      <div className="text-sm font-semibold">
                        ${item.totalPrice.toFixed(2)}
                      </div>
                    </div>
                  );
                })
              ) : (
                // Single event booking
                <div className="flex items-center space-x-3 pb-4 border-b">
                  <img 
                    src={bookingState.event.images?.[0] || 'https://placehold.co/400x300?text=Event+Image&font=roboto'} 
                    alt={bookingState.event.title} 
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <h3 className="font-medium text-sm mb-1">{bookingState.event.title}</h3>
                    <div className="text-xs text-gray-600 mb-1">
                      {bookingState.event.dateSchedule?.[0]?.date ? 
                        format(new Date(bookingState.event.dateSchedule[0].date), 'MMM d, yyyy') : 'Date TBD'}
                    </div>
                    <div className="text-xs text-gray-600">
                      Qty: {bookingState.booking.quantity} × ${bookingState.event.price.toFixed(2)}
                    </div>
                  </div>
                  <div className="text-sm font-semibold">
                    ${bookingState.totalPrice.toFixed(2)}
                  </div>
                </div>
              )}
            </div>
            
            {/* Summary */}
            <div className="space-y-2 mb-6">
              {isCartCheckout ? (
                <>
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>${cartState.cartSummary.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Service Fee:</span>
                    <span>${cartState.cartSummary.serviceFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Tax:</span>
                    <span>${cartState.cartSummary.tax.toFixed(2)}</span>
                  </div>
                  {cartState.coupon && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Discount ({cartState.coupon.code}):</span>
                      <span>-${cartState.cartSummary.discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t pt-2">
                    <div className="flex justify-between font-bold">
                      <span>Total:</span>
                      <span>${cartState.cartSummary.total.toFixed(2)}</span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>${(bookingState.event.price * bookingState.booking.quantity).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Service Fee:</span>
                    <span>${(bookingState.event.price * bookingState.booking.quantity * 0.1).toFixed(2)}</span>
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex justify-between font-bold">
                      <span>Total:</span>
                      <span>${bookingState.totalPrice.toFixed(2)}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        
        {/* Checkout Form */}
        <div className="lg:w-2/3">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold mb-6">Payment Details</h2>
            
            {error && (
              <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6">
                <p className="font-bold">Error</p>
                <p>{error}</p>
              </div>
            )}
            
            <div className="space-y-6">
              {/* Billing Information */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Billing Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">First Name *</label>
                    <input
                      type="text"
                      value={billingInfo.firstName}
                      onChange={(e) => setBillingInfo({...billingInfo, firstName: e.target.value})}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                        errors.firstName ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {errors.firstName && <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Last Name *</label>
                    <input
                      type="text"
                      value={billingInfo.lastName}
                      onChange={(e) => setBillingInfo({...billingInfo, lastName: e.target.value})}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                        errors.lastName ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {errors.lastName && <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Email *</label>
                    <input
                      type="email"
                      value={billingInfo.email}
                      onChange={(e) => setBillingInfo({...billingInfo, email: e.target.value})}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                        errors.email ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Phone *</label>
                    <input
                      type="tel"
                      value={billingInfo.phone}
                      onChange={(e) => setBillingInfo({...billingInfo, phone: e.target.value})}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                        errors.phone ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-2">Address *</label>
                    <input
                      type="text"
                      value={billingInfo.address}
                      onChange={(e) => setBillingInfo({...billingInfo, address: e.target.value})}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                        errors.address ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {errors.address && <p className="text-red-500 text-sm mt-1">{errors.address}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">City *</label>
                    <input
                      type="text"
                      value={billingInfo.city}
                      onChange={(e) => setBillingInfo({...billingInfo, city: e.target.value})}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                        errors.city ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {errors.city && <p className="text-red-500 text-sm mt-1">{errors.city}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">ZIP Code *</label>
                    <input
                      type="text"
                      value={billingInfo.zipCode}
                      onChange={(e) => setBillingInfo({...billingInfo, zipCode: e.target.value})}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                        errors.zipCode ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {errors.zipCode && <p className="text-red-500 text-sm mt-1">{errors.zipCode}</p>}
                  </div>
                </div>
              </div>

              {/* Stripe Payment Form */}
              <StripeCheckoutForm
                cartState={cartState}
                bookingState={bookingState}
                billingInfo={billingInfo}
                isCartCheckout={isCartCheckout}
                onPaymentSuccess={handlePaymentSuccess}
                onPaymentError={handlePaymentError}
                isProcessing={isProcessing}
                setIsProcessing={setIsProcessing}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Wrapped with Stripe Elements provider
const CheckoutPageWithStripe: React.FC = () => {
  return (
    <Elements stripe={stripePromise}>
      <CheckoutPage />
    </Elements>
  );
};

export default CheckoutPageWithStripe;