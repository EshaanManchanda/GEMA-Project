import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

const VerifyEmailPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [token, setToken] = useState<string | null>(null);
  const [otp, setOtp] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [verificationStatus, setVerificationStatus] = useState<'success' | 'error' | 'pending' | 'otp-required'>('pending');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [verificationMode, setVerificationMode] = useState<'token' | 'otp'>('token');

  useEffect(() => {
    // Extract token from URL query parameters
    const queryParams = new URLSearchParams(location.search);
    const verificationToken = queryParams.get('token');

    if (!verificationToken) {
      // No token provided, switch to OTP mode
      setVerificationMode('otp');
      setVerificationStatus('otp-required');
      setIsLoading(false);
      return;
    }

    setToken(verificationToken);
    setVerificationMode('token');

    // Auto-verify with token
    const verifyWithToken = async () => {
      try {
        setIsLoading(true);
        const { authAPI } = await import('@/services/api/authAPI');
        await authAPI.verifyEmail(verificationToken);
        setVerificationStatus('success');
      } catch (error) {
        console.error('Email verification error:', error);
        setVerificationStatus('error');
        setErrorMessage(error instanceof Error ? error.message : 'Email verification failed');
      } finally {
        setIsLoading(false);
      }
    };

    verifyWithToken();
  }, [location]);

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 4); // Only digits, max 4
    setOtp(value);
    setErrorMessage('');
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!otp || otp.length !== 4) {
      setErrorMessage('Please enter a valid 4-digit OTP');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const { authAPI } = await import('@/services/api/authAPI');
      await authAPI.verifyEmailWithOTP(otp);
      setVerificationStatus('success');
    } catch (error: any) {
      console.error('OTP verification error:', error);
      setErrorMessage(error.response?.data?.message || error.message || 'Invalid OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRedirectToLogin = () => {
    navigate('/login', {
      state: {
        message: 'Your email has been verified. You can now log in.',
        type: 'success'
      }
    });
  };

  const handleResendOtp = async () => {
    try {
      setIsLoading(true);
      // For this to work, we'd need the user's email - this could come from URL params or user state
      // For now, show a message asking user to check their email
      setErrorMessage('Please check your email for a new verification code, or contact support if you need help.');
    } catch (error: any) {
      setErrorMessage('Failed to resend verification code. Please try again or contact support.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 animate-fade-in-up">
        <div className="bg-white p-8 rounded-xl shadow-medium border border-neutral-200">
          <div className="text-center">
            <img src="/assets/animations/loading.svg" alt="Logo" className="h-12 w-12 mx-auto mb-4" />
            <h2 className="text-center text-2xl font-bold text-neutral-800">
              {verificationMode === 'otp' ? 'Verify Your Email' : 'Email Verification'}
            </h2>
            <p className="mt-2 text-center text-sm text-neutral-600">
              {isLoading ? 'Verifying your email address...' :
                verificationStatus === 'success' ? 'Your email has been verified!' :
                verificationStatus === 'otp-required' ? 'Enter the 4-digit code sent to your email' :
                'There was a problem verifying your email.'}
            </p>
          </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <svg className="animate-spin h-12 w-12 text-primary-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        ) : verificationStatus === 'success' ? (
          <div className="alert alert-success flex items-start p-4 rounded-lg bg-green-50 border border-green-200 mb-4" role="alert">
            <div className="flex-shrink-0 mr-3">
              <svg className="h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-green-800">Success!</p>
              <p className="text-sm text-green-700">Your email address has been successfully verified. You can now access all features of your account.</p>
              <div className="mt-4">
                <button
                  onClick={handleRedirectToLogin}
                  className="btn btn-lg w-full flex justify-center items-center space-x-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow"
                >
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
                  </svg>
                  <span>Continue to login</span>
                </button>
              </div>
            </div>
          </div>
        ) : verificationStatus === 'otp-required' ? (
          <>
            {errorMessage && (
              <div className="alert alert-error flex items-center space-x-3 mb-4" role="alert">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-error-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <p className="text-sm font-medium">{errorMessage}</p>
              </div>
            )}

            <form className="mt-6 space-y-6" onSubmit={handleOtpSubmit}>
              <div className="form-group">
                <label htmlFor="otp" className="form-label">Verification Code</label>
                <div className="relative">
                  <input
                    id="otp"
                    name="otp"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    required
                    className="input text-center text-2xl tracking-widest"
                    placeholder="••••"
                    value={otp}
                    onChange={handleOtpChange}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`btn btn-lg w-full flex justify-center items-center space-x-2 ${
                    isLoading ? 'bg-primary-400 cursor-not-allowed' : 'bg-primary-600 hover:bg-primary-700'
                  } text-white font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow`}
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <span>Verify Email</span>
                  )}
                </button>
              </div>
            </form>

            <div className="text-center">
              <p className="text-sm text-neutral-600">
                Didn't receive the code?{' '}
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={isLoading}
                  className="font-medium text-primary-600 hover:text-primary-700 transition-colors disabled:text-primary-400"
                >
                  Request new code
                </button>
              </p>
              <div className="mt-4">
                <Link to="/login" className="flex items-center justify-center text-primary-600 hover:text-primary-700 transition-colors duration-200">
                  <svg className="h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">Back to login</span>
                </Link>
              </div>
            </div>
          </>
        ) : (
          <div className="alert alert-error flex items-start p-4 rounded-lg bg-red-50 border border-red-200 mb-4" role="alert">
            <div className="flex-shrink-0 mr-3">
              <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-red-800">Verification failed</p>
              <p className="text-sm text-red-700">{errorMessage || 'There was a problem verifying your email address.'}</p>
              <div className="mt-4 space-y-4">
                <div>
                  <Link to="/login" className="flex items-center text-primary-600 hover:text-primary-700 transition-colors duration-200">
                    <svg className="h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium">Return to login</span>
                  </Link>
                </div>
                <div>
                  <p className="text-sm text-neutral-600">If you're having trouble, please contact our support team.</p>
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailPage;