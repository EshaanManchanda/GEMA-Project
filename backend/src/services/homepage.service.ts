import {
  Event,
  Banner,
  Category,
  Blog,
  IEvent,
  IBanner,
  ICategory,
  IBlog,
} from "../models/index";
// Venue removed - using Event with type='Venue'
import Reel, { IReel } from "../models/Reel";
import SEOContent, { ISEOContent } from "../models/SEOContent";
import Collection, { ICollection } from "../models/Collection";
import cacheService from "./cache.service";
import statsService, { PublicStats } from "./stats.service";
import { transformEventsResponse } from "../utils/event.utils";
import { transformBlogResponse } from "../utils/blog.utils";
import logger from "../config/logger";

export interface HomepageVenue {
  _id: string;
  title: string;
  slug: string;
  description?: string;
  location: {
    address: string;
    city: string;
    state: string;
    country: string;
    coordinates?: { lat: number; lng: number };
  };
  venueType: string;
  capacity?: number;
  facilities?: string[];
  amenities?: string[];
  images?: string[];
  averageRating?: number;
  totalEvents?: number; // Might need adjustment if not available in Event
  isAffiliateEvent: boolean;
  externalBookingLink?: string;
}

export interface HomepageData {
  events: IEvent[];
  bestPriceEvents: IEvent[];
  featuredEvents: IEvent[];
  trendingEvents: IEvent[];
  banners: IBanner[];
  categories: ICategory[];
  featuredBlogs: IBlog[];
  reels: IReel[];
  stats: PublicStats;
  seoContent: ISEOContent | null;
  collections: ICollection[];
  educationalEvents: IEvent[];
  venues: HomepageVenue[];
}

class HomepageService {
  /**
   * Get all homepage data in single aggregated response
   * Uses Redis caching with 5-minute TTL
   * Parallel queries for optimal performance
   */
  async getHomepageData(): Promise<HomepageData> {
    const cacheKey = "public:homepage";

    // Check cache first (5 min TTL)
    const cached = await cacheService.get<HomepageData>(cacheKey);
    if (cached) {
      if (process.env.DEBUG_LOGS === "true") {
        logger.info("📦 [HOMEPAGE] Returning cached data");
      }
      return cached;
    }

    if (process.env.DEBUG_LOGS === "true") {
      logger.info("🔄 [HOMEPAGE] Cache miss - fetching from database");
    }

    // Parallel queries for all homepage data
    const [
      events,
      bestPriceEvents,
      featuredEvents,
      trendingEvents,
      banners,
      categories,
      rawFeaturedBlogs,
      reels,
      stats,
      seoContent,
      collections,
      teachingEvents,
      venues,
    ] = await Promise.all([
      // Regular events (limit 12, published only)
      Event.find({
        isDeleted: false,
        isApproved: true,
        status: "published",
      })
        .select(
          "title slug description images imageAssets price location dateSchedule category rating reviewCount viewsCount isFeatured vendorId ageGroup",
        )
        .populate("category", "name slug")
        .populate("vendorId", "businessName")
        .populate(
          "imageAssets",
          "url filename width height thumbnailUrl variations",
        )
        .sort({ createdAt: -1 })
        .limit(12)
        .lean(),

      // Best price events (limit 12, published only; excludes null/undefined prices)
      Event.find({
        isDeleted: false,
        isApproved: true,
        status: "published",
        price: { $type: "number" }, // exclude docs where price is null/undefined
      })
        .select(
          "title slug description images imageAssets price location dateSchedule category rating reviewCount viewsCount isFeatured vendorId ageGroup",
        )
        .populate("category", "name slug")
        .populate("vendorId", "businessName")
        .populate(
          "imageAssets",
          "url filename width height thumbnailUrl variations",
        )
        .sort({ price: 1, createdAt: -1 }) // free (0) first, then cheapest
        .limit(12)
        .lean(),

      // Featured events (limit 6)
      Event.find({
        isDeleted: false,
        isApproved: true,
        status: "published",
        isFeatured: true,
      })
        .select(
          "title slug description images imageAssets price location dateSchedule category rating reviewCount viewsCount isFeatured vendorId ageGroup",
        )
        .populate("category", "name slug")
        .populate("vendorId", "businessName")
        .populate(
          "imageAssets",
          "url filename width height thumbnailUrl variations",
        )
        .sort({ featuredOrder: 1, createdAt: -1 })
        .limit(6)
        .lean(),

      // Trending events — ordered by viewsCount desc (limit 12, published only)
      Event.find({
        isDeleted: false,
        isApproved: true,
        status: "published",
      })
        .select(
          "title slug description images imageAssets price location dateSchedule category rating reviewCount viewsCount isFeatured vendorId ageGroup",
        )
        .populate("category", "name slug")
        .populate("vendorId", "businessName")
        .populate(
          "imageAssets",
          "url filename width height thumbnailUrl variations",
        )
        .sort({ viewsCount: -1, createdAt: -1 }) // most-viewed first; createdAt as tiebreaker
        .limit(12)
        .lean(),

      // Active banners
      Banner.find({
        isActive: true,
        status: { $in: ["active", "scheduled"] },
        $and: [
          {
            $or: [
              { startDate: { $exists: false } },
              { startDate: null },
              { startDate: { $lte: new Date() } },
            ],
          },
          {
            $or: [
              { endDate: { $exists: false } },
              { endDate: null },
              { endDate: { $gte: new Date() } },
            ],
          },
        ],
      })
        .select(
          "title description imageAsset link ctaText ctaLink displayOrder titleVisible",
        )
        .populate("imageAsset", "url filename width height")
        .sort({ displayOrder: 1, createdAt: -1 })
        .lean(),

      // Active categories (top-level only)
      Category.find({
        isActive: true,
        level: 0,
      })
        .select("name slug icon eventCount sortOrder")
        .sort({ sortOrder: 1, name: 1 })
        .lean(),

      // Featured blogs (limit 6, published only)
      Blog.find({
        status: "published",
        featured: true,
      })
        .select(
          "title slug excerpt featuredImage featuredImageAsset author category readTime publishedAt",
        )
        .populate("category", "name slug color")
        .populate("featuredImageAsset", "url thumbnailUrl variations altText")
        .sort({ publishedAt: -1 })
        .limit(6)
        .lean(),

      // Public reels (limit 10, visibility='public')
      Reel.find({
        visibility: "public",
      })
        .select(
          "title description videoSourceType externalVideoUrl videoAsset thumbnailAsset likes viewsCount shareCount displayOrder tags duration showLikeButton showShareButton showTitle linkedEvent",
        )
        .populate("videoAsset", "url thumbnailUrl duration mimeType")
        .populate("thumbnailAsset", "url thumbnailUrl")
        .populate("linkedEvent", "title slug pricing location dateSchedule")
        .sort({ displayOrder: 1, createdAt: -1 })
        .limit(10)
        .lean(),

      // Public stats
      statsService.getPublicStats(),

      // SEO content for homepage
      SEOContent.findOne({ page: "homepage", isActive: true })
        .select(
          "metaTitle metaDescription keywords faqItems features trustSignals",
        )
        .lean(),

      // Active collections (limit 8) with events
      Collection.aggregate([
        {
          $match: {
            isActive: true,
            $or: [
              { events: { $ne: [], $exists: true } },
              { eventsData: { $ne: [], $exists: true } },
            ],
          },
        },
        // Populate iconAsset
        {
          $lookup: {
            from: "mediaassets",
            localField: "iconAsset",
            foreignField: "_id",
            as: "iconAssetData",
          },
        },
        {
          $addFields: {
            iconAsset: { $arrayElemAt: ["$iconAssetData", 0] },
          },
        },
        // Populate featuredImageAsset
        {
          $lookup: {
            from: "mediaassets",
            localField: "featuredImageAsset",
            foreignField: "_id",
            as: "featuredImageAssetData",
          },
        },
        {
          $addFields: {
            featuredImageAsset: {
              $arrayElemAt: ["$featuredImageAssetData", 0],
            },
          },
        },
        // Check if collection has embedded eventsData
        {
          $addFields: {
            hasEventsData: {
              $gt: [{ $size: { $ifNull: ["$eventsData", []] } }, 0],
            },
          },
        },
        // Populate events from Event collection (fallback for old ObjectId pattern)
        {
          $lookup: {
            from: "events",
            let: {
              eventIds: { $ifNull: ["$events", []] },
              hasEmbedded: "$hasEventsData",
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $in: ["$_id", "$$eventIds"] },
                      { $eq: ["$$hasEmbedded", false] },
                      { $eq: ["$isDeleted", false] },
                      { $eq: ["$isApproved", true] },
                      { $eq: ["$status", "published"] },
                    ],
                  },
                },
              },
              {
                $lookup: {
                  from: "mediaassets",
                  localField: "imageAssets",
                  foreignField: "_id",
                  as: "imageAssetDocs",
                },
              },
              {
                $lookup: {
                  from: "vendors",
                  localField: "vendorId",
                  foreignField: "_id",
                  as: "vendorDoc",
                },
              },
              {
                $project: {
                  _id: 1,
                  title: 1,
                  slug: 1,
                  description: 1,
                  price: 1,
                  images: 1,
                  imageAssets: "$imageAssetDocs",
                  category: 1,
                  location: { city: 1 },
                  dateSchedule: { $slice: ["$dateSchedule", 5] },
                  vendorId: { $arrayElemAt: ["$vendorDoc", 0] },
                  rating: 1,
                  reviewCount: 1,
                  viewsCount: 1,
                  isFeatured: 1,
                },
              },
              { $limit: 16 },
            ],
            as: "populatedEvents",
          },
        },
        // Combine eventsData (preferred) or populatedEvents (fallback)
        {
          $addFields: {
            events: {
              $cond: {
                if: "$hasEventsData",
                then: { $slice: ["$eventsData", 16] },
                else: "$populatedEvents",
              },
            },
          },
        },
        {
          $project: {
            title: 1,
            description: 1,
            slug: 1,
            iconAsset: 1,
            featuredImageAsset: 1,
            count: 1,
            category: 1,
            sortOrder: 1,
            seo: 1,
            events: 1,
          },
        },
        { $sort: { sortOrder: 1 } },
        { $limit: 20 },
      ]),

      // Educational Events (limit 8, published only)
      Event.find({
        type: {
          $in: ["Class", "Course", "Workshop", "Bootcamp", "Masterclass"],
        },
        isDeleted: false,
        isApproved: true,
        status: "published",
      })
        .select(
          "title slug description images imageAssets price currency dateSchedule category rating reviewCount viewsCount isFeatured location type venueType ageRange",
        )
        .populate(
          "imageAssets",
          "url filename width height thumbnailUrl variations",
        )
        .sort({ createdAt: -1 })
        .limit(8)
        .lean(),

      // Active venues (limit 12, approved only)
      Event.find({
        type: "Venue",
        isApproved: true,
        status: "published",
      })
        .select(
          "title slug description location.address location.coordinates venueType capacity facilities amenities images averageRating totalEvents isAffiliateEvent externalBookingLink",
        )
        .sort({ averageRating: -1, totalEvents: -1 })
        .limit(12)
        .lean(),
    ]);

    // Transform events to extract image URLs from populated imageAssets
    const transformedEvents = transformEventsResponse(events);
    const transformedBestPriceEvents = transformEventsResponse(bestPriceEvents);
    const transformedFeaturedEvents = transformEventsResponse(featuredEvents);
    const transformedTrendingEvents = transformEventsResponse(trendingEvents);

    // Transform blogs to ensure consistent data structure
    const featuredBlogs = rawFeaturedBlogs.map(transformBlogResponse);

    // Filter out banners with null/undefined imageAsset
    const validBanners = banners.filter((b) => b.imageAsset != null);

    const data: HomepageData = {
      events: transformedEvents,
      bestPriceEvents: transformedBestPriceEvents,
      featuredEvents: transformedFeaturedEvents,
      trendingEvents: transformedTrendingEvents,
      banners: validBanners as unknown as IBanner[],
      categories: categories as unknown as ICategory[],
      featuredBlogs,
      reels: reels as unknown as IReel[],
      stats,
      seoContent: (seoContent as unknown as ISEOContent) || null,
      collections: collections || [],
      educationalEvents: (teachingEvents as unknown as IEvent[]) || [],
      venues: (venues as unknown as HomepageVenue[]) || [],
    };

    // Debug logs (gated behind DEBUG_LOGS env var)
    if (process.env.DEBUG_LOGS === "true") {
      logger.info("✅ [HOMEPAGE] Database query results:");
      logger.info("   - Events:", events.length, "items");
      logger.info("   - Featured Events:", featuredEvents.length, "items");
      logger.info("   - Banners:", banners.length, "items");
      logger.info("   - Categories:", categories.length, "items");
      logger.info("   - Featured Blogs:", rawFeaturedBlogs.length, "items");
      logger.info("   - Reels:", reels.length, "items");
      logger.info("   - Stats:", stats ? "loaded" : "missing");
      logger.info("   - SEO Content:", seoContent ? "loaded" : "missing");
      logger.info("   - Collections:", collections.length, "items");
      logger.info("   - Venues:", venues.length, "items");

      if (events.length > 0) {
        const event = events[0] as any;
        logger.info("   - Sample Event:", {
          title: event.title,
          rating: event.rating,
          reviewCount: event.reviewCount,
          viewsCount: event.viewsCount,
          hasImages: event.images?.length || 0,
          hasImageAssets: event.imageAssets?.length || 0,
        });
      }

      if (rawFeaturedBlogs.length > 0) {
        const blog = rawFeaturedBlogs[0] as any;
        logger.info("   - Sample Blog:", {
          title: blog.title,
          hasFeaturedImage: !!blog.featuredImage,
          hasFeaturedImageAsset: !!blog.featuredImageAsset,
        });
      }

      if (categories.length > 0) {
        const category = categories[0] as any;
        logger.info("   - Sample Category:", {
          name: category.name,
          icon: category.icon,
          eventCount: category.eventCount,
        });
      }
    }

    // Cache for 5 minutes
    await cacheService.set(cacheKey, data, { ttl: 300 });

    return data;
  }

  /**
   * Invalidate homepage cache
   * Call this when events, banners, categories, blogs, collections, or SEO content are updated
   */
  async invalidateCache(): Promise<void> {
    await cacheService.delete("public:homepage");
  }
}

export default new HomepageService();
