import React, { createContext, useContext, useReducer, useMemo, useEffect, useRef } from 'react';
import i18n from 'i18next';
import { API_BASE_URL } from '../config/api';

// ========== TYPES ==========
export type Theme = 'light' | 'dark' | 'system';
export type Language = 'en' | 'ar';
export type Currency = 'AED' | 'INR' | 'USD' | 'EUR' | 'GBP';

export interface CurrencyInfo {
  code: Currency;
  name: string;
  symbol: string;
  flag: string;
  decimals: number;
  locale: string;
}

export interface ExchangeRates {
  [key: string]: number;
}

interface PreferencesState {
  // Theme
  theme: Theme;
  isDarkMode: boolean;

  // Language
  currentLanguage: Language;
  isRTL: boolean;

  // Currency
  currentCurrency: Currency;
  exchangeRates: ExchangeRates;
  isAutoDetected: boolean;
  isLoading: boolean;
}

interface PreferencesContextValue extends PreferencesState {
  // Theme methods
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;

  // Language methods
  changeLanguage: (lang: Language) => void;

  // Currency methods
  changeCurrency: (currency: Currency) => void;
  formatPrice: (amount: number, currencyCode?: Currency) => string;
  formatPriceWithConversion: (amount: number, fromCurrency: Currency) => string;
  convertCurrency: (amount: number, fromCurrency: Currency, toCurrency: Currency) => number;
  currencySymbol: string;
  currencyInfo: CurrencyInfo;
  supportedCurrencies: CurrencyInfo[];
}

// ========== CONSTANTS ==========
export const CURRENCY_INFO: Record<Currency, CurrencyInfo> = {
  AED: { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', flag: '🇦🇪', decimals: 2, locale: 'ar-AE' },
  INR: { code: 'INR', name: 'Indian Rupee', symbol: '₹', flag: '🇮🇳', decimals: 2, locale: 'en-IN' },
  USD: { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸', decimals: 2, locale: 'en-US' },
  EUR: { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺', decimals: 2, locale: 'en-EU' },
  GBP: { code: 'GBP', name: 'British Pound', symbol: '£', flag: '🇬🇧', decimals: 2, locale: 'en-GB' },
};

const SUPPORTED_CURRENCIES = Object.values(CURRENCY_INFO);

// ========== REDUCER ==========
type PreferencesAction =
  | { type: 'SET_THEME'; payload: Theme }
  | { type: 'SET_IS_DARK_MODE'; payload: boolean }
  | { type: 'SET_LANGUAGE'; payload: Language }
  | { type: 'SET_CURRENCY'; payload: Currency }
  | { type: 'SET_EXCHANGE_RATES'; payload: ExchangeRates }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_AUTO_DETECTED'; payload: boolean };

const preferencesReducer = (state: PreferencesState, action: PreferencesAction): PreferencesState => {
  switch (action.type) {
    case 'SET_THEME':
      return { ...state, theme: action.payload };
    case 'SET_IS_DARK_MODE':
      return { ...state, isDarkMode: action.payload };
    case 'SET_LANGUAGE':
      return { ...state, currentLanguage: action.payload, isRTL: action.payload === 'ar' };
    case 'SET_CURRENCY':
      return { ...state, currentCurrency: action.payload };
    case 'SET_EXCHANGE_RATES':
      return { ...state, exchangeRates: action.payload };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_AUTO_DETECTED':
      return { ...state, isAutoDetected: action.payload };
    default:
      return state;
  }
};

// ========== INITIAL STATE ==========
const getInitialState = (): PreferencesState => {
  const savedTheme = (localStorage.getItem('theme') as Theme) || 'system';
  const savedLanguage = (localStorage.getItem('language') as Language) || 'en';
  const savedCurrency = (localStorage.getItem('currency') as Currency) || 'AED';

  return {
    theme: savedTheme,
    isDarkMode: false,
    currentLanguage: savedLanguage,
    isRTL: savedLanguage === 'ar',
    currentCurrency: savedCurrency,
    exchangeRates: {
      AED: 1,
      USD: 0.27,
      EUR: 0.25,
      GBP: 0.21,
      INR: 22.5
    },
    isAutoDetected: localStorage.getItem('currencyAutoDetected') === 'true',
    isLoading: false,
  };
};

// ========== CONTEXT ==========
const PreferencesContext = createContext<PreferencesContextValue | undefined>(undefined);

// ========== PROVIDER ==========
export const PreferencesProvider = React.memo<{ children: React.ReactNode }>(({ children }) => {
  const [state, dispatch] = useReducer(preferencesReducer, getInitialState());
  const isInitialized = useRef(false);

  // ========== THEME HELPERS ==========
  const isSystemDarkMode = () => {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  };

  const applyTheme = (theme: Theme) => {
    const isDark = theme === 'system' ? isSystemDarkMode() : theme === 'dark';

    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    dispatch({ type: 'SET_IS_DARK_MODE', payload: isDark });
  };

  // ========== CURRENCY HELPERS ==========
  const fetchExchangeRates = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${API_BASE_URL}/currency/rates`, {
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      dispatch({ type: 'SET_EXCHANGE_RATES', payload: data.rates });
    } catch (error) {
      console.warn('Currency rates unavailable, using defaults:', error);
    }
  };

  const autoDetectCurrency = async () => {
    if (localStorage.getItem('currencyAutoDetected') === 'true') return;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${API_BASE_URL}/currency/detect`, {
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      const detectedCurrencyCode = data.data.currency as Currency;

      if (SUPPORTED_CURRENCIES.some(c => c.code === detectedCurrencyCode)) {
        dispatch({ type: 'SET_CURRENCY', payload: detectedCurrencyCode });
        localStorage.setItem('currency', detectedCurrencyCode);
        localStorage.setItem('currencyAutoDetected', 'true');
        dispatch({ type: 'SET_AUTO_DETECTED', payload: true });
      }
    } catch (error) {
      console.warn('Currency auto-detection failed:', error);
    }
  };

  // ========== INITIALIZATION ==========
  useEffect(() => {
    if (isInitialized.current) return;

    // Initialize theme
    applyTheme(state.theme);

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleThemeChange = () => {
      if (state.theme === 'system') applyTheme('system');
    };
    mediaQuery.addEventListener('change', handleThemeChange);

    // Initialize language
    if (i18n.isInitialized) {
      i18n.changeLanguage(state.currentLanguage);
    }
    document.documentElement.dir = state.isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = state.currentLanguage;

    // Initialize currency
    const initializeCurrency = async () => {
      await fetchExchangeRates();

      const manuallySet = localStorage.getItem('currencyManuallySet');
      if (!manuallySet && !state.isAutoDetected) {
        await autoDetectCurrency();
      }
    };

    initializeCurrency();
    isInitialized.current = true;

    // Refresh exchange rates every hour
    const refreshInterval = setInterval(fetchExchangeRates, 3600000);

    return () => {
      mediaQuery.removeEventListener('change', handleThemeChange);
      clearInterval(refreshInterval);
    };
  }, []);

  // ========== ACTIONS ==========
  const setTheme = (theme: Theme) => {
    dispatch({ type: 'SET_THEME', payload: theme });
    localStorage.setItem('theme', theme);
    applyTheme(theme);
  };

  const toggleTheme = () => {
    const newTheme = state.isDarkMode ? 'light' : 'dark';
    setTheme(newTheme);
  };

  const changeLanguage = (lang: Language) => {
    dispatch({ type: 'SET_LANGUAGE', payload: lang });
    if (i18n.isInitialized) {
      i18n.changeLanguage(lang);
    }
    localStorage.setItem('language', lang);
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  };

  const changeCurrency = (currency: Currency) => {
    dispatch({ type: 'SET_CURRENCY', payload: currency });
    localStorage.setItem('currency', currency);
    localStorage.setItem('currencyManuallySet', 'true');
  };

  const convertCurrency = (amount: number, from: Currency, to: Currency): number => {
    if (!state.exchangeRates[from] || !state.exchangeRates[to]) {
      console.warn(`Exchange rates for ${from} or ${to} not available.`);
      return amount;
    }
    const amountInUSD = amount / state.exchangeRates[from];
    return amountInUSD * state.exchangeRates[to];
  };

  const formatPrice = (amount: number, currencyCode: Currency = state.currentCurrency): string => {
    const { symbol, locale, decimals } = CURRENCY_INFO[currencyCode];

    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(amount).replace(currencyCode, symbol);
  };

  const formatPriceWithConversion = (amount: number, fromCurrency: Currency): string => {
    const convertedAmount = convertCurrency(amount, fromCurrency, state.currentCurrency);
    const fromCurrencyInfo = CURRENCY_INFO[fromCurrency];
    const toCurrencyInfo = CURRENCY_INFO[state.currentCurrency];

    return `~${formatPrice(convertedAmount)} (${formatPrice(amount, fromCurrency)} ${fromCurrencyInfo.code} = ${formatPrice(convertedAmount)} ${toCurrencyInfo.code})`;
  };

  // ========== MEMOIZED VALUE ==========
  const value = useMemo<PreferencesContextValue>(() => ({
    ...state,
    setTheme,
    toggleTheme,
    changeLanguage,
    changeCurrency,
    formatPrice,
    formatPriceWithConversion,
    convertCurrency,
    currencySymbol: CURRENCY_INFO[state.currentCurrency].symbol,
    currencyInfo: CURRENCY_INFO[state.currentCurrency],
    supportedCurrencies: SUPPORTED_CURRENCIES,
  }), [state]);

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
});

PreferencesProvider.displayName = 'PreferencesProvider';

// ========== HOOK ==========
export const usePreferences = () => {
  const context = useContext(PreferencesContext);
  if (context === undefined) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
};

// ========== LEGACY COMPATIBILITY HOOKS ==========
// These allow existing code to continue working without changes
export const useThemeContext = () => {
  const { theme, isDarkMode, setTheme, toggleTheme } = usePreferences();
  return { theme, isDarkMode, setTheme, toggleTheme };
};

export const useLanguageContext = () => {
  const { currentLanguage, changeLanguage, isRTL } = usePreferences();
  return { currentLanguage, changeLanguage, isRTL };
};

export const useCurrencyContext = () => {
  const {
    currentCurrency,
    changeCurrency,
    formatPrice,
    formatPriceWithConversion,
    convertCurrency,
    currencySymbol,
    currencyInfo,
    exchangeRates,
    isAutoDetected,
    supportedCurrencies,
    isLoading,
  } = usePreferences();

  return {
    currentCurrency,
    changeCurrency,
    formatPrice,
    formatPriceWithConversion,
    convertCurrency,
    currencySymbol,
    currencyInfo,
    exchangeRates,
    // Legacy compatibility - not all features exposed
    fetchExchangeRates: async () => {},
    autoDetectCurrency: async () => {},
    fromCurrency: 'INR' as Currency,
    toCurrency: 'AED' as Currency,
    isAutoDetected,
    supportedCurrencies,
    isLoading,
  };
};
