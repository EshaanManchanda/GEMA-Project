import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

type Currency = 'INR' | 'AED' | 'USD' | 'EUR' | 'GBP';

interface CurrencyInfo {
  code: Currency;
  name: string;
  symbol: string;
  flag: string;
  decimals: number;
  locale: string;
}

interface ExchangeRates {
  [key: string]: number;
}

interface CurrencyContextType {
  currentCurrency: Currency;
  changeCurrency: (currency: Currency) => void;
  formatPrice: (amount: number, fromCurrency?: Currency) => string;
  formatPriceWithConversion: (amount: number, fromCurrency: Currency) => string;
  convertCurrency: (amount: number, fromCurrency: Currency, toCurrency: Currency) => number;
  currencySymbol: string;
  currencyInfo: CurrencyInfo;
  exchangeRates: ExchangeRates;
  isAutoDetected: boolean;
  supportedCurrencies: CurrencyInfo[];
  isLoading: boolean;
}

export const CURRENCY_INFO: Record<Currency, CurrencyInfo> = {
  INR: { code: 'INR', name: 'Indian Rupee', symbol: '₹', flag: '🇮🇳', decimals: 2, locale: 'en-IN' },
  AED: { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', flag: '🇦🇪', decimals: 2, locale: 'ar-AE' },
  USD: { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸', decimals: 2, locale: 'en-US' },
  EUR: { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺', decimals: 2, locale: 'en-EU' },
  GBP: { code: 'GBP', name: 'British Pound', symbol: '£', flag: '🇬🇧', decimals: 2, locale: 'en-GB' },
};

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentCurrency, setCurrentCurrency] = useState<Currency>('INR');
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>({});
  const [isAutoDetected, setIsAutoDetected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Fetch exchange rates from backend
  const fetchExchangeRates = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/currency/rates`);
      if (response.data.success) {
        setExchangeRates(response.data.data.rates);
      }
    } catch (error) {
      console.error('Error fetching exchange rates:', error);
      // Use fallback rates if API fails
      setExchangeRates({
        INR: 1.0,
        AED: 0.044,
        USD: 0.012,
        EUR: 0.011,
        GBP: 0.0095,
      });
    }
  };

  // Auto-detect currency based on IP geolocation
  const autoDetectCurrency = async (): Promise<Currency> => {
    try {
      // Use ipapi.co for free IP geolocation
      const response = await axios.get('https://ipapi.co/json/');
      const countryCode = response.data.country_code;

      // Map country codes to currencies
      const currencyMap: Record<string, Currency> = {
        IN: 'INR',
        AE: 'AED',
        US: 'USD',
        GB: 'GBP',
        // EU countries
        DE: 'EUR', FR: 'EUR', IT: 'EUR', ES: 'EUR', NL: 'EUR',
        BE: 'EUR', AT: 'EUR', PT: 'EUR', GR: 'EUR', IE: 'EUR',
      };

      return currencyMap[countryCode] || 'INR'; // Default to INR
    } catch (error) {
      console.error('Error auto-detecting currency:', error);
      return 'INR'; // Default to INR if detection fails
    }
  };

  useEffect(() => {
    const initializeCurrency = async () => {
      setIsLoading(true);

      // Fetch exchange rates first
      await fetchExchangeRates();

      // Check if currency is already saved in localStorage
      const savedCurrency = localStorage.getItem('currency') as Currency;
      const isManuallySet = localStorage.getItem('currencyManuallySet') === 'true';

      if (savedCurrency && isManuallySet && Object.keys(CURRENCY_INFO).includes(savedCurrency)) {
        // User has manually selected a currency before
        setCurrentCurrency(savedCurrency);
        setIsAutoDetected(false);
      } else {
        // First visit or auto-detect enabled - detect currency
        const detectedCurrency = await autoDetectCurrency();
        setCurrentCurrency(detectedCurrency);
        setIsAutoDetected(true);
        localStorage.setItem('currency', detectedCurrency);
        localStorage.setItem('currencyManuallySet', 'false');
      }

      setIsLoading(false);
    };

    initializeCurrency();

    // Refresh exchange rates every hour
    const intervalId = setInterval(fetchExchangeRates, 3600000);
    return () => clearInterval(intervalId);
  }, []);

  const changeCurrency = (currency: Currency) => {
    setCurrentCurrency(currency);
    localStorage.setItem('currency', currency);
    localStorage.setItem('currencyManuallySet', 'true');
    setIsAutoDetected(false);
  };

  // Convert currency using exchange rates
  const convertCurrency = (amount: number, fromCurrency: Currency, toCurrency: Currency): number => {
    if (fromCurrency === toCurrency) return amount;

    const fromRate = exchangeRates[fromCurrency] || 1;
    const toRate = exchangeRates[toCurrency] || 1;

    // Convert to INR first (base currency), then to target currency
    const inrAmount = amount / fromRate;
    const convertedAmount = inrAmount * toRate;

    return Math.round(convertedAmount * 100) / 100; // Round to 2 decimals
  };

  // Format price in current currency
  const formatPrice = (amount: number, fromCurrency: Currency = 'INR'): string => {
    const convertedAmount = convertCurrency(amount, fromCurrency, currentCurrency);
    const { symbol, locale, decimals } = CURRENCY_INFO[currentCurrency];

    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currentCurrency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(convertedAmount).replace(currentCurrency, symbol);
  };

  // Format price with conversion indicator
  const formatPriceWithConversion = (amount: number, fromCurrency: Currency): string => {
    const displayAmount = formatPrice(amount, fromCurrency);

    // If displaying in non-INR currency, show conversion notice
    if (currentCurrency !== 'INR' && fromCurrency === 'INR') {
      const inrSymbol = CURRENCY_INFO.INR.symbol;
      return `${displayAmount} (~${inrSymbol}${amount.toFixed(2)} will be charged)`;
    }

    return displayAmount;
  };

  return (
    <CurrencyContext.Provider
      value={{
        currentCurrency,
        changeCurrency,
        formatPrice,
        formatPriceWithConversion,
        convertCurrency,
        currencySymbol: CURRENCY_INFO[currentCurrency].symbol,
        currencyInfo: CURRENCY_INFO[currentCurrency],
        exchangeRates,
        isAutoDetected,
        supportedCurrencies: Object.values(CURRENCY_INFO),
        isLoading,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrencyContext = () => {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrencyContext must be used within a CurrencyProvider');
  }
  return context;
};