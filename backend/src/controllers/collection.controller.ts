import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import Collection from '../models/Collection';
import { Event } from '../models';
import { AppError } from '../middleware';
import { AuthRequest } from '../types';

// @desc    Get all collections
// @route   GET /api/collections
// @access  Public
export const getCollections = async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log('\n=== COLLECTIONS API DEBUG ===');
    console.log('Request query params:', req.query);

    const {
      page = 1,
      limit = 10,
      search,
      sortBy = 'sortOrder',
      sortOrder = 'asc',
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build filter query
    const filter: any = {
      isActive: true
    };

    // Text search
    if (search) {
      filter.$text = { $search: search as string };
    }

    // Build sort query
    const sort: any = {};
    if (search && !sortBy) {
      sort.score = { $meta: 'textScore' };
    } else {
      sort[sortBy as string] = sortOrder === 'asc' ? 1 : -1;
    }

    console.log('Filter being applied:', JSON.stringify(filter, null, 2));
    console.log('Sort being applied:', JSON.stringify(sort, null, 2));
    console.log('Pagination: page', pageNum, 'limit', limitNum, 'skip', skip);

    // Use aggregation to filter collections with events and get count
    const pipeline = [
      { $match: filter },
      {
        $lookup: {
          from: 'events',
          localField: 'events',
          foreignField: '_id',
          as: 'populatedEvents',
          pipeline: [
            {
              $match: {
                isDeleted: false,
                isApproved: true
              }
            },
            {
              $project: {
                title: 1,
                category: 1,
                images: 1,
                price: 1,
                viewsCount: 1
              }
            }
          ]
        }
      },
      {
        $match: {
          populatedEvents: { $ne: [], $exists: true }
        }
      },
      {
        $addFields: {
          events: '$populatedEvents'
        }
      },
      {
        $project: {
          populatedEvents: 0
        }
      }
    ];

    // Get total count with same filtering
    const countPipeline = [...pipeline, { $count: "total" }];
    const totalResult = await Collection.aggregate(countPipeline);
    const total = totalResult.length > 0 ? totalResult[0].total : 0;

    // Apply sorting, pagination
    const finalPipeline = [
      ...pipeline,
      { $sort: sort },
      { $skip: skip },
      { $limit: limitNum }
    ];

    const collections = await Collection.aggregate(finalPipeline);

    console.log(`Found ${collections.length} collections out of ${total} total`);

    res.status(200).json({
      success: true,
      message: 'Collections retrieved successfully',
      data: {
        collections,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalCollections: total,
          hasNextPage: pageNum < Math.ceil(total / limitNum),
          hasPrevPage: pageNum > 1
        }
      }
    });
  } catch (error) {
    console.error('Error fetching collections:', error);
    next(new AppError('Error fetching collections', 500));
  }
};

// @desc    Get collection by ID
// @route   GET /api/collections/:id
// @access  Public
export const getCollectionById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    console.log(`Fetching collection with ID: ${id}`);

    const collection = await Collection.findOne({ _id: id, isActive: true })
      .populate({
        path: 'events',
        match: { isDeleted: false, isApproved: true },
        populate: {
          path: 'vendorId',
          select: 'firstName lastName businessName'
        }
      });

    if (!collection) {
      return next(new AppError('Collection not found', 404));
    }

    console.log(`Found collection: ${collection.title} with ${collection.events.length} events`);

    res.status(200).json({
      success: true,
      message: 'Collection retrieved successfully',
      data: {
        collection
      }
    });
  } catch (error) {
    console.error('Error fetching collection:', error);
    next(new AppError('Error fetching collection', 500));
  }
};

// @desc    Create collection
// @route   POST /api/collections
// @access  Admin
export const createCollection = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError('Validation errors', 400, errors.array()));
    }

    const { title, description, icon, category, events, sortOrder } = req.body;

    // Verify events exist
    if (events && events.length > 0) {
      const existingEvents = await Event.find({
        _id: { $in: events },
        isDeleted: false,
        isApproved: true
      });

      if (existingEvents.length !== events.length) {
        return next(new AppError('Some events do not exist or are not approved', 400));
      }
    }

    const collection = new Collection({
      title,
      description,
      icon,
      category,
      events: events || [],
      sortOrder
    });

    await collection.save();

    console.log(`Created collection: ${collection.title} with ID: ${collection._id}`);

    res.status(201).json({
      success: true,
      message: 'Collection created successfully',
      data: {
        collection
      }
    });
  } catch (error) {
    console.error('Error creating collection:', error);
    next(new AppError('Error creating collection', 500));
  }
};

// @desc    Update collection
// @route   PUT /api/collections/:id
// @access  Admin
export const updateCollection = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError('Validation errors', 400, errors.array()));
    }

    const { id } = req.params;
    const { title, description, icon, category, events, isActive, sortOrder } = req.body;

    // Verify events exist if provided
    if (events && events.length > 0) {
      const existingEvents = await Event.find({
        _id: { $in: events },
        isDeleted: false,
        isApproved: true
      });

      if (existingEvents.length !== events.length) {
        return next(new AppError('Some events do not exist or are not approved', 400));
      }
    }

    const collection = await Collection.findByIdAndUpdate(
      id,
      {
        title,
        description,
        icon,
        category,
        events,
        isActive,
        sortOrder
      },
      { new: true, runValidators: true }
    );

    if (!collection) {
      return next(new AppError('Collection not found', 404));
    }

    console.log(`Updated collection: ${collection.title}`);

    res.status(200).json({
      success: true,
      message: 'Collection updated successfully',
      data: {
        collection
      }
    });
  } catch (error) {
    console.error('Error updating collection:', error);
    next(new AppError('Error updating collection', 500));
  }
};

// @desc    Delete collection
// @route   DELETE /api/collections/:id
// @access  Admin
export const deleteCollection = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const collection = await Collection.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );

    if (!collection) {
      return next(new AppError('Collection not found', 404));
    }

    console.log(`Deactivated collection: ${collection.title}`);

    res.status(200).json({
      success: true,
      message: 'Collection deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting collection:', error);
    next(new AppError('Error deleting collection', 500));
  }
};

// @desc    Add event to collection
// @route   POST /api/collections/:id/events
// @access  Admin
export const addEventToCollection = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { eventId } = req.body;

    // Verify event exists and is approved
    const event = await Event.findOne({
      _id: eventId,
      isDeleted: false,
      isApproved: true
    });

    if (!event) {
      return next(new AppError('Event not found or not approved', 404));
    }

    const collection = await Collection.findByIdAndUpdate(
      id,
      { $addToSet: { events: eventId } },
      { new: true }
    );

    if (!collection) {
      return next(new AppError('Collection not found', 404));
    }

    console.log(`Added event ${eventId} to collection: ${collection.title}`);

    res.status(200).json({
      success: true,
      message: 'Event added to collection successfully',
      data: {
        collection
      }
    });
  } catch (error) {
    console.error('Error adding event to collection:', error);
    next(new AppError('Error adding event to collection', 500));
  }
};

// @desc    Remove event from collection
// @route   DELETE /api/collections/:id/events/:eventId
// @access  Admin
export const removeEventFromCollection = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id, eventId } = req.params;

    const collection = await Collection.findByIdAndUpdate(
      id,
      { $pull: { events: eventId } },
      { new: true }
    );

    if (!collection) {
      return next(new AppError('Collection not found', 404));
    }

    console.log(`Removed event ${eventId} from collection: ${collection.title}`);

    res.status(200).json({
      success: true,
      message: 'Event removed from collection successfully',
      data: {
        collection
      }
    });
  } catch (error) {
    console.error('Error removing event from collection:', error);
    next(new AppError('Error removing event from collection', 500));
  }
};