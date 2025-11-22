import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-hot-toast';
import {
  fetchPaymentSettings,
  updatePaymentSettings,
  selectPaymentSettings,
  selectIsSettingsLoading,
  selectPayoutError
} from '../../store/slices/vendorPayoutSlice';
import type { AppDispatch } from '../../store';
import VendorNavigation from '../../components/vendor/VendorNavigation';

const VendorPaymentSettings: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();

  const paymentSettings = useSelector(selectPaymentSettings);
  const isLoading = useSelector(selectIsSettingsLoading);
  const error = useSelector(selectPayoutError);

  const [formData, setFormData] = useState({
    preferredPayoutMethod: 'bank_transfer',
    minimumPayout: 50,
    payoutSchedule: 'weekly',
    bankAccountDetails: {
      accountHolderName: '',
      bankName: '',
      accountNumber: '',
      routingNumber: '',
      iban: '',
      swiftCode: ''
    },
    stripeAccountId: '',
    stripePublishableKey: '',
    stripeSecretKey: ''
  });

  const [activeTab, setActiveTab] = useState<'bank' | 'stripe'>('bank');

  useEffect(() => {
    dispatch(fetchPaymentSettings());
  }, [dispatch]);

  useEffect(() => {
    if (paymentSettings) {
      setFormData({
        preferredPayoutMethod: paymentSettings.preferredPayoutMethod || 'bank_transfer',
        minimumPayout: paymentSettings.minimumPayout || 50,
        payoutSchedule: paymentSettings.payoutSchedule || 'weekly',
        bankAccountDetails: {
          accountHolderName: paymentSettings.bankAccountDetails?.accountHolderName || '',
          bankName: paymentSettings.bankAccountDetails?.bankName || '',
          accountNumber: paymentSettings.bankAccountDetails?.accountNumber || '',
          routingNumber: paymentSettings.bankAccountDetails?.routingNumber || '',
          iban: paymentSettings.bankAccountDetails?.iban || '',
          swiftCode: paymentSettings.bankAccountDetails?.swiftCode || ''
        },
        stripeAccountId: paymentSettings.stripeAccountId || '',
        stripePublishableKey: paymentSettings.stripePublishableKey || '',
        stripeSecretKey: ''
      });
    }
  }, [paymentSettings]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name.startsWith('bank.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        bankAccountDetails: {
          ...prev.bankAccountDetails,
          [field]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: name === 'minimumPayout' ? parseFloat(value) : value
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const updateData: any = {
        preferredPayoutMethod: formData.preferredPayoutMethod,
        minimumPayout: formData.minimumPayout,
        payoutSchedule: formData.payoutSchedule
      };

      if (activeTab === 'bank') {
        updateData.bankAccountDetails = formData.bankAccountDetails;
      } else if (activeTab === 'stripe') {
        updateData.stripeAccountId = formData.stripeAccountId;
        updateData.stripePublishableKey = formData.stripePublishableKey;
        if (formData.stripeSecretKey) {
          updateData.stripeSecretKey = formData.stripeSecretKey;
        }
      }

      await dispatch(updatePaymentSettings(updateData)).unwrap();
      toast.success('Payment settings updated successfully');
    } catch (error: any) {
      toast.error(error || 'Failed to update payment settings');
    }
  };

  if (isLoading && !paymentSettings) {
    return (
      <div className="min-h-screen bg-gray-50">
        <VendorNavigation />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading settings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <VendorNavigation />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Payment Settings</h1>
          <p className="mt-2 text-gray-600">Configure your payout preferences and payment methods</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Commission Model Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Commission Model</h2>
          {paymentSettings?.hasCustomStripeAccount && paymentSettings?.subscriptionActive ? (
            <div>
              <div className="flex items-center mb-2">
                <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-green-800 font-medium">Subscription Model</span>
              </div>
              <p className="text-gray-700">
                You're using your own Stripe payment gateway. Monthly subscription: {paymentSettings.subscriptionAmount} {paymentSettings.hasCustomStripeAccount ? 'AED' : ''}
              </p>
              <p className="text-sm text-gray-600 mt-2">
                Subscription valid until: {paymentSettings.subscriptionPaidUntil ? new Date(paymentSettings.subscriptionPaidUntil).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          ) : (
            <div>
              <div className="flex items-center mb-2">
                <svg className="w-5 h-5 text-orange-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-orange-800 font-medium">Platform Payment Gateway</span>
              </div>
              <p className="text-gray-700">
                You're using the platform payment gateway. Commission: {paymentSettings?.commissionRate || 5}% per transaction
              </p>
              <p className="text-sm text-gray-600 mt-2">
                Want to use your own Stripe account? Set up your Stripe integration below and pay a monthly subscription instead.
              </p>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow">
          {/* General Settings */}
          <div className="px-6 py-5 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">General Settings</h2>
          </div>

          <div className="px-6 py-5 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preferred Payout Method
              </label>
              <select
                name="preferredPayoutMethod"
                value={formData.preferredPayoutMethod}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="bank_transfer">Bank Transfer</option>
                <option value="stripe">Stripe</option>
                <option value="paypal">PayPal</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Payout Amount (AED)
                </label>
                <input
                  type="number"
                  name="minimumPayout"
                  value={formData.minimumPayout}
                  onChange={handleInputChange}
                  min="50"
                  step="1"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">Minimum 50 AED</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payout Schedule
                </label>
                <select
                  name="payoutSchedule"
                  value={formData.payoutSchedule}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            </div>
          </div>

          {/* Payment Method Tabs */}
          <div className="px-6 py-5 border-t border-gray-200">
            <div className="flex space-x-4 border-b border-gray-200 mb-6">
              <button
                type="button"
                onClick={() => setActiveTab('bank')}
                className={`py-2 px-4 font-medium ${
                  activeTab === 'bank'
                    ? 'border-b-2 border-orange-600 text-orange-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Bank Account
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('stripe')}
                className={`py-2 px-4 font-medium ${
                  activeTab === 'stripe'
                    ? 'border-b-2 border-orange-600 text-orange-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Stripe Integration
              </button>
            </div>

            {activeTab === 'bank' ? (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Bank Account Details</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Account Holder Name *
                    </label>
                    <input
                      type="text"
                      name="bank.accountHolderName"
                      value={formData.bankAccountDetails.accountHolderName}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bank Name *
                    </label>
                    <input
                      type="text"
                      name="bank.bankName"
                      value={formData.bankAccountDetails.bankName}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Account Number *
                    </label>
                    <input
                      type="text"
                      name="bank.accountNumber"
                      value={formData.bankAccountDetails.accountNumber}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      IBAN
                    </label>
                    <input
                      type="text"
                      name="bank.iban"
                      value={formData.bankAccountDetails.iban}
                      onChange={handleInputChange}
                      placeholder="AE00 0000 0000 0000 0000 000"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Routing Number
                    </label>
                    <input
                      type="text"
                      name="bank.routingNumber"
                      value={formData.bankAccountDetails.routingNumber}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      SWIFT Code
                    </label>
                    <input
                      type="text"
                      name="bank.swiftCode"
                      value={formData.bankAccountDetails.swiftCode}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Stripe API Configuration</h3>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <div className="flex">
                    <svg className="w-5 h-5 text-yellow-600 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <h4 className="text-sm font-medium text-yellow-900">Important</h4>
                      <p className="text-sm text-yellow-700 mt-1">
                        Using your own Stripe account requires a monthly subscription of 150 AED. Your API keys are stored securely and never shared.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Stripe Account ID
                    </label>
                    <input
                      type="text"
                      name="stripeAccountId"
                      value={formData.stripeAccountId}
                      onChange={handleInputChange}
                      placeholder="acct_..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Stripe Publishable Key
                    </label>
                    <input
                      type="text"
                      name="stripePublishableKey"
                      value={formData.stripePublishableKey}
                      onChange={handleInputChange}
                      placeholder="pk_live_... or pk_test_..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Stripe Secret Key
                    </label>
                    <input
                      type="password"
                      name="stripeSecretKey"
                      value={formData.stripeSecretKey}
                      onChange={handleInputChange}
                      placeholder="sk_live_... or sk_test_..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Leave empty to keep existing key unchanged
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3 rounded-b-lg">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium disabled:opacity-50"
            >
              {isLoading ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VendorPaymentSettings;
