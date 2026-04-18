/**
 * Google Places Service - Stub
 * TODO: Implement Google Places API integration
 */
export const googlePlacesService = {
  async getPlaceReviews(_placeId: string) {
    return { reviews: [], rating: 0, totalRatings: 0 };
  },
  async getPlaceDetails(_placeId: string) {
    return null;
  },
};
