import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { FaEnvelope, FaCheck, FaTimes, FaSpinner, FaExclamationTriangle } from 'react-icons/fa';
import OTPInput from '../common/OTPInput';
import { AnimatedButton } from '../animations';

interface EmailVerificationSectionProps {
  email: string;
  isEmailVerified: boolean;
  onSendVerification: () => Promise<void>;
  onVerifyEmail: (otp: string) => Promise<void>;
  onResendVerification: () => Promise<void>;
}

const EmailVerificationSection: React.FC<EmailVerificationSectionProps> = ({
  email,
  isEmailVerified,
  onSendVerification,
  onVerifyEmail,
  onResendVerification,
}) => {
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [otpError, setOtpError] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleSendVerification = async () => {
    setIsLoading(true);
    setOtpError(false);
    try {
      await onSendVerification();
      setShowOTPModal(true);
      setResendCooldown(60); // 60 seconds cooldown
      toast.success('Verification code sent to your email');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send verification code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyEmail = async (otpValue: string) => {
    setIsLoading(true);
    setOtpError(false);
    try {
      await onVerifyEmail(otpValue);
      toast.success('Email verified successfully!');
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
      toast.success('Verification code resent to your email');
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
    handleVerifyEmail(value);
  };

  return (
    <>
      <div className="bg-white rounded-2xl p-6 border border-gray-200 hover:border-gray-300 transition-colors">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4 flex-1">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              isEmailVerified ? 'bg-green-100' : 'bg-yellow-100'
            }`}>
              <FaEnvelope className={`text-xl ${
                isEmailVerified ? 'text-green-600' : 'text-yellow-600'
              }`} />
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h4 className="font-semibold text-gray-900">Email Verification</h4>
                {isEmailVerified ? (
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

              <p className="text-sm text-gray-600 mb-2">{email}</p>

              {!isEmailVerified && (
                <p className="text-xs text-gray-500">
                  Verify your email to secure your account and receive important notifications
                </p>
              )}
            </div>
          </div>

          {!isEmailVerified && (
            <AnimatedButton
              onClick={handleSendVerification}
              disabled={isLoading}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm font-medium"
            >
              {isLoading ? (
                <>
                  <FaSpinner className="animate-spin" />
                  Sending...
                </>
              ) : (
                'Verify Email'
              )}
            </AnimatedButton>
          )}
        </div>
      </div>

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
                    <FaEnvelope className="text-3xl text-blue-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    Verify Your Email
                  </h3>
                  <p className="text-gray-600">
                    We've sent a 4-digit code to <span className="font-medium">{email}</span>
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
                    onClick={() => handleVerifyEmail(otp)}
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
                        Verify Email
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

export default EmailVerificationSection;
