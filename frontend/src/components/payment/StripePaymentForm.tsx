import React, { useState, useEffect } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { CreditCard, Lock, AlertCircle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';

interface StripePaymentFormProps {
  clientSecret: string;
  onSuccess: (paymentData: any) => void;
  onError?: (error: string) => void;
  isProcessing?: boolean;
  amount: number;
  currency?: string;
}

const StripePaymentForm: React.FC<StripePaymentFormProps> = ({
  clientSecret,
  onSuccess,
  onError,
  isProcessing = false,
  amount,
  currency = 'AED'
}) => {
  const stripe = useStripe();
  const elements = useElements();

  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Check if Stripe and Elements are ready
  useEffect(() => {
    if (stripe && elements) {
      setIsReady(true);
    }
  }, [stripe, elements]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      setErrorMessage('Stripe not initialized. Please refresh the page.');
      return;
    }

    if (processing || isProcessing) {
      return;
    }

    setProcessing(true);
    setErrorMessage(null);

    try {
      // Confirm the payment with Stripe
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment/success`,
        },
        redirect: 'if_required', // Handle payment in the same page if possible
      });

      if (error) {
        console.error('Payment confirmation error:', error);
        setErrorMessage(error.message || 'Payment failed. Please try again.');
        onError?.(error.message || 'Payment failed');
        toast.error('Payment failed: ' + (error.message || 'Unknown error'));
      } else if (paymentIntent) {
        // Payment successful
        const paymentData = {
          paymentIntentId: paymentIntent.id,
          status: paymentIntent.status,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          paymentMethod: paymentIntent.payment_method,
        };

        toast.success('Payment successful!');
        onSuccess(paymentData);
      }
    } catch (err: any) {
      console.error('Payment processing error:', err);
      const errorMsg = err.message || 'An unexpected error occurred';
      setErrorMessage(errorMsg);
      onError?.(errorMsg);
      toast.error('Payment processing failed');
    } finally {
      setProcessing(false);
    }
  };

  // Show loading state if Stripe is not ready
  if (!isReady) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CreditCard className="w-5 h-5 mr-2" />
            Payment Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-3 text-gray-600">Loading payment form...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <CreditCard className="w-5 h-5 mr-2 text-blue-600" />
          Payment Information
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Payment Amount Display */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Amount:</span>
              <span className="text-2xl font-bold text-gray-900">
                {currency.toUpperCase()} {amount.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Stripe Payment Element */}
          <div className="space-y-4">
            <PaymentElement
              id="payment-element"
              options={{
                layout: 'tabs',
                paymentMethodOrder: ['card', 'digital_wallet'],
                fields: {
                  billingDetails: {
                    name: 'auto',
                    email: 'auto',
                  }
                },
                terms: {
                  card: 'never',
                  auBankAccount: 'never',
                  bancontact: 'never',
                  epsBank: 'never',
                  p24Bank: 'never',
                  sepaDebit: 'never',
                  sofort: 'never',
                  usBankAccount: 'never',
                }
              }}
              className="w-full"
            />
          </div>

          {/* Error Display */}
          {errorMessage && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-600 mr-3" />
                <p className="text-sm text-red-800">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Security Notice */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start">
              <CheckCircle className="w-5 h-5 text-green-600 mr-3 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-green-800 mb-1">
                  <Lock className="inline w-4 h-4 mr-1" />
                  Secure Payment
                </p>
                <p className="text-green-700">
                  Your payment information is encrypted and secure. We use Stripe's industry-leading security.
                </p>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            disabled={!stripe || !elements || processing || isProcessing}
            loading={processing || isProcessing}
          >
            {processing || isProcessing
              ? 'Processing Payment...'
              : `Pay ${currency.toUpperCase()} ${amount.toFixed(2)}`
            }
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default StripePaymentForm;