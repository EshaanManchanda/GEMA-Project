import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { registerUser, verifyEmailWithOTP, resendVerificationEmail, clearError } from '@/store/slices/authSlice';
import PhoneInput from '@/components/forms/PhoneInput';
import PrivatePageSEO from '@/components/common/PrivatePageSEO';
import OTPInput from '@/components/common/OTPInput';

interface RegisterFormData {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    confirmPassword: string;
    countryCode: string;
    phoneNumber: string;
    agreeToTerms: boolean;
}

const VendorRegisterPage: React.FC = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { isLoading, error } = useAppSelector((state) => state.auth);
    const [formData, setFormData] = useState<RegisterFormData>({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: '',
        countryCode: '+971', // Default to UAE
        phoneNumber: '',
        agreeToTerms: false
    });
    const [errors, setErrors] = useState<Partial<RegisterFormData>>({});
    const [showPassword, setShowPassword] = useState<boolean>(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);

    // Clear any existing errors when component mounts
    useEffect(() => {
        dispatch(clearError());
    }, [dispatch]);

    const validateStep1Form = (): boolean => {
        const newErrors: Partial<RegisterFormData> = {};
        let isValid = true;

        if (!formData.firstName.trim()) {
            newErrors.firstName = 'First name is required';
            isValid = false;
        }

        if (!formData.lastName.trim()) {
            newErrors.lastName = 'Last name is required';
            isValid = false;
        }

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
        } else if (formData.password.length < 8) {
            newErrors.password = 'Password must be at least 8 characters long';
            isValid = false;
        } else if (!/[A-Z]/.test(formData.password)) {
            newErrors.password = 'Password must contain at least one uppercase letter';
            isValid = false;
        } else if (!/[a-z]/.test(formData.password)) {
            newErrors.password = 'Password must contain at least one lowercase letter';
            isValid = false;
        } else if (!/\d/.test(formData.password)) {
            newErrors.password = 'Password must contain at least one number';
            isValid = false;
        } else if (!/[!@#$%^&*]/.test(formData.password)) {
            newErrors.password = 'Password must contain at least one special character (e.g., !@#$%^&*)';
            isValid = false;
        }

        if (!formData.confirmPassword) {
            newErrors.confirmPassword = 'Please confirm your password';
            isValid = false;
        } else if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match';
            isValid = false;
        }

        if (!formData.countryCode) {
            newErrors.countryCode = 'Country code is required';
            isValid = false;
        }

        if (!formData.phoneNumber) {
            newErrors.phoneNumber = 'Phone number is required';
            isValid = false;
        } else if (formData.phoneNumber.length < 7 || formData.phoneNumber.length > 14) {
            newErrors.phoneNumber = 'Phone number must be between 7 and 14 digits';
            isValid = false;
        }

        if (!formData.agreeToTerms) {
            newErrors.agreeToTerms = true;
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
        if (errors[name as keyof RegisterFormData]) {
            setErrors(prev => ({
                ...prev,
                [name]: undefined
            }));
        }
    };

    const handleCountryCodeChange = (code: string) => {
        setFormData(prev => ({
            ...prev,
            countryCode: code
        }));

        if (errors.countryCode) {
            setErrors(prev => ({
                ...prev,
                countryCode: undefined
            }));
        }
    };

    const handlePhoneNumberChange = (number: string) => {
        setFormData(prev => ({
            ...prev,
            phoneNumber: number
        }));

        if (errors.phoneNumber) {
            setErrors(prev => ({
                ...prev,
                phoneNumber: undefined
            }));
        }
    };

    const handleStep1Submit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateStep1Form()) {
            return;
        }

        try {
            // Use Redux registerUser thunk with fixed 'vendor' role
            await dispatch(registerUser({
                firstName: formData.firstName,
                lastName: formData.lastName,
                email: formData.email,
                password: formData.password,
                confirmPassword: formData.confirmPassword,
                phone: `${formData.countryCode}${formData.phoneNumber}`,
                role: 'vendor',
                acceptTerms: formData.agreeToTerms
            })).unwrap();

            // Move to step 2 for email verification
            sessionStorage.setItem('pendingVerifyEmail', formData.email);
            navigate('/verify-email?redirect=/vendor', { state: { email: formData.email }, replace: true });
        } catch (error: any) {
            console.error('Registration error:', error);
        }
    };

    return (
        <>
            <PrivatePageSEO title="Vendor Registration | Kidrove" description="Join Kidrove as a vendor and grow your business" />
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-white py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-md w-full space-y-6 animate-fade-in-up">
                    <div className="bg-white p-8 rounded-xl shadow-medium border border-neutral-200">
                        <div className="text-center">
                            <img src="/assets/animations/loading.svg" alt="Logo" className="h-12 w-12 mx-auto mb-4" />
                            <h2 className="text-center text-2xl font-bold text-neutral-800">Become a Vendor</h2>
                            <p className="mt-2 text-center text-sm text-neutral-600">
                                Join our community and list your events
                            </p>
                            <p className="mt-1 text-center text-sm text-neutral-500">
                                Already have an account?{' '}
                                <Link to="/login" className="font-medium text-orange-600 hover:text-orange-700 transition-colors">
                                    Sign in
                                </Link>
                            </p>
                        </div>

                        {error && (
                            <div className="alert alert-error flex items-center space-x-3 mb-4" role="alert">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-error-600" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                <p className="text-sm font-medium">{error}</p>
                            </div>
                        )}

                        <form className="mt-6 space-y-6" onSubmit={handleStep1Submit}>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="form-group">
                                        <label htmlFor="firstName" className="form-label">First name</label>
                                        <input
                                            id="firstName"
                                            name="firstName"
                                            type="text"
                                            autoComplete="given-name"
                                            required
                                            className={`input ${errors.firstName ? 'input-error' : ''} focus:ring-orange-500 focus:border-orange-500`}
                                            placeholder="John"
                                            value={formData.firstName}
                                            onChange={handleInputChange}
                                        />
                                        {errors.firstName && (
                                            <p className="form-error">{errors.firstName}</p>
                                        )}
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="lastName" className="form-label">Last name</label>
                                        <input
                                            id="lastName"
                                            name="lastName"
                                            type="text"
                                            autoComplete="family-name"
                                            required
                                            className={`input ${errors.lastName ? 'input-error' : ''} focus:ring-orange-500 focus:border-orange-500`}
                                            placeholder="Doe"
                                            value={formData.lastName}
                                            onChange={handleInputChange}
                                        />
                                        {errors.lastName && (
                                            <p className="form-error">{errors.lastName}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label htmlFor="email" className="form-label">Email address</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <svg className="h-5 w-5 text-neutral-400 api-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
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
                                            className={`input pl-10 ${errors.email ? 'input-error' : ''} focus:ring-orange-500 focus:border-orange-500`}
                                            placeholder="vendor@company.com"
                                            value={formData.email}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                    {errors.email && (
                                        <p className="form-error">{errors.email}</p>
                                    )}
                                </div>

                                <PhoneInput
                                    countryCode={formData.countryCode}
                                    phoneNumber={formData.phoneNumber}
                                    onCountryCodeChange={handleCountryCodeChange}
                                    onPhoneNumberChange={handlePhoneNumberChange}
                                    error={errors.countryCode || errors.phoneNumber}
                                    required
                                    disabled={isLoading}
                                />

                                <div className="form-group">
                                    <label htmlFor="password" className="form-label">Password</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <svg className="h-5 w-5 text-neutral-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <input
                                            id="password"
                                            name="password"
                                            type={showPassword ? 'text' : 'password'}
                                            autoComplete="new-password"
                                            required
                                            className={`input pl-10 pr-10 ${errors.password ? 'input-error' : ''} focus:ring-orange-500 focus:border-orange-500`}
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

                                <div className="form-group">
                                    <label htmlFor="confirmPassword" className="form-label">Confirm password</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <svg className="h-5 w-5 text-neutral-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <input
                                            id="confirmPassword"
                                            name="confirmPassword"
                                            type={showConfirmPassword ? 'text' : 'password'}
                                            autoComplete="new-password"
                                            required
                                            className={`input pl-10 pr-10 ${errors.confirmPassword ? 'input-error' : ''} focus:ring-orange-500 focus:border-orange-500`}
                                            placeholder="••••••••"
                                            value={formData.confirmPassword}
                                            onChange={handleInputChange}
                                        />
                                        <button
                                            type="button"
                                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600 focus:outline-none"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        >
                                            {showConfirmPassword ? (
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
                                    {errors.confirmPassword && (
                                        <p className="form-error">{errors.confirmPassword}</p>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center">
                                <input
                                    id="agree-terms"
                                    name="agreeToTerms"
                                    type="checkbox"
                                    className={`h-4 w-4 text-orange-600 focus:ring-orange-500 border-neutral-300 rounded transition-colors ${errors.agreeToTerms ? 'border-error-300' : ''}`}
                                    checked={formData.agreeToTerms}
                                    onChange={handleInputChange}
                                    required
                                />
                                <label htmlFor="agree-terms" className="ml-2 block text-sm text-neutral-700">
                                    I agree to the{' '}
                                    <Link to="/terms" className="font-medium text-orange-600 hover:text-orange-700 transition-colors">
                                        Terms of Service
                                    </Link>{' '}
                                    and{' '}
                                    <Link to="/privacy" className="font-medium text-orange-600 hover:text-orange-700 transition-colors">
                                        Privacy Policy
                                    </Link>
                                </label>
                            </div>
                            {errors.agreeToTerms && (
                                <p className="form-error mt-1">You must agree to the terms and conditions</p>
                            )}

                            <div className="mt-2">
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className={`btn btn-lg w-full flex justify-center items-center space-x-2 ${isLoading ? 'bg-orange-400 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-700'
                                        } text-white font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow`}
                                >
                                    {isLoading ? (
                                        <>
                                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            <span>Creating Vendor Account...</span>
                                        </>
                                    ) : (
                                        <>
                                            <svg className="h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                            </svg>
                                            <span>Create Vendor Account</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </>
    );
};

export default VendorRegisterPage;
