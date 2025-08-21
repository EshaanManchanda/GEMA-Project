import React, { createContext, useContext, useState, useEffect } from 'react';

type Currency = 'USD' | 'AED' | 'EUR' | 'GBP';

interface CurrencyContextType {
  currentCurrency: Currency;
  changeCurrency: (currency: Currency) => void;
  formatPrice: (amount: number) => string;
  currencySymbol: string;
}

const currencySymbols: Record<Currency, string> = {
  USD: '$',
  AED: 'د.إ',
  EUR: '€',
  GBP: '£',
};

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentCurrency, setCurrentCurrency] = useState<Currency>('USD');

  useEffect(() => {
    // Initialize currency from localStorage or default
    const savedCurrency = localStorage.getItem('currency') as Currency;
    if (savedCurrency && Object.keys(currencySymbols).includes(savedCurrency)) {
      setCurrentCurrency(savedCurrency);
    } else {
      // Default to USD
      setCurrentCurrency('USD');
      localStorage.setItem('currency', 'USD');
    }
  }, []);

  const changeCurrency = (currency: Currency) => {
    setCurrentCurrency(currency);
    localStorage.setItem('currency', currency);
  };

  const formatPrice = (amount: number) => {
    // This is a simplified implementation
    // In a real app, you would use proper currency conversion rates
    return `${currencySymbols[currentCurrency]}${amount.toFixed(2)}`;
  };

  return (
    <CurrencyContext.Provider
      value={{
        currentCurrency,
        changeCurrency,
        formatPrice,
        currencySymbol: currencySymbols[currentCurrency],
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