import Stripe from 'stripe';
import { config } from './env';

if (!config.stripe?.secretKey) {
  throw new Error('Stripe secret key is required');
}

export const stripe = new Stripe(config.stripe.secretKey, {
  apiVersion: '2025-07-30.basil',
  typescript: true,
});

// Stripe configuration constants
export const STRIPE_CONFIG = {
  currency: 'aed', // Default currency
  automatic_payment_methods: {
    enabled: true,
  },
  capture_method: 'automatic' as const,
  confirmation_method: 'automatic' as const,
};

// Currency mapping for multi-currency support
export const CURRENCY_MAPPING = {
  AED: 'aed',
  USD: 'usd',
  EGP: 'egp',
  CAD: 'cad',
} as const;

// Helper function to get Stripe currency code
export const getStripeCurrency = (currency: string): string => {
  return CURRENCY_MAPPING[currency as keyof typeof CURRENCY_MAPPING] || 'aed';
};

// Helper function to convert amount to Stripe's smallest currency unit
export const convertToStripeAmount = (amount: number, currency: string): number => {
  // Most currencies use cents (multiply by 100)
  // Some currencies like JPY don't have decimal places
  const stripeCurrency = getStripeCurrency(currency);
  
  // Currencies without decimal places
  const noDecimalCurrencies = ['jpy', 'krw'];
  
  if (noDecimalCurrencies.includes(stripeCurrency)) {
    return Math.round(amount);
  }
  
  return Math.round(amount * 100);
};

// Helper function to convert from Stripe amount to regular amount
export const convertFromStripeAmount = (amount: number, currency: string): number => {
  const stripeCurrency = getStripeCurrency(currency);
  const noDecimalCurrencies = ['jpy', 'krw'];
  
  if (noDecimalCurrencies.includes(stripeCurrency)) {
    return amount;
  }
  
  return amount / 100;
};