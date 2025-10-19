import React, { useState, useRef } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { CreditCard, Lock, AlertCircle, ExternalLink, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { formatCurrency, getDefaultCurrency } from '../../utils/currencyUtils';
import { useCurrencyContext } from '../../contexts/CurrencyContext';
import { logger } from '../../utils/logger';

interface StripePaymentElementProps {
  onSuccess: () => void;
  onError?: (error: string) => void;
  onFallbackToTestPayment?: () => void;
  isProcessing?: boolean;
  amount: number;
  currency?: string;
}

const StripePaymentElement: React.FC<StripePaymentElementProps> = ({
  onSuccess,
  onError,
  onFallbackToTestPayment,
  isProcessing = false,
  amount,
  currency = 'AED'
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRegulatoryError, setIsRegulatoryError] = useState(false);
  const [isElementReady, setIsElementReady] = useState(false);
  const { currencyInfo } = useCurrencyContext();

  // Ref to prevent double submission (synchronous guard)
  const submittedRef = useRef(false);

  // Helper function to detect regulatory compliance errors
  const isIndiaRegulatoryError = (error: any): boolean => {
    if (!error?.message) return false;
    const message = error.message.toLowerCase();
    return message.includes('indian regulations') ||
           message.includes('registered indian businesses') ||
           message.includes('india-exports') ||
           message.includes('only registered indian businesses') ||
           message.includes('as per indian regulations');
  };

  // Helper function to get user-friendly error message
  const getErrorMessage = (error: any): string => {
    if (isIndiaRegulatoryError(error)) {
      return 'This Stripe account is configured for Indian operations and cannot process UAE payments. Please use the Test Payment option to complete your booking, or contact support for assistance with payment configuration.';
    }

    // Handle other common Stripe errors
    const errorCode = error.code || error.type;
    const errorMessage = error.message || '';

    switch (errorCode) {
      case 'card_declined':
        return 'Your card was declined. Please try a different payment method or contact your bank.';
      case 'insufficient_funds':
        return 'Insufficient funds. Please check your account balance or try a different card.';
      case 'invalid_cvc':
        return 'Invalid security code. Please check your card\'s CVC and try again.';
      case 'expired_card':
        return 'Your card has expired. Please use a different payment method.';
      case 'processing_error':
        return 'A processing error occurred. Please try again in a moment.';
      case 'payment_intent_unexpected_state':
        // Check if payment actually succeeded
        if (error.payment_intent?.status === 'succeeded') {
          return 'Payment already completed successfully';
        }
        return 'Payment state error. Please refresh the page and try again.';
      case 'invalid_request_error':
        if (errorMessage.includes('domain')) {
          return 'Payment method not available for this domain. Please try the Test Payment option.';
        }
        return 'Payment configuration error. Please try the Test Payment option or contact support.';
      default:
        return error.message || 'Payment failed. Please try again or use the Test Payment option.';
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    // Synchronous guard to prevent double submission
    if (submittedRef.current) {
      logger.debug('Payment already being processed, ignoring duplicate submission');
      return;
    }

    if (!stripe || !elements) {
      setErrorMessage('Stripe not initialized. Please refresh the page.');
      return;
    }

    if (!isElementReady) {
      setErrorMessage('Payment form is still loading. Please wait a moment and try again.');
      return;
    }

    if (processing || isProcessing) {
      return;
    }

    // Set ref immediately (before any async operations)
    submittedRef.current = true;

    setProcessing(true);
    setErrorMessage(null);
    setIsRegulatoryError(false);

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
        logger.error('Payment confirmation error:', error);

        // Special case: PaymentIntent already succeeded (double-submission)
        if (error.code === 'payment_intent_unexpected_state' &&
            error.payment_intent?.status === 'succeeded') {
          logger.info('Payment already succeeded, proceeding to success callback');
          toast.success('Payment successful!');
          onSuccess();
          return;
        }

        const isRegulatory = isIndiaRegulatoryError(error);
        const userFriendlyMessage = getErrorMessage(error);

        setIsRegulatoryError(isRegulatory);
        setErrorMessage(userFriendlyMessage);
        onError?.(userFriendlyMessage);

        if (isRegulatory) {
          toast.error('Payment restricted - Please use Test Payment option');
        } else {
          toast.error('Payment failed: ' + (error.message || 'Unknown error'));
        }
      } else if (paymentIntent) {
        // Payment successful
        toast.success('Payment successful!');
        onSuccess();
      }
    } catch (err: any) {
      logger.error('Payment processing error:', err);

      // Special case: PaymentIntent already succeeded (double-submission in catch)
      if (err.code === 'payment_intent_unexpected_state' &&
          err.payment_intent?.status === 'succeeded') {
        logger.info('Payment already succeeded (caught in exception), proceeding to success callback');
        toast.success('Payment successful!');
        onSuccess();
        return;
      }

      const isRegulatory = isIndiaRegulatoryError(err);
      const userFriendlyMessage = getErrorMessage(err);

      setIsRegulatoryError(isRegulatory);
      setErrorMessage(userFriendlyMessage);
      onError?.(userFriendlyMessage);

      if (isRegulatory) {
        toast.error('Payment restricted - Please use Test Payment option');
      } else {
        toast.error('Payment processing failed');
      }
    } finally {
      setProcessing(false);
      // Note: We don't reset submittedRef here to prevent any resubmission
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Lock className="w-5 h-5 mr-2" />
          Card Information
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Payment Amount Display */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Amount:</span>
              <span className="text-2xl font-bold text-gray-900">
                {formatCurrency(amount, currency || getDefaultCurrency())}
              </span>
            </div>
          </div>

          {/* Stripe Payment Element */}
          <div className="space-y-4">
            <PaymentElement
              id="payment-element"
              onReady={() => {
                logger.debug('PaymentElement is ready');
                setIsElementReady(true);
              }}
              onLoadError={(error) => {
                logger.error('PaymentElement failed to load:', error);
                logger.error('Error details:', {
                  message: error?.message,
                  type: error?.type,
                  code: error?.code,
                  decline_code: error?.decline_code,
                  error_description: error?.error_description,
                  full: JSON.stringify(error, null, 2)
                });

                // Extract error message with fallbacks
                let errorMsg = 'Unknown error';
                if (error?.message) {
                  errorMsg = error.message;
                } else if (error?.error_description) {
                  errorMsg = error.error_description;
                } else if (typeof error === 'string') {
                  errorMsg = error;
                } else if (error?.toString && error.toString() !== '[object Object]') {
                  errorMsg = error.toString();
                } else {
                  errorMsg = JSON.stringify(error);
                }

                logger.error('Extracted error message:', errorMsg);
                setErrorMessage(`Payment form failed to load: ${errorMsg}. Please try using Test Payment instead.`);
                setIsElementReady(false);
              }}
              onLoaderStart={() => {
                logger.debug('PaymentElement loading started');
              }}
              options={{
                layout: 'tabs',
                paymentMethodOrder: ['card', 'digital_wallet'],
                fields: {
                  billingDetails: {
                    name: 'auto',
                    email: 'auto',
                  }
                }
              }}
              className="w-full"
            />
            {!isElementReady && !errorMessage && (
              <div className="text-center text-sm text-gray-500">
                Loading payment form...
              </div>
            )}
          </div>

          {/* Error Display */}
          {errorMessage && (
            <div className={`border rounded-lg p-4 ${isRegulatoryError
              ? 'bg-amber-50 border-amber-200'
              : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-start">
                {isRegulatoryError ? (
                  <Info className="w-5 h-5 text-amber-600 mr-3 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 mr-3 mt-0.5 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <div className="space-y-2">
                    <p className={`text-sm font-medium ${isRegulatoryError ? 'text-amber-800' : 'text-red-800'}`}>
                      {isRegulatoryError ? 'Payment Region Mismatch' : 'Payment Error'}
                    </p>
                    <p className={`text-sm ${isRegulatoryError ? 'text-amber-700' : 'text-red-700'}`}>
                      {errorMessage}
                    </p>
                  </div>
                  {isRegulatoryError && (
                    <div className="mt-4 space-y-3">
                      <div className="bg-amber-100 p-3 rounded-md">
                        <p className="text-xs text-amber-800 font-medium mb-2">Quick Solution:</p>
                        <p className="text-xs text-amber-700">
                          Use our Test Payment option to complete your booking immediately. This is safe and will process your order normally.
                        </p>
                      </div>
                      {onFallbackToTestPayment && (
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          onClick={onFallbackToTestPayment}
                          className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                        >
                          Switch to Test Payment Now
                        </Button>
                      )}
                      <div className="pt-2 border-t border-amber-200">
                        <p className="text-xs text-amber-700 mb-2">Need help?</p>
                        <div className="space-y-1">
                          <a
                            href="mailto:support@gema.ae"
                            className="inline-flex items-center text-xs text-amber-700 hover:text-amber-800 underline"
                          >
                            Contact Support
                            <ExternalLink className="w-3 h-3 ml-1" />
                          </a>
                          <span className="mx-2 text-amber-600">•</span>
                          <a
                            href="https://stripe.com/docs/india-exports"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-xs text-amber-700 hover:text-amber-800 underline"
                          >
                            About Regional Restrictions
                            <ExternalLink className="w-3 h-3 ml-1" />
                          </a>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            disabled={!stripe || !elements || !isElementReady || processing || isProcessing}
            loading={processing || isProcessing}
          >
            {!isElementReady
              ? 'Loading payment form...'
              : processing || isProcessing
              ? 'Processing Payment...'
              : `Pay ${formatCurrency(amount, currency || getDefaultCurrency())}`
            }
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default StripePaymentElement;