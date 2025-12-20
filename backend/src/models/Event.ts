import mongoose, { Document, Schema } from 'mongoose';

export interface IEvent extends Document {
  title: string;
  description: string;
  category: string;
  type: 'Olympiad' | 'Championship' | 'Competition' | 'Event' | 'Course' | 'Venue' | 'Workshop';
  venueType: 'Indoor' | 'Outdoor' | 'Online' | 'Offline';
  meetingLink?: string; // Required when venueType='Online'
  ageRange: [number, number];
  location: {
    country?: string;    // ISO 3166-1 alpha-2 code (e.g., 'AE', 'US')
    city: string;
    address: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
  vendorId: mongoose.Types.ObjectId;
  price: number;
  currency: string;
  isApproved: boolean;
  isActive: boolean;
  requirePhoneVerification: boolean;
  status: 'draft' | 'published' | 'archived' | 'pending' | 'rejected';
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
    unlimitedSeats?: boolean; // For online events with no capacity limit
    isSpecialDate?: boolean; // Flag for special date pricing
    specialDates?: Date[]; // Array of specific dates for special pricing
    priority?: number; // Higher priority overrides base schedules
    isOverride?: boolean; // When true, this schedule takes precedence over overlapping schedules
    timeSlots?: Array<{
      date: Date;           // Specific date for this slot
      startTime: string;    // HH:mm format
      endTime: string;      // HH:mm format
      availableSeats: number;
      soldSeats?: number;
      price?: number;       // Optional override price per slot
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
  isFeatured: boolean;
  images: string[];                         // OLD - deprecated, keep for backward compatibility
  imageAssets?: mongoose.Types.ObjectId[];  // NEW - shadow field for migration
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
  cancellationStatus: 'active' | 'cancelled';
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
  claimStatus: 'unclaimed' | 'claimed' | 'not_claimable';
  claimedBy?: mongoose.Types.ObjectId;
  claimedAt?: Date;
  originalAffiliateVendorId?: mongoose.Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;

  // Methods
  hasAvailableSeats(date: Date, quantity?: number): boolean;
  reduceSeats(date: Date, quantity: number): boolean;
  getEndDate(): Date | null;
  isExpired(): boolean;
  cancelEvent(reason: string, cancelledBy: mongoose.Types.ObjectId): Promise<IEvent>;
  isCancellable(): boolean;
}

const eventSchema = new Schema<IEvent>(
  {
    title: {
      type: String,
      required: [true, 'Event title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      required: [true, 'Event description is required'],
      // maxlength removed to support rich HTML content with images, videos, and formatting
      // trim removed - HTML content must be preserved
    },
    category: {
      type: String,
      required: [true, 'Event category is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: ['Olympiad', 'Championship', 'Competition', 'Event', 'Course', 'Venue', 'Workshop'],
      required: [true, 'Event type is required'],
    },
    venueType: {
      type: String,
      enum: ['Indoor', 'Outdoor', 'Online', 'Offline'],
      required: [true, 'Venue type is required'],
    },
    meetingLink: {
      type: String,
      trim: true,
      validate: {
        validator: function(this: any, v: string) {
          // If venueType is Online, meetingLink should be a valid URL
          // Validation will be enforced in validator layer
          if (!v) return true; // Optional field in schema
          return /^https?:\/\/.+/.test(v);
        },
        message: 'Meeting link must be a valid URL'
      }
    },
    ageRange: {
      type: [Number],
      validate: {
        validator: function (v: number[]) {
          return v.length === 2 && v[0] >= 0 && v[1] >= v[0] && v[1] <= 100;
        },
        message: 'Age range must be [min, max] where 0 <= min <= max <= 100',
      },
      required: [true, 'Age range is required'],
    },
    location: {
      country: {
        type: String,
        trim: true,
        uppercase: true,
        minlength: [2, 'Country code must be 2 characters'],
        maxlength: [2, 'Country code must be 2 characters'],
      },
      city: {
        type: String,
        required: [true, 'City is required'],
        trim: true,
      },
      address: {
        type: String,
        // Optional - conditional validation in validators (required for non-Online events)
        trim: true,
      },
      coordinates: {
        lat: {
          type: Number,
          // Optional - conditional validation in validators (required for non-Online events)
          min: [-90, 'Latitude must be between -90 and 90'],
          max: [90, 'Latitude must be between -90 and 90'],
        },
        lng: {
          type: Number,
          // Optional - conditional validation in validators (required for non-Online events)
          min: [-180, 'Longitude must be between -180 and 180'],
          max: [180, 'Longitude must be between -180 and 180'],
        },
      },
    },
    vendorId: {
      type: Schema.Types.ObjectId,
      ref: 'Vendor', // Changed from 'User' to 'Vendor'
      required: [true, 'Vendor ID is required'],
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    currency: {
      type: String,
      required: [true, 'Currency is required'],
      enum: ['AED', 'EGP', 'CAD', 'USD'],
      default: 'AED',
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
      enum: ['draft', 'published', 'archived', 'pending', 'rejected'],
      default: 'pending',
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
        message: 'Cannot have more than 20 tags',
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
          required: [true, 'Available seats is required'],
          min: [0, 'Available seats cannot be negative'],
        },
        totalSeats: {
          type: Number,
          min: [0, 'Total seats cannot be negative'],
        },
        soldSeats: {
          type: Number,
          default: 0,
          min: [0, 'Sold seats cannot be negative'],
        },
        reservedSeats: {
          type: Number,
          default: 0,
          min: [0, 'Reserved seats cannot be negative'],
        },
        price: {
          type: Number,
          required: [true, 'Schedule price is required'],
          min: [0, 'Price cannot be negative'],
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
              min: [0, 'Available seats cannot be negative'],
            },
            soldSeats: {
              type: Number,
              default: 0,
              min: [0, 'Sold seats cannot be negative'],
            },
            price: {
              type: Number,
              min: [0, 'Price cannot be negative'],
            },
          },
        ],
      },
    ],
    seoMeta: {
      title: {
        type: String,
        maxlength: [60, 'SEO title cannot exceed 60 characters'],
      },
      description: {
        type: String,
        maxlength: [160, 'SEO description cannot exceed 160 characters'],
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
          required: [true, 'FAQ question is required'],
          maxlength: [200, 'Question cannot exceed 200 characters'],
        },
        answer: {
          type: String,
          required: [true, 'FAQ answer is required'],
          maxlength: [1000, 'Answer cannot exceed 1000 characters'],
        },
      },
    ],
    viewsCount: {
      type: Number,
      default: 0,
      min: [0, 'Views count cannot be negative'],
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    images: {
      type: [String],
      default: [],
      required: false,  // Optional during migration
      validate: {
        validator: function (v: string[]) {
          return v.length <= 10;
        },
        message: 'Cannot have more than 10 images',
      },
    },
    imageAssets: [{
      type: Schema.Types.ObjectId,
      ref: 'MediaAsset'
    }],
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
      enum: ['active', 'cancelled'],
      default: 'active',
    },
    cancellationReason: {
      type: String,
      maxlength: [500, 'Cancellation reason cannot exceed 500 characters'],
    },
    cancelledAt: {
      type: Date,
    },
    cancelledBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
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
      min: [0, 'Review count cannot be negative'],
    },
    averageRating: {
      type: Number,
      default: 0,
      min: [0, 'Rating cannot be negative'],
      max: [5, 'Rating cannot exceed 5'],
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
              maxlength: [200, 'Field label cannot exceed 200 characters'],
            },
            type: {
              type: String,
              enum: ['text', 'email', 'number', 'tel', 'textarea', 'dropdown', 'checkbox', 'radio', 'file', 'date', 
                    'address', 'website', 'datetime', 'time', 'country', 'city', 'html', 'pagebreak'],
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
          min: [0, 'Max registrations cannot be negative'],
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
        validator: function(this: IEvent, v: string) {
          if (!this.isAffiliateEvent) return true;
          return v && /^https?:\/\/.+/.test(v);
        },
        message: 'External booking link is required for affiliate events and must be a valid URL'
      }
    },
    affiliateClickTracking: {
      totalClicks: {
        type: Number,
        default: 0,
        min: [0, 'Total clicks cannot be negative']
      },
      uniqueClicks: {
        type: Number,
        default: 0,
        min: [0, 'Unique clicks cannot be negative']
      },
      lastClickedAt: Date
    },
    claimStatus: {
      type: String,
      enum: {
        values: ['unclaimed', 'claimed', 'not_claimable'],
        message: 'Claim status must be unclaimed, claimed, or not_claimable'
      },
      default: 'not_claimable',
    },
    claimedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Vendor'
    },
    claimedAt: Date,
    originalAffiliateVendorId: {
      type: Schema.Types.ObjectId,
      ref: 'Vendor'
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret: any) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes for performance
eventSchema.index({ vendorId: 1 });
eventSchema.index({ isApproved: 1, isDeleted: 1 });
eventSchema.index({ isActive: 1, isApproved: 1, isDeleted: 1 });
eventSchema.index({ cancellationStatus: 1 }); // For filtering cancelled events
eventSchema.index({ status: 1 });
eventSchema.index({ category: 1 });
eventSchema.index({ type: 1 });
eventSchema.index({ 'location.city': 1 });
eventSchema.index({ 'location.country': 1 }); // For filtering by country
eventSchema.index({ price: 1 });
eventSchema.index({ currency: 1 });
eventSchema.index({ createdAt: -1 });
eventSchema.index({ isFeatured: 1, isApproved: 1, isDeleted: 1 });
eventSchema.index({ tags: 1 });
eventSchema.index({ averageRating: -1 });
eventSchema.index({ reviewCount: -1 });
eventSchema.index({ averageRating: -1, reviewCount: -1 });

// Additional compound indexes for KVM1 optimization - faster admin dashboard queries
eventSchema.index({ isApproved: 1, status: 1, createdAt: -1 }); // Dashboard event stats by approval and status
eventSchema.index({ vendorId: 1, isApproved: 1, createdAt: -1 }); // Vendor-specific event queries

// Affiliate event indexes
eventSchema.index({ isAffiliateEvent: 1, claimStatus: 1 }); // For filtering affiliate events by claim status
eventSchema.index({ claimedBy: 1 }); // For vendor's claimed events
eventSchema.index({ 'affiliateClickTracking.totalClicks': -1 }); // For analytics and sorting by popularity

// Text search index
eventSchema.index({
  title: 'text',
  description: 'text',
  'location.city': 'text',
  'location.address': 'text',
  tags: 'text',
});

// Virtual for event URL slug
eventSchema.virtual('slug').get(function () {
  return this.title.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
});

// Pre-save middleware to generate affiliate code and set status
eventSchema.pre('save', function (next) {
  if (!this.affiliateCode) {
    this.affiliateCode = `EVT-${(this._id as any).toString().slice(-8).toUpperCase()}`;
  }

  // Auto-set status based on approval state
  if (this.isModified('isApproved')) {
    if (this.isApproved) {
      this.status = 'published';
    } else if (this.status === 'published') {
      this.status = 'rejected';
    }
  }

  next();
});

// Post-save middleware to invalidate cache when event changes
eventSchema.post('save', async function (doc) {
  try {
    // Import cache service and utilities dynamically to avoid circular dependencies
    const { cacheService } = await import('../services/cache.service');
    const { getEventCacheKey, getEventListCachePattern } = await import('../utils/event.utils');

    // Invalidate individual event cache
    const cacheKey = getEventCacheKey(doc._id.toString());
    await cacheService.delete(cacheKey);

    // If any public-facing field changed, invalidate event list caches
    const fieldsAffectingLists = ['isApproved', 'isActive', 'status', 'isDeleted', 'isFeatured'];
    if (fieldsAffectingLists.some(field => doc.isModified(field))) {
      const listPattern = getEventListCachePattern();
      await cacheService.deletePattern(listPattern);
    }
  } catch (error) {
    console.error('Error invalidating event cache:', error);
    // Don't throw - cache invalidation failures shouldn't break saves
  }

  // Trigger collection sync if relevant fields changed
  try {
    const fieldsAffectingCollections = [
      'title', 'description', 'category', 'type', 'venueType', 'price',
      'currency', 'images', 'imageAssets', 'location', 'dateSchedule',
      'ageRange', 'isFeatured', 'viewsCount', 'averageRating',
      'isApproved', 'isActive', 'isDeleted', 'status'
    ];

    const hasRelevantChanges = fieldsAffectingCollections.some(
      field => doc.isModified(field)
    );

    if (!hasRelevantChanges) return;

    const { collectionSyncQueue, areQueuesEnabled } = await import('../config/queue');

    if (!areQueuesEnabled || !collectionSyncQueue) {
      return; // Skip sync if queues disabled
    }

    const shouldRemove = !doc.isApproved || !doc.isActive || doc.isDeleted;

    await collectionSyncQueue.add(
      shouldRemove ? 'removeEvent' : 'syncEvent',
      {
        type: shouldRemove ? 'removeEvent' : 'syncEvent',
        eventId: doc._id.toString()
      },
      {
        jobId: `${shouldRemove ? 'remove' : 'sync'}-event-${doc._id}`,
        removeOnComplete: true,
        removeOnFail: false
      }
    );
  } catch (error) {
    console.error('Error queueing collection sync:', error);
    // Don't throw - collection sync failures shouldn't break event saves
  }
});

// Post-remove middleware to invalidate cache when event is deleted
eventSchema.post('findOneAndUpdate', async function (doc) {
  if (!doc) return;

  try {
    const { cacheService } = await import('../services/cache.service');
    const { getEventCacheKey, getEventListCachePattern } = await import('../utils/event.utils');

    // Invalidate individual event cache
    const cacheKey = getEventCacheKey(doc._id.toString());
    await cacheService.delete(cacheKey);

    // Invalidate event list caches
    const listPattern = getEventListCachePattern();
    await cacheService.deletePattern(listPattern);
  } catch (error) {
    console.error('Error invalidating event cache after update:', error);
  }
});

// Post-delete middleware to invalidate cache when event is deleted
eventSchema.post('findOneAndDelete', async function (doc) {
  if (!doc) return;

  try {
    const { cacheService } = await import('../services/cache.service');
    const { getEventCacheKey, getEventListCachePattern } = await import('../utils/event.utils');

    // Invalidate individual event cache
    const cacheKey = getEventCacheKey(doc._id.toString());
    await cacheService.delete(cacheKey);

    // Invalidate event list caches
    const listPattern = getEventListCachePattern();
    await cacheService.deletePattern(listPattern);
  } catch (error) {
    console.error('Error invalidating event cache after delete:', error);
  }

  // Trigger collection sync to remove deleted event
  try {
    const { collectionSyncQueue, areQueuesEnabled } = await import('../config/queue');

    if (!areQueuesEnabled || !collectionSyncQueue) {
      return;
    }

    await collectionSyncQueue.add(
      'removeEvent',
      {
        type: 'removeEvent',
        eventId: doc._id.toString()
      },
      {
        jobId: `remove-event-${doc._id}`,
        removeOnComplete: true
      }
    );
  } catch (error) {
    console.error('Error queueing collection removal:', error);
  }
});

// Post-updateMany middleware to invalidate cache for bulk updates
eventSchema.post('updateMany', async function () {
  try {
    const { cacheService } = await import('../services/cache.service');
    const { getEventListCachePattern } = await import('../utils/event.utils');

    // For bulk updates, we can't easily track individual events
    // So we invalidate all event list caches
    const listPattern = getEventListCachePattern();
    await cacheService.deletePattern(listPattern);
  } catch (error) {
    console.error('Error invalidating cache after bulk update:', error);
  }

  // Trigger full collection reconciliation for bulk updates
  try {
    const { collectionSyncQueue, areQueuesEnabled } = await import('../config/queue');

    if (!areQueuesEnabled || !collectionSyncQueue) {
      return;
    }

    await collectionSyncQueue.add(
      'reconcileAll',
      {
        type: 'reconcileAll'
      },
      {
        jobId: 'reconcile-all-collections',
        delay: 60000, // Wait 1 minute to batch multiple bulk updates
        removeOnComplete: true
      }
    );
  } catch (error) {
    console.error('Error queueing reconciliation:', error);
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
const findBestScheduleForDate = (dateSchedule: any[], targetDate: Date): any => {
  const matchingSchedules = dateSchedule.filter((s: any) => scheduleContainsDate(s, targetDate));
  if (matchingSchedules.length === 0) return null;

  // Prefer override schedule if one exists
  const overrideSchedule = matchingSchedules.find((s: any) => s.isOverride === true);
  return overrideSchedule || matchingSchedules[0];
};

// Method to check if event has available seats for a specific date
eventSchema.methods.hasAvailableSeats = function (date: Date, quantity: number = 1): boolean {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    console.error('Invalid date provided to hasAvailableSeats:', date);
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
    console.log('✓ Unlimited seats - no capacity check needed', {
      eventId: this._id,
      eventTitle: this.title,
      targetDate: targetDate.toISOString()
    });
    return true;
  }

  return schedule.availableSeats >= quantity;
};

// Method to reduce available seats
eventSchema.methods.reduceSeats = function (date: Date, quantity: number): boolean {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    console.error('Invalid date provided to reduceSeats:', {
      date,
      dateType: typeof date,
      isDateInstance: date instanceof Date,
      eventId: this._id,
      eventTitle: this.title,
      quantity
    });
    return false;
  }

  if (!quantity || quantity <= 0) {
    console.error('Invalid quantity provided to reduceSeats:', {
      quantity,
      quantityType: typeof quantity,
      eventId: this._id,
      eventTitle: this.title,
      date: date.toISOString()
    });
    return false;
  }

  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0); // Normalize to start of day

  // Use helper to find best schedule (prefers override schedules)
  const schedule = findBestScheduleForDate(this.dateSchedule, targetDate);

  if (!schedule) {
    console.error('No schedule found for date:', {
      eventId: this._id,
      eventTitle: this.title,
      targetDate: targetDate.toISOString()
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
        // Track sold seats if field exists
        if (typeof matchingSlot.soldSeats === 'number') {
          matchingSlot.soldSeats += quantity;
        }
        return true;
      } else {
        console.error('Insufficient seats in time slot:', {
          eventId: this._id,
          targetDate: targetDate.toISOString(),
          requested: quantity,
          available: matchingSlot.availableSeats
        });
        return false;
      }
    }

    // Has slots but none match
    console.error('No matching time slot found:', {
      eventId: this._id,
      targetDate: targetDate.toISOString(),
      slotsCount: schedule.timeSlots.length
    });
    return false;
  }

  // Fallback to base schedule logic
  // Unlimited seats - no need to reduce availability, just track sold count
  if (schedule.unlimitedSeats) {
    // Still track soldSeats for analytics
    if (typeof schedule.soldSeats === 'number') {
      schedule.soldSeats += quantity;
    }
    console.log('✓ Unlimited seats - seat reduction skipped, sold count updated', {
      eventId: this._id,
      eventTitle: this.title,
      targetDate: targetDate.toISOString(),
      quantity,
      newSoldSeats: schedule.soldSeats
    });
    return true;
  }

  if (schedule.availableSeats >= quantity) {
    schedule.availableSeats -= quantity;
    // Also update soldSeats if it exists
    if (typeof schedule.soldSeats === 'number') {
      schedule.soldSeats += quantity;
    }
    return true;
  }

  // Log failure details for debugging
  console.error('Failed to reduce seats:', {
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
      soldSeats: s.soldSeats
    }))
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

  return new Date(Math.max(...dates.map(date => date.getTime())));
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
  if (this.cancellationStatus === 'cancelled') {
    return false;
  }

  // Cannot cancel draft or rejected events
  if (this.status === 'draft' || this.status === 'rejected') {
    return false;
  }

  // Cannot cancel if event has already started
  const now = new Date();
  const startDate = this.dateSchedule?.[0]?.startDate || this.dateSchedule?.[0]?.date;
  if (startDate && new Date(startDate) <= now) {
    return false;
  }

  return true;
};

// Method to cancel the event
eventSchema.methods.cancelEvent = async function (reason: string, cancelledBy: mongoose.Types.ObjectId): Promise<IEvent> {
  if (!this.isCancellable()) {
    throw new Error('Event cannot be cancelled');
  }

  this.cancellationStatus = 'cancelled';
  this.cancellationReason = reason;
  this.cancelledAt = new Date();
  this.cancelledBy = cancelledBy;
  this.isActive = false;
  this.status = 'archived';

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
    status: 'published',
    isDeleted: false
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
    status: 'published',
    isDeleted: false,
    $or: [
      // New format: check endDate with 24-hour buffer
      { 'dateSchedule.endDate': { $gte: bufferTime } },
      // Legacy format: check date field with 24-hour buffer
      { 'dateSchedule.date': { $gte: bufferTime } },
    ],
    ...extraFilters
  });
};

const Event = mongoose.model<IEvent>('Event', eventSchema);

export default Event;