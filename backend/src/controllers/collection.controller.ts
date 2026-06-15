import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import mongoose from "mongoose";
import Collection from "../models/Collection";
import { Event } from "../models/index";
import { AppError } from "../middleware/index";
import { AuthRequest } from "../types/index";
import { getFileUrl, getFileInfo } from "../middleware/upload";
import { transformEventResponse } from "../utils/event.utils";
import { collectionSyncService } from "../services/collection-sync.service";
import logger from "../config/logger";

const normalizeEventIds = (eventsInput: any): string[] => {
  if (eventsInput === undefined || eventsInput === null || eventsInput === "") {
    return [];
  }

  let parsed: any = eventsInput;
  if (typeof eventsInput === "string") {
    const raw = eventsInput.trim();
    if (!raw) return [];

    if (raw.startsWith("[") || raw.startsWith("{")) {
      try {
        parsed = JSON.parse(raw);
      } catch {
        throw new AppError("Invalid events format", 400);
      }
    } else {
      parsed = raw.split(",").map((v) => v.trim());
    }
  }

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed
    .map((item: any) => {
      if (!item) return null;
      if (typeof item === "string") return item.trim();
      if (item instanceof mongoose.Types.ObjectId) return item.toString();
      if (typeof item === "object") {
        return (item._id || item.id || "").toString().trim();
      }
      return null;
    })
    .filter((id: string | null): id is string => !!id)
    .filter((id) => mongoose.Types.ObjectId.isValid(id));
};

const normalizeSeo = (seoInput: any): any => {
  if (seoInput === undefined) return undefined;
  if (seoInput === null || seoInput === "") return {};
  if (typeof seoInput === "string") {
    try {
      return JSON.parse(seoInput);
    } catch {
      throw new AppError("Invalid SEO format", 400);
    }
  }
  return seoInput;
};

const slugifyCollectionTitle = (title: string): string =>
  title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const getLatestEventDate = (event: any): number => {
  const schedules = Array.isArray(event?.dateSchedule) ? event.dateSchedule : [];

  const dateCandidates = schedules.flatMap((schedule) => [
    schedule?.endDate,
    schedule?.startDate,
    schedule?.date,
  ]);

  const validTimestamps = dateCandidates
    .map((date) => (date ? new Date(date).getTime() : Number.NaN))
    .filter((timestamp) => !Number.isNaN(timestamp));

  if (validTimestamps.length === 0) {
    const fallback = event?.updatedAt || event?.createdAt;
    return fallback ? new Date(fallback).getTime() : 0;
  }

  return Math.max(...validTimestamps);
};

const queueOrSyncCollection = async (collectionId: string) => {
  try {
    const { collectionSyncQueue, areQueuesEnabled } = await import(
      "../config/queue"
    );

    if (areQueuesEnabled && collectionSyncQueue) {
      await collectionSyncQueue.add(
        "syncCollection",
        {
          type: "syncCollection",
          collectionId,
        },
        {
          jobId: `sync-collection-${collectionId}`,
          removeOnComplete: true,
        },
      );
      return;
    }
  } catch (error) {
    logger.error(
      "Error queueing collection sync, falling back to direct sync:",
      error instanceof Error ? error.message : String(error),
    );
  }

  await collectionSyncService.syncCollection(collectionId);
};

// @desc    Get all collections
// @route   GET /api/collections
// @access  Public
export const getCollections = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      sortBy = "sortOrder",
      sortOrder = "asc",
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build filter query
    const filter: any = {
      isActive: true,
    };

    // Text search
    if (search) {
      filter.$text = { $search: search as string };
    }

    // Build sort query
    const sort: any = {};
    if (search && !sortBy) {
      sort.score = { $meta: "textScore" };
    } else {
      sort[sortBy as string] = sortOrder === "asc" ? 1 : -1;
    }

    // Use aggregation with events ObjectId refs as source of truth (same as detail page)
    const pipeline = [
      { $match: filter },
      // Populate iconAsset (MediaAsset)
      {
        $lookup: {
          from: "mediaassets",
          localField: "iconAsset",
          foreignField: "_id",
          as: "iconAssetPopulated",
        },
      },
      {
        $addFields: {
          iconAsset: { $arrayElemAt: ["$iconAssetPopulated", 0] },
        },
      },
      // Populate featuredImageAsset (MediaAsset)
      {
        $lookup: {
          from: "mediaassets",
          localField: "featuredImageAsset",
          foreignField: "_id",
          as: "featuredImageAssetPopulated",
        },
      },
      {
        $addFields: {
          featuredImageAsset: {
            $arrayElemAt: ["$featuredImageAssetPopulated", 0],
          },
        },
      },
      // Populate events from ObjectId refs (authoritative relation)
      {
        $lookup: {
          from: "events",
          localField: "events",
          foreignField: "_id",
          as: "populatedEvents",
          pipeline: [
            {
              $match: {
                isDeleted: false,
                isApproved: true,
                isActive: true,
              },
            },
            {
              $project: {
                title: 1,
                category: 1,
                images: 1,
                price: 1,
                viewsCount: 1,
              },
            },
          ],
        },
      },
      {
        $addFields: {
          events: "$populatedEvents",
        },
      },
      // Calculate event count
      {
        $addFields: {
          eventsCount: {
            $cond: {
              if: { $isArray: "$events" },
              then: { $size: "$events" },
              else: 0,
            },
          },
        },
      },
      // Filter collections with at least one event
      {
        $match: {
          eventsCount: { $gt: 0 },
        },
      },
      // Cleanup
      {
        $project: {
          populatedEvents: 0,
          iconAssetPopulated: 0,
          featuredImageAssetPopulated: 0,
          eventsData: 0, // Hide internal embedded cache field from response
        },
      },
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
      { $limit: limitNum },
    ];

    const collections = await Collection.aggregate(finalPipeline);

    logger.info(
      `Found ${collections.length} collections out of ${total} total`,
    );

    // Set HTTP cache headers for browser/CDN caching (5 min max-age, 10 min stale-while-revalidate)
    res.setHeader(
      "Cache-Control",
      "public, max-age=300, stale-while-revalidate=600",
    );
    res.status(200).json({
      success: true,
      message: "Collections retrieved successfully",
      data: {
        collections,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalCollections: total,
          hasNextPage: pageNum < Math.ceil(total / limitNum),
          hasPrevPage: pageNum > 1,
        },
      },
    });
  } catch (error) {
    logger.error("Error fetching collections:", error);
    next(new AppError("Error fetching collections", 500));
  }
};

// @desc    Get collection by ID
// @route   GET /api/collections/:id
// @access  Public
export const getCollectionById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const identifier = (id || "").trim();
    const isObjectId = mongoose.Types.ObjectId.isValid(identifier);

    logger.info(`Fetching collection with identifier: ${identifier}`);

    const query = isObjectId
      ? { _id: identifier, isActive: true }
      : { slug: identifier.toLowerCase(), isActive: true };

    const collection = await Collection.findOne(query)
      .populate("iconAsset")
      .populate("featuredImageAsset")
      .lean();

    if (!collection) {
      return next(new AppError("Collection not found", 404));
    }

    // Use events ObjectId refs as the source of truth for detail page.
    // This ensures admin add/remove changes reflect immediately even if eventsData sync lags.
    const populated = await Collection.findById((collection as any)._id).populate({
      path: "events",
      match: {
        isDeleted: false,
        isApproved: true,
        isActive: true,
      },
      populate: [
        {
          path: "vendorId",
          select: "firstName lastName businessName",
        },
        {
          path: "imageAssets",
          select: "url thumbnailUrl variations",
        },
      ],
    });

    collection.events = populated?.events || [];
    delete (collection as any).eventsData; // Hide internal embedded cache field from response

    // Transform events to include image URLs from imageAssets
    if (collection?.events && Array.isArray(collection.events)) {
      collection.events = collection.events.map((event) =>
        transformEventResponse(event),
      );
      collection.events.sort(
        (a: any, b: any) => (b.viewsCount || 0) - (a.viewsCount || 0),
      );
    }

    (collection as any).eventsCount = Array.isArray(collection.events)
      ? collection.events.length
      : 0;

    logger.info(
      `Found collection: ${collection.title} with ${collection.events.length} events`,
    );

    // Set HTTP cache headers for browser/CDN caching
    res.setHeader(
      "Cache-Control",
      "public, max-age=300, stale-while-revalidate=600",
    );
    res.status(200).json({
      success: true,
      message: "Collection retrieved successfully",
      data: {
        collection,
      },
    });
  } catch (error) {
    logger.error("Error fetching collection:", error);
    next(new AppError("Error fetching collection", 500));
  }
};

// @desc    Create collection
// @route   POST /api/collections
// @access  Admin
export const createCollection = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError("Validation errors", 400, errors.array()));
    }

    const { title, description, icon, iconAsset, featuredImageAsset, seo, slug, isActive, category, events, sortOrder } = req.body;

    // Verify events exist
      const normalizedEventIds = normalizeEventIds(events);

      // Verify events exist if provided
      if (normalizedEventIds.length > 0) {
      const existingEvents = await Event.find({
            _id: { $in: normalizedEventIds },
        isDeleted: false,
        isApproved: true,
      });

        if (existingEvents.length !== normalizedEventIds.length) {
        return next(
          new AppError("Some events do not exist or are not approved", 400),
        );
      }
    }

    const collection = new Collection({
      title,
      description,
      icon,
      iconAsset,
      featuredImageAsset,
      seo: seo || {},
      slug,
      isActive: isActive !== undefined ? isActive : true,
      category,
      events: normalizedEventIds,
      sortOrder,
    });

    await collection.save();

    logger.info(
      `Created collection: ${collection.title} with ID: ${collection._id}`,
    );

    res.status(201).json({
      success: true,
      message: "Collection created successfully",
      data: {
        collection,
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }
    logger.error(
      "Error creating collection:",
      error instanceof Error ? error.message : String(error),
    );
    next(new AppError("Error creating collection", 500));
  }
};

// @desc    Update collection
// @route   PUT /api/collections/:id
// @access  Admin
export const updateCollection = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError("Validation errors", 400, errors.array()));
    }

    const { id } = req.params;
    const { title, description, icon, iconAsset, featuredImageAsset, seo, slug, category, events, isActive, sortOrder } =
      req.body;

    const normalizedEventIds = normalizeEventIds(events);

    // Verify events exist if provided
    if (events !== undefined && normalizedEventIds.length > 0) {
      const existingEvents = await Event.find({
        _id: { $in: normalizedEventIds },
        isDeleted: false,
        isApproved: true,
      });

      if (existingEvents.length !== normalizedEventIds.length) {
        return next(
          new AppError("Some events do not exist or are not approved", 400),
        );
      }
    }

    const collection = await Collection.findById(id);

    if (!collection) {
      return next(new AppError("Collection not found", 404));
    }

    if (title !== undefined) collection.title = title;
    if (description !== undefined) collection.description = description;
    if (icon !== undefined) collection.icon = icon;
    if (iconAsset !== undefined) collection.iconAsset = iconAsset;
    if (featuredImageAsset !== undefined) collection.featuredImageAsset = featuredImageAsset;
    if (seo !== undefined) collection.seo = seo;
    if (category !== undefined) collection.category = category;
    if (isActive !== undefined) collection.isActive = isActive;
    if (sortOrder !== undefined) collection.sortOrder = sortOrder;

    if (title !== undefined) {
      const generatedSlug = slugifyCollectionTitle(title);
      if (
        slug === undefined ||
        slug === null ||
        slug === "" ||
        slug === collection.slug
      ) {
        collection.slug = generatedSlug;
      } else {
        collection.slug = slug;
      }
    } else if (slug !== undefined) {
      collection.slug = slug;
    }

    if (events !== undefined) {
      collection.events = normalizedEventIds.map(id => new mongoose.Types.ObjectId(id));
      collection.eventsData = [];
    }

    await collection.save();

    // Trigger sync if events changed
    if (events !== undefined && collection.events) {
      try {
        const { collectionSyncQueue, areQueuesEnabled } =
          await import("../config/queue");

        if (areQueuesEnabled && collectionSyncQueue) {
          await collectionSyncQueue.add(
            "syncCollection",
            {
              type: "syncCollection",
              collectionId: collection._id.toString(),
            },
            {
              jobId: `sync-collection-${collection._id}`,
              removeOnComplete: true,
            },
          );

          logger.info(
            `Queued sync for collection ${collection._id} after update`,
          );
        }
      } catch (error) {
        logger.error("Error queueing collection sync:", error);
        // Don't fail the request if sync queueing fails
      }
    }

    logger.info(`Updated collection: ${collection.title}`);

    res.status(200).json({
      success: true,
      message: "Collection updated successfully",
      data: {
        collection,
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }
    logger.error(
      "Error updating collection:",
      error instanceof Error ? error.message : String(error),
    );
    next(new AppError("Error updating collection", 500));
  }
};

// @desc    Delete collection
// @route   DELETE /api/collections/:id
// @access  Admin
export const deleteCollection = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const { permanent } = req.query;

    let collection;

    if (permanent === 'true') {
      collection = await Collection.findByIdAndDelete(id);
      if (!collection) {
        return next(new AppError("Collection not found", 404));
      }
      logger.info(`Permanently deleted collection: ${collection.title}`);
    } else {
      collection = await Collection.findByIdAndUpdate(
        id,
        { isActive: false },
        { new: true },
      );
      if (!collection) {
        return next(new AppError("Collection not found", 404));
      }
      logger.info(`Deactivated collection: ${collection.title}`);
    }

    res.status(200).json({
      success: true,
      message: permanent === 'true' ? "Collection permanently deleted" : "Collection deleted successfully",
    });
  } catch (error) {
    logger.error("Error deleting collection:", error);
    next(new AppError("Error deleting collection", 500));
  }
};

// @desc    Add event to collection
// @route   POST /api/collections/:id/events
// @access  Admin
export const addEventToCollection = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const { eventId } = req.body;

    // Verify event exists and is approved
    const event = await Event.findOne({
      _id: eventId,
      isDeleted: false,
      isApproved: true,
    });

    if (!event) {
      return next(new AppError("Event not found or not approved", 404));
    }

    const collection = await Collection.findByIdAndUpdate(
      id,
      { $addToSet: { events: eventId } },
      { new: true },
    );

    if (!collection) {
      return next(new AppError("Collection not found", 404));
    }

    await queueOrSyncCollection(collection._id.toString());

    logger.info(`Added event ${eventId} to collection: ${collection.title}`);

    res.status(200).json({
      success: true,
      message: "Event added to collection successfully",
      data: {
        collection,
      },
    });
  } catch (error) {
    logger.error("Error adding event to collection:", error);
    next(new AppError("Error adding event to collection", 500));
  }
};

// @desc    Remove event from collection
// @route   DELETE /api/collections/:id/events/:eventId
// @access  Admin
export const removeEventFromCollection = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id, eventId } = req.params;

    const collection = await Collection.findByIdAndUpdate(
      id,
      { $pull: { events: eventId } },
      { new: true },
    );

    if (!collection) {
      return next(new AppError("Collection not found", 404));
    }

    await queueOrSyncCollection(collection._id.toString());

    logger.info(
      `Removed event ${eventId} from collection: ${collection.title}`,
    );

    res.status(200).json({
      success: true,
      message: "Event removed from collection successfully",
      data: {
        collection,
      },
    });
  } catch (error) {
    logger.error("Error removing event from collection:", error);
    next(new AppError("Error removing event from collection", 500));
  }
};

// ============= ADMIN-SPECIFIC ENDPOINTS =============

// @desc    Get all collections (Admin - shows inactive too)
// @route   GET /api/admin/collections
// @access  Admin
export const getAdminCollections = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      category,
      isActive,
      sortBy = "sortOrder",
      sortOrder = "asc",
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build filter query (admin can see all collections)
    const filter: any = {};

    // Text search
    if (search) {
      filter.$or = [
        { title: { $regex: search as string, $options: "i" } },
        { description: { $regex: search as string, $options: "i" } },
      ];
    }

    // Filter by category
    if (category) {
      filter.category = category;
    }

    // Filter by active status
    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    // Build sort query
    const sort: any = {};
    sort[sortBy as string] = sortOrder === "asc" ? 1 : -1;

    // Get collections with event count
    const [collections, totalCollections] = await Promise.all([
      Collection.find(filter)
        .populate({
          path: "events",
          select:
            "title category images type price currency vendorId isApproved",
          match: { isDeleted: false, isApproved: true, isActive: true },
          populate: {
            path: "vendorId",
            select: "firstName lastName businessName",
          },
        })
        .populate("iconAsset")
        .populate("featuredImageAsset")
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Collection.countDocuments(filter),
    ]);

    // Add event count to each collection
    const collectionsWithCount = collections.map((collection) => ({
      ...collection,
      eventsCount: collection.events?.length || 0,
    }));

    res.status(200).json({
      success: true,
      message: "Collections retrieved successfully",
      data: {
        collections: collectionsWithCount,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalCollections / limitNum),
          totalCollections,
          hasNextPage: pageNum < Math.ceil(totalCollections / limitNum),
          hasPrevPage: pageNum > 1,
        },
      },
    });
  } catch (error) {
    logger.error("Error fetching admin collections:", error);
    next(new AppError("Error fetching collections", 500));
  }
};

// @desc    Get collection stats
// @route   GET /api/admin/collections/stats
// @access  Admin
export const getCollectionStats = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const [
      totalCollections,
      activeCollections,
      inactiveCollections,
      categoriesCount,
    ] = await Promise.all([
      Collection.countDocuments(),
      Collection.countDocuments({ isActive: true }),
      Collection.countDocuments({ isActive: false }),
      Collection.distinct("category").then(
        (cats) => cats.filter(Boolean).length,
      ),
    ]);

    // Get collections with most events
    const topCollections = await Collection.find({ isActive: true })
      .populate({
        path: "events",
        match: { isDeleted: false, isApproved: true, isActive: true },
      })
      .sort({ sortOrder: 1 })
      .limit(5)
      .lean();

    const topCollectionsWithCount = topCollections.map((col) => ({
      _id: col._id,
      title: col.title,
      eventsCount: col.events?.length || 0,
    }));

    res.status(200).json({
      success: true,
      data: {
        totalCollections,
        activeCollections,
        inactiveCollections,
        categoriesCount,
        topCollections: topCollectionsWithCount,
      },
    });
  } catch (error) {
    logger.error("Error fetching collection stats:", error);
    next(new AppError("Error fetching collection stats", 500));
  }
};

// @desc    Bulk update collections
// @route   PATCH /api/admin/collections/bulk
// @access  Admin
export const bulkUpdateCollections = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { collectionIds, updateData } = req.body;

    if (
      !collectionIds ||
      !Array.isArray(collectionIds) ||
      collectionIds.length === 0
    ) {
      return next(new AppError("Collection IDs array is required", 400));
    }

    if (!updateData || Object.keys(updateData).length === 0) {
      return next(new AppError("Update data is required", 400));
    }

    // Only allow specific fields to be bulk updated
    const allowedFields = ["isActive", "category", "sortOrder"];
    const filteredUpdateData: any = {};

    allowedFields.forEach((field) => {
      if (updateData[field] !== undefined) {
        filteredUpdateData[field] = updateData[field];
      }
    });

    if (Object.keys(filteredUpdateData).length === 0) {
      return next(new AppError("No valid fields to update", 400));
    }

    const result = await Collection.updateMany(
      { _id: { $in: collectionIds } },
      { $set: filteredUpdateData },
    );

    res.status(200).json({
      success: true,
      message: `${result.modifiedCount} collections updated successfully`,
      data: {
        modifiedCount: result.modifiedCount,
        matchedCount: result.matchedCount,
      },
    });
  } catch (error) {
    logger.error("Error bulk updating collections:", error);
    next(new AppError("Error bulk updating collections", 500));
  }
};

// @desc    Create collection with file uploads
// @route   POST /api/admin/collections
// @access  Admin
export const createCollectionWithFiles = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError("Validation errors", 400, errors.array()));
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
      seo,
    } = req.body;

    // Verify icon MediaAsset exists
    if (iconAsset) {
      const MediaAsset = (await import("../models/MediaAsset")).default;
      const asset = await MediaAsset.findById(iconAsset);
      if (!asset) {
        return next(new AppError("Icon asset not found", 404));
      }
    }

    // Verify featured image MediaAsset exists
    if (featuredImageAsset) {
      const MediaAsset = (await import("../models/MediaAsset")).default;
      const asset = await MediaAsset.findById(featuredImageAsset);
      if (!asset) {
        return next(new AppError("Featured image asset not found", 404));
      }
    }

    const normalizedEventIds = normalizeEventIds(events);

    // Verify events exist
    if (normalizedEventIds.length > 0) {
      const existingEvents = await Event.find({
        _id: { $in: normalizedEventIds },
        isDeleted: false,
      });

      if (existingEvents.length !== normalizedEventIds.length) {
        return next(new AppError("Some events do not exist", 400));
      }
    }

    // Parse SEO if it's a string
    const parsedSeo = normalizeSeo(seo);

    const collection = new Collection({
      title,
      description,
      iconAsset,
      featuredImageAsset,
      count,
      category,
      events: normalizedEventIds,
      sortOrder: sortOrder || 0,
      isActive: isActive !== undefined ? isActive : true,
      slug,
      seo: parsedSeo || {},
    });

    await collection.save();

    logger.info(
      `Created collection: ${collection.title} with ID: ${collection._id}`,
    );

    res.status(201).json({
      success: true,
      message: "Collection created successfully",
      data: {
        collection,
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }
    logger.error(
      "Error creating collection:",
      error instanceof Error ? error.message : String(error),
    );
    next(new AppError("Error creating collection", 500));
  }
};

// @desc    Update collection with file uploads
// @route   PUT /api/admin/collections/:id
// @access  Admin
export const updateCollectionWithFiles = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError("Validation errors", 400, errors.array()));
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
      seo,
    } = req.body;

    const existingCollection = await Collection.findById(id).select("slug");
    if (!existingCollection) {
      return next(new AppError("Collection not found", 404));
    }

    // Build update object
    const updateData: any = {};

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (count !== undefined) updateData.count = count;
    if (category !== undefined) updateData.category = category;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;
    if (title !== undefined) {
      const generatedSlug = slugifyCollectionTitle(title);
      // If slug is not explicitly changed by user, keep it in sync with title.
      if (
        slug === undefined ||
        slug === null ||
        slug === "" ||
        slug === existingCollection.slug
      ) {
        updateData.slug = generatedSlug;
      } else {
        updateData.slug = slug;
      }
    } else if (slug !== undefined) {
      updateData.slug = slug;
    }

    // Handle iconAsset
    if (iconAsset !== undefined) {
      if (iconAsset) {
        const MediaAsset = (await import("../models/MediaAsset")).default;
        const asset = await MediaAsset.findById(iconAsset);
        if (!asset) {
          return next(new AppError("Icon asset not found", 404));
        }
        updateData.iconAsset = iconAsset;
      } else {
        updateData.iconAsset = null; // Allow clearing
      }
    }

    // Handle featuredImageAsset
    if (featuredImageAsset !== undefined) {
      if (featuredImageAsset) {
        const MediaAsset = (await import("../models/MediaAsset")).default;
        const asset = await MediaAsset.findById(featuredImageAsset);
        if (!asset) {
          return next(new AppError("Featured image asset not found", 404));
        }
        updateData.featuredImageAsset = featuredImageAsset;
      } else {
        updateData.featuredImageAsset = null;
      }
    }

    // Handle SEO
    if (seo !== undefined) {
      updateData.seo = normalizeSeo(seo);
    }

    // Verify events exist if provided
    if (events !== undefined) {
      const eventIds = normalizeEventIds(events);
      if (eventIds.length > 0) {
        const existingEvents = await Event.find({
          _id: { $in: eventIds },
          isDeleted: false,
        });

        if (existingEvents.length !== eventIds.length) {
          return next(new AppError("Some events do not exist", 400));
        }
      }
      updateData.events = eventIds;
      updateData.eventsData = [];
    }

    const collection = await Collection.findById(id);

    if (!collection) {
      return next(new AppError("Collection not found", 404));
    }

    Object.assign(collection, updateData);
    await collection.save();

    if (events !== undefined) {
      try {
        await queueOrSyncCollection(collection._id.toString());
      } catch (syncError) {
        logger.error(
          "Collection sync failed after update (non-blocking):",
          syncError instanceof Error ? syncError.message : String(syncError),
        );
      }
    }

    logger.info(`Updated collection: ${collection.title}`);

    res.status(200).json({
      success: true,
      message: "Collection updated successfully",
      data: {
        collection,
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }
    logger.error(
      "Error updating collection:",
      error instanceof Error ? error.message : String(error),
    );
    next(new AppError("Error updating collection", 500));
  }
};
