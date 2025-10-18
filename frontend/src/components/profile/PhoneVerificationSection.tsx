import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { FaPhone, FaCheck, FaTimes, FaSpinner, FaExclamationTriangle, FaEdit } from 'react-icons/fa';
import OTPInput from '../common/OTPInput';
import { AnimatedButton } from '../animations';

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
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState(phone || '');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [otpError, setOtpError] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Validate phone number (basic E.164 format)
  const validatePhone = (value: string): boolean => {
    const phoneRegex = /^\+[1-9]\d{7,14}$/;
    return phoneRegex.test(value);
  };

  const handleOpenPhoneModal = () => {
    setPhoneNumber(phone || '');
    setPhoneError('');
    setShowPhoneModal(true);
  };

  const handleSendVerification = async () => {
    if (!phoneNumber) {
      setPhoneError('Phone number is required');
      return;
    }

    if (!validatePhone(phoneNumber)) {
      setPhoneError('Please enter a valid international phone number (e.g., +1234567890)');
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

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPhoneNumber(value);
    setPhoneError('');
  };

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
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={handlePhoneChange}
                    placeholder="+1234567890"
                    className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-colors ${
                      phoneError
                        ? 'border-red-500 focus:border-red-600 focus:ring-red-200'
                        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
                    }`}
                    disabled={isLoading}
                  />
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
                  <p className="mt-2 text-xs text-gray-500">
                    Format: +[country code][number] (e.g., +1234567890)
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
