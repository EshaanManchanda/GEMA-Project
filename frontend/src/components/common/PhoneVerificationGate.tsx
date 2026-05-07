/**
 * Phone Verification Gate Component
 * Blocks or warns users who haven't verified their phone number
 */
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaPhone, FaExclamationTriangle, FaLock } from 'react-icons/fa';
import { useSelector } from 'react-redux';
import { selectUser } from '@/store/slices/authSlice';

interface PhoneVerificationGateProps {
  children: React.ReactNode;
  mode?: 'redirect' | 'modal' | 'banner';
  requiredFor?: string; // e.g., "booking", "payment"
}

/**
 * Phone Verification Gate Component
 * Prevents access to sensitive features without phone verification
 *
 * @example
 * ```tsx
 * <PhoneVerificationGate mode="redirect" requiredFor="booking">
 *   <BookingPage />
 * </PhoneVerificationGate>
 * ```
 */
const PhoneVerificationGate: React.FC<PhoneVerificationGateProps> = ({
  children,
  mode = 'redirect',
  requiredFor = 'this feature',
}) => {
  const user = useSelector(selectUser);
  const location = useLocation();

  // Allow access if user is admin or employee
  if (user?.role === 'admin' || user?.role === 'employee') {
    return <>{children}</>;
  }

  // Check if phone is verified
  const isPhoneVerified = user?.isPhoneVerified;
  const hasPhone = !!user?.phone;

  // If phone is verified, allow access
  if (isPhoneVerified) {
    return <>{children}</>;
  }

  // Handle different modes
  switch (mode) {
    case 'redirect':
      // Redirect to profile page with return URL
      return (
        <Navigate
          to="/profile?tab=verification"
          state={{ from: location.pathname, requiredFor }}
          replace
        />
      );

    case 'modal':
      return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl"
          >
            <div className="text-center">
              <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaLock className="text-4xl text-yellow-600" />
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                Phone Verification Required
              </h2>

              <p className="text-gray-600 mb-6">
                {hasPhone
                  ? `Please verify your phone number to access ${requiredFor}.`
                  : `Please add and verify your phone number to access ${requiredFor}.`}
              </p>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3 text-left">
                  <FaPhone className="text-blue-600 mt-1" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900 mb-1">
                      Why is phone verification required?
                    </p>
                    <p className="text-xs text-blue-700">
                      Phone verification helps secure your account and enables important
                      notifications about your {requiredFor}.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <a
                  href="/profile?tab=verification"
                  className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <FaPhone />
                  {hasPhone ? 'Verify Phone Number' : 'Add Phone Number'}
                </a>

                <button
                  onClick={() => window.history.back()}
                  className="w-full py-3 text-gray-600 hover:text-gray-700 font-medium"
                >
                  Go Back
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      );

    case 'banner':
      return (
        <>
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-yellow-50 to-amber-50 border-l-4 border-yellow-500 p-4 mb-6 shadow-sm"
          >
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <FaExclamationTriangle className="text-yellow-600 text-2xl" />
              </div>

              <div className="flex-1">
                <h3 className="text-lg font-semibold text-yellow-900 mb-1">
                  Phone Verification Required
                </h3>
                <p className="text-sm text-yellow-800 mb-3">
                  {hasPhone
                    ? `To access ${requiredFor}, please verify your phone number.`
                    : `To access ${requiredFor}, please add and verify your phone number.`}
                </p>

                <a
                  href="/profile?tab=verification"
                  className="inline-flex items-center gap-2 bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors text-sm font-medium"
                >
                  <FaPhone />
                  {hasPhone ? 'Verify Now' : 'Add Phone Number'}
                </a>
              </div>
            </div>
          </motion.div>

          {/* Blur the content behind the banner */}
          <div className="pointer-events-none opacity-50 blur-sm">{children}</div>
        </>
      );

    default:
      return <>{children}</>;
  }
};

/**
 * Hook to check if user has verified phone
 */
export const usePhoneVerification = () => {
  const user = useSelector(selectUser);

  return {
    isPhoneVerified: user?.isPhoneVerified || false,
    hasPhone: !!user?.phone,
    phone: user?.phone,
    isExempt: user?.role === 'admin' || user?.role === 'employee',
    needsVerification:
      user && !user.isPhoneVerified && user.role !== 'admin' && user.role !== 'employee',
  };
};

export default PhoneVerificationGate;
