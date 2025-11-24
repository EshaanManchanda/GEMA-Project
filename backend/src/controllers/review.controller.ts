import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import mongoose from 'mongoose';
import { Review, Order, Event, User, ReviewType, ReviewStatus, FlagReason } from '../models';
import { AppError } from '../middleware/index';
import { AuthRequest } from '../types';

// @desc    Create new review
// @route   POST /api/reviews
// @access  Private (Customer only)
export const createReview = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError('Validation failed', 400, errors.array()));
    }

    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      return next(new AppError('User not authenticated', 401));
    }

    const { type, targetId, orderId, rating, title, comment, pros, cons, media } = req.body;

    // Verify the target exists based on type
    let targetExists = false;
    if (type === ReviewType.EVENT) {
      const event = await Event.findById(targetId);
      targetExists = !!event;
    } else if (type === ReviewType.VENDOR) {
      const vendor = await User.findOne({ _id: targetId, role: 'vendor' });
      targetExists = !!vendor;
    }

    if (!targetExists) {
      return next(new AppError('Target not found', 404));
    }

    // Check if user has already reviewed this item
    const existingReview = await Review.findOne({
      user: userId,
      type,
      ...(type === ReviewType.EVENT && { event: targetId }),
      ...(type === ReviewType.VENDOR && { vendor: targetId }),
      deletedAt: { $exists: false },
    });

    if (existingReview) {
      return next(new AppError('You have already reviewed this item', 400));
    }

    // Verify purchase if orderId is provided
    let verifiedPurchase = false;
    if (orderId) {
      const order = await Order.findOne({
        _id: orderId,
        userId,
        status: 'confirmed',
        paymentStatus: 'paid',
      });

      if (order) {
        // Check if the order contains the target item
        const hasTargetItem = order.items.some(item => 
          item.eventId.toString() === targetId
        );

        if (hasTargetItem) {
          verifiedPurchase = true;
        }
      }
    }

    const reviewData: any = {
      type,
      user: userId,
      order: orderId,
      rating,
      title,
      comment,
      pros,
      cons,
      media: media || [],
      verified: verifiedPurchase,
      verifiedPurchase,
      source: 'web',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    };

    if (type === ReviewType.EVENT) {
      reviewData.event = targetId;
    } else if (type === ReviewType.VENDOR) {
      reviewData.vendor = targetId;
    }

    const review = await Review.create(reviewData);

    res.status(201).json({
      success: true,
      message: 'Review created successfully',
      data: { review },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get reviews (general or for specific target)
// @route   GET /api/reviews or GET /api/reviews/:type/:id
// @access  Public
export const getReviews = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError('Validation failed', 400, errors.array()));
    }

    const { type: pathType, id: pathId } = req.params;
    const {
      type: queryType,
      targetId,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      rating,
      verified,
    } = req.query;

    // Determine if this is a specific target query or general query
    const isSpecificTarget = pathType && pathId;
    const type = isSpecificTarget ? pathType : queryType;
    const id = isSpecificTarget ? pathId : targetId;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build filter query
    const filter: any = {
      status: ReviewStatus.APPROVED,
      deletedAt: { $exists: false },
    };

    // Add type filter if specified
    if (type) {
      if (!Object.values(ReviewType).includes(type as ReviewType)) {
        return next(new AppError('Invalid review type', 400));
      }
      filter.type = type;

      // Add target ID filter if specified
      if (id) {
        if (type === ReviewType.EVENT) {
          filter.event = id;
        } else if (type === ReviewType.VENDOR) {
          filter.vendor = id;
        }
      }
    }

    if (rating) {
      filter.rating = parseInt(rating as string);
    }

    if (verified === 'true') {
      filter.verified = true;
    }

    // Build sort query
    const sort: any = {};
    sort[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

    // Execute query
    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .populate('user', 'firstName lastName avatar')
        .populate('event', 'title')
        .populate('vendor', 'firstName lastName businessName')
        .sort(sort)
        .skip(skip)
        .limit(limitNum),
      Review.countDocuments(filter),
    ]);

    // Get average rating and distribution if querying for specific target
    let ratingStats = null;
    if (isSpecificTarget && id && type) {
      ratingStats = await Review.getAverageRating(new mongoose.Types.ObjectId(id as string), type as ReviewType);
    }

    const responseData: any = {
      reviews,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalReviews: total,
        hasNextPage: pageNum < Math.ceil(total / limitNum),
        hasPrevPage: pageNum > 1,
        limit: limitNum,
      },
    };

    if (ratingStats) {
      responseData.ratingStats = ratingStats;
    }

    res.status(200).json({
      success: true,
      message: 'Reviews retrieved successfully',
      data: responseData,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's reviews
// @route   GET /api/reviews/my-reviews
// @access  Private
export const getUserReviews = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build sort query
    const sort: any = {};
    sort[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

    // Execute query
    const [reviews, total] = await Promise.all([
      Review.find({
        user: userId,
        deletedAt: { $exists: false },
      })
        .populate('event vendor', 'title firstName lastName')
        .sort(sort)
        .skip(skip)
        .limit(limitNum),
      Review.countDocuments({
        user: userId,
        deletedAt: { $exists: false },
      }),
    ]);

    res.status(200).json({
      success: true,
      message: 'User reviews retrieved successfully',
      data: {
        reviews,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalReviews: total,
          hasNextPage: pageNum < Math.ceil(total / limitNum),
          hasPrevPage: pageNum > 1,
          limit: limitNum,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update review
// @route   PUT /api/reviews/:id
// @access  Private (Author only)
export const updateReview = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError('Validation failed', 400, errors.array()));
    }

    const { id } = req.params;
    const userId = req.user?._id || req.user?.id;

    const review = await Review.findOne({
      _id: id,
      user: userId,
      deletedAt: { $exists: false },
    });

    if (!review) {
      return next(new AppError('Review not found or unauthorized', 404));
    }

    if (!review.canEdit) {
      return next(new AppError('Review can no longer be edited', 400));
    }

    const { rating, title, comment, pros, cons, media } = req.body;

    review.rating = rating !== undefined ? rating : review.rating;
    review.title = title !== undefined ? title : review.title;
    review.comment = comment !== undefined ? comment : review.comment;
    review.pros = pros !== undefined ? pros : review.pros;
    review.cons = cons !== undefined ? cons : review.cons;
    review.media = media !== undefined ? media : review.media;

    // Reset status to pending if it was previously approved
    if (review.status === ReviewStatus.APPROVED) {
      review.status = ReviewStatus.PENDING;
    }

    await review.save();

    res.status(200).json({
      success: true,
      message: 'Review updated successfully',
      data: { review },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete review
// @route   DELETE /api/reviews/:id
// @access  Private (Author only)
export const deleteReview = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id || req.user?.id;

    const review = await Review.findOne({
      _id: id,
      user: userId,
      deletedAt: { $exists: false },
    });

    if (!review) {
      return next(new AppError('Review not found or unauthorized', 404));
    }

    if (!review.canDelete) {
      return next(new AppError('Review can no longer be deleted', 400));
    }

    review.deletedAt = new Date();
    await review.save();

    res.status(200).json({
      success: true,
      message: 'Review deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add helpful vote to review
// @route   POST /api/reviews/:id/vote
// @access  Private
export const voteReview = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { helpful } = req.body;
    const userId = req.user?._id || req.user?.id;

    if (typeof helpful !== 'boolean') {
      return next(new AppError('helpful must be a boolean value', 400));
    }

    const review = await Review.findOne({
      _id: id,
      status: ReviewStatus.APPROVED,
      deletedAt: { $exists: false },
    });

    if (!review) {
      return next(new AppError('Review not found', 404));
    }

    if (review.user.toString() === userId) {
      return next(new AppError('You cannot vote on your own review', 400));
    }

    review.addHelpfulVote(userId, helpful);
    await review.save();

    res.status(200).json({
      success: true,
      message: 'Vote recorded successfully',
      data: {
        helpful: review.helpful,
        notHelpful: review.notHelpful,
        helpfulPercentage: review.helpfulPercentage,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Flag review
// @route   POST /api/reviews/:id/flag
// @access  Private
export const flagReview = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { reason, description } = req.body;
    const userId = req.user?._id || req.user?.id;

    if (!Object.values(FlagReason).includes(reason)) {
      return next(new AppError('Invalid flag reason', 400));
    }

    const review = await Review.findOne({
      _id: id,
      status: ReviewStatus.APPROVED,
      deletedAt: { $exists: false },
    });

    if (!review) {
      return next(new AppError('Review not found', 404));
    }

    if (review.user.toString() === userId) {
      return next(new AppError('You cannot flag your own review', 400));
    }

    try {
      review.addFlag(userId, reason, description);
      await review.save();

      res.status(200).json({
        success: true,
        message: 'Review flagged successfully',
      });
    } catch (error: any) {
      if (error.message === 'User has already flagged this review') {
        return next(new AppError(error.message, 400));
      }
      throw error;
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Add response to review
// @route   POST /api/reviews/:id/respond
// @access  Private (Vendor for their items)
export const respondToReview = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    const userId = req.user?._id || req.user?.id;

    if (!message || message.trim().length === 0) {
      return next(new AppError('Response message is required', 400));
    }

    const review = await Review.findOne({
      _id: id,
      status: ReviewStatus.APPROVED,
      deletedAt: { $exists: false },
    }).populate('event vendor');

    if (!review) {
      return next(new AppError('Review not found', 404));
    }

    // Check if user is authorized to respond
    let isAuthorized = false;
    let isVendor = false;

    if (review.type === ReviewType.EVENT && review.event) {
      const event = await Event.findById(review.event);
      if (event && event.vendorId.toString() === userId) {
        isAuthorized = true;
        isVendor = true;
      }
    } else if (review.type === ReviewType.VENDOR && review.vendor) {
      if (review.vendor._id.toString() === userId) {
        isAuthorized = true;
        isVendor = true;
      }
    }

    if (!isAuthorized) {
      return next(new AppError('Not authorized to respond to this review', 403));
    }

    review.addResponse(userId, message.trim(), isVendor);
    await review.save();

    res.status(200).json({
      success: true,
      message: 'Response added successfully',
      data: { review },
    });
  } catch (error) {
    next(error);
  }
};

// Admin functions

// @desc    Get pending reviews for moderation
// @route   GET /api/reviews/admin/pending
// @access  Private (Admin only)
export const getPendingReviews = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'asc',
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build sort query
    const sort: any = {};
    sort[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

    // Execute query
    const [reviews, total] = await Promise.all([
      Review.find({
        status: ReviewStatus.PENDING,
        deletedAt: { $exists: false },
      })
        .populate('user event vendor', 'firstName lastName title')
        .sort(sort)
        .skip(skip)
        .limit(limitNum),
      Review.countDocuments({
        status: ReviewStatus.PENDING,
        deletedAt: { $exists: false },
      }),
    ]);

    res.status(200).json({
      success: true,
      message: 'Pending reviews retrieved successfully',
      data: {
        reviews,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalReviews: total,
          hasNextPage: pageNum < Math.ceil(total / limitNum),
          hasPrevPage: pageNum > 1,
          limit: limitNum,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Moderate review (approve/reject)
// @route   PUT /api/reviews/admin/:id/moderate
// @access  Private (Admin only)
export const moderateReview = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const moderatorId = req.user?._id || req.user?.id;

    if (!Object.values(ReviewStatus).includes(status)) {
      return next(new AppError('Invalid review status', 400));
    }

    const review = await Review.findById(id);
    if (!review) {
      return next(new AppError('Review not found', 404));
    }

    review.moderate(moderatorId, status, notes);
    await review.save();

    res.status(200).json({
      success: true,
      message: `Review ${status} successfully`,
      data: { review },
    });
  } catch (error) {
    next(error);
  }
};