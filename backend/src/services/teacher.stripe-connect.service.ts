import Stripe from "stripe";
import Teacher, { TeacherPaymentMode } from "../models/Teacher";
import { stripe } from "../config/stripe";
import { Types } from "mongoose";
import { TeacherSubscriptionStatus } from "../models/TeacherSubscription";
import logger from "../config/logger";

/**
 * Stripe Connect Service
 *
 * Handles Stripe Connect account creation, onboarding, and management for teachers.
 * This enables teachers to connect their own Stripe accounts for direct payment processing.
 */

interface IteacherStripeConnectService {
  createConnectAccount(
    teacherId: Types.ObjectId,
    email: string,
    fullName: string,
  ): Promise<string>;

  generateOnboardingLink(
    teacherId: Types.ObjectId,
    refreshUrl: string,
    returnUrl: string,
  ): Promise<string>;

  getAccountStatus(teacherId: Types.ObjectId): Promise<StripeAccountStatus>;

  refreshAccountLink(
    teacherId: Types.ObjectId,
    refreshUrl: string,
    returnUrl: string,
  ): Promise<string>;

  verifyAccountCapabilities(
    stripeAccountId: string,
  ): Promise<AccountCapabilities>;

  disconnectAccount(teacherId: Types.ObjectId): Promise<void>;

  updateAccountInfo(
    teacherId: Types.ObjectId,
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
  fullName?: string;
  email?: string;
  phone?: string;
  website?: string;
}

class TeacherStripeConnectService implements IteacherStripeConnectService {
  /**
   * Create a new Stripe Connect Express account for a teacher
   * Express accounts are managed by the platform and provide a simpler onboarding experience
   */
  async createConnectAccount(
    teacherId: Types.ObjectId,
    email: string,
    fullName: string,
  ): Promise<string> {
    try {
      // Check if teacher already has a Stripe Connect account
      const teacher = await Teacher.findById(teacherId);
      if (!teacher) {
        throw new Error("Teacher not found");
      }

      if (teacher.paymentSettings.stripeSettings.stripeConnectAccountId) {
        // Account already exists, return existing account ID
        return teacher.paymentSettings.stripeSettings.stripeConnectAccountId;
      }

      // Create new Stripe Connect Express account
      const account = await stripe.accounts.create({
        type: "express",
        country: "AE", // United Arab Emirates
        email,
        business_type: "individual",
        individual: {
          first_name: fullName,
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
          teacherId: teacherId.toString(),
          fullName,
        },
      });

      // Save account ID to teacher
      teacher.paymentSettings.stripeSettings.stripeConnectAccountId =
        account.id;
      teacher.paymentSettings.stripeSettings.stripeConnectOnboardingComplete = false;
      await teacher.save();

      logger.info(
        `✓ Created Stripe Connect account ${account.id} for teacher ${teacherId}`,
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
   * This link redirects the teacher to Stripe to complete their account setup
   */
  async generateOnboardingLink(
    teacherId: Types.ObjectId,
    refreshUrl: string,
    returnUrl: string,
  ): Promise<string> {
    try {
      const teacher = await Teacher.findById(teacherId);
      if (!teacher) {
        throw new Error("Teacher not found");
      }

      let accountId =
        teacher.paymentSettings.stripeSettings.stripeConnectAccountId;

      // Create account if it doesn't exist
      if (!accountId) {
        accountId = await this.createConnectAccount(
          teacherId,
          teacher.email,
          teacher.fullName,
        );
      }

      // Generate account link for onboarding
      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: "account_onboarding",
      });

      logger.info(`✓ Generated onboarding link for teacher ${teacherId}`);

      return accountLink.url;
    } catch (error: any) {
      logger.error("Error generating onboarding link:", error);
      throw new Error(`Failed to generate onboarding link: ${error.message}`);
    }
  }

  /**
   * Get the current status of a teacher's Stripe Connect account
   */
  async getAccountStatus(
    teacherId: Types.ObjectId,
  ): Promise<StripeAccountStatus> {
    try {
      const teacher = await Teacher.findById(teacherId);
      if (!teacher) {
        throw new Error("Teacher not found");
      }

      const accountId =
        teacher.paymentSettings.stripeSettings.stripeConnectAccountId;

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

      // Update teacher record if onboarding is now complete
      if (
        account.details_submitted &&
        !teacher.paymentSettings.stripeSettings.stripeConnectOnboardingComplete
      ) {
        teacher.paymentSettings.stripeSettings.stripeConnectOnboardingComplete = true;
        await teacher.save();

        logger.info(`✓ Teacher ${teacherId} completed Stripe onboarding`);
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
    teacherId: Types.ObjectId,
    refreshUrl: string,
    returnUrl: string,
  ): Promise<string> {
    // Same as generateOnboardingLink, but explicitly for refreshing
    return this.generateOnboardingLink(teacherId, refreshUrl, returnUrl);
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
   * This removes the teacher's access to use their custom Stripe account
   */
  async disconnectAccount(teacherId: Types.ObjectId): Promise<void> {
    try {
      const teacher = await Teacher.findById(teacherId);
      if (!teacher) {
        throw new Error("teacher not found");
      }

      const accountId =
        teacher.paymentSettings.stripeSettings.stripeConnectAccountId;

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
      teacher.paymentSettings.stripeSettings.stripeConnectAccountId = undefined;
      teacher.paymentSettings.stripeSettings.stripeConnectOnboardingComplete = false;

      // Switch back to platform Stripe
      teacher.paymentSettings.paymentMode = TeacherPaymentMode.PLATFORM_STRIPE;
      teacher.paymentSettings.paymentModeChangedAt = new Date();

      // Deactivate subscription if active
      if (
        teacher.paymentSettings.subscriptionStatus ===
        TeacherSubscriptionStatus.ACTIVE
      ) {
        teacher.paymentSettings.subscriptionStatus =
          TeacherSubscriptionStatus.INACTIVE;
      }

      await teacher.save();

      logger.info(`✓ Disconnected Stripe account for teacher ${teacherId}`);
    } catch (error: any) {
      logger.error("Error disconnecting account:", error);
      throw new Error(`Failed to disconnect account: ${error.message}`);
    }
  }

  /**
   * Update Stripe Connect account information
   */
  async updateAccountInfo(
    teacherId: Types.ObjectId,
    accountData: AccountUpdateData,
  ): Promise<void> {
    try {
      const teacher = await Teacher.findById(teacherId);
      if (!teacher) {
        throw new Error("Teacher not found");
      }

      const accountId =
        teacher.paymentSettings.stripeSettings.stripeConnectAccountId;

      if (!accountId) {
        throw new Error("No Stripe Connect account found");
      }

      // Update Stripe account
      const updateData: Stripe.AccountUpdateParams = {};

      if (accountData.fullName) {
        updateData.individual = {
          ...(updateData.individual || {}),
          first_name: accountData.fullName,
        };
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
        `✓ Updated Stripe Connect account info for teacher ${teacherId}`,
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
    const teacherId = account.metadata?.teacherId;
    if (!teacherId) {
      logger.warn("Account updated but no teacherId in metadata");
      return;
    }

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      logger.warn(`Teacher ${teacherId} not found for account ${account.id}`);
      return;
    }

    // Update onboarding status
    if (account.details_submitted) {
      teacher.paymentSettings.stripeSettings.stripeConnectOnboardingComplete = true;
    }

    await teacher.save();

    logger.info(`✓ Updated teacher ${teacherId} from webhook`);
  }

  /**
   * Handle account.application.deauthorized webhook
   */
  private async handleAccountDeauthorizedById(
    accountId: string,
  ): Promise<void> {
    // Find teacher by account ID
    const teacher = await Teacher.findOne({
      "paymentSettings.stripeSettings.stripeConnectAccountId": accountId,
    });

    if (!teacher) {
      logger.warn(`Teacher not found for deauthorized account ${accountId}`);
      return;
    }

    await this.disconnectAccount(teacher._id as Types.ObjectId);

    logger.info(
      `✓ Deauthorized account ${accountId} for teacher ${teacher._id}`,
    );
  }

  /**
   * Handle capability.updated webhook
   */
  private async handleCapabilityUpdated(
    capability: Stripe.Capability,
  ): Promise<void> {
    const accountId = capability.account as string;

    // Find teacher by account ID
    const teacher = await Teacher.findOne({
      "paymentSettings.stripeSettings.stripeConnectAccountId": accountId,
    });

    if (!teacher) {
      logger.warn(`Teacher not found for account ${accountId}`);
      return;
    }

    // Fetch full account to get updated capabilities
    const account = await stripe.accounts.retrieve(accountId);

    teacher.paymentSettings.stripeSettings.stripeConnectOnboardingComplete =
      account.details_submitted || false;

    await teacher.save();

    logger.info(`✓ Updated capabilities for teacher ${teacher._id}`);
  }
}
export const teacherStripeConnectService = new TeacherStripeConnectService();
export default teacherStripeConnectService;
