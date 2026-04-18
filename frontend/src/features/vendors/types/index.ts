export type { VendorPaymentInfo } from '@services/api/vendorAPI';

export interface Vendor {
  _id: string;
  userId: string;
  businessName: string;
  slug: string;
  description?: string;
  logo?: string;
  coverImage?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  city?: string;
  country?: string;
  socialMedia?: Record<string, string>;
  businessHours?: Record<string, string>;
  status: 'pending' | 'active' | 'suspended';
  isFeatured: boolean;
  eventsCount: number;
  rating: number;
  reviewsCount: number;
  createdAt: string;
  updatedAt: string;
}
