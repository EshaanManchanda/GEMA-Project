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
  AED: {
    code: 'AED',
    symbol: 'د.إ',
    name: 'UAE Dirham',
    decimals: 2,
    locale: 'ar-AE',
    position: 'before',
  },
};

export const getDefaultCurrency = (): string => {
  return 'AED';
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
  return [getCurrencyConfig('AED')];
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

export const convertCurrency = (
  amount: number,
  fromCurrencyCode: string,
  toCurrencyCode: string
): number => {
  // Placeholder for currency conversion logic
  // In a real application, this would involve fetching exchange rates
  // and performing the conversion.
  console.warn(`Currency conversion from ${fromCurrencyCode} to ${toCurrencyCode} is not yet implemented. Returning original amount.`);
  return amount;
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