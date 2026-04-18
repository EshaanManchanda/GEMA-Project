import NewsletterSubscriber, {
  INewsletterSubscriber,
} from "./newsletter-subscriber.model";
import { AppError } from "../../middleware/error";

interface CreateSubscriptionData {
  email: string;
  name: string;
  ageOfChildren?: string;
  city?: string;
  source?: string;
  tags?: string[];
  preferences?: {
    frequency?: "daily" | "weekly" | "monthly";
    categories?: string[];
    receivePromotions?: boolean;
  };
}

interface UpdateSubscriptionData {
  frequency?: "daily" | "weekly" | "monthly";
  categories?: string[];
  receivePromotions?: boolean;
  name?: string;
  city?: string;
  ageOfChildren?: string;
}

interface SubscriptionFilters {
  frequency?: string;
  tags?: string[];
  testMode?: boolean;
  testEmail?: string;
}

interface SubscriptionResult extends INewsletterSubscriber {
  wasReactivated?: boolean;
}

export class NewsletterService {
  /**
   * Create a new subscription or reactivate an existing one
   */
  async createSubscription(
    data: CreateSubscriptionData,
  ): Promise<SubscriptionResult> {
    try {
      const {
        email,
        name,
        ageOfChildren,
        city,
        source = "blog",
        tags = [],
        preferences = {},
      } = data;

      // Check if email already exists
      let subscriber = await NewsletterSubscriber.findOne({
        email: email.toLowerCase(),
      });

      if (subscriber) {
        if (subscriber.isActive) {
          // Already subscribed - update fields if provided
          if (name) subscriber.name = name;
          if (city) subscriber.city = city;
          if (ageOfChildren) subscriber.ageOfChildren = ageOfChildren;
          if (Object.keys(preferences).length > 0) {
            subscriber.preferences = {
              ...subscriber.preferences,
              ...preferences,
            };
          }
          await subscriber.save();

          const result: SubscriptionResult = subscriber;
          result.wasReactivated = false;
          return result;
        } else {
          // Reactivate subscription
          subscriber.isActive = true;
          subscriber.unsubscribeDate = undefined;
          subscriber.unsubscribeReason = undefined;

          // Update fields
          if (name) subscriber.name = name;
          if (city) subscriber.city = city;
          if (ageOfChildren) subscriber.ageOfChildren = ageOfChildren;
          if (Object.keys(preferences).length > 0) {
            subscriber.preferences = {
              ...subscriber.preferences,
              ...preferences,
            };
          }

          await subscriber.save();

          const result: SubscriptionResult = subscriber;
          result.wasReactivated = true;
          return result;
        }
      }

      // Create new subscription
      subscriber = new NewsletterSubscriber({
        email: email.toLowerCase(),
        name,
        ageOfChildren,
        city,
        source,
        tags,
        preferences: {
          frequency: preferences.frequency || "weekly",
          categories: preferences.categories || [],
          receivePromotions: preferences.receivePromotions !== false,
        },
      });

      await subscriber.save();

      const result: SubscriptionResult = subscriber;
      result.wasReactivated = false;
      return result;
    } catch (error: any) {
      console.error("=== NEWSLETTER SERVICE ERROR (CREATE) ===");
      console.error("Error:", error.message);

      if (error.code === 11000) {
        throw new AppError("Email is already subscribed", 400);
      }

      if (error.name === "ValidationError") {
        const validationErrors = Object.keys(error.errors || {})
          .map((key) => error.errors[key].message)
          .join(", ");
        throw new AppError(`Validation failed: ${validationErrors}`, 400);
      }

      throw new AppError("Failed to create subscription", 500);
    }
  }

  /**
   * Update subscription preferences and profile data
   */
  async updateSubscription(
    email: string,
    data: UpdateSubscriptionData,
  ): Promise<INewsletterSubscriber> {
    try {
      const subscriber = await NewsletterSubscriber.findOne({
        email: email.toLowerCase(),
      });

      if (!subscriber) {
        throw new AppError("No newsletter subscription found", 404);
      }

      // Update preferences
      if (data.frequency) {
        subscriber.preferences.frequency = data.frequency;
      }
      if (data.categories !== undefined) {
        subscriber.preferences.categories = data.categories;
      }
      if (data.receivePromotions !== undefined) {
        subscriber.preferences.receivePromotions = data.receivePromotions;
      }

      // Update profile fields
      if (data.name) {
        subscriber.name = data.name;
      }
      if (data.city !== undefined) {
        subscriber.city = data.city;
      }
      if (data.ageOfChildren !== undefined) {
        subscriber.ageOfChildren = data.ageOfChildren;
      }

      await subscriber.save();
      return subscriber;
    } catch (error: any) {
      console.error("=== NEWSLETTER SERVICE ERROR (UPDATE) ===");
      console.error("Error:", error.message);

      if (error instanceof AppError) {
        throw error;
      }

      if (error.name === "ValidationError") {
        const validationErrors = Object.keys(error.errors || {})
          .map((key) => error.errors[key].message)
          .join(", ");
        throw new AppError(`Validation failed: ${validationErrors}`, 400);
      }

      throw new AppError("Failed to update subscription", 500);
    }
  }

  /**
   * Unsubscribe by email (for authenticated users)
   */
  async unsubscribeByEmail(
    email: string,
    reason?: string,
  ): Promise<INewsletterSubscriber> {
    try {
      const subscriber = await NewsletterSubscriber.findOne({
        email: email.toLowerCase(),
        isActive: true,
      });

      if (!subscriber) {
        throw new AppError("No active newsletter subscription found", 404);
      }

      await subscriber.unsubscribe(reason);
      return subscriber;
    } catch (error: any) {
      console.error("=== NEWSLETTER SERVICE ERROR (UNSUBSCRIBE BY EMAIL) ===");
      console.error("Error:", error.message);

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError("Failed to unsubscribe", 500);
    }
  }

  /**
   * Unsubscribe by token (for public unsubscribe links)
   */
  async unsubscribeByToken(
    token: string,
    reason?: string,
  ): Promise<INewsletterSubscriber> {
    try {
      const subscriber = await NewsletterSubscriber.findOne({
        unsubscribeToken: token,
        isActive: true,
      });

      if (!subscriber) {
        throw new AppError("Invalid or expired unsubscribe token", 404);
      }

      await subscriber.unsubscribe(reason);
      return subscriber;
    } catch (error: any) {
      console.error("=== NEWSLETTER SERVICE ERROR (UNSUBSCRIBE BY TOKEN) ===");
      console.error("Error:", error.message);

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError("Failed to unsubscribe", 500);
    }
  }

  /**
   * Resubscribe an inactive subscriber
   */
  async resubscribe(email: string): Promise<INewsletterSubscriber> {
    try {
      const subscriber = await NewsletterSubscriber.findOne({
        email: email.toLowerCase(),
      });

      if (!subscriber) {
        throw new AppError("No newsletter subscription found", 404);
      }

      if (subscriber.isActive) {
        throw new AppError("Subscription is already active", 400);
      }

      await subscriber.resubscribe();
      return subscriber;
    } catch (error: any) {
      console.error("=== NEWSLETTER SERVICE ERROR (RESUBSCRIBE) ===");
      console.error("Error:", error.message);

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError("Failed to resubscribe", 500);
    }
  }

  /**
   * Get subscription by email
   */
  async getSubscriptionByEmail(
    email: string,
  ): Promise<INewsletterSubscriber | null> {
    try {
      const subscriber = await NewsletterSubscriber.findOne({
        email: email.toLowerCase(),
      });

      return subscriber;
    } catch (error: any) {
      console.error("=== NEWSLETTER SERVICE ERROR (GET BY EMAIL) ===");
      console.error("Error:", error.message);

      throw new AppError("Failed to get subscription", 500);
    }
  }

  /**
   * Get subscription statistics (for admin dashboard)
   */
  async getSubscriptionStats(): Promise<any> {
    try {
      const stats = await NewsletterSubscriber.getSubscriptionStats();

      // Get recent subscriptions (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentSubscriptions = await NewsletterSubscriber.countDocuments({
        subscriptionDate: { $gte: thirtyDaysAgo },
        isActive: true,
      });

      // Get growth stats
      const growthStats = await NewsletterSubscriber.aggregate([
        {
          $match: { subscriptionDate: { $gte: thirtyDaysAgo } },
        },
        {
          $group: {
            _id: {
              year: { $year: "$subscriptionDate" },
              month: { $month: "$subscriptionDate" },
              day: { $dayOfMonth: "$subscriptionDate" },
            },
            subscriptions: { $sum: 1 },
            unsubscriptions: {
              $sum: { $cond: [{ $eq: ["$isActive", false] }, 1, 0] },
            },
          },
        },
        {
          $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 },
        },
      ]);

      // Get city distribution for active subscribers
      const cityStats = await NewsletterSubscriber.aggregate([
        {
          $match: { isActive: true, city: { $exists: true, $ne: "" } },
        },
        {
          $group: {
            _id: "$city",
            count: { $sum: 1 },
          },
        },
        {
          $sort: { count: -1 },
        },
        {
          $limit: 10,
        },
      ]);

      // Count subscribers with children data
      const subscribersWithChildren = await NewsletterSubscriber.countDocuments(
        {
          isActive: true,
          ageOfChildren: { $exists: true, $ne: "" },
        },
      );

      return {
        ...stats,
        recentSubscriptions,
        growthStats,
        cityStats,
        subscribersWithChildren,
      };
    } catch (error: any) {
      console.error("=== NEWSLETTER SERVICE ERROR (GET STATS) ===");
      console.error("Error:", error.message);

      throw new AppError("Failed to get subscription statistics", 500);
    }
  }

  /**
   * Get active subscribers based on filters (for sending newsletters)
   */
  async getActiveSubscribers(
    filters: SubscriptionFilters,
  ): Promise<INewsletterSubscriber[]> {
    try {
      const { frequency, tags, testMode, testEmail } = filters;

      // Build query
      const query: any = { isActive: true };

      if (frequency) {
        query["preferences.frequency"] = frequency;
      }

      if (tags && tags.length > 0) {
        query.tags = { $in: tags };
      }

      // In test mode, only return test email
      if (testMode && testEmail) {
        query.email = testEmail.toLowerCase();
      }

      const subscribers = await NewsletterSubscriber.find(query);

      return subscribers;
    } catch (error: any) {
      console.error(
        "=== NEWSLETTER SERVICE ERROR (GET ACTIVE SUBSCRIBERS) ===",
      );
      console.error("Error:", error.message);

      throw new AppError("Failed to get active subscribers", 500);
    }
  }

  /**
   * Update last email sent date for subscribers
   */
  async updateLastEmailSent(subscriberIds: string[]): Promise<void> {
    try {
      await NewsletterSubscriber.updateMany(
        { _id: { $in: subscriberIds } },
        { lastEmailSent: new Date() },
      );
    } catch (error: any) {
      console.error("=== NEWSLETTER SERVICE ERROR (UPDATE LAST EMAIL) ===");
      console.error("Error:", error.message);

      throw new AppError("Failed to update last email sent", 500);
    }
  }
}
