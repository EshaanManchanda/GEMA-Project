import React from 'react';
import { motion } from 'framer-motion';
import { FaCheckCircle, FaExclamationTriangle, FaSpinner, FaStripe, FaExternalLinkAlt } from 'react-icons/fa';
import { toast } from 'react-hot-toast';

interface StripeConnectStatus {
  isConnected: boolean;
  accountId?: string;
  onboardingComplete: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
}

interface StripeConnectSetupProps {
  status?: StripeConnectStatus;
  isLoadingStatus?: boolean;
  onStartOnboarding: () => Promise<{ url: string }>;
}

const StripeConnectSetup: React.FC<StripeConnectSetupProps> = ({
  status,
  isLoadingStatus = false,
  onStartOnboarding,
}) => {
  const [redirecting, setRedirecting] = React.useState(false);

  const handleConnect = async () => {
    setRedirecting(true);
    try {
      const result = await onStartOnboarding();
      if (result?.url) {
        window.location.href = result.url;
      } else {
        toast.error('Failed to start Stripe onboarding');
        setRedirecting(false);
      }
    } catch {
      toast.error('Failed to start Stripe onboarding');
      setRedirecting(false);
    }
  };

  const getStatusBadge = () => {
    if (!status || !status.isConnected) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
          Not Connected
        </span>
      );
    }

    if (status.chargesEnabled && status.payoutsEnabled) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
          <FaCheckCircle className="mr-1" />
          Connected
        </span>
      );
    }

    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
        <FaExclamationTriangle className="mr-1" />
        Onboarding Incomplete
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <FaStripe className="text-blue-600 text-2xl" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Stripe Connect</h3>
            <p className="text-sm text-gray-600">Manage your payment processing</p>
          </div>
        </div>
        {isLoadingStatus ? <FaSpinner className="animate-spin text-gray-400" /> : getStatusBadge()}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200"
      >
        {!status?.isConnected ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
              <FaStripe className="text-blue-600 text-2xl" />
            </div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">Connect Your Stripe Account</h4>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Connect with Stripe to receive payouts directly. You'll be redirected to Stripe's secure onboarding flow.
            </p>
            <button
              onClick={handleConnect}
              disabled={redirecting}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {redirecting ? <FaSpinner className="animate-spin" /> : <FaExternalLinkAlt />}
              {redirecting ? 'Redirecting…' : 'Connect with Stripe'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-white/60 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Account ID</span>
                <span className="font-mono text-sm text-gray-900">{status.accountId || '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Charges Enabled</span>
                <span className={`text-sm font-medium ${status.chargesEnabled ? 'text-green-600' : 'text-yellow-600'}`}>
                  {status.chargesEnabled ? 'Yes' : 'Pending'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Payouts Enabled</span>
                <span className={`text-sm font-medium ${status.payoutsEnabled ? 'text-green-600' : 'text-yellow-600'}`}>
                  {status.payoutsEnabled ? 'Yes' : 'Pending'}
                </span>
              </div>
            </div>

            {!status.onboardingComplete && (
              <button
                onClick={handleConnect}
                disabled={redirecting}
                className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {redirecting ? <FaSpinner className="animate-spin" /> : <FaExternalLinkAlt />}
                {redirecting ? 'Redirecting…' : 'Finish Onboarding'}
              </button>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default StripeConnectSetup;
