import { Event, Banner, Category, Blog, IEvent, IBanner, ICategory, IBlog } from '../models/index';
import cacheService from './cache.service';
import statsService, { PublicStats } from './stats.service';

export interface HomepageData {
  events: IEvent[];
  featuredEvents: IEvent[];
  banners: IBanner[];
  categories: ICategory[];
  featuredBlogs: IBlog[];
  stats: PublicStats;
}

class HomepageService {
  /**
   * Get all homepage data in single aggregated response
   * Uses Redis caching with 5-minute TTL
   * Parallel queries for optimal performance
   */
  async getHomepageData(): Promise<HomepageData> {
    const cacheKey = 'public:homepage';

    // Check cache first (5 min TTL)
    const cached = await cacheService.get<HomepageData>(cacheKey);
    if (cached) {
      if (process.env.DEBUG_LOGS === 'true') {
        console.log('📦 [HOMEPAGE] Returning cached data');
      }
      return cached;
    }

    if (process.env.DEBUG_LOGS === 'true') {
      console.log('🔄 [HOMEPAGE] Cache miss - fetching from database');
    }

    // Parallel queries for all homepage data
    const [
      events,
      featuredEvents,
      banners,
      categories,
      featuredBlogs,
      stats
    ] = await Promise.all([
      // Regular events (limit 12, published only)
      Event.find({
        isDeleted: false,
        isApproved: true,
        status: 'published'
      })
        .select('title slug description images imageAssets price location dateSchedule category rating reviewCount viewsCount isFeatured vendorId ageGroup')
        .populate('category', 'name slug')
        .populate('vendorId', 'businessName')
        .sort({ createdAt: -1 })
        .limit(12)
        .lean(),

      // Featured events (limit 6)
      Event.find({
        isDeleted: false,
        isApproved: true,
        status: 'published',
        isFeatured: true
      })
        .select('title slug description images imageAssets price location dateSchedule category rating reviewCount viewsCount isFeatured vendorId ageGroup')
        .populate('category', 'name slug')
        .populate('vendorId', 'businessName')
        .sort({ featuredOrder: 1, createdAt: -1 })
        .limit(6)
        .lean(),

      // Active banners
      Banner.find({
        isActive: true,
        startDate: { $lte: new Date() },
        $or: [
          { endDate: { $gte: new Date() } },
          { endDate: null }
        ]
      })
        .select('title description imageUrl link buttonText position sortOrder')
        .sort({ sortOrder: 1, createdAt: -1 })
        .lean(),

      // Active categories (top-level only)
      Category.find({
        isActive: true,
        level: 0
      })
        .select('name slug icon eventCount sortOrder')
        .sort({ sortOrder: 1, name: 1 })
        .lean(),

      // Featured blogs (limit 6, published only)
      Blog.find({
        status: 'published',
        featured: true
      })
        .select('title slug excerpt featuredImage featuredImageAsset author category readTime publishedAt')
        .populate('category', 'name slug color')
        .sort({ publishedAt: -1 })
        .limit(6)
        .lean(),

      // Public stats
      statsService.getPublicStats()
    ]);

    const data: HomepageData = {
      events,
      featuredEvents,
      banners,
      categories,
      featuredBlogs,
      stats
    };

    // Debug logs (gated behind DEBUG_LOGS env var)
    if (process.env.DEBUG_LOGS === 'true') {
      console.log('✅ [HOMEPAGE] Database query results:');
      console.log('   - Events:', events.length, 'items');
      console.log('   - Featured Events:', featuredEvents.length, 'items');
      console.log('   - Banners:', banners.length, 'items');
      console.log('   - Categories:', categories.length, 'items');
      console.log('   - Featured Blogs:', featuredBlogs.length, 'items');
      console.log('   - Stats:', stats ? 'loaded' : 'missing');

      if (events.length > 0) {
        const event = events[0] as any;
        console.log('   - Sample Event:', {
          title: event.title,
          rating: event.rating,
          reviewCount: event.reviewCount,
          viewsCount: event.viewsCount,
          hasImages: event.images?.length || 0,
          hasImageAssets: event.imageAssets?.length || 0
        });
      }

      if (featuredBlogs.length > 0) {
        const blog = featuredBlogs[0] as any;
        console.log('   - Sample Blog:', {
          title: blog.title,
          hasFeaturedImage: !!blog.featuredImage,
          hasFeaturedImageAsset: !!blog.featuredImageAsset
        });
      }

      if (categories.length > 0) {
        const category = categories[0] as any;
        console.log('   - Sample Category:', {
          name: category.name,
          icon: category.icon,
          eventCount: category.eventCount
        });
      }
    }

    // Cache for 5 minutes
    await cacheService.set(cacheKey, data, { ttl: 300 });

    return data;
  }

  /**
   * Invalidate homepage cache
   * Call this when events, banners, categories, or blogs are updated
   */
  async invalidateCache(): Promise<void> {
    await cacheService.delete('public:homepage');
  }
}

export default new HomepageService();
