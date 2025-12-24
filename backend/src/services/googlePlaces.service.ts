import axios from 'axios';
import { config } from '../config/env';
import { cacheService } from './cache.service';
import logger from '../config/logger';

interface GoogleReview {
  author_name: string;
  author_url?: string;
  language: string;
  profile_photo_url?: string;
  rating: number;
  relative_time_description: string;
  text: string;
  time: number;
}

interface GooglePlaceDetails {
  place_id: string;
  name: string;
  rating?: number;
  user_ratings_total?: number;
  reviews?: GoogleReview[];
}

interface GooglePlacesResponse {
  result: GooglePlaceDetails;
  status: string;
}

export class GooglePlacesService {
  private apiKey: string;
  private baseUrl = 'https://maps.googleapis.com/maps/api/place';
  private cacheTTL = 30 * 24 * 60 * 60; // 30 days (Google TOS requirement)

  constructor() {
    this.apiKey = config.google.placesApiKey;
  }

  /**
   * Fetch reviews from Google Places API for a given Place ID
   * @param placeId Google Place ID
   * @returns Array of reviews (max 5 per Google API limit)
   */
  async getPlaceReviews(placeId: string): Promise<{
    reviews: GoogleReview[];
    rating: number;
    totalRatings: number;
  }> {
    if (!this.apiKey) {
      logger.warn('Google Places API key not configured');
      return { reviews: [], rating: 0, totalRatings: 0 };
    }

    if (!placeId) {
      throw new Error('Place ID is required');
    }

    // Check cache first (30-day TTL per Google TOS)
    const cacheKey = `google:place:${placeId}`;
    const cached = await cacheService.get<{
      reviews: GoogleReview[];
      rating: number;
      totalRatings: number;
    }>(cacheKey);

    if (cached) {
      logger.info(`Google reviews cache HIT for place ${placeId}`);
      return cached;
    }

    try {
      logger.info(`Fetching Google reviews for place ${placeId}`);

      const response = await axios.get<GooglePlacesResponse>(
        `${this.baseUrl}/details/json`,
        {
          params: {
            place_id: placeId,
            fields: 'name,rating,user_ratings_total,reviews',
            key: this.apiKey,
          },
          timeout: 5000, // 5 second timeout
        }
      );

      if (response.data.status !== 'OK') {
        logger.error(`Google Places API error: ${response.data.status}`);

        // Return empty data for specific error statuses instead of throwing
        if (response.data.status === 'ZERO_RESULTS' || response.data.status === 'NOT_FOUND') {
          return { reviews: [], rating: 0, totalRatings: 0 };
        }

        throw new Error(`Google Places API error: ${response.data.status}`);
      }

      const result = response.data.result;
      const data = {
        reviews: result.reviews || [],
        rating: result.rating || 0,
        totalRatings: result.user_ratings_total || 0,
      };

      // Cache for 30 days (Google TOS requirement)
      await cacheService.set(cacheKey, data, { ttl: this.cacheTTL });

      logger.info(`Fetched ${data.reviews.length} Google reviews for place ${placeId}`);
      return data;
    } catch (error: any) {
      logger.error('Error fetching Google Place reviews:', error);

      if (error.response?.status === 429) {
        throw new Error('Google Places API rate limit exceeded');
      }

      if (error.response?.status === 403) {
        throw new Error('Invalid Google Places API key');
      }

      if (error.code === 'ECONNABORTED') {
        throw new Error('Google Places API request timeout');
      }

      // Return empty data for other errors instead of throwing
      // This ensures the app doesn't break if Google API is down
      logger.warn('Returning empty reviews due to Google API error');
      return { reviews: [], rating: 0, totalRatings: 0 };
    }
  }

  /**
   * Invalidate cache for a specific Place ID (admin use only)
   */
  async invalidatePlaceCache(placeId: string): Promise<boolean> {
    const cacheKey = `google:place:${placeId}`;
    const deleted = await cacheService.delete(cacheKey);

    if (deleted) {
      logger.info(`Invalidated Google reviews cache for place ${placeId}`);
    }

    return deleted;
  }
}

export const googlePlacesService = new GooglePlacesService();
