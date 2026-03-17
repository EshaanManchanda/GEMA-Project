import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import {
  FaDollarSign,
  FaUniversity,
  FaCreditCard,
  FaCheckCircle,
  FaExternalLinkAlt,
  FaInfoCircle,
} from 'react-icons/fa';
import { TeacherNavigation } from '@/components/teacher';
import teacherAPI from '@/services/api/teacherAPI';
import { useTeacherPayoutDashboard } from '@/hooks/queries/useTeacherQuery';
import PrivatePageSEO from '@/components/common/PrivatePageSEO';

type Tab = 'model' | 'bank' | 'stripe';

const SUBSCRIPTION_PRICE_AED = 149;

const TeacherPaymentSettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('model');

  // Business model tab
  const [isSwitching, setIsSwitching] = useState(false);

  // Bank tab
  const [bankForm, setBankForm] = useState({
    accountHolderName: '',
    bankName: '',
    accountNumber: '',
    iban: '',
    swiftCode: '',
  });
  const [isSavingBank, setIsSavingBank] = useState(false);

  // Stripe tab
  const [isConnecting, setIsConnecting] = useState(false);
  const [stripeSecretKey, setStripeSecretKey] = useState('');
  const [stripeTestMode, setStripeTestMode] = useState(true);
  const [isSavingStripeKey, setIsSavingStripeKey] = useState(false);

  const { data: dashboard } = useTeacherPayoutDashboard();

  // Business model helpers
  const isSubscriptionModel = dashboard?.paymentSettings?.paymentMode === 'custom_stripe';
  const subscriptionPaidUntil = dashboard?.paymentSettings?.subscriptionPaidUntil;
  const commissionRate = dashboard?.paymentSettings?.commissionRate ?? 5;

  const handleSwitchToSubscription = async () => {
    if (isSubscriptionModel) return;
    setIsSwitching(true);
    try {
      await teacherAPI.paySubscription();
      toast.success('Switched to subscription model!');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to switch model');
    } finally {
      setIsSwitching(false);
    }
  };

  // Bank tab handlers
  const handleBankChange = (field: keyof typeof bankForm, value: string) => {
    setBankForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankForm.accountHolderName || !bankForm.bankName) {
      toast.error('Account holder name and bank name are required');
      return;
    }
    setIsSavingBank(true);
    try {
      await teacherAPI.updateBankDetails(bankForm);
      toast.success('Bank details saved');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save bank details');
    } finally {
      setIsSavingBank(false);
    }
  };

  // Stripe tab handlers
  const handleInitiateStripeConnect = async () => {
    setIsConnecting(true);
    try {
      const result = await teacherAPI.initiateStripeConnect();
      window.open(result.url, '_blank');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to start Stripe onboarding');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSaveStripeKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripeSecretKey.trim()) {
      toast.error('Secret key is required');
      return;
    }
    setIsSavingStripeKey(true);
    try {
      await teacherAPI.saveStripeApiKeys(stripeSecretKey, stripeTestMode);
      toast.success('Stripe key saved');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save Stripe key');
    } finally {
      setIsSavingStripeKey(false);
    }
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'model', label: 'Business Model', icon: <FaDollarSign /> },
    { id: 'bank', label: 'Bank Account', icon: <FaUniversity /> },
    { id: 'stripe', label: 'Stripe Integration', icon: <FaCreditCard /> },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50">
      <PrivatePageSEO title="Payment Settings | Teacher | Kidrove" description="Manage your payment settings" />
      <TeacherNavigation />

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Payment Settings</h1>
          <p className="text-gray-600 mt-1">Configure how you receive payments for your classes</p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-purple-600 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-8">
            {/* ── Tab 1: Business Model ── */}
            {activeTab === 'model' && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <h2 className="text-xl font-bold text-gray-900 mb-6">Choose Your Payment Model</h2>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Commission model */}
                  <div
                    className={`rounded-xl border-2 p-6 ${
                      !isSubscriptionModel
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-gray-900">Platform Commission</h3>
                      {!isSubscriptionModel && (
                        <span className="text-xs font-medium bg-purple-600 text-white px-2 py-1 rounded-full">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      No upfront cost. The platform takes a {commissionRate}% commission on each booking.
                    </p>
                    <div className="bg-white rounded-lg p-4 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Commission rate</span>
                        <span className="font-semibold text-gray-900">{commissionRate}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Example: 1000 AED booking</span>
                        <span className="font-semibold text-green-600">
                          {(1000 * (1 - commissionRate / 100)).toFixed(0)} AED to you
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Subscription model */}
                  <div
                    className={`rounded-xl border-2 p-6 ${
                      isSubscriptionModel
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-gray-900">Subscription</h3>
                      {isSubscriptionModel && (
                        <span className="text-xs font-medium bg-purple-600 text-white px-2 py-1 rounded-full">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      Pay {SUBSCRIPTION_PRICE_AED} AED/month and keep 100% of your bookings revenue.
                    </p>
                    <div className="bg-white rounded-lg p-4 space-y-2 text-sm mb-4">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Monthly fee</span>
                        <span className="font-semibold text-gray-900">{SUBSCRIPTION_PRICE_AED} AED</span>
                      </div>
                      {subscriptionPaidUntil && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Active until</span>
                          <span className="font-semibold text-green-600">
                            {new Date(subscriptionPaidUntil).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                    {!isSubscriptionModel && (
                      <button
                        onClick={handleSwitchToSubscription}
                        disabled={isSwitching}
                        className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50"
                      >
                        {isSwitching ? 'Processing...' : 'Switch to Subscription'}
                      </button>
                    )}
                    {isSubscriptionModel && (
                      <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
                        <FaCheckCircle />
                        Subscription active
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6 flex items-start gap-3 bg-blue-50 rounded-lg p-4 text-sm text-blue-800">
                  <FaInfoCircle className="mt-0.5 flex-shrink-0" />
                  <p>
                    To use the subscription model with your own Stripe account, you must also complete
                    Stripe Connect onboarding in the <strong>Stripe Integration</strong> tab.
                  </p>
                </div>
              </motion.div>
            )}

            {/* ── Tab 2: Bank Account ── */}
            {activeTab === 'bank' && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <h2 className="text-xl font-bold text-gray-900 mb-6">Bank Account Details</h2>
                <p className="text-sm text-gray-600 mb-6">
                  Add your bank details to receive payouts. Once submitted, an admin will verify
                  your account before payouts are processed.
                </p>

                <form onSubmit={handleSaveBank} className="space-y-5 max-w-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Account Holder Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={bankForm.accountHolderName}
                      onChange={(e) => handleBankChange('accountHolderName', e.target.value)}
                      placeholder="As shown on bank account"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bank Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={bankForm.bankName}
                      onChange={(e) => handleBankChange('bankName', e.target.value)}
                      placeholder="e.g. Emirates NBD"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      IBAN
                    </label>
                    <input
                      type="text"
                      value={bankForm.iban}
                      onChange={(e) => handleBankChange('iban', e.target.value.toUpperCase())}
                      placeholder="AE00 0000 0000 0000 0000 000"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Account Number
                    </label>
                    <input
                      type="text"
                      value={bankForm.accountNumber}
                      onChange={(e) => handleBankChange('accountNumber', e.target.value)}
                      placeholder="Optional if IBAN provided"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      SWIFT / BIC Code
                    </label>
                    <input
                      type="text"
                      value={bankForm.swiftCode}
                      onChange={(e) => handleBankChange('swiftCode', e.target.value.toUpperCase())}
                      placeholder="e.g. EBILAEAD"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSavingBank}
                    className="px-6 py-2.5 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50"
                  >
                    {isSavingBank ? 'Saving...' : 'Save Bank Details'}
                  </button>
                </form>
              </motion.div>
            )}

            {/* ── Tab 3: Stripe Integration ── */}
            {activeTab === 'stripe' && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <h2 className="text-xl font-bold text-gray-900 mb-6">Stripe Integration</h2>

                {/* Stripe Connect */}
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 mb-8 border border-indigo-100">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-gray-900 mb-1">Stripe Connect (Recommended)</h3>
                      <p className="text-sm text-gray-600">
                        Connect your Stripe account to receive instant payouts. Required for the
                        subscription model.
                      </p>
                    </div>
                    {dashboard?.paymentSettings?.hasStripeAccount && (
                      <span className="flex items-center gap-1 text-sm font-medium text-green-600 bg-green-50 px-3 py-1 rounded-full">
                        <FaCheckCircle className="w-3 h-3" />
                        Connected
                      </span>
                    )}
                  </div>

                  <button
                    onClick={handleInitiateStripeConnect}
                    disabled={isConnecting}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
                  >
                    {isConnecting ? 'Opening Stripe...' : 'Connect with Stripe'}
                    <FaExternalLinkAlt className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Manual Stripe key */}
                <div className="border border-gray-200 rounded-xl p-6">
                  <h3 className="font-bold text-gray-900 mb-1">Manual Stripe Key (Fallback)</h3>
                  <p className="text-sm text-gray-600 mb-5">
                    If you can't use Stripe Connect, enter your Stripe Secret Key directly. This key
                    is encrypted and never exposed to the frontend.
                  </p>

                  <form onSubmit={handleSaveStripeKey} className="space-y-4 max-w-lg">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Secret Key
                      </label>
                      <input
                        type="password"
                        value={stripeSecretKey}
                        onChange={(e) => setStripeSecretKey(e.target.value)}
                        placeholder="sk_live_... or sk_test_..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-sm"
                      />
                    </div>

                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={stripeTestMode}
                        onChange={(e) => setStripeTestMode(e.target.checked)}
                        className="w-4 h-4 text-purple-600 rounded"
                      />
                      <span className="text-sm text-gray-700">Use test mode (sk_test_...)</span>
                    </label>

                    <button
                      type="submit"
                      disabled={isSavingStripeKey}
                      className="px-6 py-2.5 bg-gray-800 text-white rounded-lg font-semibold hover:bg-gray-900 transition-colors disabled:opacity-50"
                    >
                      {isSavingStripeKey ? 'Saving...' : 'Save Stripe Key'}
                    </button>
                  </form>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherPaymentSettingsPage;
