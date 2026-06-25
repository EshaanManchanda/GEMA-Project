/**
 * Teacher Types
 * TypeScript interfaces for teacher-related data structures
 */

export enum TeachingMode {
  ONLINE = 'online',
  OFFLINE = 'offline',
  HYBRID = 'hybrid',
}

export enum TeacherVerificationStatus {
  VERIFIED = 'verified',
  PENDING = 'pending',
  UNVERIFIED = 'unverified',
  REJECTED = 'rejected',
}

export enum TeacherPaymentMode {
  PLATFORM_STRIPE = 'platform_stripe',
  CUSTOM_STRIPE = 'custom_stripe',
}

export enum TeacherSubscriptionStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
  EXPIRED = 'expired',
  SUSPENDED = 'suspended',
  GRACE_PERIOD = 'grace_period',
}

export interface IQualification {
  degree: string;
  institution: string;
  year: number;
  country: string;
  certificateAssetId?: string;
}

export interface IAvailabilityHours {
  [day: string]: {
    isAvailable: boolean;
    startTime?: string;
    endTime?: string;
  };
}

export interface ITeachingAddress {
  address: string;
  city: string;
  country: string;
  postalCode?: string;
}

export interface ISocialLinks {
  facebook?: string;
  linkedin?: string;
  instagram?: string;
  youtube?: string;
  website?: string;
  portfolio?: string;
}

export interface ITeacherBankDetails {
  accountHolderName?: string;
  bankName?: string;
  accountNumber?: string;
  iban?: string;
  swiftCode?: string;
  isVerified?: boolean;
}

export interface IStripeConfig {
  stripeConnectAccountId?: string;
  stripeConnectOnboardingComplete: boolean;
  stripePublishableKey?: string;
  stripeTestMode: boolean;
}

export interface ITeacherPaymentSettings {
  paymentMode: TeacherPaymentMode;
  paymentModeChangedAt?: Date;
  stripeSettings: IStripeConfig;
  commissionRate: number;
  subscriptionStatus: TeacherSubscriptionStatus;
  subscriptionAmount: number;
  subscriptionPaidUntil?: Date;
  payoutSchedule: 'daily' | 'weekly' | 'monthly';
  minimumPayout: number;
  preferredPayoutMethod: 'bank_transfer' | 'stripe' | 'paypal';
  bankDetails?: ITeacherBankDetails;
  acceptsPlatformPayments: boolean;
  autoPayoutEnabled: boolean;
}

export interface ITeacherStats {
  totalClasses: number;
  totalStudents: number;
  totalEarnings: number;
  averageRating: number;
  totalReviews: number;
  viewsCount: number;
}

export interface ITeacher {
  _id: string;
  userId: string;
  fullName: string;
  bio?: string;
  subjects?: string[];
  specialization?: string;
  languagesSpoken?: string[];
  yearsOfExperience?: number;
  profileImageAssetId?: string;
  demoVideoAssetId?: string;
  profileVideoUrl?: string;
  coverImage?: string;
  teachingMode: TeachingMode;
  email: string;
  phone: string;
  address: ITeachingAddress;
  socialLinks?: ISocialLinks;
  education?: IQualification[];
  availabilityHours?: IAvailabilityHours;
  paymentSettings: ITeacherPaymentSettings;
  verificationStatus: TeacherVerificationStatus;
  isActive: boolean;
  isSuspended: boolean;
  stats?: ITeacherStats;
  isDeleted: boolean;
  memberSince: Date;
  createdAt: Date;
  updatedAt: Date;
}

// API Response Types
export interface TeacherDashboardStats {
  totalTeachingEvents: number;
  totalBookings: number;
  totalRevenue: number;
  activeTeachingEvents?: number;
  confirmedBookings?: number;
  cancelledBookings?: number;
  averageRating?: number;
  totalReviews?: number;
  viewsCount?: number;
  revenueByMonth?: Array<{ month: string; revenue: number }>;
}

export interface TeacherEarnings {
  totalEarnings: number;
  pendingEarnings: number;
  paidEarnings: number;
  commissionPaid: number;
  netEarnings: number;
  currency: string;
  breakdown: Array<{
    teachingEventId: string;
    teachingEventTitle: string;
    totalRevenue: number;
    commission: number;
    netRevenue: number;
    bookingsCount: number;
  }>;
}

export interface TeacherPaymentInfo {
  teacherId: string;
  hasCustomStripe: boolean;
  stripePublishableKey: string | null;
  serviceFeeRate: number;
  usePlatformStripe: boolean;
}

// Teaching Event Types
export interface ITeachingEvent {
  _id: string;
  slug?: string;
  title: string;
  description: string;
  shortDescription?: string;
  category: string;
  type: 'Class' | 'Course' | 'Workshop' | 'Bootcamp' | 'Masterclass';
  eventType: 'Online' | 'Offline';
  venueType?: 'Online' | 'Offline';
  meetingLink?: string;
  isFreeEvent?: boolean;
  ageRange: [number, number];
  grades?: string[];
  location: {
    country?: string;
    city: string;
    address: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
  teacherId: string;
  price: number;
  currency: string;
  isApproved: boolean;
  isActive: boolean;
  status: 'draft' | 'published' | 'archived' | 'pending' | 'rejected';
  tags: string[];
  dateSchedule: Array<{
    date?: Date;
    startDate?: Date;
    endDate?: Date;
    startTime?: string;
    endTime?: string;
    availableSeats: number;
    totalSeats?: number;
    soldSeats?: number;
    price: number;
    unlimitedSeats?: boolean;
    _id?: string;
  }>;
  images: string[];
  imageAssets?: string[];
  viewsCount: number;
  isFeatured: boolean;
  averageRating: number;
  reviewCount: number;
  registrationConfig?: {
    enabled: boolean;
    requiresApproval: boolean;
    maxRegistrations?: number;
    registrationDeadline?: Date;
  };
  cancellationStatus: 'active' | 'cancelled';
  isAffiliateTeachingEvent?: boolean;
  affiliateCode?: string;
  createdAt: Date;
  updatedAt: Date;
  // Course specific
  syllabus?: {
    title: string;
    description: string;
    duration?: string;
    lessons?: {
      title: string;
      duration?: string;
    }[];
  }[];
  subject?: string;
  topic?: string;
  introVideo?: string;
  pastEventMemories?: any[];
}

// Booking Types
export interface ITeacherBooking {
  _id: string;
  bookingNumber: string;
  studentId: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    avatar?: string;
  };
  sessions: Array<{
    teachingEventId: string;
    teachingEventTitle: string;
    scheduleDate: Date;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    currency: string;
    students?: Array<{
      name: string;
      age?: number;
    }>;
  }>;
  subtotal: number;
  tax: number;
  discount: number;
  totalAmount: number;
  currency: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'refunded';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentMethod?: string;
  teacherNotes?: string;
  teacherStatus?: string;
  attendanceMarked?: boolean;
  meetingLink?: string;
  programStatus?: 'intro_booked' | 'program_purchased';
  createdAt: Date;
  updatedAt: Date;
}

// Payout Types
export interface ITeacherPayout {
  _id: string;
  teacherId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  payoutMethod: 'bank_transfer' | 'stripe' | 'paypal';
  transactionId?: string;
  requestedAt: Date;
  processedAt?: Date;
  notes?: string;
}

// Form Input Types
export interface TeacherProfileUpdateInput {
  firstName?: string;
  lastName?: string;
  bio?: string;
  subjects?: string[];
  expertise?: string[];
  specialization?: string;
  languagesSpoken?: string[];
  yearsOfExperience?: number;
  website?: string;
  education?: IQualification[];
  socialLinks?: ISocialLinks;
  address?: ITeachingAddress;
  availabilityHours?: IAvailabilityHours;
}

export interface TeachingEventCreateInput {
  title: string;
  description: string;
  shortDescription?: string;
  category: string;
  type: 'Class' | 'Course' | 'Workshop' | 'Bootcamp' | 'Masterclass';
  eventType: 'Online' | 'Offline';
  isFreeEvent?: boolean;
  status?: 'draft' | 'published' | 'archived' | 'pending' | 'rejected';
  meetingLink?: string;
  meetingPassword?: string;
  timezone?: string;
  seoMeta?: {
    title: string;
    description: string;
    keywords: string[];
  };
  ageRange: [number, number];
  grades?: string[];
  location: {
    country?: string;
    city: string;
    address?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  price: number;
  currency: string;
  tags?: string[];
  dateSchedule: Array<{
    _id?: string;
    startDate: Date;
    endDate?: Date;
    startTime?: string;
    endTime?: string;
    availableSeats: number;
    totalSeats?: number;
    soldSeats?: number;
    price: number;
    unlimitedSeats?: boolean;
  }>;
  images?: string[];
  imageAssets?: string[];
  registrationConfig?: {
    enabled: boolean;
    requiresApproval: boolean;
    maxRegistrations?: number;
    registrationDeadline?: Date;
  };
  // Course specific
  syllabus?: {
    title: string;
    description: string;
    duration?: string;
    lessons?: {
      title: string;
      duration?: string;
    }[];
  }[];
  subject?: string;
  topic?: string;
  introVideo?: string;
  pastEventMemories?: any[];
}

// Filter Types
export interface TeacherBookingFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  paymentStatus?: string;
  teachingEventId?: string;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface TeachingEventFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  category?: string;
  type?: string;
  eventType?: 'Online' | 'Offline';
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
