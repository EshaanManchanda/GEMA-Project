import { Request, Response, NextFunction } from "express";
import { AuthRequest } from "../types/express.d";
import NewsletterSubscriber from "../models/NewsletterSubscriber";
import { AppError } from "../middleware/error";
import { NewsletterService } from "../services/newsletter.service";
import { emailService } from "../services/email.service";
import logger from "../config/logger";

const newsletterService = new NewsletterService();

// Subscribe to newsletter
export const subscribe = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const {
      email,
      name,
      ageOfChildren,
      city,
      source = "blog",
      tags = [],
      preferences = {},
    } = req.body;

    const subscriber = await newsletterService.createSubscription({
      email,
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

    // Send welcome/reactivation confirmation email (non-blocking)
    emailService.sendEmail({
      to: subscriber.email,
      subject: subscriber.wasReactivated
        ? "Welcome back to our newsletter!"
        : "Welcome to our newsletter!",
      html: `<p>Hi${subscriber.name ? ` ${subscriber.name}` : ""},</p>
<p>You are now subscribed to our newsletter.</p>
<p><a href="${process.env.FRONTEND_URL}/newsletter/unsubscribe/${(subscriber as any).unsubscribeToken}">Unsubscribe</a></p>`,
    }).catch((err: Error) => logger.error("Newsletter welcome email failed:", err));

    res.status(subscriber.wasReactivated ? 200 : 201).json({
      success: true,
      message: subscriber.wasReactivated
        ? "Successfully resubscribed to our newsletter"
        : "Successfully subscribed to our newsletter",
      data: {
        subscriber: {
          email: subscriber.email,
          name: subscriber.name,
          city: subscriber.city,
          ageOfChildren: subscriber.ageOfChildren,
          isActive: subscriber.isActive,
          subscriptionDate: subscriber.subscriptionDate,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// Unsubscribe by token (public route)
export const unsubscribeByToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { token } = req.params;
    const { reason } = req.query;

    const subscriber = await newsletterService.unsubscribeByToken(
      token,
      reason as string,
    );

    res.status(200).json({
      success: true,
      message: "Successfully unsubscribed from our newsletter",
      data: { email: subscriber.email },
    });
  } catch (error) {
    next(error);
  }
};

// Get subscription status for authenticated user
export const getSubscriptionStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userEmail = req.user!.email;

    const subscriber =
      await newsletterService.getSubscriptionByEmail(userEmail);

    if (!subscriber) {
      return res.status(200).json({
        success: true,
        message: "User subscription status retrieved",
        data: {
          isSubscribed: false,
          email: userEmail,
        },
      });
    }

    res.status(200).json({
      success: true,
      message: "User subscription status retrieved",
      data: {
        isSubscribed: subscriber.isActive,
        email: subscriber.email,
        name: subscriber.name,
        city: subscriber.city,
        ageOfChildren: subscriber.ageOfChildren,
        preferences: subscriber.preferences,
        subscriptionDate: subscriber.subscriptionDate,
        source: subscriber.source,
        unsubscribeToken: subscriber.unsubscribeToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Update subscription preferences for authenticated user
export const updatePreferences = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userEmail = req.user!.email;
    const {
      frequency,
      categories,
      receivePromotions,
      name,
      city,
      ageOfChildren,
    } = req.body;

    const subscriber = await newsletterService.updateSubscription(userEmail, {
      frequency,
      categories,
      receivePromotions,
      name,
      city,
      ageOfChildren,
    });

    res.status(200).json({
      success: true,
      message: "Newsletter preferences updated successfully",
      data: {
        preferences: subscriber.preferences,
        name: subscriber.name,
        city: subscriber.city,
        ageOfChildren: subscriber.ageOfChildren,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Unsubscribe authenticated user
export const unsubscribe = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userEmail = req.user!.email;
    const { reason } = req.body;

    await newsletterService.unsubscribeByEmail(userEmail, reason);

    res.status(200).json({
      success: true,
      message: "Successfully unsubscribed from our newsletter",
    });
  } catch (error) {
    next(error);
  }
};

// Get subscriber statistics (admin only)
export const getSubscriberStats = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    // Check if user is admin
    if (req.user!.role !== "admin") {
      return next(
        new AppError("Access denied. Admin privileges required.", 403),
      );
    }

    const stats = await newsletterService.getSubscriptionStats();

    res.status(200).json({
      success: true,
      message: "Newsletter statistics retrieved successfully",
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

// Get all subscribers (admin only)
export const getAllSubscribers = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (req.user!.role !== "admin") {
      return next(
        new AppError("Access denied. Admin privileges required.", 403),
      );
    }

    const {
      page = 1,
      limit = 20,
      search,
      isActive,
      source,
      sortBy = "subscriptionDate",
      sortOrder = "desc",
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // Build query
    const query: any = {};
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: "i" } },
        { name: { $regex: search, $options: "i" } },
        { city: { $regex: search, $options: "i" } },
      ];
    }
    if (isActive !== undefined && isActive !== "") {
      query.isActive = isActive === "true";
    }
    if (source) {
      query.source = source;
    }

    const sort: any = {};
    sort[sortBy as string] = sortOrder === "asc" ? 1 : -1;

    const [subscribers, totalCount] = await Promise.all([
      NewsletterSubscriber.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      NewsletterSubscriber.countDocuments(query),
    ]);

    const stats = await NewsletterSubscriber.getSubscriptionStats();

    res.status(200).json({
      success: true,
      message: "Newsletter subscribers retrieved successfully",
      data: {
        subscribers,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalCount / limitNum),
          totalCount,
          limit: limitNum,
          hasNext: pageNum * limitNum < totalCount,
          hasPrev: pageNum > 1,
        },
        stats,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Send newsletter (admin only)
export const sendNewsletter = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    // Check if user is admin
    if (req.user!.role !== "admin") {
      return next(
        new AppError("Access denied. Admin privileges required.", 403),
      );
    }

    const {
      subject,
      content,
      frequency,
      tags = [],
      testMode = false,
    } = req.body;

    const subscribers = await newsletterService.getActiveSubscribers({
      frequency,
      tags,
      testMode,
      testEmail: req.user!.email,
    });

    if (subscribers.length === 0) {
      return next(
        new AppError("No subscribers found matching the criteria", 400),
      );
    }

    // TODO: Integrate with email service (SendGrid, Mailgun, etc.)
    // For now, we'll simulate sending emails
    // const emailPromises = subscribers.map(async (subscriber) => {
    //   await emailService.send({
    //     to: subscriber.email,
    //     subject,
    //     html: content,
    //     unsubscribeUrl: `${process.env.FRONTEND_URL}/newsletter/unsubscribe/${subscriber.unsubscribeToken}`
    //   });
    // });
    // await Promise.all(emailPromises);

    // Update last email sent date
    const subscriberIds = subscribers.map((s) => s._id.toString());
    await newsletterService.updateLastEmailSent(subscriberIds);

    res.status(200).json({
      success: true,
      message: `Newsletter ${testMode ? "test " : ""}sent successfully`,
      data: {
        recipientCount: subscribers.length,
        subject,
        testMode,
      },
    });
  } catch (error) {
    next(error);
  }
};
