import React, { useState } from 'react';
import { ChevronDown, Phone } from 'lucide-react';

export interface PhoneInputProps {
  countryCode: string;
  phoneNumber: string;
  onCountryCodeChange: (code: string) => void;
  onPhoneNumberChange: (number: string) => void;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

const POPULAR_COUNTRIES = [
  { code: '+1', name: 'United States', flag: '🇺🇸' },
  { code: '+44', name: 'United Kingdom', flag: '🇬🇧' },
  { code: '+971', name: 'United Arab Emirates', flag: '🇦🇪' },
  { code: '+966', name: 'Saudi Arabia', flag: '🇸🇦' },
  { code: '+91', name: 'India', flag: '🇮🇳' },
  { code: '+92', name: 'Pakistan', flag: '🇵🇰' },
  { code: '+880', name: 'Bangladesh', flag: '🇧🇩' },
  { code: '+65', name: 'Singapore', flag: '🇸🇬' },
  { code: '+60', name: 'Malaysia', flag: '🇲🇾' },
  { code: '+62', name: 'Indonesia', flag: '🇮🇩' },
  { code: '+63', name: 'Philippines', flag: '🇵🇭' },
  { code: '+86', name: 'China', flag: '🇨🇳' },
  { code: '+81', name: 'Japan', flag: '🇯🇵' },
  { code: '+82', name: 'South Korea', flag: '🇰🇷' },
  { code: '+49', name: 'Germany', flag: '🇩🇪' },
  { code: '+33', name: 'France', flag: '🇫🇷' },
  { code: '+39', name: 'Italy', flag: '🇮🇹' },
  { code: '+34', name: 'Spain', flag: '🇪🇸' },
  { code: '+7', name: 'Russia', flag: '🇷🇺' },
  { code: '+52', name: 'Mexico', flag: '🇲🇽' },
  { code: '+55', name: 'Brazil', flag: '🇧🇷' },
  { code: '+61', name: 'Australia', flag: '🇦🇺' },
  { code: '+27', name: 'South Africa', flag: '🇿🇦' }
];

const PhoneInput: React.FC<PhoneInputProps> = ({
  countryCode,
  phoneNumber,
  onCountryCodeChange,
  onPhoneNumberChange,
  error,
  disabled = false,
  required = false,
  className = ''
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const selectedCountry = POPULAR_COUNTRIES.find(country => country.code === countryCode) || POPULAR_COUNTRIES[0];

  const handleCountrySelect = (code: string) => {
    onCountryCodeChange(code);
    setIsDropdownOpen(false);
  };

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ''); // Only allow digits
    onPhoneNumberChange(value);
  };

  return (
    <div className={`form-group ${className}`}>
      <label className="form-label">
        Phone number {required && <span className="text-red-500">*</span>}
      </label>

      <div className="relative flex">
        {/* Country Code Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            disabled={disabled}
            className={`
              relative flex items-center justify-between px-3 py-2
              border border-gray-300 rounded-l-lg bg-white
              hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
              disabled:bg-gray-100 disabled:cursor-not-allowed
              min-w-[120px] h-[42px]
              ${error ? 'border-red-500' : 'border-gray-300'}
            `}
            aria-haspopup="listbox"
            aria-expanded={isDropdownOpen}
          >
            <div className="flex items-center space-x-2">
              <span className="text-lg">{selectedCountry.flag}</span>
              <span className="text-sm font-medium text-gray-700">{selectedCountry.code}</span>
            </div>
            <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute top-full left-0 z-50 w-80 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {POPULAR_COUNTRIES.map((country) => (
                <button
                  key={country.code}
                  type="button"
                  onClick={() => handleCountrySelect(country.code)}
                  className={`
                    w-full flex items-center px-3 py-2 text-left hover:bg-gray-50
                    ${country.code === countryCode ? 'bg-primary-50 text-primary-700' : 'text-gray-700'}
                  `}
                >
                  <span className="text-lg mr-3">{country.flag}</span>
                  <span className="flex-1 text-sm">{country.name}</span>
                  <span className="text-sm font-medium text-gray-500">{country.code}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Phone Number Input */}
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Phone className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="tel"
            value={phoneNumber}
            onChange={handlePhoneNumberChange}
            disabled={disabled}
            placeholder="501234567"
            required={required}
            className={`
              w-full pl-10 pr-3 py-2 border border-l-0 rounded-r-lg
              focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
              disabled:bg-gray-100 disabled:cursor-not-allowed
              ${error ? 'border-red-500' : 'border-gray-300'}
            `}
            autoComplete="tel"
          />
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <p className="form-error mt-1">{error}</p>
      )}

      {/* Helper Text */}
      <p className="text-xs text-gray-500 mt-1">
        Enter your phone number without the country code
      </p>

      {/* Dropdown Backdrop */}
      {isDropdownOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsDropdownOpen(false)}
        />
      )}
    </div>
  );
};

export default PhoneInput;