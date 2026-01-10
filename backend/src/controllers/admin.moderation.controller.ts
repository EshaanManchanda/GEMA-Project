import { Request, Response, NextFunction } from 'express';
import { Review, Event, User } from '../models/index';
import { AppError } from '../middleware/index';

/**
 * Get all reviews pending moderation
 */
export const getPendingReviews = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const query = {
      // Add a status field to Review model or use a flag for pending reviews
      // For now, we'll fetch all recent reviews
    };

    const [reviews, total] = await Promise.all([
      Review.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('userId', 'firstName lastName email avatar')
        .populate('eventId', 'title type'),
      Review.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      message: 'Pending reviews retrieved successfully',
      data: {
        reviews,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Moderate a review (approve, reject, flag, delete)
 */
export const moderateReview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { action, reason, notifyUser = false } = req.body;

    const review = await Review.findById(id);
    if (!review) {
      return next(new AppError('Review not found', 404));
    }

    switch (action) {
      case 'approve':
        // Mark as approved (if you have a status field)
        // review.status = 'approved';
        break;

      case 'reject':
        // Mark as rejected
        // review.status = 'rejected';
        // review.rejectionReason = reason;
        break;

      case 'flag':
        // Flag for admin review
        // review.isFlagged = true;
        // review.flagReason = reason;
        break;

      case 'delete':
        await review.deleteOne();
        res.status(200).json({
          success: true,
          message: 'Review deleted successfully',
        });
        return;

      default:
        return next(new AppError('Invalid moderation action', 400));
    }

    await review.save();

    // TODO: Send notification to user if notifyUser is true

    res.status(200).json({
      success: true,
      message: `Review ${action}ed successfully`,
      data: review,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get flagged content (events, reviews, users)
 */
export const getFlaggedContent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { type, page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    let flaggedContent: any[] = [];
    let total = 0;

    switch (type) {
      case 'reviews':
        // Assuming you add isFlagged field to Review model
        [flaggedContent, total] = await Promise.all([
          Review.find({ /* isFlagged: true */ })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum)
            .populate('userId', 'firstName lastName email')
            .populate('eventId', 'title'),
          Review.countDocuments({ /* isFlagged: true */ }),
        ]);
        break;

      case 'events':
        // Events that are rejected or flagged
        [flaggedContent, total] = await Promise.all([
          Event.find({ status: 'rejected', isDeleted: false })
            .sort({ updatedAt: -1 })
            .skip(skip)
            .limit(limitNum)
            .populate('vendorId', 'firstName lastName email'),
          Event.countDocuments({ status: 'rejected', isDeleted: false }),
        ]);
        break;

      case 'users':
        // Suspended or flagged users
        [flaggedContent, total] = await Promise.all([
          User.find({ status: 'suspended' })
            .sort({ updatedAt: -1 })
            .skip(skip)
            .limit(limitNum)
            .select('-passwordHash'),
          User.countDocuments({ status: 'suspended' }),
        ]);
        break;

      default:
        // Get all flagged content
        const [flaggedReviews, flaggedEvents, flaggedUsers] = await Promise.all([
          Review.find({ /* isFlagged: true */ }).limit(5).populate('userId eventId').lean(),
          Event.find({ status: 'rejected', isDeleted: false }).limit(5).populate('vendorId').lean(),
          User.find({ status: 'suspended' }).limit(5).select('-passwordHash').lean(),
        ]);

        res.status(200).json({
          success: true,
          message: 'Flagged content retrieved successfully',
          data: {
            reviews: flaggedReviews,
            events: flaggedEvents,
            users: flaggedUsers,
          },
        });
        return;
    }

    res.status(200).json({
      success: true,
      message: `Flagged ${type} retrieved successfully`,
      data: {
        content: flaggedContent,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk moderate content
 */
export const bulkModerate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { contentType, contentIds, action, reason } = req.body;

    if (!contentIds || !Array.isArray(contentIds) || contentIds.length === 0) {
      return next(new AppError('Content IDs are required', 400));
    }

    if (contentIds.length > 100) {
      return next(new AppError('Cannot moderate more than 100 items at once', 400));
    }

    let result;

    switch (contentType) {
      case 'review':
        if (action === 'delete') {
          result = await Review.deleteMany({ _id: { $in: contentIds } });
        } else if (action === 'approve') {
          // result = await Review.updateMany({ _id: { $in: contentIds } }, { status: 'approved' });
        } else if (action === 'reject') {
          // result = await Review.updateMany({ _id: { $in: contentIds } }, { status: 'rejected', rejectionReason: reason });
        }
        break;

      case 'event':
        if (action === 'approve') {
          result = await Event.updateMany(
            { _id: { $in: contentIds } },
            { isApproved: true, status: 'published' }
          );
        } else if (action === 'reject') {
          result = await Event.updateMany(
            { _id: { $in: contentIds } },
            { isApproved: false, status: 'rejected' }
          );
        } else if (action === 'delete') {
          result = await Event.updateMany(
            { _id: { $in: contentIds } },
            { isDeleted: true }
          );
        }
        break;

      case 'user':
        if (action === 'suspend') {
          result = await User.updateMany(
            { _id: { $in: contentIds } },
            { status: 'suspended' }
          );
        } else if (action === 'activate') {
          result = await User.updateMany(
            { _id: { $in: contentIds } },
            { status: 'active' }
          );
        }
        break;

      default:
        return next(new AppError('Invalid content type', 400));
    }

    res.status(200).json({
      success: true,
      message: `Bulk ${action} completed successfully`,
      data: {
        modifiedCount: result?.modifiedCount || result?.deletedCount || 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get moderation queue statistics
 */
export const getModerationStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const [
      pendingEvents,
      rejectedEvents,
      suspendedUsers,
      flaggedReviews,
      recentActions,
    ] = await Promise.all([
      Event.countDocuments({ status: 'pending', isDeleted: false }),
      Event.countDocuments({ status: 'rejected', isDeleted: false }),
      User.countDocuments({ status: 'suspended' }),
      Review.countDocuments({ /* isFlagged: true */ }),

      // Recent moderation actions (last 7 days)
      Promise.all([
        Event.countDocuments({
          status: { $in: ['approved', 'rejected'] },
          updatedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        }),
      ]),
    ]);

    const moderationStats = {
      pending: {
        events: pendingEvents,
        reviews: flaggedReviews,
      },
      flagged: {
        events: rejectedEvents,
        users: suspendedUsers,
      },
      recentActions: {
        last7Days: recentActions[0],
      },
      queue: {
        total: pendingEvents + flaggedReviews,
        highPriority: rejectedEvents, // Events that were rejected and may need attention
      },
    };

    res.status(200).json({
      success: true,
      message: 'Moderation statistics retrieved successfully',
      data: moderationStats,
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getPendingReviews,
  moderateReview,
  getFlaggedContent,
  bulkModerate,
  getModerationStats,
};
