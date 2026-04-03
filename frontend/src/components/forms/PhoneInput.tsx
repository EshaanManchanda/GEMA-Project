import React, { useState, useMemo } from 'react';
import { ChevronDown, Phone, Search } from 'lucide-react';
import { getCountries, getCountryCallingCode } from 'react-phone-number-input';
import en from 'react-phone-number-input/locale/en.json';

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

interface CountryOption {
  iso: string;
  code: string;
  name: string;
  flag: string;
}

// Build full country list from libphonenumber-js
const ALL_COUNTRIES: CountryOption[] = getCountries()
  .map((iso) => {
    const callingCode = getCountryCallingCode(iso);
    return {
      iso,
      code: `+${callingCode}`,
      name: (en as Record<string, string>)[iso] || iso,
      flag: iso
        .toUpperCase()
        .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0))),
    };
  })
  .sort((a, b) => a.name.localeCompare(b.name));

const PhoneInput: React.FC<PhoneInputProps> = ({
  countryCode,
  phoneNumber,
  onCountryCodeChange,
  onPhoneNumberChange,
  error,
  disabled = false,
  required = false,
  className = '',
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selectedCountry =
    ALL_COUNTRIES.find((c) => c.code === countryCode) || ALL_COUNTRIES[0];

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return ALL_COUNTRIES;
    return ALL_COUNTRIES.filter(
      (c) => c.name.toLowerCase().includes(q) || c.code.includes(q),
    );
  }, [search]);

  const handleCountrySelect = (code: string) => {
    onCountryCodeChange(code);
    setIsDropdownOpen(false);
    setSearch('');
  };

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
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
            <ChevronDown
              className={`h-4 w-4 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {isDropdownOpen && (
            <div className="absolute top-full left-0 z-50 w-80 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
              {/* Search */}
              <div className="p-2 border-b border-gray-100">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search country..."
                    className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                    autoFocus
                  />
                </div>
              </div>
              {/* List */}
              <div className="max-h-56 overflow-y-auto">
                {filtered.map((country) => (
                  <button
                    key={country.iso}
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
                {filtered.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">No countries found</p>
                )}
              </div>
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

      {error && <p className="form-error mt-1">{error}</p>}

      <p className="text-xs text-gray-500 mt-1">Enter your phone number without the country code</p>

      {isDropdownOpen && (
        <div className="fixed inset-0 z-40" onClick={() => { setIsDropdownOpen(false); setSearch(''); }} />
      )}
    </div>
  );
};

export default PhoneInput;
