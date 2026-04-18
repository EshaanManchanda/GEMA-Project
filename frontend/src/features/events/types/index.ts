export interface Event {
  _id: string;
  title: string;
  slug: string;
  description: string;
  location: {
    address: string;
    city: string;
    state?: string;
    country: string;
    lat?: number;
    lng?: number;
  };
  dateSchedule: Array<{
    _id?: string;
    startDate: string;
    endDate: string;
    startTime?: string;
    endTime?: string;
    availableSeats?: number;
  }>;
  pricing: {
    currency: string;
    price: number;
    originalPrice?: number;
    isFree: boolean;
  };
  images?: string[];
  category?: string;
  vendorId?: string;
  status: 'draft' | 'published' | 'cancelled' | 'completed';
  isFeatured?: boolean;
  viewsCount?: number;
  bookingsCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface EventsResponse {
  events: Event[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
