import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { FaPhone, FaCheck, FaTimes, FaSpinner, FaExclamationTriangle, FaEdit, FaCheckCircle } from 'react-icons/fa';
import PhoneInput, { Country } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import '../../styles/phoneInput.css';
import OTPInput from '../common/OTPInput';
import { AnimatedButton } from '../animations';
import {
  validatePhoneDetails,
  formatPhoneForDisplay,
  getExamplePhone,
  getPhoneCountry,
  toE164,
} from '../../utils/phoneUtils';

interface PhoneVerificationSectionProps {
  phone?: string;
  isPhoneVerified: boolean;
  onSendVerification: (phone: string) => Promise<void>;
  onVerifyPhone: (otp: string) => Promise<void>;
  onResendVerification: () => Promise<void>;
}

const PhoneVerificationSection: React.FC<PhoneVerificationSectionProps> = ({
  phone,
  isPhoneVerified,
  onSendVerification,
  onVerifyPhone,
  onResendVerification,
}) => {
  // Helper to sanitize phone to E.164 format
  const sanitizePhoneForDisplay = (phone: string | undefined): string => {
    if (!phone) return '';

    // If already in E.164 format (starts with +), return as-is
    if (phone.startsWith('+')) return phone;

    // Try to convert to E.164 format
    // For Indian numbers starting with 0, assume +91
    if (phone.startsWith('0') && phone.length === 11) {
      return `+91${phone.substring(1)}`;
    }

    // Try general conversion with default country
    const e164 = toE164(phone, 'IN');
    return e164 || phone;
  };

  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState<string | undefined>(sanitizePhoneForDisplay(phone));
  const [selectedCountry, setSelectedCountry] = useState<Country>('US');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [otpError, setOtpError] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [phoneValidation, setPhoneValidation] = useState<{
    isValid: boolean;
    isMobile: boolean;
    error?: string;
  } | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Initialize country from existing phone
  useEffect(() => {
    if (phone) {
      const country = getPhoneCountry(phone);
      if (country) {
        setSelectedCountry(country);
      }
    }
  }, [phone]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Real-time validation as user types
  useEffect(() => {
    if (phoneNumber && phoneNumber.length > 3) {
      const validation = validatePhoneDetails(phoneNumber);
      setPhoneValidation(validation);
      if (!validation.isValid) {
        setPhoneError(validation.error || '');
      } else {
        setPhoneError('');
      }
    } else {
      setPhoneValidation(null);
      setPhoneError('');
    }
  }, [phoneNumber]);

  const handleOpenPhoneModal = () => {
    setPhoneNumber(phone || '');
    setPhoneError('');
    setPhoneValidation(null);
    setShowPhoneModal(true);
  };

  const handleSendVerification = async () => {
    if (!phoneNumber) {
      setPhoneError('Phone number is required');
      return;
    }

    const validation = validatePhoneDetails(phoneNumber);

    if (!validation.isValid) {
      setPhoneError(validation.error || 'Invalid phone number');
      return;
    }

    if (!validation.isMobile) {
      setPhoneError('Only mobile numbers can receive SMS verification codes');
      return;
    }

    setIsLoading(true);
    setOtpError(false);
    setPhoneError('');
    try {
      await onSendVerification(phoneNumber);
      setShowPhoneModal(false);
      setShowOTPModal(true);
      setResendCooldown(60); // 60 seconds cooldown
      toast.success('Verification code sent to your phone');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send verification code');
      setPhoneError(error.message || 'Failed to send verification code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyPhone = async (otpValue: string) => {
    setIsLoading(true);
    setOtpError(false);
    try {
      await onVerifyPhone(otpValue);
      toast.success('Phone number verified successfully!');
      setShowOTPModal(false);
      setOtp('');
    } catch (error: any) {
      setOtpError(true);
      toast.error(error.message || 'Invalid verification code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (resendCooldown > 0) return;

    setIsLoading(true);
    setOtpError(false);
    setOtp('');
    try {
      await onResendVerification();
      setResendCooldown(60);
      toast.success('Verification code resent to your phone');
    } catch (error: any) {
      toast.error(error.message || 'Failed to resend verification code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOTPChange = (value: string) => {
    setOtp(value);
    setOtpError(false);
  };

  const handleOTPComplete = (value: string) => {
    handleVerifyPhone(value);
  };

  const handlePhoneChange = (value: string | undefined) => {
    setPhoneNumber(value);
  };

  // Get example phone number for selected country
  const exampleNumber = selectedCountry ? getExamplePhone(selectedCountry) : '+1 234 567 8900';

  return (
    <>
      <div className="bg-white rounded-2xl p-6 border border-gray-200 hover:border-gray-300 transition-colors">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4 flex-1">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              isPhoneVerified ? 'bg-green-100' : 'bg-yellow-100'
            }`}>
              <FaPhone className={`text-xl ${
                isPhoneVerified ? 'text-green-600' : 'text-yellow-600'
              }`} />
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h4 className="font-semibold text-gray-900">Phone Verification</h4>
                {isPhoneVerified ? (
                  <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                    <FaCheck size={10} />
                    Verified
                  </span>
                ) : (
                  <span className="flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                    <FaExclamationTriangle size={10} />
                    Not Verified
                  </span>
                )}
              </div>

              <p className="text-sm text-gray-600 mb-2">
                {phone || 'No phone number added'}
              </p>

              {!isPhoneVerified && (
                <p className="text-xs text-gray-500">
                  Verify your phone number to enable SMS notifications and two-factor authentication
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            {isPhoneVerified && phone && (
              <AnimatedButton
                onClick={handleOpenPhoneModal}
                className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm font-medium"
              >
                <FaEdit />
                Change
              </AnimatedButton>
            )}
            {!isPhoneVerified && (
              <AnimatedButton
                onClick={handleOpenPhoneModal}
                disabled={isLoading}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm font-medium"
              >
                {isLoading ? (
                  <>
                    <FaSpinner className="animate-spin" />
                    Processing...
                  </>
                ) : (
                  phone ? 'Verify Phone' : 'Add Phone'
                )}
              </AnimatedButton>
            )}
          </div>
        </div>
      </div>

      {/* Phone Number Modal */}
      <AnimatePresence>
        {showPhoneModal && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPhoneModal(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            />

            {/* Modal */}
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl"
              >
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FaPhone className="text-3xl text-blue-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {phone ? 'Change Phone Number' : 'Add Phone Number'}
                  </h3>
                  <p className="text-gray-600">
                    Enter your phone number in international format
                  </p>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <div className="relative">
                    <PhoneInput
                      international
                      defaultCountry={selectedCountry}
                      value={phoneNumber}
                      onChange={handlePhoneChange}
                      onCountryChange={(country) => country && setSelectedCountry(country)}
                      className={`phone-input-enhanced ${
                        phoneError
                          ? 'border-red-500 focus-within:border-red-600 focus-within:ring-red-200'
                          : phoneValidation?.isValid
                          ? 'border-green-500 focus-within:border-green-600 focus-within:ring-green-200'
                          : 'border-gray-300 focus-within:border-blue-500 focus-within:ring-blue-200'
                      }`}
                      disabled={isLoading}
                      placeholder="Enter phone number"
                    />
                    {/* Real-time validation icon */}
                    {phoneNumber && phoneNumber.length > 3 && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        {phoneValidation?.isValid ? (
                          <FaCheckCircle className="text-green-500 text-xl" />
                        ) : (
                          <FaTimes className="text-red-500 text-xl" />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Error message */}
                  {phoneError && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-2 text-sm text-red-600 flex items-center gap-1"
                    >
                      <FaTimes size={12} />
                      {phoneError}
                    </motion.p>
                  )}

                  {/* Success message for mobile */}
                  {phoneValidation?.isValid && phoneValidation?.isMobile && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-2 text-sm text-green-600 flex items-center gap-1"
                    >
                      <FaCheckCircle size={12} />
                      Valid mobile number
                    </motion.p>
                  )}

                  {/* Warning for non-mobile */}
                  {phoneValidation?.isValid && !phoneValidation?.isMobile && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-2 text-sm text-yellow-600 flex items-center gap-1"
                    >
                      <FaExclamationTriangle size={12} />
                      This appears to be a landline. Mobile number required for SMS.
                    </motion.p>
                  )}

                  {/* Format example */}
                  <p className="mt-2 text-xs text-gray-500">
                    Example: {exampleNumber}
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  <AnimatedButton
                    onClick={handleSendVerification}
                    disabled={isLoading || !phoneNumber}
                    className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <FaSpinner className="animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <FaPhone />
                        Send Verification Code
                      </>
                    )}
                  </AnimatedButton>

                  <button
                    onClick={() => setShowPhoneModal(false)}
                    className="w-full py-3 text-gray-600 hover:text-gray-700 font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* OTP Modal */}
      <AnimatePresence>
        {showOTPModal && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowOTPModal(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            />

            {/* Modal */}
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl"
              >
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FaPhone className="text-3xl text-blue-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    Verify Your Phone
                  </h3>
                  <p className="text-gray-600">
                    We've sent a 4-digit code to <span className="font-medium">{phoneNumber}</span>
                  </p>
                </div>

                <div className="mb-6">
                  <OTPInput
                    length={4}
                    value={otp}
                    onChange={handleOTPChange}
                    onComplete={handleOTPComplete}
                    disabled={isLoading}
                    error={otpError}
                    autoFocus
                  />
                </div>

                {otpError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800 text-sm"
                  >
                    <FaTimes />
                    <span>Invalid verification code. Please try again.</span>
                  </motion.div>
                )}

                <div className="flex flex-col gap-3">
                  <AnimatedButton
                    onClick={() => handleVerifyPhone(otp)}
                    disabled={isLoading || otp.length !== 4}
                    className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <FaSpinner className="animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        <FaCheck />
                        Verify Phone
                      </>
                    )}
                  </AnimatedButton>

                  <div className="flex items-center justify-between text-sm">
                    <button
                      onClick={handleResendVerification}
                      disabled={resendCooldown > 0 || isLoading}
                      className="text-blue-600 hover:text-blue-700 disabled:text-gray-400 disabled:cursor-not-allowed font-medium"
                    >
                      {resendCooldown > 0 ? (
                        `Resend in ${resendCooldown}s`
                      ) : (
                        'Resend Code'
                      )}
                    </button>

                    <button
                      onClick={() => setShowOTPModal(false)}
                      className="text-gray-600 hover:text-gray-700 font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default PhoneVerificationSection;
