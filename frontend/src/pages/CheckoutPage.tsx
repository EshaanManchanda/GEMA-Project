import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import { format } from 'date-fns';

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

interface LocationState {
  event: Event;
  booking: BookingFormData;
  totalPrice: number;
}

const CheckoutPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [paymentMethod, setPaymentMethod] = useState<string>('credit_card');
  const [cardNumber, setCardNumber] = useState<string>('');
  const [cardName, setCardName] = useState<string>('');
  const [expiryDate, setExpiryDate] = useState<string>('');
  const [cvv, setCvv] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Get data from location state
  const state = location.state as LocationState | null;
  
  useEffect(() => {
    // If no state is passed, redirect to booking page
    if (!state || !state.event || !state.booking) {
      navigate(`/booking/${id}`);
    }
  }, [state, id, navigate]);

  const handlePaymentMethodChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPaymentMethod(e.target.value);
  };

  const formatCardNumber = (value: string) => {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, '');
    
    // Add space after every 4 digits
    let formatted = '';
    for (let i = 0; i < digits.length; i++) {
      if (i > 0 && i % 4 === 0) {
        formatted += ' ';
      }
      formatted += digits[i];
    }
    
    return formatted.substring(0, 19); // Limit to 16 digits + 3 spaces
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value);
    setCardNumber(formatted);
  };

  const formatExpiryDate = (value: string) => {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, '');
    
    // Format as MM/YY
    if (digits.length <= 2) {
      return digits;
    } else {
      return `${digits.substring(0, 2)}/${digits.substring(2, 4)}`;
    }
  };

  const handleExpiryDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatExpiryDate(e.target.value);
    setExpiryDate(formatted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (paymentMethod === 'credit_card') {
      if (!cardNumber || cardNumber.replace(/\s/g, '').length < 16) {
        setError('Please enter a valid card number');
        return;
      }
      if (!cardName) {
        setError('Please enter the cardholder name');
        return;
      }
      if (!expiryDate || expiryDate.length < 5) {
        setError('Please enter a valid expiry date');
        return;
      }
      if (!cvv || cvv.length < 3) {
        setError('Please enter a valid CVV');
        return;
      }
    }
    
    setError(null);
    setIsProcessing(true);
    
    try {
      // In a real app, you would process payment through a payment gateway
      // const response = await fetch('/api/payments', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     eventId: id,
      //     booking: state?.booking,
      //     payment: {
      //       method: paymentMethod,
      //       cardDetails: paymentMethod === 'credit_card' ? {
      //         number: cardNumber.replace(/\s/g, ''),
      //         name: cardName,
      //         expiry: expiryDate,
      //         cvv
      //       } : null
      //     }
      //   })
      // });
      // const data = await response.json();
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // For demo purposes, randomly succeed or fail
      const isSuccess = Math.random() > 0.2; // 80% success rate
      
      if (isSuccess) {
        // Redirect to success page
        navigate('/payment/success', {
          state: {
            orderId: `ORD-${Date.now()}`,
            event: state?.event,
            booking: state?.booking,
            totalPrice: state?.totalPrice
          }
        });
      } else {
        throw new Error('Payment processing failed');
      }
    } catch (err) {
      console.error('Payment error:', err);
      setError('Payment processing failed. Please try again.');
      setIsProcessing(false);
    }
  };

  if (!state || !state.event || !state.booking) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
        <p>Redirecting to booking page...</p>
      </div>
    );
  }

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

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back button */}
      <button 
        onClick={() => navigate(-1)} 
        className="flex items-center text-primary hover:text-primary-dark mb-6 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      <h1 className="text-3xl font-bold mb-6">Checkout</h1>

      <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6" role="alert">
        <p className="font-bold">Demo Mode</p>
        <p>This is a demo checkout page. No real payments will be processed.</p>
        <p className="mt-1">For testing: Use any card number, name, expiry date, and CVV.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Order Summary */}
        <div className="lg:w-1/3">
          <div className="bg-white rounded-lg shadow-md p-6 sticky top-6">
            <h2 className="text-xl font-bold mb-4">Order Summary</h2>
            
            <div className="flex items-center mb-6 pb-6 border-b border-gray-200">
              <img 
                src={state.event.image} 
                alt={state.event.title} 
                className="w-24 h-24 object-cover rounded-lg mr-4"
              />
              <div>
                <h3 className="font-medium text-lg mb-1">{state.event.title}</h3>
                <div className="flex items-center text-sm text-gray-600 mb-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>{formatEventDate(state.event.date, state.event.time)}</span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>{state.event.location}</span>
                </div>
              </div>
            </div>
            
            <div className="mb-6">
              <h3 className="font-medium mb-3">Price Details</h3>
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">{state.event.price.toFixed(2)} × {state.booking.quantity} {state.booking.quantity > 1 ? 'tickets' : 'ticket'}</span>
                <span>${(state.event.price * state.booking.quantity).toFixed(2)}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Service Fee</span>
                <span>${(state.event.price * state.booking.quantity * 0.1).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-4 border-t border-gray-200">
                <span>Total</span>
                <span>${state.totalPrice.toFixed(2)}</span>
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium mb-3">Attendee Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex">
                  <span className="text-gray-600 w-24">Name:</span>
                  <span className="font-medium">{state.booking.name}</span>
                </div>
                <div className="flex">
                  <span className="text-gray-600 w-24">Email:</span>
                  <span className="font-medium">{state.booking.email}</span>
                </div>
                <div className="flex">
                  <span className="text-gray-600 w-24">Phone:</span>
                  <span className="font-medium">{state.booking.phone}</span>
                </div>
                {state.booking.specialRequests && (
                  <div className="mt-2">
                    <span className="text-gray-600 block mb-1">Special Requests:</span>
                    <p className="bg-white p-2 rounded border border-gray-200 text-sm">{state.booking.specialRequests}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 text-xs text-gray-500">
              <p>By proceeding with payment, you agree to our <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link> and <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.</p>
            </div>
          </div>
        </div>
        
        {/* Payment Form */}
        <div className="lg:w-2/3">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold mb-6">Payment Details</h2>
            
            {error && (
              <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
                <p className="font-bold">Error</p>
                <p>{error}</p>
              </div>
            )}
            
            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <h3 className="font-bold mb-4">Payment Method</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${paymentMethod === 'credit_card' ? 'border-primary bg-primary bg-opacity-5' : 'hover:bg-gray-50'}`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="credit_card"
                      checked={paymentMethod === 'credit_card'}
                      onChange={handlePaymentMethodChange}
                      className="mr-3 h-5 w-5 text-primary"
                    />
                    <div className="flex items-center">
                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 mr-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                      </div>
                      <div>
                        <span className="font-medium block">Credit Card</span>
                        <span className="text-xs text-gray-500">Visa, Mastercard, Amex</span>
                      </div>
                    </div>
                  </label>
                  
                  <label className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${paymentMethod === 'paypal' ? 'border-primary bg-primary bg-opacity-5' : 'hover:bg-gray-50'}`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="paypal"
                      checked={paymentMethod === 'paypal'}
                      onChange={handlePaymentMethodChange}
                      className="mr-3 h-5 w-5 text-primary"
                    />
                    <div className="flex items-center">
                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 mr-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <div>
                        <span className="font-medium block">PayPal</span>
                        <span className="text-xs text-gray-500">Fast and secure</span>
                      </div>
                    </div>
                  </label>
                </div>
              </div>
              
              {paymentMethod === 'credit_card' && (
                <div className="space-y-6 mt-6">
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-medium">Card Information</h3>
                      <div className="flex space-x-2">
                        <span className="inline-block w-8 h-5 bg-blue-600 rounded"></span>
                        <span className="inline-block w-8 h-5 bg-red-500 rounded"></span>
                        <span className="inline-block w-8 h-5 bg-yellow-400 rounded"></span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mb-4">All transactions are secure and encrypted.</p>
                    
                    <div className="mb-4">
                      <label htmlFor="cardNumber" className="block text-gray-700 text-sm font-medium mb-2">Card Number</label>
                      <div className="relative">
                        <input
                          type="text"
                          id="cardNumber"
                          value={cardNumber}
                          onChange={handleCardNumberChange}
                          placeholder="1234 5678 9012 3456"
                          maxLength={19}
                          className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                          required
                        />
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <label htmlFor="cardName" className="block text-gray-700 text-sm font-medium mb-2">Cardholder Name</label>
                      <input
                        type="text"
                        id="cardName"
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                        required
                      />
                    </div>
                    
                    <div className="flex gap-4">
                      <div className="w-1/2">
                        <label htmlFor="expiryDate" className="block text-gray-700 text-sm font-medium mb-2">Expiry Date</label>
                        <input
                          type="text"
                          id="expiryDate"
                          value={expiryDate}
                          onChange={handleExpiryDateChange}
                          placeholder="MM/YY"
                          maxLength={5}
                          className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                          required
                        />
                      </div>
                      
                      <div className="w-1/2">
                        <label htmlFor="cvv" className="block text-gray-700 text-sm font-medium mb-2">CVV</label>
                        <div className="relative">
                          <input
                            type="text"
                            id="cvv"
                            value={cvv}
                            onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').substring(0, 4))}
                            placeholder="123"
                            maxLength={4}
                            className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                            required
                          />
                          <button 
                            type="button" 
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            title="CVV is the 3-digit code on the back of your card"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h3 className="font-medium mb-2">Billing Address</h3>
                    <div className="flex items-center mb-4">
                      <input 
                        type="checkbox" 
                        id="sameAsShipping" 
                        className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                        defaultChecked 
                      />
                      <label htmlFor="sameAsShipping" className="ml-2 block text-sm text-gray-700">
                        Same as attendee address
                      </label>
                    </div>
                  </div>
                </div>
              )}
              
              {paymentMethod === 'paypal' && (
                <div className="bg-blue-50 p-6 rounded-lg text-center mt-6 border border-blue-100">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium mb-2">Pay with PayPal</h3>
                  <p className="mb-4 text-gray-600">You will be redirected to PayPal to complete your payment securely.</p>
                  <div className="bg-white p-3 rounded-lg border border-gray-200 mb-4 mx-auto max-w-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Amount:</span>
                      <span className="font-bold">${state.totalPrice.toFixed(2)}</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500">Note: This is a demo. No actual PayPal integration is implemented.</p>
                </div>
              )}
              
              <div className="mt-8">
                <button
                  type="submit"
                  disabled={isProcessing}
                  className={`w-full py-4 ${isProcessing ? 'bg-gray-400' : 'bg-primary hover:bg-primary-dark'} text-white rounded-lg transition-colors font-medium flex justify-center items-center shadow-md`}
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
                      Processing Payment...
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      Pay ${state.totalPrice.toFixed(2)} Securely
                    </>
                  )}
                </button>
              </div>
              
              <div className="mt-6 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span className="text-sm text-gray-600">Secure payment processing</span>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;