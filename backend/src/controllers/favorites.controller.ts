import { Request, Response, NextFunction } from 'express';
import { User, Event, IUser } from '../models';
import { AppError } from '../middleware';
import { logger } from '../config';

// @desc    Get user's favorite events
// @route   GET /api/favorites
// @access  Private
export const getFavoriteEvents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Handle both _id (MongoDB native) and id (formatted) properties
    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      return next(new AppError('User not authenticated', 401));
    }

    const user = await User.findById(userId).populate({
      path: 'favoriteEvents',
      match: { isDeleted: false, isApproved: true },
      select: 'title description images location price currency dateSchedule createdAt'
    });

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    logger.info('Favorite events retrieved successfully', {
      userId,
      favoriteCount: user.favoriteEvents?.length || 0
    });

    res.status(200).json({
      success: true,
      message: 'Favorite events retrieved successfully',
      data: {
        favorites: user.favoriteEvents || [],
      },
    });
  } catch (error) {
    logger.error('Error fetching favorite events:', error);
    return next(new AppError('Failed to fetch favorite events', 500));
  }
};

// @desc    Add event to favorites
// @route   POST /api/favorites/:eventId
// @access  Private
export const addToFavorites = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { eventId } = req.params;
    // Handle both _id (MongoDB native) and id (formatted) properties
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return next(new AppError('User not authenticated', 401));
    }

    // Check if event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return next(new AppError('Event not found', 404));
    }

    // Find user and check if event is already in favorites
    const user = await User.findById(userId);
    if (!user) {
      return next(new AppError('User not found', 404));
    }

    if (user.favoriteEvents?.includes(eventId as any)) {
      return next(new AppError('Event already in favorites', 400));
    }

    // Add event to favorites
    user.favoriteEvents = user.favoriteEvents || [];
    user.favoriteEvents.push(eventId as any);
    await user.save();

    logger.info('Event added to favorites', {
      userId,
      eventId,
    });

    res.status(200).json({
      success: true,
      message: 'Event added to favorites successfully',
    });
  } catch (error) {
    logger.error('Error adding event to favorites:', error);
    return next(new AppError('Failed to add event to favorites', 500));
  }
};

// @desc    Remove event from favorites
// @route   DELETE /api/favorites/:eventId
// @access  Private
export const removeFromFavorites = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { eventId } = req.params;
    // Handle both _id (MongoDB native) and id (formatted) properties
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return next(new AppError('User not authenticated', 401));
    }

    // Find user and remove event from favorites
    const user = await User.findById(userId);
    if (!user) {
      return next(new AppError('User not found', 404));
    }

    if (!user.favoriteEvents?.includes(eventId as any)) {
      return next(new AppError('Event not in favorites', 400));
    }

    // Remove event from favorites
    user.favoriteEvents = user.favoriteEvents.filter(
      (favEventId) => favEventId.toString() !== eventId
    );
    await user.save();

    logger.info('Event removed from favorites', {
      userId,
      eventId,
    });

    res.status(200).json({
      success: true,
      message: 'Event removed from favorites successfully',
    });
  } catch (error) {
    logger.error('Error removing event from favorites:', error);
    return next(new AppError('Failed to remove event from favorites', 500));
  }
};

// @desc    Check if event is in user's favorites
// @route   GET /api/favorites/check/:eventId
// @access  Private
export const checkIfFavorite = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { eventId } = req.params;
    // Handle both _id (MongoDB native) and id (formatted) properties
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return next(new AppError('User not authenticated', 401));
    }

    const user = await User.findById(userId);
    if (!user) {
      return next(new AppError('User not found', 404));
    }

    const isFavorite = user.favoriteEvents?.includes(eventId as any) || false;

    res.status(200).json({
      success: true,
      data: {
        isFavorite,
      },
    });
  } catch (error) {
    logger.error('Error checking favorite status:', error);
    return next(new AppError('Failed to check favorite status', 500));
  }
};