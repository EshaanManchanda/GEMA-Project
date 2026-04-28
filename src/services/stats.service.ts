import {
  Event,
  Vendor,
  Review,
  Order,
  Booking,
  Category,
} from "../models/index";
import cacheService from "./cache.service";

export interface PublicStats {
  totalEvents: number;
  totalVendors: number;
  totalVenues: number;
  totalReviews: number;
  totalBookings: number;
  totalCategories: number;
  totalCities: number;
  averageRating: number;
  topCategories: Array<{ name: string; count: number }>;
  topCities: Array<{ name: string; count: number }>;
}

class StatsService {
  /**
   * Get public stats for homepage
   * Returns cached stats if available, otherwise fetches from database
   */
  async getPublicStats(): Promise<PublicStats> {
    const cacheKey = "public:stats";

    // Check cache first (5 min TTL)
    const cached = await cacheService.get<PublicStats>(cacheKey);
    if (cached) {
      return cached;
    }

    // Parallel queries for performance
    const [
      totalEvents,
      totalVendors,
      totalVenues,
      totalReviews,
      totalBookings,
      totalCategories,
      reviews,
      topCategoriesData,
      topCitiesData,
    ] = await Promise.all([
      Event.countDocuments({
        isDeleted: false,
        isApproved: true,
        status: "published",
      }),
      Vendor.countDocuments(),
      Event.countDocuments({ type: "Venue", isDeleted: false }),
      Review.countDocuments({ status: "approved" }),
      Booking.countDocuments({ status: { $in: ["confirmed", "completed"] } }),
      Category.countDocuments({ isActive: true }),
      Review.find({ status: "approved" }).select("rating").lean(),
      // Aggregate top categories by event count
      Event.aggregate([
        { $match: { isDeleted: false, isApproved: true, status: "published" } },
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),
      // Aggregate top cities by event count
      Event.aggregate([
        {
          $match: {
            isDeleted: false,
            isApproved: true,
            status: "published",
            "location.city": { $exists: true, $ne: null },
          },
        },
        { $group: { _id: "$location.city", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),
    ]);

    // Calculate average rating
    const averageRating =
      reviews.length > 0
        ? reviews.reduce((sum, review) => sum + review.rating, 0) /
          reviews.length
        : 0;

    // Get unique cities count
    const citiesAggregation = await Event.aggregate([
      {
        $match: {
          isDeleted: false,
          isApproved: true,
          status: "published",
          "location.city": { $exists: true, $ne: null },
        },
      },
      { $group: { _id: "$location.city" } },
    ]);
    const totalCities = citiesAggregation.length;

    // Format top categories and cities
    const topCategories = topCategoriesData.map((cat: any) => ({
      name: cat._id || "Unknown",
      count: cat.count,
    }));

    const topCities = topCitiesData.map((city: any) => ({
      name: city._id || "Unknown",
      count: city.count,
    }));

    const stats: PublicStats = {
      totalEvents,
      totalVendors,
      totalVenues,
      totalReviews,
      totalBookings,
      totalCategories,
      totalCities,
      averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
      topCategories,
      topCities,
    };

    // Cache for 5 minutes
    await cacheService.set(cacheKey, stats, { ttl: 300 });

    return stats;
  }
}

export default new StatsService();
