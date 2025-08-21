import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

const VerifyEmailPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [verificationStatus, setVerificationStatus] = useState<'success' | 'error' | 'pending'>('pending');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    // Extract token from URL query parameters
    const queryParams = new URLSearchParams(location.search);
    const verificationToken = queryParams.get('token');
    
    if (!verificationToken) {
      setVerificationStatus('error');
      setErrorMessage('Verification token is missing');
      setIsLoading(false);
      return;
    }
    
    setToken(verificationToken);
    
    // In a real app, you would verify the token with your API
    const verifyEmail = async () => {
      try {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // For demo purposes, validate token format (should be at least 20 chars)
        if (verificationToken.length < 20) {
          throw new Error('Invalid verification token');
        }
        
        // In a real app, you would make an API call like this:
        // const response = await fetch(`/api/auth/verify-email?token=${verificationToken}`);
        // if (!response.ok) {
        //   const errorData = await response.json();
        //   throw new Error(errorData.message || 'Email verification failed');
        // }
        
        setVerificationStatus('success');
      } catch (error) {
        console.error('Email verification error:', error);
        setVerificationStatus('error');
        setErrorMessage(error instanceof Error ? error.message : 'An unexpected error occurred');
      } finally {
        setIsLoading(false);
      }
    };
    
    verifyEmail();
  }, [location]);

  const handleRedirectToLogin = () => {
    navigate('/login', { 
      state: { 
        message: 'Your email has been verified. You can now log in.', 
        type: 'success' 
      } 
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 animate-fade-in-up">
        <div className="bg-white p-8 rounded-xl shadow-medium border border-neutral-200">
          <div className="text-center">
            <img src="/assets/animations/loading.svg" alt="Logo" className="h-12 w-12 mx-auto mb-4" />
            <h2 className="text-center text-2xl font-bold text-neutral-800">Email Verification</h2>
            <p className="mt-2 text-center text-sm text-neutral-600">
              {isLoading ? 'Verifying your email address...' : 
                verificationStatus === 'success' ? 'Your email has been verified!' : 
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