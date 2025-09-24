// Currency utilities for AED and multi-currency support
// Handles formatting, conversion, and display for UAE market

export interface CurrencyConfig {
  code: string;
  symbol: string;
  name: string;
  decimals: number;
  locale: string;
  position: 'before' | 'after';
}

export const SUPPORTED_CURRENCIES: Record<string, CurrencyConfig> = {
  AED: {
    code: 'AED',
    symbol: 'د.إ',
    name: 'UAE Dirham',
    decimals: 2,
    locale: 'ar-AE',
    position: 'before',
  },
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    decimals: 2,
    locale: 'en-US',
    position: 'before',
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    decimals: 2,
    locale: 'en-EU',
    position: 'before',
  },
};

export const getDefaultCurrency = (): string => {
  return import.meta.env.VITE_DEFAULT_CURRENCY || 'AED';
};

export const getCurrencyConfig = (currencyCode: string): CurrencyConfig => {
  return SUPPORTED_CURRENCIES[currencyCode] || SUPPORTED_CURRENCIES.AED;
};

export const formatCurrency = (
  amount: number,
  currencyCode: string = getDefaultCurrency(),
  options?: {
    showSymbol?: boolean;
    showCode?: boolean;
    locale?: string;
  }
): string => {
  const config = getCurrencyConfig(currencyCode);
  const {
    showSymbol = true,
    showCode = false,
    locale = config.locale
  } = options || {};

  // Format the amount with proper decimals
  const formattedAmount = amount.toLocaleString(locale, {
    minimumFractionDigits: config.decimals,
    maximumFractionDigits: config.decimals,
  });

  // Build the display string
  let result = '';

  if (showSymbol && config.position === 'before') {
    result += `${config.symbol} `;
  }

  result += formattedAmount;

  if (showSymbol && config.position === 'after') {
    result += ` ${config.symbol}`;
  }

  if (showCode) {
    result += ` ${config.code}`;
  }

  return result;
};

export const formatCurrencyCompact = (
  amount: number,
  currencyCode: string = getDefaultCurrency()
): string => {
  const config = getCurrencyConfig(currencyCode);

  if (amount >= 1000000) {
    return `${config.symbol}${(amount / 1000000).toFixed(1)}M`;
  } else if (amount >= 1000) {
    return `${config.symbol}${(amount / 1000).toFixed(1)}K`;
  }

  return formatCurrency(amount, currencyCode);
};

export const parseCurrencyAmount = (
  value: string,
  currencyCode: string = getDefaultCurrency()
): number => {
  const config = getCurrencyConfig(currencyCode);

  // Remove currency symbols and non-numeric characters except decimal separator
  const cleanValue = value
    .replace(new RegExp(`[${config.symbol}${config.code}]`, 'g'), '')
    .replace(/[^\d.,]/g, '')
    .replace(',', '.');

  const parsed = parseFloat(cleanValue);
  return isNaN(parsed) ? 0 : parsed;
};

export const convertCurrency = async (
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<number> => {
  // For now, return the same amount as we don't have a conversion API
  // In production, you would integrate with a currency conversion service
  if (fromCurrency === toCurrency) {
    return amount;
  }

  // Mock conversion rates (replace with real API)
  const mockRates: Record<string, Record<string, number>> = {
    USD: { AED: 3.67, EUR: 0.85 },
    AED: { USD: 0.27, EUR: 0.23 },
    EUR: { USD: 1.18, AED: 4.33 },
  };

  const rate = mockRates[fromCurrency]?.[toCurrency] || 1;
  return amount * rate;
};

export const validateCurrencyAmount = (
  amount: number,
  currencyCode: string = getDefaultCurrency()
): { isValid: boolean; error?: string } => {
  if (isNaN(amount) || amount < 0) {
    return { isValid: false, error: 'Amount must be a positive number' };
  }

  const config = getCurrencyConfig(currencyCode);
  const minAmount = 1; // Minimum 1 unit of currency
  const maxAmount = 999999; // Maximum amount

  if (amount < minAmount) {
    return {
      isValid: false,
      error: `Minimum amount is ${formatCurrency(minAmount, currencyCode)}`
    };
  }

  if (amount > maxAmount) {
    return {
      isValid: false,
      error: `Maximum amount is ${formatCurrency(maxAmount, currencyCode)}`
    };
  }

  // Check decimal places
  const decimals = (amount.toString().split('.')[1] || '').length;
  if (decimals > config.decimals) {
    return {
      isValid: false,
      error: `${currencyCode} supports maximum ${config.decimals} decimal places`
    };
  }

  return { isValid: true };
};

export const getCurrencySymbol = (currencyCode: string): string => {
  const config = getCurrencyConfig(currencyCode);
  return config.symbol;
};

export const getCurrencyName = (currencyCode: string): string => {
  const config = getCurrencyConfig(currencyCode);
  return config.name;
};

export const getSupportedCurrencies = (): CurrencyConfig[] => {
  const supportedCodes = import.meta.env.VITE_SUPPORTED_CURRENCIES?.split(',') || ['AED'];
  return supportedCodes.map(code => getCurrencyConfig(code.trim()));
};

export const isValidCurrency = (currencyCode: string): boolean => {
  return currencyCode in SUPPORTED_CURRENCIES;
};

// Format currency for Stripe (amount in smallest currency unit)
export const formatCurrencyForStripe = (
  amount: number,
  currencyCode: string = getDefaultCurrency()
): number => {
  const config = getCurrencyConfig(currencyCode);
  return Math.round(amount * Math.pow(10, config.decimals));
};

// Format amount from Stripe (convert from smallest currency unit)
export const formatCurrencyFromStripe = (
  amount: number,
  currencyCode: string = getDefaultCurrency()
): number => {
  const config = getCurrencyConfig(currencyCode);
  return amount / Math.pow(10, config.decimals);
};

export default {
  formatCurrency,
  formatCurrencyCompact,
  parseCurrencyAmount,
  convertCurrency,
  validateCurrencyAmount,
  getCurrencySymbol,
  getCurrencyName,
  getSupportedCurrencies,
  isValidCurrency,
  formatCurrencyForStripe,
  formatCurrencyFromStripe,
  getDefaultCurrency,
  getCurrencyConfig,
};