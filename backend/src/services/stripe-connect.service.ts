import Stripe from "stripe";
import Vendor, {
  PaymentMode,
  VendorSubscriptionStatus,
} from "../models/Vendor";
import { stripe } from "../config/stripe";
import { Types } from "mongoose";
import logger from "../config/logger";

/**
 * Stripe Connect Service
 *
 * Handles Stripe Connect account creation, onboarding, and management for vendors.
 * This enables vendors to connect their own Stripe accounts for direct payment processing.
 */

interface IStripeConnectService {
  createConnectAccount(
    vendorId: Types.ObjectId,
    email: string,
    businessName: string,
  ): Promise<string>;
  generateOnboardingLink(
    vendorId: Types.ObjectId,
    refreshUrl: string,
    returnUrl: string,
  ): Promise<string>;
  getAccountStatus(vendorId: Types.ObjectId): Promise<StripeAccountStatus>;
  refreshAccountLink(
    vendorId: Types.ObjectId,
    refreshUrl: string,
    returnUrl: string,
  ): Promise<string>;
  verifyAccountCapabilities(
    stripeAccountId: string,
  ): Promise<AccountCapabilities>;
  disconnectAccount(vendorId: Types.ObjectId): Promise<void>;
  updateAccountInfo(
    vendorId: Types.ObjectId,
    accountData: AccountUpdateData,
  ): Promise<void>;
}

export interface StripeAccountStatus {
  connected: boolean;
  accountId?: string;
  onboardingComplete: boolean;
  capabilities: AccountCapabilities;
  requirements: {
    currentlyDue: string[];
    eventuallyDue: string[];
    pastDue: string[];
    pendingVerification: string[];
  };
  payoutsEnabled: boolean;
  chargesEnabled: boolean;
  detailsSubmitted: boolean;
}

export interface AccountCapabilities {
  card_payments: "active" | "inactive" | "pending";
  transfers: "active" | "inactive" | "pending";
}

export interface AccountUpdateData {
  businessName?: string;
  email?: string;
  phone?: string;
  website?: string;
}

class StripeConnectService implements IStripeConnectService {
  /**
   * Create a new Stripe Connect Express account for a vendor
   * Express accounts are managed by the platform and provide a simpler onboarding experience
   */
  async createConnectAccount(
    vendorId: Types.ObjectId,
    email: string,
    businessName: string,
  ): Promise<string> {
    try {
      // Check if vendor already has a Stripe Connect account
      const vendor = await Vendor.findById(vendorId);
      if (!vendor) {
        throw new Error("Vendor not found");
      }

      if (vendor.paymentSettings.stripeSettings.stripeConnectAccountId) {
        // Account already exists, return existing account ID
        return vendor.paymentSettings.stripeSettings.stripeConnectAccountId;
      }

      // Create new Stripe Connect Express account
      const account = await stripe.accounts.create({
        type: "express",
        country: "AE", // United Arab Emirates
        email,
        business_type: "company",
        company: {
          name: businessName,
        },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        settings: {
          payouts: {
            schedule: {
              interval: "manual", // Platform controls payouts
            },
          },
        },
        metadata: {
          vendorId: vendorId.toString(),
          businessName,
        },
      });

      // Save account ID to vendor
      vendor.paymentSettings.stripeSettings.stripeConnectAccountId = account.id;
      vendor.paymentSettings.stripeSettings.stripeConnectOnboardingComplete = false;
      await vendor.save();

      logger.info(
        `✓ Created Stripe Connect account ${account.id} for vendor ${vendorId}`,
      );

      return account.id;
    } catch (error: any) {
      logger.error("Error creating Stripe Connect account:", error);
      throw new Error(
        `Failed to create Stripe Connect account: ${error.message}`,
      );
    }
  }

  /**
   * Generate Stripe Connect onboarding link
   * This link redirects the vendor to Stripe to complete their account setup
   */
  async generateOnboardingLink(
    vendorId: Types.ObjectId,
    refreshUrl: string,
    returnUrl: string,
  ): Promise<string> {
    try {
      const vendor = await Vendor.findById(vendorId);
      if (!vendor) {
        throw new Error("Vendor not found");
      }

      let accountId =
        vendor.paymentSettings.stripeSettings.stripeConnectAccountId;

      // Create account if it doesn't exist
      if (!accountId) {
        accountId = await this.createConnectAccount(
          vendorId,
          vendor.email,
          vendor.businessName,
        );
      }

      // Generate account link for onboarding
      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: "account_onboarding",
      });

      logger.info(`✓ Generated onboarding link for vendor ${vendorId}`);

      return accountLink.url;
    } catch (error: any) {
      logger.error("Error generating onboarding link:", error);
      throw new Error(`Failed to generate onboarding link: ${error.message}`);
    }
  }

  /**
   * Get the current status of a vendor's Stripe Connect account
   */
  async getAccountStatus(
    vendorId: Types.ObjectId,
  ): Promise<StripeAccountStatus> {
    try {
      const vendor = await Vendor.findById(vendorId);
      if (!vendor) {
        throw new Error("Vendor not found");
      }

      const accountId =
        vendor.paymentSettings.stripeSettings.stripeConnectAccountId;

      if (!accountId) {
        return {
          connected: false,
          onboardingComplete: false,
          capabilities: {
            card_payments: "inactive",
            transfers: "inactive",
          },
          requirements: {
            currentlyDue: [],
            eventuallyDue: [],
            pastDue: [],
            pendingVerification: [],
          },
          payoutsEnabled: false,
          chargesEnabled: false,
          detailsSubmitted: false,
        };
      }

      // Fetch account details from Stripe
      const account = await stripe.accounts.retrieve(accountId);

      const status: StripeAccountStatus = {
        connected: true,
        accountId: account.id,
        onboardingComplete: account.details_submitted || false,
        capabilities: {
          card_payments: (account.capabilities?.card_payments || "inactive") as
            | "active"
            | "inactive"
            | "pending",
          transfers: (account.capabilities?.transfers || "inactive") as
            | "active"
            | "inactive"
            | "pending",
        },
        requirements: {
          currentlyDue: account.requirements?.currently_due || [],
          eventuallyDue: account.requirements?.eventually_due || [],
          pastDue: account.requirements?.past_due || [],
          pendingVerification: account.requirements?.pending_verification || [],
        },
        payoutsEnabled: account.payouts_enabled || false,
        chargesEnabled: account.charges_enabled || false,
        detailsSubmitted: account.details_submitted || false,
      };

      // Update vendor record if onboarding is now complete
      if (
        account.details_submitted &&
        !vendor.paymentSettings.stripeSettings.stripeConnectOnboardingComplete
      ) {
        vendor.paymentSettings.stripeSettings.stripeConnectOnboardingComplete = true;
        vendor.paymentSettings.stripeSettings.stripeConnectCapabilities =
          status.capabilities;
        await vendor.save();
        logger.info(`✓ Vendor ${vendorId} completed Stripe onboarding`);
      }

      return status;
    } catch (error: any) {
      logger.error("Error getting account status:", error);
      throw new Error(`Failed to get account status: ${error.message}`);
    }
  }

  /**
   * Refresh/regenerate account link if the previous one expired
   */
  async refreshAccountLink(
    vendorId: Types.ObjectId,
    refreshUrl: string,
    returnUrl: string,
  ): Promise<string> {
    // Same as generateOnboardingLink, but explicitly for refreshing
    return this.generateOnboardingLink(vendorId, refreshUrl, returnUrl);
  }

  /**
   * Verify that the Stripe account has all required capabilities
   */
  async verifyAccountCapabilities(
    stripeAccountId: string,
  ): Promise<AccountCapabilities> {
    try {
      const account = await stripe.accounts.retrieve(stripeAccountId);

      return {
        card_payments: (account.capabilities?.card_payments || "inactive") as
          | "active"
          | "inactive"
          | "pending",
        transfers: (account.capabilities?.transfers || "inactive") as
          | "active"
          | "inactive"
          | "pending",
      };
    } catch (error: any) {
      logger.error("Error verifying account capabilities:", error);
      throw new Error(
        `Failed to verify account capabilities: ${error.message}`,
      );
    }
  }

  /**
   * Disconnect (deauthorize) a Stripe Connect account
   * This removes the vendor's access to use their custom Stripe account
   */
  async disconnectAccount(vendorId: Types.ObjectId): Promise<void> {
    try {
      const vendor = await Vendor.findById(vendorId);
      if (!vendor) {
        throw new Error("Vendor not found");
      }

      const accountId =
        vendor.paymentSettings.stripeSettings.stripeConnectAccountId;

      if (accountId) {
        // Delete the Stripe Connect account
        // Note: This is destructive. Consider just deauthorizing instead.
        try {
          await stripe.accounts.del(accountId);
          logger.info(`✓ Deleted Stripe Connect account ${accountId}`);
        } catch (stripeError: any) {
          logger.error("Error deleting Stripe account:", stripeError);
          // Continue anyway to clean up our records
        }
      }

      // Clear Stripe Connect settings
      vendor.paymentSettings.stripeSettings.stripeConnectAccountId = undefined;
      vendor.paymentSettings.stripeSettings.stripeConnectOnboardingComplete = false;
      vendor.paymentSettings.stripeSettings.stripeConnectCapabilities =
        undefined;

      // Switch back to platform Stripe
      vendor.paymentSettings.paymentMode = PaymentMode.PLATFORM_STRIPE;
      vendor.paymentSettings.paymentModeChangedAt = new Date();

      // Deactivate subscription if active
      if (
        vendor.paymentSettings.subscriptionStatus ===
        VendorSubscriptionStatus.ACTIVE
      ) {
        vendor.paymentSettings.subscriptionStatus =
          VendorSubscriptionStatus.INACTIVE;
      }

      await vendor.save();

      logger.info(`✓ Disconnected Stripe account for vendor ${vendorId}`);
    } catch (error: any) {
      logger.error("Error disconnecting account:", error);
      throw new Error(`Failed to disconnect account: ${error.message}`);
    }
  }

  /**
   * Update Stripe Connect account information
   */
  async updateAccountInfo(
    vendorId: Types.ObjectId,
    accountData: AccountUpdateData,
  ): Promise<void> {
    try {
      const vendor = await Vendor.findById(vendorId);
      if (!vendor) {
        throw new Error("Vendor not found");
      }

      const accountId =
        vendor.paymentSettings.stripeSettings.stripeConnectAccountId;
      if (!accountId) {
        throw new Error("No Stripe Connect account found");
      }

      // Update Stripe account
      const updateData: Stripe.AccountUpdateParams = {};

      if (accountData.businessName) {
        updateData.company = { name: accountData.businessName };
      }

      if (accountData.email) {
        updateData.email = accountData.email;
      }

      if (accountData.phone) {
        updateData.business_profile = {
          ...(updateData.business_profile || {}),
          support_phone: accountData.phone,
        };
      }

      if (accountData.website) {
        updateData.business_profile = {
          ...(updateData.business_profile || {}),
          url: accountData.website,
        };
      }

      await stripe.accounts.update(accountId, updateData);

      logger.info(
        `✓ Updated Stripe Connect account info for vendor ${vendorId}`,
      );
    } catch (error: any) {
      logger.error("Error updating account info:", error);
      throw new Error(`Failed to update account info: ${error.message}`);
    }
  }

  /**
   * Handle Stripe Connect webhook events
   * Call this from your webhook endpoint
   */
  async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    try {
      switch (event.type) {
        case "account.updated":
          await this.handleAccountUpdated(event.data.object as Stripe.Account);
          break;

        case "account.application.deauthorized":
          // This event returns the account ID, not the full account object
          const accountId =
            (event.data.object as any).id || (event.account as string);
          if (accountId) {
            await this.handleAccountDeauthorizedById(accountId);
          }
          break;

        case "capability.updated":
          await this.handleCapabilityUpdated(
            event.data.object as Stripe.Capability,
          );
          break;

        default:
          logger.info(`Unhandled Stripe Connect event type: ${event.type}`);
      }
    } catch (error: any) {
      logger.error("Error handling webhook event:", error);
      throw error;
    }
  }

  /**
   * Handle account.updated webhook
   */
  private async handleAccountUpdated(account: Stripe.Account): Promise<void> {
    const vendorId = account.metadata?.vendorId;
    if (!vendorId) {
      logger.warn("Account updated but no vendorId in metadata");
      return;
    }

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      logger.warn(`Vendor ${vendorId} not found for account ${account.id}`);
      return;
    }

    // Update capabilities
    vendor.paymentSettings.stripeSettings.stripeConnectCapabilities = {
      card_payments: (account.capabilities?.card_payments || "inactive") as
        | "active"
        | "inactive"
        | "pending",
      transfers: (account.capabilities?.transfers || "inactive") as
        | "active"
        | "inactive"
        | "pending",
    };

    // Update onboarding status
    if (account.details_submitted) {
      vendor.paymentSettings.stripeSettings.stripeConnectOnboardingComplete = true;
    }

    await vendor.save();

    logger.info(`✓ Updated vendor ${vendorId} from webhook`);
  }

  /**
   * Handle account.application.deauthorized webhook
   */
  private async handleAccountDeauthorizedById(
    accountId: string,
  ): Promise<void> {
    // Find vendor by account ID
    const vendor = await Vendor.findOne({
      "paymentSettings.stripeSettings.stripeConnectAccountId": accountId,
    });

    if (!vendor) {
      logger.warn(`Vendor not found for deauthorized account ${accountId}`);
      return;
    }

    await this.disconnectAccount(vendor._id);
    logger.info(`✓ Deauthorized account ${accountId} for vendor ${vendor._id}`);
  }

  /**
   * Handle capability.updated webhook
   */
  private async handleCapabilityUpdated(
    capability: Stripe.Capability,
  ): Promise<void> {
    // Update vendor's capability status
    const accountId = capability.account as string;

    // Find vendor by account ID
    const vendor = await Vendor.findOne({
      "paymentSettings.stripeSettings.stripeConnectAccountId": accountId,
    });

    if (!vendor) {
      logger.warn(`Vendor not found for account ${accountId}`);
      return;
    }

    // Fetch full account to get all capabilities
    const account = await stripe.accounts.retrieve(accountId);

    vendor.paymentSettings.stripeSettings.stripeConnectCapabilities = {
      card_payments: (account.capabilities?.card_payments || "inactive") as
        | "active"
        | "inactive"
        | "pending",
      transfers: (account.capabilities?.transfers || "inactive") as
        | "active"
        | "inactive"
        | "pending",
    };

    await vendor.save();

    logger.info(`✓ Updated capabilities for vendor ${vendor._id}`);
  }
}

// Export singleton instance
export const stripeConnectService = new StripeConnectService();
export default stripeConnectService;
