/**
 * Vendor Payment Service
 * Handles vendor-specific Stripe configuration and fee calculations
 */

import { loadStripe, Stripe } from '@stripe/stripe-js';
import { ApiService } from './api';
import { logger } from '../utils/logger';

export interface VendorPaymentInfo {
  vendorId: string;
  hasCustomStripe: boolean;
  stripePublishableKey: string | null;
  serviceFeeRate: number;
  usePlatformStripe: boolean;
}

interface CachedVendorPayment {
  info: VendorPaymentInfo;
  stripeInstance: Promise<Stripe | null> | null;
  timestamp: number;
}

class VendorPaymentService {
  private cache: Map<string, CachedVendorPayment> = new Map();
  private pendingRequests: Map<string, Promise<VendorPaymentInfo>> = new Map();
  private readonly CACHE_TTL = 30 * 60 * 1000; // 30 minutes

  /**
   * Get vendor payment information with request deduplication
   */
  async getVendorPaymentInfo(vendorId: string): Promise<VendorPaymentInfo> {
    try {
      // Check cache first
      const cached = this.cache.get(vendorId);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        logger.debug('Returning cached vendor payment info', { vendorId });
        return cached.info;
      }

      // Check for pending request (deduplication)
      const pending = this.pendingRequests.get(vendorId);
      if (pending) {
        logger.debug('Returning pending vendor payment request', { vendorId });
        return await pending;
      }

      // Create new request
      const requestPromise = this.fetchVendorPaymentInfoFromAPI(vendorId);
      this.pendingRequests.set(vendorId, requestPromise);

      try {
        const info = await requestPromise;
        return info;
      } finally {
        // Clean up pending request
        this.pendingRequests.delete(vendorId);
      }
    } catch (error) {
      logger.error('Failed to get vendor payment info', { vendorId, error });
      // Return platform defaults on error
      return {
        vendorId,
        hasCustomStripe: false,
        stripePublishableKey: null,
        serviceFeeRate: 5,
        usePlatformStripe: true,
      };
    }
  }

  /**
   * Internal method to fetch from API
   */
  private async fetchVendorPaymentInfoFromAPI(vendorId: string): Promise<VendorPaymentInfo> {
    // Fetch from API
    logger.info('Fetching vendor payment info from API', { vendorId });
    const response = await ApiService.get(`/vendors/${vendorId}/payment-info`);

    // The ApiService already unwraps to response.data
    // Response structure: { success, message, data: VendorPaymentInfo }
    // Try both response.data (direct) and response.data.data (nested) to handle different cases
    let info: VendorPaymentInfo;

    if (response.data?.data) {
      // Standard API response format
      info = response.data.data;
    } else if (response.data?.vendorId) {
      // Already unwrapped (cached response or different format)
      info = response.data;
    } else {
      // Invalid response structure
      logger.warn('Invalid payment info response structure, using defaults', {
        vendorId,
        responseKeys: Object.keys(response.data || {})
      });
      return {
        vendorId,
        hasCustomStripe: false,
        stripePublishableKey: null,
        serviceFeeRate: 5,
        usePlatformStripe: true,
      };
    }

    // Validate the response has required fields
    if (!info || !info.vendorId) {
      logger.warn('Invalid payment info data, using defaults', { vendorId, info });
      return {
        vendorId,
        hasCustomStripe: false,
        stripePublishableKey: null,
        serviceFeeRate: 5,
        usePlatformStripe: true,
      };
    }

    logger.debug('Successfully fetched vendor payment info', {
      vendorId,
      hasCustomStripe: info.hasCustomStripe,
      usePlatformStripe: info.usePlatformStripe
    });

    // Cache the result
    this.cache.set(vendorId, {
      info,
      stripeInstance: null,
      timestamp: Date.now(),
    });

    return info;
  }

  /**
   * Get Stripe instance for vendor (vendor's or platform's)
   */
  async getStripeInstance(vendorId: string): Promise<Stripe | null> {
    try {
      const paymentInfo = await this.getVendorPaymentInfo(vendorId);

      // Check if we have a cached Stripe instance
      const cached = this.cache.get(vendorId);
      if (cached?.stripeInstance) {
        logger.debug('Returning cached Stripe instance', { vendorId });
        return await cached.stripeInstance;
      }

      // Determine which Stripe key to use
      let stripeKey: string | null = null;

      // Check if we're in development environment
      const isDevEnvironment = import.meta.env.VITE_PAYMENT_ENVIRONMENT !== 'production' &&
                                import.meta.env.MODE === 'development';

      // Ensure paymentInfo is valid before accessing properties
      if (!paymentInfo) {
        logger.warn('Payment info is undefined, using platform Stripe key', { vendorId });
        // In development, prefer TEST keys; in production, prefer LIVE keys
        stripeKey = isDevEnvironment
          ? (import.meta.env.VITE_STRIPE_TEST_PUBLISHABLE_KEY || import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)
          : (import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || import.meta.env.VITE_STRIPE_TEST_PUBLISHABLE_KEY);
      } else if (paymentInfo.hasCustomStripe && paymentInfo.stripePublishableKey) {
        // Use vendor's Stripe key
        stripeKey = paymentInfo.stripePublishableKey;
        logger.info('Using vendor Stripe key', { vendorId, keyPrefix: stripeKey.substring(0, 12) });
      } else {
        // Use platform Stripe key
        // In development, prefer TEST keys; in production, prefer LIVE keys
        stripeKey = isDevEnvironment
          ? (import.meta.env.VITE_STRIPE_TEST_PUBLISHABLE_KEY || import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)
          : (import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || import.meta.env.VITE_STRIPE_TEST_PUBLISHABLE_KEY);
        logger.info('Using platform Stripe key', { vendorId });
      }

      logger.info('🔑 Selected Stripe key details:', {
        vendorId,
        hasCustomStripe: paymentInfo?.hasCustomStripe,
        usePlatformStripe: paymentInfo?.usePlatformStripe,
        keyPrefix: stripeKey?.substring(0, 20),
        isTestKey: stripeKey?.startsWith('pk_test_'),
        isLiveKey: stripeKey?.startsWith('pk_live_')
      });

      if (!stripeKey) {
        logger.error('No Stripe key available', { vendorId });
        return null;
      }

      // Load and cache Stripe instance
      const stripePromise = loadStripe(stripeKey);

      // Update cache with the promise
      const cachedEntry = this.cache.get(vendorId);
      if (cachedEntry) {
        cachedEntry.stripeInstance = stripePromise;
      }

      return await stripePromise;
    } catch (error) {
      logger.error('Failed to get Stripe instance', { vendorId, error });
      return null;
    }
  }

  /**
   * Calculate total price with service fee
   */
  calculateTotalWithFees(subtotal: number, vendorPaymentInfo: VendorPaymentInfo): {
    subtotal: number;
    serviceFee: number;
    tax: number;
    total: number;
  } {
    const serviceFee = vendorPaymentInfo.usePlatformStripe
      ? subtotal * (vendorPaymentInfo.serviceFeeRate / 100)
      : 0;

    const tax = subtotal * 0.05; // 5% tax
    const total = subtotal + serviceFee + tax;

    return {
      subtotal,
      serviceFee,
      tax,
      total,
    };
  }

  /**
   * Clear cache for a specific vendor or all vendors
   */
  clearCache(vendorId?: string) {
    if (vendorId) {
      this.cache.delete(vendorId);
      logger.debug('Cleared cache for vendor', { vendorId });
    } else {
      this.cache.clear();
      logger.debug('Cleared all vendor payment cache');
    }
  }

  /**
   * Get service fee description for display
   */
  getServiceFeeDescription(vendorPaymentInfo: VendorPaymentInfo): string {
    if (!vendorPaymentInfo.usePlatformStripe) {
      return 'No service fee (vendor payment)';
    }
    return `${vendorPaymentInfo.serviceFeeRate}% platform service fee`;
  }
}

// Export singleton instance
export const vendorPaymentService = new VendorPaymentService();
export default vendorPaymentService;
