import React, { useState } from 'react';
import { Link } from 'react-router-dom';

interface ForgotPasswordFormData {
  email: string;
}

const ForgotPasswordPage: React.FC = () => {
  const [formData, setFormData] = useState<ForgotPasswordFormData>({
    email: ''
  });
  const [errors, setErrors] = useState<Partial<ForgotPasswordFormData>>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [requestSuccess, setRequestSuccess] = useState<boolean>(false);

  const validateForm = (): boolean => {
    const newErrors: Partial<ForgotPasswordFormData> = {};
    let isValid = true;

    if (!formData.email) {
      newErrors.email = 'Email is required';
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error when user types
    if (errors[name as keyof ForgotPasswordFormData]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }

    // Clear request error when user makes changes
    if (requestError) {
      setRequestError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setRequestError(null);
    setRequestSuccess(false);

    try {
      // In a real app, you would call your password reset API
      // const response = await fetch('/api/auth/forgot-password', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     email: formData.email
      //   })
      // });
      
      // if (!response.ok) {
      //   const errorData = await response.json();
      //   throw new Error(errorData.message || 'Password reset request failed');
      // }

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // For demo purposes, always show success
      setRequestSuccess(true);
    } catch (error) {
      console.error('Password reset request error:', error);
      setRequestError(error instanceof Error ? error.message : 'An unexpected error occurred');
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
            <h2 className="text-center text-2xl font-bold text-neutral-800">Reset your password</h2>
            <p className="mt-2 text-center text-sm text-neutral-600">
              Enter your email address and we'll send you a link to reset your password.
            </p>
          </div>
        
        {requestError && (
          <div className="alert alert-error mt-4 flex items-center">
            <svg className="h-5 w-5 text-error-500 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="ml-2 text-sm font-medium text-error-700">{requestError}</span>
          </div>
        )}
        
        {requestSuccess ? (
          <div className="alert alert-success mt-4" role="alert">
            <div className="flex items-start">
              <svg className="h-5 w-5 text-success-600 flex-shrink-0 mt-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-success-800">Password reset link sent!</h3>
                <p className="mt-2 text-sm text-success-700">
                  We've sent an email to <strong>{formData.email}</strong> with instructions to reset your password. Please check your inbox.
                </p>
                <div className="mt-4">
                  <Link to="/login" className="font-medium text-primary-600 hover:text-primary-700 transition-colors flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                    </svg>
                    Return to login
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email" className="form-label text-sm font-medium text-neutral-700">Email address</label>
              <div className="relative mt-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-neutral-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className={`input pl-10 w-full ${errors.email ? 'input-error' : 'border-neutral-300'}`}
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleInputChange}
                />
                {errors.email && (
                  <p className="form-error mt-1">{errors.email}</p>
                )}
              </div>
            </div>

            <div className="mt-2">
              <button
                type="submit"
                disabled={isLoading}
                className={`btn btn-lg w-full flex justify-center items-center space-x-2 ${isLoading ? 'bg-primary-400 cursor-not-allowed' : 'bg-primary-600 hover:bg-primary-700'} text-white font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow`}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <svg className="h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M2.125 8.471A.75.75 0 012.5 8h11a.75.75 0 01.614 1.182l-4.11 6a.75.75 0 01-1.228 0l-4.11-6a.75.75 0 01.353-1.182z" clipRule="evenodd" />
                      <path fillRule="evenodd" d="M2.125 4.5A.75.75 0 012.5 4h11a.75.75 0 01.614 1.182l-4.11 6a.75.75 0 01-1.228 0l-4.11-6A.75.75 0 012.5 4.5z" clipRule="evenodd" />
                    </svg>
                    <span>Send reset link</span>
                  </>
                )}
              </button>
            </div>

            <div className="text-center mt-4">
              <Link 
                to="/login" 
                className="font-medium text-primary-600 hover:text-primary-700 transition-colors flex items-center justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
                Back to login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
    </div>
  );
};

export default ForgotPasswordPage;