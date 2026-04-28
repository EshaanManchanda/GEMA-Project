export interface ReviewUser {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string;
}

export interface ReviewEvent {
  _id: string;
  title: string;
  images?: string[];
}

export interface ReviewVendor {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string;
}

export interface Review {
  _id: string;
  type: 'event' | 'vendor' | 'venue';
  user: ReviewUser;
  event?: ReviewEvent;
  vendor?: ReviewVendor;
  rating: number;
  title: string;
  comment: string;
  pros?: string[];
  cons?: string[];
  verified: boolean;
  status: 'pending' | 'approved' | 'rejected';
  media?: string[];
  helpfulCount: number;
  notHelpfulCount: number;
  flagCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewsResponse {
  success: boolean;
  message: string;
  data: {
    reviews: Review[];
    pagination?: {
      currentPage: number;
      totalPages: number;
      totalReviews: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
      limit: number;
    };
  };
}

export interface SingleReviewResponse {
  success: boolean;
  message: string;
  data: {
    review: Review;
  };
}

export interface CreateReviewData {
  type: 'event' | 'vendor' | 'venue';
  eventId?: string;
  vendorId?: string;
  venueId?: string;
  rating: number;
  title: string;
  comment: string;
  pros?: string[];
  cons?: string[];
  media?: string[];
}

export interface ReviewFilters {
  type?: 'event' | 'vendor' | 'venue';
  targetId?: string;
  rating?: number;
  verified?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'rating' | 'helpfulCount';
  sortOrder?: 'asc' | 'desc';
}

// For testimonials carousel - simplified interface
export interface TestimonialReview {
  _id: string;
  title: string;
  comment: string;
  rating: number;
  user: {
    name: string;
    avatar?: string;
  };
  event?: {
    title: string;
    image?: string;
  };
  date: string;
  verified: boolean;
}