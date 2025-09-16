// Search-related TypeScript interfaces based on API response structure

export interface EventLocation {
  coordinates: {
    lat: number;
    lng: number;
  };
  address: string;
  city: string;
}

export interface DateSchedule {
  _id: string;
  startDate: string;
  endDate: string;
  totalSeats: number;
  availableSeats: number;
  soldSeats: number;
  reservedSeats: number;
}

export interface EventVendor {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface SeoMeta {
  keywords: string[];
}

export interface SearchEvent {
  _id: string;
  title: string;
  description: string;
  category: string;
  type: 'Event' | 'Course' | 'Venue';
  venueType: 'Indoor' | 'Outdoor';
  images: string[];
  dateSchedule: DateSchedule[];
  price: number;
  currency: 'AED' | 'USD' | 'EGP' | 'CAD';
  ageRange: [number, number];
  tags: string[];
  vendorId: EventVendor;
  location: EventLocation;
  isApproved: boolean;
  isDeleted: boolean;
  isFeatured: boolean;
  status: string;
  viewsCount: number;
  createdAt: string;
  updatedAt: string;
  faqs: any[];
  seoMeta: SeoMeta;
}

export interface SearchFilters {
  category?: string;
  type?: string;
  venueType?: string;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  currency?: string;
  ageMin?: number;
  ageMax?: number;
  featured?: boolean;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface SearchResponse {
  success: boolean;
  message: string;
  data: {
    events: SearchEvent[];
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

export interface CategoryOption {
  label: string;
  value: string;
  count: number;
}

export interface FilterOptions {
  categories: CategoryOption[];
  cities: CategoryOption[];
  eventTypes: CategoryOption[];
  venueTypes: CategoryOption[];
  currencies: CategoryOption[];
  priceRange: {
    min: number;
    max: number;
  };
  ageRange: {
    min: number;
    max: number;
  };
}