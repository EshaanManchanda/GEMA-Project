import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { AlertTriangle, Shield, Info } from 'lucide-react';
import { getStripeConfig, getKeyEnvironmentMismatchWarning } from '../../utils/stripeConfig';
import { shouldShowHTTPSWarning, getHTTPSWarningMessage, getDomainVerificationStatus } from '../../utils/environmentUtils';
import vendorPaymentService from '../../services/vendorPaymentService';
import { logger } from '../../utils/logger';

// Get configuration and initialize Stripe with environment-appropriate key
const stripeConfig = getStripeConfig();
const defaultStripePromise = loadStripe(stripeConfig.publicKey);

interface StripeElementsWrapperProps {
  clientSecret: string;
  children: React.ReactNode;
  vendorId?: string; // Optional: If provided, use vendor's Stripe key
}

const StripeElementsWrapper: React.FC<StripeElementsWrapperProps> = ({
  clientSecret,
  children,
  vendorId
}) => {
  // Use ref to store stripe instance to prevent prop changes after mount
  const stripeInstanceRef = useRef<Stripe | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [hasError, setHasError] = useState(false);
  const initializationRef = useRef(false);

  // Load appropriate Stripe instance ONCE on mount
  useEffect(() => {
    // Prevent double initialization in StrictMode
    if (initializationRef.current) {
      return;
    }
    initializationRef.current = true;

    const initStripe = async () => {
      try {
        let instance: Stripe | null = null;

        if (vendorId) {
          // Try to load vendor-specific Stripe
          logger.info('Loading Stripe instance for vendor', { vendorId });

          try {
            instance = await vendorPaymentService.getStripeInstance(vendorId);
          } catch (vendorError) {
            logger.warn('Failed to load vendor Stripe instance', { vendorId, error: vendorError });
            instance = null;
          }

          // If vendor fetch failed, fallback to platform Stripe
          if (!instance) {
            logger.warn('Vendor Stripe instance not available, using platform Stripe', { vendorId });
            instance = await defaultStripePromise;
          }
        } else {
          // Use default platform Stripe
          logger.info('Loading platform Stripe instance');
          instance = await defaultStripePromise;
        }

        if (!instance) {
          throw new Error('Failed to load Stripe instance');
        }

        // Set the instance in ref (never changes after this)
        stripeInstanceRef.current = instance;
        setIsReady(true);

        logger.info('✅ Stripe instance loaded successfully', {
          hasInstance: !!instance,
          vendorId: vendorId || 'platform'
        });
      } catch (error) {
        logger.error('Failed to initialize Stripe', { error, vendorId });

        try {
          // Fallback to platform Stripe on any error
          const fallbackInstance = await defaultStripePromise;
          if (fallbackInstance) {
            stripeInstanceRef.current = fallbackInstance;
            setIsReady(true);
            logger.info('Using fallback platform Stripe instance');
          } else {
            logger.error('Fallback Stripe instance is also null');
            setIsReady(false);
          }
        } catch (fallbackError) {
          logger.error('Failed to load fallback Stripe instance', { fallbackError });
          setIsReady(false);
          setHasError(true);
        }
      }
    };

    initStripe();
  }, []); // Empty deps - only run once on mount

  const environmentWarning = getKeyEnvironmentMismatchWarning();
  const showHTTPSWarning = shouldShowHTTPSWarning();
  const httpsWarningMessage = getHTTPSWarningMessage();
  const domainStatus = getDomainVerificationStatus();

  // Memoize the Elements options to prevent unnecessary re-renders
  const elementsOptions = useMemo(() => ({
    clientSecret,
    appearance: {
      theme: 'stripe' as const,
      variables: {
        colorPrimary: '#0570de',
        colorBackground: '#ffffff',
        colorText: '#30313d',
        colorDanger: '#df1b41',
        fontFamily: 'Inter, sans-serif',
        spacingUnit: '4px',
        borderRadius: '8px',
      },
    },
  }), [clientSecret]);

  // Show error state if Stripe failed to initialize
  if (hasError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-start">
          <AlertTriangle className="w-6 h-6 text-red-600 mr-3 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-red-800 mb-2">Payment System Unavailable</h3>
            <p className="text-sm text-red-700 mb-4">
              We're unable to load the payment system at this time. This could be due to:
            </p>
            <ul className="text-sm text-red-700 list-disc list-inside space-y-1 mb-4">
              <li>Network connectivity issues</li>
              <li>Payment provider configuration</li>
              <li>Browser security settings blocking third-party scripts</li>
            </ul>
            <div className="bg-red-100 p-4 rounded-md mb-4">
              <p className="text-sm font-medium text-red-800 mb-2">Recommended Solutions:</p>
              <ol className="text-sm text-red-700 list-decimal list-inside space-y-1">
                <li>Try refreshing the page</li>
                <li>Use the Test Payment option instead</li>
                <li>Contact support if the issue persists</li>
              </ol>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium"
              >
                Refresh Page
              </button>
              <a
                href="mailto:support@gema.ae"
                className="px-4 py-2 bg-white text-red-600 border border-red-300 rounded-md hover:bg-red-50 text-sm font-medium"
              >
                Contact Support
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!clientSecret || !isReady || !stripeInstanceRef.current) {
    logger.debug('StripeElementsWrapper waiting...', {
      hasClientSecret: !!clientSecret,
      isReady,
      hasStripeInstance: !!stripeInstanceRef.current,
      clientSecretPrefix: clientSecret?.substring(0, 20)
    });

    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-3 text-gray-600">
          {!isReady ? 'Loading payment provider...' : 'Preparing payment form...'}
        </span>
      </div>
    );
  }

  logger.info('StripeElementsWrapper ready to render Elements', {
    hasClientSecret: !!clientSecret,
    hasStripeInstance: !!stripeInstanceRef.current,
    clientSecretPrefix: clientSecret?.substring(0, 20),
    vendorId
  });

  return (
    <div className="space-y-4">
      {/* Environment Configuration Warning */}
      {environmentWarning && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertTriangle className="w-5 h-5 text-red-600 mr-3 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-red-800 font-medium">Environment Configuration Warning</p>
              <p className="text-sm text-red-700 mt-1">{environmentWarning}</p>
              <div className="mt-2 text-xs text-red-600">
                <p>Current: {stripeConfig.keyType} key in {stripeConfig.environment} environment</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HTTPS Warning */}
      {showHTTPSWarning && httpsWarningMessage && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <Info className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-blue-800 font-medium">Development Environment Notice</p>
              <p className="text-sm text-blue-700 mt-1">{httpsWarningMessage}</p>
              <div className="mt-2 text-xs text-blue-600">
                <p>Some payment methods may not be available over HTTP in development.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Domain Verification Info */}
      {domainStatus.requiresVerification && !domainStatus.isVerified && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <Shield className="w-5 h-5 text-yellow-600 mr-3 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-yellow-800 font-medium">Domain Verification Required</p>
              <p className="text-sm text-yellow-700 mt-1">{domainStatus.message}</p>
              <div className="mt-2 text-xs text-yellow-600">
                <p>Apple Pay and other advanced payment methods require domain verification.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stripe Elements - using stable ref to prevent prop change errors */}
      <Elements
        key={clientSecret} // Only remount when clientSecret changes (new payment intent)
        stripe={stripeInstanceRef.current}
        options={elementsOptions}
      >
        {children}
      </Elements>
    </div>
  );
};

export default StripeElementsWrapper;