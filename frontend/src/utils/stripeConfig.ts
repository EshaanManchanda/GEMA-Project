// Stripe configuration utility with environment-based key management
// Handles live vs test key selection, validation, and security warnings
import { getEnvironmentInfo } from './environmentUtils';

export interface StripeConfig {
  publicKey: string;
  isLiveMode: boolean;
  environment: string;
  region: string;
  complianceMode: string;
  shouldShowWarning: boolean;
  keyType: 'live' | 'test';
  isVendorKey: boolean;
  feePercentage: number;
}

export interface StripeKeyValidation {
  isValid: boolean;
  keyType: 'live' | 'test' | 'invalid';
  errors: string[];
  warnings: string[];
}

export const validateStripeKey = (key: string, expectedType?: 'live' | 'test'): StripeKeyValidation => {
  const result: StripeKeyValidation = {
    isValid: false,
    keyType: 'invalid',
    errors: [],
    warnings: [],
  };

  if (!key) {
    result.errors.push('Stripe key is required');
    return result;
  }

  // Check if key format is correct
  if (key.startsWith('pk_live_')) {
    result.keyType = 'live';
  } else if (key.startsWith('pk_test_')) {
    result.keyType = 'test';
  } else if (key.startsWith('sk_live_')) {
    result.keyType = 'live';
    result.warnings.push('Secret key detected in frontend configuration - this should only be used in backend');
  } else if (key.startsWith('sk_test_')) {
    result.keyType = 'test';
    result.warnings.push('Secret key detected in frontend configuration - this should only be used in backend');
  } else if (key.startsWith('rk_live_') || key.startsWith('rk_test_')) {
    result.errors.push('Invalid key format: keys starting with "rk_" should be "sk_" or "pk_"');
    return result;
  } else {
    result.errors.push('Invalid Stripe key format');
    return result;
  }

  // Check key length (Stripe keys are typically 107+ characters)
  if (key.length < 50) {
    result.errors.push('Stripe key appears to be too short');
    return result;
  }

  // Check if key type matches expected
  if (expectedType && result.keyType !== expectedType) {
    result.warnings.push(`Expected ${expectedType} key but got ${result.keyType} key`);
  }

  result.isValid = true;
  return result;
};

export const getStripeConfig = (): StripeConfig => {
  const environment = import.meta.env.VITE_PAYMENT_ENVIRONMENT || 'development';
  const useLiveKeys = import.meta.env.VITE_USE_LIVE_KEYS === 'true';
  const forceTestMode = import.meta.env.VITE_FORCE_TEST_MODE === 'true';
  const enableWarning = import.meta.env.VITE_ENABLE_LIVE_KEY_WARNING === 'true';
  const region = import.meta.env.VITE_PAYMENT_REGION || 'US';
  const complianceMode = import.meta.env.VITE_STRIPE_COMPLIANCE_MODE || 'standard';
  
  // Check for vendor-specific Stripe key first
  const vendorKey = import.meta.env.VITE_VENDOR_STRIPE_KEY;
  let isVendorKey = false;
  let feePercentage = 5; // Default 5% fee when using fallback key

  // Determine which keys to use
  let publicKey: string;
  let isLiveMode: boolean;
  let keyType: 'live' | 'test';

  // First try to use vendor key if available
  if (vendorKey && validateStripeKey(vendorKey).isValid) {
    publicKey = vendorKey;
    isVendorKey = true;
    feePercentage = 0; // No fee when using vendor key
    isLiveMode = isLiveKey(vendorKey);
    keyType = isLiveMode ? 'live' : 'test';
    console.log('Using vendor Stripe key - no fee applied');
  } else if (forceTestMode || environment === 'development') {
    // Force test mode in development
    publicKey = import.meta.env.VITE_STRIPE_TEST_PUBLISHABLE_KEY || import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
    isLiveMode = false;
    keyType = 'test';
  } else if (useLiveKeys && (environment === 'production' || environment === 'staging')) {
    // Use live keys in production/staging when explicitly enabled
    publicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY || import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
    isLiveMode = true;
    keyType = 'live';
  } else {
    // Default to test keys
    publicKey = import.meta.env.VITE_STRIPE_TEST_PUBLISHABLE_KEY || import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
    isLiveMode = false;
    keyType = 'test';
  }

  // Validate the selected key
  const validation = validateStripeKey(publicKey, keyType);
  if (!validation.isValid) {
    console.error('Stripe configuration error:', validation.errors);
    // Fallback to test key if live key is invalid
    if (keyType === 'live') {
      console.warn('Falling back to test key due to invalid live key');
      publicKey = import.meta.env.VITE_STRIPE_TEST_PUBLIC_KEY || import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
      isLiveMode = false;
      keyType = 'test';
      isVendorKey = false;
      feePercentage = 5;
    }
  }

  const shouldShowWarning = enableWarning && (
    isLiveMode ||  // Show warning when using live keys
    validation.warnings.length > 0 ||  // Show warning for validation issues
    (region === 'IN' && complianceMode === 'india')  // Show warning for India compliance
  );

  return {
    publicKey,
    isLiveMode,
    environment,
    region,
    complianceMode,
    shouldShowWarning,
    keyType,
    isVendorKey,
    feePercentage
  };
};

export const getStripeKeyForEnvironment = (env: 'development' | 'staging' | 'production'): string => {
  switch (env) {
    case 'production':
    case 'staging':
      return import.meta.env.VITE_STRIPE_PUBLIC_KEY || import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
    case 'development':
    default:
      return import.meta.env.VITE_STRIPE_TEST_PUBLIC_KEY || import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
  }
};

export const isLiveKey = (key: string): boolean => {
  return key.startsWith('pk_live_') || key.startsWith('sk_live_');
};

export const isTestKey = (key: string): boolean => {
  return key.startsWith('pk_test_') || key.startsWith('sk_test_');
};

export const getKeyEnvironmentMismatchWarning = (): string | null => {
  const config = getStripeConfig();
  const envInfo = getEnvironmentInfo();

  // Check for environment mismatches
  if (config.environment === 'development' && config.isLiveMode) {
    return 'WARNING: Using live Stripe keys in development environment. This could result in real charges.';
  }

  if (config.environment === 'production' && !config.isLiveMode) {
    return 'WARNING: Using test Stripe keys in production environment. Real payments will not work.';
  }

  // Check for regional mismatches
  if (config.region === 'AE' && config.complianceMode === 'uae-standard' && envInfo.isDevelopment) {
    return 'INFO: UAE region configured. Use Test Payment for development testing.';
  }

  // Check for compliance mode issues
  if (config.complianceMode === 'live-india' && config.region !== 'IN') {
    return 'WARNING: Stripe account configured for India but region set to ' + config.region + '. This may cause payment restrictions.';
  }

  // Check for HTTPS requirements
  if (!envInfo.isHTTPS && envInfo.isProduction && config.isLiveMode) {
    return 'ERROR: HTTPS is required for live Stripe payments in production.';
  }

  return null;
};

export const logStripeConfiguration = (): void => {
  const config = getStripeConfig();
  const validation = validateStripeKey(config.publicKey);
  const mismatchWarning = getKeyEnvironmentMismatchWarning();

  console.group('🔐 Stripe Configuration');
  console.log('Environment:', config.environment);
  console.log('Key Type:', config.keyType);
  console.log('Live Mode:', config.isLiveMode);
  console.log('Region:', config.region);
  console.log('Compliance Mode:', config.complianceMode);
  console.log('Public Key:', config.publicKey.substring(0, 20) + '...');

  if (validation.warnings.length > 0) {
    console.warn('Warnings:', validation.warnings);
  }

  if (validation.errors.length > 0) {
    console.error('Errors:', validation.errors);
  }

  if (mismatchWarning) {
    console.warn(mismatchWarning);
  }

  if (config.shouldShowWarning) {
    console.warn('Payment warnings are enabled for this configuration');
  }

  console.groupEnd();
};

// Additional utility functions for regional validation
export const getStripeAccountRegion = (): string => {
  const config = getStripeConfig();

  // Try to detect account region from compliance mode
  if (config.complianceMode === 'live-india' || config.complianceMode === 'india') {
    return 'IN';
  }

  if (config.complianceMode === 'uae-standard') {
    return 'AE';
  }

  // Fallback to configured region
  return config.region;
};

export const hasStripeRegionalMismatch = (): boolean => {
  const config = getStripeConfig();
  const accountRegion = getStripeAccountRegion();

  return config.region !== accountRegion;
};

export const getStripeRegionalGuidance = (): string => {
  const config = getStripeConfig();
  const envInfo = getEnvironmentInfo();
  const hasMismatch = hasStripeRegionalMismatch();

  if (hasMismatch && config.region === 'AE' && config.complianceMode === 'live-india') {
    return 'Your Stripe account appears to be configured for Indian operations, but your app is set for UAE. Contact Stripe support to update your account region, or use Test Payment for reliable processing.';
  }

  if (envInfo.isDevelopment) {
    return 'Development environment: Test Payment is recommended for reliable testing.';
  }

  if (config.isLiveMode && !envInfo.isHTTPS) {
    return 'HTTPS is required for live Stripe payments. Enable HTTPS or use Test Payment.';
  }

  return '';
};

export const shouldRecommendTestPayment = (): boolean => {
  const config = getStripeConfig();
  const envInfo = getEnvironmentInfo();
  const hasMismatch = hasStripeRegionalMismatch();

  return (
    envInfo.isDevelopment ||
    hasMismatch ||
    (config.isLiveMode && !envInfo.isHTTPS) ||
    config.complianceMode === 'live-india'
  );
};

// Initialize configuration logging in development
if (import.meta.env.MODE === 'development') {
  logStripeConfiguration();
}

export default {
  getStripeConfig,
  validateStripeKey,
  getStripeKeyForEnvironment,
  isLiveKey,
  isTestKey,
  getKeyEnvironmentMismatchWarning,
  logStripeConfiguration,
  getStripeAccountRegion,
  hasStripeRegionalMismatch,
  getStripeRegionalGuidance,
  shouldRecommendTestPayment,
};