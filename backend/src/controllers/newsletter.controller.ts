import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../types/express.d';
import NewsletterSubscriber from '../models/NewsletterSubscriber';
import { AppError } from '../middleware/error';

// Subscribe to newsletter
export const subscribe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, source = 'blog', tags = [], preferences = {} } = req.body;

    // Check if email is already subscribed
    let subscriber = await NewsletterSubscriber.findOne({ email });

    if (subscriber) {
      if (subscriber.isActive) {
        return res.status(200).json({
          success: true,
          message: 'Email is already subscribed to our newsletter',
          data: {
            subscriber: {
              email: subscriber.email,
              isActive: subscriber.isActive,
              subscriptionDate: subscriber.subscriptionDate
            }
          }
        });
      } else {
        // Reactivate subscription
        await subscriber.resubscribe();
        // Update preferences if provided
        if (Object.keys(preferences).length > 0) {
          subscriber.preferences = { ...subscriber.preferences, ...preferences };
          await subscriber.save();
        }

        return res.status(200).json({
          success: true,
          message: 'Successfully resubscribed to our newsletter',
          data: {
            subscriber: {
              email: subscriber.email,
              isActive: subscriber.isActive,
              subscriptionDate: subscriber.subscriptionDate
            }
          }
        });
      }
    }

    // Create new subscription
    subscriber = new NewsletterSubscriber({
      email,
      source,
      tags,
      preferences: {
        frequency: preferences.frequency || 'weekly',
        categories: preferences.categories || [],
        receivePromotions: preferences.receivePromotions !== false
      }
    });

    await subscriber.save();

    res.status(201).json({
      success: true,
      message: 'Successfully subscribed to our newsletter',
      data: {
        subscriber: {
          email: subscriber.email,
          isActive: subscriber.isActive,
          subscriptionDate: subscriber.subscriptionDate
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Unsubscribe by token (public route)
export const unsubscribeByToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.params;
    const { reason } = req.query;

    const subscriber = await NewsletterSubscriber.findOne({
      unsubscribeToken: token,
      isActive: true
    });

    if (!subscriber) {
      return next(new AppError('Invalid or expired unsubscribe token', 404));
    }

    await subscriber.unsubscribe(reason as string);

    res.status(200).json({
      success: true,
      message: 'Successfully unsubscribed from our newsletter',
      data: { email: subscriber.email }
    });
  } catch (error) {
    next(error);
  }
};

// Get subscription status for authenticated user
export const getSubscriptionStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userEmail = req.user!.email;

    const subscriber = await NewsletterSubscriber.findOne({ email: userEmail });

    if (!subscriber) {
      return res.status(200).json({
        success: true,
        message: 'User subscription status retrieved',
        data: {
          isSubscribed: false,
          email: userEmail
        }
      });
    }

    res.status(200).json({
      success: true,
      message: 'User subscription status retrieved',
      data: {
        isSubscribed: subscriber.isActive,
        email: subscriber.email,
        preferences: subscriber.preferences,
        subscriptionDate: subscriber.subscriptionDate,
        source: subscriber.source,
        unsubscribeToken: subscriber.unsubscribeToken
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update subscription preferences for authenticated user
export const updatePreferences = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userEmail = req.user!.email;
    const { frequency, categories, receivePromotions } = req.body;

    let subscriber = await NewsletterSubscriber.findOne({ email: userEmail });

    if (!subscriber) {
      return next(new AppError('No newsletter subscription found', 404));
    }

    // Update preferences
    if (frequency) subscriber.preferences.frequency = frequency;
    if (categories !== undefined) subscriber.preferences.categories = categories;
    if (receivePromotions !== undefined) subscriber.preferences.receivePromotions = receivePromotions;

    await subscriber.save();

    res.status(200).json({
      success: true,
      message: 'Newsletter preferences updated successfully',
      data: {
        preferences: subscriber.preferences
      }
    });
  } catch (error) {
    next(error);
  }
};

// Unsubscribe authenticated user
export const unsubscribe = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userEmail = req.user!.email;
    const { reason } = req.body;

    const subscriber = await NewsletterSubscriber.findOne({
      email: userEmail,
      isActive: true
    });

    if (!subscriber) {
      return next(new AppError('No active newsletter subscription found', 404));
    }

    await subscriber.unsubscribe(reason);

    res.status(200).json({
      success: true,
      message: 'Successfully unsubscribed from our newsletter'
    });
  } catch (error) {
    next(error);
  }
};

// Get subscriber statistics (admin only)
export const getSubscriberStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Check if user is admin
    if (req.user!.role !== 'admin') {
      return next(new AppError('Access denied. Admin privileges required.', 403));
    }

    const stats = await NewsletterSubscriber.getSubscriptionStats();

    // Get recent subscriptions (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentSubscriptions = await NewsletterSubscriber.countDocuments({
      subscriptionDate: { $gte: thirtyDaysAgo },
      isActive: true
    });

    // Get growth stats
    const growthStats = await NewsletterSubscriber.aggregate([
      {
        $match: { subscriptionDate: { $gte: thirtyDaysAgo } }
      },
      {
        $group: {
          _id: {
            year: { $year: '$subscriptionDate' },
            month: { $month: '$subscriptionDate' },
            day: { $dayOfMonth: '$subscriptionDate' }
          },
          subscriptions: { $sum: 1 },
          unsubscriptions: {
            $sum: { $cond: [{ $eq: ['$isActive', false] }, 1, 0] }
          }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
      }
    ]);

    res.status(200).json({
      success: true,
      message: 'Newsletter statistics retrieved successfully',
      data: {
        ...stats,
        recentSubscriptions,
        growthStats
      }
    });
  } catch (error) {
    next(error);
  }
};

// Send newsletter (admin only)
export const sendNewsletter = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Check if user is admin
    if (req.user!.role !== 'admin') {
      return next(new AppError('Access denied. Admin privileges required.', 403));
    }

    const {
      subject,
      content,
      frequency,
      tags = [],
      testMode = false
    } = req.body;

    // Build query for subscribers
    let query: any = { isActive: true };

    if (frequency) {
      query['preferences.frequency'] = frequency;
    }

    if (tags.length > 0) {
      query.tags = { $in: tags };
    }

    // In test mode, only send to admin email
    if (testMode) {
      query.email = req.user!.email;
    }

    const subscribers = await NewsletterSubscriber.find(query);

    if (subscribers.length === 0) {
      return next(new AppError('No subscribers found matching the criteria', 400));
    }

    // TODO: Integrate with email service (SendGrid, Mailgun, etc.)
    // For now, we'll simulate sending emails
    const emailPromises = subscribers.map(async (subscriber) => {
      // Here you would integrate with your email service
      // await emailService.send({
      //   to: subscriber.email,
      //   subject,
      //   html: content,
      //   unsubscribeUrl: `${process.env.FRONTEND_URL}/newsletter/unsubscribe/${subscriber.unsubscribeToken}`
      // });

      // Update last email sent date
      subscriber.lastEmailSent = new Date();
      return subscriber.save();
    });

    await Promise.all(emailPromises);

    res.status(200).json({
      success: true,
      message: `Newsletter ${testMode ? 'test ' : ''}sent successfully`,
      data: {
        recipientCount: subscribers.length,
        subject,
        testMode
      }
    });
  } catch (error) {
    next(error);
  }
};