import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { verifyEmailWithOTP, resendVerificationEmail } from '@/store/slices/authSlice';
import OTPInput from '@/components/common/OTPInput';
import PrivatePageSEO from '@/components/common/PrivatePageSEO';

const RESEND_COOLDOWN = 60; // seconds

const VerifyEmailPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { isLoading } = useAppSelector((state) => state.auth);

  // Email can come from navigation state (RegisterPage redirect) or query param (direct link)
  const locationState = location.state as { email?: string } | null;
  const queryEmail = new URLSearchParams(location.search).get('email') || '';
  const [email, setEmail] = useState<string>(locationState?.email || queryEmail);

  const [otp, setOtp] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'success'>('idle');

  // Resend cooldown timer
  const [cooldown, setCooldown] = useState<number>(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  const startCooldown = () => {
    setCooldown(RESEND_COOLDOWN);
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleOtpChange = (value: string) => {
    setOtp(value);
    if (errorMessage) setErrorMessage('');
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      setErrorMessage('Email address is missing. Please go back to the login page.');
      return;
    }

    if (!otp || otp.length !== 6) {
      setErrorMessage('Please enter the complete 6-digit verification code.');
      return;
    }

    setErrorMessage('');

    try {
      await dispatch(verifyEmailWithOTP({ email: email.trim(), otp })).unwrap();
      setVerificationStatus('success');

      // Auto-redirect to home after 2.5s
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 2500);
    } catch (error: any) {
      setErrorMessage(
        error || 'Invalid or expired code. Please try again or request a new one.'
      );
    }
  };

  const handleResendOtp = async () => {
    if (!email.trim()) {
      setErrorMessage('Email address is missing. Please enter your email address below.');
      return;
    }

    if (cooldown > 0) return;

    try {
      await dispatch(resendVerificationEmail(email.trim())).unwrap();
      setErrorMessage('');
      startCooldown();
    } catch (error: any) {
      setErrorMessage(
        error || 'Failed to resend the verification code. Please try again.'
      );
    }
  };

  // ─── Success Screen ───────────────────────────────────────────────────────
  if (verificationStatus === 'success') {
    return (
      <>
        <PrivatePageSEO title="Email Verified | Kidrove" description="Your email has been verified" />
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-white py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full animate-fade-in-up">
            <div className="bg-white p-8 rounded-xl shadow-medium border border-neutral-200 text-center">
              {/* Animated checkmark */}
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
                <svg className="h-10 w-10 text-green-500 animate-bounce" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-neutral-800 mb-2">Email Verified!</h2>
              <p className="text-neutral-600 mb-1">Your account is now active.</p>
              <p className="text-sm text-neutral-500">Redirecting you to the homepage...</p>
              <div className="mt-6 flex justify-center">
                <div className="w-8 h-1 bg-primary-200 rounded-full overflow-hidden">
                  <div className="h-full bg-primary-500 animate-pulse rounded-full" style={{ width: '100%' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ─── OTP Entry Screen ─────────────────────────────────────────────────────
  return (
    <>
      <PrivatePageSEO title="Verify Email | Kidrove" description="Verify your email address with the OTP code sent to you" />
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-6 animate-fade-in-up">
          <div className="bg-white p-8 rounded-xl shadow-medium border border-neutral-200">

            {/* Header */}
            <div className="text-center mb-6">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary-100">
                <svg className="h-7 w-7 text-primary-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-neutral-800">Check your email</h2>
              <p className="mt-2 text-sm text-neutral-600">
                We sent a 6-digit verification code to{' '}
                {email ? (
                  <span className="font-semibold text-primary-600">{email}</span>
                ) : (
                  'your email address'
                )}
              </p>
              <p className="mt-1 text-xs text-neutral-400">
                The code expires in 5 minutes. Check your spam folder if you don't see it.
              </p>
            </div>

            {/* Error Alert */}
            {errorMessage && (
              <div className="flex items-start space-x-3 mb-5 p-3 bg-red-50 border border-red-200 rounded-lg" role="alert">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <p className="text-sm text-red-700">{errorMessage}</p>
              </div>
            )}

            <form onSubmit={handleOtpSubmit} className="space-y-5">
              {/* Email field — shown only if not pre-filled from state */}
              {!locationState?.email && (
                <div className="form-group">
                  <label htmlFor="verify-email" className="form-label">Email Address</label>
                  <input
                    id="verify-email"
                    name="email"
                    type="email"
                    required
                    className="input"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              )}

              {/* 6-digit OTP input */}
              <div className="form-group">
                <label className="form-label text-center block mb-3">Verification Code</label>
                <OTPInput
                  length={6}
                  value={otp}
                  onChange={handleOtpChange}
                  onComplete={(value) => setOtp(value)}
                  error={!!errorMessage}
                  disabled={isLoading}
                  autoFocus
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading || otp.length !== 6}
                className={`btn btn-lg w-full flex justify-center items-center space-x-2 font-medium rounded-lg transition-all duration-200 shadow-sm ${
                  isLoading || otp.length !== 6
                    ? 'bg-primary-300 cursor-not-allowed text-white'
                    : 'bg-primary-600 hover:bg-primary-700 text-white hover:shadow'
                }`}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Verifying...</span>
                  </>
                ) : (
                  <span>Verify Email</span>
                )}
              </button>
            </form>

            {/* Resend + Back to Login */}
            <div className="mt-6 space-y-3 text-center">
              <p className="text-sm text-neutral-600">
                Didn't receive the code?{' '}
                {cooldown > 0 ? (
                  <span className="text-neutral-400 font-medium">
                    Resend in {cooldown}s
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={isLoading}
                    className="font-medium text-primary-600 hover:text-primary-700 transition-colors disabled:text-primary-300"
                  >
                    Resend code
                  </button>
                )}
              </p>

              <Link
                to="/login"
                className="inline-flex items-center justify-center text-sm text-neutral-500 hover:text-neutral-700 transition-colors"
              >
                <svg className="h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
                Back to login
              </Link>
            </div>

          </div>
        </div>
      </div>
    </>
  );
};

export default VerifyEmailPage;