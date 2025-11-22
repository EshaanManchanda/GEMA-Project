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
  id?: string;
  date: string;
  startDateTime: string;
  endDateTime: string;
  availableSeats: number;
  totalSeats: number;
  soldSeats: number;
  reservedSeats: number;
  price?: number;
  unlimitedSeats?: boolean;
  isOverride?: boolean;
}

export interface EventFaq {
  _id: string;
  question: string;
  answer: string;
}

export interface RegistrationField {
  id: string;
  label: string;
  type: 'text' | 'email' | 'number' | 'tel' | 'textarea' | 'dropdown' | 'checkbox' | 'radio' | 'file' | 'date';
  placeholder?: string;
  required: boolean;
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
  };
  options?: string[];
  accept?: string[];
  maxFileSize?: number;
  section?: string;
  order: number;
  helpText?: string;
}

export interface RegistrationConfig {
  enabled: boolean;
  fields: RegistrationField[];
  maxRegistrations?: number;
  registrationDeadline?: Date;
  requiresApproval: boolean;
  emailNotifications: {
    toVendor: boolean;
    toParticipant: boolean;
    customMessage?: string;
  };
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

export interface AffiliateClickTracking {
  totalClicks: number;
  uniqueClicks: number;
  lastClickedAt?: string;
}

export interface Event {
  _id: string;
  title: string;
  description: string;
  category: string;
  type: 'Olympiad' | 'Championship' | 'Competition' | 'Event' | 'Course' | 'Venue';
  venueType: 'Indoor' | 'Outdoor' | 'Online' | 'Offline';
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
  registrationConfig?: RegistrationConfig;
  // Affiliate Event fields
  isAffiliateEvent?: boolean;
  externalBookingLink?: string;
  affiliateClickTracking?: AffiliateClickTracking;
  claimStatus?: 'unclaimed' | 'claimed' | 'not_claimable';
  claimedBy?: string;
  claimedAt?: string;
  originalAffiliateVendorId?: string;
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
  type?: 'Olympiad' | 'Championship' | 'Competition' | 'Event' | 'Course' | 'Venue';
  venueType?: 'Indoor' | 'Outdoor' | 'Online' | 'Offline';
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