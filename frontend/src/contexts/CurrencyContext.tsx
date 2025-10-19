import React, { createContext, useContext, useState, useEffect } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

type Currency = 'AED' | 'INR' | 'USD' | 'EUR' | 'GBP';

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
  formatPrice: (amount: number, currencyCode?: Currency) => string;
  formatPriceWithConversion: (amount: number, fromCurrency: Currency) => string;
  convertCurrency: (amount: number, fromCurrency: Currency, toCurrency: Currency) => number;
  currencySymbol: string;
  currencyInfo: CurrencyInfo;
  exchangeRates: ExchangeRates;
  fetchExchangeRates: () => Promise<void>;
  autoDetectCurrency: () => Promise<void>;
  fromCurrency: Currency;
  toCurrency: Currency;
  isAutoDetected: boolean;
  supportedCurrencies: CurrencyInfo[];
  isLoading: boolean;
}

export const CURRENCY_INFO: Record<Currency, CurrencyInfo> = {
  AED: { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', flag: '🇦🇪', decimals: 2, locale: 'ar-AE' },
  INR: { code: 'INR', name: 'Indian Rupee', symbol: '₹', flag: '🇮🇳', decimals: 2, locale: 'en-IN' },
  USD: { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸', decimals: 2, locale: 'en-US' },
  EUR: { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺', decimals: 2, locale: 'en-EU' },
  GBP: { code: 'GBP', name: 'British Pound', symbol: '£', flag: '🇬🇧', decimals: 2, locale: 'en-GB' },
};

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentCurrency, setCurrentCurrency] = useState<Currency>(() => {
    const storedCurrency = localStorage.getItem('currency');
    return (storedCurrency as Currency) || 'AED';
  });
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>({});
  const [isAutoDetected, setIsAutoDetected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [fromCurrency, setFromCurrency] = useState<Currency>('INR'); // Default from currency
  const [toCurrency, setToCurrency] = useState<Currency>('AED'); // Default to currency

  const fetchExchangeRates = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/exchange-rates`);
      const data = await response.json();
      setExchangeRates(data.rates);
    } catch (error) {
      console.error('Error fetching exchange rates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const autoDetectCurrency = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
      const detectedCurrencyCode = data.currency as Currency;

      if (supportedCurrencies.some(c => c.code === detectedCurrencyCode)) {
        setCurrentCurrency(detectedCurrencyCode);
        setIsAutoDetected(true);
      } else {
        setCurrentCurrency('AED'); // Default to AED if detected currency is not supported
        setIsAutoDetected(false);
      }
    } catch (error) {
      console.error('Error auto-detecting currency:', error);
      setCurrentCurrency('AED'); // Default to AED on error
      setIsAutoDetected(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const initializeCurrency = async () => {
      await fetchExchangeRates();

      const manuallySet = localStorage.getItem('currencyManuallySet');
      if (!manuallySet) {
        await autoDetectCurrency();
      }
    };

    initializeCurrency();

    const refreshInterval = setInterval(fetchExchangeRates, 3600000); // Refresh every hour
    return () => clearInterval(refreshInterval);
  }, []);

  const changeCurrency = (currency: Currency) => {
    setCurrentCurrency(currency);
    localStorage.setItem('currency', currency);
    localStorage.setItem('currencyManuallySet', 'true');
    setIsAutoDetected(false);
  };

  const convertCurrency = (amount: number, from: Currency, to: Currency): number => {
    if (!exchangeRates[from] || !exchangeRates[to]) {
      console.warn(`Exchange rates for ${from} or ${to} not available.`);
      return amount; // Return original amount if rates are missing
    }
    // Convert amount from 'from' currency to USD, then from USD to 'to' currency
    const amountInUSD = amount / exchangeRates[from];
    return amountInUSD * exchangeRates[to];
  };

  const formatPrice = (amount: number, currencyCode: Currency = currentCurrency): string => {
    const { symbol, locale, decimals } = CURRENCY_INFO[currencyCode];

    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(amount).replace(currencyCode, symbol);
  };

  const formatPriceWithConversion = (amount: number, fromCurrency: Currency): string => {
    const convertedAmount = convertCurrency(amount, fromCurrency, currentCurrency);
    const fromCurrencyInfo = CURRENCY_INFO[fromCurrency];
    const toCurrencyInfo = CURRENCY_INFO[currentCurrency];

    return `~${formatPrice(convertedAmount)} (${formatPrice(amount, fromCurrency)} ${fromCurrencyInfo.code} = ${formatPrice(convertedAmount)} ${toCurrencyInfo.code})`;
  };

  const supportedCurrencies = Object.values(CURRENCY_INFO);

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
        fetchExchangeRates,
        autoDetectCurrency,
        fromCurrency,
        toCurrency,
        isAutoDetected,
        supportedCurrencies,
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