import { stripe, convertToStripeAmount, convertFromStripeAmount, getStripeCurrency } from '../config/stripe';
import { Order, User } from '../models';
import Stripe from 'stripe';

export interface CreatePaymentIntentParams {
  amount: number;
  currency: string;
  orderId: string;
  vendorId?: string;
  customerId?: string;
  metadata?: Record<string, string>;
}

export interface PaymentRoutingInfo {
  usesVendorStripe: boolean;
  stripeInstance: Stripe;
  vendorStripeAccountId?: string;
  platformCommission: number;
  serviceFee: number;
  vendorPayout: number;
}

export interface PaymentIntentResult {
  clientSecret: string;
  paymentIntentId: string;
}

export class PaymentService {
  /**
   * Determine payment routing based on vendor settings
   */
  static async getPaymentRouting(vendorId: string, amount: number): Promise<PaymentRoutingInfo> {
    try {
      // Fetch vendor with payment settings
      const vendor = await User.findById(vendorId).select('+vendorPaymentSettings.stripeApiKey');

      if (!vendor || vendor.role !== 'vendor') {
        throw new Error('Vendor not found');
      }

      const paymentSettings = vendor.vendorPaymentSettings;

      // Check if vendor has custom Stripe account
      if (paymentSettings?.hasCustomStripeAccount && paymentSettings.stripeApiKey) {
        // Use vendor's Stripe account - no service fee
        const vendorStripe = new Stripe(paymentSettings.stripeApiKey, {
          apiVersion: '2025-07-30.basil',
        });

        return {
          usesVendorStripe: true,
          stripeInstance: vendorStripe,
          vendorStripeAccountId: paymentSettings.stripeAccountId,
          platformCommission: 0,
          serviceFee: 0,
          vendorPayout: amount,
        };
      } else {
        // Use platform Stripe with service fee
        const commissionRate = paymentSettings?.commissionRate || 5; // Default 5%
        const serviceFee = Math.round((amount * commissionRate) / 100 * 100) / 100; // Round to 2 decimals
        const vendorPayout = amount - serviceFee;

        return {
          usesVendorStripe: false,
          stripeInstance: stripe,
          platformCommission: serviceFee,
          serviceFee,
          vendorPayout,
        };
      }
    } catch (error) {
      console.error('Error determining payment routing:', error);
      // Fallback to platform Stripe
      const serviceFee = Math.round((amount * 5) / 100 * 100) / 100; // 5% default
      return {
        usesVendorStripe: false,
        stripeInstance: stripe,
        platformCommission: serviceFee,
        serviceFee,
        vendorPayout: amount - serviceFee,
      };
    }
  }

  /**
   * Create a Stripe payment intent for an order with routing support
   */
  static async createPaymentIntent({
    amount,
    currency,
    orderId,
    vendorId,
    customerId,
    metadata = {},
  }: CreatePaymentIntentParams): Promise<PaymentIntentResult> {
    try {
      const stripeAmount = convertToStripeAmount(amount, currency);
      const stripeCurrency = getStripeCurrency(currency);

      // Determine payment routing if vendor is provided
      let routingInfo: PaymentRoutingInfo | null = null;
      if (vendorId) {
        routingInfo = await this.getPaymentRouting(vendorId, amount);
      }

      const stripeInstance = routingInfo?.stripeInstance || stripe;

      const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
        amount: stripeAmount,
        currency: stripeCurrency,
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          orderId,
          vendorId: vendorId || 'platform',
          usesVendorStripe: String(routingInfo?.usesVendorStripe || false),
          serviceFee: routingInfo?.serviceFee || 0,
          ...metadata,
        },
      };

      // Add customer if provided
      if (customerId) {
        paymentIntentParams.customer = customerId;
      }

      // For platform payments with application fee (future Stripe Connect integration)
      if (!routingInfo?.usesVendorStripe && routingInfo?.platformCommission > 0) {
        // This would be used with Stripe Connect in the future
        // paymentIntentParams.application_fee_amount = convertToStripeAmount(routingInfo.platformCommission, currency);
      }

      const paymentIntent = await stripeInstance.paymentIntents.create(paymentIntentParams);

      return {
        clientSecret: paymentIntent.client_secret!,
        paymentIntentId: paymentIntent.id,
      };
    } catch (error) {
      console.error('Error creating payment intent:', error);
      throw new Error('Failed to create payment intent');
    }
  }

  /**
   * Retrieve a payment intent by ID
   */
  static async getPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    try {
      return await stripe.paymentIntents.retrieve(paymentIntentId);
    } catch (error) {
      console.error('Error retrieving payment intent:', error);
      throw new Error('Failed to retrieve payment intent');
    }
  }

  /**
   * Confirm a payment intent
   */
  static async confirmPaymentIntent(
    paymentIntentId: string,
    paymentMethodId?: string
  ): Promise<Stripe.PaymentIntent> {
    try {
      const params: Stripe.PaymentIntentConfirmParams = {};
      
      if (paymentMethodId) {
        params.payment_method = paymentMethodId;
      }

      return await stripe.paymentIntents.confirm(paymentIntentId, params);
    } catch (error) {
      console.error('Error confirming payment intent:', error);
      throw new Error('Failed to confirm payment intent');
    }
  }

  /**
   * Cancel a payment intent
   */
  static async cancelPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    try {
      return await stripe.paymentIntents.cancel(paymentIntentId);
    } catch (error) {
      console.error('Error cancelling payment intent:', error);
      throw new Error('Failed to cancel payment intent');
    }
  }

  /**
   * Create a refund for a payment intent
   */
  static async createRefund(
    paymentIntentId: string,
    amount?: number,
    reason?: string
  ): Promise<Stripe.Refund> {
    try {
      const refundParams: Stripe.RefundCreateParams = {
        payment_intent: paymentIntentId,
      };

      if (amount) {
        refundParams.amount = amount;
      }

      if (reason) {
        refundParams.reason = reason as Stripe.RefundCreateParams.Reason;
      }

      return await stripe.refunds.create(refundParams);
    } catch (error) {
      console.error('Error creating refund:', error);
      throw new Error('Failed to create refund');
    }
  }

  /**
   * Create or retrieve a Stripe customer
   */
  static async createOrGetCustomer(
    email: string,
    name?: string,
    userId?: string
  ): Promise<Stripe.Customer> {
    try {
      // First, try to find existing customer by email
      const existingCustomers = await stripe.customers.list({
        email,
        limit: 1,
      });

      if (existingCustomers.data.length > 0) {
        return existingCustomers.data[0];
      }

      // Create new customer
      const customerParams: Stripe.CustomerCreateParams = {
        email,
      };

      if (name) {
        customerParams.name = name;
      }

      if (userId) {
        customerParams.metadata = { userId };
      }

      return await stripe.customers.create(customerParams);
    } catch (error) {
      console.error('Error creating/getting customer:', error);
      throw new Error('Failed to create or retrieve customer');
    }
  }

  /**
   * Process webhook event from Stripe
   */
  static async processWebhookEvent(
    payload: string | Buffer,
    signature: string
  ): Promise<void> {
    try {
      const event = stripe.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );

      console.log(`Received Stripe webhook: ${event.type}`);

      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
          break;
        
        case 'payment_intent.payment_failed':
          await this.handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
          break;
        
        case 'payment_intent.canceled':
          await this.handlePaymentCanceled(event.data.object as Stripe.PaymentIntent);
          break;
        
        case 'charge.dispute.created':
          await this.handleChargeDispute(event.data.object as Stripe.Dispute);
          break;
        
        default:
          console.log(`Unhandled webhook event type: ${event.type}`);
      }
    } catch (error) {
      console.error('Error processing webhook:', error);
      throw new Error('Failed to process webhook event');
    }
  }

  /**
   * Handle successful payment
   */
  private static async handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    try {
      const orderId = paymentIntent.metadata.orderId;
      if (!orderId) {
        console.error('No orderId found in payment intent metadata');
        return;
      }

      const order = await Order.findById(orderId);
      if (!order) {
        console.error(`Order not found: ${orderId}`);
        return;
      }

      // Update order status and generate tickets
      await order.markAsPaid(paymentIntent.id, 'stripe');
      await order.confirm(); // This will automatically generate tickets

      console.log(`Order ${orderId} marked as paid, confirmed, and tickets generated`);

      // TODO: Send confirmation email
      // TODO: Send push notification
    } catch (error) {
      console.error('Error handling payment succeeded:', error);
    }
  }

  /**
   * Handle failed payment
   */
  private static async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    try {
      const orderId = paymentIntent.metadata.orderId;
      if (!orderId) {
        console.error('No orderId found in payment intent metadata');
        return;
      }

      const order = await Order.findById(orderId);
      if (!order) {
        console.error(`Order not found: ${orderId}`);
        return;
      }

      // Keep order as pending, but log the failure
      console.log(`Payment failed for order ${orderId}`);

      // TODO: Send payment failure notification
      // TODO: Log payment attempt
    } catch (error) {
      console.error('Error handling payment failed:', error);
    }
  }

  /**
   * Handle canceled payment
   */
  private static async handlePaymentCanceled(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    try {
      const orderId = paymentIntent.metadata.orderId;
      if (!orderId) {
        console.error('No orderId found in payment intent metadata');
        return;
      }

      console.log(`Payment canceled for order ${orderId}`);
    } catch (error) {
      console.error('Error handling payment canceled:', error);
    }
  }

  /**
   * Handle charge dispute
   */
  private static async handleChargeDispute(dispute: Stripe.Dispute): Promise<void> {
    try {
      console.log(`Charge dispute created: ${dispute.id}`);
      
      // TODO: Send admin notification about dispute
      // TODO: Log dispute for manual review
    } catch (error) {
      console.error('Error handling charge dispute:', error);
    }
  }

  /**
   * Get payment methods for a customer
   */
  static async getCustomerPaymentMethods(customerId: string): Promise<Stripe.PaymentMethod[]> {
    try {
      const paymentMethods = await stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
      });

      return paymentMethods.data;
    } catch (error) {
      console.error('Error getting customer payment methods:', error);
      throw new Error('Failed to retrieve payment methods');
    }
  }

  /**
   * Detach a payment method from a customer
   */
  static async detachPaymentMethod(paymentMethodId: string): Promise<Stripe.PaymentMethod> {
    try {
      return await stripe.paymentMethods.detach(paymentMethodId);
    } catch (error) {
      console.error('Error detaching payment method:', error);
      throw new Error('Failed to detach payment method');
    }
  }

  /**
   * Calculate platform fee (if using Stripe Connect)
   */
  static calculatePlatformFee(amount: number): number {
    // Example: 3% platform fee
    const feePercentage = 0.03;
    return Math.round(amount * feePercentage);
  }

  /**
   * Get balance for connected account (if using Stripe Connect)
   */
  static async getConnectedAccountBalance(accountId: string): Promise<Stripe.Balance> {
    try {
      return await stripe.balance.retrieve({
        stripeAccount: accountId,
      });
    } catch (error) {
      console.error('Error getting connected account balance:', error);
      throw new Error('Failed to retrieve account balance');
    }
  }
}