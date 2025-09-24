// Payment configuration utility
// Handles payment method availability based on environment and regulatory compliance
import { getEnvironmentInfo } from './environmentUtils';

export interface PaymentMethod {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  popular?: boolean;
  recommended?: boolean;
  warning?: string;
  enabled: boolean;
  region?: string;
}

export interface PaymentConfig {
  enabledMethods: string[];
  preferredMethod: string;
  region: string;
  complianceMode: string;
  stripeEnabled: boolean;
  paypalEnabled: boolean;
  testPaymentsEnabled: boolean;
}

export const getPaymentConfig = (): PaymentConfig => {
  return {
    enabledMethods: getEnabledPaymentMethods(),
    preferredMethod: import.meta.env.VITE_PREFERRED_PAYMENT_METHOD || 'test',
    region: import.meta.env.VITE_PAYMENT_REGION || 'US',
    complianceMode: import.meta.env.VITE_STRIPE_COMPLIANCE_MODE || 'standard',
    stripeEnabled: import.meta.env.VITE_ENABLE_STRIPE_PAYMENTS === 'true',
    paypalEnabled: import.meta.env.VITE_ENABLE_PAYPAL_PAYMENTS === 'true',
    testPaymentsEnabled: import.meta.env.VITE_ENABLE_TEST_PAYMENTS === 'true',
  };
};

export const getEnabledPaymentMethods = (): string[] => {
  const methods: string[] = [];

  if (import.meta.env.VITE_ENABLE_TEST_PAYMENTS === 'true') {
    methods.push('test');
  }

  if (import.meta.env.VITE_ENABLE_STRIPE_PAYMENTS === 'true') {
    methods.push('stripe');
  }

  if (import.meta.env.VITE_ENABLE_PAYPAL_PAYMENTS === 'true') {
    methods.push('paypal');
  }

  return methods;
};

export const isPaymentMethodEnabled = (methodId: string): boolean => {
  const enabledMethods = getEnabledPaymentMethods();
  return enabledMethods.includes(methodId);
};

export const getRegionalPaymentMethods = () => {
  const config = getPaymentConfig();
  const envInfo = getEnvironmentInfo();
  const isUAERegion = config.region === 'AE';
  const isIndiaRegion = config.region === 'IN';
  const isIndiaCompliance = config.complianceMode === 'india' || config.complianceMode === 'live-india';
  const isUAECompliance = config.complianceMode === 'uae-standard';

  // Detect potential Stripe account misconfigurations
  const hasRegionalMismatch = (isUAERegion || isUAECompliance) && isIndiaCompliance;
  const isDevelopmentEnvironment = envInfo.isDevelopment;

  return {
    test: {
      enabled: config.testPaymentsEnabled,
      recommended: isIndiaCompliance || hasRegionalMismatch || isDevelopmentEnvironment,
      warning: hasRegionalMismatch
        ? 'Recommended due to regional payment restrictions'
        : undefined,
    },
    stripe: {
      enabled: config.stripeEnabled,
      recommended: (isUAERegion || isUAECompliance) && !hasRegionalMismatch,
      warning: hasRegionalMismatch
        ? 'Account configured for India but region set to UAE - expect restrictions'
        : isIndiaCompliance
        ? 'India compliance mode active - may have regional payment restrictions'
        : !envInfo.isHTTPS && envInfo.isProduction
        ? 'HTTPS required for secure payment processing'
        : undefined,
    },
    paypal: {
      enabled: config.paypalEnabled,
      recommended: false,
      warning: 'PayPal integration coming soon',
    },
  };
};

export const shouldShowRegulatoryWarning = (): boolean => {
  const config = getPaymentConfig();
  return config.region === 'IN' ||
         config.complianceMode === 'india' ||
         config.complianceMode === 'live-india';
};

export const getRegulatoryMessage = (): string => {
  const config = getPaymentConfig();
  const envInfo = getEnvironmentInfo();

  // Detect regional mismatch
  const isUAERegion = config.region === 'AE';
  const isUAECompliance = config.complianceMode === 'uae-standard';
  const isIndiaCompliance = config.complianceMode === 'india' || config.complianceMode === 'live-india';
  const hasRegionalMismatch = (isUAERegion || isUAECompliance) && isIndiaCompliance;

  if (hasRegionalMismatch) {
    return 'Regional configuration mismatch detected: Frontend configured for UAE but Stripe account appears to be set up for Indian operations. This may cause payment restrictions.';
  }

  if (config.complianceMode === 'uae-standard') {
    return 'Configured for UAE market with AED currency support. Stripe payments are fully supported.';
  }

  if (config.complianceMode === 'live-india') {
    return 'Using live Stripe account with India compliance. International payment restrictions may apply. Monitor for regulatory errors.';
  }

  if (config.region === 'IN' || config.complianceMode === 'india') {
    return 'Indian regulatory requirements may restrict certain payment methods. Test Payment is recommended for development.';
  }

  if (envInfo.isDevelopment) {
    return 'Development environment detected. Test Payment is recommended for reliable testing.';
  }

  return '';
};

export const getPreferredPaymentMethod = (): string => {
  const config = getPaymentConfig();
  const enabledMethods = getEnabledPaymentMethods();

  // If preferred method is enabled, use it
  if (enabledMethods.includes(config.preferredMethod)) {
    return config.preferredMethod;
  }

  // Fallback logic based on region/compliance
  if (config.region === 'AE' || config.complianceMode === 'uae-standard') {
    return enabledMethods.includes('stripe') ? 'stripe' : enabledMethods[0];
  }

  if (config.region === 'IN' || config.complianceMode === 'india') {
    return enabledMethods.includes('test') ? 'test' : enabledMethods[0];
  }

  // Default fallback
  return enabledMethods[0] || 'stripe';
};

// New utility functions for better regional validation
export const hasRegionalMismatch = (): boolean => {
  const config = getPaymentConfig();
  const isUAERegion = config.region === 'AE';
  const isUAECompliance = config.complianceMode === 'uae-standard';
  const isIndiaCompliance = config.complianceMode === 'india' || config.complianceMode === 'live-india';

  return (isUAERegion || isUAECompliance) && isIndiaCompliance;
};

export const getRegionalMismatchSeverity = (): 'none' | 'warning' | 'error' => {
  if (!hasRegionalMismatch()) return 'none';

  const config = getPaymentConfig();
  const envInfo = getEnvironmentInfo();

  // In production with live keys, this is an error
  if (envInfo.isProduction && config.complianceMode === 'live-india') {
    return 'error';
  }

  // Otherwise, it's a warning
  return 'warning';
};

export const getRecommendedAction = (): string => {
  const severity = getRegionalMismatchSeverity();
  const envInfo = getEnvironmentInfo();

  if (severity === 'error') {
    return 'Contact Stripe support to update account region or use Test Payment for immediate processing.';
  }

  if (severity === 'warning') {
    return 'Consider updating Stripe account region to UAE or use Test Payment for reliable processing.';
  }

  if (envInfo.isDevelopment) {
    return 'Use Test Payment for development and testing.';
  }

  return '';
};

export const shouldForceTestPayment = (): boolean => {
  const severity = getRegionalMismatchSeverity();
  const envInfo = getEnvironmentInfo();

  return severity === 'error' || (envInfo.isDevelopment && hasRegionalMismatch());
};