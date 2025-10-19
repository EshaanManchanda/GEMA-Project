import Stripe from 'stripe';
import { config } from './env';

// Environment-based key selection
const getStripeKeys = () => {
  const paymentEnv = process.env.PAYMENT_ENVIRONMENT || 'development';
  const useLiveKeys = process.env.USE_LIVE_KEYS === 'true';

  console.log('Stripe Configuration Check:');
  console.log('PAYMENT_ENVIRONMENT:', paymentEnv);
  console.log('USE_LIVE_KEYS:', useLiveKeys);

  // Determine which keys to use
  let secretKey: string;
  let publishableKey: string;

  if (paymentEnv === 'production' || useLiveKeys) {
    secretKey = config.stripe.secretKey;
    publishableKey = config.stripe.publishableKey;
    console.log('🔴 Using LIVE Stripe keys');
  } else {
    secretKey = config.stripe.testSecretKey;
    publishableKey = config.stripe.testPublishableKey;
    console.log('🟡 Using TEST Stripe keys');
  }

  console.log('Selected Secret Key (first 10 chars):', secretKey ? secretKey.substring(0, 10) : 'N/A');
  console.log('Selected Publishable Key (first 10 chars):', publishableKey ? publishableKey.substring(0, 10) : 'N/A');

  return { secretKey, publishableKey };
};

// Validate Stripe key format
const validateStripeKey = (key: string, keyType: string): void => {
  if (!key) {
    throw new Error(`${keyType} is required`);
  }

  const keyPrefixes = {
    secret: ['sk_test_', 'sk_live_'],
    publishable: ['pk_test_', 'pk_live_']
  };

  const expectedPrefixes = keyType.includes('secret') ? keyPrefixes.secret : keyPrefixes.publishable;
  const hasValidPrefix = expectedPrefixes.some(prefix => key.startsWith(prefix));

  if (!hasValidPrefix) {
    throw new Error(`Invalid ${keyType} format. Expected format: ${expectedPrefixes.join(' or ')}...`);
  }

  // Check for minimum length (Stripe keys are typically much longer)
  if (key.length < 20) {
    throw new Error(`${keyType} appears to be too short. Please check your Stripe configuration.`);
  }
};

// Get and validate keys
const { secretKey, publishableKey } = getStripeKeys();
validateStripeKey(secretKey, 'Stripe secret key');
validateStripeKey(publishableKey, 'Stripe publishable key');

// Initialize Stripe with validated keys
export const stripe = new Stripe(secretKey, {
  apiVersion: '2025-07-30.basil',
  typescript: true,
});

// Export the publishable key for frontend use
export const stripePublishableKey = publishableKey;

// Helper function to get current Stripe configuration
export const getStripeConfig = () => {
  const paymentEnv = process.env.PAYMENT_ENVIRONMENT || 'development';
  const useLiveKeys = process.env.USE_LIVE_KEYS === 'true';

  return {
    environment: paymentEnv,
    useLiveKeys,
    isProduction: paymentEnv === 'production' || useLiveKeys,
    secretKey,
    publishableKey
  };
};

// Stripe configuration constants
// NOTE: All payments are processed in AED.
export const STRIPE_CONFIG = {
  currency: 'aed', // Base currency for all Stripe transactions
  automatic_payment_methods: {
    enabled: true,
  },
  capture_method: 'automatic' as const,
  confirmation_method: 'automatic' as const,
};

// Currency mapping for multi-currency support
export const CURRENCY_MAPPING = {
  AED: 'aed',
} as const;

// Helper function to convert amount to Stripe's smallest currency unit
export const convertToStripeAmount = (amount: number, currency: string): number => {
  // Most currencies use cents (multiply by 100)
  // Some currencies like JPY don't have decimal places
  const stripeCurrency = 'aed'; // Always AED
  
  // Currencies without decimal places
  const noDecimalCurrencies = ['jpy', 'krw'];
  
  if (noDecimalCurrencies.includes(stripeCurrency)) {
    return Math.round(amount);
  }
  
  return Math.round(amount * 100);
};

// Helper function to convert from Stripe amount to regular amount
export const convertFromStripeAmount = (amount: number, currency: string): number => {
  const stripeCurrency = 'aed'; // Always AED
  const noDecimalCurrencies = ['jpy', 'krw'];
  
  if (noDecimalCurrencies.includes(stripeCurrency)) {
    return amount;
  }
  
  return amount / 100;
};