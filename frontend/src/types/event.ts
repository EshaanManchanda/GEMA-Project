export interface EventLocation {
  coordinates: {
    lat: number;
    lng: number;
  };
  city: string;
  address: string;
}

export interface EventSeoMeta {
  title: string;
  description: string;
  keywords: string[];
}

export interface EventVendor {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface EventDateSchedule {
  _id: string;
  date: string;
  startDateTime: string;
  endDateTime: string;
  availableSeats: number;
  totalSeats: number;
  soldSeats: number;
  reservedSeats: number;
  price?: number;
}

export interface EventFaq {
  _id: string;
  question: string;
  answer: string;
}

// Backend API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  errors?: any[];
}

export interface EventApiResponse extends ApiResponse {
  data?: {
    event: Event;
  };
}

export interface EventsApiResponse extends ApiResponse {
  data?: {
    events: Event[];
    pagination?: {
      currentPage: number;
      totalPages: number;
      totalEvents: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
      limit: number;
    };
  };
}

export interface Event {
  _id: string;
  title: string;
  description: string;
  category: string;
  type: 'Event' | 'Course' | 'Venue';
  venueType: 'Indoor' | 'Outdoor';
  ageRange: [number, number];
  location: EventLocation;
  seoMeta: EventSeoMeta;
  vendorId: EventVendor;
  price: number;
  currency: 'AED' | 'EGP' | 'CAD' | 'USD';
  isApproved: boolean;
  status: 'draft' | 'published' | 'archived' | 'pending' | 'rejected';
  tags: string[];
  dateSchedule: EventDateSchedule[];
  faqs: EventFaq[];
  viewsCount: number;
  isFeatured: boolean;
  images: string[];
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  affiliateCode: string;
}

export interface EventsResponse {
  success: boolean;
  message: string;
  data: {
    events: Event[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalEvents: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
      limit: number;
    };
  };
}

export interface SingleEventResponse {
  success: boolean;
  message: string;
  data: {
    event: Event;
  };
}

export interface EventCategoriesResponse {
  success: boolean;
  message: string;
  data: {
    categories: string[];
  };
}

export interface EventSearchFilters {
  page?: number;
  limit?: number;
  category?: string;
  type?: 'Event' | 'Course' | 'Venue';
  venueType?: 'Indoor' | 'Outdoor';
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  currency?: 'AED' | 'EGP' | 'CAD' | 'USD';
  ageMin?: number;
  ageMax?: number;
  featured?: boolean;
  search?: string;
  sortBy?: 'createdAt' | 'price' | 'viewsCount' | 'title';
  sortOrder?: 'asc' | 'desc';
}