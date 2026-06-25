import mongoose, { Document, Schema } from "mongoose";
import logger from "../config/logger";

// Venue-specific interfaces moved from Venue.ts
export interface ICheckInGate {
  gateName: string;
  gateCode: string;
  isActive: boolean;
  assignedEmployees?: mongoose.Types.ObjectId[];
  coordinates?: {
    lat: number;
    lng: number;
  };
  description?: string;
}

export interface IAccessRule {
  ticketType: string;
  allowedGates?: string[];
  timeRestrictions?: {
    startTime: string;
    endTime: string;
  };
  specialConditions?: string[];
}

export interface IOperatingHours {
  day:
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";
  openTime: string;
  closeTime: string;
  isClosed: boolean;
}

export interface IEvent extends Document {
  // Core Event Info
  title: string;
  description: string;
  shortDescription?: string;
  category: string;
  type:
  | "Olympiad"
  | "Championship"
  | "Competition"
  | "Event"
  | "Course"
  | "Venue"
  | "Workshop"
  | "Class"
  | "Bootcamp"
  | "Masterclass";
  venueType: "Indoor" | "Outdoor" | "Online" | "Offline";
  customCSS?: string;

  // Educational Content (for Course, Class, etc.)
  syllabus?: Array<{
    title: string;
    description: string;
    duration?: string;
    lessons?: Array<{
      title: string;
      duration?: string;
    }>;
  }>;
  subject?: string;
  topic?: string;
  introVideo?: string;
  teacherId?: mongoose.Types.ObjectId;

  meetingLink?: string; // Required when venueType='Online'
  meetingPassword?: string; // Optional password for online meeting link
  isFreeEvent?: boolean; // If true, no payment required – free registration
  // Competition-specific fields
  competitionFormat?: "Individual" | "Team";
  teamSize?: number;
  // Educational event fields (Course / Workshop)
  programConfig?: {
    isProgramBlock: boolean;
    introClasses: number;
    paidClasses: number;
    pricePerClass: number;
    totalProgramPrice: number;
  };
  skillLevel?: "All Levels" | "Beginner" | "Intermediate" | "Advanced";
  prerequisites?: string;
  ageRange: [number, number];
  grades?: string[];
  location: {
    country?: string; // ISO 3166-1 alpha-2 code (e.g., 'AE', 'US')
    state?: string; // Added for Venue compatibility
    city: string;
    address: string;
    zipCode?: string; // Added for Venue compatibility
    coordinates: {
      lat: number;
      lng: number;
    };
  };
  vendorId?: mongoose.Types.ObjectId;
  price: number;
  currency: string;
  isApproved: boolean;
  isActive: boolean;
  requirePhoneVerification: boolean;
  status: "draft" | "published" | "archived" | "pending" | "rejected";
  affiliateCode?: string;
  tags: string[];
  dateSchedule: Array<{
    date?: Date; // Legacy field for backward compatibility
    startDate?: Date;
    endDate?: Date;
    startTime?: string; // Time in HH:mm format (e.g., "09:00")
    endTime?: string; // Time in HH:mm format (e.g., "17:00")
    availableSeats: number;
    totalSeats?: number;
    soldSeats?: number;
    reservedSeats?: number;
    price: number;
    ratePerClass?: number; // Optional rate per class for breakdown
    sessionType?: string; // e.g. "Intro", "Full Program"
    unlimitedSeats?: boolean; // For online events with no capacity limit
    isSpecialDate?: boolean; // Flag for special date pricing
    specialDates?: Date[]; // Array of specific dates for special pricing
    priority?: number; // Higher priority overrides base schedules
    isOverride?: boolean; // When true, this schedule takes precedence over overlapping schedules
    timeSlots?: Array<{
      date: Date; // Specific date for this slot
      startTime: string; // HH:mm format
      endTime: string; // HH:mm format
      availableSeats: number;
      soldSeats?: number;
      price?: number; // Optional override price per slot
    }>;
    _id?: mongoose.Types.ObjectId;
  }>;
  seoMeta: {
    title: string;
    description: string;
    keywords: string[];
  };
  faqs: Array<{
    question: string;
    answer: string;
    _id?: mongoose.Types.ObjectId;
  }>;
  viewsCount: number;
  isFeatured: boolean; // virtual — true when featuredUntil > now
  promotionTier?: "boost" | "featured" | "premium";
  featuredUntil?: Date;
  promotionPaidAt?: Date;
  images: string[]; // OLD - deprecated, keep for backward compatibility
  imageAssets?: mongoose.Types.ObjectId[]; // NEW - shadow field for migration
  bookingAttachments?: Array<{
    originalName?: string;
    filename?: string;
    url: string;
    size?: number;
    mimetype?: string;
    provider?: "local" | "cloudinary";
    publicId?: string;
    cloudinaryUrl?: string;
    uploadedAt?: Date;
  }>;
  isDeleted: boolean;
  deletedAt?: Date;
  reviewCount: number;
  averageRating: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  registrationConfig?: {
    enabled: boolean;
    fields: Array<{
      id: string;
      label: string;
      type:
      | "text"
      | "email"
      | "number"
      | "tel"
      | "textarea"
      | "dropdown"
      | "checkbox"
      | "radio"
      | "file"
      | "date";
      placeholder?: string;
      required: boolean;
      validation?: {
        pattern?: string;
        minLength?: number;
        maxLength?: number;
        min?: number;
        max?: number;
      };
      options?: string[]; // For dropdown/radio
      accept?: string[]; // For file uploads: ['image/*', 'application/pdf', '.zip']
      maxFileSize?: number; // In bytes
      section?: string; // Group fields: "Personal Info", "Payment Details", etc.
      order: number;
      helpText?: string;
      _id?: mongoose.Types.ObjectId;
    }>;
    maxRegistrations?: number;
    registrationDeadline?: Date;
    requiresApproval: boolean;
    emailNotifications: {
      toVendor: boolean;
      toParticipant: boolean;
      customMessage?: string;
    };
  };
  // Cancellation fields
  cancellationStatus: "active" | "cancelled";
  cancellationReason?: string;
  cancelledAt?: Date;
  cancelledBy?: mongoose.Types.ObjectId;
  cancellationNotification?: {
    notified: boolean;
    notifiedAt?: Date;
    totalAttendees: number;
    notifiedCount: number;
    failedCount: number;
  };

  // Affiliate Event fields
  isAffiliateEvent: boolean;
  externalBookingLink?: string;
  affiliateClickTracking: {
    totalClicks: number;
    uniqueClicks: number;
    lastClickedAt?: Date;
  };
  claimStatus: "unclaimed" | "claimed" | "not_claimable";
  claimedBy?: mongoose.Types.ObjectId;
  claimedAt?: Date;
  originalAffiliateVendorId?: mongoose.Types.ObjectId;
  googlePlaceId?: string;

  // Combined ratings (platform + Google)
  combinedRating: number;
  combinedReviewCount: number;
  googleRating: number;
  googleReviewCount: number;

  // SEO-friendly URL slug
  slug: string;

  // Review link system
  reviewLink?: string;
  reviewToken?: string;

  // Gallery
  galleryId?: mongoose.Types.ObjectId;

  // Certificate types - multiple templates per event (Participation, Winner, Merit, etc.)
  certificateTypes?: Array<{
    name: string;
    slug: string;
    templateId?: mongoose.Types.ObjectId;
    isDefault?: boolean;
    description?: string;
    criteria?: string;
    sortOrder?: number;
  }>;

  createdAt: Date;
  updatedAt: Date;

  // Venue-specific fields
  operatingHours?: IOperatingHours[];
  timezone?: string;
  checkInGates?: ICheckInGate[];
  accessRules?: IAccessRule[];
  facilities?: string[];
  amenities?: string[];
  wifiCredentials?: {
    ssid?: string;
    password?: string;
  };
  safetyFeatures?: string[];
  certifications?: string[];
  insuranceInfo?: {
    provider?: string;
    policyNumber?: string;
    expiryDate?: Date;
  };
  capacity?: number;

  pastEventMemories?: Array<{
    image: string;
    caption?: string;
    participantName?: string;
  }>;

  // Methods
  hasAvailableSeats(date: Date, quantity?: number): boolean;
  reduceSeats(date: Date, quantity: number): boolean;
  getEndDate(): Date | null;
  isExpired(): boolean;
  cancelEvent(
    reason: string,
    cancelledBy: mongoose.Types.ObjectId,
  ): Promise<IEvent>;
  isCancellable(): boolean;

  // Venue specific methods
  isOpenAt(dateTime: Date): boolean;
  getActiveGates(): ICheckInGate[];
}

const eventSchema = new Schema<IEvent>(
  {
    title: {
      type: String,
      required: [true, "Event title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    description: {
      type: String,
      required: [true, "Event description is required"],
      // maxlength removed to support rich HTML content with images, videos, and formatting
      // trim removed - HTML content must be preserved
    },
    shortDescription: {
      type: String,
      required: [true, "Short description is required"],
      trim: true,
      maxlength: [500, "Short description cannot exceed 500 characters"],
    },
    customCSS: {
      type: String,
      required: false,
      default: null,
      // Custom CSS per event for WordPress-like styling control
      // Sanitized server-side to remove dangerous properties (@import, external url(), javascript:)
      maxlength: [50000, "Custom CSS cannot exceed 50,000 characters"],
    },
    category: {
      type: String,
      required: [true, "Event category is required"],
      trim: true,
    },
    type: {
      type: String,
      enum: [
        "Olympiad",
        "Championship",
        "Competition",
        "Event",
        "Course",
        "Venue",
        "Workshop",
        "Class",
        "Bootcamp",
        "Masterclass",
      ],
      required: [true, "Event type is required"],
    },
    // Educational event fields
    syllabus: [
      {
        title: { type: String, required: true },
        description: { type: String, required: true },
        duration: String,
        lessons: [
          {
            title: { type: String, required: true },
            duration: String,
          },
        ],
      },
    ],
    subject: { type: String, trim: true },
    topic: { type: String, trim: true },
    introVideo: { type: String, trim: true },
    teacherId: {
      type: Schema.Types.ObjectId,
      ref: "Teacher",
      required: false, // Optional, only for teaching events if needed
    },
    venueType: {
      type: String,
      enum: ["Indoor", "Outdoor", "Online", "Offline"],
      required: [true, "Venue type is required"],
    },
    meetingLink: {
      type: String,
      trim: true,
      validate: {
        validator: function (this: any, v: string) {
          if (!v) return true;
          return /^https?:\/\/.+/.test(v);
        },
        message: "Meeting link must be a valid URL",
      },
    },
    meetingPassword: {
      type: String,
      trim: true,
      maxlength: [200, "Meeting password cannot exceed 200 characters"],
    },
    isFreeEvent: {
      type: Boolean,
      default: false,
    },
    competitionFormat: {
      type: String,
      enum: ["Individual", "Team"],
    },
    teamSize: {
      type: Number,
      min: [1, "Team size must be at least 1"],
    },
    programConfig: {
      isProgramBlock: { type: Boolean, default: false },
      introClasses: { type: Number, default: 0 },
      paidClasses: { type: Number, default: 0 },
      pricePerClass: { type: Number, default: 0 },
      totalProgramPrice: { type: Number, default: 0 },
    },
    skillLevel: {
      type: String,
      enum: ["All Levels", "Beginner", "Intermediate", "Advanced"],
    },
    prerequisites: {
      type: String,
      trim: true,
      maxlength: [2000, "Prerequisites cannot exceed 2000 characters"],
    },
    ageRange: {
      type: [Number],
      validate: {
        validator: function (v: number[]) {
          return v.length === 2 && v[0] >= 0 && v[1] >= v[0] && v[1] <= 100;
        },
        message: "Age range must be [min, max] where 0 <= min <= max <= 100",
      },
      required: [true, "Age range is required"],
    },
    grades: {
      type: [String],
      default: [],
    },
    location: {
      country: {
        type: String,
        trim: true,
        uppercase: true,
        minlength: [2, "Country code must be 2 characters"],
        maxlength: [2, "Country code must be 2 characters"],
      },
      city: {
        type: String,
        required: false, // Enforced conditionally: required for Offline, not for Online
        trim: true,
      },
      state: {
        type: String,
        trim: true,
      },
      address: {
        type: String,
        // Optional - conditional validation in validators (required for non-Online events)
        trim: true,
      },
      zipCode: {
        type: String,
        trim: true,
      },
      coordinates: {
        lat: {
          type: Number,
          // Optional - conditional validation in validators (required for non-Online events)
          min: [-90, "Latitude must be between -90 and 90"],
          max: [90, "Latitude must be between -90 and 90"],
        },
        lng: {
          type: Number,
          // Optional - conditional validation in validators (required for non-Online events)
          min: [-180, "Longitude must be between -180 and 180"],
          max: [180, "Longitude must be between -180 and 180"],
        },
      },
    },
    vendorId: {
      type: Schema.Types.ObjectId,
      ref: "Vendor", // Changed from 'User' to 'Vendor'
      required: false, // Optional: either vendorId OR teacherId must be present
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },
    currency: {
      type: String,
      required: [true, "Currency is required"],
      enum: ["AED", "EGP", "CAD", "USD"],
      default: "AED",
    },
    isApproved: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    requirePhoneVerification: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["draft", "published", "archived", "pending", "rejected"],
      default: "pending",
    },
    affiliateCode: {
      type: String,
      trim: true,
      sparse: true,
      unique: true,
    },
    tags: {
      type: [String],
      default: [],
      validate: {
        validator: function (v: string[]) {
          return v.length <= 20;
        },
        message: "Cannot have more than 20 tags",
      },
    },
    dateSchedule: [
      {
        // Legacy single date field (for backward compatibility)
        date: {
          type: Date,
          required: false,
        },
        // New start/end date fields (current format)
        startDate: {
          type: Date,
          required: false,
        },
        endDate: {
          type: Date,
          required: false,
        },
        // Time fields (stored as strings in HH:mm format)
        startTime: {
          type: String,
          required: false,
        },
        endTime: {
          type: String,
          required: false,
        },
        // Seat management
        availableSeats: {
          type: Number,
          required: [true, "Available seats is required"],
          min: [0, "Available seats cannot be negative"],
        },
        totalSeats: {
          type: Number,
          min: [0, "Total seats cannot be negative"],
        },
        soldSeats: {
          type: Number,
          default: 0,
          min: [0, "Sold seats cannot be negative"],
        },
        reservedSeats: {
          type: Number,
          default: 0,
          min: [0, "Reserved seats cannot be negative"],
        },
        price: {
          type: Number,
          required: [true, "Schedule price is required"],
          min: [0, "Price cannot be negative"],
        },
        ratePerClass: {
          type: Number,
          min: [0, "Rate per class cannot be negative"],
        },
        sessionType: {
          type: String,
          trim: true,
        },
        // Unlimited capacity flag (for online events)
        unlimitedSeats: {
          type: Boolean,
          default: false,
        },
        // Special date pricing fields
        isSpecialDate: {
          type: Boolean,
          default: false,
        },
        specialDates: {
          type: [Date],
          default: [],
        },
        priority: {
          type: Number,
          default: 0,
        },
        isOverride: {
          type: Boolean,
          default: false,
        },
        // Multiple time slots per date
        timeSlots: [
          {
            date: {
              type: Date,
              required: false,
            },
            startTime: {
              type: String,
              required: false,
            },
            endTime: {
              type: String,
              required: false,
            },
            availableSeats: {
              type: Number,
              min: [0, "Available seats cannot be negative"],
            },
            soldSeats: {
              type: Number,
              default: 0,
              min: [0, "Sold seats cannot be negative"],
            },
            price: {
              type: Number,
              min: [0, "Price cannot be negative"],
            },
          },
        ],
      },
    ],
    seoMeta: {
      title: {
        type: String,
        maxlength: [60, "SEO title cannot exceed 60 characters"],
      },
      description: {
        type: String,
        maxlength: [160, "SEO description cannot exceed 160 characters"],
      },
      keywords: {
        type: [String],
        default: [],
      },
    },
    faqs: [
      {
        question: {
          type: String,
          required: [true, "FAQ question is required"],
          maxlength: [200, "Question cannot exceed 200 characters"],
        },
        answer: {
          type: String,
          required: [true, "FAQ answer is required"],
          maxlength: [1000, "Answer cannot exceed 1000 characters"],
        },
      },
    ],
    viewsCount: {
      type: Number,
      default: 0,
      min: [0, "Views count cannot be negative"],
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    promotionTier: {
      type: String,
      enum: ["boost", "featured", "premium"],
    },
    featuredUntil: {
      type: Date,
    },
    promotionPaidAt: {
      type: Date,
    },
    images: {
      type: [String],
      default: [],
      required: false, // Optional during migration
      validate: {
        validator: function (v: string[]) {
          return v.length <= 10;
        },
        message: "Cannot have more than 10 images",
      },
    },
    imageAssets: [
      {
        type: Schema.Types.ObjectId,
        ref: "MediaAsset",
      },
    ],
    bookingAttachments: [
      {
        originalName: {
          type: String,
          trim: true,
        },
        filename: {
          type: String,
          trim: true,
        },
        url: {
          type: String,
          trim: true,
        },
        size: {
          type: Number,
          min: [0, "Attachment size cannot be negative"],
        },
        mimetype: {
          type: String,
          trim: true,
        },
        provider: {
          type: String,
          enum: ["local", "cloudinary"],
        },
        publicId: {
          type: String,
          trim: true,
        },
        cloudinaryUrl: {
          type: String,
          trim: true,
        },
        uploadedAt: {
          type: Date,
        },
      },
    ],
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
    },
    // Cancellation fields
    cancellationStatus: {
      type: String,
      enum: ["active", "cancelled"],
      default: "active",
    },
    cancellationReason: {
      type: String,
      maxlength: [500, "Cancellation reason cannot exceed 500 characters"],
    },
    cancelledAt: {
      type: Date,
    },
    cancelledBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    cancellationNotification: {
      notified: {
        type: Boolean,
        default: false,
      },
      notifiedAt: {
        type: Date,
      },
      totalAttendees: {
        type: Number,
        default: 0,
      },
      notifiedCount: {
        type: Number,
        default: 0,
      },
      failedCount: {
        type: Number,
        default: 0,
      },
    },
    reviewCount: {
      type: Number,
      default: 0,
      min: [0, "Review count cannot be negative"],
    },
    averageRating: {
      type: Number,
      default: 0,
      min: [0, "Rating cannot be negative"],
      max: [5, "Rating cannot exceed 5"],
    },
    ratingDistribution: {
      type: {
        1: { type: Number, default: 0, min: 0 },
        2: { type: Number, default: 0, min: 0 },
        3: { type: Number, default: 0, min: 0 },
        4: { type: Number, default: 0, min: 0 },
        5: { type: Number, default: 0, min: 0 },
      },
      default: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    },
    pastEventMemories: [
      {
        image: {
          type: String,
          required: [true, "Memory image is required"],
        },
        caption: {
          type: String,
          trim: true,
          maxlength: [1000, "Caption cannot exceed 1000 characters"],
        },
        participantName: {
          type: String,
          trim: true,
          maxlength: [100, "Participant name cannot exceed 100 characters"],
        },
      },
    ],
    registrationConfig: {
      type: {
        enabled: {
          type: Boolean,
          default: false,
        },
        fields: [
          {
            id: {
              type: String,
              required: true,
            },
            label: {
              type: String,
              required: true,
              trim: true,
              maxlength: [200, "Field label cannot exceed 200 characters"],
            },
            type: {
              type: String,
              enum: [
                "text",
                "email",
                "number",
                "tel",
                "textarea",
                "dropdown",
                "checkbox",
                "radio",
                "file",
                "date",
                "address",
                "website",
                "datetime",
                "time",
                "country",
                "city",
                "html",
                "pagebreak",
              ],
              required: true,
            },
            placeholder: {
              type: String,
              trim: true,
            },
            required: {
              type: Boolean,
              default: false,
            },
            validation: {
              pattern: String,
              minLength: Number,
              maxLength: Number,
              min: Number,
              max: Number,
            },
            options: {
              type: [String],
              default: [],
            },
            accept: {
              type: [String],
              default: [],
            },
            maxFileSize: {
              type: Number,
              default: 5242880, // 5MB default
            },
            section: {
              type: String,
              trim: true,
            },
            order: {
              type: Number,
              required: true,
            },
            helpText: {
              type: String,
              trim: true,
            },
          },
        ],
        maxRegistrations: {
          type: Number,
          min: [0, "Max registrations cannot be negative"],
        },
        registrationDeadline: {
          type: Date,
        },
        requiresApproval: {
          type: Boolean,
          default: false,
        },
        emailNotifications: {
          toVendor: {
            type: Boolean,
            default: true,
          },
          toParticipant: {
            type: Boolean,
            default: true,
          },
          customMessage: {
            type: String,
            trim: true,
          },
        },
      },
      required: false,
      default: undefined,
    },
    // Affiliate Event fields
    isAffiliateEvent: {
      type: Boolean,
      default: false,
    },
    externalBookingLink: {
      type: String,
      trim: true,
      validate: {
        validator: function (this: IEvent, v: string) {
          // If it's an affiliate event AND it's not claimed, the link is required
          if (this.isAffiliateEvent && this.claimStatus !== "claimed" && !v)
            return false;
          if (!v) return true;
          return /^https?:\/\/.+/.test(v);
        },
        message:
          "External booking link is required for unclaimed affiliate events",
      },
    },
    affiliateClickTracking: {
      totalClicks: {
        type: Number,
        default: 0,
        min: [0, "Total clicks cannot be negative"],
      },
      uniqueClicks: {
        type: Number,
        default: 0,
        min: [0, "Unique clicks cannot be negative"],
      },
      lastClickedAt: Date,
    },
    claimStatus: {
      type: String,
      enum: {
        values: ["unclaimed", "claimed", "not_claimable"],
        message: "Claim status must be unclaimed, claimed, or not_claimable",
      },
      default: "not_claimable",
    },
    claimedBy: {
      type: Schema.Types.ObjectId,
      ref: "Vendor",
    },
    claimedAt: Date,
    originalAffiliateVendorId: {
      type: Schema.Types.ObjectId,
      ref: "Vendor",
    },
    googlePlaceId: {
      type: String,
      trim: true,
      sparse: true,
      validate: {
        validator: function (v: string) {
          if (!v) return true;
          // Google Place IDs are alphanumeric with hyphens/underscores, min 10 chars
          return /^[A-Za-z0-9_-]{10,}$/.test(v);
        },
        message: "Invalid Google Place ID format",
      },
    },

    // Combined ratings (platform + Google)
    combinedRating: {
      type: Number,
      default: 0,
      min: [0, "Rating cannot be negative"],
      max: [5, "Rating cannot exceed 5"],
    },
    combinedReviewCount: {
      type: Number,
      default: 0,
      min: [0, "Review count cannot be negative"],
    },
    googleRating: {
      type: Number,
      default: 0,
      min: [0, "Rating cannot be negative"],
      max: [5, "Rating cannot exceed 5"],
    },
    googleReviewCount: {
      type: Number,
      default: 0,
      min: [0, "Review count cannot be negative"],
    },
    reviewLink: { type: String },
    reviewToken: { type: String },
    galleryId: { type: Schema.Types.ObjectId, ref: "Gallery" },

    certificateTypes: [
      {
        name: {
          type: String,
          required: [true, "Certificate type name is required"],
          trim: true,
          maxlength: [100, "Certificate type name cannot exceed 100 characters"],
        },
        slug: {
          type: String,
          required: [true, "Certificate type slug is required"],
          lowercase: true,
          trim: true,
        },
        templateId: { type: Schema.Types.ObjectId, ref: "CertTemplate" },
        isDefault: { type: Boolean, default: false },
        description: { type: String, trim: true, maxlength: [500, "Description cannot exceed 500 characters"] },
        criteria: { type: String, trim: true, maxlength: [1000, "Criteria cannot exceed 1000 characters"] },
        sortOrder: { type: Number, default: 0 },
      },
    ],
    slug: {
      type: String,
      required: false, // Auto-generated by pre-save middleware
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      maxlength: [250, "Slug cannot exceed 250 characters"],
    },

    // Venue-specific fields
    operatingHours: [
      {
        day: {
          type: String,
          enum: [
            "monday",
            "tuesday",
            "wednesday",
            "thursday",
            "friday",
            "saturday",
            "sunday",
          ],
          required: true,
        },
        openTime: {
          type: String,
          match: [
            /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
            "Open time must be in HH:MM format",
          ],
        },
        closeTime: {
          type: String,
          match: [
            /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
            "Close time must be in HH:MM format",
          ],
        },
        isClosed: {
          type: Boolean,
          default: false,
        },
      },
    ],
    timezone: {
      type: String,
      default: "Asia/Dubai", // Kidrove is UAE-primary platform
    },
    checkInGates: [
      {
        gateName: {
          type: String,
          required: [true, "Gate name is required"],
          trim: true,
        },
        gateCode: {
          type: String,
          required: [true, "Gate code is required"],
          // unique: true, // Cannot enforce unique globally for all events if subdocuments
          trim: true,
          uppercase: true,
        },
        isActive: {
          type: Boolean,
          default: true,
        },
        assignedEmployees: [
          {
            type: Schema.Types.ObjectId,
            ref: "Employee",
          },
        ],
        coordinates: {
          lat: Number,
          lng: Number,
        },
        description: {
          type: String,
          maxlength: [200, "Gate description cannot exceed 200 characters"],
        },
      },
    ],
    accessRules: [
      {
        ticketType: {
          type: String,
          required: [true, "Ticket type is required"],
          trim: true,
        },
        allowedGates: [String],
        timeRestrictions: {
          startTime: {
            type: String,
            match: [
              /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
              "Start time must be in HH:MM format",
            ],
          },
          endTime: {
            type: String,
            match: [
              /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
              "End time must be in HH:MM format",
            ],
          },
        },
        specialConditions: [String],
      },
    ],
    facilities: {
      type: [String],
      default: [],
      validate: {
        validator: function (v: string[]) {
          return v.length <= 50;
        },
        message: "Cannot have more than 50 facilities",
      },
    },
    amenities: {
      type: [String],
      default: [],
    },
    wifiCredentials: {
      ssid: {
        type: String,
        trim: true,
      },
      password: {
        type: String,
        select: false,
      },
    },
    safetyFeatures: {
      type: [String],
      default: [],
    },
    certifications: {
      type: [String],
      default: [],
    },
    insuranceInfo: {
      provider: String,
      policyNumber: String,
      expiryDate: Date,
    },
    capacity: {
      type: Number,
      min: [1, "Capacity must be at least 1"],
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret: any) {
        delete ret.__v;
        return ret;
      },
      virtuals: true,
    },
    toObject: { virtuals: true },
  },
);

// Venue instance methods
eventSchema.methods.isOpenAt = function (dateTime: Date): boolean {
  if (!this.operatingHours || this.operatingHours.length === 0) return false;

  const dayNames = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  const dayName = dayNames[dateTime.getDay()];

  const daySchedule = this.operatingHours.find(
    (h: IOperatingHours) => h.day === dayName,
  );

  if (!daySchedule || daySchedule.isClosed) {
    return false;
  }

  const currentTime = dateTime.toTimeString().substring(0, 5); // HH:MM format
  return (
    currentTime >= daySchedule.openTime && currentTime <= daySchedule.closeTime
  );
};

eventSchema.methods.getActiveGates = function (): ICheckInGate[] {
  if (!this.checkInGates) return [];
  return this.checkInGates.filter((gate: ICheckInGate) => gate.isActive);
};

// Original indexes for performance
eventSchema.index({ vendorId: 1 });
eventSchema.index({ isApproved: 1, isDeleted: 1 });
eventSchema.index({ isActive: 1, isApproved: 1, isDeleted: 1 });
eventSchema.index({ cancellationStatus: 1 }); // For filtering cancelled events
eventSchema.index({ status: 1 });
eventSchema.index({ venueType: 1 }); // For online/offline filtering
eventSchema.index({ category: 1 });
eventSchema.index({ type: 1 });
eventSchema.index({ "location.city": 1 });
eventSchema.index({ "location.country": 1 }); // For filtering by country
eventSchema.index({ price: 1 });
eventSchema.index({ currency: 1 });
eventSchema.index({ createdAt: -1 });
eventSchema.index({ isFeatured: 1, isApproved: 1, isDeleted: 1 });
eventSchema.index({ tags: 1 });
eventSchema.index({ averageRating: -1 });
eventSchema.index({ reviewCount: -1 });
eventSchema.index({ averageRating: -1, reviewCount: -1 });
eventSchema.index({ combinedRating: -1 });
eventSchema.index({ combinedReviewCount: -1 });
eventSchema.index({ combinedRating: -1, combinedReviewCount: -1 });
eventSchema.index({
  isApproved: 1,
  isActive: 1,
  status: 1,
  isDeleted: 1,
  createdAt: -1,
}); // Optimized for default homepage query
eventSchema.index({
  isApproved: 1,
  isActive: 1,
  status: 1,
  isDeleted: 1,
  "dateSchedule.startDate": 1,
}); // Optimized for date sorting
eventSchema.index({
  isApproved: 1,
  isActive: 1,
  status: 1,
  isDeleted: 1,
  category: 1,
}); // Optimized for category filtering

// Additional compound indexes for KVM1 optimization - faster admin dashboard queries
eventSchema.index({ viewsCount: -1, createdAt: -1 }); // Trending sort (homepage + search "Most Popular")
eventSchema.index({ isApproved: 1, status: 1, createdAt: -1 }); // Dashboard event stats by approval and status
eventSchema.index({ vendorId: 1, isApproved: 1, createdAt: -1 }); // Vendor-specific event queries
eventSchema.index({ teacherId: 1, isApproved: 1, createdAt: -1 }); // Teacher-specific event queries
// Compound indexes for filtered event listings (Phase 2 optimization)
eventSchema.index({
  isApproved: 1,
  isActive: 1,
  isDeleted: 1,
  category: 1,
  "location.city": 1,
}); // For filtered listings with category + city

eventSchema.index({
  vendorId: 1,
  isDeleted: 1,
  status: 1,
  createdAt: -1,
}); // For vendor dashboard with status filtering

eventSchema.index({
  isFeatured: 1,
  isApproved: 1,
  isActive: 1,
  isDeleted: 1,
  createdAt: -1,
}); // For featured event queries with time-based sorting

eventSchema.index({
  isApproved: 1,
  isActive: 1,
  isDeleted: 1,
  "location.country": 1,
  "location.city": 1,
  category: 1,
}); // For geographic + category filtering

eventSchema.index({
  isApproved: 1,
  isDeleted: 1,
  price: 1,
  currency: 1,
}); // For price range filtering

// ✅ PHASE 2.2: Advanced compound indexes for high-traffic query patterns
// These indexes optimize the most common filtered queries from controllers

// Public filtered event listings (event.controller.ts:184-192)
// Covers: isApproved, isActive, isDeleted, status, category, location.city, sorted by createdAt
eventSchema.index(
  {
    isApproved: 1,
    isActive: 1,
    isDeleted: 1,
    status: 1,
    category: 1,
    "location.city": 1,
    createdAt: -1,
  },
  { name: "public_filtered_events_optimized" },
);

// Vendor dashboard with comprehensive filters (event.controller.ts:548-556)
// Covers: vendorId, isDeleted, isApproved, sorted by createdAt
eventSchema.index(
  {
    vendorId: 1,
    isDeleted: 1,
    isApproved: 1,
    status: 1,
    createdAt: -1,
  },
  { name: "vendor_dashboard_comprehensive" },
);

// Admin moderation queue (admin.event.controller.ts)
// Covers: isApproved, status, isDeleted, sorted by createdAt for moderation workflows
eventSchema.index(
  {
    isApproved: 1,
    status: 1,
    isDeleted: 1,
    createdAt: -1,
  },
  { name: "admin_moderation_queue_optimized" },
);

// Price range with active filters (common e-commerce pattern)
// Covers: isApproved, isActive, isDeleted, price range, currency
eventSchema.index(
  {
    isApproved: 1,
    isActive: 1,
    isDeleted: 1,
    currency: 1,
    price: 1,
  },
  { name: "price_range_active_events" },
);

// Affiliate event indexes
eventSchema.index({ isAffiliateEvent: 1, claimStatus: 1 }); // For filtering affiliate events by claim status
eventSchema.index({ claimedBy: 1 }); // For vendor's claimed events
eventSchema.index({ "affiliateClickTracking.totalClicks": -1 }); // For analytics and sorting by popularity

// Google Maps integration index
eventSchema.index({ googlePlaceId: 1 }); // For fetching events by Google Place ID

// Promotion index
eventSchema.index({ featuredUntil: 1, isApproved: 1, isDeleted: 1 });

// Text search index
eventSchema.index({
  title: "text",
  description: "text",
  "location.city": "text",
  "location.address": "text",
  tags: "text",
});

// Helper function to generate slug from title
const generateSlug = (title: string): string => {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single hyphen
    .substring(0, 200); // Limit length
};

// Pre-save middleware to generate slug, affiliate code and set status
eventSchema.pre("save", async function (this: IEvent, next) {
  // Generate affiliate code if missing
  if (!this.affiliateCode) {
    this.affiliateCode = `EVT-${(this._id as any).toString().slice(-8).toUpperCase()}`;
  }

  // Generate slug if new or title changed
  if (this.isNew || this.isModified("title")) {
    const baseSlug = generateSlug(this.title);
    let slug = baseSlug;
    let counter = 1;
    const MAX_ATTEMPTS = 100; // ✅ Prevent infinite loops

    // ✅ OPTIMIZATION: Check for slug uniqueness with retry limit
    // Handles race conditions where multiple events with same title are created concurrently
    while (counter <= MAX_ATTEMPTS) {
      try {
        // Use .lean() for faster read-only uniqueness check
        const existing = await mongoose
          .model("Event")
          .findOne({
            slug,
            _id: { $ne: this._id },
          })
          .lean();

        if (!existing) {
          this.slug = slug;
          break;
        }

        // Slug exists, try next increment
        slug = `${baseSlug}-${counter}`;
        counter++;
      } catch (error) {
        // Handle transient errors (network, timeout)
        if (counter >= MAX_ATTEMPTS) {
          // Fallback: append timestamp to guarantee uniqueness
          this.slug = `${baseSlug}-${Date.now()}`;
          break;
        }
        counter++;
      }
    }

    // Safety check: ensure slug was set
    if (!this.slug) {
      this.slug = `${baseSlug}-${Date.now()}`;
    }
  }

  // Auto-set status based on approval state
  if (this.isModified("isApproved")) {
    if (this.isApproved) {
      this.status = "published";
    } else if (this.status === "published") {
      this.status = "rejected";
    }
  }

  next();
});

// Pre-validate middleware for diverse event type logic
eventSchema.pre("validate", function (next) {
  // 1. Online Events - No specific requirements

  // 2. Offline Events must have at least a city
  if (this.venueType === "Offline" || this.venueType === "Indoor" || this.venueType === "Outdoor") {
    if (!this.location || !this.location.city) {
      this.invalidate("location.city", "City is required for in-person events");
    }
    // Address is optional — some venues only have a city-level location
  }
  // Online events do not require a physical location

  // 3. Affiliate Events must have external link
  if (this.isAffiliateEvent && !this.externalBookingLink) {
    this.invalidate(
      "externalBookingLink",
      "External booking link is required for affiliate events",
    );
  }

  // 4. Ensure either teacherId OR vendorId is present (but not both for teaching events)
  if (!this.teacherId && !this.vendorId) {
    this.invalidate(
      "teacherId",
      "Event must have either a teacherId or vendorId",
    );
    this.invalidate(
      "vendorId",
      "Event must have either a teacherId or vendorId",
    );
  }

  // 5. Teaching Events: should have teacherId, not vendorId
  const educationalTypes = [
    "Course",
    "Class",
    "Bootcamp",
    "Masterclass",
    "Workshop",
  ];
  if (educationalTypes.includes(this.type) && this.teacherId && this.vendorId) {
    this.invalidate(
      "teacherId",
      "Teaching events should have either teacherId OR vendorId, not both",
    );
    this.invalidate(
      "vendorId",
      "Teaching events should have either teacherId OR vendorId, not both",
    );
  }

  next();
});

// Post-save middleware to invalidate cache when event changes
eventSchema.post("save", async function (doc: IEvent) {
  try {
    // Import cache service and utilities dynamically to avoid circular dependencies
    const { cacheService } = await import("../services/cache.service");
    const { getEventCacheKey, getEventListCachePattern } =
      await import("../utils/event.utils");

    // Invalidate individual event cache
    const cacheKey = getEventCacheKey(doc._id.toString());
    await cacheService.delete(cacheKey);

    // If any public-facing field changed, invalidate event list caches
    const fieldsAffectingLists = [
      "isApproved",
      "isActive",
      "status",
      "isDeleted",
      "isFeatured",
    ];
    if (fieldsAffectingLists.some((field) => doc.isModified(field))) {
      const listPattern = getEventListCachePattern();
      await cacheService.deletePattern(listPattern);
    }
  } catch (error) {
    logger.error("Error invalidating event cache:", error);
    // Don't throw - cache invalidation failures shouldn't break saves
  }

  // Trigger collection sync if relevant fields changed
  try {
    const fieldsAffectingCollections = [
      "title",
      "description",
      "category",
      "type",
      "venueType",
      "price",
      "currency",
      "images",
      "imageAssets",
      "location",
      "dateSchedule",
      "ageRange",
      "isFeatured",
      "viewsCount",
      "averageRating",
      "combinedRating",
      "combinedReviewCount",
      "googleRating",
      "googleReviewCount",
      "isApproved",
      "isActive",
      "isDeleted",
      "status",
    ];

    const hasRelevantChanges = fieldsAffectingCollections.some((field) =>
      doc.isModified(field),
    );

    if (!hasRelevantChanges) return;

    const { collectionSyncQueue, areQueuesEnabled } =
      await import("../config/queue");

    if (!areQueuesEnabled || !collectionSyncQueue) {
      return; // Skip sync if queues disabled
    }

    const shouldRemove = !doc.isApproved || !doc.isActive || doc.isDeleted;

    await collectionSyncQueue.add(
      shouldRemove ? "removeEvent" : "syncEvent",
      {
        type: shouldRemove ? "removeEvent" : "syncEvent",
        eventId: doc._id.toString(),
      },
      {
        jobId: `${shouldRemove ? "remove" : "sync"}-event-${doc._id}`,
        removeOnComplete: true,
        removeOnFail: false,
      },
    );
  } catch (error) {
    logger.error("Error queueing collection sync:", error);
    // Don't throw - collection sync failures shouldn't break event saves
  }
});

// Post-remove middleware to invalidate cache when event is deleted
eventSchema.post("findOneAndUpdate", async function (doc) {
  if (!doc) return;

  try {
    const { cacheService } = await import("../services/cache.service");
    const { getEventCacheKey, getEventListCachePattern } =
      await import("../utils/event.utils");

    // Invalidate individual event cache
    const cacheKey = getEventCacheKey(doc._id.toString());
    await cacheService.delete(cacheKey);

    // Invalidate event list caches
    const listPattern = getEventListCachePattern();
    await cacheService.deletePattern(listPattern);
  } catch (error) {
    logger.error("Error invalidating event cache after update:", error);
  }
});

// Post-delete middleware to invalidate cache when event is deleted
eventSchema.post("findOneAndDelete", async function (doc) {
  if (!doc) return;

  try {
    const { cacheService } = await import("../services/cache.service");
    const { getEventCacheKey, getEventListCachePattern } =
      await import("../utils/event.utils");

    // Invalidate individual event cache
    const cacheKey = getEventCacheKey(doc._id.toString());
    await cacheService.delete(cacheKey);

    // Invalidate event list caches
    const listPattern = getEventListCachePattern();
    await cacheService.deletePattern(listPattern);
  } catch (error) {
    logger.error("Error invalidating event cache after delete:", error);
  }

  // Trigger collection sync to remove deleted event
  try {
    const { collectionSyncQueue, areQueuesEnabled } =
      await import("../config/queue");

    if (!areQueuesEnabled || !collectionSyncQueue) {
      return;
    }

    await collectionSyncQueue.add(
      "removeEvent",
      {
        type: "removeEvent",
        eventId: doc._id.toString(),
      },
      {
        jobId: `remove-event-${doc._id}`,
        removeOnComplete: true,
      },
    );
  } catch (error) {
    logger.error("Error queueing collection removal:", error);
  }
});

// Post-updateMany middleware to invalidate cache for bulk updates
eventSchema.post("updateMany", async function () {
  try {
    const { cacheService } = await import("../services/cache.service");
    const { getEventListCachePattern } = await import("../utils/event.utils");

    // For bulk updates, we can't easily track individual events
    // So we invalidate all event list caches
    const listPattern = getEventListCachePattern();
    await cacheService.deletePattern(listPattern);
  } catch (error) {
    logger.error("Error invalidating cache after bulk update:", error);
  }

  // Trigger full collection reconciliation for bulk updates
  try {
    const { collectionSyncQueue, areQueuesEnabled } =
      await import("../config/queue");

    if (!areQueuesEnabled || !collectionSyncQueue) {
      return;
    }

    await collectionSyncQueue.add(
      "reconcileAll",
      {
        type: "reconcileAll",
      },
      {
        jobId: "reconcile-all-collections",
        delay: 60000, // Wait 1 minute to batch multiple bulk updates
        removeOnComplete: true,
      },
    );
  } catch (error) {
    logger.error("Error queueing reconciliation:", error);
  }
});

// Helper to check if a schedule contains a target date
const scheduleContainsDate = (s: any, targetDate: Date): boolean => {
  if (s.startDate && s.endDate) {
    // New format: check if target date falls within the start-end range
    const startDate = new Date(s.startDate);
    const endDate = new Date(s.endDate);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
    return targetDate >= startDate && targetDate <= endDate;
  } else if (s.date) {
    // Legacy format: exact date match
    const scheduleDate = new Date(s.date);
    scheduleDate.setHours(0, 0, 0, 0);
    return scheduleDate.getTime() === targetDate.getTime();
  } else if (s.startDate) {
    // Only startDate available: treat as single day event
    const startDate = new Date(s.startDate);
    startDate.setHours(0, 0, 0, 0);
    return startDate.getTime() === targetDate.getTime();
  }
  return false;
};

// Helper to find the best matching schedule (prefers override schedules)
const findBestScheduleForDate = (
  dateSchedule: any[],
  targetDate: Date,
): any => {
  const matchingSchedules = dateSchedule.filter((s: any) =>
    scheduleContainsDate(s, targetDate),
  );
  if (matchingSchedules.length === 0) return null;

  // Prefer override schedule if one exists
  const overrideSchedule = matchingSchedules.find(
    (s: any) => s.isOverride === true,
  );
  return overrideSchedule || matchingSchedules[0];
};

// Method to check if event has available seats for a specific date
eventSchema.methods.hasAvailableSeats = function (
  date: Date,
  quantity: number = 1,
): boolean {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    logger.error("Invalid date provided to hasAvailableSeats:", date);
    return false;
  }

  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0); // Normalize to start of day

  const schedule = findBestScheduleForDate(this.dateSchedule, targetDate);

  if (!schedule) return false;

  // Check timeSlots first (priority over base schedule)
  if (schedule.timeSlots && schedule.timeSlots.length > 0) {
    const matchingSlot = schedule.timeSlots.find((slot: any) => {
      const slotDate = new Date(slot.date);
      slotDate.setHours(0, 0, 0, 0);
      return slotDate.getTime() === targetDate.getTime();
    });

    if (matchingSlot) {
      return matchingSlot.availableSeats >= quantity;
    }
    return false; // Has slots but none match
  }

  // Fallback to base schedule logic
  // Unlimited seats always have availability
  if (schedule.unlimitedSeats) {
    logger.info("✓ Unlimited seats - no capacity check needed", {
      eventId: this._id,
      eventTitle: this.title,
      targetDate: targetDate.toISOString(),
    });
    return true;
  }

  return schedule.availableSeats >= quantity;
};

// Method to reduce available seats
eventSchema.methods.reduceSeats = function (
  date: Date,
  quantity: number,
): boolean {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    logger.error("Invalid date provided to reduceSeats:", {
      date,
      dateType: typeof date,
      isDateInstance: date instanceof Date,
      eventId: this._id,
      eventTitle: this.title,
      quantity,
    });
    return false;
  }

  if (!quantity || quantity <= 0) {
    logger.error("Invalid quantity provided to reduceSeats:", {
      quantity,
      quantityType: typeof quantity,
      eventId: this._id,
      eventTitle: this.title,
      date: date.toISOString(),
    });
    return false;
  }

  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0); // Normalize to start of day

  // Use helper to find best schedule (prefers override schedules)
  const schedule = findBestScheduleForDate(this.dateSchedule, targetDate);

  if (!schedule) {
    logger.error("No schedule found for date:", {
      eventId: this._id,
      eventTitle: this.title,
      targetDate: targetDate.toISOString(),
    });
    return false;
  }

  // Check timeSlots first (priority over base schedule)
  if (schedule.timeSlots && schedule.timeSlots.length > 0) {
    const matchingSlot = schedule.timeSlots.find((slot: any) => {
      const slotDate = new Date(slot.date);
      slotDate.setHours(0, 0, 0, 0);
      return slotDate.getTime() === targetDate.getTime();
    });

    if (matchingSlot) {
      if (matchingSlot.availableSeats >= quantity) {
        matchingSlot.availableSeats -= quantity;
        // Track sold seats (initialize if undefined)
        matchingSlot.soldSeats = (matchingSlot.soldSeats || 0) + quantity;
        return true;
      } else {
        logger.error("Insufficient seats in time slot:", {
          eventId: this._id,
          targetDate: targetDate.toISOString(),
          requested: quantity,
          available: matchingSlot.availableSeats,
        });
        return false;
      }
    }

    // Has slots but none match
    logger.error("No matching time slot found:", {
      eventId: this._id,
      targetDate: targetDate.toISOString(),
      slotsCount: schedule.timeSlots.length,
    });
    return false;
  }

  // Fallback to base schedule logic
  // Unlimited seats - no need to reduce availability, just track sold count
  if (schedule.unlimitedSeats) {
    // Still track soldSeats for analytics (initialize if undefined)
    schedule.soldSeats = (schedule.soldSeats || 0) + quantity;
    logger.info(
      "✓ Unlimited seats - seat reduction skipped, sold count updated",
      {
        eventId: this._id,
        eventTitle: this.title,
        targetDate: targetDate.toISOString(),
        quantity,
        newSoldSeats: schedule.soldSeats,
      },
    );
    return true;
  }

  if (schedule.availableSeats >= quantity) {
    schedule.availableSeats -= quantity;
    // Track soldSeats (initialize if undefined — handles events created before this field was added)
    schedule.soldSeats = (schedule.soldSeats || 0) + quantity;
    return true;
  }

  // Log failure details for debugging
  logger.error("Failed to reduce seats:", {
    eventId: this._id,
    eventTitle: this.title,
    targetDate: targetDate.toISOString(),
    quantity,
    foundSchedule: !!schedule,
    availableSeats: schedule?.availableSeats,
    scheduleCount: this.dateSchedule.length,
    scheduleDetails: this.dateSchedule.map((s: any) => ({
      _id: s._id,
      date: s.date,
      startDate: s.startDate,
      endDate: s.endDate,
      availableSeats: s.availableSeats,
      soldSeats: s.soldSeats,
    })),
  });

  return false;
};

// Method to get the end date of the event (latest scheduled date)
eventSchema.methods.getEndDate = function (): Date | null {
  if (!this.dateSchedule || this.dateSchedule.length === 0) {
    return null;
  }

  // Handle both 'date' field (schema definition) and 'endDate' field (actual data)
  const dates = this.dateSchedule.map((schedule: any) => {
    const dateToUse = schedule.endDate || schedule.date;
    return new Date(dateToUse);
  });

  return new Date(Math.max(...dates.map((date) => date.getTime())));
};

// Method to check if event is expired
eventSchema.methods.isExpired = function (): boolean {
  const endDate = this.getEndDate();
  if (!endDate) {
    return false;
  }

  const now = new Date();
  // Add 24 hours buffer after the last event date
  const expirationDate = new Date(endDate.getTime() + 24 * 60 * 60 * 1000);

  return now > expirationDate;
};

// Method to check if event can be cancelled
eventSchema.methods.isCancellable = function (): boolean {
  // Cannot cancel if already cancelled
  if (this.cancellationStatus === "cancelled") {
    return false;
  }

  // Cannot cancel draft or rejected events
  if (this.status === "draft" || this.status === "rejected") {
    return false;
  }

  // Cannot cancel if event has already started
  const now = new Date();
  const startDate =
    this.dateSchedule?.[0]?.startDate || this.dateSchedule?.[0]?.date;
  if (startDate && new Date(startDate) <= now) {
    return false;
  }

  return true;
};

// Method to cancel the event
eventSchema.methods.cancelEvent = async function (
  reason: string,
  cancelledBy: mongoose.Types.ObjectId,
): Promise<IEvent> {
  if (!this.isCancellable()) {
    throw new Error("Event cannot be cancelled");
  }

  this.cancellationStatus = "cancelled";
  this.cancellationReason = reason;
  this.cancelledAt = new Date();
  this.cancelledBy = cancelledBy;
  this.isActive = false;
  this.status = "archived";

  return this.save();
};

// Static method to find approved and active events (for public API)
eventSchema.statics.findApproved = function () {
  return this.find({ isApproved: true, isActive: true, isDeleted: false });
};

// Static method to find all approved events (for admin)
eventSchema.statics.findAllApproved = function () {
  return this.find({ isApproved: true, isDeleted: false });
};

// Static method to find events by vendor
eventSchema.statics.findByVendor = function (vendorId: string) {
  return this.find({ vendorId, isDeleted: false });
};

// Static method to find active published events
eventSchema.statics.findActivePublished = function () {
  return this.find({
    isApproved: true,
    isActive: true,
    status: "published",
    isDeleted: false,
  });
};

// Static method to find public events (approved, active, published, not deleted, not expired)
eventSchema.statics.findPublic = function (extraFilters: any = {}) {
  const now = new Date();
  // Add 24-hour buffer to match buildPublicEventFilter and lifecycle job behavior
  const bufferTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  return this.find({
    isApproved: true,
    isActive: true,
    status: "published",
    isDeleted: false,
    $or: [
      // New format: check endDate with 24-hour buffer
      { "dateSchedule.endDate": { $gte: bufferTime } },
      // Legacy format: check date field with 24-hour buffer
      { "dateSchedule.date": { $gte: bufferTime } },
    ],
    ...extraFilters,
  });
};

const Event = mongoose.model<IEvent>("Event", eventSchema);

export default Event;
