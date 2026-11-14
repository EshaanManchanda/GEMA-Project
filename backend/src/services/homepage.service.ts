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
import { attachDirectUrl } from "../utils/mediaUrl.util";
import logger from "../config/logger";

// The homepage only renders cards. A card shows a short plain-text snippet of the description and
// the first date slot, so full HTML descriptions and every date slot are not sent: they made
// /api/homepage about 2.8 MB.
const SNIPPET_CHARS = 300;
const MAX_SLOTS = 3;
// The only collection HomePage reads events from (the pills need just _id, slug and title).
const HANDPICKED_SLUGS = new Set([
  "handpicked-experience",
  "handpicked-experiences",
]);

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&nbsp;": " ",
};

export function toSnippet(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (m) => ENTITIES[m])
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, SNIPPET_CHARS);
}

export function slimEventCard<
  T extends { description?: unknown; dateSchedule?: unknown },
>(event: T): T {
  return {
    ...event,
    description:
      typeof event.description === "string"
        ? toSnippet(event.description)
        : event.description,
    dateSchedule: Array.isArray(event.dateSchedule)
      ? event.dateSchedule.slice(0, MAX_SLOTS)
      : event.dateSchedule,
  };
}

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
    ] = await Promise.all([
      // Regular events (limit 12, published only)
      Event.find({
        isDeleted: false,
        isApproved: true,
        status: "published",
      })
        .select(
          "title slug description images imageAssets price location venueType dateSchedule category rating reviewCount viewsCount isFeatured vendorId ageGroup",
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
          "title slug description images imageAssets price location venueType dateSchedule category rating reviewCount viewsCount isFeatured vendorId ageGroup",
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
          "title slug description images imageAssets price location venueType dateSchedule category rating reviewCount viewsCount isFeatured vendorId ageGroup",
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
          "title slug description images imageAssets price location venueType dateSchedule category rating reviewCount viewsCount isFeatured vendorId ageGroup",
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
        .populate("imageAsset", "url filename width height publicId provider")
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
          "title slug excerpt featuredImage featuredImageAsset author.name author.avatar author.bio category readTime publishedAt",
        )
        .populate("category", "name slug color")
        .populate(
          "featuredImageAsset",
          "url thumbnailUrl variations altText publicId provider",
        )
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
        .populate("thumbnailAsset", "url thumbnailUrl publicId provider")
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
                  // Public pages get the business identity only. The whole vendor document
                  // (email, phone, tax and licence data, payment settings) must never be projected.
                  vendorId: {
                    $let: {
                      vars: { v: { $arrayElemAt: ["$vendorDoc", 0] } },
                      in: {
                        _id: "$$v._id",
                        businessName: "$$v.businessName",
                        logo: "$$v.logo",
                        slug: "$$v.slug",
                      },
                    },
                  },
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
          // No description or seo block: the pills and the handpicked row do not read them.
          $project: {
            title: 1,
            slug: 1,
            iconAsset: 1,
            featuredImageAsset: 1,
            count: 1,
            category: 1,
            sortOrder: 1,
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

    // Attach direct Cloudinary CDN URLs so the client can skip the
    // /api/media/file/:uuid proxy (302 redirect) that was blowing up LCP
    // on the hero banner. Safe to do broadly here since these are all
    // image (not video) assets. Blog featuredImage is handled inside
    // transformBlogResponse itself, since that's where the flat
    // `featuredImage` string consumers actually read gets derived.
    validBanners.forEach((b) => attachDirectUrl(b as any, "imageAsset"));
    reels.forEach((r) => attachDirectUrl(r as any, "thumbnailAsset"));

    const data: HomepageData = {
      events: transformedEvents.map(slimEventCard),
      bestPriceEvents: transformedBestPriceEvents.map(slimEventCard),
      featuredEvents: transformedFeaturedEvents.map(slimEventCard),
      trendingEvents: transformedTrendingEvents.map(slimEventCard),
      banners: validBanners as unknown as IBanner[],
      categories: categories as unknown as ICategory[],
      featuredBlogs,
      reels: reels as unknown as IReel[],
      stats,
      seoContent: (seoContent as unknown as ISEOContent) || null,
      // Events only for the handpicked collection; every other collection is a pill.
      collections: (collections || []).map((c: any) => ({
        ...c,
        events: HANDPICKED_SLUGS.has(c.slug)
          ? (c.events || []).map(slimEventCard)
          : [],
      })) as unknown as ICollection[],
      educationalEvents: ((teachingEvents as unknown as IEvent[]) || []).map(
        slimEventCard,
      ),
      // Nothing on the page reads venues (the venue list has its own endpoint), so the query
      // is gone. The key stays so the response shape the frontend types declare is unchanged.
      venues: [],
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
