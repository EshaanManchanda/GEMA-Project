// Environment detection utilities for payment and security features
// Handles HTTPS detection, development vs production environment checks

export interface EnvironmentInfo {
  isHTTPS: boolean;
  isDevelopment: boolean;
  isProduction: boolean;
  domain: string;
  protocol: string;
  port: string | null;
  isLocalhost: boolean;
}

export const getEnvironmentInfo = (): EnvironmentInfo => {
  const location = window.location;
  const isHTTPS = location.protocol === 'https:';
  const isDevelopment = import.meta.env.VITE_DEV || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  const isProduction = import.meta.env.VITE_PROD && !isDevelopment;
  const isLocalhost = location.hostname === 'localhost' || location.hostname === '127.0.0.1' || location.hostname.includes('192.168.');

  return {
    isHTTPS,
    isDevelopment,
    isProduction,
    domain: location.hostname,
    protocol: location.protocol,
    port: location.port || null,
    isLocalhost
  };
};

export const shouldShowHTTPSWarning = (): boolean => {
  const env = getEnvironmentInfo();
  // Show warning if we're in development over HTTP and trying to use live payment features
  return !env.isHTTPS && env.isDevelopment;
};

export const getHTTPSWarningMessage = (): string => {
  const env = getEnvironmentInfo();

  if (!env.isHTTPS && env.isDevelopment) {
    return 'Development environment detected over HTTP. Some payment features (Apple Pay, Google Pay) require HTTPS to function properly.';
  }

  if (!env.isHTTPS && env.isProduction) {
    return 'HTTPS is required for secure payment processing. Please ensure your site is served over HTTPS.';
  }

  return '';
};

export const canUseAdvancedPaymentFeatures = (): boolean => {
  const env = getEnvironmentInfo();
  // Advanced features like Apple Pay, Google Pay require HTTPS
  return env.isHTTPS || env.isDevelopment;
};

export const getPaymentMethodAvailability = () => {
  const env = getEnvironmentInfo();

  return {
    creditCard: true, // Always available
    applePay: env.isHTTPS, // Requires HTTPS
    googlePay: env.isHTTPS, // Requires HTTPS
    testPayment: true, // Always available in development
    stripeElements: true, // Available but may have limitations over HTTP
  };
};

export const getDomainVerificationStatus = () => {
  const env = getEnvironmentInfo();

  // In development, domain verification is not required
  if (env.isDevelopment || env.isLocalhost) {
    return {
      isVerified: false,
      requiresVerification: false,
      message: 'Domain verification not required in development environment'
    };
  }

  // In production, we assume domain needs verification
  return {
    isVerified: false, // This would be checked against Stripe's API in real implementation
    requiresVerification: true,
    message: 'Domain verification required for advanced payment methods like Apple Pay'
  };
};

export const getSecurityRecommendations = (): string[] => {
  const env = getEnvironmentInfo();
  const recommendations: string[] = [];

  if (!env.isHTTPS && env.isProduction) {
    recommendations.push('Enable HTTPS for secure payment processing');
  }

  if (!env.isHTTPS && env.isDevelopment) {
    recommendations.push('Consider using HTTPS in development for testing payment features');
  }

  if (env.isLocalhost) {
    recommendations.push('Use test payment methods in local development');
  }

  return recommendations;
};

export const getEnvironmentSpecificConfig = () => {
  const env = getEnvironmentInfo();

  return {
    // Show more detailed error messages in development
    showDetailedErrors: env.isDevelopment,

    // Enable debug logging in development
    enableDebugLogging: env.isDevelopment,

    // Use test keys in development
    preferTestKeys: env.isDevelopment,

    // Show security warnings
    showSecurityWarnings: true,

    // Enable fallback payment methods
    enableFallbackMethods: true,
  };
};

export default {
  getEnvironmentInfo,
  shouldShowHTTPSWarning,
  getHTTPSWarningMessage,
  canUseAdvancedPaymentFeatures,
  getPaymentMethodAvailability,
  getDomainVerificationStatus,
  getSecurityRecommendations,
  getEnvironmentSpecificConfig,
};