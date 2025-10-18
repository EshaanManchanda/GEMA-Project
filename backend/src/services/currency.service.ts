import { logger } from '../config';

export interface ExchangeRates {
  [currency: string]: number;
}

export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
  flag: string;
  decimals: number;
  locale: string;
}

export const SUPPORTED_CURRENCIES: Record<string, CurrencyInfo> = {
  INR: {
    code: 'INR',
    name: 'Indian Rupee',
    symbol: '₹',
    flag: '🇮🇳',
    decimals: 2,
    locale: 'en-IN',
  },
  AED: {
    code: 'AED',
    name: 'UAE Dirham',
    symbol: 'د.إ',
    flag: '🇦🇪',
    decimals: 2,
    locale: 'ar-AE',
  },
  USD: {
    code: 'USD',
    name: 'US Dollar',
    symbol: '$',
    flag: '🇺🇸',
    decimals: 2,
    locale: 'en-US',
  },
  EUR: {
    code: 'EUR',
    name: 'Euro',
    symbol: '€',
    flag: '🇪🇺',
    decimals: 2,
    locale: 'en-EU',
  },
  GBP: {
    code: 'GBP',
    name: 'British Pound',
    symbol: '£',
    flag: '🇬🇧',
    decimals: 2,
    locale: 'en-GB',
  },
};

class CurrencyService {
  private cachedRates: ExchangeRates = {};
  private lastFetchTime: number = 0;
  private cacheTimeout: number = 3600000; // 1 hour in milliseconds
  private baseCurrency: string = 'INR';

  // Fallback exchange rates (updated manually if needed)
  private fallbackRates: ExchangeRates = {
    INR: 1.0,
    AED: 0.044, // 1 INR ≈ 0.044 AED
    USD: 0.012, // 1 INR ≈ 0.012 USD
    EUR: 0.011, // 1 INR ≈ 0.011 EUR
    GBP: 0.0095, // 1 INR ≈ 0.0095 GBP
  };

  /**
   * Fetch exchange rates from API
   */
  private async fetchRatesFromAPI(): Promise<ExchangeRates> {
    try {
      const apiKey = process.env.EXCHANGE_RATE_API_KEY;

      if (!apiKey) {
        logger.warn('Exchange rate API key not configured, using fallback rates');
        return this.fallbackRates;
      }

      // Using ExchangeRate-API (free tier available)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(
        `https://v6.exchangerate-api.com/v6/${apiKey}/latest/INR`,
        { signal: controller.signal }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data && data.conversion_rates) {
        const rates = data.conversion_rates;

        // Extract only the currencies we support
        const supportedRates: ExchangeRates = {
          INR: 1.0, // Base currency
        };

        Object.keys(SUPPORTED_CURRENCIES).forEach(currency => {
          if (currency !== 'INR' && rates[currency]) {
            supportedRates[currency] = rates[currency];
          }
        });

        logger.info('Successfully fetched exchange rates from API');
        return supportedRates;
      }

      logger.warn('Invalid API response, using fallback rates');
      return this.fallbackRates;
    } catch (error) {
      logger.error('Error fetching exchange rates from API:', error);
      return this.fallbackRates;
    }
  }

  /**
   * Get current exchange rates (with caching)
   */
  async getExchangeRates(): Promise<ExchangeRates> {
    const now = Date.now();

    // Check if cache is still valid
    if (Object.keys(this.cachedRates).length > 0 && (now - this.lastFetchTime) < this.cacheTimeout) {
      return this.cachedRates;
    }

    // Fetch new rates
    this.cachedRates = await this.fetchRatesFromAPI();
    this.lastFetchTime = now;

    return this.cachedRates;
  }

  /**
   * Convert amount from one currency to another
   */
  async convertCurrency(
    amount: number,
    fromCurrency: string,
    toCurrency: string
  ): Promise<number> {
    if (fromCurrency === toCurrency) {
      return amount;
    }

    const rates = await this.getExchangeRates();

    // Ensure both currencies are supported
    if (!rates[fromCurrency] || !rates[toCurrency]) {
      throw new Error(`Unsupported currency conversion: ${fromCurrency} to ${toCurrency}`);
    }

    // Convert to base currency (INR) first, then to target currency
    const inrAmount = fromCurrency === this.baseCurrency
      ? amount
      : amount / rates[fromCurrency];

    const convertedAmount = toCurrency === this.baseCurrency
      ? inrAmount
      : inrAmount * rates[toCurrency];

    return Math.round(convertedAmount * 100) / 100; // Round to 2 decimals
  }

  /**
   * Convert amount to INR (base currency for Stripe)
   */
  async convertToINR(amount: number, fromCurrency: string): Promise<number> {
    return this.convertCurrency(amount, fromCurrency, 'INR');
  }

  /**
   * Convert amount from INR to target currency
   */
  async convertFromINR(amount: number, toCurrency: string): Promise<number> {
    return this.convertCurrency(amount, 'INR', toCurrency);
  }

  /**
   * Get exchange rate for a specific currency pair
   */
  async getExchangeRate(fromCurrency: string, toCurrency: string): Promise<number> {
    if (fromCurrency === toCurrency) {
      return 1.0;
    }

    const rates = await this.getExchangeRates();

    if (!rates[fromCurrency] || !rates[toCurrency]) {
      throw new Error(`Unsupported currency: ${fromCurrency} or ${toCurrency}`);
    }

    // Calculate rate from fromCurrency to toCurrency
    const rate = rates[toCurrency] / rates[fromCurrency];
    return Math.round(rate * 10000) / 10000; // Round to 4 decimals
  }

  /**
   * Get list of supported currencies
   */
  getSupportedCurrencies(): CurrencyInfo[] {
    return Object.values(SUPPORTED_CURRENCIES);
  }

  /**
   * Get currency info by code
   */
  getCurrencyInfo(code: string): CurrencyInfo | undefined {
    return SUPPORTED_CURRENCIES[code];
  }

  /**
   * Format currency amount
   */
  formatCurrency(amount: number, currencyCode: string): string {
    const currencyInfo = this.getCurrencyInfo(currencyCode);

    if (!currencyInfo) {
      return `${amount.toFixed(2)} ${currencyCode}`;
    }

    const formattedAmount = amount.toLocaleString(currencyInfo.locale, {
      minimumFractionDigits: currencyInfo.decimals,
      maximumFractionDigits: currencyInfo.decimals,
    });

    return `${currencyInfo.symbol}${formattedAmount}`;
  }

  /**
   * Validate currency code
   */
  isValidCurrency(code: string): boolean {
    return code in SUPPORTED_CURRENCIES;
  }

  /**
   * Get base currency (INR)
   */
  getBaseCurrency(): string {
    return this.baseCurrency;
  }

  /**
   * Refresh exchange rates (force fetch)
   */
  async refreshRates(): Promise<ExchangeRates> {
    this.cachedRates = await this.fetchRatesFromAPI();
    this.lastFetchTime = Date.now();
    return this.cachedRates;
  }
}

// Export singleton instance
export const currencyService = new CurrencyService();
export default currencyService;
