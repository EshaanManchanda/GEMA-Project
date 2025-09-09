import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { 
  FaDollarSign,
  FaEuroSign,
  FaPoundSign,
  FaYenSign,
  FaChevronDown,
  FaGlobe,
  FaExchangeAlt
} from 'react-icons/fa';
import { RootState, AppDispatch } from '../../store';

interface Currency {
  code: string;
  name: string;
  symbol: string;
  flag: string;
  rate: number; // Exchange rate relative to AED
  icon?: React.ReactNode;
}

interface CurrencySelectorProps {
  className?: string;
  compact?: boolean;
  showRates?: boolean;
  onCurrencyChange?: (currency: Currency) => void;
}

const currencies: Currency[] = [
  {
    code: 'AED',
    name: 'UAE Dirham',
    symbol: 'د.إ',
    flag: '🇦🇪',
    rate: 1.0,
    icon: <FaDollarSign />
  },
  {
    code: 'USD',
    name: 'US Dollar',
    symbol: '$',
    flag: '🇺🇸',
    rate: 0.27,
    icon: <FaDollarSign />
  },
  {
    code: 'EUR',
    name: 'Euro',
    symbol: '€',
    flag: '🇪🇺',
    rate: 0.25,
    icon: <FaEuroSign />
  },
  {
    code: 'GBP',
    name: 'British Pound',
    symbol: '£',
    flag: '🇬🇧',
    rate: 0.21,
    icon: <FaPoundSign />
  },
  {
    code: 'JPY',
    name: 'Japanese Yen',
    symbol: '¥',
    flag: '🇯🇵',
    rate: 40.5,
    icon: <FaYenSign />
  },
  {
    code: 'SAR',
    name: 'Saudi Riyal',
    symbol: 'ر.س',
    flag: '🇸🇦',
    rate: 1.02,
    icon: <FaDollarSign />
  },
  {
    code: 'QAR',
    name: 'Qatari Riyal',
    symbol: 'ر.ق',
    flag: '🇶🇦',
    rate: 0.99,
    icon: <FaDollarSign />
  }
];

const CurrencySelector: React.FC<CurrencySelectorProps> = ({
  className = '',
  compact = false,
  showRates = false,
  onCurrencyChange
}) => {
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(currencies[0]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load saved currency from localStorage
  useEffect(() => {
    const savedCurrencyCode = localStorage.getItem('selectedCurrency');
    if (savedCurrencyCode) {
      const savedCurrency = currencies.find(c => c.code === savedCurrencyCode);
      if (savedCurrency) {
        setSelectedCurrency(savedCurrency);
      }
    }
  }, []);

  const handleCurrencySelect = async (currency: Currency) => {
    setIsLoading(true);
    setShowDropdown(false);
    
    // Simulate API call to update exchange rates
    setTimeout(() => {
      setSelectedCurrency(currency);
      localStorage.setItem('selectedCurrency', currency.code);
      onCurrencyChange?.(currency);
      setIsLoading(false);
    }, 500);
  };

  const formatPrice = (amount: number, fromCurrency: Currency = currencies[0]) => {
    const convertedAmount = fromCurrency.code === selectedCurrency.code 
      ? amount 
      : (amount * fromCurrency.rate) / selectedCurrency.rate;
    
    return `${selectedCurrency.symbol}${convertedAmount.toFixed(2)}`;
  };

  if (compact) {
    return (
      <div className={`relative ${className}`}>
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center space-x-1 px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
        >
          <span>{selectedCurrency.flag}</span>
          <span className="font-medium">{selectedCurrency.code}</span>
          <FaChevronDown size={12} className={`transform transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
        </button>

        {showDropdown && (
          <div className="absolute top-full right-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50">
            <div className="py-1 max-h-60 overflow-y-auto">
              {currencies.map((currency) => (
                <button
                  key={currency.code}
                  onClick={() => handleCurrencySelect(currency)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-100 ${
                    selectedCurrency.code === currency.code ? 'bg-blue-50 text-blue-600' : ''
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span>{currency.flag}</span>
                    <span>{currency.code}</span>
                  </div>
                  <span className="text-xs text-gray-500">{currency.symbol}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FaGlobe className="text-gray-600" size={20} />
            <h3 className="text-lg font-medium text-gray-900">Currency</h3>
          </div>
          {isLoading && (
            <div className="flex items-center space-x-2 text-sm text-blue-600">
              <FaExchangeAlt className="animate-spin" size={14} />
              <span>Updating rates...</span>
            </div>
          )}
        </div>
      </div>

      {/* Selected Currency Display */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{selectedCurrency.flag}</span>
            <div>
              <div className="font-medium text-gray-900">{selectedCurrency.name}</div>
              <div className="text-sm text-gray-500">{selectedCurrency.code} ({selectedCurrency.symbol})</div>
            </div>
          </div>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Change
            <FaChevronDown size={12} className={`ml-2 transform transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {showRates && (
          <div className="mt-3 text-xs text-gray-500">
            1 AED = {selectedCurrency.rate === 1 ? '1' : (1 / selectedCurrency.rate).toFixed(4)} {selectedCurrency.code}
          </div>
        )}
      </div>

      {/* Currency List */}
      {showDropdown && (
        <div className="p-2">
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {currencies.map((currency) => (
              <button
                key={currency.code}
                onClick={() => handleCurrencySelect(currency)}
                className={`w-full flex items-center justify-between p-3 rounded-md hover:bg-gray-100 transition-colors ${
                  selectedCurrency.code === currency.code ? 'bg-blue-50 ring-2 ring-blue-500' : ''
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-lg">{currency.flag}</span>
                  <div className="text-left">
                    <div className="font-medium text-gray-900">{currency.name}</div>
                    <div className="text-sm text-gray-500">{currency.code}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium text-gray-900">{currency.symbol}</div>
                  {showRates && (
                    <div className="text-xs text-gray-500">
                      Rate: {currency.rate}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CurrencySelector;