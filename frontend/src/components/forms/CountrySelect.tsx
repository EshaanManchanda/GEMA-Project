import React, { useState, useMemo } from 'react';
import { getAllCountries } from '@/utils/countries';

interface CountrySelectProps {
  value: string;
  onChange: (code: string) => void;
  required?: boolean;
  error?: string;
  className?: string;
}

/**
 * Country selector with search functionality
 * Shows flag emoji + country name
 * Returns ISO 3166-1 alpha-2 code
 */
const CountrySelect: React.FC<CountrySelectProps> = ({
  value,
  onChange,
  required = false,
  error,
  className = '',
}) => {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const countries = useMemo(() => getAllCountries(), []);

  const filteredCountries = useMemo(() => {
    if (!search) return countries;
    const lowerSearch = search.toLowerCase();
    return countries.filter(
      c =>
        c.name.toLowerCase().includes(lowerSearch) ||
        c.code.toLowerCase().includes(lowerSearch)
    );
  }, [search, countries]);

  const selectedCountry = countries.find(c => c.code === value);

  return (
    <div className={`relative ${className}`}>
      {/* Search input / Display field */}
      <div className="relative">
        <input
          type="text"
          value={isOpen ? search : (selectedCountry ? `${selectedCountry.flag} ${selectedCountry.name}` : '')}
          onChange={(e) => {
            setSearch(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={required ? "Select country *" : "Select country (optional)"}
          className={`w-full px-3 py-2 border ${
            error ? 'border-red-500' : 'border-gray-300'
          } rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary bg-white text-gray-900`}
        />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"
        >
          ▼
        </button>
      </div>

      {/* Dropdown list */}
      {isOpen && (
        <>
          {/* Backdrop to close dropdown */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => {
              setIsOpen(false);
              setSearch('');
            }}
          />

          {/* Options list */}
          <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
            {filteredCountries.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">No countries found</div>
            ) : (
              filteredCountries.map((country) => (
                <button
                  key={country.code}
                  type="button"
                  onClick={() => {
                    onChange(country.code);
                    setIsOpen(false);
                    setSearch('');
                  }}
                  className={`w-full text-left px-3 py-2 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none ${
                    value === country.code ? 'bg-blue-100' : ''
                  }`}
                >
                  <span className="mr-2">{country.flag}</span>
                  <span className="text-sm text-gray-900">{country.name}</span>
                  <span className="ml-2 text-xs text-gray-500">({country.code})</span>
                </button>
              ))
            )}
          </div>
        </>
      )}

      {/* Error message */}
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
};

export default CountrySelect;
