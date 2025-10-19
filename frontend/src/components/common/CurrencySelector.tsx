import React, { useState } from 'react';
import {
  FaChevronDown,
  FaGlobe,
  FaExchangeAlt,
} from 'react-icons/fa';
import { useCurrencyContext } from '../../contexts/CurrencyContext';

interface CurrencySelectorProps {
  className?: string;
  compact?: boolean;
  showRates?: boolean;
}

const CurrencySelector: React.FC<CurrencySelectorProps> = ({
  className = '',
  compact = false,
  showRates = false,
}) => {
  const {
    currentCurrency,
    changeCurrency,
    currencyInfo,
    supportedCurrencies,
    isAutoDetected,
    isLoading: contextLoading,
    exchangeRates,
    fromCurrency,
    toCurrency
  } = useCurrencyContext();

  const [showDropdown, setShowDropdown] = useState(false);

  const handleCurrencySelect = (currencyCode: string) => {
    changeCurrency(currencyCode as any);
    setShowDropdown(false);
  };

  if (compact) {
    return (
      <div className={`relative ${className}`}>
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center space-x-1 px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          disabled={contextLoading}
        >
          <span>{currencyInfo.flag}</span>
          <span className="font-medium">{currencyInfo.code}</span>
          {isAutoDetected && (
            <span className="text-xs bg-blue-100 text-blue-700 px-1 rounded">Auto</span>
          )}
          <FaChevronDown size={12} className={`transform transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
        </button>

        {showDropdown && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowDropdown(false)}
            />
            <div className="absolute top-full right-0 mt-1 w-56 bg-white border border-gray-200 rounded-md shadow-lg" style={{ zIndex: 100}}>
              <div className="py-1 max-h-60 overflow-y-auto">
                {supportedCurrencies.map((currency) => (
                  <button
                    key={currency.code}
                    onClick={() => handleCurrencySelect(currency.code)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-100 transition-colors ${
                      currentCurrency === currency.code ? 'bg-blue-50 text-blue-600' : ''
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <span>{currency.flag}</span>
                      <span className="font-medium">{currency.code}</span>
                      <span className="text-xs text-gray-500">{currency.name}</span>
                    </div>
                    <span className="text-xs font-medium">{currency.symbol}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
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
          {contextLoading && (
            <div className="flex items-center space-x-2 text-sm text-blue-600">
              <FaExchangeAlt className="animate-spin" size={14} />
              <span>Loading rates...</span>
            </div>
          )}
          {isAutoDetected && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
              Auto-detected
            </span>
          )}
        </div>
      </div>

      {/* Selected Currency Display */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{currencyInfo.flag}</span>
            <div>
              <div className="font-medium text-gray-900">{currencyInfo.name}</div>
              <div className="text-sm text-gray-500">{currencyInfo.code} ({currencyInfo.symbol})</div>
            </div>
          </div>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            disabled={contextLoading}
          >
            Change
            <FaChevronDown size={12} className={`ml-2 transform transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {showRates && (
          <div className="mt-3 text-xs text-gray-500">
            1 {fromCurrency} = {exchangeRates[toCurrency] / exchangeRates[fromCurrency]} {toCurrency}
          </div>
        )}
      </div>

      {/* Currency List */}
      {showDropdown && (
        <div className="p-2">
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {supportedCurrencies.map((currency) => (
              <button
                key={currency.code}
                onClick={() => handleCurrencySelect(currency.code)}
                className={`w-full flex items-center justify-between p-3 rounded-md hover:bg-gray-100 transition-colors ${
                  currentCurrency === currency.code ? 'bg-blue-50 ring-2 ring-blue-500' : ''
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
                  {showRates && exchangeRates && fromCurrency && toCurrency && (
                    <div className="text-xs text-gray-500">
                      Rate: {exchangeRates[currency.code] / exchangeRates[fromCurrency]}
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
