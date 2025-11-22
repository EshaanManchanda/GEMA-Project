import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaCheckCircle, FaExclamationTriangle, FaSpinner, FaKey, FaEdit, FaStripe, FaSave, FaTimes } from 'react-icons/fa';
import { toast } from 'react-hot-toast';

interface StripeConnectStatus {
  isConnected: boolean;
  accountId?: string;
  onboardingComplete: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  stripePublishableKey?: string;
  stripeSecretKey?: string;
  stripeTestMode?: boolean;
  keysValid?: boolean;
  lastValidated?: string;
}

interface StripeConnectSetupProps {
  currentStatus?: StripeConnectStatus;
  onSaveApiKeys: (publishableKey: string, secretKey: string, testMode: boolean) => Promise<void>;
  onValidateKeys: (publishableKey: string, secretKey: string) => Promise<{ valid: boolean; message?: string }>;
  isLoading?: boolean;
}

const StripeConnectSetup: React.FC<StripeConnectSetupProps> = ({
  currentStatus,
  onSaveApiKeys,
  onValidateKeys,
  isLoading = false,
}) => {
  const [status, setStatus] = useState<StripeConnectStatus | undefined>(currentStatus);
  const [showApiKeysForm, setShowApiKeysForm] = useState(false);
  const [validating, setValidating] = useState(false);
  const [saving, setSaving] = useState(false);

  // API Keys form state
  const [apiKeysForm, setApiKeysForm] = useState({
    publishableKey: '',
    secretKey: '',
    testMode: true,
  });

  useEffect(() => {
    setStatus(currentStatus);
    // Load existing API keys if available
    if (currentStatus?.stripePublishableKey) {
      setApiKeysForm({
        publishableKey: currentStatus.stripePublishableKey || '',
        secretKey: currentStatus.stripeSecretKey ? '••••••••••••••••••••••••••••••••' : '',
        testMode: currentStatus.stripeTestMode !== false,
      });
    }
  }, [currentStatus]);

  const handleValidateKeys = async () => {
    if (!apiKeysForm.publishableKey || !apiKeysForm.secretKey) {
      toast.error('Please enter both publishable and secret keys');
      return;
    }

    // Don't validate if secret key is masked
    if (apiKeysForm.secretKey.startsWith('••')) {
      toast.info('Secret key is already saved. Enter a new key to update.');
      return;
    }

    setValidating(true);
    try {
      const result = await onValidateKeys(apiKeysForm.publishableKey, apiKeysForm.secretKey);
      if (result.valid) {
        toast.success('Stripe API keys are valid!');
      } else {
        toast.error(result.message || 'Invalid Stripe API keys');
      }
    } catch (error: any) {
      toast.error('Failed to validate keys');
    } finally {
      setValidating(false);
    }
  };

  const handleSaveKeys = async () => {
    if (!apiKeysForm.publishableKey || !apiKeysForm.secretKey) {
      toast.error('Please enter both publishable and secret keys');
      return;
    }

    // Don't save if secret key is masked (no changes)
    if (apiKeysForm.secretKey.startsWith('••')) {
      toast.info('No changes to save');
      return;
    }

    setSaving(true);
    try {
      await onSaveApiKeys(apiKeysForm.publishableKey, apiKeysForm.secretKey, apiKeysForm.testMode);
      toast.success('Stripe API keys saved successfully!');
      setShowApiKeysForm(false);
      // Update status
      setStatus(prev => ({
        ...prev,
        isConnected: true,
        stripePublishableKey: apiKeysForm.publishableKey,
        stripeSecretKey: '••••••••••••••••••••••••••••••••',
        stripeTestMode: apiKeysForm.testMode,
        keysValid: true,
      } as StripeConnectStatus));
    } catch (error: any) {
      toast.error('Failed to save API keys');
    } finally {
      setSaving(false);
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

    if (status.keysValid) {
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
        Keys Need Validation
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Stripe Connect Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <FaStripe className="text-blue-600 text-2xl" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Stripe API Configuration</h3>
            <p className="text-sm text-gray-600">Manage your payment processing</p>
          </div>
        </div>
        {getStatusBadge()}
      </div>

      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200"
      >
        <AnimatePresence mode="wait">
          {!showApiKeysForm ? (
            /* Display Mode */
            <motion.div
              key="display"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {!status?.isConnected ? (
                /* Not Connected State */
                <div className="text-center py-6">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
                    <FaKey className="text-blue-600 text-2xl" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">Add Your Stripe API Keys</h4>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    Enter your Stripe API keys to start accepting payments directly through your account.
                  </p>
                  <button
                    onClick={() => setShowApiKeysForm(true)}
                    className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    <FaKey />
                    Add API Keys
                  </button>
                </div>
              ) : (
                /* Connected State */
                <div className="space-y-4">
                  {/* API Keys Display */}
                  <div className="bg-white/60 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm font-medium text-gray-700">Stripe API Keys</div>
                      <button
                        onClick={() => setShowApiKeysForm(true)}
                        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                      >
                        <FaEdit /> Edit
                      </button>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Publishable Key</div>
                        <div className="font-mono text-sm text-gray-900 bg-white px-3 py-2 rounded">
                          {status.stripePublishableKey || 'Not set'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Secret Key</div>
                        <div className="font-mono text-sm text-gray-900 bg-white px-3 py-2 rounded">
                          ••••••••••••••••••••••••••••••••
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Mode</div>
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                          status.stripeTestMode ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {status.stripeTestMode ? 'Test Mode' : 'Live Mode'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {status.lastValidated && (
                    <div className="text-xs text-gray-500 text-center">
                      Last validated: {new Date(status.lastValidated).toLocaleString()}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          ) : (
            /* Edit Mode - API Keys Form */
            <motion.div
              key="edit"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-gray-900">Stripe API Keys</h4>
                <button
                  onClick={() => setShowApiKeysForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FaTimes />
                </button>
              </div>

              <div className="space-y-4">
                {/* Publishable Key */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Publishable Key *
                  </label>
                  <input
                    type="text"
                    value={apiKeysForm.publishableKey}
                    onChange={(e) => setApiKeysForm(prev => ({ ...prev, publishableKey: e.target.value }))}
                    placeholder="pk_test_... or pk_live_..."
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Starts with pk_test_ (test) or pk_live_ (production)
                  </p>
                </div>

                {/* Secret Key */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Secret Key *
                  </label>
                  <input
                    type="password"
                    value={apiKeysForm.secretKey}
                    onChange={(e) => setApiKeysForm(prev => ({ ...prev, secretKey: e.target.value }))}
                    placeholder="sk_test_... or sk_live_..."
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Starts with sk_test_ (test) or sk_live_ (production)
                  </p>
                </div>

                {/* Test Mode Toggle */}
                <div className="flex items-center gap-3 bg-white/60 rounded-lg p-4">
                  <input
                    type="checkbox"
                    id="testMode"
                    checked={apiKeysForm.testMode}
                    onChange={(e) => setApiKeysForm(prev => ({ ...prev, testMode: e.target.checked }))}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <label htmlFor="testMode" className="text-sm font-medium text-gray-700">
                    Test Mode (Use test API keys)
                  </label>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleValidateKeys}
                    disabled={validating || saving || isLoading}
                    className="flex-1 inline-flex items-center justify-center gap-2 bg-gray-100 text-gray-700 px-4 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
                  >
                    {validating ? (
                      <>
                        <FaSpinner className="animate-spin" />
                        Validating...
                      </>
                    ) : (
                      <>
                        <FaCheckCircle />
                        Validate Keys
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleSaveKeys}
                    disabled={saving || validating || isLoading}
                    className="flex-1 inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <FaSpinner className="animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <FaSave />
                        Save Keys
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Help Text */}
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <h5 className="font-medium text-blue-900 mb-2">How to get your Stripe API Keys</h5>
        <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
          <li>Go to <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer" className="underline">Stripe Dashboard → API Keys</a></li>
          <li>Copy your Publishable key (starts with pk_)</li>
          <li>Create or reveal your Secret key (starts with sk_)</li>
          <li>Use test keys (pk_test_ / sk_test_) for testing, live keys for production</li>
        </ol>
      </div>
    </div>
  );
};

export default StripeConnectSetup;
