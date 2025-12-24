import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import mongoose from 'mongoose';
import Collection from '../models/Collection';
import { Event } from '../models/index';
import { AppError } from '../middleware/index';
import { AuthRequest } from '../types/index';
import { getFileUrl, getFileInfo } from '../middleware/upload';
import { transformEventResponse } from '../utils/event.utils';

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
      // Populate iconAsset (MediaAsset)
      {
        $lookup: {
          from: 'mediaassets',
          localField: 'iconAsset',
          foreignField: '_id',
          as: 'iconAssetPopulated'
        }
      },
      {
        $addFields: {
          iconAsset: { $arrayElemAt: ['$iconAssetPopulated', 0] }
        }
      },
      // Populate featuredImageAsset (MediaAsset)
      {
        $lookup: {
          from: 'mediaassets',
          localField: 'featuredImageAsset',
          foreignField: '_id',
          as: 'featuredImageAssetPopulated'
        }
      },
      {
        $addFields: {
          featuredImageAsset: { $arrayElemAt: ['$featuredImageAssetPopulated', 0] }
        }
      },
      // Prefer eventsData (embedded), fallback to events (ObjectId refs)
      {
        $addFields: {
          events: {
            $cond: {
              if: { $gt: [{ $size: { $ifNull: ['$eventsData', []] } }, 0] },
              then: '$eventsData', // Use embedded data if available
              else: '$events'      // Fallback to ObjectId refs
            }
          }
        }
      },
      // If using ObjectId refs, populate them (backward compat)
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
      // Use populated events only if events were ObjectIds
      {
        $addFields: {
          events: {
            $cond: {
              if: { $eq: [{ $type: { $arrayElemAt: ['$events', 0] } }, 'objectId'] },
              then: '$populatedEvents',
              else: '$events'
            }
          }
        }
      },
      // Filter collections with at least one event
      {
        $match: {
          events: { $ne: [], $exists: true }
        }
      },
      // Cleanup
      {
        $project: {
          populatedEvents: 0,
          iconAssetPopulated: 0,
          featuredImageAssetPopulated: 0,
          eventsData: 0 // Hide internal field from response
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

    // Set HTTP cache headers for browser/CDN caching (5 min max-age, 10 min stale-while-revalidate)
    res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
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
      .populate('iconAsset')
      .populate('featuredImageAsset')
      .lean();

    if (!collection) {
      return next(new AppError('Collection not found', 404));
    }

    // Use eventsData if available (embedded), else populate events (backward compat)
    if (collection.eventsData && collection.eventsData.length > 0) {
      // Use embedded data, populate vendorId
      const Vendor = mongoose.model('Vendor');
      const vendors = await Vendor.find({
        _id: { $in: collection.eventsData.map((e: any) => e.vendorId) }
      }).select('firstName lastName businessName').lean();

      const vendorMap = new Map(vendors.map((v: any) => [v._id.toString(), v]));

      collection.events = collection.eventsData.map((event: any) => ({
        ...event,
        vendorId: vendorMap.get(event.vendorId.toString()) || event.vendorId
      }));

      delete collection.eventsData; // Remove internal field
    } else {
      // Fallback: populate ObjectId refs (backward compat)
      const populated = await Collection.findById(id)
        .populate({
          path: 'events',
          populate: [
            {
              path: 'vendorId',
              select: 'firstName lastName businessName'
            },
            {
              path: 'imageAssets',
              select: 'url thumbnailUrl variations'
            }
          ]
        });

      if (populated) {
        collection.events = populated.events;
      }
    }

    // Transform events to include image URLs from imageAssets
    if (collection?.events && Array.isArray(collection.events)) {
      collection.events = collection.events.map(event =>
        transformEventResponse(event)
      );
    }

    console.log(`Found collection: ${collection.title} with ${collection.events.length} events`);

    // Set HTTP cache headers for browser/CDN caching
    res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
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

    // Trigger sync if events changed
    if (events !== undefined && collection.events) {
      try {
        const { collectionSyncQueue, areQueuesEnabled } = await import('../config/queue');

        if (areQueuesEnabled && collectionSyncQueue) {
          await collectionSyncQueue.add(
            'syncCollection',
            {
              type: 'syncCollection',
              collectionId: collection._id.toString()
            },
            {
              jobId: `sync-collection-${collection._id}`,
              removeOnComplete: true
            }
          );

          console.log(`Queued sync for collection ${collection._id} after update`);
        }
      } catch (error) {
        console.error('Error queueing collection sync:', error);
        // Don't fail the request if sync queueing fails
      }
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

// ============= ADMIN-SPECIFIC ENDPOINTS =============

// @desc    Get all collections (Admin - shows inactive too)
// @route   GET /api/admin/collections
// @access  Admin
export const getAdminCollections = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      category,
      isActive,
      sortBy = 'sortOrder',
      sortOrder = 'asc',
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build filter query (admin can see all collections)
    const filter: any = {};

    // Text search
    if (search) {
      filter.$or = [
        { title: { $regex: search as string, $options: 'i' } },
        { description: { $regex: search as string, $options: 'i' } },
      ];
    }

    // Filter by category
    if (category) {
      filter.category = category;
    }

    // Filter by active status
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    // Build sort query
    const sort: any = {};
    sort[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

    // Get collections with event count
    const [collections, totalCollections] = await Promise.all([
      Collection.find(filter)
        .populate({
          path: 'events',
          select: 'title category images type price currency vendorId isApproved',
          match: { isDeleted: false },
          populate: {
            path: 'vendorId',
            select: 'firstName lastName businessName'
          }
        })
        .populate('iconAsset')
        .populate('featuredImageAsset')
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Collection.countDocuments(filter)
    ]);

    // Add event count to each collection
    const collectionsWithCount = collections.map(collection => ({
      ...collection,
      eventsCount: collection.events?.length || 0
    }));

    res.status(200).json({
      success: true,
      message: 'Collections retrieved successfully',
      data: {
        collections: collectionsWithCount,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalCollections / limitNum),
          totalCollections,
          hasNextPage: pageNum < Math.ceil(totalCollections / limitNum),
          hasPrevPage: pageNum > 1
        }
      }
    });
  } catch (error) {
    console.error('Error fetching admin collections:', error);
    next(new AppError('Error fetching collections', 500));
  }
};

// @desc    Get collection stats
// @route   GET /api/admin/collections/stats
// @access  Admin
export const getCollectionStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [totalCollections, activeCollections, inactiveCollections, categoriesCount] = await Promise.all([
      Collection.countDocuments(),
      Collection.countDocuments({ isActive: true }),
      Collection.countDocuments({ isActive: false }),
      Collection.distinct('category').then(cats => cats.filter(Boolean).length)
    ]);

    // Get collections with most events
    const topCollections = await Collection.find({ isActive: true })
      .populate({
        path: 'events',
        match: { isDeleted: false, isApproved: true }
      })
      .sort({ sortOrder: 1 })
      .limit(5)
      .lean();

    const topCollectionsWithCount = topCollections.map(col => ({
      _id: col._id,
      title: col.title,
      eventsCount: col.events?.length || 0
    }));

    res.status(200).json({
      success: true,
      data: {
        totalCollections,
        activeCollections,
        inactiveCollections,
        categoriesCount,
        topCollections: topCollectionsWithCount
      }
    });
  } catch (error) {
    console.error('Error fetching collection stats:', error);
    next(new AppError('Error fetching collection stats', 500));
  }
};

// @desc    Bulk update collections
// @route   PATCH /api/admin/collections/bulk
// @access  Admin
export const bulkUpdateCollections = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { collectionIds, updateData } = req.body;

    if (!collectionIds || !Array.isArray(collectionIds) || collectionIds.length === 0) {
      return next(new AppError('Collection IDs array is required', 400));
    }

    if (!updateData || Object.keys(updateData).length === 0) {
      return next(new AppError('Update data is required', 400));
    }

    // Only allow specific fields to be bulk updated
    const allowedFields = ['isActive', 'category', 'sortOrder'];
    const filteredUpdateData: any = {};

    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        filteredUpdateData[field] = updateData[field];
      }
    });

    if (Object.keys(filteredUpdateData).length === 0) {
      return next(new AppError('No valid fields to update', 400));
    }

    const result = await Collection.updateMany(
      { _id: { $in: collectionIds } },
      { $set: filteredUpdateData }
    );

    res.status(200).json({
      success: true,
      message: `${result.modifiedCount} collections updated successfully`,
      data: {
        modifiedCount: result.modifiedCount,
        matchedCount: result.matchedCount
      }
    });
  } catch (error) {
    console.error('Error bulk updating collections:', error);
    next(new AppError('Error bulk updating collections', 500));
  }
};

// @desc    Create collection with file uploads
// @route   POST /api/admin/collections
// @access  Admin
export const createCollectionWithFiles = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError('Validation errors', 400, errors.array()));
    }

    const {
      title,
      description,
      iconAsset,
      featuredImageAsset,
      count,
      category,
      events,
      sortOrder,
      isActive,
      slug,
      seo
    } = req.body;

    // Verify icon MediaAsset exists
    if (iconAsset) {
      const MediaAsset = (await import('../models/MediaAsset')).default;
      const asset = await MediaAsset.findById(iconAsset);
      if (!asset) {
        return next(new AppError('Icon asset not found', 404));
      }
    }

    // Verify featured image MediaAsset exists
    if (featuredImageAsset) {
      const MediaAsset = (await import('../models/MediaAsset')).default;
      const asset = await MediaAsset.findById(featuredImageAsset);
      if (!asset) {
        return next(new AppError('Featured image asset not found', 404));
      }
    }

    // Verify events exist
    if (events && events.length > 0) {
      const eventIds = typeof events === 'string' ? JSON.parse(events) : events;
      const existingEvents = await Event.find({
        _id: { $in: eventIds },
        isDeleted: false
      });

      if (existingEvents.length !== eventIds.length) {
        return next(new AppError('Some events do not exist', 400));
      }
    }

    // Parse SEO if it's a string
    const parsedSeo = typeof seo === 'string' ? JSON.parse(seo) : seo;

    const collection = new Collection({
      title,
      description,
      iconAsset,
      featuredImageAsset,
      count,
      category,
      events: typeof events === 'string' ? JSON.parse(events) : (events || []),
      sortOrder: sortOrder || 0,
      isActive: isActive !== undefined ? isActive : true,
      slug,
      seo: parsedSeo || {}
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

// @desc    Update collection with file uploads
// @route   PUT /api/admin/collections/:id
// @access  Admin
export const updateCollectionWithFiles = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError('Validation errors', 400, errors.array()));
    }

    const { id } = req.params;
    const {
      title,
      description,
      iconAsset,
      featuredImageAsset,
      count,
      category,
      events,
      isActive,
      sortOrder,
      slug,
      seo
    } = req.body;

    // Build update object
    const updateData: any = {};

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (count !== undefined) updateData.count = count;
    if (category !== undefined) updateData.category = category;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;
    if (slug !== undefined) updateData.slug = slug;

    // Handle iconAsset
    if (iconAsset !== undefined) {
      if (iconAsset) {
        const MediaAsset = (await import('../models/MediaAsset')).default;
        const asset = await MediaAsset.findById(iconAsset);
        if (!asset) {
          return next(new AppError('Icon asset not found', 404));
        }
        updateData.iconAsset = iconAsset;
      } else {
        updateData.iconAsset = null; // Allow clearing
      }
    }

    // Handle featuredImageAsset
    if (featuredImageAsset !== undefined) {
      if (featuredImageAsset) {
        const MediaAsset = (await import('../models/MediaAsset')).default;
        const asset = await MediaAsset.findById(featuredImageAsset);
        if (!asset) {
          return next(new AppError('Featured image asset not found', 404));
        }
        updateData.featuredImageAsset = featuredImageAsset;
      } else {
        updateData.featuredImageAsset = null;
      }
    }

    // Handle SEO
    if (seo !== undefined) {
      updateData.seo = typeof seo === 'string' ? JSON.parse(seo) : seo;
    }

    // Verify events exist if provided
    if (events !== undefined) {
      const eventIds = typeof events === 'string' ? JSON.parse(events) : events;
      if (eventIds && eventIds.length > 0) {
        const existingEvents = await Event.find({
          _id: { $in: eventIds },
          isDeleted: false
        });

        if (existingEvents.length !== eventIds.length) {
          return next(new AppError('Some events do not exist', 400));
        }
      }
      updateData.events = eventIds;
    }

    const collection = await Collection.findByIdAndUpdate(
      id,
      updateData,
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