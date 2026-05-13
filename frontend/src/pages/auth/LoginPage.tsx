import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { toast } from 'react-hot-toast';

import { loginUser } from '@/store/slices/authSlice';
import { AppDispatch } from '@/store';
import { API_BASE_URL } from '@/config/api';
import logger from '@/utils/logger';
import PrivatePageSEO from '@/components/common/PrivatePageSEO';
import { getRoleBasedRedirectPath, type UserRole } from '@/utils/roleRedirect';

interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

interface TestAccount {
  email: string;
  password: string;
  role: string;
  label: string;
}

const TEST_ACCOUNTS: TestAccount[] = [
  { email: 'customer@gema.com', password: 'customer123', role: 'customer', label: 'Customer' },
  { email: 'teacher@gema.com', password: 'teacher123', role: 'teacher', label: 'Teacher' },
  { email: 'vendor@gema.com', password: 'vendor123', role: 'vendor', label: 'Vendor' },
  { email: 'admin@gema.com', password: 'admin123', role: 'admin', label: 'Admin' },
  { email: 'employee@gema.com', password: 'Employee123!', role: 'employee', label: 'Employee' },
];

const getSafeRedirectPath = (redirect: string | null): string | null => {
  if (!redirect) {
    return null;
  }

  // Only allow same-origin app routes.
  if (!redirect.startsWith('/') || redirect.startsWith('//')) {
    return null;
  }

  return redirect;
};

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch<AppDispatch>();
  const redirectPath = getSafeRedirectPath(new URLSearchParams(location.search).get('redirect'));
  const registerLink = redirectPath
    ? `/register?redirect=${encodeURIComponent(redirectPath)}`
    : '/register';
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
    rememberMe: false
  });
  const [errors, setErrors] = useState<Partial<LoginFormData>>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginStatus, setLoginStatus] = useState<string>('');
  const [showTestAccounts, setShowTestAccounts] = useState<boolean>(false);
  const [backendStatus, setBackendStatus] = useState<'connected' | 'connecting' | 'error'>('connecting');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Check backend connection on mount (development only)
  useEffect(() => {
    if (import.meta.env.DEV) {
      logger.debug('🔗 Login Page Loaded', {
        apiBaseUrl: API_BASE_URL,
        currentDomain: window.location.hostname,
        environment: import.meta.env.MODE
      });
      setBackendStatus('connected');
    }
  }, []);

  const handleTestAccountFill = (account: TestAccount) => {
    setFormData({
      email: account.email,
      password: account.password,
      rememberMe: false
    });
    setShowTestAccounts(false);
    setErrors({});
    setLoginError(null);
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<LoginFormData> = {};
    let isValid = true;

    if (!formData.email) {
      newErrors.email = 'Email is required';
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
      isValid = false;
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
      isValid = false;
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Clear error when user types
    if (errors[name as keyof LoginFormData]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }

    // Clear login error when user makes changes
    if (loginError) {
      setLoginError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setLoginError(null);
    setLoginStatus('Authenticating...');

    try {
      // Use Redux action for login
      setLoginStatus('Verifying credentials...');
      const result = await dispatch(loginUser({
        email: formData.email,
        password: formData.password,
        rememberMe: formData.rememberMe
      }));

      if (loginUser.fulfilled.match(result)) {
        const response = result.payload;

        setLoginStatus('Login successful! Redirecting...');

        // Store user data; tokens are managed via httpOnly cookies
        localStorage.setItem('user', JSON.stringify(response.user));

        if (formData.rememberMe) {
          localStorage.setItem('rememberMe', 'true');
        }

        // Block unverified users and redirect them to verify their email
        if (!response.user?.isEmailVerified) {
          toast.error('Please verify your email before logging in.');
          navigate(`/verify-email?email=${encodeURIComponent(formData.email)}`, { replace: true });
          return;
        }

        if (redirectPath) {
          navigate(redirectPath, { replace: true });
          return;
        }

        const role = response.user?.role as UserRole | undefined;
        const fallbackPath = role ? getRoleBasedRedirectPath(role) : '/';
        navigate(fallbackPath, { replace: true });
      } else {
        const errorMessage = result.payload as string || 'An unexpected error occurred';
        setLoginError(errorMessage);

        // Provide more helpful error messages
        if (errorMessage.includes('credentials')) {
          setLoginError('Invalid email or password. Please check your credentials and try again.');
        } else if (errorMessage.includes('network') || errorMessage.includes('timeout')) {
          setLoginError('Network error. Please check your internet connection and try again.');
        } else if (errorMessage.includes('warming up')) {
          setLoginError('Backend server is starting up. Please wait a moment and try again.');
        }
      }

    } catch (error: any) {
      console.error('Login error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';

      // Provide context-specific error messages
      if (error.code === 'ERR_NETWORK') {
        setLoginError('Unable to reach the server. Please check your internet connection.');
      } else if (error.response?.status === 401) {
        setLoginError('Invalid email or password. Please try again.');
      } else if (error.response?.status === 429) {
        setLoginError('Too many login attempts. Please wait a few minutes and try again.');
      } else if (error.response?.status >= 500) {
        setLoginError('Server error. Please try again in a few moments.');
      } else {
        setLoginError(errorMessage);
      }
    } finally {
      setIsLoading(false);
      setLoginStatus('');
    }
  };

  return (
    <>
      <PrivatePageSEO title="Login | Kidrove" description="Sign in to your Kidrove account" />
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-medium border border-neutral-200 animate-fade-in-up">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <img src="/assets/animations/loading.svg" alt="Logo" className="h-16 w-auto" />
            </div>
            <h2 className="text-center text-3xl font-extrabold text-gradient">Welcome Back!</h2>
            <p className="mt-2 text-center text-base text-neutral-600">
              Sign in to continue to your account
            </p>
            <p className="mt-1 text-center text-sm text-neutral-500">
              Don't have an account?{' '}
              <Link to={registerLink} className="font-medium text-primary-600 hover:text-primary-700 transition-colors">
                Create one now
              </Link>
            </p>
          </div>

          {/* Development: Backend Status & Test Accounts */}
          {import.meta.env.DEV && (
            <div className="space-y-2">
              {/* Backend Status */}
              <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg border border-neutral-200 text-xs">
                <span className="text-neutral-600">Backend Status:</span>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${backendStatus === 'connected' ? 'bg-success-500' : backendStatus === 'connecting' ? 'bg-warning-500' : 'bg-error-500'}`}></div>
                  <span className="font-medium text-neutral-700">
                    {backendStatus === 'connected' ? '🟢 Connected' : backendStatus === 'connecting' ? '🟡 Connecting' : '🔴 Error'}
                  </span>
                </div>
              </div>

              {/* Test Accounts Toggle */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowTestAccounts(!showTestAccounts)}
                  className="w-full flex items-center justify-between p-3 bg-primary-50 text-primary-700 rounded-lg border-2 border-primary-200 hover:border-primary-300 transition-all duration-200 text-sm font-medium"
                >
                  <span className="flex items-center space-x-2">
                    <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <span>Quick Test Login</span>
                  </span>
                  <svg className={`h-4 w-4 transition-transform duration-200 ${showTestAccounts ? 'transform rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>

                {/* Test Accounts Dropdown */}
                {showTestAccounts && (
                  <div className="absolute z-10 w-full mt-2 bg-white border-2 border-primary-200 rounded-lg shadow-lg overflow-hidden animate-fade-in-up">
                    {TEST_ACCOUNTS.map((account) => (
                      <button
                        key={account.email}
                        type="button"
                        onClick={() => handleTestAccountFill(account)}
                        className="w-full px-4 py-3 text-left hover:bg-primary-50 transition-colors duration-150 border-b border-neutral-100 last:border-b-0"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-neutral-800">{account.label}</p>
                            <p className="text-xs text-neutral-500">{account.email}</p>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${account.role === 'admin' ? 'bg-error-100 text-error-700' :
                            account.role === 'vendor' ? 'bg-warning-100 text-warning-700' :
                              account.role === 'employee' ? 'bg-info-100 text-info-700' :
                                'bg-success-100 text-success-700'
                            }`}>
                            {account.role}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Login Status Message */}
          {loginStatus && (
            <div className="flex items-center justify-center space-x-3 p-3 bg-info-50 border border-info-200 rounded-lg animate-pulse" role="status">
              <svg className="animate-spin h-5 w-5 text-info-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-sm font-medium text-info-700">{loginStatus}</p>
            </div>
          )}

          {loginError && (
            <div className="bg-error-50 border-l-4 border-error-500 p-4 rounded-lg animate-shake" role="alert">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-error-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <h3 className="text-sm font-medium text-error-800">Login Failed</h3>
                  <p className="text-sm text-error-700 mt-1">{loginError}</p>
                  {(loginError.includes('server') || loginError.includes('network') || loginError.includes('warming up')) && (
                    <button
                      type="button"
                      onClick={() => {
                        setLoginError(null);
                        if (formData.email && formData.password) {
                          handleSubmit(new Event('submit') as any);
                        }
                      }}
                      className="mt-2 text-sm font-medium text-error-700 hover:text-error-800 underline transition-colors"
                    >
                      Retry Now
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setLoginError(null)}
                  className="ml-3 flex-shrink-0 text-error-600 hover:text-error-800 transition-colors"
                >
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="form-group">
                <label htmlFor="email" className="form-label">Email address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-neutral-400" viewBox="0 0 20 20" fill="currentColor">
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
                    className={`input pl-10 ${errors.email ? 'input-error' : ''}`}
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={handleInputChange}
                  />
                </div>
                {errors.email && (
                  <p className="form-error">{errors.email}</p>
                )}
              </div>
              <div className="form-group">
                <label htmlFor="password" className="form-label">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-neutral-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    className={`input pl-10 pr-10 ${errors.password ? 'input-error' : ''}`}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleInputChange}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600 focus:outline-none"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                        <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.064 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                      </svg>
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="form-error">{errors.password}</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center group relative">
                <input
                  id="remember-me"
                  name="rememberMe"
                  type="checkbox"
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-neutral-300 rounded transition-colors cursor-pointer"
                  checked={formData.rememberMe}
                  onChange={handleInputChange}
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-neutral-700 cursor-pointer">
                  Remember me
                </label>
                {/* Tooltip */}
                <div className="absolute left-0 top-full mt-1 hidden group-hover:block z-20 w-48 p-2 bg-neutral-800 text-white text-xs rounded shadow-lg">
                  Keep me signed in on this device
                  <div className="absolute -top-1 left-4 w-2 h-2 bg-neutral-800 transform rotate-45"></div>
                </div>
              </div>

              <div className="text-sm">
                <Link
                  to="/forgot-password"
                  className="font-medium text-primary-600 hover:text-primary-700 transition-colors flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                  Forgot password?
                </Link>
              </div>
            </div>

            <div className="mt-2">
              <button
                type="submit"
                disabled={isLoading}
                className={`btn btn-lg w-full flex justify-center items-center space-x-2 py-3 px-6 rounded-lg font-medium text-base transition-all duration-200 transform ${isLoading
                  ? 'bg-primary-400 cursor-not-allowed scale-95'
                  : 'bg-primary-600 hover:bg-primary-700 hover:shadow-lg hover:scale-105 active:scale-95'
                  } text-white shadow-md focus:outline-none focus:ring-4 focus:ring-primary-300`}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>{loginStatus || 'Signing in...'}</span>
                  </>
                ) : (
                  <>
                    <svg className="h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                    <span>Sign in</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-50 text-gray-500">
                Or continue with
              </span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3">
            <div>
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                {isLoading ? 'Signing in...' : 'Sign in with Google'}
              </button>
            </div>
          </div>
        </div> */}
        </div>
      </div>
    </>
  );
};

export default LoginPage;