import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaSave, FaSpinner, FaUniversity, FaCheckCircle } from 'react-icons/fa';
import { toast } from 'react-hot-toast';

interface BankDetails {
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  routingNumber?: string;
  iban?: string;
  swiftCode?: string;
  accountType?: 'checking' | 'savings';
  country: string;
}

interface BankDetailsFormProps {
  currentDetails?: BankDetails;
  onSave: (details: BankDetails) => Promise<void>;
  isLoading?: boolean;
}

const BankDetailsForm: React.FC<BankDetailsFormProps> = ({
  currentDetails,
  onSave,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState<BankDetails>({
    accountHolderName: '',
    bankName: '',
    accountNumber: '',
    routingNumber: '',
    iban: '',
    swiftCode: '',
    accountType: 'checking',
    country: 'United States',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [showIBAN, setShowIBAN] = useState(false);

  useEffect(() => {
    if (currentDetails) {
      setFormData(currentDetails);
      // Show IBAN field if country uses IBAN
      setShowIBAN(isIBANCountry(currentDetails.country));
    }
  }, [currentDetails]);

  const isIBANCountry = (country: string): boolean => {
    const ibanCountries = [
      'united kingdom', 'uk', 'germany', 'france', 'spain', 'italy',
      'netherlands', 'belgium', 'austria', 'switzerland', 'sweden',
      'norway', 'denmark', 'finland', 'ireland', 'portugal', 'greece',
      'poland', 'czech republic', 'hungary', 'romania', 'united arab emirates', 'uae'
    ];
    return ibanCountries.some(c => country.toLowerCase().includes(c));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }

    // Toggle IBAN/routing based on country
    if (name === 'country') {
      setShowIBAN(isIBANCountry(value));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.accountHolderName.trim()) {
      newErrors.accountHolderName = 'Account holder name is required';
    }

    if (!formData.bankName.trim()) {
      newErrors.bankName = 'Bank name is required';
    }

    if (!formData.accountNumber.trim()) {
      newErrors.accountNumber = 'Account number is required';
    }

    if (!formData.country.trim()) {
      newErrors.country = 'Country is required';
    }

    // Validate IBAN or routing number based on country
    if (showIBAN) {
      if (!formData.iban?.trim()) {
        newErrors.iban = 'IBAN is required for this country';
      } else if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/.test(formData.iban.replace(/\s/g, ''))) {
        newErrors.iban = 'Invalid IBAN format';
      }
    } else {
      if (formData.country.toLowerCase().includes('united states') || formData.country.toLowerCase() === 'usa') {
        if (!formData.routingNumber?.trim()) {
          newErrors.routingNumber = 'Routing number is required for US accounts';
        } else if (!/^\d{9}$/.test(formData.routingNumber)) {
          newErrors.routingNumber = 'Routing number must be 9 digits';
        }
      }
    }

    // Swift code validation (optional but if provided, must be valid)
    if (formData.swiftCode && !/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(formData.swiftCode)) {
      newErrors.swiftCode = 'Invalid SWIFT/BIC code format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setSaving(true);
    try {
      await onSave(formData);
      toast.success('Bank details saved successfully');
    } catch (error: any) {
      console.error('Error saving bank details:', error);
      toast.error(error.response?.data?.message || 'Failed to save bank details');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
          <FaUniversity className="text-green-600 text-xl" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Bank Account Details</h3>
          <p className="text-sm text-gray-600">Where you'll receive your payouts</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Account Holder Name */}
        <div>
          <label htmlFor="accountHolderName" className="block text-sm font-medium text-gray-700 mb-2">
            Account Holder Name *
          </label>
          <input
            type="text"
            id="accountHolderName"
            name="accountHolderName"
            value={formData.accountHolderName}
            onChange={handleChange}
            className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
              errors.accountHolderName ? 'border-red-500' : 'border-gray-200'
            }`}
            placeholder="Full name as it appears on the account"
            disabled={isLoading || saving}
          />
          {errors.accountHolderName && (
            <p className="text-red-500 text-sm mt-1">{errors.accountHolderName}</p>
          )}
        </div>

        {/* Country */}
        <div>
          <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-2">
            Country *
          </label>
          <select
            id="country"
            name="country"
            value={formData.country}
            onChange={handleChange}
            className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
              errors.country ? 'border-red-500' : 'border-gray-200'
            }`}
            disabled={isLoading || saving}
          >
            <option value="United States">United States</option>
            <option value="United Kingdom">United Kingdom</option>
            <option value="Canada">Canada</option>
            <option value="Australia">Australia</option>
            <option value="United Arab Emirates">United Arab Emirates</option>
            <option value="Germany">Germany</option>
            <option value="France">France</option>
            <option value="Spain">Spain</option>
            <option value="Italy">Italy</option>
            <option value="Netherlands">Netherlands</option>
            <option value="Other">Other</option>
          </select>
          {errors.country && (
            <p className="text-red-500 text-sm mt-1">{errors.country}</p>
          )}
        </div>

        {/* Bank Name */}
        <div>
          <label htmlFor="bankName" className="block text-sm font-medium text-gray-700 mb-2">
            Bank Name *
          </label>
          <input
            type="text"
            id="bankName"
            name="bankName"
            value={formData.bankName}
            onChange={handleChange}
            className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
              errors.bankName ? 'border-red-500' : 'border-gray-200'
            }`}
            placeholder="Name of your bank"
            disabled={isLoading || saving}
          />
          {errors.bankName && (
            <p className="text-red-500 text-sm mt-1">{errors.bankName}</p>
          )}
        </div>

        {/* Account Type (US only) */}
        {!showIBAN && (formData.country.toLowerCase().includes('united states') || formData.country.toLowerCase() === 'usa') && (
          <div>
            <label htmlFor="accountType" className="block text-sm font-medium text-gray-700 mb-2">
              Account Type
            </label>
            <select
              id="accountType"
              name="accountType"
              value={formData.accountType}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              disabled={isLoading || saving}
            >
              <option value="checking">Checking</option>
              <option value="savings">Savings</option>
            </select>
          </div>
        )}

        {/* Account Number */}
        <div>
          <label htmlFor="accountNumber" className="block text-sm font-medium text-gray-700 mb-2">
            Account Number *
          </label>
          <input
            type="text"
            id="accountNumber"
            name="accountNumber"
            value={formData.accountNumber}
            onChange={handleChange}
            className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors font-mono ${
              errors.accountNumber ? 'border-red-500' : 'border-gray-200'
            }`}
            placeholder="Your account number"
            disabled={isLoading || saving}
          />
          {errors.accountNumber && (
            <p className="text-red-500 text-sm mt-1">{errors.accountNumber}</p>
          )}
        </div>

        {/* Routing Number (US) or IBAN (Europe/UAE) */}
        {showIBAN ? (
          <div>
            <label htmlFor="iban" className="block text-sm font-medium text-gray-700 mb-2">
              IBAN *
            </label>
            <input
              type="text"
              id="iban"
              name="iban"
              value={formData.iban}
              onChange={handleChange}
              className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors font-mono uppercase ${
                errors.iban ? 'border-red-500' : 'border-gray-200'
              }`}
              placeholder="GB82 WEST 1234 5698 7654 32"
              disabled={isLoading || saving}
            />
            {errors.iban && (
              <p className="text-red-500 text-sm mt-1">{errors.iban}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              International Bank Account Number (format: GB82WEST12345698765432)
            </p>
          </div>
        ) : (
          <div>
            <label htmlFor="routingNumber" className="block text-sm font-medium text-gray-700 mb-2">
              Routing Number {(formData.country.toLowerCase().includes('united states') || formData.country.toLowerCase() === 'usa') && '*'}
            </label>
            <input
              type="text"
              id="routingNumber"
              name="routingNumber"
              value={formData.routingNumber}
              onChange={handleChange}
              className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors font-mono ${
                errors.routingNumber ? 'border-red-500' : 'border-gray-200'
              }`}
              placeholder="123456789"
              maxLength={9}
              disabled={isLoading || saving}
            />
            {errors.routingNumber && (
              <p className="text-red-500 text-sm mt-1">{errors.routingNumber}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              9-digit ABA routing number for US banks
            </p>
          </div>
        )}

        {/* SWIFT/BIC Code */}
        <div>
          <label htmlFor="swiftCode" className="block text-sm font-medium text-gray-700 mb-2">
            SWIFT/BIC Code {showIBAN && '(Optional)'}
          </label>
          <input
            type="text"
            id="swiftCode"
            name="swiftCode"
            value={formData.swiftCode}
            onChange={handleChange}
            className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors font-mono uppercase ${
              errors.swiftCode ? 'border-red-500' : 'border-gray-200'
            }`}
            placeholder="ABCDUS33XXX"
            maxLength={11}
            disabled={isLoading || saving}
          />
          {errors.swiftCode && (
            <p className="text-red-500 text-sm mt-1">{errors.swiftCode}</p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            Required for international transfers (8 or 11 characters)
          </p>
        </div>

        {/* Security Note */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-50 border border-blue-200 rounded-lg p-4"
        >
          <div className="flex items-start gap-3">
            <FaCheckCircle className="text-blue-600 mt-1" />
            <div className="flex-1">
              <h5 className="font-medium text-blue-900 mb-1">Secure Information</h5>
              <p className="text-sm text-blue-700">
                Your bank details are encrypted and stored securely. We never share your financial information with third parties.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving || isLoading}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <FaSpinner className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <FaSave />
                Save Bank Details
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default BankDetailsForm;
