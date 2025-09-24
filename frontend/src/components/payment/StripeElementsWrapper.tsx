import React, { useMemo } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { AlertTriangle, Shield, Info } from 'lucide-react';
import { getStripeConfig, getKeyEnvironmentMismatchWarning } from '../../utils/stripeConfig';
import { shouldShowHTTPSWarning, getHTTPSWarningMessage, getDomainVerificationStatus } from '../../utils/environmentUtils';

// Get configuration and initialize Stripe with environment-appropriate key
const stripeConfig = getStripeConfig();
const stripePromise = loadStripe(stripeConfig.publicKey);

interface StripeElementsWrapperProps {
  clientSecret: string;
  children: React.ReactNode;
}

const StripeElementsWrapper: React.FC<StripeElementsWrapperProps> = ({
  clientSecret,
  children
}) => {
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

  if (!clientSecret) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-3 text-gray-600">Preparing payment form...</span>
      </div>
    );
  }

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

      {/* Stripe Elements with key-based remounting to prevent mutation errors */}
      <Elements
        key={clientSecret} // Force remount when clientSecret changes
        stripe={stripePromise}
        options={elementsOptions}
      >
        {children}
      </Elements>
    </div>
  );
};

export default StripeElementsWrapper;