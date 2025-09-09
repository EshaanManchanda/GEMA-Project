import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { paymentAPI } from '../../services/api';
import type { BillingAddress, CreatePaymentData } from '../../services/api/paymentAPI';
import LoadingSpinner from '../common/LoadingSpinner';

interface PaymentMethodFormProps {
  orderId?: string;
  amount?: number;
  currency?: string;
  onSuccess?: (paymentMethod: any) => void;
  onCancel?: () => void;
  mode?: 'add_method' | 'process_payment';
  className?: string;
}

interface FormData extends BillingAddress {
  savePaymentMethod: boolean;
  paymentMethodType: 'credit_card' | 'debit_card' | 'digital_wallet';
}

const PaymentMethodForm: React.FC<PaymentMethodFormProps> = ({
  orderId,
  amount = 0,
  currency = 'AED',
  onSuccess,
  onCancel,
  mode = 'add_method',
  className = ''
}) => {
  const [loading, setLoading] = useState(false);
  const [stripeLoaded, setStripeLoaded] = useState(false);
  const [paymentIntent, setPaymentIntent] = useState<any>(null);
  const [stripe, setStripe] = useState<any>(null);
  const [elements, setElements] = useState<any>(null);
  const [cardElement, setCardElement] = useState<any>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm<FormData>({
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'UAE',
      savePaymentMethod: false,
      paymentMethodType: 'credit_card'
    }
  });

  const watchCountry = watch('country');

  useEffect(() => {
    loadStripe();
  }, []);

  useEffect(() => {
    if (mode === 'process_payment' && orderId && stripeLoaded) {
      createPaymentIntent();
    }
  }, [mode, orderId, stripeLoaded]);

  const loadStripe = async () => {
    try {
      // Load Stripe.js dynamically
      if (!window.Stripe) {
        const script = document.createElement('script');
        script.src = 'https://js.stripe.com/v3/';
        script.onload = initializeStripe;
        document.head.appendChild(script);
      } else {
        initializeStripe();
      }
    } catch (error) {
      console.error('Failed to load Stripe:', error);
      toast.error('Failed to load payment system');
    }
  };

  const initializeStripe = () => {
    const stripeInstance = (window as any).Stripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);
    const elementsInstance = stripeInstance.elements();
    
    const cardElementInstance = elementsInstance.create('card', {
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
    });

    setStripe(stripeInstance);
    setElements(elementsInstance);
    setCardElement(cardElementInstance);
    setStripeLoaded(true);

    // Mount card element
    setTimeout(() => {
      const cardContainer = document.getElementById('card-element');
      if (cardContainer) {
        cardElementInstance.mount('#card-element');
      }
    }, 100);
  };

  const createPaymentIntent = async () => {
    if (!orderId) return;

    try {
      setLoading(true);
      const response = await paymentAPI.createPaymentIntent({
        orderId,
        amount: amount * 100, // Convert to cents
        currency: currency.toLowerCase(),
        paymentMethodTypes: ['card']
      });

      setPaymentIntent(response.data || response);
    } catch (error) {
      console.error('Failed to create payment intent:', error);
      toast.error('Failed to initialize payment');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    setLoading(true);

    try {
      if (!stripe || !cardElement) {
        throw new Error('Stripe not loaded');
      }

      const billingAddress: BillingAddress = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        address: data.address,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,
        country: data.country
      };

      if (mode === 'add_method') {
        // Create payment method without processing payment
        const { error, paymentMethod } = await stripe.createPaymentMethod({
          type: 'card',
          card: cardElement,
          billing_details: {
            name: `${data.firstName} ${data.lastName}`,
            email: data.email,
            phone: data.phone,
            address: {
              line1: data.address,
              city: data.city,
              state: data.state,
              postal_code: data.zipCode,
              country: data.country.toLowerCase()
            }
          }
        });

        if (error) {
          throw new Error(error.message);
        }

        if (data.savePaymentMethod) {
          // Save payment method to customer account
          await paymentAPI.attachPaymentMethod(paymentMethod.id, 'customer_id');
        }

        toast.success('Payment method added successfully');
        onSuccess?.(paymentMethod);

      } else if (mode === 'process_payment' && paymentIntent) {
        // Process payment
        const { error: confirmError } = await stripe.confirmCardPayment(
          paymentIntent.client_secret,
          {
            payment_method: {
              card: cardElement,
              billing_details: {
                name: `${data.firstName} ${data.lastName}`,
                email: data.email,
                phone: data.phone,
                address: {
                  line1: data.address,
                  city: data.city,
                  state: data.state,
                  postal_code: data.zipCode,
                  country: data.country.toLowerCase()
                }
              }
            }
          }
        );

        if (confirmError) {
          throw new Error(confirmError.message);
        }

        toast.success('Payment processed successfully');
        onSuccess?.(paymentIntent);
      }

    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error(error.message || 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  const countries = [
    { code: 'UAE', name: 'United Arab Emirates' },
    { code: 'US', name: 'United States' },
    { code: 'UK', name: 'United Kingdom' },
    { code: 'SA', name: 'Saudi Arabia' },
    { code: 'QA', name: 'Qatar' },
    { code: 'KW', name: 'Kuwait' },
    { code: 'BH', name: 'Bahrain' },
    { code: 'OM', name: 'Oman' }
  ];

  return (
    <div className={`max-w-2xl mx-auto p-6 ${className}`}>
      <div className="bg-white rounded-lg shadow-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {mode === 'add_method' ? 'Add Payment Method' : 'Payment Details'}
          </h2>
          {mode === 'process_payment' && amount > 0 && (
            <p className="text-sm text-gray-600 mt-1">
              Total: {paymentAPI.formatAmount(amount, currency)}
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Card Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Card Information</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Card Details *
              </label>
              <div 
                id="card-element"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent"
              />
              {!stripeLoaded && (
                <div className="flex items-center justify-center py-4">
                  <LoadingSpinner size="small" />
                  <span className="ml-2 text-sm text-gray-500">Loading payment system...</span>
                </div>
              )}
            </div>
          </div>

          {/* Billing Information */}
          <div className="space-y-4 border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900">Billing Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name *
                </label>
                <input
                  type="text"
                  {...register('firstName', { required: 'First name is required' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="John"
                />
                {errors.firstName && (
                  <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name *
                </label>
                <input
                  type="text"
                  {...register('lastName', { required: 'Last name is required' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Doe"
                />
                {errors.lastName && (
                  <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  {...register('email', { 
                    required: 'Email is required',
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: 'Please enter a valid email'
                    }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="john@example.com"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone *
                </label>
                <input
                  type="tel"
                  {...register('phone', { required: 'Phone is required' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="+971 50 123 4567"
                />
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address *
              </label>
              <input
                type="text"
                {...register('address', { required: 'Address is required' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Street address"
              />
              {errors.address && (
                <p className="mt-1 text-sm text-red-600">{errors.address.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City *
                </label>
                <input
                  type="text"
                  {...register('city', { required: 'City is required' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Dubai"
                />
                {errors.city && (
                  <p className="mt-1 text-sm text-red-600">{errors.city.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  State/Region *
                </label>
                <input
                  type="text"
                  {...register('state', { required: 'State/Region is required' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Dubai"
                />
                {errors.state && (
                  <p className="mt-1 text-sm text-red-600">{errors.state.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ZIP Code *
                </label>
                <input
                  type="text"
                  {...register('zipCode', { required: 'ZIP code is required' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="12345"
                />
                {errors.zipCode && (
                  <p className="mt-1 text-sm text-red-600">{errors.zipCode.message}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Country *
              </label>
              <select
                {...register('country', { required: 'Country is required' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {countries.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name}
                  </option>
                ))}
              </select>
              {errors.country && (
                <p className="mt-1 text-sm text-red-600">{errors.country.message}</p>
              )}
            </div>
          </div>

          {/* Options */}
          {mode === 'add_method' && (
            <div className="border-t pt-6">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  {...register('savePaymentMethod')}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm font-medium text-gray-700">
                  Save payment method for future use
                </span>
              </label>
            </div>
          )}

          {/* Security Notice */}
          <div className="bg-gray-50 rounded-md p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                🔒
              </div>
              <div className="ml-3">
                <p className="text-sm text-gray-600">
                  Your payment information is encrypted and secure. We use Stripe to process payments and never store your card details.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              disabled={loading || !stripeLoaded}
            >
              {loading && <LoadingSpinner size="small" className="mr-2" />}
              {mode === 'add_method' ? 'Add Payment Method' : `Pay ${paymentAPI.formatAmount(amount, currency)}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PaymentMethodForm;