import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { paymentAPI } from '../../services/api/index';
import type { PaymentIntent, PaymentStatus } from '../../services/api/index';
import LoadingSpinner from '../common/LoadingSpinner';
import PaymentMethodForm from '../forms/PaymentMethodForm';

interface PaymentProcessorProps {
  orderId: string;
  amount: number;
  currency?: string;
  onSuccess?: (paymentResult: any) => void;
  onError?: (error: string) => void;
  onCancel?: () => void;
  allowSavePaymentMethod?: boolean;
  showOrderSummary?: boolean;
  className?: string;
}

interface OrderSummary {
  subtotal: number;
  discount: number;
  platformFee: number;
  total: number;
}

const PaymentProcessor: React.FC<PaymentProcessorProps> = ({
  orderId,
  amount,
  currency = 'AED',
  onSuccess,
  onError,
  onCancel,
  allowSavePaymentMethod = true,
  showOrderSummary = true,
  className = ''
}) => {
  const [processing, setProcessing] = useState(false);
  const [paymentIntent, setPaymentIntent] = useState<PaymentIntent | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);
  const [orderSummary, setOrderSummary] = useState<OrderSummary | null>(null);
  const [step, setStep] = useState<'loading' | 'payment' | 'processing' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    initializePayment();
  }, [orderId, amount]);

  const initializePayment = async () => {
    try {
      setStep('loading');
      
      // Create payment intent
      const intentResponse = await paymentAPI.createPaymentIntent({
        orderId,
        amount: amount * 100, // Convert to cents
        currency: currency.toLowerCase(),
        paymentMethodTypes: ['card']
      });

      const intent = intentResponse.data || intentResponse;
      setPaymentIntent(intent);

      // Get order details for summary
      if (showOrderSummary) {
        try {
          // Assuming we have an order API to get order details
          // For now, we'll create a basic summary
          setOrderSummary({
            subtotal: amount,
            discount: 0,
            platformFee: 0,
            total: amount
          });
        } catch (error) {
          console.warn('Could not load order summary:', error);
        }
      }

      setStep('payment');
    } catch (error: any) {
      console.error('Failed to initialize payment:', error);
      const errorMessage = error.response?.data?.message || 'Failed to initialize payment';
      setError(errorMessage);
      setStep('error');
      onError?.(errorMessage);
    }
  };

  const handlePaymentSuccess = async (paymentResult: any) => {
    setProcessing(true);
    setStep('processing');

    try {
      // Verify payment on backend
      const verification = await paymentAPI.getPaymentIntent(paymentResult.id || paymentIntent?.id);
      const verificationResult = verification.data || verification;

      if (verificationResult.status === 'succeeded') {
        setPaymentStatus('completed');
        setStep('success');
        toast.success('Payment completed successfully!');
        onSuccess?.(paymentResult);
      } else {
        throw new Error('Payment verification failed');
      }
    } catch (error: any) {
      console.error('Payment verification failed:', error);
      const errorMessage = error.response?.data?.message || 'Payment verification failed';
      setError(errorMessage);
      setStep('error');
      onError?.(errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  const handlePaymentError = (errorMessage: string) => {
    setError(errorMessage);
    setStep('error');
    onError?.(errorMessage);
    toast.error(errorMessage);
  };

  const retry = () => {
    setError('');
    initializePayment();
  };

  const formatAmount = (amt: number) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency,
    }).format(amt);
  };

  const renderOrderSummary = () => {
    if (!showOrderSummary || !orderSummary) return null;

    return (
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-3">Order Summary</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Subtotal</span>
            <span>{formatAmount(orderSummary.subtotal)}</span>
          </div>
          {orderSummary.discount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Discount</span>
              <span>-{formatAmount(orderSummary.discount)}</span>
            </div>
          )}
          {orderSummary.platformFee > 0 && (
            <div className="flex justify-between text-sm">
              <span>Platform Fee</span>
              <span>{formatAmount(orderSummary.platformFee)}</span>
            </div>
          )}
          <div className="border-t border-gray-200 pt-2">
            <div className="flex justify-between font-semibold text-lg">
              <span>Total</span>
              <span>{formatAmount(orderSummary.total)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderStep = () => {
    switch (step) {
      case 'loading':
        return (
          <div className="text-center py-8">
            <LoadingSpinner size="large" />
            <p className="mt-4 text-gray-600">Initializing payment...</p>
          </div>
        );

      case 'payment':
        return (
          <div>
            {renderOrderSummary()}
            <PaymentMethodForm
              orderId={orderId}
              amount={amount}
              currency={currency}
              mode="process_payment"
              onSuccess={handlePaymentSuccess}
              onCancel={onCancel}
            />
          </div>
        );

      case 'processing':
        return (
          <div className="text-center py-8">
            <LoadingSpinner size="large" />
            <p className="mt-4 text-gray-600">Processing payment...</p>
            <p className="text-sm text-gray-500 mt-2">Please do not refresh or close this page</p>
          </div>
        );

      case 'success':
        return (
          <div className="text-center py-8">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
              <span className="text-green-600 text-2xl">✓</span>
            </div>
            <h3 className="mt-4 text-lg font-medium text-gray-900">Payment Successful!</h3>
            <p className="mt-2 text-sm text-gray-600">
              Your payment of {formatAmount(amount)} has been processed successfully.
            </p>
            <div className="mt-6">
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <span className="text-green-400">ℹ</span>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-green-700">
                      A confirmation email has been sent to your email address.
                      Your order ID is: <strong>{orderId}</strong>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'error':
        return (
          <div className="text-center py-8">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <span className="text-red-600 text-2xl">✗</span>
            </div>
            <h3 className="mt-4 text-lg font-medium text-gray-900">Payment Failed</h3>
            <p className="mt-2 text-sm text-gray-600">{error}</p>
            <div className="mt-6 flex justify-center space-x-3">
              <button
                onClick={retry}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Try Again
              </button>
              {onCancel && (
                <button
                  onClick={onCancel}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`max-w-2xl mx-auto ${className}`}>
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Payment</h2>
          {step === 'payment' && (
            <p className="text-sm text-gray-600 mt-1">
              Secure payment powered by Stripe
            </p>
          )}
        </div>
        
        <div className="p-6">
          {renderStep()}
        </div>

        {/* Security badges */}
        {step === 'payment' && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center justify-center space-x-6 text-xs text-gray-500">
              <div className="flex items-center">
                <span className="mr-1">🔒</span>
                <span>SSL Secured</span>
              </div>
              <div className="flex items-center">
                <span className="mr-1">💳</span>
                <span>Stripe Protected</span>
              </div>
              <div className="flex items-center">
                <span className="mr-1">🛡️</span>
                <span>PCI Compliant</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Progress indicator */}
      <div className="mt-6">
        <div className="flex items-center justify-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${step === 'loading' || step === 'payment' ? 'bg-blue-500' : 'bg-gray-300'}`} />
          <div className="w-8 h-0.5 bg-gray-300" />
          <div className={`w-3 h-3 rounded-full ${step === 'processing' ? 'bg-blue-500' : step === 'success' ? 'bg-green-500' : 'bg-gray-300'}`} />
          <div className="w-8 h-0.5 bg-gray-300" />
          <div className={`w-3 h-3 rounded-full ${step === 'success' ? 'bg-green-500' : step === 'error' ? 'bg-red-500' : 'bg-gray-300'}`} />
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span>Payment Details</span>
          <span>Processing</span>
          <span>Complete</span>
        </div>
      </div>
    </div>
  );
};

export default PaymentProcessor;