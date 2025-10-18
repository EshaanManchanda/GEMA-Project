// Currency utilities for multi-currency support
// Handles formatting, conversion, and display with INR as base currency

export interface CurrencyConfig {
  code: string;
  symbol: string;
  name: string;
  decimals: number;
  locale: string;
  position: 'before' | 'after';
}

export const SUPPORTED_CURRENCIES: Record<string, CurrencyConfig> = {
  INR: {
    code: 'INR',
    symbol: '₹',
    name: 'Indian Rupee',
    decimals: 2,
    locale: 'en-IN',
    position: 'before',
  },
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
  GBP: {
    code: 'GBP',
    symbol: '£',
    name: 'British Pound',
    decimals: 2,
    locale: 'en-GB',
    position: 'before',
  },
};

export const getDefaultCurrency = (): string => {
  return import.meta.env.VITE_DEFAULT_CURRENCY || 'INR';
};

export const getCurrencyConfig = (currencyCode: string): CurrencyConfig => {
  return SUPPORTED_CURRENCIES[currencyCode] || SUPPORTED_CURRENCIES.INR;
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

  // Mock conversion rates based on INR (replace with real API)
  // These are approximate rates from INR to other currencies
  const mockRates: Record<string, Record<string, number>> = {
    INR: {
      AED: 0.044,   // 1 INR ≈ 0.044 AED
      USD: 0.012,   // 1 INR ≈ 0.012 USD
      EUR: 0.011,   // 1 INR ≈ 0.011 EUR
      GBP: 0.0095,  // 1 INR ≈ 0.0095 GBP
    },
    AED: {
      INR: 22.7,    // 1 AED ≈ 22.7 INR
      USD: 0.27,    // 1 AED ≈ 0.27 USD
      EUR: 0.25,    // 1 AED ≈ 0.25 EUR
      GBP: 0.21,    // 1 AED ≈ 0.21 GBP
    },
    USD: {
      INR: 83.3,    // 1 USD ≈ 83.3 INR
      AED: 3.67,    // 1 USD ≈ 3.67 AED
      EUR: 0.92,    // 1 USD ≈ 0.92 EUR
      GBP: 0.79,    // 1 USD ≈ 0.79 GBP
    },
    EUR: {
      INR: 90.9,    // 1 EUR ≈ 90.9 INR
      AED: 4.00,    // 1 EUR ≈ 4.00 AED
      USD: 1.09,    // 1 EUR ≈ 1.09 USD
      GBP: 0.86,    // 1 EUR ≈ 0.86 GBP
    },
    GBP: {
      INR: 105.3,   // 1 GBP ≈ 105.3 INR
      AED: 4.76,    // 1 GBP ≈ 4.76 AED
      USD: 1.27,    // 1 GBP ≈ 1.27 USD
      EUR: 1.16,    // 1 GBP ≈ 1.16 EUR
    },
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