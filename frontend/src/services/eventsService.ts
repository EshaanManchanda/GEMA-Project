import { ApiService, ApiResponse, PaginatedResponse } from './api';

// Event API Types
export interface Event {
  id: string;
  title: string;
  description: string;
  shortDescription: string;
  slug: string;
  category: {
    id: string;
    name: string;
    slug: string;
  };
  vendor: {
    id: string;
    name: string;
    slug: string;
    avatar?: string;
    rating: number;
    reviewCount: number;
  };
  images: Array<{
    id: string;
    url: string;
    alt: string;
    isPrimary: boolean;
  }>;
  location: {
    address: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
    coordinates: {
      lat: number;
      lng: number;
    };
    venue?: string;
  };
  dateTime: {
    start: string;
    end: string;
    timezone: string;
  };
  pricing: {
    type: 'free' | 'paid' | 'donation';
    currency: string;
    basePrice: number;
    discountedPrice?: number;
    discountPercentage?: number;
    priceRanges?: Array<{
      name: string;
      price: number;
      description?: string;
    }>;
  };
  capacity: {
    total: number;
    available: number;
    reserved: number;
  };
  features: string[];
  tags: string[];
  status: 'draft' | 'published' | 'cancelled' | 'completed';
  isPublic: boolean;
  isFeatured: boolean;
  requirements: {
    ageRestriction?: {
      minimum: number;
      maximum?: number;
    };
    prerequisites?: string[];
    equipment?: string[];
    skillLevel?: 'beginner' | 'intermediate' | 'advanced' | 'all';
  };
  cancellationPolicy: {
    type: 'flexible' | 'moderate' | 'strict';
    description: string;
    refundDeadline?: string;
  };
  socialMedia?: {
    website?: string;
    facebook?: string;
    instagram?: string;
    twitter?: string;
  };
  stats: {
    views: number;
    bookings: number;
    favorites: number;
    rating: number;
    reviewCount: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateEventRequest {
  title: string;
  description: string;
  shortDescription: string;
  categoryId: string;
  images: File[];
  location: {
    address: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
    coordinates: {
      lat: number;
      lng: number;
    };
    venue?: string;
  };
  dateTime: {
    start: string;
    end: string;
    timezone: string;
  };
  pricing: {
    type: 'free' | 'paid' | 'donation';
    currency: string;
    basePrice: number;
    priceRanges?: Array<{
      name: string;
      price: number;
      description?: string;
    }>;
  };
  capacity: {
    total: number;
  };
  features: string[];
  tags: string[];
  isPublic: boolean;
  requirements?: {
    ageRestriction?: {
      minimum: number;
      maximum?: number;
    };
    prerequisites?: string[];
    equipment?: string[];
    skillLevel?: 'beginner' | 'intermediate' | 'advanced' | 'all';
  };
  cancellationPolicy: {
    type: 'flexible' | 'moderate' | 'strict';
    description: string;
    refundDeadline?: string;
  };
  socialMedia?: {
    website?: string;
    facebook?: string;
    instagram?: string;
    twitter?: string;
  };
}

export interface UpdateEventRequest extends Partial<CreateEventRequest> {
  status?: 'draft' | 'published' | 'cancelled' | 'completed';
}

export interface EventFilters {
  category?: string;
  location?: string;
  dateFrom?: string;
  dateTo?: string;
  priceMin?: number;
  priceMax?: number;
  isFree?: boolean;
  isFeatured?: boolean;
  skillLevel?: string;
  tags?: string[];
  vendor?: string;
  radius?: number;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface EventSearchParams extends EventFilters {
  query?: string;
  page?: number;
  limit?: number;
  sortBy?: 'date' | 'price' | 'popularity' | 'rating' | 'created';
  sortOrder?: 'asc' | 'desc';
}

export interface EventReview {
  id: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  rating: number;
  title: string;
  comment: string;
  images?: string[];
  helpful: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReviewRequest {
  rating: number;
  title: string;
  comment: string;
  images?: File[];
}

// Events Service Class
export class EventsService {
  private static readonly BASE_PATH = '/events';

  // Get all events with filters and pagination
  static async getEvents(params: EventSearchParams = {}): Promise<PaginatedResponse<Event>> {
    return ApiService.get<PaginatedResponse<Event>>(this.BASE_PATH, { params });
  }

  // Get event by ID
  static async getEventById(id: string): Promise<ApiResponse<Event>> {
    return ApiService.get(`${this.BASE_PATH}/${id}`);
  }

  // Get event by slug
  static async getEventBySlug(slug: string): Promise<ApiResponse<Event>> {
    return ApiService.get(`${this.BASE_PATH}/slug/${slug}`);
  }

  // Search events
  static async searchEvents(params: EventSearchParams): Promise<PaginatedResponse<Event>> {
    return ApiService.get(`${this.BASE_PATH}/search`, { params });
  }

  // Get featured events
  static async getFeaturedEvents(limit = 10): Promise<ApiResponse<Event[]>> {
    return ApiService.get(`${this.BASE_PATH}/featured`, {
      params: { limit }
    });
  }

  // Get popular events
  static async getPopularEvents(limit = 10): Promise<ApiResponse<Event[]>> {
    return ApiService.get(`${this.BASE_PATH}/popular`, {
      params: { limit }
    });
  }

  // Get upcoming events
  static async getUpcomingEvents(limit = 10): Promise<ApiResponse<Event[]>> {
    return ApiService.get(`${this.BASE_PATH}/upcoming`, {
      params: { limit }
    });
  }

  // Get events by category
  static async getEventsByCategory(
    categorySlug: string,
    params: EventSearchParams = {}
  ): Promise<PaginatedResponse<Event>> {
    return ApiService.get(`${this.BASE_PATH}/category/${categorySlug}`, {
      params
    });
  }

  // Get events by vendor
  static async getEventsByVendor(
    vendorId: string,
    params: EventSearchParams = {}
  ): Promise<PaginatedResponse<Event>> {
    return ApiService.get(`${this.BASE_PATH}/vendor/${vendorId}`, {
      params
    });
  }

  // Get similar events
  static async getSimilarEvents(eventId: string, limit = 5): Promise<ApiResponse<Event[]>> {
    return ApiService.get(`${this.BASE_PATH}/${eventId}/similar`, {
      params: { limit }
    });
  }

  // Create event (vendor only)
  static async createEvent(data: CreateEventRequest): Promise<ApiResponse<Event>> {
    const formData = new FormData();
    
    // Add images
    data.images.forEach((image, index) => {
      formData.append(`images[${index}]`, image);
    });
    
    // Add other data
    Object.entries(data).forEach(([key, value]) => {
      if (key !== 'images') {
        formData.append(key, typeof value === 'object' ? JSON.stringify(value) : value);
      }
    });

    return ApiService.post(this.BASE_PATH, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  // Update event (vendor only)
  static async updateEvent(id: string, data: UpdateEventRequest): Promise<ApiResponse<Event>> {
    if (data.images && data.images.length > 0) {
      const formData = new FormData();
      
      // Add images
      data.images.forEach((image, index) => {
        formData.append(`images[${index}]`, image);
      });
      
      // Add other data
      Object.entries(data).forEach(([key, value]) => {
        if (key !== 'images') {
          formData.append(key, typeof value === 'object' ? JSON.stringify(value) : value);
        }
      });

      return ApiService.put(`${this.BASE_PATH}/${id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    } else {
      return ApiService.put(`${this.BASE_PATH}/${id}`, data);
    }
  }

  // Delete event (vendor only)
  static async deleteEvent(id: string): Promise<ApiResponse<void>> {
    return ApiService.delete(`${this.BASE_PATH}/${id}`);
  }

  // Update event status (vendor only)
  static async updateEventStatus(
    id: string,
    status: 'draft' | 'published' | 'cancelled' | 'completed'
  ): Promise<ApiResponse<Event>> {
    return ApiService.patch(`${this.BASE_PATH}/${id}/status`, { status });
  }

  // Get event reviews
  static async getEventReviews(
    eventId: string,
    page = 1,
    limit = 10
  ): Promise<PaginatedResponse<EventReview>> {
    return ApiService.get(`${this.BASE_PATH}/${eventId}/reviews`, {
      params: { page, limit }
    });
  }

  // Create event review
  static async createReview(
    eventId: string,
    data: CreateReviewRequest
  ): Promise<ApiResponse<EventReview>> {
    if (data.images && data.images.length > 0) {
      const formData = new FormData();
      
      // Add images
      data.images.forEach((image, index) => {
        formData.append(`images[${index}]`, image);
      });
      
      // Add other data
      Object.entries(data).forEach(([key, value]) => {
        if (key !== 'images') {
          formData.append(key, value.toString());
        }
      });

      return ApiService.post(`${this.BASE_PATH}/${eventId}/reviews`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    } else {
      return ApiService.post(`${this.BASE_PATH}/${eventId}/reviews`, data);
    }
  }

  // Update review
  static async updateReview(
    eventId: string,
    reviewId: string,
    data: Partial<CreateReviewRequest>
  ): Promise<ApiResponse<EventReview>> {
    return ApiService.put(`${this.BASE_PATH}/${eventId}/reviews/${reviewId}`, data);
  }

  // Delete review
  static async deleteReview(eventId: string, reviewId: string): Promise<ApiResponse<void>> {
    return ApiService.delete(`${this.BASE_PATH}/${eventId}/reviews/${reviewId}`);
  }

  // Mark review as helpful
  static async markReviewHelpful(eventId: string, reviewId: string): Promise<ApiResponse<void>> {
    return ApiService.post(`${this.BASE_PATH}/${eventId}/reviews/${reviewId}/helpful`);
  }

  // Add to favorites
  static async addToFavorites(eventId: string): Promise<ApiResponse<void>> {
    return ApiService.post(`${this.BASE_PATH}/${eventId}/favorite`);
  }

  // Remove from favorites
  static async removeFromFavorites(eventId: string): Promise<ApiResponse<void>> {
    return ApiService.delete(`${this.BASE_PATH}/${eventId}/favorite`);
  }

  // Check if event is in favorites
  static async isFavorite(eventId: string): Promise<ApiResponse<{ isFavorite: boolean }>> {
    return ApiService.get(`${this.BASE_PATH}/${eventId}/favorite`);
  }

  // Get event analytics (vendor only)
  static async getEventAnalytics(
    eventId: string,
    period: 'day' | 'week' | 'month' | 'year' = 'month'
  ): Promise<ApiResponse<{
    views: Array<{ date: string; count: number }>;
    bookings: Array<{ date: string; count: number; revenue: number }>;
    favorites: Array<{ date: string; count: number }>;
    demographics: {
      ageGroups: Record<string, number>;
      genders: Record<string, number>;
      locations: Record<string, number>;
    };
    totalStats: {
      views: number;
      bookings: number;
      revenue: number;
      favorites: number;
      rating: number;
      reviewCount: number;
    };
  }>> {
    return ApiService.get(`${this.BASE_PATH}/${eventId}/analytics`, {
      params: { period }
    });
  }

  // Duplicate event (vendor only)
  static async duplicateEvent(eventId: string): Promise<ApiResponse<Event>> {
    return ApiService.post(`${this.BASE_PATH}/${eventId}/duplicate`);
  }

  // Get event availability
  static async getEventAvailability(eventId: string): Promise<ApiResponse<{
    available: number;
    total: number;
    reserved: number;
    waitlist: number;
  }>> {
    return ApiService.get(`${this.BASE_PATH}/${eventId}/availability`);
  }
}

export default EventsService;