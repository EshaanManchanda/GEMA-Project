import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../../config/api';

interface CityAutocompleteProps {
  value: string;
  country?: string;  // Filter cities by country code
  onChange: (city: string) => void;
  required?: boolean;
  error?: string;
  className?: string;
}

/**
 * City dropdown component (filtered by country)
 * Fetches cities from /api/events/cities?country=XX
 * Searchable dropdown (like CountrySelect)
 * Restricted to fetched cities only
 * Fallback to text input if no cities available
 */
const CityAutocomplete: React.FC<CityAutocompleteProps> = ({
  value,
  country,
  onChange,
  required = false,
  error,
  className = '',
}) => {
  const [cities, setCities] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Fetch cities from API
  useEffect(() => {
    const fetchCities = async () => {
      setIsLoading(true);
      try {
        const params = country ? { country } : {};
        const response = await axios.get(`${API_BASE_URL}/events/cities`, { params });

        if (response.data.success) {
          setCities(response.data.data || []);
        }
      } catch (error) {
        console.error('Error fetching cities:', error);
        setCities([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCities();
  }, [country]); // Re-fetch when country changes

  // Filter cities based on search term (not value)
  const filteredCities = useMemo(() => {
    if (!search) return cities;

    const lowerSearch = search.toLowerCase();
    return cities.filter(city => city.toLowerCase().includes(lowerSearch));
  }, [search, cities]);

  // Fallback to text input if no cities available
  if (!isLoading && cities.length === 0) {
    return (
      <div className={`relative ${className}`}>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={required ? "Enter city *" : "Enter city"}
          className={`w-full px-3 py-2 border ${
            error ? 'border-red-500' : 'border-gray-300'
          } rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary bg-white text-gray-900`}
        />
        <p className="mt-1 text-xs text-gray-500">No cities available for this country. Enter city name manually.</p>
        {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Dropdown field (shows selected value or search) */}
      <div className="relative">
        <input
          type="text"
          value={isOpen ? search : value}
          onChange={(e) => {
            setSearch(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={required ? "Select city *" : "Select city"}
          className={`w-full px-3 py-2 border ${
            error ? 'border-red-500' : 'border-gray-300'
          } rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary bg-white text-gray-900`}
          disabled={isLoading}
        />

        {/* Dropdown arrow button */}
        {!isLoading && (
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"
          >
            ▼
          </button>
        )}

        {/* Loading indicator */}
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          </div>
        )}
      </div>

      {/* Dropdown list */}
      {isOpen && !isLoading && (
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
            {filteredCities.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">No cities found</div>
            ) : (
              filteredCities.map((city, index) => (
                <button
                  key={`${city}-${index}`}
                  type="button"
                  onClick={() => {
                    onChange(city);
                    setIsOpen(false);
                    setSearch('');
                  }}
                  className={`w-full text-left px-3 py-2 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none text-sm text-gray-900 ${
                    value === city ? 'bg-blue-100' : ''
                  }`}
                >
                  {city}
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

export default CityAutocomplete;
