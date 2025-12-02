import { Event, Vendor, Venue, Review } from '../models/index';
import cacheService from './cache.service';

export interface PublicStats {
  totalEvents: number;
  totalVendors: number;
  totalVenues: number;
  totalReviews: number;
}

class StatsService {
  /**
   * Get public stats for homepage
   * Returns cached stats if available, otherwise fetches from database
   */
  async getPublicStats(): Promise<PublicStats> {
    const cacheKey = 'public:stats';

    // Check cache first (5 min TTL)
    const cached = await cacheService.get<PublicStats>(cacheKey);
    if (cached) {
      return cached;
    }

    // Parallel queries for performance
    const [totalEvents, totalVendors, totalVenues, totalReviews] = await Promise.all([
      Event.countDocuments({ isDeleted: false, isApproved: true, status: 'published' }),
      Vendor.countDocuments(),
      Venue.countDocuments({ isDeleted: false }),
      Review.countDocuments({ status: 'approved' })
    ]);

    const stats: PublicStats = {
      totalEvents,
      totalVendors,
      totalVenues,
      totalReviews
    };

    // Cache for 5 minutes
    await cacheService.set(cacheKey, stats, { ttl: 300 });

    return stats;
  }
}

export default new StatsService();
